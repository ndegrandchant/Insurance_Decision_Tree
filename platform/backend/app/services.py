import json
import os
import re
import sys
import unicodedata
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from . import broker_control
from . import simulation

ENGINE_PATH = Path(__file__).resolve().parents[2] / "engine"
if str(ENGINE_PATH) not in sys.path:
    sys.path.insert(0, str(ENGINE_PATH))

from insurance_engine.coverage import CoverageEngine
from insurance_engine.discovery import discover_available_data
from insurance_engine.governance import can_publish
from insurance_engine.lbc_auto_rating import lbc_auto_rating_schema, quote_lbc_auto_price
from insurance_engine.nl import extract_facts_advisory
from insurance_engine.registry import (
    engines,
    fact_definitions,
    graph_nodes,
    graph_versions,
    issue_flags,
    ledger_entries,
    ledger_entry,
)
from insurance_engine.renewal import build_renewal_preview, renewal_schema
from insurance_engine.uw import UWEngine

AUDIT_LOG = Path(__file__).resolve().parents[2] / "db" / "dev_audit_log.jsonl"
PROPOSAL_DRAFTS = Path(__file__).resolve().parents[2] / "db" / "proposal_drafts.jsonl"
RENEWAL_OVERLAYS = Path(__file__).resolve().parents[2] / "db" / "renewal_overlays.jsonl"
HUMAN_TASKS = Path(__file__).resolve().parents[2] / "db" / "human_tasks.jsonl"
CHAT_SESSIONS = Path(__file__).resolve().parents[2] / "db" / "chat_sessions.jsonl"


def health() -> dict[str, Any]:
    uw_validator = UWEngine().validate()
    return {
        "ok": uw_validator["ok"],
        "service": "dynamic-uw-coverage-platform",
        "uw_validator": uw_validator,
    }


def run_uw(body: dict[str, Any], role: str = "uw_user") -> dict[str, Any]:
    _assert_confirmed(body)
    facts = _plain_facts(body.get("facts", {}))
    result = UWEngine().run(facts, start=body.get("start"))
    result = _with_uw_pricing(result, facts=facts, body=body)
    audit_id = _record_audit(
        role,
        "uw.run",
        {
            "start": body.get("start"),
            "outcome": result.get("outcome"),
            "pricing_status": (result.get("pricing") or {}).get("status"),
        },
    )
    return _with_human_packet({**result, "engine": "uw", "audit_id": audit_id}, facts=facts, engine="uw", start=body.get("start"))


def run_coverage(body: dict[str, Any], role: str = "claims_user") -> dict[str, Any]:
    _assert_confirmed(body)
    facts = _plain_facts(body.get("facts", {}))
    result = CoverageEngine().run(facts)
    audit_id = _record_audit(role, "coverage.run", {"outcome": result.get("outcome")})
    return _with_human_packet({**result, "engine": "coverage", "audit_id": audit_id}, facts=facts, engine="coverage", start=None)


def run_lbc_auto_rating(body: dict[str, Any], role: str = "uw_user") -> dict[str, Any]:
    _assert_confirmed(body)
    facts = _plain_facts(body.get("facts") if "facts" in body else body)
    result = quote_lbc_auto_price(facts)
    audit_id = _record_audit(
        role,
        "rating.lbc_auto.run",
        {
            "outcome": result.get("outcome"),
            "annual_premium_bob": result.get("annual_premium_bob"),
            "selected_option": result.get("selected_option"),
        },
    )
    return {**result, "audit_id": audit_id}


def run_demo_rating(body: dict[str, Any], role: str = "uw_user") -> dict[str, Any]:
    """Backward-compatible endpoint name for the active LBC Auto rating engine."""
    return run_lbc_auto_rating(body, role=role)


def rating_demo_schema() -> dict[str, Any]:
    return lbc_auto_rating_schema()


def _with_uw_pricing(result: dict[str, Any], *, facts: dict[str, Any], body: dict[str, Any]) -> dict[str, Any]:
    if body.get("include_pricing") is False:
        return result
    pricing = _uw_pricing(result, facts=facts, body=body)
    audit = list(result.get("audit") or [])
    if pricing.get("audit_step"):
        audit.append(pricing["audit_step"])
    return {**result, "audit": audit, "pricing": {k: v for k, v in pricing.items() if k != "audit_step"}}


def _uw_pricing(result: dict[str, Any], *, facts: dict[str, Any], body: dict[str, Any]) -> dict[str, Any]:
    outcome = result.get("outcome")
    pricing_node = "rating.lbc_auto.final_prices"
    if outcome not in {"eligible", "conditional_eligible"}:
        return {
            "status": "blocked_by_uw_outcome",
            "approved": False,
            "final_price_bob": None,
            "blocked_reason": f"El resultado de suscripción es {outcome}; el precio final solo se produce después de la aprobación.",
            "audit_step": {
                "node": pricing_node,
                "type": "rating",
                "title": "Compuerta de precio final",
                "result": "blocked",
                "detail": f"Tarificación omitida porque el resultado de suscripción es {outcome}.",
                "facts_used": {},
            },
        }
    rating_facts = {**facts, **_plain_facts(body.get("rating_facts", {}))}
    try:
        quote = quote_lbc_auto_price(rating_facts)
    except ValueError as exc:
        return {
            "status": "missing_rating_input",
            "approved": False,
            "final_price_bob": None,
            "blocked_reason": str(exc),
            "required_inputs": [
                "valor_asegurado",
                "model_year",
                "make",
                "marca_auto",
                "model",
                "city o plaza_auto",
                "extraterritorialidad",
                "cuotas",
            ],
            "audit_step": {
                "node": pricing_node,
                "type": "rating",
                "title": "Compuerta de precio final",
                "result": "missing_fact",
                "detail": str(exc),
                "facts_used": _pricing_facts_used(rating_facts),
            },
        }
    requires_review = quote.get("outcome") == "human_pricing_review" or bool(quote.get("review_reasons"))
    approved = outcome == "eligible" and not requires_review
    return {
        "status": "approved_final_price" if approved else "requires_pricing_review",
        "approved": approved,
        "final_price_bob": quote["annual_premium_bob"] if approved else None,
        "suggested_price_bob": quote["annual_premium_bob"],
        "final_options": quote["options"] if approved else None,
        "suggested_options": quote["options"],
        "selected_option": quote.get("selected_option"),
        "currency": quote["currency"],
        "rating_node": pricing_node,
        "quote": quote,
        "review_reasons": quote.get("review_reasons", []),
        "audit_step": {
            "node": pricing_node,
            "type": "rating",
            "title": "Precios finales LBC Auto después de aprobación de suscripción",
            "result": "priced" if approved else "review",
            "detail": "Precios LBC Auto producidos." if approved else "Precio calculado, pero requiere revisión de tarificación.",
            "facts_used": _pricing_facts_used(rating_facts),
        },
    }


def _pricing_facts_used(facts: dict[str, Any]) -> dict[str, Any]:
    keys = [
        "valor_asegurado",
        "model_year",
        "year",
        "make",
        "marca",
        "marca_auto",
        "model",
        "vehicle_class",
        "vehicle_type",
        "city",
        "plaza",
        "plaza_auto",
        "extraterritorialidad",
        "cuotas",
        "n_cuotas",
        "selected_pricing_option",
        "siniestralidad_historica",
    ]
    return {k: facts[k] for k in keys if k in facts}


def renewal_overlay_schema() -> dict[str, Any]:
    return renewal_schema()


def preview_renewal(body: dict[str, Any], role: str = "uw_user") -> dict[str, Any]:
    _assert_confirmed(body)
    preview = build_renewal_preview(
        body,
        versions=graph_versions(),
        graph_lookup=_graph_lookup,
    )
    audit_id = _record_audit(
        role,
        "renewal.preview",
        {
            "client_id": preview["client_id"],
            "policy_id": preview["policy_id"],
            "base_graph_version_id": preview["base_graph_version_id"],
            "node_overrides": len(preview["node_overrides"]),
        },
    )
    return {**preview, "audit_id": audit_id}


def create_renewal(body: dict[str, Any], role: str = "uw_user") -> dict[str, Any]:
    draft = preview_renewal(
        {
            **body,
            "renewal_id": body.get("renewal_id") or f"REN-{uuid.uuid4().hex[:10].upper()}",
            "status": body.get("status") or "draft",
        },
        role=role,
    )
    _persist_renewal(draft)
    audit_id = _record_audit(
        role,
        "renewal.create",
        {
            "renewal_id": draft["renewal_id"],
            "client_id": draft["client_id"],
            "policy_id": draft["policy_id"],
        },
    )
    return {**draft, "created": True, "audit_id": audit_id}


def list_renewals() -> list[dict[str, Any]]:
    if not RENEWAL_OVERLAYS.exists():
        return []
    out: list[dict[str, Any]] = []
    for line in RENEWAL_OVERLAYS.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line:
            out.append(json.loads(line))
    return list(reversed(out))


def list_renewal_queue(role: str = "sales") -> dict[str, Any]:
    renewals = list_renewals()
    return {
        "role": broker_control.normalize_role(role),
        "manual_backed": True,
        "queue": renewals,
        "note": "Renovaciones usan el preview manual-backed y overlays de precio; excepciones se enrutan a humanos.",
    }


def broker_roles() -> list[dict[str, Any]]:
    return broker_control.roles()


def list_lead_cases(role: Optional[str] = None, status: Optional[str] = None, stage: Optional[str] = None) -> list[dict[str, Any]]:
    return broker_control.list_lead_cases(
        sessions=_load_chat_sessions(),
        role=role,
        status=status,
        stage=stage,
    )


