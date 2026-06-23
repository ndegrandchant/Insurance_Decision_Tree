#!/usr/bin/env python3
"""Dependency-free local server for smoke testing the platform APIs and UI."""

import json
import mimetypes
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

APP_DIR = Path(__file__).resolve().parent
sys.dont_write_bytecode = True
if str(APP_DIR) not in sys.path:
    sys.path.insert(0, str(APP_DIR))

from app import services

FRONTEND_DIR = Path(__file__).resolve().parents[1] / "frontend" / "public"


class Handler(BaseHTTPRequestHandler):
    server_version = "InsurancePlatformDev/0.1"

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/health":
            return self._json(services.health())
        if parsed.path == "/api/graph-versions":
            return self._json(services.list_versions())
        if parsed.path == "/api/engines":
            return self._json(services.list_engines())
        if parsed.path == "/api/ledger":
            return self._json(services.list_ledger())
        if parsed.path == "/api/facts":
            engine = parse_qs(parsed.query).get("engine", ["uw"])[0]
            return self._json(services.list_facts(engine))
        if parsed.path in {"/api/rating/schema", "/api/rating/demo/schema", "/api/rating/lbc-auto/schema"}:
            return self._json(services.rating_demo_schema())
        if parsed.path == "/api/renewals/schema":
            return self._json(services.renewal_overlay_schema())
        if parsed.path == "/api/renewals":
            return self._json(services.list_renewals())
        if parsed.path == "/api/renewals/queue":
            return self._json(services.list_renewal_queue(role=self.headers.get("X-Role", "sales")))
        if parsed.path == "/api/broker/roles":
            return self._json(services.broker_roles())
        if parsed.path == "/api/broker/cases":
            qs = parse_qs(parsed.query)
            return self._json(services.list_lead_cases(role=qs.get("role", [None])[0], status=qs.get("status", [None])[0], stage=qs.get("stage", [None])[0]))
        if parsed.path == "/api/broker/role-queue":
            role = parse_qs(parsed.query).get("role", ["sales"])[0]
            return self._json(services.role_queue(role))
        if parsed.path == "/api/followups/rules":
            return self._json(services.list_followup_rules())
        if parsed.path == "/api/followups":
            qs = parse_qs(parsed.query)
            return self._json(services.list_followups(role=qs.get("role", [None])[0], status=qs.get("status", [None])[0], due=qs.get("due", [None])[0]))
        if parsed.path == "/api/data-discovery":
            return self._json(services.data_discovery())
        if parsed.path == "/api/simulations/mock-database":
            return self._json(services.simulation_mock_database())
        if parsed.path == "/api/simulations/filters":
            return self._json(services.simulation_filters())
        if parsed.path == "/api/simulations/candidates":
            return self._json(services.simulation_candidates())
        if parsed.path == "/api/supervision":
            return self._json(services.supervision_dashboard())
        if parsed.path == "/api/chat":
            return self._json(services.list_chat_sessions())
        if parsed.path == "/api/human-tasks":
            status = parse_qs(parsed.query).get("status", [None])[0]
            return self._json(services.list_human_tasks(status=status))
        if parsed.path == "/api/graph":
            engine = parse_qs(parsed.query).get("engine", ["uw"])[0]
            try:
                return self._json(services.graph(engine))
            except ValueError as exc:
                return self._json({"error": str(exc)}, status=400)
        if parsed.path == "/api/flags":
            engine = parse_qs(parsed.query).get("engine", ["all"])[0]
            try:
                return self._json(services.flags(engine))
            except ValueError as exc:
                return self._json({"error": str(exc)}, status=400)
        if parsed.path == "/api/proposals":
            return self._json(services.list_drafts())
        if parsed.path.startswith("/api/ledger/"):
            entry_id = parsed.path[len("/api/ledger/"):]
            try:
                return self._json(services.ledger_detail(entry_id))
            except ValueError as exc:
                return self._json({"error": str(exc)}, status=404)
        if parsed.path.startswith("/api/chat/"):
            session_id = parsed.path[len("/api/chat/"):]
            try:
                return self._json(services.get_chat_session(session_id))
            except ValueError as exc:
                return self._json({"error": str(exc)}, status=404)
        if parsed.path.startswith("/api/human-tasks/"):
            task_id = parsed.path[len("/api/human-tasks/"):]
            try:
                return self._json(services.get_human_task(task_id))
            except ValueError as exc:
                return self._json({"error": str(exc)}, status=404)
        return self._static(parsed.path)

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        body = self._read_json()
        role = self.headers.get("X-Role", "uw_user")
        try:
            if parsed.path == "/api/uw/run":
                return self._json(services.run_uw(body, role=role))
            if parsed.path == "/api/coverage/run":
                return self._json(services.run_coverage(body, role=role))
            if parsed.path in {"/api/rating/demo", "/api/rating/lbc-auto"}:
                return self._json(services.run_lbc_auto_rating(body, role=role))
            if parsed.path == "/api/renewals/preview":
                return self._json(services.preview_renewal(body, role=role))
            if parsed.path == "/api/renewals":
                return self._json(services.create_renewal(body, role=role))
            if parsed.path == "/api/broker/cases":
                return self._json(services.upsert_lead_case(body, role=role))
            if parsed.path == "/api/broker/send-message":
                return self._json(services.send_broker_message(body, role=role))
            if parsed.path == "/api/quotes/draft":
                return self._json(services.create_quote_draft(body, role=role))
            if parsed.path == "/api/followups/rules":
                return self._json(services.upsert_followup_rule(body, role=role))
            if parsed.path == "/api/followups":
                return self._json(services.create_followup(body, role=role))
            if parsed.path == "/api/followups/run":
                return self._json(services.run_followup_scheduler(role=role))
            if parsed.path.startswith("/api/followups/") and parsed.path.endswith("/snooze"):
                followup_id = parsed.path[len("/api/followups/"):-len("/snooze")]
                return self._json(services.update_followup(followup_id, {**body, "status": "snoozed"}, role=role))
            if parsed.path.startswith("/api/followups/") and parsed.path.endswith("/complete"):
                followup_id = parsed.path[len("/api/followups/"):-len("/complete")]
                return self._json(services.update_followup(followup_id, {**body, "status": "completed"}, role=role))
            if parsed.path == "/api/voice/attach":
                return self._json(services.attach_voice_note(body, role=role))
            if parsed.path == "/api/voice/reply":
                return self._json(services.create_voice_reply(body, role=role))
            if parsed.path in {"/api/uw/resume", "/api/coverage/resume", "/api/run/resume"}:
                return self._json(services.resume_run(body, role=role))
            if parsed.path == "/api/nl/extract-facts":
                return self._json(services.extract_facts(body))
            if parsed.path == "/api/chat":
                return self._json(services.chat_turn(body, role=role))
            if parsed.path == "/api/human-tasks":
                return self._json(services.create_human_task(body, role=role))
            if parsed.path.startswith("/api/human-tasks/") and parsed.path.endswith("/complete"):
                task_id = parsed.path[len("/api/human-tasks/"):-len("/complete")]
                return self._json(services.complete_human_task(task_id, body, role=role))
            if parsed.path == "/api/proposals/draft":
                return self._json(services.draft_proposal(body, role=role))
            if parsed.path == "/api/proposals/publish":
                result = services.publish_proposal(body, role=role)
                return self._json(result, status=200 if result["allowed"] else 403)
            if parsed.path == "/api/simulations/run":
                return self._json(services.run_simulation(body))
            if parsed.path == "/api/supervision":
                return self._json(services.supervision_dashboard(body))
        except ValueError as exc:
            return self._json({"error": str(exc)}, status=400)
        return self._json({"error": "not found"}, status=404)

    def _read_json(self) -> dict:
        length = int(self.headers.get("Content-Length", "0"))
        if not length:
            return {}
        return json.loads(self.rfile.read(length).decode("utf-8"))

    def _json(self, data, status: int = 200) -> None:
        payload = json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(payload)

    def _static(self, request_path: str) -> None:
        rel = "index.html" if request_path in {"/", ""} else request_path.lstrip("/")
        path = (FRONTEND_DIR / rel).resolve()
        if not str(path).startswith(str(FRONTEND_DIR.resolve())) or not path.exists() or path.is_dir():
            path = FRONTEND_DIR / "index.html"
        data = path.read_bytes()
        ctype = mimetypes.guess_type(str(path))[0] or "application/octet-stream"
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, fmt: str, *args) -> None:
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))


def main() -> None:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"serving http://127.0.0.1:{port}")
    server.serve_forever()


if __name__ == "__main__":
    main()
