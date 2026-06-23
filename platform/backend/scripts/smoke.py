#!/usr/bin/env python3
"""No-dependency smoke checks for the platform service layer."""

import json
import os
import sys
import tempfile
from pathlib import Path

sys.dont_write_bytecode = True
os.environ["INSURANCE_PLATFORM_DISABLE_AUDIT_FILE"] = "1"
os.environ["OPENAI_PARSER_ENABLED"] = "0"
os.environ["OPENAI_MEDIA_PARSER_ENABLED"] = "0"
APP_DIR = Path(__file__).resolve().parents[1]
if str(APP_DIR) not in sys.path:
    sys.path.insert(0, str(APP_DIR))

from app import services


UW_FACTS = {
    "product": "moto_proteccion",
    "channel": "directas",
    "client_type": "empresa",
    "requests_standard_deviation": False,
    "is_mass_grouping": False,
    "is_public_tender": False,
    "vehicle_class": "motocicleta",
    "cilindrada_cc": 150,
    "es_moto_lujo_o_competicion": False,
    "segment": "comercial",
    "is_contractor_equipment": False,
    "has_plates": True,
    "is_competition_offroad": False,
    "has_body_modifications": False,
    "is_rail_vehicle": False,
    "is_rental": False,
    "is_learning_vehicle": False,
    "vehicle_age_years": 5,
    "circula_fuera_pais_actividad_regular": False,
    "capacidad_original_mayor_8": False,
    "valor_asegurado": 90000,
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
    "model_year": 2021,
    "make": "Toyota",
    "model": "Corolla",
    "city": "La Paz",
    "siniestralidad_historica": 35,
}

COVERAGE_FACTS = {
    "coverage_section": "robo_parcial",
    "coverage_included": True,
    "event_type": "robo_partes",
    "driver_alcohol_over_limit": False,
    "driver_under_drugs_or_impairing_medication": False,
    "intentional_act": False,
    "confiscation_or_authority_measure": False,
    "vehicle_type": "auto",
    "foreign_territory": False,
    "theft_consumated": True,
    "parts_verified_and_valued": True,
    "parts_permanently_attached_or_declared": True,
    "security_measures_requested": False,
    "security_measures_completed": False,
    "written_security_exception": False,
    "attached_clause_codes": [],
    "uses_free_choice_workshop": False,
    "estimated_replacement_cost_percent_va": 20,
    "part_repair_cost_percent_replacement": 80,
    "insured_requests_part_replacement": False,
    "parts_available_local_market": True,
    "local_price_over_import_price_percent": 0,
    "police_report_within_6h": True,
    "alcohol_test_within_6h": True,
    "justified_impediment": False,
    "technical_report_available": True,
    "insurer_notice_days": 2,
    "repair_started_without_authorization": False,
}

RATING_FACTS = {
    "valor_asegurado": 200000,
    "model_year": 2020,
    "make": "Toyota",
    "model": "Corolla",
    "vehicle_type": "auto",
    "city": "La Paz",
    "extraterritorialidad": "no",
    "cuotas": 1,
}

RENEWAL_BODY = {
    "client_id": "CLI-SMOKE-001",
    "policy_id": "POL-SMOKE-001",
    "rating_facts": RATING_FACTS,
    "price_adjustment_percent": 8,
    "price_adjustment_reason": "Smoke test renewal adjustment",
    "node_overrides": [
        {
            "target_type": "node",
            "target_id": "standard.elig.descapotable_lona",
            "change_type": "eligibility_exception",
            "patch": {"field": "outcome", "from": "decline", "to": "refer_authority"},
            "rationale": "Client-scoped renewal exception.",
        }
    ],
    "facts_confirmed": True,
}


def check(name, condition, detail=None):
    if not condition:
        raise AssertionError(f"{name} failed: {detail}")
    print(f"OK {name}")