def upsert_lead_case(body: dict[str, Any], role: str = "sales") -> dict[str, Any]:
    record = broker_control.upsert_lead_case(body, sessions=_load_chat_sessions(), role=role)
    _record_audit(role, "broker.case.upsert", {"case_id": record["case_id"], "stage": record["stage"], "owner_role": record["owner_role"]})
    return record


def list_followup_rules() -> list[dict[str, Any]]:
    return broker_control.list_followup_rules()


def upsert_followup_rule(body: dict[str, Any], role: str = "sales") -> dict[str, Any]:
    record = broker_control.upsert_followup_rule(body, role=role)
    _record_audit(role, "followup_rule.upsert", {"rule_id": record["rule_id"], "delay_minutes": record["delay_minutes"]})
    return record


def list_followups(role: Optional[str] = None, status: Optional[str] = None, due: Optional[str] = None) -> list[dict[str, Any]]:
    return broker_control.list_followups(role=role, status=status, due=due)


def create_followup(body: dict[str, Any], role: str = "sales") -> dict[str, Any]:
    record = broker_control.schedule_followup(body, role=role)
    _record_audit(role, "followup.create", {"followup_id": record["followup_id"], "target_id": record["target_id"], "due_at": record["due_at"]})
    return record


def update_followup(followup_id: str, body: dict[str, Any], role: str = "sales") -> dict[str, Any]:
    record = broker_control.update_followup(followup_id, body, role=role)
    _record_audit(role, "followup.update", {"followup_id": followup_id, "status": record["status"], "due_at": record["due_at"]})
    return record


def run_followup_scheduler(role: str = "system") -> dict[str, Any]:
    cases = list_lead_cases()
    tasks = list_human_tasks()
    renewals = list_renewals()
    result = broker_control.generate_followups(
        sessions=_load_chat_sessions(),
        tasks=tasks,
        cases=cases,
        renewals=renewals,
        role=role,
    )
    _record_audit(role, "followup.scheduler.run", {"created_count": result["created_count"]})
    return result


def role_queue(role: str) -> dict[str, Any]:
    return broker_control.role_queue(
        role,
        cases=list_lead_cases(),
        tasks=list_human_tasks(),
        followups=list_followups(),
        renewals=list_renewals(),
    )


def send_broker_message(body: dict[str, Any], role: str = "sales") -> dict[str, Any]:
    session_id = str(body.get("session_id") or body.get("conversation_id") or "").strip()
    text = str(body.get("text") or "").strip()
    if not session_id or not text:
        raise ValueError("session_id y text son requeridos para enviar mensaje broker")
    session = get_chat_session(session_id)
    sender = str(body.get("sender") or "assistant")
    session.setdefault("messages", []).append(_local_chat_message(sender, text, _now(), meta={"sent_by_role": role}))
    session["updated_at"] = _now()
    _persist_chat_session(session)
    voice = None
    if body.get("generate_voice") is True:
        voice = broker_control.create_voice_reply(
            {
                "conversation_id": session_id,
                "channel": session.get("channel"),
                "text": text,
                "generate_audio": True,
            },
            role=role,
        )
    action = broker_control.log_agent_action(
        {
            "conversation_id": session_id,
            "action": "send_broker_message",
            "tool_name": "riskiq_send_broker_message",
            "decision_right": "operational",
            "result": {"message_sender": sender, "voice_reply_id": (voice or {}).get("voice_reply_id")},
        },
        role=role,
    )
    _record_audit(role, "broker.message.send", {"session_id": session_id, "voice_reply_id": (voice or {}).get("voice_reply_id")})
    return {"session": session, "voice_reply": voice, "agent_action": action}


def attach_voice_note(body: dict[str, Any], role: str = "sales") -> dict[str, Any]:
    session_id = str(body.get("session_id") or body.get("conversation_id") or "").strip()
    attachment = body.get("attachment") or {}
    if not session_id or not attachment:
        raise ValueError("session_id y attachment son requeridos para nota de voz")
    session = get_chat_session(session_id)
    engine = str(body.get("engine") or session.get("engine") or "uw")
    normalized = {**attachment, "kind": "audio"}
    extraction = extract_facts({"engine": engine, "text": str(body.get("text") or ""), "attachments": [normalized]})
    items = ((extraction.get("attachments") or {}).get("items") or [])
    transcript = " ".join(str(item.get("extracted_text") or "") for item in items if item.get("kind") == "audio").strip()
    if transcript:
        session.setdefault("messages", []).append(_local_chat_message("cliente", transcript, _now(), meta={"source": "voice_note_transcript"}))
    session.setdefault("voice_notes", []).append(
        {
            "attachment_name": attachment.get("name"),
            "transcript": transcript,
            "extraction": extraction,
            "advisory_only": True,
            "created_at": _now(),
        }
    )
    session["pending_facts"] = {**(session.get("pending_facts") or {}), **{
        fact_id: item.get("value")
        for fact_id, item in (extraction.get("facts") or {}).items()
        if isinstance(item, dict) and "value" in item
    }}
    session["status"] = "needs_fact_confirmation"
    session["updated_at"] = _now()
    _persist_chat_session(session)
    _record_audit(role, "voice_note.attach", {"session_id": session_id, "transcript_present": bool(transcript)})
    return {"session": session, "extraction": extraction, "transcript": transcript, "advisory_only": True}


def create_voice_reply(body: dict[str, Any], role: str = "sales") -> dict[str, Any]:
    record = broker_control.create_voice_reply(body, role=role)
    _record_audit(role, "voice_reply.create", {"voice_reply_id": record["voice_reply_id"], "audio_status": record["audio_status"]})
    return record


def list_voice_replies(conversation_id: Optional[str] = None) -> list[dict[str, Any]]:
    return broker_control.list_voice_replies(conversation_id=conversation_id)


def list_agent_actions(conversation_id: Optional[str] = None) -> list[dict[str, Any]]:
    return broker_control.list_agent_actions(conversation_id=conversation_id)


def create_quote_draft(body: dict[str, Any], role: str = "sales") -> dict[str, Any]:
    session_id = str(body.get("session_id") or body.get("conversation_id") or "").strip()
    facts = _plain_facts(body.get("facts") or {})
    if session_id:
        session = get_chat_session(session_id)
        facts = {**(session.get("confirmed_facts") or {}), **facts}
    if not facts:
        raise ValueError("facts confirmados o session_id son requeridos para crear borrador de cotización")
    result = run_uw({"facts": facts, "facts_confirmed": True, "include_pricing": True}, role=role)
    pricing = result.get("pricing") or {}
    status = "approved_quote_options" if pricing.get("approved") else "requires_human_or_pricing_review"
    draft = {
        "quote_draft_id": f"QUOTE-{uuid.uuid4().hex[:10].upper()}",
        "session_id": session_id or None,
        "status": status,
        "facts": facts,
        "result_summary": _run_summary(result),
        "pricing": pricing,
        "human_packet": result.get("human_packet"),
        "created_by_role": role,
        "created_at": _now(),
        "guardrail": "La cotización solo presenta opciones aprobadas por el motor; excepciones van a humanos.",
    }
    _record_audit(role, "quote_draft.create", {"quote_draft_id": draft["quote_draft_id"], "status": status})
    return draft


def resume_run(body: dict[str, Any], role: str = "uw_user") -> dict[str, Any]:
    """Resume a stopped traversal by replaying from the beginning with one human answer.

    The engine is intentionally stateless. The packet carries the full facts and
    audit path that reached the question; the resume call merges a confirmed
    answer, then reruns the normal deterministic endpoint. This keeps resume
    semantics identical to production run semantics.
    """
    packet = body.get("packet") or {}
    answer = body.get("answer") or {}
    if not packet.get("resumable"):
        raise ValueError("este paquete no es reanudable; enrutar por gobernanza o revisión manual")
    engine = packet.get("engine")
    fact_id = packet.get("requested_fact")
    if not engine or not fact_id:
        raise ValueError("al paquete de reanudación le falta motor o hecho solicitado")
    if answer.get("fact_id") and answer["fact_id"] != fact_id:
        raise ValueError("answer.fact_id no coincide con packet.requested_fact")
    if "value" not in answer:
        raise ValueError("answer.value es requerido")
    facts = dict(packet.get("facts") or {})
    facts[fact_id] = answer["value"]
    payload = {"facts": facts, "facts_confirmed": True}
    if packet.get("start"):
        payload["start"] = packet["start"]
    if engine == "uw":
        return run_uw(payload, role=role)
    if engine == "coverage":
        return run_coverage(payload, role=role)
    raise ValueError("el motor del paquete de reanudación debe ser 'uw' o 'coverage'")


def extract_facts(body: dict[str, Any]) -> dict[str, Any]:
    engine = body.get("engine", "uw")
    defs = fact_definitions(engine)
    if engine == "uw":
        defs = {**defs, **UW_CHAT_EXTRA_FACTS}
    return extract_facts_advisory(
        str(body.get("text", "")),
        defs,
        attachments=body.get("attachments") or [],
    )


def _chat_extraction(engine: str, text: str, attachments: Optional[list[dict[str, Any]]] = None) -> tuple[dict[str, Any], dict[str, Any]]:
    extraction = extract_facts({"engine": engine, "text": text, "attachments": attachments or []})
    extracted_plain = {
        fact_id: item.get("value")
        for fact_id, item in (extraction.get("facts") or {}).items()
        if isinstance(item, dict) and "value" in item
    }
    return extraction, extracted_plain


