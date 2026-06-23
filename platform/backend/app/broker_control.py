from __future__ import annotations

import json
import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional


DB_DIR = Path(__file__).resolve().parents[2] / "db"
LEAD_CASES = DB_DIR / "lead_cases.jsonl"
FOLLOWUP_RULES = DB_DIR / "followup_rules.jsonl"
SCHEDULED_FOLLOWUPS = DB_DIR / "scheduled_followups.jsonl"
AGENT_ACTIONS = DB_DIR / "chat_actions.jsonl"
VOICE_REPLIES = DB_DIR / "voice_replies.jsonl"


ROLE_DEFS = [
    {"id": "sales", "label": "Ventas broker", "can_edit": True, "summary_only": False},
    {"id": "uw", "label": "Suscripción", "can_edit": True, "summary_only": False},
    {"id": "claims_accidents", "label": "Accidentes y siniestros", "can_edit": True, "summary_only": False},
    {"id": "c_suite", "label": "C-suite", "can_edit": False, "summary_only": True},
    {"id": "pricing", "label": "Pricing", "can_edit": True, "summary_only": False},
    {"id": "governance", "label": "Gobernanza", "can_edit": True, "summary_only": False},
]

ROLE_IDS = {role["id"] for role in ROLE_DEFS}

DEFAULT_FOLLOWUP_RULE = {
    "rule_id": "FUP-DEFAULT-3H",
    "label": "Seguimiento general 3 horas",
    "role": "sales",
    "client_type": "any",
    "stage": "any",
    "channel": "any",
    "priority": "any",
    "delay_minutes": 180,
    "enabled": True,
    "source": "default",
}

FOLLOWUP_STATUSES = {"scheduled", "sent", "snoozed", "completed", "cancelled"}
CASE_STATUSES = {"open", "won", "lost", "blocked", "closed"}


def roles() -> list[dict[str, Any]]:
    return ROLE_DEFS


def normalize_role(role: Optional[str]) -> str:
    value = str(role or "sales").strip().lower().replace("-", "_").replace(" ", "_")
    aliases = {
        "suscriptor": "uw",
        "underwriter": "uw",
        "claims": "claims_accidents",
        "claims_user": "claims_accidents",
        "ajustador": "claims_accidents",
        "accidents": "claims_accidents",
        "siniestros": "claims_accidents",
        "gobernanza": "governance",
        "c-suite": "c_suite",
        "csuite": "c_suite",
        "executive": "c_suite",
        "broker": "sales",
        "ventas": "sales",
    }
    normalized = aliases.get(value, value)
    return normalized if normalized in ROLE_IDS else "sales"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def upsert_lead_case(body: dict[str, Any], *, sessions: dict[str, dict[str, Any]], role: str) -> dict[str, Any]:
    records = _load_latest(LEAD_CASES, "case_id")
    session_id = str(body.get("session_id") or body.get("conversation_id") or "").strip()
    session = sessions.get(session_id) if session_id else None
    existing = _find_case(records, body.get("case_id"), session_id)
    case_id = str(body.get("case_id") or (existing or {}).get("case_id") or f"CASE-{uuid.uuid4().hex[:10].upper()}")
    facts = _facts_for_case(body, session)
    summary = (session or {}).get("last_result_summary") or body.get("last_result_summary") or {}
    stage = str(body.get("stage") or _infer_stage(session, summary, body)).strip()
    owner_role = normalize_role(body.get("owner_role") or _owner_for_stage(stage, summary, session))
    now = now_iso()
    record = {
        **(existing or {}),
        "case_id": case_id,
        "conversation_id": session_id or (existing or {}).get("conversation_id"),
        "channel": body.get("channel") or (session or {}).get("channel") or "chat",
        "title": str(body.get("title") or (session or {}).get("title") or (existing or {}).get("title") or "Caso broker").strip(),
        "engine": str(body.get("engine") or (session or {}).get("engine") or (existing or {}).get("engine") or "uw"),
        "client_type": str(body.get("client_type") or facts.get("client_type") or "por_confirmar"),
        "stage": stage,
        "status": str(body.get("status") or (existing or {}).get("status") or "open"),
        "owner_role": owner_role,
        "priority": str(body.get("priority") or (existing or {}).get("priority") or _priority_for_summary(summary)),
        "source_sender": body.get("source_sender") or (session or {}).get("source_sender") or (existing or {}).get("source_sender"),
        "sales_path": str(body.get("sales_path") or _infer_sales_path(session, facts, stage)),
        "confirmed_facts": (session or {}).get("confirmed_facts") or body.get("confirmed_facts") or {},
        "pending_facts": (session or {}).get("pending_facts") or body.get("pending_facts") or {},
        "last_result_summary": summary,
        "human_task_id": ((session or {}).get("human_task") or {}).get("task_id") or body.get("human_task_id"),
        "updated_by_role": normalize_role(role),
        "created_at": (existing or {}).get("created_at") or now,
        "updated_at": now,
    }
    if record["status"] not in CASE_STATUSES:
        record["status"] = "open"
    _append_record(LEAD_CASES, record)
    return record


