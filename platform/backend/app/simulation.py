import copy
import sys
from pathlib import Path
from typing import Any, Optional


APP_DIR = Path(__file__).resolve().parent
PLATFORM_ROOT = APP_DIR.parents[1]
REPO_ROOT = PLATFORM_ROOT.parent
ENGINE_PATH = PLATFORM_ROOT / "engine"
CRAWLER_DIR = REPO_ROOT / "crawlable" / "crawler"
for path in (ENGINE_PATH, CRAWLER_DIR):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

from crawl import Crawler  # type: ignore
from insurance_engine.coverage import CoverageEngine


USD_TO_BOB = 6.96

UW_BASE_FACTS: dict[str, Any] = {
    "product": "moto_proteccion",
    "channel": "directas",
    "client_type": "empresa",
    "requests_standard_deviation": False,
    "is_mass_grouping": False,
    "is_public_tender": False,
    "vehicle_class": "motocicleta",
    "cilindrada_cc": 150,
    "es_moto_lujo_o_competicion": False,
    "participa_competicion": False,
    "moto_proteccion_terms": True,
    "segment": "comercial",
    "is_heavy": False,
    "tonnage_tn": 0,
    "is_contractor_equipment": False,
    "has_plates": True,
    "is_competition_offroad": False,
    "has_body_modifications": False,
    "design_modified_capacity": False,
    "capacity_was_reduced": False,
    "ap_coverage": "ninguna",
    "is_rail_vehicle": False,
    "is_rental": False,
    "rented_to_petroleum": False,
    "is_learning_vehicle": False,
    "vehicle_age_years": 5,
    "is_renewal": False,
    "model_year": 2021,
    "vehicle_brand": "Toyota",
    "circula_fuera_pais_actividad_regular": False,
    "capacidad_original_mayor_8": False,
    "valor_asegurado": 90000,
    "importer": "Toyosa",
    "servicio_publico_pasajeros": False,
    "is_convertible_lona": False,
    "is_armored": False,
    "is_bomberos_policia_ejercito": False,
    "is_ambulance": False,
    "has_foreign_plates": False,
    "is_brevet_policy": False,
    "suscriptor": "Manuel Sauma",
    "cantidad_vehiculos": 1,
    "has_rc": False,
    "has_ap": False,
    "is_enlatado": False,
    "siniestralidad": 35,
    "siniestralidad_historica": 35,
    "retroactividad_dias": 0,
    "siniestro_en_periodo": False,
    "make": "Toyota",
    "marca_auto": 44,
    "model": "Corolla",
    "city": "La Paz",
    "plaza_auto": 1,
    "extraterritorialidad": "no",
    "cuotas": 1,
    "selected_pricing_option": "option_1",
}

COVERAGE_BASE_FACTS: dict[str, Any] = {
    "coverage_section": "robo_parcial",
    "coverage_included": True,
    "event_type": "robo_partes",
    "driver_alcohol_over_limit": False,
    "driver_under_drugs_or_impairing_medication": False,
    "intentional_act": False,
    "confiscation_or_authority_measure": False,
    "vehicle_type": "auto",
    "foreign_territory": False,
    "foreign_stay_days": 0,
    "theft_consumated": True,
    "parts_verified_and_valued": True,
    "parts_permanently_attached_or_declared": True,
    "security_measures_requested": False,
    "security_measures_completed": False,
    "written_security_exception": False,
    "attached_clause_codes": [],
    "uses_free_choice_workshop": False,
    "estimated_repair_cost_percent_va": 20,
    "estimated_replacement_cost_percent_va": 20,
    "part_repair_cost_percent_replacement": 80,
    "insured_requests_part_replacement": False,
    "parts_available_local_market": True,
    "local_price_over_import_price_percent": 0,
    "police_report_within_6h": True,
    "alcohol_test_within_6h": True,
    "justified_impediment": False,
    "claim_estimate_usd": 800,
    "affects_only_danos_or_robo": True,
    "technical_report_available": True,
    "insurer_notice_days": 2,
    "repair_started_without_authorization": False,
}


def _uw_facts(**overrides: Any) -> dict[str, Any]:
    facts = copy.deepcopy(UW_BASE_FACTS)
    facts.update(overrides)
    return facts


def _coverage_facts(**overrides: Any) -> dict[str, Any]:
    facts = copy.deepcopy(COVERAGE_BASE_FACTS)
    facts.update(overrides)
    return facts