def chat_intake(body: dict[str, Any], role: str = "chat_agent") -> dict[str, Any]:
    """Extract facts and run RiskIQ for the local chat when facts are confirmed."""
    engine = str(body.get("engine") or "uw")
    if engine not in {"uw", "coverage"}:
        raise ValueError("engine debe ser 'uw' o 'coverage'")
    text = str(body.get("text") or "")
    attachments = body.get("attachments") or []
    extraction, extracted_plain = _chat_extraction(engine, text, attachments)

    confirmed_facts = _plain_facts(body.get("confirmed_facts") or body.get("facts") or {})
    facts_confirmed = body.get("facts_confirmed") is True

    if not facts_confirmed:
        questions = extraction.get("clarifying_questions") or []
        return {
            "status": "needs_fact_confirmation",
            "engine": engine,
            "source_channel": body.get("source_channel") or "chat",
            "source_sender": body.get("source_sender"),
            "initial_slip": text,
            "extraction": extraction,
            "suggested_facts": extracted_plain,
            "reply_es": _confirmation_reply(extracted_plain, questions),
            "guardrail": "Los hechos extraidos por NL/multimodal no se ejecutan hasta que una persona los confirme.",
        }

    facts = {**extracted_plain, **confirmed_facts}
    payload: dict[str, Any] = {
        "facts": facts,
        "facts_confirmed": True,
        "source": "nl_extraction",
    }
    if body.get("start"):
        payload["start"] = body["start"]
    result = run_uw(payload, role=role) if engine == "uw" else run_coverage(payload, role=role)

    task = None
    packet = result.get("human_packet") or {}
    if packet and _should_create_human_task(packet) and body.get("create_human_task", True):
        task = create_human_task(
            {
                "packet": packet,
                "initial_slip": text,
                "attachments": attachments,
                "source_channel": body.get("source_channel") or "chat",
                "source_sender": body.get("source_sender"),
                "priority": body.get("priority"),
            },
            role=role,
        )

    return {
        "engine": engine,
        "source_channel": body.get("source_channel") or "chat",
        "source_sender": body.get("source_sender"),
        "extraction": extraction,
        "facts": facts,
        "result": result,
        "human_task": task,
        "client_followup": packet if packet and not _should_create_human_task(packet) else None,
        "status": "human_task_created" if task else ("needs_client_followup" if packet and not _should_create_human_task(packet) else "ran_tree"),
        "reply_es": _result_reply(result, task),
    }


def list_chat_sessions() -> list[dict[str, Any]]:
    sessions = list(_load_chat_sessions().values())
    summaries = [_local_chat_summary(session) for session in sessions]
    return sorted(summaries, key=lambda item: item.get("updated_at") or item.get("created_at") or "", reverse=True)


def get_chat_session(session_id: str) -> dict[str, Any]:
    session = _load_chat_sessions().get(session_id)
    if not session:
        raise ValueError("conversacion local no encontrada")
    return session


def chat_turn(body: dict[str, Any], role: str = "chat_agent") -> dict[str, Any]:
    """Simple local chat with persisted memory and automatic RiskIQ execution."""
    sessions = _load_chat_sessions()
    session_id = str(body.get("session_id") or "").strip() or f"LCHAT-{uuid.uuid4().hex[:10].upper()}"
    now = _now()
    requested_channel = str(body.get("source_channel") or body.get("channel") or "").strip()
    session = sessions.get(session_id) or {
        "session_id": session_id,
        "channel": requested_channel or "chat",
        "title": "Chat",
        "engine": str(body.get("engine") or "uw"),
        "status": "open",
        "created_at": now,
        "updated_at": now,
        "messages": [],
        "pending_facts": {},
        "confirmed_facts": {},
        "last_result_summary": None,
        "human_task": None,
        "last_intake": None,
        "last_extraction": None,
        "memory": {},
        "agent_mode": "chat",
        "guardrail": "El chat arma memoria del caso; RiskIQ decide con reglas fuente-backed.",
    }
    channel = requested_channel or str(session.get("channel") or "chat")
    session["channel"] = channel
    engine = str(body.get("engine") or session.get("engine") or "uw")
    if engine not in {"uw", "coverage"}:
        raise ValueError("engine debe ser 'uw' o 'coverage'")

    text = str(body.get("text") or "").strip()
    action = str(body.get("action") or "message")
    use_pending = action == "confirm_pending" or body.get("use_pending_facts") is True
    facts_confirmed = body.get("facts_confirmed") is True or use_pending
    requested_facts = _plain_facts(body.get("confirmed_facts") or body.get("facts") or {})
    prior_source_text = str(session.get("last_user_text") or session.get("initial_slip") or "")
    confirms_pending = (
        bool(text)
        and not use_pending
        and session.get("status") == "needs_fact_confirmation"
        and bool(session.get("pending_facts"))
        and _is_local_memory_confirmation(text)
    )
    if use_pending:
        requested_facts = {
            **_plain_facts(session.get("confirmed_facts") or {}),
            **_plain_facts(session.get("pending_facts") or {}),
            **requested_facts,
        }
    elif confirms_pending:
        requested_facts = {
            **_plain_facts(session.get("confirmed_facts") or {}),
            **_plain_facts(session.get("pending_facts") or {}),
            **requested_facts,
        }
        use_pending = True
        facts_confirmed = True
    source_text = (prior_source_text if confirms_pending else text) or prior_source_text

    if text:
        session["messages"].append(_local_chat_message("cliente", text, now))
        session.setdefault("initial_slip", text)
        session["last_user_text"] = prior_source_text if confirms_pending and prior_source_text else text
    elif use_pending:
        session["messages"].append(_local_chat_message("sistema", "Hechos sugeridos confirmados para ejecutar el motor.", now))
    else:
        raise ValueError("text es requerido para enviar un mensaje local")

    if text and not use_pending and session.get("status") == "needs_client_followup" and session.get("client_followup"):
        intake = _handle_local_client_followup_answer(
            session,
            text=text,
            attachments=body.get("attachments") or [],
            role=role,
            create_task=body.get("create_human_task", True),
        )
    else:
        agent_turn = _local_chat_agent_turn(
            engine=engine,
            session=session,
            text=source_text,
            attachments=body.get("attachments") or [],
            explicit_facts=requested_facts,
            use_pending=use_pending,
        )
        requested_facts = agent_turn["facts"]
        facts_confirmed = True if text and not use_pending and agent_turn["should_run_riskiq"] else facts_confirmed
        if text and not use_pending and not agent_turn["should_run_riskiq"]:
            intake = {
                "status": "gathering",
                "engine": engine,
                "source_channel": "chat",
                "source_sender": body.get("source_sender") or session_id,
                "extraction": agent_turn.get("extraction"),
                "facts": requested_facts,
                "result": {},
                "human_task": None,
                "client_followup": None,
                "reply_es": agent_turn["reply_es"],
            }
        else:
            intake = chat_intake(
                {
                    "engine": engine,
                    "text": source_text,
                    "attachments": body.get("attachments") or [],
                    "facts": requested_facts,
                    "facts_confirmed": facts_confirmed,
                    "source_channel": channel,
                    "source_sender": body.get("source_sender") or session_id,
                    "create_human_task": body.get("create_human_task", True),
                },
                role=role,
            )

    reply = intake.get("reply_es") or "Recibido."
    session["messages"].append(_local_chat_message("assistant", reply, _now(), meta={"status": intake.get("status")}))
    if intake.get("status") == "needs_fact_confirmation":
        session["status"] = "needs_fact_confirmation"
        session["pending_facts"] = intake.get("suggested_facts") or {}
        session["last_result_summary"] = None
        session["human_task"] = None
    elif intake.get("status") == "gathering":
        session["status"] = "open"
        session["pending_facts"] = {}
        session["confirmed_facts"] = intake.get("facts") or requested_facts
        session["last_result_summary"] = None
        session["human_task"] = None
        session["client_followup"] = None
        session["last_result"] = {}
    else:
        result = intake.get("result") or {}
        task = intake.get("human_task")
        client_followup = intake.get("client_followup")
        session["status"] = "human_task_created" if task else ("needs_client_followup" if client_followup else "ran_tree")
        session["pending_facts"] = {}
        session["confirmed_facts"] = intake.get("facts") or requested_facts
        session["last_result_summary"] = _run_summary(result)
        session["human_task"] = task
        session["client_followup"] = client_followup
        session["last_result"] = result
        if task:
            session["messages"].append(
                _local_chat_message(
                    "sistema",
                    f"Tarea humana creada: {task['task_id']} para {task['owner_role']}.",
                    _now(),
                    meta={"task_id": task["task_id"]},
                )
            )

    session["engine"] = engine
    session["last_extraction"] = intake.get("extraction")
    session["agent_mode"] = "chat"
    if session.get("title") == "Chat" and (text or source_text):
        session["title"] = _local_chat_title(text or source_text)
    session["last_intake"] = intake
    session["updated_at"] = _now()
    _refresh_local_chat_memory(session)
    _persist_chat_session(session)
    case = broker_control.upsert_lead_case({"session_id": session_id}, sessions={session_id: session}, role=role)
    existing_followups = broker_control.list_followups()
    if not any(
        item.get("target_type") == "case"
        and item.get("target_id") == case["case_id"]
        and item.get("status") in {"scheduled", "snoozed"}
        for item in existing_followups
    ):
        followup = broker_control.schedule_followup(
            {
                "target_type": "case",
                "target_id": case["case_id"],
                "role": case["owner_role"],
                "stage": case["stage"],
                "client_type": case["client_type"],
                "channel": case["channel"],
                "priority": case["priority"],
            },
            role=role,
        )
        session["next_followup"] = followup
        _persist_chat_session(session)
    broker_control.log_agent_action(
        {
            "conversation_id": session_id,
            "action": "chat_message",
            "tool_name": body.get("tool_name") or "chat",
            "decision_right": "operational",
            "result": {"status": session["status"], "case_id": case["case_id"]},
        },
        role=role,
    )
    audit_id = _record_audit(
        role,
        "chat.message",
        {
            "session_id": session_id,
            "status": session["status"],
            "engine": engine,
            "case_id": case["case_id"],
            "facts_confirmed": facts_confirmed,
            "pending_facts": sorted((session.get("pending_facts") or {}).keys()),
        },
    )
    return {"session": session, "case": case, "intake": intake, "audit_id": audit_id}
