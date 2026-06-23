"""LBC Auto rating formula, isolated from the executable UW graph.

The constants in this module come from user-supplied API observations, not from
the source manuals in representation/. The underwriting tree stays source-backed;
this module is a separate pricing compartment that can be replaced by a live
SAVIA/ATIC integration later without changing crawlable graph artifacts.
"""

from __future__ import annotations

import re
import unicodedata
from copy import deepcopy
from datetime import date
from typing import Any


def _key(value: Any) -> str:
    text = unicodedata.normalize("NFKD", str(value)).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_")


RATING_VERSION = "lbc-auto-reverse-engineered-2026-06-22-v1"
CALIBRATION_SOURCE = "user_supplied_lbc_api_formula_2026_06_22"

P1_MINIMUM_BOB = 3800.0
P2_MINIMUM_BOB = 3500.0
P3_MINIMUM_BOB = 3000.0
P1_MAXIMUM_BOB = 15000.0
EXTRATERRITORIALIDAD_BOB = 400.0
CREDIT_SURCHARGE_FACTOR = 1.10

BASE_P1_AT_200K_BOB = 7049.0
BASE_RATE_150K_250K = BASE_P1_AT_200K_BOB / 200000.0

VALUE_TIERS = [
    {
        "id": "floor_to_125k",
        "label": "Valor hasta Bs. 125.000: prima minima",
        "upper": 125000.0,
        "mode": "floor",
        "floor_bob": P1_MINIMUM_BOB,
    },
    {
        "id": "125k_to_150k",
        "label": "Valor Bs. 125.001 a 149.999",
        "upper": 150000.0,
        "base_rate": 0.0361,
    },
    {
        "id": "150k_to_250k",
        "label": "Valor Bs. 150.000 a 249.999",
        "upper": 250000.0,
        "base_rate": BASE_RATE_150K_250K,
    },
    {
        "id": "250k_to_500k",
        "label": "Valor Bs. 250.000 a 499.999",
        "upper": 500000.0,
        "base_rate": 0.0320,
    },
    {
        "id": "500k_plus",
        "label": "Valor desde Bs. 500.000: aplica tope de prima",
        "upper": None,
        "base_rate": 0.0320,
    },
]

CITY_SPECS = {
    "la_paz": {
        "plaza_auto": 1,
        "label": "La Paz",
        "factor": 1.0,
        "franchise_group": "high",
        "observed_p1_at_200k": 7049.0,
        "aliases": ["lapaz", "lp"],
    },
    "santa_cruz": {
        "plaza_auto": 2,
        "label": "Santa Cruz",
        "factor": 7862.0 / BASE_P1_AT_200K_BOB,
        "franchise_group": "high",
        "observed_p1_at_200k": 7862.0,
        "aliases": ["santa_cruz_de_la_sierra", "scz"],
    },
    "cochabamba": {
        "plaza_auto": 3,
        "label": "Cochabamba",
        "factor": 6777.0 / BASE_P1_AT_200K_BOB,
        "franchise_group": "high",
        "observed_p1_at_200k": 6777.0,
        "aliases": ["cbba"],
    },
    "oruro": {
        "plaza_auto": 4,
        "label": "Oruro",
        "factor": 6526.0 / BASE_P1_AT_200K_BOB,
        "franchise_group": "low",
        "observed_p1_at_200k": 6526.0,
        "aliases": [],
    },
    "potosi": {
        "plaza_auto": 5,
        "label": "Potosi",
        "factor": 7530.0 / BASE_P1_AT_200K_BOB,
        "franchise_group": "low",
        "observed_p1_at_200k": 7530.0,
        "aliases": [],
    },
    "tarija": {
        "plaza_auto": 6,
        "label": "Tarija",
        "factor": 6024.0 / BASE_P1_AT_200K_BOB,
        "franchise_group": "low",
        "observed_p1_at_200k": 6024.0,
        "aliases": [],
    },
    "sucre": {
        "plaza_auto": 7,
        "label": "Sucre",
        "factor": 5000.0 / BASE_P1_AT_200K_BOB,
        "franchise_group": "low",
        "observed_p1_at_200k": 5000.0,
        "aliases": ["chuquisaca"],
    },
    "trinidad": {
        "plaza_auto": 8,
        "label": "Trinidad",
        "factor": 6161.0 / BASE_P1_AT_200K_BOB,
        "franchise_group": "low",
        "observed_p1_at_200k": 6161.0,
        "aliases": ["beni"],
    },
}