MOCK_CASES: list[dict[str, Any]] = [
    {
        "case_id": "SUB-001",
        "engine": "uw",
        "record_type": "submission",
        "client_name": "Mora Motors SRL",
        "client_age": 34,
        "demographic": "empresa_joven",
        "business_type": "retail",
        "city": "La Paz",
        "broker": "Broker Andes",
        "vehicle_make": "Toyota",
        "vehicle_model": "Corolla",
        "policy_type": "moto_proteccion",
        "facts": _uw_facts(),
        "economics": {
            "annual_premium_bob": 7050,
            "expected_loss_bob": 2150,
            "retention_value_bob": 1800,
            "broker_satisfaction": 82,
            "base_churn_probability": 0.08,
        },
    },
    {
        "case_id": "SUB-002",
        "engine": "uw",
        "record_type": "submission",
        "client_name": "Translog Oriente",
        "client_age": 47,
        "demographic": "empresa_madura",
        "business_type": "transporte",
        "city": "Santa Cruz",
        "broker": "Oriente Brokers",
        "vehicle_make": "Volvo",
        "vehicle_model": "FH",
        "policy_type": "lbc_auto",
        "facts": _uw_facts(
            vehicle_class="camion",
            is_heavy=True,
            tonnage_tn=12,
            cilindrada_cc=0,
            make="Volvo",
            model="FH",
            vehicle_brand="Volvo",
            city="Santa Cruz",
            valor_asegurado=520000,
            segment="comercial",
            product="moto_proteccion",
        ),
        "economics": {
            "annual_premium_bob": 18500,
            "expected_loss_bob": 14200,
            "retention_value_bob": 5400,
            "broker_satisfaction": 58,
            "base_churn_probability": 0.18,
        },
    },
    {
        "case_id": "SUB-003",
        "engine": "uw",
        "record_type": "submission",
        "client_name": "Altiplano Rent a Car",
        "client_age": 41,
        "demographic": "empresa_turismo",
        "business_type": "rent_a_car",
        "city": "Cochabamba",
        "broker": "Broker Andes",
        "vehicle_make": "Suzuki",
        "vehicle_model": "Vitara",
        "policy_type": "lbc_auto",
        "facts": _uw_facts(
            vehicle_class="liviano",
            cilindrada_cc=0,
            is_rental=True,
            rented_to_petroleum=False,
            make="Suzuki",
            model="Vitara",
            vehicle_brand="Suzuki",
            city="Cochabamba",
            valor_asegurado=150000,
        ),
        "economics": {
            "annual_premium_bob": 8600,
            "expected_loss_bob": 7800,
            "retention_value_bob": 3200,
            "broker_satisfaction": 44,
            "base_churn_probability": 0.28,
        },
    },
    {
        "case_id": "SUB-004",
        "engine": "uw",
        "record_type": "submission",
        "client_name": "Familia Paredes",
        "client_age": 62,
        "demographic": "persona_mayor",
        "business_type": "personal",
        "city": "Sucre",
        "broker": "Capital Seguros",
        "vehicle_make": "Nissan",
        "vehicle_model": "Patrol",
        "policy_type": "renovacion",
        "facts": _uw_facts(
            vehicle_class="liviano",
            cilindrada_cc=0,
            vehicle_age_years=23,
            is_renewal=True,
            model_year=2003,
            make="Nissan",
            model="Patrol",
            vehicle_brand="Nissan",
            city="Sucre",
            valor_asegurado=72000,
        ),
        "economics": {
            "annual_premium_bob": 3900,
            "expected_loss_bob": 2600,
            "retention_value_bob": 1500,
            "broker_satisfaction": 61,
            "base_churn_probability": 0.16,
        },
    },
    {
        "case_id": "SUB-005",
        "engine": "uw",
        "record_type": "submission",
        "client_name": "Andean Executive Fleet",
        "client_age": 52,
        "demographic": "empresa_corporativa",
        "business_type": "servicios_profesionales",
        "city": "La Paz",
        "broker": "Mercurio Brokers",
        "vehicle_make": "Mercedes-Benz",
        "vehicle_model": "GLE",
        "policy_type": "lbc_auto",
        "facts": _uw_facts(
            vehicle_class="liviano",
            cilindrada_cc=0,
            valor_asegurado=780000,
            importer="Importador Gris",
            make="Mercedes-Benz",
            model="GLE",
            vehicle_brand="Mercedes-Benz",
            city="La Paz",
        ),
        "economics": {
            "annual_premium_bob": 32200,
            "expected_loss_bob": 18700,
            "retention_value_bob": 9500,
            "broker_satisfaction": 69,
            "base_churn_probability": 0.11,
        },
    },
    {
        "case_id": "SUB-006",
        "engine": "uw",
        "record_type": "submission",
        "client_name": "Ducati Club Bolivia",
        "client_age": 38,
        "demographic": "afinidad_alto_valor",
        "business_type": "club_afinidad",
        "city": "Santa Cruz",
        "broker": "Oriente Brokers",
        "vehicle_make": "Ducati",
        "vehicle_model": "Monster",
        "policy_type": "moto_proteccion",
        "facts": _uw_facts(
            vehicle_class="motocicleta",
            cilindrada_cc=600,
            es_moto_lujo_o_competicion=True,
            participa_competicion=False,
            valor_asegurado=68000,
            make="Ducati",
            model="Monster",
            vehicle_brand="Ducati",
            city="Santa Cruz",
        ),
        "economics": {
            "annual_premium_bob": 6900,
            "expected_loss_bob": 5100,
            "retention_value_bob": 2300,
            "broker_satisfaction": 72,
            "base_churn_probability": 0.14,
        },
    },
    {
        "case_id": "CLM-101",
        "engine": "coverage",
        "record_type": "claim",
        "client_name": "Mora Motors SRL",
        "client_age": 34,
        "demographic": "empresa_joven",
        "business_type": "retail",
        "city": "La Paz",
        "broker": "Broker Andes",
        "vehicle_make": "Toyota",
        "vehicle_model": "Corolla",
        "policy_type": "robo_parcial",
        "claim_cause": "robo_partes",
        "facts": _coverage_facts(claim_estimate_usd=850),
        "economics": {
            "paid_bob": 4300,
            "reserve_bob": 1600,
            "claim_estimate_bob": 5916,
            "allocated_expense_bob": 450,
            "broker_satisfaction": 78,
            "broker_unhappy": False,
            "broker_feedback": "",
            "invoked_clause_code": "CG-1005",
            "premium_bob": 7050,
        },
    },
    {
        "case_id": "CLM-102",
        "engine": "coverage",
        "record_type": "claim",
        "client_name": "Vargas Logistica",
        "client_age": 45,
        "demographic": "empresa_madura",
        "business_type": "transporte",
        "city": "Santa Cruz",
        "broker": "Oriente Brokers",
        "vehicle_make": "Hino",
        "vehicle_model": "500",
        "policy_type": "danos_propios",
        "claim_cause": "alcoholemia",
        "facts": _coverage_facts(
            coverage_section="danos_propios",
            event_type="choque",
            driver_alcohol_over_limit=True,
            claim_estimate_usd=4200,
            estimated_repair_cost_percent_va=18,
        ),
        "economics": {
            "paid_bob": 0,
            "reserve_bob": 0,
            "claim_estimate_bob": 29232,
            "allocated_expense_bob": 1350,
            "broker_satisfaction": 31,
            "broker_unhappy": True,
            "broker_feedback": "Broker cuestiona exclusión por alcoholemia y pide revisión humana previa.",
            "invoked_clause_code": "CG-base",
            "premium_bob": 18500,
        },
    },
    {
        "case_id": "CLM-103",
        "engine": "coverage",
        "record_type": "claim",
        "client_name": "Altiplano Rent a Car",
        "client_age": 41,
        "demographic": "empresa_turismo",
        "business_type": "rent_a_car",
        "city": "Cochabamba",
        "broker": "Broker Andes",
        "vehicle_make": "Suzuki",
        "vehicle_model": "Vitara",
        "policy_type": "robo_parcial",
        "claim_cause": "aviso_tardio",
        "facts": _coverage_facts(insurer_notice_days=12, claim_estimate_usd=1700),
        "economics": {
            "paid_bob": 5200,
            "reserve_bob": 6500,
            "claim_estimate_bob": 11832,
            "allocated_expense_bob": 900,
            "broker_satisfaction": 42,
            "broker_unhappy": True,
            "broker_feedback": "Broker molesto por derivación a ajustador por aviso fuera de 10 días.",
            "invoked_clause_code": "CG-1005",
            "premium_bob": 8600,
        },
    },
    {
        "case_id": "CLM-104",
        "engine": "coverage",
        "record_type": "claim",
        "client_name": "Familia Paredes",
        "client_age": 62,
        "demographic": "persona_mayor",
        "business_type": "personal",
        "city": "Sucre",
        "broker": "Capital Seguros",
        "vehicle_make": "Nissan",
        "vehicle_model": "Patrol",
        "policy_type": "robo_parcial",
        "claim_cause": "reemplazo_parte",
        "facts": _coverage_facts(
            claim_estimate_usd=650,
            part_repair_cost_percent_replacement=62,
            insured_requests_part_replacement=True,
        ),
        "economics": {
            "paid_bob": 2800,
            "reserve_bob": 1300,
            "claim_estimate_bob": 4524,
            "allocated_expense_bob": 350,
            "broker_satisfaction": 54,
            "broker_unhappy": True,
            "broker_feedback": "Cliente no entiende por qué debe asumir diferencia por cambio de parte.",
            "invoked_clause_code": "CG-1005",
            "premium_bob": 3900,
        },
    },
    {
        "case_id": "CLM-105",
        "engine": "coverage",
        "record_type": "claim",
        "client_name": "Ducati Club Bolivia",
        "client_age": 38,
        "demographic": "afinidad_alto_valor",
        "business_type": "club_afinidad",
        "city": "Santa Cruz",
        "broker": "Oriente Brokers",
        "vehicle_make": "Ducati",
        "vehicle_model": "Monster",
        "policy_type": "robo_parcial",
        "claim_cause": "robo_partes_moto",
        "facts": _coverage_facts(vehicle_type="motocicleta", claim_estimate_usd=2200),
        "economics": {
            "paid_bob": 0,
            "reserve_bob": 0,
            "claim_estimate_bob": 15312,
            "allocated_expense_bob": 700,
            "broker_satisfaction": 37,
            "broker_unhappy": True,
            "broker_feedback": "Broker considera poco comercial excluir robo de partes de motocicletas.",
            "invoked_clause_code": "CG-base",
            "premium_bob": 6900,
        },
    },
    {
        "case_id": "CLM-106",
        "engine": "coverage",
        "record_type": "claim",
        "client_name": "Andean Executive Fleet",
        "client_age": 52,
        "demographic": "empresa_corporativa",
        "business_type": "servicios_profesionales",
        "city": "La Paz",
        "broker": "Mercurio Brokers",
        "vehicle_make": "Mercedes-Benz",
        "vehicle_model": "GLE",
        "policy_type": "danos_propios",
        "claim_cause": "dosaje_faltante_menor",
        "facts": _coverage_facts(
            coverage_section="danos_propios",
            event_type="choque",
            alcohol_test_within_6h=False,
            claim_estimate_usd=700,
            estimated_repair_cost_percent_va=12,
        ),
        "economics": {
            "paid_bob": 3400,
            "reserve_bob": 1000,
            "claim_estimate_bob": 4872,
            "allocated_expense_bob": 600,
            "broker_satisfaction": 64,
            "broker_unhappy": False,
            "broker_feedback": "",
            "invoked_clause_code": "CG-1003",
            "premium_bob": 32200,
        },
    },
]