def _local_chat_agent_turn(
    *,
    engine: str,
    session: dict[str, Any],
    text: str,
    attachments: list[dict[str, Any]],
    explicit_facts: dict[str, Any],
    use_pending: bool,
) -> dict[str, Any]:
    extraction, extracted_plain = _chat_extraction(engine, text, attachments)
    facts = {
        **_plain_facts(session.get("confirmed_facts") or {}),
        **(_plain_facts(session.get("pending_facts") or {}) if use_pending else {}),
        **extracted_plain,
        **_plain_facts(explicit_facts or {}),
    }
    should_run = bool(facts) or _has_local_chat_insurance_intent(engine, text)
    return {
        "facts": facts,
        "extraction": extraction,
        "should_run_riskiq": should_run,
        "reply_es": _local_chat_gathering_reply(engine, text),
    }


def _has_local_chat_insurance_intent(engine: str, text: str) -> bool:
    normalized = _normalize_answer_text(text)
    if not normalized:
        return False
    if engine == "coverage":
        return bool(
            re.search(
                r"\b(siniestro|accidente|choque|colision|robo|hurto|cobertura|denuncia|reclamo|danos?)\b",
                normalized,
            )
        )
    return bool(
        re.search(
            r"\b(cotiz|cotizacion|asegur|seguro|poliza|renov|automotor|vehiculo|auto|moto|camion|broker|corredor|cliente)\b",
            normalized,
        )
    )


def _local_chat_gathering_reply(engine: str, text: str) -> str:
    if engine == "coverage":
        return "Claro. Cuéntame qué pasó, qué cobertura quieres revisar y cualquier dato del aviso o denuncia que tengas."
    if _normalize_answer_text(text) in {"hola", "buenas", "buenos dias", "buenas tardes", "buenas noches"}:
        return "Hola. Puedo ayudarte a armar una cotización de automotores; dime el cliente, canal, producto y vehículo cuando los tengas."
    return "Te sigo. Para avanzar necesito que me cuentes si es cotización, renovación o revisión de un caso, y los datos que tengas del cliente y vehículo."


def _is_local_memory_confirmation(text: str) -> bool:
    normalized = _normalize_answer_text(text)
    if not normalized:
        return False
    exact = {
        "si",
        "s",
        "ok",
        "okay",
        "correcto",
        "correcta",
        "confirmo",
        "confirmado",
        "confirmada",
        "estan bien",
        "esta bien",
        "todo bien",
        "son correctos",
        "son correctas",
        "datos correctos",
        "datos correctas",
        "asi es",
        "dale",
        "de acuerdo",
    }
    if normalized in exact:
        return True
    return bool(re.search(r"\b(estan|esta|son)\s+bien\b|\b(correct[oa]s?|confirmad[oa]s?)\b", normalized))


def _refresh_local_chat_memory(session: dict[str, Any]) -> None:
    messages = session.get("messages") or []
    last_customer = next(
        (
            message
            for message in reversed(messages)
            if message.get("sender") in {"cliente", "broker", "usuario"}
        ),
        {},
    )
    followup = session.get("client_followup") or {}
    task = session.get("human_task") or {}
    summary = session.get("last_result_summary") or {}
    current_question = (
        followup.get("client_question")
        or followup.get("question")
        or task.get("question")
        or None
    )
    session["memory"] = {
        "case_title": session.get("title") or "Chat local",
        "conversation_state": session.get("status") or "open",
        "known_facts": _plain_facts(session.get("confirmed_facts") or {}),
        "pending_facts": _plain_facts(session.get("pending_facts") or {}),
        "current_question": current_question,
        "requested_fact": followup.get("requested_fact") or summary.get("requested_fact") or task.get("requested_fact"),
        "last_customer_message": last_customer.get("text"),
        "last_result_summary": summary,
        "updated_at": session.get("updated_at") or _now(),
    }


def create_human_task(body: dict[str, Any], role: str = "chat_agent") -> dict[str, Any]:
    packet = body.get("packet") or body.get("human_packet") or {}
    if not packet:
        raise ValueError("packet es requerido para crear una tarea humana")
    if not _should_create_human_task(packet) and body.get("force_human_task") is not True:
        raise ValueError("este paquete debe resolverse preguntando al cliente/broker, no creando tarea humana")
    task = _human_task_record(body, packet=packet, role=role)
    _persist_human_task(task)
    existing_followups = broker_control.list_followups()
    if not any(
        item.get("target_type") == "human_task"
        and item.get("target_id") == task["task_id"]
        and item.get("status") in {"scheduled", "snoozed"}
        for item in existing_followups
    ):
        task["next_followup"] = broker_control.schedule_followup(
            {
                "target_type": "human_task",
                "target_id": task["task_id"],
                "role": task["owner_role"],
                "stage": task["task_type"],
                "priority": task["priority"],
                "message": f"Responder paquete humano {task['task_id']} para reanudar el árbol.",
            },
            role=role,
        )
        _persist_human_task(task)
    audit_id = _record_audit(
        role,
        "human_task.create",
        {
            "task_id": task["task_id"],
            "engine": task["engine"],
            "task_type": task["task_type"],
            "requested_fact": task.get("requested_fact"),
        },
    )
    return {**task, "audit_id": audit_id}


def _handle_local_client_followup_answer(
    session: dict[str, Any],
    *,
    text: str,
    attachments: Optional[list[dict[str, Any]]] = None,
    role: str,
    create_task: bool,
) -> dict[str, Any]:
    packet = session.get("client_followup") or {}
    engine = str(session.get("engine") or packet.get("engine") or "uw")
    extraction, extracted_plain = _chat_extraction(engine, text, attachments or [])
    base_facts = {
        **_plain_facts(packet.get("facts") or session.get("confirmed_facts") or {}),
        **extracted_plain,
    }
    parsed = _parse_client_followup_answer(packet, text)
    requested_fact = packet.get("requested_fact")
    if not parsed.get("ok") and requested_fact in extracted_plain:
        parsed = {"ok": True, "fact_id": requested_fact, "value": extracted_plain[requested_fact]}
    if not parsed.get("ok"):
        updated_packet = {**packet, "facts": base_facts}
        question = packet.get("client_question") or packet.get("question") or parsed.get("reply_es")
        if _is_local_memory_confirmation(text):
            clean_question = re.sub(r"^(?:Para seguir|Antes de darte un resultado), necesito un dato:\s*", "", str(question or "")).strip()
            reply_es = f"Perfecto, mantengo el paquete como está. Para seguir necesito este dato específico: {clean_question or question}"
        else:
            reply_es = parsed.get("reply_es") or question
        return {
            "status": "needs_client_followup",
            "engine": engine,
            "source_channel": session.get("channel") or "chat",
            "source_sender": session.get("source_sender") or session.get("session_id"),
            "extraction": extraction,
            "facts": base_facts,
            "result": session.get("last_result") or {},
            "human_task": None,
            "client_followup": updated_packet,
            "reply_es": reply_es,
        }

    answer = {"fact_id": parsed["fact_id"], "value": parsed["value"]}
    merged_facts = {**base_facts, parsed["fact_id"]: parsed["value"]}
    resume_packet = {**packet, "facts": merged_facts}
    result = resume_run({"packet": resume_packet, "answer": answer}, role=role)
    next_packet = result.get("human_packet") or {}
    task = None
    if next_packet and _should_create_human_task(next_packet) and create_task:
        task = create_human_task(
            {
                "packet": next_packet,
                "initial_slip": session.get("initial_slip") or "",
                "source_channel": session.get("channel") or "chat",
                "source_sender": session.get("source_sender") or session.get("session_id"),
                "conversation_id": session.get("session_id"),
                "confirmed_facts": merged_facts,
            },
            role=role,
        )
    status = "human_task_created" if task else (
        "needs_client_followup" if next_packet and not _should_create_human_task(next_packet) else "ran_tree"
    )
    reply = _result_reply(result, task)
    label = _fact_label(engine, parsed["fact_id"])
    value_label = _format_chat_value(parsed["value"])
    return {
        "status": status,
        "engine": engine,
        "source_channel": session.get("channel") or "chat",
        "source_sender": session.get("source_sender") or session.get("session_id"),
        "extraction": extraction,
        "facts": merged_facts,
        "result": result,
        "human_task": task,
        "client_followup": next_packet if next_packet and not _should_create_human_task(next_packet) else None,
        "reply_es": f"Perfecto, tomo {label} como {value_label}. {reply}",
    }


def list_human_tasks(status: Optional[str] = None) -> list[dict[str, Any]]:
    tasks = list(_load_human_tasks().values())
    if status:
        tasks = [task for task in tasks if task.get("status") == status]
    return sorted(tasks, key=lambda item: item.get("updated_at") or item.get("created_at") or "", reverse=True)


def get_human_task(task_id: str) -> dict[str, Any]:
    task = _load_human_tasks().get(task_id)
    if not task:
        raise ValueError("tarea humana no encontrada")
    return task


