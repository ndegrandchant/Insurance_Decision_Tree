import re
from typing import Any, Optional, Union

from .ai_parser import extract_with_openai


def extract_facts_advisory(
    text: str,
    fact_defs: dict[str, Any],
    attachments: Optional[list[dict[str, Any]]] = None,
) -> dict[str, Any]:
    """Extracción conservadora para notas de suscripción/siniestro.

    La salida nunca queda confirmada. Los motores determinísticos deben seguir
    rechazándola hasta que una persona revise y aplique los hechos sugeridos.
    """

    lower = text.lower()
    facts: dict[str, dict[str, Any]] = {}

    ai = extract_with_openai(text, fact_defs, attachments or [])
    if ai:
        for fact_id, item in ai.get("facts", {}).items():
            if fact_id not in facts:
                facts[fact_id] = item

    _extract_coverage(lower, fact_defs, facts)
    _extract_uw(lower, fact_defs, facts)

    required_missing = [
        fact_id
        for fact_id, spec in fact_defs.items()
        if spec.get("required_for_initial_run") and fact_id not in facts
    ]
    media = _media_status(attachments or [], ai)
    questions = [fact_defs[f].get("prompt", f) for f in required_missing[:5]]
    if media["requires_processing"]:
        questions.append("Revise/extraiga el texto de las fotos o audio adjuntos antes de confirmar hechos.")
    if ai:
        questions.extend(q for q in ai.get("clarifying_questions", []) if q not in questions)

    return {
        "facts": facts,
        "missing_required": required_missing,
        "clarifying_questions": questions,
        "attachments": media,
        "unmapped_text": text,
        "parser": _parser_status(ai),
        "hard_wall": "advisory_only_user_confirmation_required_before_engine_run",
    }


def _extract_coverage(lower: str, fact_defs: dict[str, Any], facts: dict[str, dict[str, Any]]) -> None:
    patterns = {
        "coverage_section": [
            ("danos_propios", r"dañ[oa]s?\s+propios|choque|rayadur|vuelco|embarranc"),
            ("robo_parcial", r"robo\s+parcial|robo\s+de\s+partes|piezas|llanta"),
        ],
        "event_type": [
            ("choque", r"\bchoque\b|colisi[oó]n"),
            ("robo_partes", r"robo\s+(de\s+)?(partes|piezas|llanta)"),
            ("hurto_partes", r"\bhurto\b"),
            ("intento_robo", r"intento\s+de\s+robo|tentativa"),
            ("falla_mecanica", r"falla\s+mec[aá]nica|desperfecto"),
            ("embarrancamiento", r"embarranc"),
            ("vuelco", r"\bvuelco\b|volcad"),
        ],
    }
    for fact_id, options in patterns.items():
        _match_options(facts, fact_defs, lower, fact_id, options, confidence=0.72)

    coverage_positive = re.search(r"(p[oó]liza|cobertura|secci[oó]n).{0,40}?(incluye|incluid[ao]|amparad[ao]|cubiert[ao])|(?:incluye|incluid[ao]).{0,40}?(robo|dañ[oa]s?|cobertura)", lower)
    coverage_negative = re.search(r"(no|sin|excluid[ao]).{0,30}?(incluye|incluid[ao]|cobertura|amparad[ao]|cubiert[ao])", lower)
    if "coverage_included" in fact_defs and (coverage_positive or coverage_negative):
        match = coverage_negative or coverage_positive
        _set(facts, "coverage_included", bool(coverage_positive and not coverage_negative), 0.62, match)

    police_positive = re.search(r"(hubo|con|present[oó]|realiz[oó]|se hizo).{0,30}?denuncia|denuncia.{0,30}?(policial|autoridad|dentro de 6|6 horas)", lower)
    police_negative = re.search(r"(sin|no).{0,20}?denuncia", lower)
    if "police_report_within_6h" in fact_defs and (police_positive or police_negative):
        match = police_negative or police_positive
        _set(facts, "police_report_within_6h", bool(police_positive and not police_negative), 0.6, match)

    alcohol_positive = re.search(r"(hubo|con|realiz[oó]|se hizo).{0,30}?(dosaje|alcoholemia|prueba de alcohol)|(?:dosaje|alcoholemia).{0,30}?(dentro de 6|6 horas)", lower)
    alcohol_negative = re.search(r"(sin|no).{0,20}?(dosaje|alcoholemia|prueba de alcohol)", lower)
    if "alcohol_test_within_6h" in fact_defs and (alcohol_positive or alcohol_negative):
        match = alcohol_negative or alcohol_positive
        _set(facts, "alcohol_test_within_6h", bool(alcohol_positive and not alcohol_negative), 0.6, match)

    money = re.search(r"(?:usd|\$us|us\$)\s*([0-9][0-9.,]*)", lower)
    if money and "claim_estimate_usd" in fact_defs:
        raw = money.group(1).replace(".", "").replace(",", ".")
        try:
            _set(facts, "claim_estimate_usd", float(raw), 0.76, money)
        except ValueError:
            pass

    days = re.search(r"(?:aviso|avis[óo]).{0,30}?(\d{1,2})\s*d[ií]as?", lower)
    if days and "insurer_notice_days" in fact_defs:
        _set(facts, "insurer_notice_days", int(days.group(1)), 0.66, days)
    word_days = re.search(r"(?:aviso|avis[óo]).{0,30}?\b(cero|un|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s+d[ií]as?", lower)
    if word_days and "insurer_notice_days" in fact_defs and "insurer_notice_days" not in facts:
        day_words = {
            "cero": 0,
            "un": 1,
            "uno": 1,
            "una": 1,
            "dos": 2,
            "tres": 3,
            "cuatro": 4,
            "cinco": 5,
            "seis": 6,
            "siete": 7,
            "ocho": 8,
            "nueve": 9,
            "diez": 10,
        }
        _set(facts, "insurer_notice_days", day_words[word_days.group(1)], 0.62, word_days)

    _boolean_by_phrase(facts, fact_defs, lower, "foreign_territory", ["territorio extranjero", "fuera del pa[ií]s"], [])


