"""Motor demo de tarificación para precios de sandbox.

Este módulo no está respaldado por fuente. Le da a la plataforma un esqueleto
reutilizable de tarificación mientras no existan tablas tarifarias/CRM reales.
"""

from __future__ import annotations

import math
import re
import unicodedata
from copy import deepcopy
from datetime import date
from typing import Any


TYPE_BASE_RATES = {
    "liviano": {"rate": 0.028, "minimum": 1200.0, "label": "Vehículo liviano"},
    "auto": {"rate": 0.028, "minimum": 1200.0, "label": "Auto"},
    "camioneta": {"rate": 0.031, "minimum": 1350.0, "label": "Camioneta"},
    "vagoneta": {"rate": 0.030, "minimum": 1300.0, "label": "Vagoneta"},
    "jeep": {"rate": 0.032, "minimum": 1400.0, "label": "Jeep / SUV"},
    "suv": {"rate": 0.032, "minimum": 1400.0, "label": "SUV"},
    "motocicleta": {"rate": 0.047, "minimum": 900.0, "label": "Motocicleta"},
    "minibus": {"rate": 0.039, "minimum": 1700.0, "label": "Minibus"},
    "furgoneta": {"rate": 0.036, "minimum": 1550.0, "label": "Furgoneta"},
    "camion": {"rate": 0.045, "minimum": 2200.0, "label": "Camión"},
    "pesado": {"rate": 0.052, "minimum": 2600.0, "label": "Vehículo pesado"},
}

TYPE_ALIASES = {
    "automovil": "auto",
    "car": "auto",
    "coche": "auto",
    "sedan": "auto",
    "light": "liviano",
    "pickup": "camioneta",
    "pick_up": "camioneta",
    "vagon": "vagoneta",
    "wagon": "vagoneta",
    "camioneta_suv": "suv",
    "moto": "motocicleta",
    "motorcycle": "motocicleta",
    "van": "furgoneta",
    "truck": "camion",
    "heavy": "pesado",
}

CITY_FACTORS = {
    "la_paz": {"factor": 1.04, "label": "La Paz"},
    "el_alto": {"factor": 1.06, "label": "El Alto"},
    "santa_cruz": {"factor": 1.10, "label": "Santa Cruz"},
    "cochabamba": {"factor": 1.02, "label": "Cochabamba"},
    "sucre": {"factor": 0.98, "label": "Sucre"},
    "tarija": {"factor": 0.97, "label": "Tarija"},
    "oruro": {"factor": 0.99, "label": "Oruro"},
    "potosi": {"factor": 0.98, "label": "Potosi"},
    "beni": {"factor": 1.05, "label": "Beni"},
    "pando": {"factor": 1.05, "label": "Pando"},
    "resto": {"factor": 1.00, "label": "Otra ciudad"},
}

LUXURY_MAKES = {
    "audi",
    "bmw",
    "ducati",
    "land_rover",
    "lexus",
    "mercedes",
    "mercedes_benz",
    "porsche",
    "tesla",
    "volvo",
}

SPORT_MODEL_TOKENS = {"amg", "m", "rs", "srt", "turbo", "wrx", "raptor", "mustang", "camaro"}
ELECTRIC_MODEL_TOKENS = {"electric", "electrico", "hybrid", "hibrido", "ev"}