CANDIDATES: dict[str, dict[str, Any]] = {
    "baseline": {
        "candidate_id": "baseline",
        "label": "Actual publicado",
        "description": "Sin overlay sandbox; reproduce los árboles vigentes.",
        "overlays": {},
    },
    "growth_sandbox": {
        "candidate_id": "growth_sandbox",
        "label": "Sandbox crecimiento controlado",
        "description": "Relaja antigüedad de renovaciones, deriva rent-a-car a Case UW y reduce fricción de reclamos tardíos.",
        "overlays": {
            "uw_antique_age_limit": 25,
            "uw_rental_non_petroleum_outcome": "refer_process",
            "coverage_notice_days_limit": 15,
            "coverage_alcohol_outcome": "refer_adjuster",
            "coverage_replacement_threshold": 70,
            "coverage_moto_parts_outcome": "refer_adjuster",
            "coverage_price_multiplier": 1.08,
            "deductible_multiplier": 1.0,
            "accident_frequency_multiplier": 1.0,
            "severity_multiplier": 1.0,
            "renewal_price_change_percent": 8,
        },
    },
    "profit_sandbox": {
        "candidate_id": "profit_sandbox",
        "label": "Sandbox rentabilidad estricta",
        "description": "Endurece aviso y reemplazos; mantiene exclusiones fuertes para proteger margen.",
        "overlays": {
            "uw_antique_age_limit": 18,
            "uw_rental_non_petroleum_outcome": "decline",
            "coverage_notice_days_limit": 7,
            "coverage_alcohol_outcome": "not_covered",
            "coverage_replacement_threshold": 55,
            "coverage_moto_parts_outcome": "not_covered",
            "coverage_price_multiplier": 1.18,
            "deductible_multiplier": 1.2,
            "accident_frequency_multiplier": 0.95,
            "severity_multiplier": 0.92,
            "renewal_price_change_percent": 14,
        },
    },
}


DEFAULT_CONTROLS: dict[str, Any] = {
    "uw_antique_age_limit": 20,
    "uw_rental_non_petroleum_outcome": "decline",
    "coverage_notice_days_limit": 10,
    "coverage_alcohol_outcome": "not_covered",
    "coverage_replacement_threshold": 65,
    "coverage_moto_parts_outcome": "not_covered",
    "coverage_price_multiplier": 1.0,
    "deductible_multiplier": 1.0,
    "accident_frequency_multiplier": 1.0,
    "severity_multiplier": 1.0,
    "renewal_price_change_percent": 0,
    "renewal_churn_elasticity": 0.014,
}


def mock_database_summary() -> dict[str, Any]:
    return {
        "source": "mock_database",
        "status": "connected",
        "disclaimer": "Datos sintéticos para probar el concepto; no sustituyen cartera productiva.",
        "row_counts": {
            "total_cases": len(MOCK_CASES),
            "submissions": len([c for c in MOCK_CASES if c["engine"] == "uw"]),
            "claims": len([c for c in MOCK_CASES if c["engine"] == "coverage"]),
        },
        "has_submission_fact_vector": True,
        "has_claim_coverage_linkage": True,
    }


def filter_options() -> dict[str, Any]:
    def values(key: str) -> list[Any]:
        return sorted({case.get(key) for case in MOCK_CASES if case.get(key) not in (None, "")})

    return {
        "mock_database": mock_database_summary(),
        "filters": {
            "engines": [
                {"value": "all", "label": "Todos"},
                {"value": "uw", "label": "Suscripción"},
                {"value": "coverage", "label": "Reclamos"},
            ],
            "cities": values("city"),
            "brokers": values("broker"),
            "demographics": values("demographic"),
            "business_types": values("business_type"),
            "vehicle_makes": values("vehicle_make"),
            "policy_types": values("policy_type"),
            "claim_causes": values("claim_cause"),
            "age": {
                "min": min(case["client_age"] for case in MOCK_CASES),
                "max": max(case["client_age"] for case in MOCK_CASES),
            },
        },
        "candidate_presets": list(CANDIDATES.values()),
    }


def list_candidates() -> list[dict[str, Any]]:
    return list(CANDIDATES.values())


def run_simulation(body: Optional[dict[str, Any]] = None) -> dict[str, Any]:
    body = body or {}
    filters = body.get("filters") or {}
    candidate = _candidate_from_body(body.get("candidate") or body.get("candidate_id"))
    controls = _controls_from_body(body, candidate)
    candidate["controls"] = controls
    candidate["overlays"] = {**(candidate.get("overlays") or {}), **controls}
    selected = [case for case in MOCK_CASES if _matches_filters(case, filters)]

    case_results = [_simulate_case(case, candidate) for case in selected]
    summary = _summary(case_results, candidate)
    return {
        "simulation_run_id": f"SIM-MOCK-{len(selected)}-{candidate['candidate_id']}",
        "mock_data": True,
        "mock_data_disclaimer": "Resultados sobre cartera sintética: sirven para validar flujo, tablas y UX, no para tomar decisiones reales.",
        "selection": {
            "filters": filters,
            "selected_count": len(selected),
            "uw_count": len([c for c in selected if c["engine"] == "uw"]),
            "coverage_count": len([c for c in selected if c["engine"] == "coverage"]),
        },
        "candidate": candidate,
        "controls": controls,
        "summary": summary,
        "risk": _risk_block(case_results, candidate),
        "price_curve": _price_curve(selected, candidate),
        "renewal": _renewal_simulation(selected, candidate),
        "tables": {
            "node_hits": _node_hit_table(case_results),
            "loss_nodes": _loss_node_table(case_results),
            "broker_clause_friction": _broker_clause_table(case_results),
            "cashout_nodes": _cashout_node_table(case_results),
            "accident_frequency": _accident_frequency_table(case_results),
            "severity": _severity_table(case_results),
            "cases": _case_table(case_results),
        },
        "case_results": case_results,
    }