def _extract_uw(lower: str, fact_defs: dict[str, Any], facts: dict[str, dict[str, Any]]) -> None:
    enum_patterns = {
        "product": [
            ("moto_proteccion", r"moto\s+protecci[oó]n"),
            ("lbc_moto_low_cost", r"moto\s+low\s+cost|low\s+cost\s+moto"),
            ("lbc_auto_kilometraje", r"auto\s+kilometraje|kilometraje"),
            ("lbc_auto", r"\blbc\s+auto\b"),
            ("otro", r"producto\s+otro|\botro\b|cotizar\s+automotor(?:es)?|seguro\s+de\s+automotor(?:es)?|pide\s+cotizar\s+automotor(?:es)?"),
        ],
        "channel": [
            ("directas", r"\bdirectas?\b|canal\s+direct"),
            ("agentes", r"\bagentes?\b"),
            ("brokers", r"\bbrokers?\b|corredor"),
            ("corporate", r"\bcorporate\b|corporativo"),
            ("wholesale", r"\bwholesale\b"),
            ("concesionario", r"concesionario"),
            ("banco", r"\bbanco\b"),
            ("entidad_financiera", r"entidad\s+financiera"),
        ],
        "client_type": [
            ("empresa", r"\bempresa\b|persona\s+jur[ií]dica"),
            ("estatal", r"\bestatal\b|sector\s+p[uú]blico"),
            ("pn_con_nit", r"persona\s+natural\s+con\s+nit|pn\s+con\s+nit"),
            ("consumer_fleet_4plus", r"flota\s+consumer|consumer.{0,20}(4|\bcuatro\b)"),
            ("consumer_individual", r"persona\s+natural|consumer\s+individual"),
        ],
        "vehicle_class": [
            ("motocicleta", r"\bmotocicleta?s?\b|\bmotos?\b(?=.{0,24}(?:\d{2,4}\s*cc|marca|modelo|cilindrada))"),
            ("camioneta", r"camioneta|pick[-\s]?up"),
            ("vagoneta", r"vagoneta"),
            ("jeep", r"\bjeep\b"),
            ("minibus", r"mini(?:b[uú]s|bus)"),
            ("furgoneta", r"furgoneta"),
            ("tractocamion", r"tractocami[oó]n"),
            ("volqueta", r"volqueta"),
            ("camion", r"cami[oó]n"),
            ("cisterna", r"cisterna"),
            ("tractor", r"\btractor\b"),
            ("trailer", r"tr[aá]iler|trailer"),
            ("microbus", r"microb[uú]s"),
            ("colectivo", r"colectivo"),
            ("omnibus", r"[oó]mnibus"),
            ("semirremolque", r"semirremolque"),
            ("remolque", r"remolque"),
            ("tolva", r"tolva"),
            ("carroceria", r"carrocer[ií]a"),
            ("liviano", r"\bliviano\b|autom[oó]vil|auto particular|veh[ií]culo liviano"),
        ],
        "segment": [
            ("comercial", r"\bcomercial\b"),
            ("pyme", r"\bpyme\b"),
            ("consumer", r"\bconsumer\b|persona\s+natural"),
        ],
    }
    for fact_id, options in enum_patterns.items():
        _match_options(facts, fact_defs, lower, fact_id, options, confidence=0.62)

    number_patterns = {
        "cilindrada_cc": r"(\d{2,4})\s*cc\b|cilindrada.{0,20}?(\d{2,4})",
        "valor_asegurado": r"(?:valor\s+asegurado|suma\s+asegurada|valor\s+del\s+(?:auto|veh[ií]culo|carro)|bs\.?|bob)\D{0,20}([0-9][0-9.,]*)",
        "vehicle_age_years": r"(\d{1,2})\s*años?\s*(?:de\s*)?(?:antig[uü]edad|antiguedad)",
        "cantidad_vehiculos": r"(\d{1,4})\s+veh[ií]culos?",
        "siniestralidad": r"siniestralidad(?:\s+hist[oó]rica)?.{0,20}?(\d{1,3}(?:[.,]\d+)?)\s*%",
        "siniestralidad_historica": r"siniestralidad(?:\s+hist[oó]rica)?.{0,20}?(\d{1,3}(?:[.,]\d+)?)\s*%",
        "model_year": r"(?:modelo|año|anio)\s*(19\d{2}|20\d{2})\b",
        "year": r"(?:modelo|año|anio)\s*(19\d{2}|20\d{2})\b",
    }
    for fact_id, pattern in number_patterns.items():
        if fact_id in fact_defs:
            _number(facts, lower, fact_id, pattern)

    text_patterns = {
        "suscriptor": r"suscriptor(?:a)?\s*[:\-]?\s*([a-záéíóúñü ]{3,40})",
        "make": r"marca\s*[:\-]?\s*([a-z0-9áéíóúñü -]{2,24})",
        "vehicle_brand": r"marca\s*[:\-]?\s*([a-z0-9áéíóúñü -]{2,24})",
        "model": r"modelo\s*[:\-]?\s*([a-z0-9áéíóúñü -]{2,24})",
    }
    for fact_id, pattern in text_patterns.items():
        if fact_id in fact_defs:
            match = re.search(pattern, lower)
            if match:
                _set(facts, fact_id, match.group(1).strip().title(), 0.58, match)
    _extract_vehicle_make_model(facts, fact_defs, lower)

    city_match = re.search(r"\b(la paz|el alto|santa cruz|cochabamba|sucre|tarija|oruro|potos[ií]|beni|pando)\b", lower)
    if city_match and "city" in fact_defs:
        _set(facts, "city", city_match.group(1).title().replace("Potosí", "Potosi"), 0.66, city_match)

    booleans = {
        "requests_standard_deviation": (["desviaci[oó]n", "condiciones est[aá]ndar especiales"], []),
        "is_mass_grouping": (["agrupaci[oó]n masiva", "colocaci[oó]n masiva"], []),
        "is_public_tender": (["licitaci[oó]n", "sector p[uú]blico"], []),
        "is_contractor_equipment": (["equipo pesado de contratistas"], []),
        "has_plates": (["placas?", "ruat"], ["sin placas?", "no tiene placas?"]),
        "is_competition_offroad": (["competici[oó]n", "off[-\\s]?road", "carreras"], []),
        "has_body_modifications": (["modificaci[oó]n.*carrocer[ií]a", "carrocer[ií]a modificada"], []),
        "is_rail_vehicle": (["sobre rieles"], []),
        "is_rental": (["rent a car", "alquiler"], []),
        "is_learning_vehicle": (["escuela de conducci[oó]n", "aprendizaje"], []),
        "circula_fuera_pais_actividad_regular": (["actividad regular.*fuera del pa[ií]s", "circula.*fuera del pa[ií]s"], []),
        "capacidad_original_mayor_8": (["m[aá]s de 8 pasajeros", "capacidad.*mayor.*8"], []),
        "servicio_publico_pasajeros": (["servicio p[uú]blico.*pasajeros"], []),
        "is_convertible_lona": (["descapotable.*lona", "techo de lona"], []),
        "is_armored": (["blindad"], []),
        "is_bomberos_policia_ejercito": (["bomberos", "polic[ií]a", "ej[eé]rcito"], []),
        "is_ambulance": (["ambulancia"], []),
        "has_foreign_plates": (["placa extranjera", "placas extranjeras"], []),
        "is_brevet_policy": (["brevet"], []),
        "has_rc": (["responsabilidad civil", r"\brc\b"], []),
        "has_ap": (["accidentes personales", r"\bap\b"], []),
        "is_enlatado": (["enlatado"], []),
        "es_moto_lujo_o_competicion": (["bmw", "ducati", "ducatti", "street legal", "moto.*lujo"], []),
    }
    for fact_id, (positive, negative) in booleans.items():
        _boolean_by_phrase(facts, fact_defs, lower, fact_id, positive, negative)


