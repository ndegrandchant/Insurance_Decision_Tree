import base64
import json
import mimetypes
import re
import urllib.error
import urllib.request
import uuid
from typing import Any, Optional

from .config import (
    env_flag,
    openai_api_key,
    parser_language,
    parser_model,
    transcription_model,
    vision_model,
)


OPENAI_BASE_URL = "https://api.openai.com/v1"


def extract_with_openai(
    text: str,
    fact_defs: dict[str, Any],
    attachments: list[dict[str, Any]],
) -> Optional[dict[str, Any]]:
    if not env_flag("OPENAI_PARSER_ENABLED", True) or not openai_api_key():
        return None

    errors: list[dict[str, str]] = []
    media = _prepare_media(attachments, errors)
    model = vision_model() if media["image_count"] else parser_model()
    prompt = _build_prompt(text, fact_defs, media["transcript_text"])
    content: list[dict[str, Any]] = [{"type": "input_text", "text": prompt}]
    content.extend({"type": "input_image", "image_url": image["data_url"]} for image in media["images"])

    try:
        response = _post_json(
            "/responses",
            {
                "model": model,
                "input": [{"role": "user", "content": content}],
                "text": {"format": {"type": "json_object"}},
            },
        )
    except OpenAIParserError as exc:
        errors.append({"stage": "responses", "message": str(exc)})
        for item in media["items"]:
            if item.get("status") == "sent_to_vision_parser":
                item["status"] = "vision_parser_failed"
        return {
            "used": False,
            "model": model,
            "facts": {},
            "clarifying_questions": [],
            "media": media,
            "errors": errors,
        }

    parsed = _json_from_text(_response_text(response))
    facts = _normalize_facts(parsed.get("facts", []), fact_defs)
    questions = _normalize_questions(parsed.get("clarifying_questions", []))
    notes = _normalize_questions(parsed.get("media_notes", []))
    media["media_notes"] = notes
    return {
        "used": True,
        "model": model,
        "facts": facts,
        "clarifying_questions": questions,
        "media": media,
        "errors": errors,
    }


class OpenAIParserError(RuntimeError):
    pass


def _prepare_media(attachments: list[dict[str, Any]], errors: list[dict[str, str]]) -> dict[str, Any]:
    media_enabled = env_flag("OPENAI_MEDIA_PARSER_ENABLED", True)
    images: list[dict[str, Any]] = []
    items: list[dict[str, Any]] = []
    transcripts: list[str] = []

    for attachment in attachments:
        mime = str(attachment.get("mime") or "")
        kind = str(attachment.get("kind") or ("audio" if mime.startswith("audio/") else "photo" if mime.startswith("image/") else "file"))
        data_url = str(attachment.get("data_url") or "")
        has_payload = data_url.startswith("data:")
        status = "attached_as_evidence"
        extracted_text = ""

        if kind == "photo":
            if has_payload and media_enabled:
                images.append({"data_url": data_url, "name": attachment.get("name")})
                status = "sent_to_vision_parser"
            elif has_payload:
                status = "media_parser_disabled"
            else:
                status = "media_payload_missing"
        elif kind == "audio":
            if has_payload and media_enabled:
                try:
                    extracted_text = _transcribe_audio(attachment)
                    if extracted_text:
                        transcripts.append(extracted_text)
                    status = "transcribed" if extracted_text else "transcription_empty"
                except OpenAIParserError as exc:
                    status = "transcription_failed"
                    errors.append({"stage": "audio_transcription", "message": str(exc)})
            elif has_payload:
                status = "media_parser_disabled"
            else:
                status = "media_payload_missing"

        items.append(
            {
                "kind": kind,
                "name": attachment.get("name"),
                "mime": mime,
                "status": status,
                "has_payload": has_payload,
                "payload_status": attachment.get("payload_status"),
                "extracted_text": extracted_text,
            }
        )

    return {
        "items": items,
        "images": images,
        "image_count": len(images),
        "transcript_text": "\n\n".join(t for t in transcripts if t),
        "transcription_model": transcription_model(),
        "language": parser_language(),
    }


def _transcribe_audio(attachment: dict[str, Any]) -> str:
    mime, data = _decode_data_url(str(attachment.get("data_url") or ""))
    filename = str(attachment.get("name") or "audio")
    if "." not in filename:
        filename += mimetypes.guess_extension(mime) or ".mp3"
    body, content_type = _multipart_body(
        fields={
            "model": transcription_model(),
            "response_format": "json",
            "language": parser_language(),
            "prompt": (
                "Transcribe notas de seguros de autos y motos en español latinoamericano. "
                "Conserva números importantes como dígitos cuando sea posible: cilindrada 150 cc, "
                "valor asegurado 90000 bolivianos, siniestralidad 35%, año modelo 2021."
            ),
        },
        files=[("file", filename, mime, data)],
    )
    response = _post_raw("/audio/transcriptions", body, content_type)
    if isinstance(response, dict):
        return str(response.get("text") or "").strip()
    return str(response or "").strip()