def supervision_dashboard(body: Optional[dict[str, Any]] = None) -> dict[str, Any]:
    body = body or {}
    filters = body.get("filters") or {"engine": "all"}
    baseline = _candidate_from_body("baseline")
    baseline["controls"] = copy.deepcopy(DEFAULT_CONTROLS)
    baseline["overlays"] = {**(baseline.get("overlays") or {}), **baseline["controls"]}
    selected = [case for case in MOCK_CASES if _matches_filters(case, filters)]
    rows = [_simulate_case(case, baseline) for case in selected]
    summary = _summary(rows, baseline)
    return {
        "mock_data": True,
        "as_of": "mock-live",
        "summary": summary["current"],
        "risk": _risk_block(rows, baseline)["current"],
        "tables": {
            "client_health": _client_health_table(rows),
            "cashout_nodes": _cashout_node_table(rows),
            "accident_frequency": _accident_frequency_table(rows),
            "severity": _severity_table(rows),
            "loss_nodes": _loss_node_table(rows),
            "broker_clause_friction": _broker_clause_table(rows),
            "renewal_queue": _renewal_queue([case for case in selected if case["engine"] == "uw"], baseline),
            "risk_alerts": _risk_alerts(rows),
        },
        "renewal_tree": _renewal_tree([case for case in selected if case["engine"] == "uw"], baseline),
    }


def _candidate_from_body(raw: Any) -> dict[str, Any]:
    if isinstance(raw, dict):
        candidate_id = str(raw.get("candidate_id") or "custom_sandbox")
        base = copy.deepcopy(CANDIDATES.get(candidate_id, CANDIDATES["growth_sandbox"]))
        base["candidate_id"] = candidate_id
        base["label"] = str(raw.get("label") or base.get("label") or "Sandbox personalizado")
        base["description"] = str(raw.get("description") or base.get("description") or "")
        overlays = copy.deepcopy(base.get("overlays") or {})
        overlays.update(raw.get("overlays") or {})
        base["overlays"] = overlays
        return base
    if raw and str(raw) in CANDIDATES:
        return copy.deepcopy(CANDIDATES[str(raw)])
    return copy.deepcopy(CANDIDATES["growth_sandbox"])


def _controls_from_body(body: dict[str, Any], candidate: dict[str, Any]) -> dict[str, Any]:
    controls = copy.deepcopy(DEFAULT_CONTROLS)
    controls.update(candidate.get("overlays") or {})
    controls.update(body.get("controls") or body.get("levers") or {})
    for key in [
        "uw_antique_age_limit",
        "coverage_notice_days_limit",
        "coverage_replacement_threshold",
        "coverage_price_multiplier",
        "deductible_multiplier",
        "accident_frequency_multiplier",
        "severity_multiplier",
        "renewal_price_change_percent",
        "renewal_churn_elasticity",
    ]:
        controls[key] = float(controls.get(key, DEFAULT_CONTROLS[key]))
    for key in ["uw_rental_non_petroleum_outcome", "coverage_alcohol_outcome", "coverage_moto_parts_outcome"]:
        controls[key] = str(controls.get(key, DEFAULT_CONTROLS[key]))
    return controls


def _matches_filters(case: dict[str, Any], filters: dict[str, Any]) -> bool:
    engine = filters.get("engine") or "all"
    if engine not in ("all", "", None) and case["engine"] != engine:
        return False
    age_min = filters.get("age_min")
    age_max = filters.get("age_max")
    if age_min not in (None, "") and case["client_age"] < float(age_min):
        return False
    if age_max not in (None, "") and case["client_age"] > float(age_max):
        return False
    multi_fields = {
        "cities": "city",
        "brokers": "broker",
        "demographics": "demographic",
        "business_types": "business_type",
        "vehicle_makes": "vehicle_make",
        "policy_types": "policy_type",
        "claim_causes": "claim_cause",
    }
    for filter_key, case_key in multi_fields.items():
        wanted = _as_list(filters.get(filter_key))
        if wanted and case.get(case_key) not in wanted:
            return False
    min_claim = filters.get("min_claim_amount_bob")
    if min_claim not in (None, "") and case["engine"] == "coverage":
        if case.get("economics", {}).get("claim_estimate_bob", 0) < float(min_claim):
            return False
    return True


def _as_list(value: Any) -> list[Any]:
    if value in (None, "", "all"):
        return []
    if isinstance(value, list):
        return [item for item in value if item not in (None, "", "all")]
    return [value]


def _simulate_case(case: dict[str, Any], candidate: dict[str, Any]) -> dict[str, Any]:
    current = _run_engine(case["engine"], case["facts"], None)
    candidate_result = _run_engine(case["engine"], case["facts"], candidate)
    current_metrics = _case_metrics(case, current, candidate=None, is_candidate=False)
    candidate_metrics = _case_metrics(case, candidate_result, candidate=candidate, is_candidate=True)
    return {
        "case_id": case["case_id"],
        "engine": case["engine"],
        "record_type": case["record_type"],
        "client_name": case["client_name"],
        "city": case["city"],
        "broker": case["broker"],
        "business_type": case["business_type"],
        "demographic": case["demographic"],
        "vehicle_make": case["vehicle_make"],
        "policy_type": case["policy_type"],
        "claim_cause": case.get("claim_cause"),
        "current": _compact_result(current, current_metrics),
        "candidate": _compact_result(candidate_result, candidate_metrics),
        "delta": _delta(current_metrics, candidate_metrics, current, candidate_result),
        "economics": case["economics"],
    }


def _run_engine(engine: str, facts: dict[str, Any], candidate: Optional[dict[str, Any]]) -> dict[str, Any]:
    if engine == "uw":
        crawler = Crawler()
        if candidate:
            _apply_uw_overlays(crawler, candidate.get("overlays") or {})
        return crawler.crawl(copy.deepcopy(facts))
    coverage = CoverageEngine()
    if candidate:
        _apply_coverage_overlays(coverage, candidate.get("overlays") or {})
    return coverage.run(copy.deepcopy(facts))


def _apply_uw_overlays(crawler: Any, overlays: dict[str, Any]) -> None:
    if "uw_antique_age_limit" in overlays:
        node = crawler.nodes.get("standard.elig.antique_vehicle")
        if node:
            node["evaluate"] = {">": [{"var": "vehicle_age_years"}, float(overlays["uw_antique_age_limit"])]}
            node["sandbox_overlay"] = f"threshold vehicle_age_years > {overlays['uw_antique_age_limit']}"
    rental_outcome = overlays.get("uw_rental_non_petroleum_outcome")
    if rental_outcome:
        node = crawler.nodes.get("standard.elig.rent_a_car")
        if node:
            for branch in node.get("branches", []):
                if branch.get("when") == {"==": [{"var": "rented_to_petroleum"}, False]}:
                    branch["outcome"] = rental_outcome
                    if rental_outcome == "refer_process":
                        branch["target"] = "case_underwriting"
                        branch["reason"] = "Sandbox: rent-a-car no petrolero se deriva a Case UW en vez de declinar automáticamente."