def _extract_vehicle_make_model(
    facts: dict[str, dict[str, Any]],
    fact_defs: dict[str, Any],
    lower: str,
) -> None:
    if {"make", "vehicle_brand", "model"}.issubset(facts):
        return
    brands = [
        "mercedes benz",
        "great wall",
        "toyota",
        "nissan",
        "suzuki",
        "mitsubishi",
        "mazda",
        "ford",
        "volkswagen",
        "honda",
        "bmw",
        "kia",
        "hyundai",
        "chevrolet",
        "renault",
        "peugeot",
        "mercedes",
        "audi",
        "jeep",
        "fiat",
        "dodge",
        "lexus",
        "subaru",
        "isuzu",
        "volvo",
        "citroen",
        "jac",
        "chery",
        "haval",
    ]
    pattern = r"\b(" + "|".join(re.escape(brand) for brand in brands) + r")\s+([a-z0-9][a-z0-9-]{1,24})\b"
    for match in re.finditer(pattern, lower):
        brand = match.group(1).strip()
        model = match.group(2).strip()
        if model in {"ano", "anio", "año", "modelo", "valor", "plaza", "ciudad", "marca"}:
            continue
        if "make" in fact_defs and "make" not in facts:
            _set(facts, "make", brand.title(), 0.58, match)
        if "vehicle_brand" in fact_defs and "vehicle_brand" not in facts:
            _set(facts, "vehicle_brand", brand.title(), 0.58, match)
        if "model" in fact_defs and "model" not in facts:
            _set(facts, "model", model.title(), 0.58, match)
        return