def run_persisted_chat(engine, first_text, answers, max_turns=80):
    root = Path(tempfile.mkdtemp(prefix="riskiq-smoke-chat-"))
    old_disable = os.environ.get("INSURANCE_PLATFORM_DISABLE_AUDIT_FILE")
    old_paths = {
        "CHAT_SESSIONS": services.CHAT_SESSIONS,
        "HUMAN_TASKS": services.HUMAN_TASKS,
        "AUDIT_LOG": services.AUDIT_LOG,
        "PROPOSAL_DRAFTS": services.PROPOSAL_DRAFTS,
        "RENEWAL_OVERLAYS": services.RENEWAL_OVERLAYS,
    }
    os.environ["INSURANCE_PLATFORM_DISABLE_AUDIT_FILE"] = "0"
    services.CHAT_SESSIONS = root / "chat_sessions.jsonl"
    services.HUMAN_TASKS = root / "human_tasks.jsonl"
    services.AUDIT_LOG = root / "audit.jsonl"
    services.PROPOSAL_DRAFTS = root / "drafts.jsonl"
    services.RENEWAL_OVERLAYS = root / "renewals.jsonl"
    try:
        result = services.chat_turn({"engine": engine, "text": first_text})
        session_id = result["session"]["session_id"]
        seen = []
        for _ in range(max_turns):
            session = result["session"]
            if session["status"] != "needs_client_followup":
                return result, seen
            packet = session.get("client_followup") or {}
            fact = packet.get("requested_fact")
            seen.append(fact)
            if fact not in answers:
                return result, seen
            result = services.chat_turn({"session_id": session_id, "engine": engine, "text": str(answers[fact])})
        return result, seen
    finally:
        if old_disable is None:
            os.environ.pop("INSURANCE_PLATFORM_DISABLE_AUDIT_FILE", None)
        else:
            os.environ["INSURANCE_PLATFORM_DISABLE_AUDIT_FILE"] = old_disable
        for name, value in old_paths.items():
            setattr(services, name, value)