def _apply_coverage_overlays(engine: Any, overlays: dict[str, Any]) -> None:
    for node in engine.artifacts.nodes:
        if node.get("id") == "coverage.duty.notice_delay" and "coverage_notice_days_limit" in overlays:
            limit = float(overlays["coverage_notice_days_limit"])
            node["title"] = f"Aviso a la Aseguradora >{int(limit)} días"
            node["evaluate"] = {">": [{"var": "insurer_notice_days"}, limit]}
            node["reason"] = f"Sandbox: se evalúa aviso tardío solo sobre {int(limit)} días."
        elif node.get("id") == "coverage.general.alcohol" and overlays.get("coverage_alcohol_outcome"):
            node["outcome"] = overlays["coverage_alcohol_outcome"]
            if node["outcome"] == "refer_adjuster":
                node["reason"] = "Sandbox: alcoholemia deriva a revisión humana antes de sostener no cobertura."
        elif node.get("id") == "coverage.parts.replacement_threshold" and "coverage_replacement_threshold" in overlays:
            limit = float(overlays["coverage_replacement_threshold"])
            node["title"] = f"Cambio de parte bajo {int(limit)}%"
            node["evaluate"] = {
                "and": [
                    {"<=": [{"var": "part_repair_cost_percent_replacement"}, limit]},
                    {"==": [{"var": "insured_requests_part_replacement"}, True]},
                ]
            }
            node["reason"] = f"Sandbox: umbral de diferencia por cambio de parte ajustado a {int(limit)}%."
        elif node.get("id") == "coverage.general.robo_partes_motos" and overlays.get("coverage_moto_parts_outcome"):
            node["outcome"] = overlays["coverage_moto_parts_outcome"]
            if node["outcome"] == "refer_adjuster":
                node["reason"] = "Sandbox: robo de partes de motocicletas pasa por revisión humana en vez de no cobertura automática."
            elif node["outcome"] == "likely_covered":
                node["reason"] = "Sandbox: robo de partes de motocicletas se incluye como cobertura simulada."


def _case_metrics(case: dict[str, Any], result: dict[str, Any], *, candidate: Optional[dict[str, Any]], is_candidate: bool) -> dict[str, Any]:
    economics = case["economics"]
    outcome = result.get("outcome")
    controls = (candidate or {}).get("controls") or DEFAULT_CONTROLS
    severity_factor = float(controls.get("severity_multiplier", 1.0)) if is_candidate else 1.0
    frequency_factor = float(controls.get("accident_frequency_multiplier", 1.0)) if is_candidate else 1.0
    if case["engine"] == "uw":
        accepted = outcome in {"eligible", "conditional_eligible"}
        referred = outcome in {"refer_authority", "refer_process", "refer_line", "ESCALATE", "missing_fact"}
        renewal_factor = 1.0
        if is_candidate and case.get("policy_type") == "renovacion":
            renewal_factor += float(controls.get("renewal_price_change_percent", 0)) / 100
        premium = economics["annual_premium_bob"] * renewal_factor if accepted else 0
        expected_loss = economics["expected_loss_bob"] * severity_factor * frequency_factor if accepted else 0
        friction = 0.18 if referred else 0.0
        decline_penalty = 0.28 if not accepted and not referred else 0.0
        renewal_churn = 0.0
        if is_candidate and case.get("policy_type") == "renovacion":
            renewal_churn = max(0.0, float(controls.get("renewal_price_change_percent", 0))) * float(controls.get("renewal_churn_elasticity", 0.014))
        churn = _bounded(economics["base_churn_probability"] + friction + decline_penalty + renewal_churn)
        satisfaction = _bounded_score(economics["broker_satisfaction"] - friction * 100 - decline_penalty * 80)
        profit = premium - expected_loss + economics["retention_value_bob"] * (1 - churn)
        return {
            "premium_bob": round(premium, 2),
            "expected_loss_bob": round(expected_loss, 2),
            "profit_bob": round(profit, 2),
            "churn_probability": round(churn, 3),
            "broker_satisfaction": round(satisfaction, 1),
            "claim_loss_bob": 0,
        }

    current_loss = economics.get("paid_bob", 0) + economics.get("reserve_bob", 0)
    estimate = economics.get("claim_estimate_bob", 0)
    premium_factor = float(controls.get("coverage_price_multiplier", 1.0)) if is_candidate else 1.0
    deductible_factor = float(controls.get("deductible_multiplier", 1.0)) if is_candidate else 1.0
    if outcome in {"not_covered", "excluded"}:
        loss = 0
        satisfaction = economics["broker_satisfaction"] - (18 if economics.get("broker_unhappy") else 8)
    elif outcome == "refer_adjuster":
        loss = estimate * 0.45 if is_candidate else current_loss
        satisfaction = economics["broker_satisfaction"] + (10 if is_candidate else -6)
    elif outcome in {"partially_covered", "conditionally_covered"}:
        loss = min(current_loss or estimate, estimate * 0.72)
        satisfaction = economics["broker_satisfaction"] - 4
    elif outcome == "missing_document":
        loss = current_loss * 0.35
        satisfaction = economics["broker_satisfaction"] - 12
    else:
        loss = current_loss or estimate
        satisfaction = economics["broker_satisfaction"]
    deductible_relief = max(0.65, 1 - max(0.0, deductible_factor - 1.0) * 0.12)
    loss = loss * severity_factor * frequency_factor * deductible_relief
    premium = economics.get("premium_bob", 0) * premium_factor
    price_churn = max(0.0, premium_factor - 1.0) * 0.18
    profit = premium - loss - economics.get("allocated_expense_bob", 0)
    return {
        "premium_bob": round(premium, 2),
        "expected_loss_bob": 0,
        "profit_bob": round(profit, 2),
        "churn_probability": round(_bounded(price_churn), 3),
        "broker_satisfaction": round(_bounded_score(satisfaction - price_churn * 100), 1),
        "claim_loss_bob": round(loss, 2),
    }


def _bounded(value: float) -> float:
    return max(0.0, min(0.95, value))


def _bounded_score(value: float) -> float:
    return max(0.0, min(100.0, value))


def _compact_result(result: dict[str, Any], metrics: dict[str, Any]) -> dict[str, Any]:
    return {
        "outcome": result.get("outcome"),
        "terminal_node": result.get("terminal_node") or (result.get("escalation") or {}).get("at_node"),
        "reason": result.get("reason") or (result.get("escalation") or {}).get("reason"),
        "audit_steps": len(result.get("audit") or []),
        "source_quote": result.get("source_quote") or (result.get("escalation") or {}).get("source_quote"),
        "metrics": metrics,
        "audit": result.get("audit") or [],
    }


def _delta(current: dict[str, Any], candidate: dict[str, Any], current_result: dict[str, Any], candidate_result: dict[str, Any]) -> dict[str, Any]:
    return {
        "outcome_changed": current_result.get("outcome") != candidate_result.get("outcome"),
        "profit_bob": round(candidate["profit_bob"] - current["profit_bob"], 2),
        "claim_loss_bob": round(candidate["claim_loss_bob"] - current["claim_loss_bob"], 2),
        "churn_probability": round(candidate["churn_probability"] - current["churn_probability"], 3),
        "broker_satisfaction": round(candidate["broker_satisfaction"] - current["broker_satisfaction"], 1),
    }