def list_lead_cases(
    *,
    sessions: dict[str, dict[str, Any]],
    role: Optional[str] = None,
    status: Optional[str] = None,
    stage: Optional[str] = None,
) -> list[dict[str, Any]]:
    records = _load_latest(LEAD_CASES, "case_id")
    for session in sessions.values():
        if not _case_for_session(records, session.get("session_id")):
            inferred = upsert_lead_case({"session_id": session.get("session_id")}, sessions=sessions, role="system")
            records[inferred["case_id"]] = inferred
    out = list(records.values())
    if role:
        normalized = normalize_role(role)
        out = [case for case in out if case.get("owner_role") == normalized]
    if status:
        out = [case for case in out if case.get("status") == status]
    if stage:
        out = [case for case in out if case.get("stage") == stage]
    return sorted(out, key=lambda item: item.get("updated_at") or item.get("created_at") or "", reverse=True)


def list_followup_rules() -> list[dict[str, Any]]:
    persisted = _load_latest(FOLLOWUP_RULES, "rule_id")
    rules = {DEFAULT_FOLLOWUP_RULE["rule_id"]: dict(DEFAULT_FOLLOWUP_RULE)}
    rules.update(persisted)
    return sorted(rules.values(), key=lambda item: (item.get("source") != "default", item.get("rule_id") or ""))


def upsert_followup_rule(body: dict[str, Any], *, role: str) -> dict[str, Any]:
    rule_id = str(body.get("rule_id") or f"FUP-RULE-{uuid.uuid4().hex[:8].upper()}")
    delay = int(body.get("delay_minutes") if body.get("delay_minutes") is not None else 180)
    if delay < 5:
        raise ValueError("delay_minutes debe ser al menos 5")
    now = now_iso()
    record = {
        "rule_id": rule_id,
        "label": str(body.get("label") or "Regla de seguimiento").strip(),
        "role": normalize_role(body.get("role") or "sales"),
        "client_type": str(body.get("client_type") or "any"),
        "stage": str(body.get("stage") or "any"),
        "channel": str(body.get("channel") or "any"),
        "priority": str(body.get("priority") or "any"),
        "delay_minutes": delay,
        "enabled": body.get("enabled") is not False,
        "source": "configured",
        "updated_by_role": normalize_role(role),
        "created_at": body.get("created_at") or now,
        "updated_at": now,
    }
    _append_record(FOLLOWUP_RULES, record)
    return record