BRAND_SPECS = {
    "44": {
        "marca_auto": 44,
        "label": "Toyota",
        "factor": 1.0,
        "observed_p1_at_200k": 7049.0,
        "aliases": ["toyota"],
    },
    "3": {
        "marca_auto": 3,
        "label": "BMW",
        "factor": 7895.0 / BASE_P1_AT_200K_BOB,
        "observed_p1_at_200k": 7895.0,
        "aliases": ["bmw"],
    },
    "10": {
        "marca_auto": 10,
        "label": "Marca 10",
        "factor": 8223.0 / BASE_P1_AT_200K_BOB,
        "observed_p1_at_200k": 8223.0,
        "aliases": ["marca_10"],
    },
    "2": {
        "marca_auto": 2,
        "label": "Marca 2",
        "factor": 6087.0 / BASE_P1_AT_200K_BOB,
        "observed_p1_at_200k": 6087.0,
        "aliases": ["marca_2"],
    },
    "40": {
        "marca_auto": 40,
        "label": "Marca 40",
        "factor": 6087.0 / BASE_P1_AT_200K_BOB,
        "observed_p1_at_200k": 6087.0,
        "aliases": ["marca_40"],
    },
    "50": {
        "marca_auto": 50,
        "label": "Marca 50",
        "factor": 6087.0 / BASE_P1_AT_200K_BOB,
        "observed_p1_at_200k": 6087.0,
        "aliases": ["marca_50"],
    },
}

AGE_BANDS = [
    {
        "id": "0_1",
        "label": "Modelo 0-1 anios",
        "max_age": 1,
        "factor": 7476.0 / BASE_P1_AT_200K_BOB,
        "observed_p1_at_200k": 7476.0,
    },
    {
        "id": "2_4",
        "label": "Modelo 2-4 anios",
        "max_age": 4,
        "factor": 7348.0 / BASE_P1_AT_200K_BOB,
        "observed_p1_at_200k": 7348.0,
    },
    {
        "id": "5_9",
        "label": "Modelo 5-9 anios",
        "max_age": 9,
        "factor": 1.0,
        "observed_p1_at_200k": 7049.0,
    },
    {
        "id": "10_16",
        "label": "Modelo 10-16 anios",
        "max_age": 16,
        "factor": 6835.0 / BASE_P1_AT_200K_BOB,
        "observed_p1_at_200k": 6835.0,
    },
    {
        "id": "17_plus",
        "label": "Modelo 17+ anios",
        "max_age": None,
        "factor": 6728.0 / BASE_P1_AT_200K_BOB,
        "observed_p1_at_200k": 6728.0,
    },
]

OPTION_SPECS = [
    {
        "id": "option_1",
        "label": "Opcion 1 - Franquicia Reducida",
        "ratio_to_p1": 1.0,
        "minimum_bob": P1_MINIMUM_BOB,
        "franchise_high_bob": 1000.0,
        "franchise_low_bob": 500.0,
    },
    {
        "id": "option_2",
        "label": "Opcion 2 - Plan Equilibrado",
        "ratio_to_p1": 0.89,
        "minimum_bob": P2_MINIMUM_BOB,
        "franchise_high_bob": 2000.0,
        "franchise_low_bob": 1500.0,
    },
    {
        "id": "option_3",
        "label": "Opcion 3 - Prima Reducida",
        "ratio_to_p1": 0.65,
        "minimum_bob": P3_MINIMUM_BOB,
        "franchise_high_bob": 3500.0,
        "franchise_low_bob": 1600.0,
    },
]

CITY_ALIAS_TO_KEY = {
    alias: key
    for key, spec in CITY_SPECS.items()
    for alias in {key, _key(spec["label"]), *(spec.get("aliases") or [])}
}
CITY_ID_TO_KEY = {str(spec["plaza_auto"]): key for key, spec in CITY_SPECS.items()}

BRAND_ALIAS_TO_KEY = {
    alias: key
    for key, spec in BRAND_SPECS.items()
    for alias in {key, str(spec["marca_auto"]), _key(spec["label"]), *(spec.get("aliases") or [])}
}