def _summary(case_results: list[dict[str, Any]], candidate_spec: Optional[dict[str, Any]] = None) -> dict[str, Any]:
    current = {**_sum_metrics(case_results, "current"), **_risk_metrics(case_results, "current", None)}
    candidate = {**_sum_metrics(case_results, "candidate"), **_risk_metrics(case_results, "candidate", candidate_spec)}
    changed = [row for row in case_results if row["delta"]["outcome_changed"]]
    return {
        "current": current,
        "candidate": candidate,
        "delta": {
            "profit_bob": round(candidate["profit_bob"] - current["profit_bob"], 2),
            "claim_loss_bob": round(candidate["claim_loss_bob"] - current["claim_loss_bob"], 2),
            "avg_churn_probability": round(candidate["avg_churn_probability"] - current["avg_churn_probability"], 3),
            "avg_broker_satisfaction": round(candidate["avg_broker_satisfaction"] - current["avg_broker_satisfaction"], 1),
            "loss_ratio": round(candidate["loss_ratio"] - current["loss_ratio"], 3),
            "risk_score": round(candidate["risk_score"] - current["risk_score"], 1),
            "outcome_changed_count": len(changed),
        },
    }


def _sum_metrics(rows: list[dict[str, Any]], side: str) -> dict[str, Any]:
    metrics = [row[side]["metrics"] for row in rows]
    if not metrics:
        return {
            "premium_bob": 0,
            "expected_loss_bob": 0,
            "claim_loss_bob": 0,
            "profit_bob": 0,
            "avg_churn_probability": 0,
            "avg_broker_satisfaction": 0,
        }
    return {
        "premium_bob": round(sum(m["premium_bob"] for m in metrics), 2),
        "expected_loss_bob": round(sum(m["expected_loss_bob"] for m in metrics), 2),
        "claim_loss_bob": round(sum(m["claim_loss_bob"] for m in metrics), 2),
        "profit_bob": round(sum(m["profit_bob"] for m in metrics), 2),
        "avg_churn_probability": round(sum(m["churn_probability"] for m in metrics) / len(metrics), 3),
        "avg_broker_satisfaction": round(sum(m["broker_satisfaction"] for m in metrics) / len(metrics), 1),
    }


def _risk_metrics(rows: list[dict[str, Any]], side: str, candidate_spec: Optional[dict[str, Any]]) -> dict[str, Any]:
    controls = (candidate_spec or {}).get("controls") or DEFAULT_CONTROLS
    coverage_rows = [row for row in rows if row["engine"] == "coverage"]
    clients = {row["client_name"] for row in rows}
    claim_count = len(coverage_rows)
    frequency_factor = float(controls.get("accident_frequency_multiplier", 1.0)) if side == "candidate" else 1.0
    active_clients = max(1, len(clients))
    premium = sum(row[side]["metrics"]["premium_bob"] for row in rows)
    incurred = sum(row[side]["metrics"]["claim_loss_bob"] for row in coverage_rows)
    claim_frequency = (claim_count * frequency_factor) / active_clients
    avg_severity = incurred / max(1, claim_count)
    loss_ratio = incurred / premium if premium else 0
    cashout_exposure = sum(
        row[side]["metrics"]["claim_loss_bob"]
        for row in coverage_rows
        if row[side]["outcome"] in {"likely_covered", "partially_covered", "conditionally_covered", "refer_adjuster"}
    )
    risk_score = min(100.0, loss_ratio * 55 + claim_frequency * 28 + (avg_severity / 1000) * 1.7)
    return {
        "active_clients": len(clients),
        "claim_count": claim_count,
        "accident_frequency": round(claim_frequency, 3),
        "avg_severity_bob": round(avg_severity, 2),
        "loss_ratio": round(loss_ratio, 3),
        "cashout_exposure_bob": round(cashout_exposure, 2),
        "risk_score": round(risk_score, 1),
    }


def _risk_block(case_results: list[dict[str, Any]], candidate_spec: dict[str, Any]) -> dict[str, Any]:
    current = _risk_metrics(case_results, "current", None)
    candidate = _risk_metrics(case_results, "candidate", candidate_spec)
    return {
        "current": current,
        "candidate": candidate,
        "delta": {
            "risk_score": round(candidate["risk_score"] - current["risk_score"], 1),
            "loss_ratio": round(candidate["loss_ratio"] - current["loss_ratio"], 3),
            "accident_frequency": round(candidate["accident_frequency"] - current["accident_frequency"], 3),
            "avg_severity_bob": round(candidate["avg_severity_bob"] - current["avg_severity_bob"], 2),
            "cashout_exposure_bob": round(candidate["cashout_exposure_bob"] - current["cashout_exposure_bob"], 2),
        },
    }


def _node_hit_table(case_results: list[dict[str, Any]]) -> list[dict[str, Any]]:
    agg: dict[str, dict[str, Any]] = {}
    for row in case_results:
        for side in ("current", "candidate"):
            seen = set()
            for step in row[side].get("audit") or []:
                node = step.get("node")
                if not node or node in seen:
                    continue
                seen.add(node)
                bucket = agg.setdefault(
                    f"{side}:{node}",
                    {
                        "side": side,
                        "node_id": node,
                        "title": step.get("title"),
                        "engine": row["engine"],
                        "hit_count": 0,
                        "loss_bob": 0,
                        "profit_bob": 0,
                    },
                )
                bucket["hit_count"] += 1
                bucket["loss_bob"] += row[side]["metrics"]["claim_loss_bob"]
                bucket["profit_bob"] += row[side]["metrics"]["profit_bob"]
    return sorted(
        ({**item, "loss_bob": round(item["loss_bob"], 2), "profit_bob": round(item["profit_bob"], 2)} for item in agg.values()),
        key=lambda item: (-item["hit_count"], item["side"], item["node_id"]),
    )


def _loss_node_table(case_results: list[dict[str, Any]]) -> list[dict[str, Any]]:
    agg: dict[str, dict[str, Any]] = {}
    for row in case_results:
        if row["engine"] != "coverage":
            continue
        for side in ("current", "candidate"):
            node = row[side].get("terminal_node") or "coverage.default.likely_covered"
            bucket = agg.setdefault(
                f"{side}:{node}",
                {"side": side, "node_id": node, "claim_count": 0, "loss_bob": 0, "avg_broker_satisfaction": 0},
            )
            bucket["claim_count"] += 1
            bucket["loss_bob"] += row[side]["metrics"]["claim_loss_bob"]
            bucket["avg_broker_satisfaction"] += row[side]["metrics"]["broker_satisfaction"]
    out = []
    for item in agg.values():
        count = item["claim_count"] or 1
        out.append(
            {
                **item,
                "loss_bob": round(item["loss_bob"], 2),
                "avg_broker_satisfaction": round(item["avg_broker_satisfaction"] / count, 1),
            }
        )
    return sorted(out, key=lambda item: (-item["loss_bob"], -item["claim_count"]))


