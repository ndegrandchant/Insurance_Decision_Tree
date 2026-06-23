"""Overlays de renovación acotados a cliente.

Los overlays de renovación son deltas contra una versión inmutable del grafo.
No editan la verdad fuente ni los artefactos generados del grafo.
"""

from __future__ import annotations

import hashlib
import json
import uuid
from datetime import date
from pathlib import Path
from typing import Any, Callable

from .lbc_auto_rating import quote_lbc_auto_price
from .paths import REPO_ROOT


TARGET_TYPES = {"node", "table", "clause", "fact", "rating_factor", "coverage_term"}
CHANGE_TYPES = {
    "price_adjustment",
    "threshold_override",
    "routing_override",
    "eligibility_exception",
    "coverage_exception",
    "fact_override",
    "note_only",
}


def renewal_schema() -> dict[str, Any]:
    return {
        "storage_model": "base_graph_version + scoped_delta",
        "source_truth_unchanged": True,
        "target_types": sorted(TARGET_TYPES),
        "change_types": sorted(CHANGE_TYPES),
        "required": ["client_id", "policy_id", "rating_facts"],
        "note": "Los cambios de nodo son overlays acotados a cliente/póliza. No parchean crawlable/graph ni representation/.",
    }


def build_renewal_preview(
    body: dict[str, Any],
    *,
    versions: list[dict[str, Any]],
    graph_lookup: Callable[[str], dict[str, dict[str, Any]]],
) -> dict[str, Any]:
    client_id = _required_text(body, "client_id")
    policy_id = _required_text(body, "policy_id")
    engine = str(body.get("engine") or "uw").strip() or "uw"
    base_version = _select_version(body, versions, engine)
    base_graph_version_id = base_version["version_id"]

    pricing = _pricing_preview(body)
    node_changes = _normalize_changes(body.get("node_overrides") or body.get("overrides") or [], engine, graph_lookup)

    core = {
        "renewal_id": body.get("renewal_id") or f"REN-PREVIEW-{uuid.uuid4().hex[:8].upper()}",
        "status": body.get("status") or "draft",
        "client_id": client_id,
        "policy_id": policy_id,
        "renewal_date": body.get("renewal_date") or date.today().isoformat(),
        "engine": engine,
        "base_graph_version_id": base_graph_version_id,
        "base_graph_status": base_version.get("status"),
        "base_graph_commit": base_version.get("built_from_commit"),
        "source_version": base_version.get("source_version"),
        "application_model": "ejecutar la versión base del grafo y luego aplicar solo deltas aprobados acotados a cliente/póliza",
        "source_truth_unchanged": True,
        "graph_artifacts_unchanged": True,
        "pricing": pricing,
        "node_overrides": node_changes,
        "caveats": [
            "Este overlay de renovación está acotado a un cliente/póliza y no altera la extracción del manual.",
            "Los cambios del grafo ejecutable que deban aplicar ampliamente todavía deben pasar por gobernanza RUL/OVL y regeneración.",
        ],
    }
    return {**core, "storage_estimate": _storage_estimate(core, base_version)}


def _pricing_preview(body: dict[str, Any]) -> dict[str, Any]:
    rating_facts = body.get("rating_facts") or body.get("pricing_facts") or body.get("facts") or {}
    quote = quote_lbc_auto_price(rating_facts) if rating_facts else None
    current_premium = _optional_number(body.get("current_premium_bob"))
    base_premium = quote["annual_premium_bob"] if quote else current_premium
    adjustment_percent = _optional_number(
        body.get("price_adjustment_percent")
        if "price_adjustment_percent" in body
        else body.get("renewal_adjustment_percent"),
        default=0.0,
    )
    if base_premium is None:
        raise ValueError("rating_facts o current_premium_bob es requerido")
    adjusted = round(base_premium * (1 + adjustment_percent / 100), 2)
    return {
        "base_annual_premium_bob": round(base_premium, 2),
        "adjustment_percent": adjustment_percent,
        "adjusted_annual_premium_bob": adjusted,
        "delta_bob": round(adjusted - base_premium, 2),
        "rating_engine": quote.get("engine") if quote else "manual_current_premium",
        "demo_only": bool(quote.get("demo_only")) if quote else True,
        "reason": str(body.get("price_adjustment_reason") or body.get("reason") or "").strip(),
        "base_quote": quote,
    }