def schedule_followup(body: dict[str, Any], *, role: str) -> dict[str, Any]:
    target_type = str(body.get("target_type") or "case")
    target_id = str(body.get("target_id") or body.get("case_id") or body.get("session_id") or body.get("task_id") or "")
    if not target_id:
        raise ValueError("target_id es requerido para programar seguimiento")
    followup_role = normalize_role(body.get("role") or role)
    stage = str(body.get("stage") or "any")
    client_type = str(body.get("client_type") or "any")
    channel = str(body.get("channel") or "any")
    priority = str(body.get("priority") or "normal")
    rule = _match_rule(followup_role, stage, client_type, channel, priority)
    delay = int(body.get("delay_minutes") if body.get("delay_minutes") is not None else rule["delay_minutes"])
    due_at = str(body.get("due_at") or (datetime.now(timezone.utc) + timedelta(minutes=delay)).isoformat())
    record = {
        "followup_id": str(body.get("followup_id") or f"FUP-{uuid.uuid4().hex[:10].upper()}"),
        "target_type": target_type,
        "target_id": target_id,
        "role": followup_role,
        "stage": stage,
        "client_type": client_type,
        "channel": channel,
        "priority": priority,
        "status": str(body.get("status") or "scheduled"),
        "due_at": due_at,
        "rule_id": rule["rule_id"],
        "message": str(body.get("message") or _default_followup_message(stage, client_type)),
        "created_by_role": normalize_role(role),
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    if record["status"] not in FOLLOWUP_STATUSES:
        record["status"] = "scheduled"
    _append_record(SCHEDULED_FOLLOWUPS, record)
    return record


def list_followups(
    *,
    role: Optional[str] = None,
    status: Optional[str] = None,
    due: Optional[str] = None,
) -> list[dict[str, Any]]:
    records = list(_load_latest(SCHEDULED_FOLLOWUPS, "followup_id").values())
    if role:
        normalized = normalize_role(role)
        records = [item for item in records if item.get("role") == normalized]
    if status:
        records = [item for item in records if item.get("status") == status]
    if due == "due":
        now = now_iso()
        records = [item for item in records if item.get("status") in {"scheduled", "snoozed"} and str(item.get("due_at") or "") <= now]
    return sorted(records, key=lambda item: item.get("due_at") or item.get("updated_at") or "")


def update_followup(followup_id: str, body: dict[str, Any], *, role: str) -> dict[str, Any]:
    record = _load_latest(SCHEDULED_FOLLOWUPS, "followup_id").get(followup_id)
    if not record:
        raise ValueError("seguimiento no encontrado")
    status = str(body.get("status") or record.get("status"))
    if status not in FOLLOWUP_STATUSES:
        raise ValueError("status de seguimiento inválido")
    updated = {
        **record,
        "status": status,
        "due_at": body.get("due_at") or record.get("due_at"),
        "message": str(body.get("message") or record.get("message") or ""),
        "updated_by_role": normalize_role(role),
        "updated_at": now_iso(),
    }
    if body.get("snooze_minutes") is not None:
        updated["status"] = "snoozed"
        updated["due_at"] = (datetime.now(timezone.utc) + timedelta(minutes=int(body["snooze_minutes"]))).isoformat()
    _append_record(SCHEDULED_FOLLOWUPS, updated)
    return updated


def generate_followups(
    *,
    sessions: dict[str, dict[str, Any]],
    tasks: list[dict[str, Any]],
    cases: list[dict[str, Any]],
    renewals: list[dict[str, Any]],
    role: str,
) -> dict[str, Any]:
    existing = list_followups()
    created: list[dict[str, Any]] = []
    cancelled: list[dict[str, Any]] = []
    cases_by_id = {case.get("case_id"): case for case in cases if case.get("case_id")}
    tasks_by_id = {task.get("task_id"): task for task in tasks if task.get("task_id")}
    for followup in existing:
        if followup.get("status") not in {"scheduled", "snoozed"}:
            continue
        target_type = followup.get("target_type")
        target_id = followup.get("target_id")
        if target_type == "case" and cases_by_id.get(target_id, {}).get("status") not in {None, "open"}:
            cancelled.append(_cancel_followup(followup, role=role, reason="case_not_open"))
        elif target_type == "human_task" and tasks_by_id.get(target_id, {}).get("status") not in {
            "needs_human_input",
            "resumed_needs_more_input",
        }:
            cancelled.append(_cancel_followup(followup, role=role, reason="human_task_closed"))
    cancelled_ids = {item.get("followup_id") for item in cancelled}
    active_existing = [item for item in existing if item.get("followup_id") not in cancelled_ids]
    for case in cases:
        if case.get("status") != "open":
            continue
        if _has_open_followup(active_existing + created, "case", case["case_id"]):
            continue
        created.append(
            schedule_followup(
                {
                    "target_type": "case",
                    "target_id": case["case_id"],
                    "role": case.get("owner_role") or "sales",
                    "stage": case.get("stage") or "sale_progress",
                    "client_type": case.get("client_type") or "any",
                    "channel": case.get("channel") or "any",
                    "priority": case.get("priority") or "normal",
                },
                role=role,
            )
        )
    for task in tasks:
        if task.get("status") not in {"needs_human_input", "resumed_needs_more_input"}:
            continue
        if _has_open_followup(active_existing + created, "human_task", task["task_id"]):
            continue
        created.append(
            schedule_followup(
                {
                    "target_type": "human_task",
                    "target_id": task["task_id"],
                    "role": normalize_role(task.get("owner_role")),
                    "stage": task.get("task_type") or "human_review",
                    "priority": task.get("priority") or "normal",
                },
                role=role,
            )
        )
    for renewal in renewals:
        renewal_id = renewal.get("renewal_id")
        if not renewal_id or _has_open_followup(active_existing + created, "renewal", renewal_id):
            continue
        created.append(
            schedule_followup(
                {
                    "target_type": "renewal",
                    "target_id": renewal_id,
                    "role": "sales",
                    "stage": "renewal",
                    "client_type": "renewal",
                    "priority": "normal",
                    "message": "Dar seguimiento a renovación y confirmar condiciones con el cliente.",
                },
                role=role,
            )
        )
    return {
        "created": created,
        "created_count": len(created),
        "cancelled": cancelled,
        "cancelled_count": len(cancelled),
        "due": list_followups(due="due"),
    }


def role_queue(
    role: str,
    *,
    cases: list[dict[str, Any]],
    tasks: list[dict[str, Any]],
    followups: list[dict[str, Any]],
    renewals: list[dict[str, Any]],
) -> dict[str, Any]:
    normalized = normalize_role(role)
    due = [item for item in followups if item.get("role") == normalized and item.get("status") in {"scheduled", "snoozed"}]
    role_tasks = [task for task in tasks if normalize_role(task.get("owner_role")) == normalized and task.get("status") in {"needs_human_input", "resumed_needs_more_input"}]
    role_cases = [case for case in cases if case.get("owner_role") == normalized and case.get("status") == "open"]
    if normalized == "c_suite":
        return {
            "role": normalized,
            "summary_only": True,
            "metrics": {
                "open_cases": len([case for case in cases if case.get("status") == "open"]),
                "human_tasks": len([task for task in tasks if task.get("status") in {"needs_human_input", "resumed_needs_more_input"}]),
                "due_followups": len([item for item in followups if item.get("status") in {"scheduled", "snoozed"}]),
                "renewals": len(renewals),
            },
            "alerts": _executive_alerts(cases, tasks, followups),
            "editable": False,
        }
    if normalized == "sales":
        role_cases = [case for case in cases if case.get("owner_role") in {"sales", None} and case.get("status") == "open"]
    if normalized == "claims_accidents":
        role_tasks.extend(task for task in tasks if task.get("engine") == "coverage" and task not in role_tasks)
    return {
        "role": normalized,
        "summary_only": False,
        "editable": True,
        "cases": role_cases[:25],
        "human_tasks": role_tasks[:25],
        "followups": due[:25],
        "renewals": renewals[:25] if normalized == "sales" else [],
    }


def create_voice_reply(body: dict[str, Any], *, role: str) -> dict[str, Any]:
    text = str(body.get("text") or "").strip()
    if not text:
        raise ValueError("text es requerido para crear nota de voz")
    enabled = body.get("generate_audio") is True and os.environ.get("OPENAI_VOICE_REPLY_ENABLED") == "1"
    record = {
        "voice_reply_id": str(body.get("voice_reply_id") or f"VOICE-{uuid.uuid4().hex[:10].upper()}"),
        "conversation_id": body.get("conversation_id") or body.get("session_id"),
        "channel": body.get("channel") or "chat",
        "text_canonical": text,
        "generate_audio_requested": body.get("generate_audio") is True,
        "audio_status": "queued_for_tts" if enabled else "text_only_logged",
        "provider": "openai_tts" if enabled else None,
        "live_calls_status": "future_phase",
        "created_by_role": normalize_role(role),
        "created_at": now_iso(),
    }
    _append_record(VOICE_REPLIES, record)
    return record


def list_voice_replies(conversation_id: Optional[str] = None) -> list[dict[str, Any]]:
    records = list(_load_latest(VOICE_REPLIES, "voice_reply_id").values())
    if conversation_id:
        records = [item for item in records if item.get("conversation_id") == conversation_id]
    return sorted(records, key=lambda item: item.get("created_at") or "", reverse=True)


def log_agent_action(body: dict[str, Any], *, role: str) -> dict[str, Any]:
    action = str(body.get("action") or "").strip()
    if not action:
        raise ValueError("action es requerido")
    decision_right = str(body.get("decision_right") or "operational")
    if decision_right not in {"operational", "approval_required", "forbidden"}:
        raise ValueError("decision_right inválido")
    record = {
        "agent_action_id": str(body.get("agent_action_id") or f"ACT-{uuid.uuid4().hex[:10].upper()}"),
        "conversation_id": body.get("conversation_id") or body.get("session_id"),
        "actor_role": normalize_role(role),
        "action": action,
        "tool_name": body.get("tool_name"),
        "decision_right": decision_right,
        "result": body.get("result") or {},
        "created_at": now_iso(),
    }
    _append_record(AGENT_ACTIONS, record)
    return record


def list_agent_actions(conversation_id: Optional[str] = None) -> list[dict[str, Any]]:
    records = list(_load_latest(AGENT_ACTIONS, "agent_action_id").values())
    if conversation_id:
        records = [item for item in records if item.get("conversation_id") == conversation_id]
    return sorted(records, key=lambda item: item.get("created_at") or "", reverse=True)


def _load_latest(path: Path, key: str) -> dict[str, dict[str, Any]]:
    latest: dict[str, dict[str, Any]] = {}
    if not path.exists():
        return latest
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        record = json.loads(line)
        record_key = record.get(key)
        if record_key:
            latest[str(record_key)] = record
    return latest


def _append_record(path: Path, record: dict[str, Any]) -> None:
    if os.environ.get("INSURANCE_PLATFORM_DISABLE_AUDIT_FILE") == "1":
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(record, ensure_ascii=False) + "\n")