def quote_lbc_auto_price(facts: dict[str, Any]) -> dict[str, Any]:
    """Return the three LBC Auto price options and selected final option."""
    if not isinstance(facts, dict):
        raise TypeError("pricing facts debe ser un objeto")

    insured_value = _number_from_any(
        _first(facts, "valor_asegurado", "valor_comercial", "car_value", "insured_value", "vehicle_value"),
        "valor comercial",
    )
    if insured_value <= 0:
        raise ValueError("valor comercial debe ser mayor que cero")

    model_year = int(_number_from_any(_first(facts, "model_year", "year", "anio", "ano"), "anio modelo"))
    current_year = date.today().year
    if model_year < 1950 or model_year > current_year + 1:
        raise ValueError(f"anio modelo debe estar entre 1950 y {current_year + 1}")

    city, city_review = _city_from_facts(facts)
    brand, brand_review = _brand_from_facts(facts)
    age_band = _age_band(current_year - min(model_year, current_year))
    value_tier = _value_tier(insured_value)
    selected_option_id = _selected_option_id(_first(facts, "selected_pricing_option", "pricing_option", "opcion", "option"))
    extraterritorial = _bool_from_any(
        _first(facts, "extraterritorialidad", "extraterritorial", "has_extraterritoriality"),
        default=False,
    )
    installments = _installments(_first(facts, "cuotas", "n_cuotas", "installments"))

    if value_tier.get("mode") == "floor":
        adjusted_rate = None
        raw_p1 = None
        p1_before_extra = P1_MINIMUM_BOB
        minimum_applied = True
        cap_applied = False
    else:
        base_rate = float(value_tier["base_rate"])
        combined_multiplier = city["factor"] * brand["factor"] * age_band["factor"]
        adjusted_rate = base_rate * combined_multiplier
        raw_p1 = insured_value * adjusted_rate
        floored = max(P1_MINIMUM_BOB, raw_p1)
        p1_before_extra = min(P1_MAXIMUM_BOB, floored)
        minimum_applied = floored != raw_p1
        cap_applied = p1_before_extra != floored

    extra = EXTRATERRITORIALIDAD_BOB if extraterritorial else 0.0
    options = _build_options(
        p1_before_extra,
        extra_bob=extra,
        installments=installments,
        franchise_group=city["franchise_group"],
    )
    selected = next(option for option in options if option["id"] == selected_option_id)

    review_reasons = []
    if city_review:
        review_reasons.append(city_review)
    if brand_review:
        review_reasons.append(brand_review)

    combined_multiplier = city["factor"] * brand["factor"] * age_band["factor"]
    breakdown = [
        {
            "key": "value_tier",
            "label": value_tier["label"],
            "value": _money(insured_value),
            **({"base_rate": round(float(value_tier["base_rate"]), 6)} if "base_rate" in value_tier else {"amount_bob": P1_MINIMUM_BOB}),
        },
        {"key": "city", "label": city["label"], "value": city.get("plaza_auto"), "multiplier": round(city["factor"], 4)},
        {"key": "brand", "label": brand["label"], "value": brand.get("marca_auto"), "multiplier": round(brand["factor"], 4)},
        {
            "key": "vehicle_year_band",
            "label": age_band["label"],
            "value": model_year,
            "multiplier": round(age_band["factor"], 4),
        },
    ]
    if extra:
        breakdown.append(
            {
                "key": "extraterritorialidad",
                "label": "Extraterritorialidad",
                "value": "si",
                "amount_bob": extra,
            }
        )
    if installments > 1:
        breakdown.append(
            {
                "key": "credit_surcharge",
                "label": f"Recargo credito {installments} cuotas",
                "value": installments,
                "multiplier": CREDIT_SURCHARGE_FACTOR,
            }
        )

    outcome = "human_pricing_review" if review_reasons else "priced_lbc_auto"
    annual = selected["cash_annual_premium_bob"]
    credit = selected["credit_total_bob"]
    return {
        "engine": "lbc_auto_rating",
        "demo_only": False,
        "source_backed": False,
        "calibration_source": CALIBRATION_SOURCE,
        "formula_version": RATING_VERSION,
        "outcome": outcome,
        "currency": "BOB",
        "selected_option": selected_option_id,
        "annual_premium_bob": annual,
        "monthly_reference_bob": _money(annual / 12),
        "credit_total_bob": credit,
        "installment_amount_bob": selected["installment_amount_bob"],
        "technical_rate": round(adjusted_rate or 0.0, 6),
        "base_rate": round(float(value_tier.get("base_rate") or 0.0), 6),
        "combined_multiplier": round(combined_multiplier, 4),
        "raw_p1_premium_bob": _money(raw_p1) if raw_p1 is not None else None,
        "p1_before_extraterritoriality_bob": _money(p1_before_extra),
        "minimum_premium_bob": P1_MINIMUM_BOB,
        "minimum_applied": minimum_applied,
        "maximum_premium_bob": P1_MAXIMUM_BOB,
        "cap_applied": cap_applied,
        "extraterritorialidad": extraterritorial,
        "extraterritorialidad_bob": extra,
        "cuotas": installments,
        "credit_surcharge_factor": CREDIT_SURCHARGE_FACTOR if installments > 1 else 1.0,
        "options": options,
        "review_reasons": review_reasons,
        "inputs": {
            "valor_asegurado": _money(insured_value),
            "model_year": model_year,
            "vehicle_age_years": max(0, current_year - model_year),
            "make": str(_first(facts, "make", "marca", "vehicle_brand", "brand") or brand["label"]),
            "model": str(_first(facts, "model", "modelo") or ""),
            "marca_auto": brand.get("marca_auto"),
            "city": city["label"],
            "plaza_auto": city.get("plaza_auto"),
            "franchise_group": city["franchise_group"],
            "selected_option": selected_option_id,
            "extraterritorialidad": extraterritorial,
            "cuotas": installments,
        },
        "breakdown": breakdown,
        "caveats": [
            {
                "kind": "reverse_engineered_pricing",
                "source": CALIBRATION_SOURCE,
                "message": "Formula calibrada con observaciones de API provistas por el usuario; no consulta SAVIA/ATIC en vivo.",
            },
            {
                "kind": "pricing_scope",
                "message": "Incluye prima anual, extraterritorialidad y recargo de credito; no agrega impuestos ni validaciones externas de poliza.",
            },
        ],
    }