def _match_options(
    facts: dict[str, dict[str, Any]],
    fact_defs: dict[str, Any],
    lower: str,
    fact_id: str,
    options: list[tuple[Any, str]],
    *,
    confidence: float,
) -> None:
    if fact_id not in fact_defs or fact_id in facts:
        return
    for value, pattern in options:
        match = re.search(pattern, lower)
        if match:
            _set(facts, fact_id, value, confidence, match)
            return


def _number(facts: dict[str, dict[str, Any]], lower: str, fact_id: str, pattern: str) -> None:
    if fact_id in facts:
        return
    match = re.search(pattern, lower)
    if not match:
        return
    raw = next((g for g in match.groups() if g), "")
    try:
        value: Union[int, float] = _parse_number(raw)
    except ValueError:
        return
    if float(value).is_integer():
        value = int(value)
    _set(facts, fact_id, value, 0.66, match)


def _parse_number(raw: str) -> float:
    cleaned = raw.strip().replace(" ", "")
    if "," in cleaned and "." in cleaned:
        cleaned = cleaned.replace(".", "").replace(",", ".")
    elif "," in cleaned:
        cleaned = cleaned.replace(",", ".")
    return float(cleaned)


def _boolean_by_phrase(
    facts: dict[str, dict[str, Any]],
    fact_defs: dict[str, Any],
    lower: str,
    fact_id: str,
    positive_patterns: list[str],
    negative_patterns: list[str],
) -> None:
    if fact_id not in fact_defs or fact_id in facts:
        return
    negatives = list(negative_patterns)
    negatives.extend([rf"\b(?:no|sin)\b.{{0,24}}{p}" for p in positive_patterns])
    for pattern in negatives:
        match = re.search(pattern, lower)
        if match:
            _set(facts, fact_id, False, 0.56, match)
            return
    for pattern in positive_patterns:
        match = re.search(pattern, lower)
        if match:
            _set(facts, fact_id, True, 0.56, match)
            return


