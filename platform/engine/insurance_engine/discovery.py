import csv
import json
from pathlib import Path
from typing import Any, Optional

from .paths import REPO_ROOT


DATA_EXTENSIONS = {".csv", ".tsv", ".xlsx", ".xls", ".json", ".jsonl", ".parquet"}
IGNORE_DIRS = {".git", "representation", "crawlable", "reference_approach1", "work", "source_text", "platform"}


def discover_available_data() -> dict[str, Any]:
    candidates: list[dict[str, Any]] = []
    for path in REPO_ROOT.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in DATA_EXTENSIONS:
            continue
        rel_parts = path.relative_to(REPO_ROOT).parts
        if any(part in IGNORE_DIRS or part.startswith(".") for part in rel_parts):
            continue
        profile = _profile_file(path)
        candidates.append(profile)

    has_fact_vector = any("fact_vector" in c.get("columns", []) for c in candidates)
    has_claim_linkage = any(
        {"invoked_node_id", "invoked_clause_code", "invoked_section_code"} & set(c.get("columns", []))
        for c in candidates
    )
    verdict = {
        "claims_feedback": "buildable_now" if has_claim_linkage else "gated_missing_claim_node_clause_linkage",
        "friction": "buildable_now" if has_claim_linkage else "gated_missing_claim_node_clause_linkage",
        "simulation": "buildable_now" if has_fact_vector else "gated_missing_submission_fact_vector",
        "ai_analyst": "buildable_now" if has_fact_vector and has_claim_linkage else "gated_missing_replay_or_claim_linkage",
    }
    return {
        "candidate_files": candidates,
        "has_submission_fact_vector": has_fact_vector,
        "has_claim_coverage_linkage": has_claim_linkage,
        "downstream_verdict": verdict,
        "note": "No se asume conexión a base productiva. Esta compuerta solo reporta datos visibles en el workspace.",
    }


def _profile_file(path: Path) -> dict[str, Any]:
    rel = str(path.relative_to(REPO_ROOT))
    columns: list[str] = []
    row_count: Optional[int] = None
    try:
        if path.suffix.lower() in {".csv", ".tsv"}:
            delimiter = "\t" if path.suffix.lower() == ".tsv" else ","
            with path.open(newline="", encoding="utf-8-sig") as fh:
                reader = csv.reader(fh, delimiter=delimiter)
                columns = next(reader, [])
                row_count = sum(1 for _ in reader)
        elif path.suffix.lower() == ".json":
            data = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(data, list) and data and isinstance(data[0], dict):
                columns = sorted(data[0].keys())
                row_count = len(data)
            elif isinstance(data, dict):
                columns = sorted(data.keys())
        elif path.suffix.lower() == ".jsonl":
            with path.open(encoding="utf-8") as fh:
                first = fh.readline()
                if first:
                    obj = json.loads(first)
                    if isinstance(obj, dict):
                        columns = sorted(obj.keys())
                    row_count = 1 + sum(1 for _ in fh)
    except Exception as exc:  # discovery must not block the platform
        return {"path": rel, "columns": [], "row_count": None, "error": str(exc)}
    return {"path": rel, "columns": columns, "row_count": row_count}