DEFAULT_RATING_WEIGHTS = {
    "vehicle_types": TYPE_BASE_RATES,
    "cities": CITY_FACTORS,
    "age_bands": [
        {"max_age": 2, "factor": 0.93, "label": "Factor antigüedad 0-2 años"},
        {"max_age": 5, "factor": 0.98, "label": "Factor antigüedad 3-5 años"},
        {"max_age": 10, "factor": 1.05, "label": "Factor antigüedad 6-10 años"},
        {"max_age": 15, "factor": 1.14, "label": "Factor antigüedad 11-15 años"},
        {"max_age": 20, "factor": 1.28, "label": "Factor antigüedad 16-20 años"},
        {"max_age": None, "factor": 1.55, "label": "Factor antigüedad mayor a 20 años", "review": "vehicle_age_over_20"},
    ],
    "loss_ratio_bands": [
        {"max_ratio": 0, "factor": 0.95, "label": "Sin señal histórica de siniestros"},
        {"max_ratio": 30, "factor": 0.97, "label": "Siniestralidad histórica baja"},
        {"max_ratio": 65, "factor": 1.00, "label": "Siniestralidad histórica esperada"},
        {"max_ratio": 100, "factor": 1.08, "label": "Siniestralidad histórica elevada"},
        {"max_ratio": 150, "factor": 1.18, "label": "Siniestralidad histórica alta"},
        {"max_ratio": 250, "factor": 1.35, "label": "Siniestralidad histórica muy alta"},
        {"max_ratio": None, "factor": 1.65, "label": "Siniestralidad histórica extrema", "review": "extreme_siniestralidad_demo_review"},
    ],
    "make_model": {
        "luxury_makes": sorted(LUXURY_MAKES),
        "luxury_factor": 1.18,
        "sport_tokens": sorted(SPORT_MODEL_TOKENS),
        "sport_factor": 1.12,
        "electric_tokens": sorted(ELECTRIC_MODEL_TOKENS),
        "electric_factor": 1.08,
        "standard_factor": 1.00,
    },
    "high_value_review_threshold": 500000.0,
}