def _build_prompt(text: str, fact_defs: dict[str, Any], transcript_text: str) -> str:
    compact_defs = []
    for fact_id, spec in fact_defs.items():
        compact_defs.append(
            {
                "id": fact_id,
                "type": spec.get("type", "string"),
                "values": spec.get("values") or spec.get("allowed_values"),
                "prompt": spec.get("prompt"),
                "required": bool(spec.get("required_for_initial_run")),
            }
        )

    return (
        "Eres un asistente de extracción para seguros en Bolivia y LATAM. "
        "Los usuarios escriben principalmente en español, con frases breves y lenguaje comercial. "
        "Lee la intención del turno y mapea hechos cuando el texto los sostiene directamente; por "
        "ejemplo, 'empresa pide cotizar automotores por canal directas' implica client_type=empresa, "
        "channel=directas y product=otro porque es una solicitud genérica de automotores, no un "
        "producto enlatado específico. Extrae solo hechos explícitos o directamente implicados por "
        "la frase del cliente. No inventes, no completes huecos y no cambies la lógica del manual. "
        "No infieras que no hay desviaciones, licitación, agrupación masiva, placas, exclusiones, "
        "coberturas o características del vehículo salvo que el cliente lo diga. No infieras "
        "vehicle_class solo porque el producto sea Moto Protección; espera que el cliente mencione "
        "moto, motocicleta, auto, camión, liviano, etc. Si falta algo o es ambiguo, agrega una "
        "pregunta de aclaración. "
        "Nunca marques un hecho como confirmado; el sistema lo guardará como sugerencia para revisión humana.\n\n"
        "Devuelve solo JSON con esta forma exacta:\n"
        '{"facts":[{"id":"fact_id","value":"valor","confidence":0.0,"evidence":"frase breve"}],'
        '"clarifying_questions":["pregunta breve"],"media_notes":["nota breve"]}\n\n'
        f"Idioma preferido: {parser_language()}.\n"
        f"Definiciones permitidas:\n{json.dumps(compact_defs, ensure_ascii=False)}\n\n"
        f"Texto del usuario:\n{text.strip() or '(sin texto escrito)'}\n\n"
        f"Transcripción de audio:\n{transcript_text or '(sin audio transcrito)'}"
    )


def _normalize_facts(raw_facts: Any, fact_defs: dict[str, Any]) -> dict[str, dict[str, Any]]:
    if isinstance(raw_facts, dict):
        iterable = [{"id": k, **(v if isinstance(v, dict) else {"value": v})} for k, v in raw_facts.items()]
    elif isinstance(raw_facts, list):
        iterable = raw_facts
    else:
        iterable = []

    out: dict[str, dict[str, Any]] = {}
    for raw in iterable:
        if not isinstance(raw, dict):
            continue
        fact_id = str(raw.get("id") or raw.get("fact_id") or "")
        if fact_id not in fact_defs or fact_id in out or "value" not in raw:
            continue
        ok, value = _coerce_value(raw.get("value"), fact_defs[fact_id])
        if not ok:
            continue
        confidence = _coerce_confidence(raw.get("confidence"))
        if confidence <= 0:
            continue
        item: dict[str, Any] = {
            "value": value,
            "confidence": confidence,
            "confirmed": False,
            "source": "openai_parser",
        }
        evidence = str(raw.get("evidence") or "").strip()
        if evidence:
            item["evidence_text"] = evidence[:240]
        out[fact_id] = item
    _copy_alias(out, fact_defs, "make", "vehicle_brand")
    _copy_alias(out, fact_defs, "model_year", "year")
    return out


def _copy_alias(facts: dict[str, dict[str, Any]], fact_defs: dict[str, Any], left: str, right: str) -> None:
    if left in facts and right in fact_defs and right not in facts:
        facts[right] = {**facts[left], "source": f"{facts[left].get('source', 'openai_parser')}_alias"}
    if right in facts and left in fact_defs and left not in facts:
        facts[left] = {**facts[right], "source": f"{facts[right].get('source', 'openai_parser')}_alias"}