def complete_human_task(task_id: str, body: dict[str, Any], role: str = "uw_user") -> dict[str, Any]:
    task = get_human_task(task_id)
    if task.get("status") not in {"needs_human_input", "resumed_needs_more_input"}:
        raise ValueError("la tarea humana ya fue cerrada")
    answer = body.get("answer") or {}
    result = None
    next_task = None
    next_client_followup = None
    status = str(body.get("status") or "completed")
    if task.get("resumable"):
        if not answer:
            raise ValueError("answer es requerido para completar una tarea reanudable")
        result = resume_run({"packet": task["packet"], "answer": answer}, role=role)
        next_packet = result.get("human_packet") or {}
        if next_packet and not _should_create_human_task(next_packet):
            next_client_followup = next_packet
        if next_packet and _should_create_human_task(next_packet) and body.get("create_next_task", True):
            next_task = create_human_task(
                {
                    "packet": next_packet,
                    "initial_slip": task.get("initial_slip"),
                    "attachments": task.get("attachments") or [],
                    "source_channel": task.get("source_channel"),
                    "source_sender": task.get("source_sender"),
                    "priority": task.get("priority"),
                },
                role=role,
            )
            status = "resumed_needs_more_input"
        elif next_client_followup:
            status = "completed_needs_client_followup"

    now = _now()
    updated = {
        **task,
        "status": status,
        "answer": answer,
        "human_notes": str(body.get("human_notes") or "").strip(),
        "completed_by_role": role,
        "completed_at": now,
        "updated_at": now,
        "resume_result": result,
        "resume_summary": _run_summary(result) if result else None,
        "next_task_id": next_task.get("task_id") if next_task else None,
        "next_client_followup": next_client_followup,
    }
    _persist_human_task(updated)
    audit_id = _record_audit(
        role,
        "human_task.complete",
        {"task_id": task_id, "status": status, "next_task_id": updated.get("next_task_id")},
    )
    return {
        "task": updated,
        "resume_result": result,
        "next_task": next_task,
        "next_client_followup": updated.get("next_client_followup"),
        "audit_id": audit_id,
    }


UW_CHAT_EXTRA_FACTS = {
    "make": {"type": "string", "prompt": "Marca del vehículo"},
    "model": {"type": "string", "prompt": "Modelo del vehículo"},
    "year": {"type": "number", "prompt": "Año modelo"},
    "city": {"type": "enum", "prompt": "Ciudad donde circulará", "values": ["La Paz", "El Alto", "Santa Cruz", "Cochabamba", "Sucre", "Tarija", "Oruro", "Potosi", "Beni", "Pando"]},
    "siniestralidad_historica": {"type": "number", "prompt": "Siniestralidad histórica (%)"},
}

FRIENDLY_FACT_LABELS = {
    "product": "producto",
    "channel": "canal",
    "client_type": "tipo de cliente",
    "requests_standard_deviation": "desviaciones a condiciones estándar",
    "is_public_tender": "licitación",
    "is_mass_grouping": "agrupación masiva",
    "vehicle_class": "clase de vehículo",
    "segment": "segmento",
    "valor_asegurado": "valor asegurado",
    "cilindrada_cc": "cilindrada",
    "city": "plaza",
    "make": "marca",
    "model": "modelo",
    "model_year": "año modelo",
    "siniestralidad_historica": "siniestralidad histórica",
}