def quote_demo_price(facts: dict[str, Any], rating_weights: dict[str, Any] | None = None) -> dict[str, Any]:
    """Devuelve una prima demo no vinculante usando factores determinísticos simples."""
    weights = _merge_weights(rating_weights)

    insured_value = _number_from_any(
        _first(facts, "valor_asegurado", "car_value", "insured_value", "vehicle_value"),
        "valor asegurado",
    )
    if insured_value <= 0:
        raise ValueError("valor asegurado debe ser mayor que cero")

    model_year = int(
        _number_from_any(_first(facts, "model_year", "year", "anio", "año"), "año modelo")
    )
    current_year = date.today().year
    if model_year < 1950 or model_year > current_year + 1:
        raise ValueError(f"año modelo debe estar entre 1950 y {current_year + 1}")
    vehicle_age = max(0, current_year - model_year)

    make = _text(_first(facts, "make", "marca", "vehicle_brand"), "marca")
    model = _text(_first(facts, "model", "modelo"), "modelo")

    raw_type = _text(_first(facts, "vehicle_type", "vehicle_class", "type", "tipo"), "tipo de vehículo")
    type_key = TYPE_ALIASES.get(_key(raw_type), _key(raw_type))
    type_rates = weights["vehicle_types"]
    if type_key not in type_rates:
        allowed = ", ".join(sorted(type_rates))
        raise ValueError(f"unsupported tipo de vehículo '{raw_type}'. Tipos demo permitidos: {allowed}")

    raw_city = _text(_first(facts, "city", "plaza", "driving_city", "driving_plaza", "ciudad"), "plaza de circulación")
    city_key = _key(raw_city)
    city_factors = weights["cities"]
    city_known = city_key in city_factors
    if not city_known:
        city_key = "resto"

    loss_ratio = _optional_number(
        _first(facts, "siniestralidad_historica", "historic_loss_ratio", "loss_history_percent"),
        default=0.0,
    )
    if loss_ratio < 0:
        raise ValueError("la siniestralidad histórica debe ser cero o mayor")
    if loss_ratio > 1000:
        raise ValueError("la siniestralidad histórica está fuera del rango del motor demo")

    type_spec = type_rates[type_key]
    base_rate = type_spec["rate"]
    minimum_premium = type_spec["minimum"]

    age_factor, age_label, age_review = _age_factor(vehicle_age, weights)
    loss_factor, loss_label, loss_review = _loss_factor(loss_ratio, weights)
    make_factor, make_label = _make_model_factor(make, model, weights)
    city_factor = city_factors[city_key]["factor"]

    factors = [
        {
            "key": "vehicle_type",
            "label": f"{type_spec['label']} tasa base",
            "value": type_key,
            "base_rate": base_rate,
        },
        {"key": "city", "label": city_factors[city_key]["label"], "value": raw_city, "multiplier": city_factor},
        {"key": "vehicle_age", "label": age_label, "value": vehicle_age, "multiplier": age_factor},
        {"key": "make_model", "label": make_label, "value": f"{make} {model}", "multiplier": make_factor},
        {
            "key": "siniestralidad_historica",
            "label": loss_label,
            "value": loss_ratio,
            "multiplier": loss_factor,
        },
    ]

    combined_multiplier = math.prod(float(f.get("multiplier", 1.0)) for f in factors)
    technical_rate = base_rate * combined_multiplier
    raw_premium = insured_value * technical_rate
    annual_premium = max(raw_premium, minimum_premium)
    minimum_applied = annual_premium != raw_premium

    review_reasons = []
    if not city_known:
        review_reasons.append("city_mapped_to_resto")
    if age_review:
        review_reasons.append(age_review)
    if loss_review:
        review_reasons.append(loss_review)
    if insured_value >= float(weights.get("high_value_review_threshold") or 500000):
        review_reasons.append("high_value_demo_review")

    outcome = "human_pricing_review" if review_reasons else "priced_demo"
    rounded_annual = _money(annual_premium)

    return {
        "engine": "demo_rating",
        "demo_only": True,
        "source_backed": False,
        "outcome": outcome,
        "currency": "BOB",
        "annual_premium_bob": rounded_annual,
        "monthly_reference_bob": _money(rounded_annual / 12),
        "technical_rate": round(technical_rate, 6),
        "base_rate": base_rate,
        "combined_multiplier": round(combined_multiplier, 4),
        "minimum_premium_bob": _money(minimum_premium),
        "minimum_applied": minimum_applied,
        "review_reasons": review_reasons,
        "inputs": {
            "valor_asegurado": _money(insured_value),
            "model_year": model_year,
            "vehicle_age_years": vehicle_age,
            "make": make,
            "model": model,
            "vehicle_type": type_key,
            "city": city_factors[city_key]["label"],
            "siniestralidad_historica": loss_ratio,
        },
        "rating_weights_version": "demo-configurable-v1",
        "breakdown": factors,
        "caveats": [
            {
                "kind": "demo_pricing",
                "message": "Heurística demo solamente. No es cotización vinculante ni proviene de representation/ o tablas tarifarias CRM.",
            },
            {
                "kind": "pricing_scope",
                "message": "Excluye impuestos, cargos, recargos por plan de pagos, aprobación de suscripción, selección de coberturas, deducibles y conciliación con sistema de pólizas.",
            },
        ],
    }


def demo_rating_schema() -> dict[str, Any]:
    return {
        "engine": "demo_rating",
        "demo_only": True,
        "weights": demo_rating_weights(),
        "fields": [
            {"id": "valor_asegurado", "label": "Valor asegurado", "type": "number", "unit": "BOB", "required": True},
            {"id": "model_year", "label": "Año modelo", "type": "number", "required": True},
            {"id": "make", "label": "Marca", "type": "string", "required": True},
            {"id": "model", "label": "Modelo", "type": "string", "required": True},
            {"id": "vehicle_type", "label": "Tipo de vehículo", "type": "enum", "values": sorted(TYPE_BASE_RATES), "required": True},
            {"id": "city", "label": "Plaza de circulación", "type": "enum", "values": [v["label"] for v in CITY_FACTORS.values()], "required": True},
            {"id": "siniestralidad_historica", "label": "Siniestralidad histórica", "type": "number", "unit": "%", "required": False},
        ],
    }