def _find_case(records: dict[str, dict[str, Any]], case_id: Any, session_id: str) -> Optional[dict[str, Any]]:
    if case_id and str(case_id) in records:
        return records[str(case_id)]
    return _case_for_session(records, session_id)


def _case_for_session(records: dict[str, dict[str, Any]], session_id: Optional[str]) -> Optional[dict[str, Any]]:
    if not session_id:
        return None
    for record in records.values():
        if record.get("conversation_id") == session_id:
            return record
    return None


def _facts_for_case(body: dict[str, Any], session: Optional[dict[str, Any]]) -> dict[str, Any]:
    facts: dict[str, Any] = {}
    if session:
        facts.update(session.get("pending_facts") or {})
        facts.update(session.get("confirmed_facts") or {})
    facts.update(body.get("pending_facts") or {})
    facts.update(body.get("confirmed_facts") or {})
    return facts


def _infer_stage(session: Optional[dict[str, Any]], summary: dict[str, Any], body: dict[str, Any]) -> str:
    text = " ".join(
        str(item.get("text") or "")
        for item in ((session or {}).get("messages") or [])
        if isinstance(item, dict)
    ).lower()
    if "renov" in text or body.get("sales_path") == "renewal":
        return "renewal"
    status = (session or {}).get("status") or body.get("status")
    if status == "needs_fact_confirmation":
        return "fact_confirmation"
    if status == "needs_client_followup":
        return "client_followup"
    if status == "human_task_created" or summary.get("requested_fact"):
        return "human_review"
    if summary.get("pricing_status") == "approved_final_price":
        return "quote_ready"
    if summary.get("engine") == "coverage":
        return "claims_review"
    return "sale_progress"