def _mock_complete_uw_facts() -> dict[str, Any]:
    return {
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


def _mock_complete_coverage_facts() -> dict[str, Any]:
    return {
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


def _run_summary(result: Optional[dict[str, Any]]) -> Optional[dict[str, Any]]:
    if not result:
        return None
    packet = result.get("human_packet") or {}
    pricing = result.get("pricing") or {}
    escalation = result.get("escalation") or {}
    return {
        "engine": result.get("engine"),
        "kind": result.get("kind"),
        "outcome": result.get("outcome"),
        "terminal_node": result.get("terminal_node"),
        "audit_steps": len(result.get("audit") or []),
        "requested_fact": packet.get("requested_fact") or escalation.get("blocking_fact"),
        "packet_resumable": packet.get("resumable"),
        "resolution_channel": packet.get("resolution_channel"),
        "pricing_status": pricing.get("status"),
        "review_reasons": pricing.get("review_reasons") or [],
        "ledger_ref": escalation.get("ledger_ref"),
    }


def _mock_task(kind: str, title: str, summary: str, result: dict[str, Any]) -> dict[str, Any]:
    return {
        "task_id": f"MOCK-{uuid.uuid4().hex[:8].upper()}",
        "kind": kind,
        "title": title,
        "status": "needs_human_input",
        "summary": summary,
        "route": {
            "outcome": result.get("outcome"),
            "terminal_node": result.get("terminal_node"),
            "audit_steps": len(result.get("audit") or []),
        },
        "context": {
            "pricing": result.get("pricing"),
            "escalation": result.get("escalation"),
            "caveats": result.get("caveats", []),
        },
    }


def _msg(sender: str, text: str) -> dict[str, str]:
    return {"sender": sender, "text": text}


def list_versions() -> list[dict[str, Any]]:
    return graph_versions()


def list_engines() -> list[dict[str, Any]]:
    return engines()


def list_ledger() -> list[dict[str, Any]]:
    return ledger_entries()


def ledger_detail(entry_id: str) -> dict[str, Any]:
    return ledger_entry(entry_id)


def graph(engine: str) -> dict[str, Any]:
    return graph_nodes(engine)


def flags(engine: str = "all") -> dict[str, Any]:
    return issue_flags(engine)


PROPOSAL_PIPELINE = [
    {"step": "draft", "label": "Borrador creado", "done": True},
    {"step": "ledger", "label": "Entrada de registro (OVL-*/RUL-*) preparada", "done": True},
    {"step": "regenerate", "label": "Regenerar artefactos del grafo", "done": False},
    {"step": "validate", "label": "Validador VERDE", "done": False},
    {"step": "approvals", "label": "Aprobación suscripción / actuarial / legal / publicación", "done": False},
    {"step": "publish", "label": "Publicar nueva versión del grafo", "done": False},
]


def draft_proposal(body: dict[str, Any], role: str) -> dict[str, Any]:
    """Stage a governed correction as a DRAFT ledger entry.

    This never touches crawlable/graph* or representation/. It records the
    operator's intent, runs the same publish guard so the UI can show exactly
    what is still required, and persists the draft for the proposal list.
    """
    kind = str(body.get("kind", "RUL")).upper()
    prefix = "OVL" if kind == "OVL" else "RUL"
    draft_id = f"{prefix}-DRAFT-{uuid.uuid4().hex[:8].upper()}"
    draft = {
        "draft_id": draft_id,
        "kind": prefix,
        "title": str(body.get("title", "")).strip(),
        "target": str(body.get("target", "")).strip(),
        "engine": body.get("engine", "uw"),
        "rationale": str(body.get("rationale", "")).strip(),
        "proposed_change": str(body.get("proposed_change", "")).strip(),
        "patch_type": str(body.get("patch_type", "freeform")).strip() or "freeform",
        "structured_patch": body.get("structured_patch"),
        "source_quote": str(body.get("source_quote", "")).strip(),
        "status": "draft",
        "author_role": role,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    # Same guard used for real publishing — drafts are never validator-GREEN yet.
    allowed, reason = can_publish(role, {}, validator_ok=False)
    _persist_draft(draft)
    audit_id = _record_audit(role, "proposal.draft", {"draft_id": draft_id, "target": draft["target"]})
    return {
        "draft": draft,
        "publish_allowed": allowed,
        "publish_blocked_reason": reason,
        "pipeline": PROPOSAL_PIPELINE,
        "audit_id": audit_id,
    }


def list_drafts() -> list[dict[str, Any]]:
    if not PROPOSAL_DRAFTS.exists():
        return []
    out: list[dict[str, Any]] = []
    for line in PROPOSAL_DRAFTS.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line:
            out.append(json.loads(line))
    return list(reversed(out))


def _persist_draft(draft: dict[str, Any]) -> None:
    if os.environ.get("INSURANCE_PLATFORM_DISABLE_AUDIT_FILE") == "1":
        return
    PROPOSAL_DRAFTS.parent.mkdir(parents=True, exist_ok=True)
    with PROPOSAL_DRAFTS.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(draft, ensure_ascii=False) + "\n")


def _persist_renewal(renewal: dict[str, Any]) -> None:
    if os.environ.get("INSURANCE_PLATFORM_DISABLE_AUDIT_FILE") == "1":
        return
    RENEWAL_OVERLAYS.parent.mkdir(parents=True, exist_ok=True)
    with RENEWAL_OVERLAYS.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(renewal, ensure_ascii=False) + "\n")


def list_facts(engine: str) -> dict[str, Any]:
    return fact_definitions(engine)


def data_discovery() -> dict[str, Any]:
    discovered = discover_available_data()
    mock_status = simulation.mock_database_summary()
    verdict = dict(discovered.get("downstream_verdict") or {})
    verdict.update(
        {
            "simulation": "buildable_now_with_mock_data",
            "claims_feedback": "buildable_now_with_mock_data",
            "friction": "buildable_now_with_mock_data",
            "ai_analyst": "buildable_now_with_mock_data",
            "portfolio_intelligence": "buildable_now_with_mock_data",
        }
    )
    return {
        **discovered,
        "mock_database": mock_status,
        "has_submission_fact_vector": discovered.get("has_submission_fact_vector") or mock_status["has_submission_fact_vector"],
        "has_claim_coverage_linkage": discovered.get("has_claim_coverage_linkage") or mock_status["has_claim_coverage_linkage"],
        "downstream_verdict": verdict,
        "note": (
            discovered.get("note", "")
            + " Mock database enabled for concept validation; production dashboards must still connect real portfolio data."
        ).strip(),
    }


def simulation_mock_database() -> dict[str, Any]:
    return simulation.mock_database_summary()


def simulation_filters() -> dict[str, Any]:
    return simulation.filter_options()


def simulation_candidates() -> list[dict[str, Any]]:
    return simulation.list_candidates()


def run_simulation(body: dict[str, Any]) -> dict[str, Any]:
    result = simulation.run_simulation(body)
    _record_audit(
        "simulation_user",
        "simulation.mock.run",
        {
            "simulation_run_id": result["simulation_run_id"],
            "selected_count": result["selection"]["selected_count"],
            "candidate_id": result["candidate"]["candidate_id"],
        },
    )
    return result


def supervision_dashboard(body: Optional[dict[str, Any]] = None) -> dict[str, Any]:
    result = simulation.supervision_dashboard(body)
    _record_audit(
        "supervision_user",
        "supervision.mock.view",
        {
            "active_clients": result["summary"].get("active_clients"),
            "risk_score": result["summary"].get("risk_score"),
        },
    )
    return result


def publish_proposal(body: dict[str, Any], role: str) -> dict[str, Any]:
    validator_ok = bool(body.get("validator_ok"))
    allowed, reason = can_publish(role, body.get("proposal", {}), validator_ok)
    audit_id = _record_audit(role, "proposal.publish.attempt", {"allowed": allowed, "reason": reason})
    return {"allowed": allowed, "reason": reason, "audit_id": audit_id}


def _with_human_packet(
    result: dict[str, Any],
    *,
    facts: dict[str, Any],
    engine: str,
    start: Optional[str],
) -> dict[str, Any]:
    packet = _build_human_packet(result, facts=facts, engine=engine, start=start)
    return {**result, "human_packet": packet} if packet else result


def _build_human_packet(
    result: dict[str, Any],
    *,
    facts: dict[str, Any],
    engine: str,
    start: Optional[str],
) -> Optional[dict[str, Any]]:
    escalation = result.get("escalation") or {}
    pricing = result.get("pricing") or {}
    if engine == "uw" and not escalation and pricing.get("status") == "requires_pricing_review":
        return {
            "packet_id": str(uuid.uuid4()),
            "engine": engine,
            "start": start,
            "status": "needs_human_input",
            "task_type": "pricing_review",
            "resolution_channel": "human_task",
            "client_answerable": False,
            "needs_human_task": True,
            "resolution_reason": "Pricing requiere revisión profesional.",
            "resumable": False,
            "resume_endpoint": None,
            "requested_fact": None,
            "question": "Pricing debe revisar la prima sugerida antes de convertirla en precio final.",
            "current_node": {
                "id": pricing.get("rating_node") or "rating.lbc_auto.final_prices",
                "title": "Revisión de precio",
            },
            "answer_schema": {
                "type": "object",
                "required_fields": ["pricing_decision", "approved_price_bob", "human_notes"],
                "allowed_values": {"pricing_decision": ["approved", "adjusted", "rejected"]},
            },
            "facts": facts,
            "path": result.get("audit", []),
            "context": {
                "reason": "requires_pricing_review",
                "message": pricing.get("blocked_reason") or "Precio calculado, pero requiere revisión de tarificación.",
                "source_quote": None,
                "fact_source_quote": None,
                "ledger_ref": None,
                "pricing": pricing,
                "caveats": result.get("caveats", []),
            },
            "non_resumable_reason": (
                "La revisión de pricing no cambia la lógica de suscripción. La aprobación o ajuste "
                "de precio debe registrarse como decisión humana/gobernada."
            ),
        }
    if engine == "uw" and not escalation and pricing.get("status") == "missing_rating_input":
        missing_pricing = _missing_pricing_fact(facts)
        if missing_pricing:
            fact_id, fact_spec = missing_pricing
            question = fact_spec.get("prompt") or "Dato de tarificación requerido"
            return {
                "packet_id": str(uuid.uuid4()),
                "engine": engine,
                "start": start,
                "status": "needs_human_input",
                "task_type": "missing_pricing_input",
                "resolution_channel": "client_followup",
                "client_answerable": True,
                "needs_human_task": False,
                "resolution_reason": "El caso ya pasó suscripción; falta un dato cliente-answerable para calcular precio.",
                "resumable": True,
                "resume_endpoint": f"/api/{engine}/resume",
                "requested_fact": fact_id,
                "question": question,
                "client_question": _client_followup_question(question, fact_spec, "ask"),
                "current_node": {
                    "id": pricing.get("rating_node") or "rating.lbc_auto.final_prices",
                    "title": "Dato faltante para precio",
                },
                "answer_schema": _answer_schema(fact_id, fact_spec),
                "facts": facts,
                "path": result.get("audit", []),
                "context": {
                    "reason": "missing_rating_input",
                    "message": pricing.get("blocked_reason") or "Falta un dato para calcular el precio final.",
                    "source_quote": None,
                    "fact_source_quote": None,
                    "ledger_ref": None,
                    "pricing": pricing,
                    "caveats": result.get("caveats", []),
                },
                "non_resumable_reason": None,
            }
    if not escalation:
        return None

    fact_id = escalation.get("blocking_fact")
    fact_spec = fact_definitions(engine).get(fact_id, {}) if fact_id else {}
    is_missing = bool(fact_id)
    on_missing = escalation.get("on_missing") or (
        str(escalation.get("reason", "")).split(":", 1)[1]
        if str(escalation.get("reason", "")).startswith("missing_fact:")
        else None
    )
    resumable = is_missing and on_missing in {"ask", "refer", "block", None}
    task_type = "missing_document" if result.get("outcome") == "missing_document" else (
        "missing_fact" if is_missing else "governance_or_manual_review"
    )
    question = escalation.get("fact_prompt") or escalation.get("message") or "Revisión humana requerida"
    if on_missing == "refer":
        question = f"{question} (requiere validación humana)"
    if on_missing == "block":
        question = f"{question} (requerido antes de cualquier respuesta final)"
    resolution = _missing_fact_resolution(
        fact_id=fact_id,
        fact_spec=fact_spec,
        on_missing=on_missing,
        task_type=task_type,
        engine=engine,
    )

    return {
        "packet_id": str(uuid.uuid4()),
        "engine": engine,
        "start": start,
        "status": "needs_human_input",
        "task_type": task_type,
        "resolution_channel": resolution["channel"],
        "client_answerable": resolution["client_answerable"],
        "needs_human_task": resolution["needs_human_task"],
        "resolution_reason": resolution["reason"],
        "resumable": resumable,
        "resume_endpoint": f"/api/{engine}/resume" if resumable else None,
        "requested_fact": fact_id,
        "question": question,
        "client_question": _client_followup_question(question, fact_spec, on_missing) if resolution["client_answerable"] else None,
        "current_node": {
            "id": escalation.get("at_node"),
            "title": escalation.get("node_title"),
        },
        "answer_schema": _answer_schema(fact_id, fact_spec) if fact_id else None,
        "facts": facts,
        "path": result.get("audit", []),
        "context": {
            "reason": escalation.get("reason"),
            "message": escalation.get("message"),
            "source_quote": escalation.get("source_quote") or escalation.get("fact_source_quote"),
            "fact_source_quote": escalation.get("fact_source_quote"),
            "ledger_ref": escalation.get("ledger_ref"),
            "caveats": result.get("caveats", []),
        },
        "non_resumable_reason": None
        if resumable
        else "Esta detención es un conflicto de fuente/prelación u otro evento de revisión manual. La decisión humana debe prepararse como dictamen RUL/OVL y regenerarse; no debe escribirse como respuesta ad hoc.",
    }


def _missing_fact_resolution(
    *,
    fact_id: Optional[str],
    fact_spec: dict[str, Any],
    on_missing: Optional[str],
    task_type: str,
    engine: str,
) -> dict[str, Any]:
    if not fact_id:
        return {
            "channel": "human_task",
            "client_answerable": False,
            "needs_human_task": True,
            "reason": "Detención sin hecho puntual; requiere revisión profesional.",
        }
    if on_missing == "refer" or fact_spec.get("derived") is True or fact_spec.get("source") == "derived":
        return {
            "channel": "human_task",
            "client_answerable": False,
            "needs_human_task": True,
            "reason": "El dato faltante requiere validación profesional o derivada.",
        }
    if task_type in {"governance_or_manual_review", "pricing_review"}:
        return {
            "channel": "human_task",
            "client_answerable": False,
            "needs_human_task": True,
            "reason": "La detención corresponde a dictamen, gobernanza o pricing.",
        }
    if on_missing in {"ask", "block", None}:
        return {
            "channel": "client_followup",
            "client_answerable": True,
            "needs_human_task": False,
            "reason": "El dato puede pedirse al cliente/broker y luego confirmarse antes de reejecutar.",
        }
    return {
        "channel": "human_task",
        "client_answerable": False,
        "needs_human_task": True,
        "reason": f"on_missing={on_missing} no está marcado como dato cliente-answerable.",
    }


def _missing_pricing_fact(facts: dict[str, Any]) -> Optional[tuple[str, dict[str, Any]]]:
    pricing_specs = {
        "valor_asegurado": {
            "type": "number",
            "prompt": "Valor asegurado/comercial del vehículo (BOB)",
            "unit": "BOB",
            "values": None,
            "aliases": ["valor_asegurado", "valor_comercial", "car_value", "insured_value", "vehicle_value"],
        },
        "model_year": {
            "type": "number",
            "prompt": "Año modelo del vehículo",
            "aliases": ["model_year", "year", "anio", "ano"],
        },
        "make": {
            "type": "string",
            "prompt": "Marca del vehículo",
            "aliases": ["make", "marca", "vehicle_brand", "brand"],
        },
        "model": {
            "type": "string",
            "prompt": "Modelo del vehículo",
            "aliases": ["model", "modelo"],
        },
        "city": {
            "type": "enum",
            "prompt": "Ciudad o plaza de circulación",
            "values": ["La Paz", "Santa Cruz", "Cochabamba", "Oruro", "Potosi", "Tarija", "Sucre", "Trinidad"],
            "aliases": ["city", "plaza", "driving_city", "driving_plaza", "ciudad", "plaza_auto", "city_id", "plaza_id"],
        },
    }
    plain = _plain_facts(facts)
    for fact_id, spec in pricing_specs.items():
        if not any(_has_chat_value(plain.get(alias)) for alias in spec["aliases"]):
            cleaned = {k: v for k, v in spec.items() if k != "aliases"}
            cleaned["on_missing"] = "ask"
            return fact_id, cleaned
    return None


def _has_chat_value(value: Any) -> bool:
    return value is not None and value != "" and value != []


def _should_create_human_task(packet: dict[str, Any]) -> bool:
    return packet.get("needs_human_task") is not False and packet.get("resolution_channel") != "client_followup"


def _client_followup_question(question: str, spec: dict[str, Any], on_missing: Optional[str]) -> str:
    prefix = "Para seguir, necesito un dato:"
    if on_missing == "block":
        prefix = "Antes de darte un resultado, necesito un dato:"
    field_type = spec.get("type", "string")
    clean_question = str(question or spec.get("prompt") or "el dato pendiente").strip()
    if field_type == "boolean":
        return f"{prefix} {clean_question} Puedes responder simplemente \"sí\" o \"no\"."
    if field_type == "number":
        unit = f" en {spec.get('unit')}" if spec.get("unit") else ""
        return f"{prefix} {clean_question} Puedes responder solo el número{unit}."
    values = spec.get("values") or spec.get("allowed_values")
    if values:
        shown = ", ".join(map(str, values[:10]))
        more = "..." if len(values) > 10 else ""
        return f"{prefix} {clean_question} Puedes responder con una opción, por ejemplo: {shown}{more}."
    return f"{prefix} {clean_question} Puedes responder con el dato tal como lo tengas."


def _parse_client_followup_answer(packet: dict[str, Any], text: str) -> dict[str, Any]:
    fact_id = packet.get("requested_fact")
    schema = packet.get("answer_schema") or {}
    if not fact_id:
        return {"ok": False, "reply_es": "Necesito revisar este punto con el equipo antes de continuar."}
    value_text = str(text or "").strip()
    if not value_text:
        return {"ok": False, "reply_es": packet.get("client_question") or packet.get("question") or "Necesito ese dato para continuar."}
    field_type = schema.get("type", "string")
    normalized = _normalize_answer_text(value_text)
    if field_type == "boolean":
        parsed = _parse_bool_answer(normalized)
        if parsed is None:
            parsed = _parse_contextual_bool_answer(fact_id, normalized)
        if parsed is None:
            return {
                "ok": False,
                "reply_es": f"No me quedó claro. {packet.get('client_question') or packet.get('question')} Puedes responder solo \"sí\" o \"no\".",
            }
        return {"ok": True, "fact_id": fact_id, "value": parsed}
    if field_type == "number":
        parsed_number = _parse_number_answer(value_text)
        if parsed_number is None:
            return {
                "ok": False,
                "reply_es": f"No pude leer el número. {packet.get('client_question') or packet.get('question')}",
            }
        return {"ok": True, "fact_id": fact_id, "value": parsed_number}
    allowed = schema.get("allowed_values") or []
    if allowed:
        matched = _match_allowed_value(normalized, allowed)
        if matched is None:
            shown = ", ".join(map(str, allowed[:10]))
            more = "..." if len(allowed) > 10 else ""
            return {
                "ok": False,
                "reply_es": f"No encontré esa opción. Puedes responder con una de estas: {shown}{more}.",
            }
        return {"ok": True, "fact_id": fact_id, "value": matched}
    if field_type == "array":
        values = [item.strip() for item in value_text.split(",") if item.strip()]
        return {"ok": True, "fact_id": fact_id, "value": values}
    return {"ok": True, "fact_id": fact_id, "value": value_text}


def _normalize_answer_text(text: str) -> str:
    decomposed = unicodedata.normalize("NFKD", str(text or "").lower())
    no_accents = "".join(ch for ch in decomposed if not unicodedata.combining(ch))
    cleaned = []
    for ch in no_accents:
        cleaned.append(ch if ch.isalnum() else " ")
    return " ".join("".join(cleaned).split())


def _format_chat_value(value: Any) -> str:
    if value is True:
        return "sí"
    if value is False:
        return "no"
    if value is None:
        return "sin dato"
    if isinstance(value, list):
        return ", ".join(map(str, value)) if value else "ninguno"
    return str(value)


def _parse_bool_answer(normalized: str) -> Optional[bool]:
    if not normalized:
        return None
    negative_phrases = {"no", "n", "false", "falso", "0", "negativo", "no tiene", "no aplica", "ninguno", "sin"}
    positive_phrases = {"si", "s", "yes", "y", "true", "verdadero", "1", "afirmativo", "correcto", "tiene", "aplica", "cuenta con"}
    if normalized in negative_phrases:
        return False
    if normalized in positive_phrases:
        return True
    return None


def _parse_contextual_bool_answer(fact_id: str, normalized: str) -> Optional[bool]:
    if not normalized:
        return None
    negative_cues = ("sin ", "no ", "ningun", "ninguna", "tampoco", "excluid", "no estaba", "no esta")
    positive_cues = ("si ", "sí ", "hubo", "tiene", "cuenta con", "esta", "estaba", "incluye", "incluida", "incluido", "realiz", "present")
    fact_words = {
        "coverage_included": ("inclu", "cobertura", "ampar", "particulares", "poliza"),
        "police_report_within_6h": ("denuncia", "policial", "autoridad"),
        "alcohol_test_within_6h": ("dosaje", "alcohol", "alcoholemia", "etilic"),
        "driver_alcohol_over_limit": ("alcohol", "grado", "limite", "ebrio", "dosaje", "alcoholemia"),
        "driver_under_drugs_or_impairing_medication": ("droga", "alucinogeno", "estupefaciente", "medicacion", "medicamento"),
        "intentional_act": ("intencional", "provocado", "a proposito", "doloso"),
        "confiscation_or_authority_measure": ("confiscacion", "requisa", "expropiacion", "incautacion", "decomiso", "embargo", "secuestro", "autoridad"),
        "has_plates": ("placa", "ruat"),
        "is_public_tender": ("licitacion", "licitaci", "sector publico"),
        "is_mass_grouping": ("masiva", "concesionario", "banco", "entidad financiera", "wholesale"),
        "is_rental": ("alquiler", "rent a car", "rentacar"),
        "circula_fuera_pais_actividad_regular": ("fuera del pais", "extraterritorial", "sale del pais", "salir del pais"),
        "foreign_territory": ("fuera del pais", "territorio extranjero", "extranjero", "extraterritorial"),
        "parts_verified_and_valued": ("verific", "valoriz", "declaracion pre riesgo"),
        "parts_permanently_attached_or_declared": ("adherid", "fijad", "declarad", "permanente"),
        "repair_started_without_authorization": ("reparacion", "reparar", "autorizacion"),
        "technical_report_available": ("informe tecnico", "reporte tecnico"),
    }.get(fact_id, ())
    if not fact_words or not any(word in normalized for word in fact_words):
        return None
    if any(cue in f" {normalized} " for cue in negative_cues):
        return False
    if any(cue in f" {normalized} " for cue in positive_cues):
        return True
    return None


def _parse_number_answer(text: str) -> Optional[Any]:
    raw = str(text or "").replace(",", ".")
    chars = []
    seen_digit = False
    for ch in raw:
        if ch.isdigit() or (ch == "." and "." not in chars):
            chars.append(ch)
            if ch.isdigit():
                seen_digit = True
        elif seen_digit:
            break
    if not seen_digit:
        return _parse_number_word(text)
    number = float("".join(chars))
    return int(number) if number.is_integer() else number


def _parse_number_word(text: str) -> Optional[int]:
    normalized = _normalize_answer_text(text)
    words = {
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
        "once": 11,
        "doce": 12,
        "trece": 13,
        "catorce": 14,
        "quince": 15,
        "veinte": 20,
    }
    for token in normalized.split():
        if token in words:
            return words[token]
    return None


def _match_allowed_value(normalized: str, allowed: list[Any]) -> Optional[Any]:
    for value in allowed:
        value_norm = _normalize_answer_text(str(value).replace("_", " "))
        compact_value = value_norm.replace(" ", "")
        compact_answer = normalized.replace(" ", "")
        if normalized == value_norm or compact_answer == compact_value:
            return value
    for value in allowed:
        value_norm = _normalize_answer_text(str(value).replace("_", " "))
        if value_norm and (value_norm in normalized or normalized in value_norm):
            return value
    return None


def _answer_schema(fact_id: str, spec: dict[str, Any]) -> dict[str, Any]:
    return {
        "fact_id": fact_id,
        "type": spec.get("type", "string"),
        "kind": spec.get("kind", "fact"),
        "allowed_values": spec.get("values") or spec.get("allowed_values"),
        "unit": spec.get("unit"),
        "on_missing": spec.get("on_missing", "ask"),
        "prompt": spec.get("prompt"),
        "source_quote": spec.get("source_quote"),
    }


def _fact_label(engine: str, fact_id: str) -> str:
    if fact_id in FRIENDLY_FACT_LABELS:
        return FRIENDLY_FACT_LABELS[fact_id]
    try:
        defs = fact_definitions(engine)
    except Exception:
        defs = {}
    if engine == "uw":
        defs = {**defs, **UW_CHAT_EXTRA_FACTS}
    prompt = (defs.get(fact_id) or {}).get("prompt")
    label = str(prompt or fact_id).strip()
    label = label.strip("¿? ")
    return label[:1].lower() + label[1:] if label else fact_id


def _assert_confirmed(body: dict[str, Any]) -> None:
    if body.get("source") == "nl_extraction" and body.get("facts_confirmed") is not True:
        raise ValueError("el motor determinístico rechaza salidas de extracción NL no confirmadas")
    if body.get("facts_confirmed") is False:
        raise ValueError("el motor determinístico rechaza hechos no confirmados")
    for value in body.get("facts", {}).values():
        if isinstance(value, dict) and value.get("confirmed") is False:
            raise ValueError("el motor determinístico rechaza valores no confirmados por hecho")


def _plain_facts(facts: dict[str, Any]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for key, value in facts.items():
        out[key] = value.get("value") if isinstance(value, dict) and "value" in value else value
    return out


def _human_task_record(body: dict[str, Any], *, packet: dict[str, Any], role: str) -> dict[str, Any]:
    now = _now()
    task_id = str(body.get("task_id") or f"HUM-{uuid.uuid4().hex[:10].upper()}")
    engine = packet.get("engine") or body.get("engine") or "uw"
    path = packet.get("path") or []
    return {
        "task_id": task_id,
        "packet_id": packet.get("packet_id"),
        "status": str(body.get("status") or "needs_human_input"),
        "task_type": packet.get("task_type") or body.get("task_type") or "manual_review",
        "engine": engine,
        "owner_role": body.get("owner_role") or _human_owner_role(packet, engine),
        "priority": body.get("priority") or _human_priority(packet),
        "source_channel": body.get("source_channel") or "chat",
        "source_sender": body.get("source_sender"),
        "conversation_id": body.get("conversation_id") or body.get("session_id") or body.get("source_sender"),
        "initial_slip": str(body.get("initial_slip") or body.get("slip") or ""),
        "attachments": body.get("attachments") or [],
        "confirmed_facts": body.get("confirmed_facts") or packet.get("facts") or {},
        "pending_facts": body.get("pending_facts") or {},
        "question": packet.get("question") or "Revisión humana requerida",
        "requested_fact": packet.get("requested_fact"),
        "answer_schema": packet.get("answer_schema"),
        "current_node": packet.get("current_node") or {},
        "resumable": bool(packet.get("resumable")),
        "resume_endpoint": packet.get("resume_endpoint"),
        "facts_count": len(packet.get("facts") or {}),
        "path_count": len(path),
        "packet": packet,
        "created_by_role": role,
        "created_at": now,
        "updated_at": now,
        "sla": {
            "target": "3_hours",
            "delay_minutes": 180,
            "reason": "Punto detenido por dato faltante, pricing, conflicto o revisión manual.",
        },
        "audit_packet": {
            "engine": engine,
            "task_type": packet.get("task_type"),
            "requested_fact": packet.get("requested_fact"),
            "current_node": (packet.get("current_node") or {}).get("id"),
            "source_quote": ((packet.get("context") or {}).get("source_quote")),
            "ledger_ref": ((packet.get("context") or {}).get("ledger_ref")),
        },
    }


def _load_chat_sessions() -> dict[str, dict[str, Any]]:
    latest: dict[str, dict[str, Any]] = {}
    if not CHAT_SESSIONS.exists():
        return latest
    for line in CHAT_SESSIONS.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        record = json.loads(line)
        session_id = record.get("session_id")
        if session_id:
            latest[session_id] = record
    return latest


def _persist_chat_session(session: dict[str, Any]) -> None:
    if os.environ.get("INSURANCE_PLATFORM_DISABLE_AUDIT_FILE") == "1":
        return
    CHAT_SESSIONS.parent.mkdir(parents=True, exist_ok=True)
    with CHAT_SESSIONS.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(session, ensure_ascii=False) + "\n")


def _local_chat_message(sender: str, text: str, at: str, meta: Optional[dict[str, Any]] = None) -> dict[str, Any]:
    return {
        "message_id": f"MSG-{uuid.uuid4().hex[:10].upper()}",
        "sender": sender,
        "text": text,
        "at": at,
        "meta": meta or {},
    }


def _local_chat_title(text: str) -> str:
    compact = " ".join(str(text).split())
    return compact[:58] + ("..." if len(compact) > 58 else "")


def _local_chat_summary(session: dict[str, Any]) -> dict[str, Any]:
    messages = session.get("messages") or []
    last = messages[-1] if messages else {}
    return {
        "session_id": session.get("session_id"),
        "title": session.get("title"),
        "engine": session.get("engine"),
        "status": session.get("status"),
        "pending_fact_count": len(session.get("pending_facts") or {}),
        "message_count": len(messages),
        "last_message": last.get("text"),
        "last_sender": last.get("sender"),
        "last_result_summary": session.get("last_result_summary"),
        "human_task_id": (session.get("human_task") or {}).get("task_id"),
        "created_at": session.get("created_at"),
        "updated_at": session.get("updated_at"),
    }


def _load_human_tasks() -> dict[str, dict[str, Any]]:
    latest: dict[str, dict[str, Any]] = {}
    if not HUMAN_TASKS.exists():
        return latest
    for line in HUMAN_TASKS.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        record = json.loads(line)
        task_id = record.get("task_id")
        if task_id:
            latest[task_id] = record
    return latest


def _persist_human_task(task: dict[str, Any]) -> None:
    if os.environ.get("INSURANCE_PLATFORM_DISABLE_AUDIT_FILE") == "1":
        return
    HUMAN_TASKS.parent.mkdir(parents=True, exist_ok=True)
    with HUMAN_TASKS.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(task, ensure_ascii=False) + "\n")


