from typing import Any, Optional

from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from . import services

app = FastAPI(title="Dynamic UW + Coverage Intelligence Platform", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, Any]:
    return services.health()


@app.get("/api/graph-versions")
def graph_versions() -> list[dict[str, Any]]:
    return services.list_versions()


@app.get("/api/engines")
def engines() -> list[dict[str, Any]]:
    return services.list_engines()


@app.get("/api/ledger")
def ledger() -> list[dict[str, Any]]:
    return services.list_ledger()


@app.get("/api/flags")
def flags(engine: str = Query("all")) -> dict[str, Any]:
    try:
        return services.flags(engine)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/facts")
def facts(engine: str = Query("uw")) -> dict[str, Any]:
    try:
        return services.list_facts(engine)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/rating/schema")
@app.get("/api/rating/demo/schema")
@app.get("/api/rating/lbc-auto/schema")
def rating_demo_schema() -> dict[str, Any]:
    return services.rating_demo_schema()


@app.get("/api/renewals/schema")
def renewal_schema() -> dict[str, Any]:
    return services.renewal_overlay_schema()


@app.get("/api/renewals")
def renewals() -> list[dict[str, Any]]:
    return services.list_renewals()


@app.get("/api/renewals/queue")
def renewal_queue(x_role: str = Header("sales")) -> dict[str, Any]:
    return services.list_renewal_queue(role=x_role)


@app.get("/api/broker/roles")
def broker_roles() -> list[dict[str, Any]]:
    return services.broker_roles()


@app.get("/api/broker/cases")
def broker_cases(
    role: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    stage: Optional[str] = Query(None),
) -> list[dict[str, Any]]:
    return services.list_lead_cases(role=role, status=status, stage=stage)


@app.post("/api/broker/cases")
def upsert_broker_case(body: dict[str, Any], x_role: str = Header("sales")) -> dict[str, Any]:
    try:
        return services.upsert_lead_case(body, role=x_role)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/broker/role-queue")
def broker_role_queue(role: str = Query("sales")) -> dict[str, Any]:
    return services.role_queue(role)


@app.post("/api/broker/send-message")
def broker_send_message(body: dict[str, Any], x_role: str = Header("sales")) -> dict[str, Any]:
    try:
        return services.send_broker_message(body, role=x_role)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/quotes/draft")
def quote_draft(body: dict[str, Any], x_role: str = Header("sales")) -> dict[str, Any]:
    try:
        return services.create_quote_draft(body, role=x_role)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/followups/rules")
def followup_rules() -> list[dict[str, Any]]:
    return services.list_followup_rules()


@app.post("/api/followups/rules")
def upsert_followup_rule(body: dict[str, Any], x_role: str = Header("sales")) -> dict[str, Any]:
    try:
        return services.upsert_followup_rule(body, role=x_role)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/followups")
def followups(
    role: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    due: Optional[str] = Query(None),
) -> list[dict[str, Any]]:
    return services.list_followups(role=role, status=status, due=due)


@app.post("/api/followups")
def create_followup(body: dict[str, Any], x_role: str = Header("sales")) -> dict[str, Any]:
    try:
        return services.create_followup(body, role=x_role)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/followups/run")
def run_followups(x_role: str = Header("system")) -> dict[str, Any]:
    return services.run_followup_scheduler(role=x_role)


@app.post("/api/followups/{followup_id}/snooze")
def snooze_followup(followup_id: str, body: dict[str, Any], x_role: str = Header("sales")) -> dict[str, Any]:
    try:
        return services.update_followup(followup_id, {**body, "status": "snoozed"}, role=x_role)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/followups/{followup_id}/complete")
def complete_followup(followup_id: str, body: dict[str, Any], x_role: str = Header("sales")) -> dict[str, Any]:
    try:
        return services.update_followup(followup_id, {**body, "status": "completed"}, role=x_role)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/voice/attach")
def voice_attach(body: dict[str, Any], x_role: str = Header("sales")) -> dict[str, Any]:
    try:
        return services.attach_voice_note(body, role=x_role)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/voice/reply")
def voice_reply(body: dict[str, Any], x_role: str = Header("sales")) -> dict[str, Any]:
    try:
        return services.create_voice_reply(body, role=x_role)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/uw/run")
def run_uw(body: dict[str, Any], x_role: str = Header("uw_user")) -> dict[str, Any]:
    try:
        return services.run_uw(body, role=x_role)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/coverage/run")