def lbc_auto_rating_schema() -> dict[str, Any]:
    return {
        "engine": "lbc_auto_rating",
        "demo_only": False,
        "source_backed": False,
        "formula_version": RATING_VERSION,
        "calibration_source": CALIBRATION_SOURCE,
        "fields": [
            {"id": "valor_asegurado", "label": "Valor comercial / asegurado", "type": "number", "unit": "BOB", "required": True},
            {"id": "model_year", "label": "Anio modelo", "type": "number", "required": True},
            {"id": "make", "label": "Marca", "type": "string", "required": True},
            {"id": "marca_auto", "label": "ID marca RUAT", "type": "number", "required": False},
            {"id": "model", "label": "Modelo", "type": "string", "required": False},
            {"id": "city", "label": "Plaza de circulacion", "type": "enum", "values": [spec["label"] for spec in CITY_SPECS.values()], "required": True},
            {"id": "plaza_auto", "label": "ID plaza_auto", "type": "number", "required": False},
            {"id": "extraterritorialidad", "label": "Extraterritorialidad", "type": "enum", "values": ["no", "si"], "required": False},
            {"id": "cuotas", "label": "Numero de cuotas", "type": "number", "required": False},
            {"id": "selected_pricing_option", "label": "Opcion", "type": "enum", "values": [o["id"] for o in OPTION_SPECS], "required": False},
        ],
        "options": deepcopy(OPTION_SPECS),
        "calibration": {
            "value_tiers": deepcopy(VALUE_TIERS),
            "cities": deepcopy(CITY_SPECS),
            "brands": deepcopy(BRAND_SPECS),
            "age_bands": deepcopy(AGE_BANDS),
            "extraterritorialidad_bob": EXTRATERRITORIALIDAD_BOB,
            "credit_surcharge_factor": CREDIT_SURCHARGE_FACTOR,
        },
    }


def _build_options(
    p1_before_extra: float,
    *,
    extra_bob: float,
    installments: int,
    franchise_group: str,
) -> list[dict[str, Any]]:
    options = []
    for spec in OPTION_SPECS:
        base_before_extra = p1_before_extra if spec["id"] == "option_1" else max(
            spec["minimum_bob"],
            p1_before_extra * spec["ratio_to_p1"],
        )
        cash = _money(base_before_extra + extra_bob)
        credit_total = _money(cash * CREDIT_SURCHARGE_FACTOR) if installments > 1 else cash
        options.append(
            {
                "id": spec["id"],
                "label": spec["label"],
                "ratio_to_p1": spec["ratio_to_p1"],
                "cash_annual_premium_bob": cash,
                "base_before_extraterritoriality_bob": _money(base_before_extra),
                "minimum_floor_bob": spec["minimum_bob"],
                "floor_applied": base_before_extra == spec["minimum_bob"],
                "extraterritorialidad_bob": _money(extra_bob),
                "franchise": {
                    "percent": 10,
                    "minimum_bob": _money(spec["franchise_high_bob"] if franchise_group == "high" else spec["franchise_low_bob"]),
                    "group": franchise_group,
                },
                "credit_total_bob": credit_total,
                "installments": installments,
                "installment_amount_bob": _money(credit_total / installments),
            }
        )
    return options