def _coerce_value(value: Any, spec: dict[str, Any]) -> tuple[bool, Any]:
    fact_type = spec.get("type", "string")
    allowed = spec.get("values") or spec.get("allowed_values")
    if fact_type == "boolean":
        if isinstance(value, bool):
            return True, value
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"si", "sí", "true", "verdadero", "yes"}:
                return True, True
            if normalized in {"no", "false", "falso"}:
                return True, False
        return False, None
    if fact_type == "number":
        try:
            number = _parse_number(value)
        except (TypeError, ValueError):
            return False, None
        return True, int(number) if number.is_integer() else number
    if fact_type == "array":
        if not isinstance(value, list):
            return False, None
        return True, value
    if allowed:
        if value in allowed:
            return True, value
        lower_lookup = {str(v).lower(): v for v in allowed}
        found = lower_lookup.get(str(value).strip().lower())
        return (True, found) if found is not None else (False, None)
    if isinstance(value, (dict, list)):
        return False, None
    text_value = str(value).strip()
    return (bool(text_value), text_value)


def _parse_number(value: Any) -> float:
    if not isinstance(value, str):
        return float(value)
    cleaned = value.strip().replace(" ", "")
    if "," in cleaned and "." in cleaned:
        cleaned = cleaned.replace(".", "").replace(",", ".")
    elif "," in cleaned:
        cleaned = cleaned.replace(",", ".")
    return float(cleaned)


def _coerce_confidence(value: Any) -> float:
    try:
        confidence = float(value)
    except (TypeError, ValueError):
        confidence = 0.5
    return max(0.0, min(confidence, 1.0))


def _normalize_questions(raw: Any) -> list[str]:
    if not isinstance(raw, list):
        return []
    out = []
    for item in raw:
        text = str(item).strip()
        if text:
            out.append(text[:240])
    return out[:8]


def _post_json(path: str, payload: dict[str, Any]) -> dict[str, Any]:
    return _post_raw(path, json.dumps(payload).encode("utf-8"), "application/json")


def _post_raw(path: str, body: bytes, content_type: str) -> dict[str, Any]:
    req = urllib.request.Request(
        f"{OPENAI_BASE_URL}{path}",
        data=body,
        headers={
            "Authorization": f"Bearer {openai_api_key()}",
            "Content-Type": content_type,
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            raw = resp.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")[:500]
        raise OpenAIParserError(f"OpenAI HTTP {exc.code}: {detail}") from exc
    except urllib.error.URLError as exc:
        raise OpenAIParserError(f"OpenAI request failed: {exc.reason}") from exc

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"text": raw}


def _response_text(response: dict[str, Any]) -> str:
    if response.get("output_text"):
        return str(response["output_text"])
    parts: list[str] = []
    for item in response.get("output") or []:
        if not isinstance(item, dict):
            continue
        for content in item.get("content") or []:
            if isinstance(content, dict):
                text = content.get("text") or content.get("output_text")
                if text:
                    parts.append(str(text))
    return "\n".join(parts)


def _json_from_text(text: str) -> dict[str, Any]:
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if not match:
            return {}
        try:
            parsed = json.loads(match.group(0))
        except json.JSONDecodeError:
            return {}
    return parsed if isinstance(parsed, dict) else {}


def _decode_data_url(data_url: str) -> tuple[str, bytes]:
    if not data_url.startswith("data:") or "," not in data_url:
        raise OpenAIParserError("adjunto sin data URL válida")
    header, encoded = data_url.split(",", 1)
    mime = header[5:].split(";", 1)[0] or "application/octet-stream"
    try:
        return mime, base64.b64decode(encoded)
    except (ValueError, TypeError) as exc:
        raise OpenAIParserError("adjunto con base64 inválido") from exc


def _multipart_body(fields: dict[str, str], files: list[tuple[str, str, str, bytes]]) -> tuple[bytes, str]:
    boundary = f"----insurance-parser-{uuid.uuid4().hex}"
    chunks: list[bytes] = []
    for name, value in fields.items():
        chunks.extend(
            [
                f"--{boundary}\r\n".encode(),
                f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode(),
                str(value).encode("utf-8"),
                b"\r\n",
            ]
        )
    for field_name, filename, mime, data in files:
        chunks.extend(
            [
                f"--{boundary}\r\n".encode(),
                f'Content-Disposition: form-data; name="{field_name}"; filename="{filename}"\r\n'.encode(),
                f"Content-Type: {mime}\r\n\r\n".encode(),
                data,
                b"\r\n",
            ]
        )
    chunks.append(f"--{boundary}--\r\n".encode())
    return b"".join(chunks), f"multipart/form-data; boundary={boundary}"