def _infer_sales_path(session: Optional[dict[str, Any]], facts: dict[str, Any], stage: str) -> str:
    if stage == "renewal":
        return "renewal"
    if facts.get("client_type") == "empresa":
        return "empresa"
    if facts.get("client_type") in {"persona", "personas"}:
        return "persona"
    text = " ".join(str(item.get("text") or "") for item in ((session or {}).get("messages") or []) if isinstance(item, dict)).lower()
    if "broker" in text or "corredor" in text:
        return "broker_referred"
    return "client_type_pending"


def _owner_for_stage(stage: str, summary: dict[str, Any], session: Optional[dict[str, Any]]) -> str:
    human_task = (session or {}).get("human_task") or {}
    if human_task:
        return normalize_role(human_task.get("owner_role"))
    if stage in {"fact_confirmation", "client_followup"}:
        return "sales"
    if stage == "claims_review" or summary.get("engine") == "coverage":
        return "claims_accidents"
    if stage == "human_review":
        return "uw"
    if summary.get("pricing_status") == "requires_pricing_review":
        return "pricing"
    return "sales"


def _priority_for_summary(summary: dict[str, Any]) -> str:
    if summary.get("ledger_ref") or summary.get("pricing_status") == "requires_pricing_review":
        return "alta"
    if summary.get("requested_fact"):
        return "normal"
    return "normal"