def main():
    health = services.health()
    check("uw validator green through service", health["ok"], health["uw_validator"]["stdout"])

    versions = services.list_versions()
    check("version registry includes uw", any(v["engine"] == "uw" for v in versions), versions)
    check("version registry includes coverage", any(v["engine"] == "coverage" for v in versions), versions)
    engines = services.list_engines()
    check("engine catalog is modular", {e["id"] for e in engines} >= {"uw", "coverage"}, engines)

    product_only = services.extract_facts({"engine": "uw", "text": "Producto Moto Protección para cliente empresa por canal directas."})
    check(
        "chat extractor does not infer motorcycle from product name",
        "vehicle_class" not in product_only["facts"],
        product_only,
    )
    chat = services.extract_facts(
        {
            "engine": "uw",
            "text": "Producto Moto Protección, canal directas, cliente empresa, segmento comercial. Motocicleta 150 cc, valor asegurado Bs. 90000, ciudad La Paz, siniestralidad histórica 35%. No es descapotable con techo de lona.",
            "attachments": [{"kind": "photo", "name": "ruat.jpg", "mime": "image/jpeg", "size": 1200}],
        }
    )
    check("chat extractor fills UW facts", chat["facts"]["vehicle_class"]["value"] == "motocicleta" and chat["facts"]["cilindrada_cc"]["value"] == 150, chat)
    check("chat extractor keeps media advisory", chat["attachments"]["requires_processing"] is True, chat)
    intent_text = (
        "Cliente empresa por canal directas solicita cotizar Automotores. Vehiculo liviano "
        "Toyota Corolla año 2020, valor asegurado Bs. 200000, plaza La Paz, siniestralidad "
        "historica 35%, no circula regularmente fuera del pais."
    )
    intent_extract = services.extract_facts({"engine": "uw", "text": intent_text})
    intent_values = {key: item["value"] for key, item in intent_extract["facts"].items()}
    check(
        "chat extractor understands natural vehicle quote intent",
        intent_values.get("product") == "otro"
        and intent_values.get("vehicle_class") == "liviano"
        and intent_values.get("valor_asegurado") == 200000
        and intent_values.get("model_year") == 2020
        and intent_values.get("make") == "Toyota"
        and intent_values.get("model") == "Corolla"
        and intent_values.get("circula_fuera_pais_actividad_regular") is False,
        intent_extract,
    )

    uw = services.run_uw({"facts": UW_FACTS, "facts_confirmed": True})
    check("uw run eligible", uw["outcome"] == "eligible", json.dumps(uw, ensure_ascii=False))
    check("uw run includes approved final price", uw["pricing"]["approved"] is True and uw["pricing"]["final_price_bob"] > 0, uw)

    sparse = {
        "product": "otro",
        "channel": "directas",
        "client_type": "empresa",
        "requests_standard_deviation": False,
        "is_mass_grouping": False,
        "is_public_tender": False,
    }
    stopped = services.run_uw({"facts": sparse, "facts_confirmed": True})
    packet = stopped.get("human_packet", {})
    check("uw human packet emitted", packet.get("requested_fact") == "vehicle_class" and packet.get("resumable") is True, stopped)
    resumed = services.resume_run({"packet": packet, "answer": {"fact_id": "vehicle_class", "value": "liviano"}})
    check("uw human packet resumes", resumed.get("human_packet", {}).get("requested_fact") == "segment", resumed)

    cov = services.run_coverage({"facts": COVERAGE_FACTS, "facts_confirmed": True})
    check("coverage run likely covered", cov["outcome"] == "likely_covered", json.dumps(cov, ensure_ascii=False))
    check("coverage legal guardrail", any(c.get("kind") == "legal_guardrail" for c in cov.get("caveats", [])), cov)

    rating = services.run_lbc_auto_rating({"facts": RATING_FACTS, "facts_confirmed": True})
    check("lbc rating emits calibrated La Paz premium", rating["annual_premium_bob"] == 7049.0, rating)
    check("lbc rating emits three options", len(rating["options"]) == 3 and rating["options"][1]["cash_annual_premium_bob"] == 6273.61, rating)
    check("lbc rating is reverse engineered outside source graph", rating["source_backed"] is False and rating["engine"] == "lbc_auto_rating", rating)
    weighted = services.run_uw(
        {
            "facts": UW_FACTS,
            "facts_confirmed": True,
            "rating_weights": {"vehicle_types": {"motocicleta": {"rate": 0.10, "minimum": 900.0, "label": "Motorcycle"}}},
        }
    )
    check("uw pricing uses isolated lbc formula, not editable demo weights", weighted["pricing"]["final_price_bob"] == uw["pricing"]["final_price_bob"], weighted)

    renewal = services.preview_renewal(RENEWAL_BODY)
    check("renewal stores delta only", renewal["source_truth_unchanged"] is True and renewal["storage_estimate"]["delta_bytes"] > 0, renewal)
    check("renewal pins graph version", renewal["base_graph_version_id"].startswith("uw-"), renewal)
    check("renewal node override normalized", renewal["node_overrides"][0]["target_exists_in_base_graph"] is True, renewal)

    created_renewal = services.create_renewal(RENEWAL_BODY)
    check("renewal draft create works", created_renewal["created"] is True and created_renewal["renewal_id"].startswith("REN-"), created_renewal)
    renewal_queue = services.list_renewal_queue()
    check("renewal queue exposes manual-backed workflow", renewal_queue["manual_backed"] is True, renewal_queue)

    local_chat = services.chat_turn(
        {
            "engine": "uw",
            "text": "Producto Moto Protección, canal directas, cliente empresa. Motocicleta 150 cc, valor asegurado Bs. 90000, ciudad La Paz.",
        }
    )
    check(
        "local chat auto-runs with confirmed packet facts",
        local_chat["session"]["status"] in {"needs_client_followup", "ran_tree", "human_task_created"}
        and "vehicle_class" in local_chat["session"]["confirmed_facts"]
        and not local_chat["session"].get("pending_facts"),
        local_chat,
    )
    confirmed_chat = local_chat
    check(
        "local chat asks client before human task when fact is client-answerable",
        confirmed_chat["session"]["status"] in {"needs_client_followup", "ran_tree", "human_task_created"}
        and (
            confirmed_chat["session"]["status"] != "needs_client_followup"
            or confirmed_chat["session"]["client_followup"]["resolution_channel"] == "client_followup"
        ),
        confirmed_chat,
    )
    check("local chat creates broker case", local_chat["case"]["owner_role"] == "sales", local_chat)
    uw_chat_done, uw_seen = run_persisted_chat(
        "uw",
        "Hola, necesito cotizar una moto para un cliente empresa. Es Moto Protección, canal directas, 150 cc y vale Bs 90000.",
        {
            "product": "moto protección",
            "channel": "directas",
            "client_type": "empresa",
            "requests_standard_deviation": "no",
            "is_public_tender": "no",
            "is_mass_grouping": "no",
            "vehicle_class": "motocicleta",
            "segment": "comercial",
            "is_contractor_equipment": "no",
            "has_plates": "sí",
            "is_competition_offroad": "no",
            "has_body_modifications": "no",
            "is_rail_vehicle": "no",
            "cilindrada_cc": "150",
            "es_moto_lujo_o_competicion": "no",
            "valor_asegurado": "90000",
            "suscriptor": "Manuel Sauma",
            "has_rc": "no",
            "is_enlatado": "no",
            "has_ap": "no",
            "siniestralidad": "35",
            "retroactividad_dias": "0",
            "siniestro_en_periodo": "no",
            "cantidad_vehiculos": "1",
            "is_rental": "no",
            "is_learning_vehicle": "no",
            "vehicle_age_years": "5",
            "is_renewal": "no",
            "model_year": "2021",
            "vehicle_brand": "Toyota",
            "make": "Toyota",
            "model": "Corolla",
            "city": "La Paz",
            "circula_fuera_pais_actividad_regular": "no",
            "capacidad_original_mayor_8": "no",
            "servicio_publico_pasajeros": "no",
            "is_convertible_lona": "no",
            "is_armored": "no",
            "is_bomberos_policia_ejercito": "no",
            "is_ambulance": "no",
            "has_foreign_plates": "no",
            "is_brevet_policy": "no",
        },
    )
    check(
        "local chat asks follow-ups then returns UW price",
        uw_chat_done["session"]["status"] == "ran_tree"
        and (uw_chat_done["session"]["last_result_summary"] or {}).get("pricing_status") == "approved_final_price"
        and "model_year" in uw_seen
        and "city" in uw_seen,
        {"seen": uw_seen, "session": uw_chat_done["session"]},
    )
    coverage_chat_done, coverage_seen = run_persisted_chat(
        "coverage",
        "Siniestro por robo de partes en La Paz. La póliza tiene robo parcial, hubo denuncia y dosaje dentro de seis horas, aviso a los dos días.",
        {
            "coverage_included": "sí, robo parcial está incluido",
            "driver_alcohol_over_limit": "no, dosaje negativo",
            "driver_under_drugs_or_impairing_medication": "no",
            "intentional_act": "no",
            "confiscation_or_authority_measure": "no",
            "vehicle_type": "auto",
            "theft_consumated": "sí",
            "parts_verified_and_valued": "sí",
            "parts_permanently_attached_or_declared": "sí",
            "security_measures_requested": "no",
            "security_measures_completed": "no aplica",
            "written_security_exception": "no",
            "police_report_within_6h": "sí",
            "alcohol_test_within_6h": "sí",
            "justified_impediment": "no",
            "claim_estimate_usd": "800",
            "affects_only_danos_or_robo": "sí",
            "technical_report_available": "sí",
            "insurer_notice_days": "2",
            "repair_started_without_authorization": "no",
            "uses_free_choice_workshop": "no",
            "attached_clause_codes": "ninguno",
            "estimated_replacement_cost_percent_va": "20",
            "part_repair_cost_percent_replacement": "80",
            "insured_requests_part_replacement": "no",
            "parts_available_local_market": "sí",
            "local_price_over_import_price_percent": "0",
            "foreign_territory": "no",
            "foreign_stay_days": "0",
        },
    )
    check(
        "local chat asks follow-ups then returns coverage result",
        coverage_chat_done["session"]["status"] == "ran_tree"
        and (coverage_chat_done["session"]["last_result_summary"] or {}).get("outcome") in {"likely_covered", "partially_covered"}
        and "driver_alcohol_over_limit" in coverage_seen
        and "affects_only_danos_or_robo" in coverage_seen,
        {"seen": coverage_seen, "session": coverage_chat_done["session"]},
    )
    default_rule = next(rule for rule in services.list_followup_rules() if rule["rule_id"] == "FUP-DEFAULT-3H")
    check("follow-up default is 3 hours", default_rule["delay_minutes"] == 180, default_rule)
    followup = services.create_followup({"target_type": "case", "target_id": "CASE-SMOKE", "role": "sales"})
    check("manual follow-up uses default 3 hour rule", followup["rule_id"] == "FUP-DEFAULT-3H" and followup["status"] == "scheduled", followup)
    custom_rule = services.upsert_followup_rule({"role": "uw", "stage": "missing_fact", "delay_minutes": 45, "label": "UW smoke"})
    check("custom follow-up rule can be configured", custom_rule["delay_minutes"] == 45 and custom_rule["role"] == "uw", custom_rule)
    voice_reply = services.create_voice_reply({"conversation_id": local_chat["session"]["session_id"], "text": "Te envío las mejores opciones apenas confirmemos los datos.", "generate_audio": True})
    check("voice reply logs canonical text", voice_reply["text_canonical"].startswith("Te envío") and voice_reply["live_calls_status"] == "future_phase", voice_reply)
    queue = services.role_queue("c_suite")
    check("c-suite queue is summary only", queue["summary_only"] is True and queue["editable"] is False, queue)
    structured_draft = services.draft_proposal(
        {
            "kind": "OVL",
            "engine": "uw",
            "title": "Structured condition edit smoke",
            "target": "standard.elig.gate_tipo_vehiculo",
            "rationale": "Smoke test structured patch persistence.",
            "proposed_change": "Add structured condition patch metadata.",
            "patch_type": "condition",
            "structured_patch": {
                "target_type": "node",
                "patch_type": "condition",
                "changed": {"evaluate": {"from": None, "to": {"var": "vehicle_class"}}},
            },
        },
        role="uw_user",
    )
    check("structured proposal patch persisted", structured_draft["draft"]["structured_patch"]["patch_type"] == "condition", structured_draft)

    blocked = False
    try:
        services.run_coverage({"facts": {"coverage_section": {"value": "robo_parcial", "confirmed": False}}, "source": "nl_extraction"})
    except ValueError:
        blocked = True
    check("unconfirmed nl facts blocked", blocked)

    ai_publish = services.publish_proposal(
        {
            "validator_ok": True,
            "proposal": {
                "uw_manager_approved": True,
                "actuarial_pricing_approved": True,
                "legal_compliance_approved": True,
                "release_approved": True,
            },
        },
        role="ai_agent",
    )
    check("ai cannot publish", ai_publish["allowed"] is False, ai_publish)

    discovery = services.data_discovery()
    check("data discovery verdict exists", "downstream_verdict" in discovery, discovery)
    check("mock database unlocks simulation concept", discovery["mock_database"]["has_submission_fact_vector"] is True, discovery)

    sim_filters = services.simulation_filters()
    check(
        "simulation filter metadata exposes mock database",
        sim_filters["mock_database"]["row_counts"]["total_cases"] >= 12
        and "La Paz" in sim_filters["filters"]["cities"]
        and sim_filters["candidate_presets"],
        sim_filters,
    )
    sim = services.run_simulation({"filters": {"engine": "all"}, "candidate_id": "growth_sandbox"})
    check(
        "mock simulation runs both engines",
        sim["selection"]["uw_count"] > 0
        and sim["selection"]["coverage_count"] > 0
        and sim["summary"]["delta"]["outcome_changed_count"] > 0,
        sim["summary"],
    )
    check(
        "simulation emits claims insight tables",
        sim["tables"]["loss_nodes"]
        and sim["tables"]["broker_clause_friction"]
        and sim["tables"]["node_hits"],
        sim["tables"],
    )
    check(
        "simulation exposes live risk and pricing controls",
        "risk_score" in sim["risk"]["candidate"]
        and len(sim["price_curve"]) >= 8
        and sim["renewal"]["tree"]
        and sim["tables"]["cashout_nodes"],
        sim,
    )
    live_sim = services.run_simulation(
        {
            "filters": {"engine": "all"},
            "candidate_id": "growth_sandbox",
            "controls": {
                "coverage_price_multiplier": 1.3,
                "accident_frequency_multiplier": 1.15,
                "severity_multiplier": 1.1,
                "renewal_price_change_percent": 15,
                "coverage_moto_parts_outcome": "refer_adjuster",
            },
        }
    )
    check(
        "live simulation controls change risk",
        live_sim["controls"]["coverage_price_multiplier"] == 1.3
        and live_sim["risk"]["candidate"]["risk_score"] != sim["risk"]["candidate"]["risk_score"],
        live_sim["risk"],
    )
    filtered_sim = services.run_simulation(
        {
            "filters": {"engine": "uw", "age_min": 40, "vehicle_makes": ["Suzuki"]},
            "candidate_id": "growth_sandbox",
        }
    )
    check(
        "simulation filters real cohort dimensions",
        filtered_sim["selection"]["selected_count"] == 1
        and filtered_sim["tables"]["cases"][0]["case_id"] == "SUB-003",
        filtered_sim,
    )
    supervision = services.supervision_dashboard()
    check(
        "supervision dashboard exposes client risk room",
        supervision["tables"]["client_health"]
        and supervision["tables"]["risk_alerts"]
        and supervision["tables"]["cashout_nodes"]
        and supervision["renewal_tree"],
        supervision,
    )


if __name__ == "__main__":
    main()