def _broker_clause_table(case_results: list[dict[str, Any]]) -> list[dict[str, Any]]:
    agg: dict[str, dict[str, Any]] = {}
    for row in case_results:
        if row["engine"] != "coverage":
            continue
        clause = row["economics"].get("invoked_clause_code") or "sin_clausula"
        bucket = agg.setdefault(
            clause,
            {
                "clause_code": clause,
                "claim_count": 0,
                "unhappy_count": 0,
                "loss_bob": 0,
                "brokers": set(),
                "sample_feedback": "",
            },
        )
        bucket["claim_count"] += 1
        bucket["loss_bob"] += row["current"]["metrics"]["claim_loss_bob"]
        bucket["brokers"].add(row["broker"])
        if row["economics"].get("broker_unhappy"):
            bucket["unhappy_count"] += 1
            if not bucket["sample_feedback"]:
                bucket["sample_feedback"] = row["economics"].get("broker_feedback", "")
    return sorted(
        (
            {
                **item,
                "brokers": sorted(item["brokers"]),
                "loss_bob": round(item["loss_bob"], 2),
                "unhappy_rate": round(item["unhappy_count"] / item["claim_count"], 3),
            }
            for item in agg.values()
        ),
        key=lambda item: (-item["unhappy_count"], -item["loss_bob"]),
    )