def _set(
    facts: dict[str, dict[str, Any]],
    fact_id: str,
    value: Any,
    confidence: float,
    match: Optional[re.Match[str]] = None,
) -> None:
    if fact_id in facts:
        return
    item: dict[str, Any] = {
        "value": value,
        "confidence": confidence,
        "confirmed": False,
    }
    if match:
        item["evidence_span"] = [match.start(), match.end()]
    facts[fact_id] = item


def _media_status(attachments: list[dict[str, Any]], ai: Optional[dict[str, Any]] = None) -> dict[str, Any]:
    ai_items = list(((ai or {}).get("media") or {}).get("items") or [])
    items: list[dict[str, Any]] = []
    requires_processing = False
    for index, attachment in enumerate(attachments):
        mime = str(attachment.get("mime") or "")
        kind = str(attachment.get("kind") or ("audio" if mime.startswith("audio/") else "photo" if mime.startswith("image/") else "file"))
        data_url = str(attachment.get("data_url") or "")
        has_payload = data_url.startswith("data:")
        ai_item = ai_items[index] if index < len(ai_items) else None
        if kind in {"photo", "audio"}:
            status = ai_item.get("status") if ai_item else "media_provider_required"
            requires_processing = requires_processing or status not in {"sent_to_vision_parser", "transcribed"}
        else:
            status = "attached_as_evidence"
        note = _media_note(kind, status, has_payload)
        item = {
            "kind": kind,
            "name": attachment.get("name"),
            "mime": mime,
            "status": status,
            "status_label": _media_status_label(status),
            "has_payload": has_payload,
            "payload_status": attachment.get("payload_status"),
            "note": note,
        }
        if ai_item and ai_item.get("extracted_text"):
            item["extracted_text"] = ai_item["extracted_text"]
        items.append(
            item
        )
    media = {
        "count": len(items),
        "requires_processing": requires_processing,
        "items": items,
    }
    if ai:
        ai_media = ai.get("media") or {}
        media["ai_parser"] = {
            "used": bool(ai.get("used")),
            "model": ai.get("model"),
            "transcription_model": ai_media.get("transcription_model"),
            "language": ai_media.get("language"),
            "errors": ai.get("errors") or [],
            "media_notes": ai_media.get("media_notes") or [],
        }
        if ai_media.get("transcript_text"):
            media["transcript_text"] = ai_media["transcript_text"]
    return media


def _media_note(kind: str, status: str, has_payload: bool) -> str:
    if status == "sent_to_vision_parser":
        return "La imagen fue enviada al parser de visión; cualquier hecho sugerido queda pendiente de revisión humana."
    if status == "vision_parser_failed":
        return "No se pudo procesar la imagen con visión; revise el adjunto antes de confirmar hechos."
    if status == "transcribed":
        return "El audio fue transcrito; cualquier hecho sugerido queda pendiente de revisión humana."
    if status == "media_parser_disabled":
        return "El parser multimedia está desactivado; no se infirieron hechos desde este adjunto."
    if status == "transcription_failed":
        return "No se pudo transcribir el audio; revise el adjunto antes de confirmar hechos."
    if status == "media_payload_missing":
        return "El adjunto llegó como evidencia, pero sin contenido procesable para OCR/transcripción."
    if kind in {"photo", "audio"} and has_payload:
        return "Adjunto recibido; no se infirieron hechos sin OCR/transcripción."
    if kind in {"photo", "audio"}:
        return "No se infirieron hechos desde el adjunto sin OCR/transcripción."
    return "Adjunto conservado como evidencia."


def _media_status_label(status: str) -> str:
    labels = {
        "attached_as_evidence": "Adjunto como evidencia",
        "media_provider_required": "Requiere OCR/transcripción",
        "sent_to_vision_parser": "Procesado por visión",
        "vision_parser_failed": "Falló visión",
        "transcribed": "Audio transcrito",
        "transcription_empty": "Transcripción vacía",
        "transcription_failed": "Falló transcripción",
        "media_parser_disabled": "Parser multimedia desactivado",
        "media_payload_missing": "Sin contenido procesable",
    }
    return labels.get(status, status)


def _parser_status(ai: Optional[dict[str, Any]]) -> dict[str, Any]:
    if not ai:
        return {
            "mode": "heuristic",
            "advisory_only": True,
            "language": "es",
        }
    return {
        "mode": "openai_plus_heuristic" if ai.get("used") else "heuristic",
        "model": ai.get("model"),
        "advisory_only": True,
        "language": ((ai.get("media") or {}).get("language")) or "es",
        "errors": ai.get("errors") or [],
    }
