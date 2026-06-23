import json
import hashlib
import subprocess
import sys
from pathlib import Path
from typing import Any, Optional

from .catalog import (
    ENGINE_SPECS,
    engine_catalog,
    engine_ids,
    engine_spec,
    issue_filter_ids,
    source_flag_roots,
)
from .paths import CRAWLABLE_ROOT, REPO_ROOT


def _git_commit() -> str:
    proc = subprocess.run(
        ["git", "rev-parse", "--short", "HEAD"],
        cwd=REPO_ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    return proc.stdout.strip() if proc.returncode == 0 else "unknown"


def _worktree_dirty() -> bool:
    proc = subprocess.run(
        ["git", "status", "--porcelain"],
        cwd=REPO_ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    return bool(proc.stdout.strip()) if proc.returncode == 0 else True


def _run_validator(script: Path) -> dict[str, Any]:
    if not script.exists():
        return {"ok": False, "stdout": "", "stderr": f"{script} not found", "returncode": 127}
    proc = subprocess.run(
        [sys.executable, str(script)],
        cwd=REPO_ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    return {"ok": proc.returncode == 0, "returncode": proc.returncode, "stdout": proc.stdout, "stderr": proc.stderr}


def graph_versions() -> list[dict[str, Any]]:
    commit = _git_commit()
    dirty = _worktree_dirty()
    versions: list[dict[str, Any]] = []

    for spec in ENGINE_SPECS.values():
        if not spec.artifact_root.exists() or not spec.facts_path.exists():
            continue
        meta, node_count = _graph_artifact_meta(spec.artifact_root)
        if node_count == 0:
            continue
        facts = json.loads(spec.facts_path.read_text(encoding="utf-8"))["facts"]
        validator_report = _run_validator(spec.validator_path) if spec.validator_path else {
            "ok": False,
            "stdout": "",
            "stderr": "no validator configured",
            "returncode": 127,
        }
        version_id = (
            meta.get("version_id")
            if spec.prefer_graph_version_meta and meta.get("version_id")
            else f"{spec.version_id_prefix}-{commit}"
        )
        record = {
            "version_id": version_id,
            "engine": spec.id,
            "engine_label": spec.label,
            "engine_family": spec.family,
            "runtime_kind": spec.runtime_kind,
            "line_of_business": spec.line_of_business,
            "product": spec.product,
            "status": meta.get("status", spec.status) if spec.prefer_graph_version_meta else spec.status,
            "valid_from": meta.get("valid_from", spec.valid_from) if spec.prefer_graph_version_meta else spec.valid_from,
            "valid_to": None,
            "source_version": spec.source_version,
            "built_from_commit": commit,
            "working_tree_dirty": dirty,
            "artifact_root": str(spec.artifact_root.relative_to(REPO_ROOT)),
            "facts_path": str(spec.facts_path.relative_to(REPO_ROOT)),
            "validator_report": validator_report,
            "node_count": node_count,
            "fact_count": len(facts),
        }
        if spec.orientation_label:
            record["legal_guardrail"] = spec.orientation_label
        versions.append(record)
    return versions


def _graph_artifact_meta(root: Path) -> tuple[dict[str, Any], int]:
    meta: dict[str, Any] = {}
    node_count = 0
    for path in sorted(root.glob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        node_count += len(data.get("nodes", []))
        meta = data.get("graph_version", meta)
    return meta, node_count


def engines() -> list[dict[str, Any]]:
    return engine_catalog()


def ledger_entries() -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    for path in sorted((CRAWLABLE_ROOT / "rulings").glob("*.md")):
        text = path.read_text(encoding="utf-8")
        front: dict[str, Any] = {}
        if text.startswith("---"):
            block = text.split("---", 2)[1]
            for line in block.splitlines():
                if ":" not in line:
                    continue
                key, value = line.split(":", 1)
                front[key.strip()] = value.strip().strip('"')
        entries.append(
            {
                "id": front.get("id", path.stem),
                "kind": front.get("kind", "unknown"),
                "status": front.get("status", "unknown"),
                "source_refs": front.get("source"),
                "path": str(path.relative_to(CRAWLABLE_ROOT)),
            }
        )
    return entries


def graph_nodes(engine: str) -> dict[str, Any]:
    """Read-only load of the executable graph artifacts for the reviewer UI.

    Does not mutate crawlable/graph*. Tags each node with the file it came from
    and returns the set of valid node ids so the UI can resolve cross-links.
    """
    spec = engine_spec(engine)
    graph_dir = spec.artifact_root

    files: list[dict[str, Any]] = []
    nodes: list[dict[str, Any]] = []
    outcomes: list[Any] = []
    reference_elements: list[Any] = []

    for path in sorted(graph_dir.glob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        file_nodes = data.get("nodes", [])
        files.append(
            {
                "file": path.name,
                "material_class": data.get("_material_class"),
                "note": data.get("_note"),
                "doc_conflicts": data.get("_doc_conflicts", []),
                "node_count": len(file_nodes),
            }
        )
        for node in file_nodes:
            node = dict(node)
            node["_file"] = path.name
            nodes.append(node)
        if isinstance(data.get("outcomes"), list):
            outcomes.extend(data["outcomes"])
        if isinstance(data.get("reference_elements"), list):
            reference_elements.extend(data["reference_elements"])

    return {
        "engine": engine,
        "engine_label": spec.label,
        "engine_family": spec.family,
        "runtime_kind": spec.runtime_kind,
        "node_ids": [n.get("id") for n in nodes],
        "files": files,
        "nodes": nodes,
        "outcomes": outcomes,
        "reference_elements": reference_elements,
    }


def issue_flags(engine: str = "all") -> dict[str, Any]:
    """Indexa incidencias de fuente/grafo/registro sin cambiar artefactos.

    Las alertas son solo objetivos de revisión. Un cambio de usuario debe convertirse
    en un borrador RUL/OVL gobernado y luego en una versión regenerada del grafo,
    nunca en una edición de fuente.
    """
    if engine not in issue_filter_ids():
        raise ValueError(f"engine debe ser uno de: {', '.join(sorted(issue_filter_ids()))}")

    items: list[dict[str, Any]] = []
    if engine != "source":
        items.extend(_ledger_flag_items())

    graph_engines = engine_ids() if engine == "all" else ([engine] if engine in ENGINE_SPECS else [])
    for graph_engine in graph_engines:
        data = graph_nodes(graph_engine)
        for file_info in data["files"]:
            for idx, conflict in enumerate(file_info.get("doc_conflicts") or []):
                items.append(
                    _flag_item(
                        category="graph_doc_conflict",
                        engine=graph_engine,
                        target=f"{file_info['file']}#doc_conflicts[{idx}]",
                        title=f"{file_info['file']} document conflict",
                        summary=_brief(conflict),
                        status="open",
                        ledger_ref=_ledger_ref(conflict),
                        source=file_info["file"],
                    )
                )
        for node in data["nodes"]:
            node_id = str(node.get("id", "unknown"))
            conflict = node.get("conflict")
            if conflict:
                items.append(
                    _flag_item(
                        category="node_conflict",
                        engine=graph_engine,
                        target=node_id,
                        title=str(node.get("title") or node_id),
                        summary=_brief(conflict.get("summary") if isinstance(conflict, dict) else conflict),
                        status=conflict.get("status", "open") if isinstance(conflict, dict) else "open",
                        ledger_ref=_ledger_ref(conflict),
                        source=node.get("source_quote"),
                        node_id=node_id,
                    )
                )
            for key in ("row_conflict_ref", "boundary_conflict_ref"):
                if node.get(key):
                    items.append(
                        _flag_item(
                            category=key,
                            engine=graph_engine,
                            target=node_id,
                            title=str(node.get("title") or node_id),
                            summary=f"{key}: {node[key]}",
                            status="open",
                            ledger_ref=_ledger_ref(node[key]),
                            source=node.get("source_quote"),
                            node_id=node_id,
                        )
                    )
            for key in ("flag", "flags", "band_boundary_flag", "conflict_flag", "inconsistency_flag"):
                if node.get(key):
                    items.append(
                        _flag_item(
                            category=key,
                            engine=graph_engine,
                            target=node_id,
                            title=str(node.get("title") or node_id),
                            summary=_brief(node[key]),
                            status="open",
                            source=node.get("source_quote"),
                            node_id=node_id,
                        )
                    )
    if engine in {"all", "source"}:
        items.extend(_source_flag_items())

    order = {"open": 0, "source_observed": 1, "unknown": 2, "ruled": 3, "approved": 3}
    items.sort(key=lambda item: (order.get(item["status"], 2), item["category"], item["id"]))
    return {
        "engine": engine,
        "summary": {
            "total": len(items),
            "open": sum(1 for item in items if item["status"] == "open"),
            "source_observed": sum(1 for item in items if item["status"] == "source_observed"),
            "ledger": sum(1 for item in items if item["category"] == "ledger"),
            "graph": sum(1 for item in items if item["category"].startswith("node_") or item["category"].startswith("graph_")),
        },
        "items": items,
    }


def _ledger_flag_items() -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for entry in ledger_entries():
        if entry["id"] == "README":
            continue
        detail = ledger_entry(entry["id"])
        title = _first_heading(detail["body"]) or entry["id"]
        items.append(
            _flag_item(
                category="ledger",
                engine="ledger",
                target=entry["id"],
                title=title,
                summary=_first_body_sentence(detail["body"]),
                status=entry.get("status", "unknown"),
                ledger_ref=entry["path"],
                source=entry.get("source_refs"),
            )
        )
    return items


def _source_flag_items() -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for root in source_flag_roots():
        paths = [root] if root.is_file() else sorted(root.glob("*.json"))
        for path in paths:
            if not path.exists() or path.name.startswith("base_policy"):
                # base_policy is large and its source issues are already surfaced
                # through the coverage graph and ledger.
                continue
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                continue
            rel = str(path.relative_to(REPO_ROOT))
            for json_path, key, value in _walk_flag_fields(data):
                items.append(
                    _flag_item(
                        category=f"source_{key}",
                        engine="source",
                        target=f"{rel}{json_path}",
                        title=f"{rel} · {key}",
                        summary=_brief(value),
                        status="source_observed",
                        source=rel,
                    )
                )
    return items


def _walk_flag_fields(value: Any, path: str = "") -> list[tuple[str, str, Any]]:
    found: list[tuple[str, str, Any]] = []
    if isinstance(value, dict):
        for key, child in value.items():
            child_path = f"{path}.{key}" if path else f".{key}"
            low = key.lower()
            is_flag = (
                low in {"flag", "flags", "conflict", "conflicts", "structural_inconsistencies"}
                or low.endswith("_flag")
                or "conflict" in low
            )
            if is_flag and child not in (None, False, [], {}):
                found.append((child_path, key, child))
            if isinstance(child, (dict, list)):
                found.extend(_walk_flag_fields(child, child_path))
    elif isinstance(value, list):
        for idx, child in enumerate(value):
            if isinstance(child, (dict, list)):
                found.extend(_walk_flag_fields(child, f"{path}[{idx}]"))
    return found


def _flag_item(
    *,
    category: str,
    engine: str,
    target: str,
    title: str,
    summary: str,
    status: str,
    source: Any = None,
    ledger_ref: Optional[str] = None,
    node_id: Optional[str] = None,
) -> dict[str, Any]:
    raw_id = f"{category}|{engine}|{target}|{ledger_ref or ''}|{summary}"
    return {
        "id": "FLAG-" + hashlib.sha1(raw_id.encode("utf-8")).hexdigest()[:10].upper(),
        "category": category,
        "engine": engine,
        "target": target,
        "node_id": node_id,
        "title": title,
        "summary": summary,
        "status": status or "unknown",
        "source": source,
        "ledger_ref": ledger_ref,
    }


def _ledger_ref(value: Any) -> Optional[str]:
    if isinstance(value, dict):
        return value.get("ledger_ref") or value.get("ref")
    if isinstance(value, str):
        return value
    return None


def _brief(value: Any, limit: int = 420) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        text = value
    else:
        text = json.dumps(value, ensure_ascii=False, sort_keys=True)
    text = " ".join(text.split())
    return text if len(text) <= limit else text[: limit - 1] + "…"


def _first_heading(body: str) -> Optional[str]:
    for line in body.splitlines():
        line = line.strip()
        if line.startswith("#"):
            return line.lstrip("#").strip()
    return None


def _first_body_sentence(body: str) -> str:
    for line in body.splitlines():
        line = line.strip()
        if line and not line.startswith("#") and not line.startswith("---"):
            return _brief(line)
    return ""


def ledger_entry(entry_id: str) -> dict[str, Any]:
    """Contenido completo de una entrada individual del registro de dictámenes."""
    safe = entry_id.replace("/", "").replace("..", "")
    path = CRAWLABLE_ROOT / "rulings" / f"{safe}.md"
    if not path.exists():
        raise ValueError(f"entrada de registro no encontrada: {entry_id}")
    text = path.read_text(encoding="utf-8")
    front: dict[str, Any] = {}
    body = text
    if text.startswith("---"):
        parts = text.split("---", 2)
        for line in parts[1].splitlines():
            if ":" in line:
                key, value = line.split(":", 1)
                front[key.strip()] = value.strip().strip('"')
        body = parts[2].strip() if len(parts) > 2 else ""
    return {
        "id": front.get("id", path.stem),
        "frontmatter": front,
        "body": body,
        "path": str(path.relative_to(CRAWLABLE_ROOT)),
    }


def fact_definitions(engine: str) -> dict[str, Any]:
    return json.loads(engine_spec(engine).facts_path.read_text(encoding="utf-8"))["facts"]