def demo_rating_weights() -> dict[str, Any]:
    return deepcopy(DEFAULT_RATING_WEIGHTS)


def _age_factor(age: int, weights: dict[str, Any]) -> tuple[float, str, str | None]:
    return _band_factor(age, weights["age_bands"], max_key="max_age")


def _loss_factor(loss_ratio: float, weights: dict[str, Any]) -> tuple[float, str, str | None]:
    return _band_factor(loss_ratio, weights["loss_ratio_bands"], max_key="max_ratio")


def _band_factor(value: float, bands: list[dict[str, Any]], *, max_key: str) -> tuple[float, str, str | None]:
    for band in bands:
        max_value = band.get(max_key)
        if max_value is None or value <= float(max_value):
            return (
                float(band.get("factor", 1.0)),
                str(band.get("label") or f"{max_key} {max_value}"),
                band.get("review"),
            )
    return 1.0, "Factor por defecto", None


def _make_model_factor(make: str, model: str, weights: dict[str, Any]) -> tuple[float, str]:
    config = weights.get("make_model") or weights.get("marca_model") or {}
    make_key = _key(make)
    model_key = _key(model)
    tokens = set(model_key.split("_"))
    luxury_makes = {_key(v) for v in (config.get("luxury_makes") or config.get("luxury_marcas") or [])}
    sport_tokens = {_key(v) for v in config.get("sport_tokens", [])}
    electric_tokens = {_key(v) for v in config.get("electric_tokens", [])}
    if make_key in luxury_makes:
        return float(config.get("luxury_factor", 1.18)), "Factor marca premium / alto costo"
    if tokens & sport_tokens:
        return float(config.get("sport_factor", 1.12)), "Factor modelo deportivo / performance"
    if tokens & electric_tokens:
        return float(config.get("electric_factor", 1.08)), "Factor modelo eléctrico / híbrido"
    return float(config.get("standard_factor", 1.0)), "Factor estándar marca/modelo"


def _merge_weights(overrides: dict[str, Any] | None) -> dict[str, Any]:
    weights = demo_rating_weights()
    if not overrides:
        return weights
    _deep_update(weights, overrides)
    return weights


def _deep_update(base: dict[str, Any], overrides: dict[str, Any]) -> None:
    for key, value in overrides.items():
        if isinstance(value, dict) and isinstance(base.get(key), dict):
            _deep_update(base[key], value)
        else:
            base[key] = value


def _first(facts: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        if key in facts and facts[key] not in (None, ""):
            return facts[key]
    return None


def _text(value: Any, label: str) -> str:
    if value is None:
        raise ValueError(f"{label} es requerido")
    text = str(value).strip()
    if not text:
        raise ValueError(f"{label} es requerido")
    return text


def _optional_number(value: Any, *, default: float) -> float:
    if value is None or value == "":
        return default
    return _number_from_any(value, "número")


def _number_from_any(value: Any, label: str) -> float:
    if value is None or value == "":
        raise ValueError(f"{label} es requerido")
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip()
    if not text:
        raise ValueError(f"{label} es requerido")
    text = re.sub(r"[^\d,.\-]", "", text)
    if "," in text and "." in text:
        if text.rfind(",") > text.rfind("."):
            text = text.replace(".", "").replace(",", ".")
        else:
            text = text.replace(",", "")
    elif "," in text:
        left, right = text.rsplit(",", 1)
        text = left.replace(",", "") + "." + right if len(right) == 2 else text.replace(",", "")
    elif text.count(".") > 1:
        left, right = text.rsplit(".", 1)
        text = left.replace(".", "") + "." + right
    try:
        return float(text)
    except ValueError as exc:
        raise ValueError(f"{label} debe ser numérico") from exc


def _key(value: Any) -> str:
    text = unicodedata.normalize("NFKD", str(value)).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_")


def _money(value: float) -> float:
    return round(float(value) + 1e-9, 2)