def _match_rule(role: str, stage: str, client_type: str, channel: str, priority: str) -> dict[str, Any]:
    candidates = [rule for rule in list_followup_rules() if rule.get("enabled") is not False]
    best = DEFAULT_FOLLOWUP_RULE
    best_score = -1
    for rule in candidates:
        score = 0
        for field, value in (("role", role), ("stage", stage), ("client_type", client_type), ("channel", channel), ("priority", priority)):
            rule_value = str(rule.get(field) or "any")
            if rule_value == value:
                score += 2
            elif rule_value == "any":
                score += 1
            else:
                score = -99
                break
        if score > best_score:
            best = rule
            best_score = score
    return best


def _default_followup_message(stage: str, client_type: str) -> str:
    if stage == "fact_confirmation":
        return "Dar seguimiento para confirmar hechos sugeridos y poder ejecutar RiskIQ."
    if stage == "human_review":
        return "Recordar al rol humano responder el paquete para reanudar el árbol."
    if stage == "quote_ready":
        return "Contactar al cliente con las opciones aprobadas y avanzar el cierre."
    if stage == "renewal":
        return "Dar seguimiento a renovación y confirmar términos con el cliente."
    return f"Dar seguimiento comercial al cliente {client_type}."


def _has_open_followup(followups: list[dict[str, Any]], target_type: str, target_id: str) -> bool:
    return any(
        item.get("target_type") == target_type
        and item.get("target_id") == target_id
        and item.get("status") in {"scheduled", "snoozed"}
        for item in followups
    )


def _cancel_followup(followup: dict[str, Any], *, role: str, reason: str) -> dict[str, Any]:
    updated = {
        **followup,
        "status": "cancelled",
        "cancel_reason": reason,
        "updated_by_role": normalize_role(role),
        "updated_at": now_iso(),
    }
    _append_record(SCHEDULED_FOLLOWUPS, updated)
    return updated


def _executive_alerts(cases: list[dict[str, Any]], tasks: list[dict[str, Any]], followups: list[dict[str, Any]]) -> list[dict[str, Any]]:
    alerts: list[dict[str, Any]] = []
    blocked = [case for case in cases if case.get("stage") == "human_review" or case.get("status") == "blocked"]
    due = [item for item in followups if item.get("status") in {"scheduled", "snoozed"} and str(item.get("due_at") or "") <= now_iso()]
    if blocked:
        alerts.append({"kind": "human_bottleneck", "count": len(blocked), "message": "Casos detenidos por revisión humana."})
    if due:
        alerts.append({"kind": "followup_due", "count": len(due), "message": "Seguimientos vencidos o listos para contacto."})
    pricing = [task for task in tasks if task.get("task_type") == "pricing_review" and task.get("status") in {"needs_human_input", "resumed_needs_more_input"}]
    if pricing:
        alerts.append({"kind": "pricing_review", "count": len(pricing), "message": "Revisiones de pricing pendientes."})
    return alerts