def _cashout_node_table(case_results: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows = []
    for row in case_results:
        if row["engine"] != "coverage":
            continue
        for side in ("current", "candidate"):
            outcome = row[side]["outcome"]
            if outcome not in {"likely_covered", "partially_covered", "conditionally_covered", "refer_adjuster"}:
                continue
            rows.append(
                {
                    "side": side,
                    "case_id": row["case_id"],
                    "client_name": row["client_name"],
                    "node_id": row[side]["terminal_node"] or "coverage.default.likely_covered",
                    "outcome": outcome,
                    "cashout_bob": row[side]["metrics"]["claim_loss_bob"],
                    "broker": row["broker"],
                    "cause": row.get("claim_cause"),
                }
            )
    return sorted(rows, key=lambda item: (-item["cashout_bob"], item["side"]))


def _client_health_table(case_results: list[dict[str, Any]]) -> list[dict[str, Any]]:
    buckets: dict[str, dict[str, Any]] = {}
    for row in case_results:
        bucket = buckets.setdefault(
            row["client_name"],
            {
                "client_name": row["client_name"],
                "city": row["city"],
                "broker": row["broker"],
                "business_type": row["business_type"],
                "premium_bob": 0,
                "incurred_bob": 0,
                "claim_count": 0,
                "submission_count": 0,
                "risk_nodes": set(),
                "broker_satisfaction_total": 0,
                "broker_satisfaction_count": 0,
            },
        )
        bucket["premium_bob"] += row["current"]["metrics"]["premium_bob"]
        bucket["broker_satisfaction_total"] += row["current"]["metrics"]["broker_satisfaction"]
        bucket["broker_satisfaction_count"] += 1
        if row["engine"] == "coverage":
            bucket["claim_count"] += 1
            bucket["incurred_bob"] += row["current"]["metrics"]["claim_loss_bob"]
            if row["current"].get("terminal_node"):
                bucket["risk_nodes"].add(row["current"]["terminal_node"])
        else:
            bucket["submission_count"] += 1
    out = []
    for item in buckets.values():
        loss_ratio = item["incurred_bob"] / item["premium_bob"] if item["premium_bob"] else 0
        accident_frequency = item["claim_count"] / max(1, item["submission_count"])
        broker_sat = item["broker_satisfaction_total"] / max(1, item["broker_satisfaction_count"])
        risk_score = min(100, loss_ratio * 60 + accident_frequency * 24 + max(0, 70 - broker_sat) * 0.45)
        out.append(
            {
                "client_name": item["client_name"],
                "city": item["city"],
                "broker": item["broker"],
                "business_type": item["business_type"],
                "premium_bob": round(item["premium_bob"], 2),
                "incurred_bob": round(item["incurred_bob"], 2),
                "claim_count": item["claim_count"],
                "accident_frequency": round(accident_frequency, 3),
                "loss_ratio": round(loss_ratio, 3),
                "broker_satisfaction": round(broker_sat, 1),
                "risk_score": round(risk_score, 1),
                "risk_nodes": sorted(item["risk_nodes"]),
            }
        )
    return sorted(out, key=lambda item: (-item["risk_score"], -item["incurred_bob"]))


def _accident_frequency_table(case_results: list[dict[str, Any]]) -> list[dict[str, Any]]:
    buckets: dict[tuple[str, str], dict[str, Any]] = {}
    for row in case_results:
        key = (row["city"], row["business_type"])
        bucket = buckets.setdefault(
            key,
            {"city": row["city"], "business_type": row["business_type"], "clients": set(), "claims": 0, "incurred_bob": 0},
        )
        bucket["clients"].add(row["client_name"])
        if row["engine"] == "coverage":
            bucket["claims"] += 1
            bucket["incurred_bob"] += row["current"]["metrics"]["claim_loss_bob"]
    out = []
    for item in buckets.values():
        client_count = len(item["clients"]) or 1
        out.append(
            {
                "city": item["city"],
                "business_type": item["business_type"],
                "client_count": client_count,
                "claim_count": item["claims"],
                "accident_frequency": round(item["claims"] / client_count, 3),
                "incurred_bob": round(item["incurred_bob"], 2),
            }
        )
    return sorted(out, key=lambda item: (-item["accident_frequency"], -item["incurred_bob"]))


def _severity_table(case_results: list[dict[str, Any]]) -> list[dict[str, Any]]:
    buckets: dict[str, dict[str, Any]] = {}
    for row in case_results:
        if row["engine"] != "coverage":
            continue
        cause = row.get("claim_cause") or "sin_causa"
        bucket = buckets.setdefault(cause, {"claim_cause": cause, "claim_count": 0, "incurred_bob": 0, "max_case_bob": 0})
        loss = row["current"]["metrics"]["claim_loss_bob"]
        bucket["claim_count"] += 1
        bucket["incurred_bob"] += loss
        bucket["max_case_bob"] = max(bucket["max_case_bob"], loss)
    return sorted(
        (
            {
                **item,
                "incurred_bob": round(item["incurred_bob"], 2),
                "avg_severity_bob": round(item["incurred_bob"] / max(1, item["claim_count"]), 2),
            }
            for item in buckets.values()
        ),
        key=lambda item: (-item["avg_severity_bob"], -item["claim_count"]),
    )


def _risk_alerts(case_results: list[dict[str, Any]]) -> list[dict[str, Any]]:
    alerts = []
    for client in _client_health_table(case_results):
        if client["risk_score"] >= 55:
            alerts.append(
                {
                    "severity": "high" if client["risk_score"] >= 75 else "medium",
                    "title": f"{client['client_name']} concentra riesgo",
                    "detail": f"Loss ratio {client['loss_ratio']:.2f}, frecuencia {client['accident_frequency']:.2f}.",
                    "owner": "pricing" if client["loss_ratio"] > 0.7 else "claims_accidents",
                    "node": client["risk_nodes"][0] if client["risk_nodes"] else "renewal.root",
                }
            )
    for node in _cashout_node_table(case_results)[:3]:
        alerts.append(
            {
                "severity": "medium",
                "title": "Nodo con salida de dinero",
                "detail": f"{node['node_id']} generó Bs {round(node['cashout_bob'], 2)} en {node['case_id']}.",
                "owner": "claims_accidents",
                "node": node["node_id"],
            }
        )
    return alerts[:8]


def _case_table(case_results: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {
            "case_id": row["case_id"],
            "engine": row["engine"],
            "client_name": row["client_name"],
            "city": row["city"],
            "broker": row["broker"],
            "vehicle_make": row["vehicle_make"],
            "business_type": row["business_type"],
            "current_outcome": row["current"]["outcome"],
            "candidate_outcome": row["candidate"]["outcome"],
            "terminal_node": row["current"]["terminal_node"],
            "candidate_terminal_node": row["candidate"]["terminal_node"],
            **row["delta"],
        }
        for row in case_results
    ]


def _price_curve(selected: list[dict[str, Any]], candidate: dict[str, Any]) -> list[dict[str, Any]]:
    curve = []
    for multiplier in [0.75, 0.85, 0.95, 1.0, 1.05, 1.1, 1.18, 1.25, 1.35, 1.5]:
        scenario = copy.deepcopy(candidate)
        scenario["controls"] = {**(candidate.get("controls") or DEFAULT_CONTROLS), "coverage_price_multiplier": multiplier}
        scenario["overlays"] = {**(scenario.get("overlays") or {}), **scenario["controls"]}
        rows = [_simulate_case(case, scenario) for case in selected]
        summary = _summary(rows, scenario)
        curve.append(
            {
                "coverage_price_multiplier": multiplier,
                "premium_bob": summary["candidate"]["premium_bob"],
                "claim_loss_bob": summary["candidate"]["claim_loss_bob"],
                "profit_bob": summary["candidate"]["profit_bob"],
                "loss_ratio": summary["candidate"]["loss_ratio"],
                "risk_score": summary["candidate"]["risk_score"],
                "avg_broker_satisfaction": summary["candidate"]["avg_broker_satisfaction"],
                "avg_churn_probability": summary["candidate"]["avg_churn_probability"],
            }
        )
    return curve


def _renewal_simulation(selected: list[dict[str, Any]], candidate: dict[str, Any]) -> dict[str, Any]:
    renewal_pool = [case for case in selected if case["engine"] == "uw"] or [case for case in MOCK_CASES if case["engine"] == "uw"]
    controls = candidate.get("controls") or DEFAULT_CONTROLS
    severity = float(controls.get("severity_multiplier", 1.0))
    frequency = float(controls.get("accident_frequency_multiplier", 1.0))
    elasticity = float(controls.get("renewal_churn_elasticity", DEFAULT_CONTROLS["renewal_churn_elasticity"]))
    curve = []
    for change in [-15, -10, -5, 0, 5, 8, 10, 12, 15, 20, 25, 30]:
        premium, expected_loss, retained_profit, retained_clients = 0.0, 0.0, 0.0, 0.0
        for case in renewal_pool:
            economics = case["economics"]
            price_factor = 1 + change / 100
            churn = _bounded(economics["base_churn_probability"] + max(0, change) * elasticity + min(0, change) * 0.004)
            retention = 1 - churn
            case_premium = economics["annual_premium_bob"] * price_factor
            case_loss = economics["expected_loss_bob"] * severity * frequency
            premium += case_premium * retention
            expected_loss += case_loss * retention
            retained_profit += (case_premium - case_loss) * retention
            retained_clients += retention
        curve.append(
            {
                "price_change_percent": change,
                "retention_rate": round(retained_clients / max(1, len(renewal_pool)), 3),
                "premium_bob": round(premium, 2),
                "expected_loss_bob": round(expected_loss, 2),
                "profit_bob": round(retained_profit, 2),
                "loss_ratio": round(expected_loss / premium, 3) if premium else 0,
            }
        )
    best = max(curve, key=lambda item: item["profit_bob"]) if curve else {}
    return {
        "candidate_price_change_percent": controls.get("renewal_price_change_percent", 0),
        "best_price_change_percent": best.get("price_change_percent"),
        "best_profit_bob": best.get("profit_bob", 0),
        "curve": curve,
        "tree": _renewal_tree(renewal_pool, candidate),
        "queue": _renewal_queue(renewal_pool, candidate),
    }


def _renewal_tree(renewal_pool: list[dict[str, Any]], candidate: dict[str, Any]) -> list[dict[str, Any]]:
    total_premium = sum(case["economics"]["annual_premium_bob"] for case in renewal_pool)
    total_loss = sum(case["economics"]["expected_loss_bob"] for case in renewal_pool)
    loss_ratio = total_loss / total_premium if total_premium else 0
    claim_cases = [case for case in MOCK_CASES if case["engine"] == "coverage"]
    frequency = len(claim_cases) / max(1, len(renewal_pool))
    severity = sum(case["economics"].get("claim_estimate_bob", 0) for case in claim_cases) / max(1, len(claim_cases))
    broker_friction = sum(1 for case in claim_cases if case["economics"].get("broker_unhappy")) / max(1, len(claim_cases))
    recommended = "subir_precio_y_revisar" if loss_ratio > 0.75 or broker_friction > 0.5 else "mantener_o_crecer"
    return [
        {
            "id": "renewal.root",
            "title": "Evaluar renovación",
            "metric": "loss_ratio",
            "value": round(loss_ratio, 3),
            "decision": recommended,
            "kind": "mock_decision_tree",
        },
        {
            "id": "renewal.frequency",
            "parent": "renewal.root",
            "title": "Frecuencia de accidentes",
            "condition": "claims / clientes",
            "value": round(frequency, 3),
            "decision": "aplicar_recargo" if frequency > 0.7 else "sin_recargo_frecuencia",
        },
        {
            "id": "renewal.severity",
            "parent": "renewal.root",
            "title": "Severidad promedio",
            "condition": "incurrido / reclamos",
            "value_bob": round(severity, 2),
            "decision": "revisar_deducible" if severity > 9000 else "mantener_deducible",
        },
        {
            "id": "renewal.broker_friction",
            "parent": "renewal.root",
            "title": "Fricción broker",
            "condition": "reclamos inconformes / reclamos",
            "value": round(broker_friction, 3),
            "decision": "proteger_retencion" if broker_friction > 0.45 else "sin_accion_comercial",
        },
        {
            "id": "renewal.price_action",
            "parent": "renewal.root",
            "title": "Acción de precio sugerida",
            "value": candidate.get("controls", {}).get("renewal_price_change_percent", 0),
            "decision": "simular_curva_precio",
        },
    ]


def _renewal_queue(renewal_pool: list[dict[str, Any]], candidate: dict[str, Any]) -> list[dict[str, Any]]:
    controls = candidate.get("controls") or DEFAULT_CONTROLS
    price_change = float(controls.get("renewal_price_change_percent", 0))
    rows = []
    for case in renewal_pool:
        economics = case["economics"]
        loss_ratio = economics["expected_loss_bob"] / max(1, economics["annual_premium_bob"])
        churn = _bounded(economics["base_churn_probability"] + max(0, price_change) * float(controls.get("renewal_churn_elasticity", 0.014)))
        recommended = max(-5, min(30, round((loss_ratio - 0.55) * 45 + price_change, 1)))
        rows.append(
            {
                "client_name": case["client_name"],
                "policy_type": case["policy_type"],
                "city": case["city"],
                "broker": case["broker"],
                "current_premium_bob": economics["annual_premium_bob"],
                "loss_ratio": round(loss_ratio, 3),
                "churn_probability": round(churn, 3),
                "recommended_price_change_percent": recommended,
                "renewal_node": "renewal.price_action" if loss_ratio < 0.75 else "renewal.root",
            }
        )
    return sorted(rows, key=lambda item: (-item["loss_ratio"], -item["churn_probability"]))