def run_coverage(body: dict[str, Any], x_role: str = Header("claims_user")) -> dict[str, Any]:
    try:
        return services.run_coverage(body, role=x_role)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/rating/demo")
@app.post("/api/rating/lbc-auto")
def run_demo_rating(body: dict[str, Any], x_role: str = Header("uw_user")) -> dict[str, Any]:
    try:
        return services.run_lbc_auto_rating(body, role=x_role)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/renewals/preview")
def preview_renewal(body: dict[str, Any], x_role: str = Header("uw_user")) -> dict[str, Any]:
    try:
        return services.preview_renewal(body, role=x_role)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/renewals")
def create_renewal(body: dict[str, Any], x_role: str = Header("uw_user")) -> dict[str, Any]:
    try:
        return services.create_renewal(body, role=x_role)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/uw/resume")
def resume_uw(body: dict[str, Any], x_role: str = Header("uw_user")) -> dict[str, Any]:
    try:
        return services.resume_run(body, role=x_role)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/coverage/resume")
def resume_coverage(body: dict[str, Any], x_role: str = Header("claims_user")) -> dict[str, Any]:
    try:
        return services.resume_run(body, role=x_role)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/nl/extract-facts")
def extract_facts(body: dict[str, Any]) -> dict[str, Any]:
    return services.extract_facts(body)


@app.get("/api/data-discovery")
def data_discovery() -> dict[str, Any]:
    return services.data_discovery()


@app.get("/api/simulations/mock-database")
def simulation_mock_database() -> dict[str, Any]:
    return services.simulation_mock_database()


@app.get("/api/simulations/filters")
def simulation_filters() -> dict[str, Any]:
    return services.simulation_filters()


@app.get("/api/simulations/candidates")
def simulation_candidates() -> list[dict[str, Any]]:
    return services.simulation_candidates()


@app.post("/api/simulations/run")
def run_simulation(body: dict[str, Any]) -> dict[str, Any]:
    return services.run_simulation(body)


@app.get("/api/supervision")
def supervision_dashboard() -> dict[str, Any]:
    return services.supervision_dashboard()


@app.post("/api/supervision")
def supervision_dashboard_filtered(body: dict[str, Any]) -> dict[str, Any]:
    return services.supervision_dashboard(body)


@app.get("/api/chat")
def chat_sessions() -> list[dict[str, Any]]:
    return services.list_chat_sessions()


@app.post("/api/chat")
def chat_message(body: dict[str, Any], x_role: str = Header("chat_agent")) -> dict[str, Any]:
    try:
        return services.chat_turn(body, role=x_role)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/chat/{session_id}")
def chat_session_detail(session_id: str) -> dict[str, Any]:
    try:
        return services.get_chat_session(session_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/api/human-tasks")
def human_tasks(status: Optional[str] = Query(None)) -> list[dict[str, Any]]:
    return services.list_human_tasks(status=status)


@app.post("/api/human-tasks")
def create_human_task(body: dict[str, Any], x_role: str = Header("chat_agent")) -> dict[str, Any]:
    try:
        return services.create_human_task(body, role=x_role)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/human-tasks/{task_id}")
def human_task_detail(task_id: str) -> dict[str, Any]:
    try:
        return services.get_human_task(task_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/api/human-tasks/{task_id}/complete")
def complete_human_task(task_id: str, body: dict[str, Any], x_role: str = Header("uw_user")) -> dict[str, Any]:
    try:
        return services.complete_human_task(task_id, body, role=x_role)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/graph")
def graph(engine: str = Query("uw")) -> dict[str, Any]:
    try:
        return services.graph(engine)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/proposals")
def proposals() -> list[dict[str, Any]]:
    return services.list_drafts()


@app.get("/api/ledger/{entry_id}")
def ledger_detail(entry_id: str) -> dict[str, Any]:
    try:
        return services.ledger_detail(entry_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/api/proposals/draft")
def draft_proposal(body: dict[str, Any], x_role: str = Header("uw_user")) -> dict[str, Any]:
    return services.draft_proposal(body, role=x_role)


@app.post("/api/proposals/publish")
def publish_proposal(body: dict[str, Any], x_role: str = Header("uw_manager")) -> dict[str, Any]:
    result = services.publish_proposal(body, role=x_role)
    if not result["allowed"]:
        raise HTTPException(status_code=403, detail=result)
    return result