def _value_tier(value: float) -> dict[str, Any]:
    for tier in VALUE_TIERS:
        upper = tier.get("upper")
        if upper is None or value < float(upper) or (tier["id"] == "floor_to_125k" and value <= float(upper)):
            return tier
    return VALUE_TIERS[-1]


def _city_from_facts(facts: dict[str, Any]) -> tuple[dict[str, Any], str | None]:
    raw_id = _first(facts, "plaza_auto", "city_id", "plaza_id")
    if raw_id not in (None, ""):
        key = CITY_ID_TO_KEY.get(str(int(_number_from_any(raw_id, "plaza_auto"))))
        if key:
            return deepcopy(CITY_SPECS[key]), None

    raw_city = _text(_first(facts, "city", "plaza", "driving_city", "driving_plaza", "ciudad"), "plaza de circulacion")
    key = CITY_ALIAS_TO_KEY.get(_key(raw_city))
    if key:
        return deepcopy(CITY_SPECS[key]), None
    fallback = deepcopy(CITY_SPECS["la_paz"])
    fallback["label"] = raw_city
    fallback["plaza_auto"] = None
    return fallback, "city_not_in_lbc_calibration_used_la_paz_factor"


def _brand_from_facts(facts: dict[str, Any]) -> tuple[dict[str, Any], str | None]:
    raw_id = _first(facts, "marca_auto", "brand_id", "marca_id")
    if raw_id not in (None, ""):
        key = BRAND_ALIAS_TO_KEY.get(str(int(_number_from_any(raw_id, "marca_auto"))))
        if key:
            return deepcopy(BRAND_SPECS[key]), None

    raw_brand = _text(_first(facts, "make", "marca", "vehicle_brand", "brand"), "marca")
    key = BRAND_ALIAS_TO_KEY.get(_key(raw_brand))
    if key:
        return deepcopy(BRAND_SPECS[key]), None
    fallback = deepcopy(BRAND_SPECS["44"])
    fallback["label"] = raw_brand
    fallback["marca_auto"] = None
    return fallback, "brand_not_in_lbc_calibration_used_toyota_factor"


def _age_band(age: int) -> dict[str, Any]:
    for band in AGE_BANDS:
        max_age = band.get("max_age")
        if max_age is None or age <= int(max_age):
            return deepcopy(band)
    return deepcopy(AGE_BANDS[-1])


def _selected_option_id(value: Any) -> str:
    if value in (None, ""):
        return "option_1"
    key = _key(value)
    aliases = {
        "1": "option_1",
        "p1": "option_1",
        "opcion_1": "option_1",
        "option_1": "option_1",
        "2": "option_2",
        "p2": "option_2",
        "opcion_2": "option_2",
        "option_2": "option_2",
        "3": "option_3",
        "p3": "option_3",
        "opcion_3": "option_3",
        "option_3": "option_3",
    }
    if key not in aliases:
        raise ValueError("opcion debe ser option_1, option_2 u option_3")
    return aliases[key]


def _installments(value: Any) -> int:
    if value in (None, ""):
        return 1
    cuotas = _number_from_any(value, "cuotas")
    if int(cuotas) != cuotas:
        raise ValueError("cuotas debe ser un entero")
    cuotas_i = int(cuotas)
    if cuotas_i < 1 or cuotas_i > 7:
        raise ValueError("cuotas debe estar entre 1 y 7")
    return cuotas_i


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


def _bool_from_any(value: Any, *, default: bool) -> bool:
    if value in (None, ""):
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    key = _key(value)
    if key in {"si", "s", "yes", "y", "true", "1", "activo", "con"}:
        return True
    if key in {"no", "n", "false", "0", "inactivo", "sin"}:
        return False
    raise ValueError("extraterritorialidad debe ser si/no")


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
        raise ValueError(f"{label} debe ser numerico") from exc


def _money(value: float) -> float:
    return round(float(value) + 1e-9, 2)
