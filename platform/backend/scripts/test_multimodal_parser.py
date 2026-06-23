#!/usr/bin/env python3
from __future__ import annotations

"""Exercise Spanish text, image, and audio parser paths.

Default mode disables OpenAI and verifies deterministic extraction. Use
`--live` to call the configured OpenAI parser/vision/transcription models.
"""

import base64
import json
import mimetypes
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any

sys.dont_write_bytecode = True

LIVE = "--live" in sys.argv
if not LIVE:
    os.environ["OPENAI_PARSER_ENABLED"] = "0"
    os.environ["OPENAI_MEDIA_PARSER_ENABLED"] = "0"

APP_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = Path(__file__).resolve().parents[3]
if str(APP_DIR) not in sys.path:
    sys.path.insert(0, str(APP_DIR))

from app import services


TEXT_SAMPLE = (
    "Producto Moto Protección, canal directas, cliente empresa, segmento comercial. "
    "Motocicleta 150 cc, valor asegurado Bs. 90000, ciudad La Paz, modelo 2021, "
    "marca Toyota, modelo Corolla, siniestralidad histórica 35%."
)

AUDIO_SAMPLE = (
    "Producto Moto Protección, canal directas, cliente empresa. "
    "Motocicleta ciento cincuenta cc, valor asegurado noventa mil bolivianos, ciudad La Paz."
)


def main() -> None:
    results: list[dict[str, Any]] = []
    text_result = services.extract_facts({"engine": "uw", "text": TEXT_SAMPLE})
    require("text product", text_result["facts"].get("product", {}).get("value") == "moto_proteccion", text_result)
    require("text vehicle class", text_result["facts"].get("vehicle_class", {}).get("value") == "motocicleta", text_result)
    require("text cilindrada", text_result["facts"].get("cilindrada_cc", {}).get("value") == 150, text_result)
    results.append(summary("text", text_result))

    image_path = REPO_ROOT / "work" / "manual_p26.png"
    if image_path.exists():
        image_result = services.extract_facts(
            {
                "engine": "uw",
                "text": "Imagen adjunta para prueba de vision/OCR.",
                "attachments": [attachment(image_path, "photo")],
            }
        )
        results.append(summary("image", image_result))
        if LIVE:
            status = image_result["attachments"]["items"][0]["status"]
            require("live image sent to parser", status in {"sent_to_vision_parser", "vision_parser_failed"}, image_result)
            require("live image parser did not fail", status != "vision_parser_failed", image_result)
    else:
        results.append({"case": "image", "skipped": "work/manual_p26.png not found"})

    audio_path = make_audio_sample() if LIVE else None
    if audio_path:
        audio_result = services.extract_facts(
            {
                "engine": "uw",
                "text": "Audio adjunto para prueba de Whisper/transcripcion.",
                "attachments": [attachment(audio_path, "audio")],
            }
        )
        results.append(summary("audio", audio_result))
        status = audio_result["attachments"]["items"][0]["status"]
        require("live audio transcribed", status == "transcribed", audio_result)
    elif LIVE:
        results.append({"case": "audio", "skipped": "macOS say/afconvert not available"})

    print(json.dumps({"live": LIVE, "results": results}, ensure_ascii=False, indent=2))


def summary(case: str, result: dict[str, Any]) -> dict[str, Any]:
    parser = result.get("parser") or {}
    attachments = result.get("attachments") or {}
    ai_media = attachments.get("ai_parser") or {}
    return {
        "case": case,
        "facts": {key: item.get("value") for key, item in result.get("facts", {}).items()},
        "missing_required_count": len(result.get("missing_required") or []),
        "parser_mode": parser.get("mode"),
        "parser_model": parser.get("model"),
        "parser_errors": parser.get("errors") or [],
        "ai_media_parser_used": ai_media.get("used"),
        "ai_media_parser_errors": ai_media.get("errors") or [],
        "attachment_items": attachments.get("items") or [],
        "requires_processing": attachments.get("requires_processing"),
    }


def attachment(path: Path, kind: str) -> dict[str, Any]:
    mime = mimetypes.guess_type(str(path))[0] or "application/octet-stream"
    data = base64.b64encode(path.read_bytes()).decode("ascii")
    return {
        "kind": kind,
        "name": path.name,
        "mime": mime,
        "data_url": f"data:{mime};base64,{data}",
        "payload_status": "loaded_by_test",
    }


def make_audio_sample() -> Path | None:
    if not shutil.which("say") or not shutil.which("afconvert"):
        return None
    tmpdir = Path(tempfile.mkdtemp(prefix="riskiq-audio-"))
    aiff = tmpdir / "sample.aiff"
    wav = tmpdir / "sample.wav"
    try:
        command = ["say", "-v", "Paulina", "-o", str(aiff), AUDIO_SAMPLE]
        completed = subprocess.run(command, check=False, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if completed.returncode != 0:
            subprocess.run(["say", "-o", str(aiff), AUDIO_SAMPLE], check=True)
        subprocess.run(["afconvert", "-f", "WAVE", "-d", "LEI16", str(aiff), str(wav)], check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None
    return wav


def require(name: str, condition: bool, detail: Any) -> None:
    if not condition:
        raise AssertionError(f"{name} failed: {json.dumps(detail, ensure_ascii=False)[:2000]}")


if __name__ == "__main__":
    main()