def _human_owner_role(packet: dict[str, Any], engine: str) -> str:
    task_type = packet.get("task_type")
    if task_type == "pricing_review":
        return "pricing"
    if task_type == "governance_or_manual_review":
        return "governance"
    if engine == "coverage":
        return "claims_accidents"
    return "uw"


def _human_priority(packet: dict[str, Any]) -> str:
    task_type = packet.get("task_type")
    if task_type in {"governance_or_manual_review", "pricing_review"}:
        return "alta"
    if packet.get("resumable"):
        return "normal"
    return "alta"


def _confirmation_reply(facts: dict[str, Any], questions: list[str]) -> str:
    if facts:
        facts_text = ", ".join(sorted(facts)[:6])
        prefix = f"Extraje estos datos sugeridos: {facts_text}."
    else:
        prefix = "No pude extraer datos suficientes todavia."
    if questions:
        return f"{prefix} Para continuar, confirme los hechos y responda: {questions[0]}"
    return f"{prefix} Por favor confirme si los datos son correctos antes de ejecutar el arbol."


def _result_reply(result: dict[str, Any], task: Optional[dict[str, Any]]) -> str:
    packet = result.get("human_packet") or {}
    if task:
        return (
            f"Ya revisé el caso con RiskIQ y necesita revisión del equipo. "
            f"Creé la tarea {task['task_id']} para {task['owner_role']}. "
            f"Punto a revisar: {packet.get('question') or task.get('question')}"
        )
    if packet and not _should_create_human_task(packet):
        question = packet.get("client_question") or packet.get("question") or "Necesito un dato adicional del cliente para continuar."
        return f"Me falta un dato para darte una respuesta confiable. {question}"
    outcome = result.get("outcome") or "sin resultado"
    terminal = result.get("terminal_node") or "sin nodo terminal"
    pricing = result.get("pricing") or {}
    if result.get("engine") == "coverage":
        if outcome == "likely_covered":
            return f"Listo. Con lo que me diste, RiskIQ orienta que el riesgo descrito estaría cubierto. Ruta final: {terminal}."
        if outcome == "partially_covered":
            return f"Listo. Con lo que me diste, RiskIQ orienta cobertura parcial o condicionada. Ruta final: {terminal}."
        if outcome == "likely_not_covered":
            return f"Listo. Con lo que me diste, RiskIQ orienta que el riesgo descrito no estaría cubierto. Ruta final: {terminal}."
        if outcome == "missing_document":
            return f"Todavía falta documentación o un dato antes de cerrar la orientación. Ruta actual: {terminal}."
    if pricing.get("status") == "approved_final_price":
        return f"Listo. RiskIQ marca el caso como {outcome} y emitió precio final de {pricing.get('final_price_bob')} {pricing.get('currency', 'BOB')}."
    if pricing.get("status") == "requires_pricing_review":
        return f"RiskIQ marcó el caso como {outcome}, pero el precio requiere revisión de pricing antes de ser final."
    return f"Listo. RiskIQ devolvió resultado {outcome}. Ruta final: {terminal}."


def _root_env_has(name: str) -> bool:
    env_path = Path(__file__).resolve().parents[3] / ".env"
    if not env_path.exists():
        return False
    prefix = f"{name}="
    for raw in env_path.read_text(encoding="utf-8").splitlines():
        if raw.startswith(prefix):
            return bool(raw.split("=", 1)[1].strip())
    return False


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _graph_lookup(engine: str) -> dict[str, dict[str, Any]]:
    try:
        data = graph_nodes(engine)
    except ValueError:
        return {}
    return {node["id"]: node for node in data.get("nodes", [])}


def _record_audit(role: str, action: str, detail: dict[str, Any]) -> str:
    audit_id = str(uuid.uuid4())
    if os.environ.get("INSURANCE_PLATFORM_DISABLE_AUDIT_FILE") == "1":
        return audit_id
    AUDIT_LOG.parent.mkdir(parents=True, exist_ok=True)
    record = {
        "audit_id": audit_id,
        "at": datetime.now(timezone.utc).isoformat(),
        "role": role,
        "action": action,
        "detail": detail,
    }
    with AUDIT_LOG.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(record, ensure_ascii=False) + "\n")
    return audit_id