def _normalize_changes(
    changes: list[dict[str, Any]],
    engine: str,
    graph_lookup: Callable[[str], dict[str, dict[str, Any]]],
) -> list[dict[str, Any]]:
    if not isinstance(changes, list):
        raise ValueError("node_overrides debe ser una lista")
    graph = graph_lookup(engine)
    normalized = []
    for idx, item in enumerate(changes, start=1):
        if not isinstance(item, dict):
            raise ValueError("cada override de nodo debe ser un objeto")
        target_type = str(item.get("target_type") or "node").strip()
        change_type = str(item.get("change_type") or item.get("type") or "note_only").strip()
        if target_type not in TARGET_TYPES:
            raise ValueError(f"target_type no soportado '{target_type}'")
        if change_type not in CHANGE_TYPES:
            raise ValueError(f"change_type no soportado '{change_type}'")
        target_id = str(item.get("node_id") or item.get("target_id") or "").strip()
        if not target_id:
            raise ValueError("target_id/node_id del override de nodo es requerido")
        node = graph.get(target_id) if target_type == "node" else None
        patch = item.get("patch") or {
            "field": item.get("field"),
            "from": item.get("from"),
            "to": item.get("to"),
        }
        if not isinstance(patch, dict):
            raise ValueError("el patch del override debe ser un objeto")
        normalized.append(
            {
                "overlay_id": item.get("overlay_id") or f"OVR-{idx:03d}",
                "scope": "client_policy_renewal",
                "target_type": target_type,
                "target_id": target_id,
                "target_exists_in_base_graph": bool(node) if target_type == "node" else None,
                "base_node_title": node.get("title") if node else None,
                "base_node_digest": _digest(node) if node else None,
                "change_type": change_type,
                "patch": patch,
                "rationale": str(item.get("rationale") or "").strip(),
                "approval_status": item.get("approval_status") or "draft",
            }
        )
    return normalized


def _select_version(body: dict[str, Any], versions: list[dict[str, Any]], engine: str) -> dict[str, Any]:
    requested = body.get("base_graph_version_id") or body.get("graph_version_id")
    if requested:
        for version in versions:
            if version.get("version_id") == requested:
                return version
        raise ValueError(f"versión base del grafo '{requested}' no fue encontrada")
    matches = [v for v in versions if v.get("engine") == engine]
    if not matches:
        raise ValueError(f"no se encontró versión de grafo para el motor '{engine}'")
    return sorted(matches, key=lambda v: (v.get("status") != "published", v.get("valid_from") or ""))[0]


def _storage_estimate(record: dict[str, Any], base_version: dict[str, Any]) -> dict[str, Any]:
    delta_bytes = len(json.dumps(record, ensure_ascii=False, sort_keys=True).encode("utf-8"))
    artifact_root = base_version.get("artifact_root")
    full_graph_bytes = _dir_size(REPO_ROOT / artifact_root) if artifact_root else 0
    full_clone_bytes_for_one = full_graph_bytes + delta_bytes
    savings = 0.0
    if full_clone_bytes_for_one:
        savings = round((1 - (delta_bytes / full_clone_bytes_for_one)) * 100, 2)
    return {
        "model": "guardar solo delta",
        "delta_bytes": delta_bytes,
        "delta_kb": round(delta_bytes / 1024, 2),
        "base_graph_artifact_bytes": full_graph_bytes,
        "base_graph_artifact_kb": round(full_graph_bytes / 1024, 2),
        "full_clone_bytes_for_one_client": full_clone_bytes_for_one,
        "savings_vs_full_clone_percent": savings,
    }


def _dir_size(path: Path) -> int:
    if not path.exists():
        return 0
    if path.is_file():
        return path.stat().st_size
    return sum(p.stat().st_size for p in path.rglob("*") if p.is_file())


def _digest(value: Any) -> str | None:
    if value is None:
        return None
    payload = json.dumps(value, ensure_ascii=False, sort_keys=True).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()[:16]


def _required_text(body: dict[str, Any], key: str) -> str:
    value = str(body.get(key) or "").strip()
    if not value:
        raise ValueError(f"{key} es requerido")
    return value


def _optional_number(value: Any, default: float | None = None) -> float | None:
    if value is None or value == "":
        return default
    if isinstance(value, (int, float)):
        return float(value)
    try:
        return float(str(value).replace("%", "").strip())
    except ValueError as exc:
        raise ValueError("el valor numérico de renovación no es válido") from exc
