#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Validate the reusable coverage graph slice.

This is intentionally parallel to validate.py, but scoped to graph_coverage/ and
facts_coverage.json so the existing UW graph contract remains unchanged.
"""

import glob
import json
import os
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = os.path.dirname(os.path.abspath(__file__))
NODE_TYPES = {
    "coverage-grant",
    "condition",
    "document-duty",
    "exclusion-check",
    "clause-modifier",
    "limit-deductible",
    "terminal",
}
OUTCOMES = {
    "likely_covered",
    "not_covered",
    "conditionally_covered",
    "partially_covered",
    "missing_fact",
    "missing_document",
    "refer_adjuster",
    "refer_legal",
    "conflict_escalation",
}
ALLOWED_OPS = {"var", "==", "!=", ">", ">=", "<", "<=", "and", "or", "!", "in"}

errors, warnings = [], []


def err(msg):
    errors.append(msg)


def warn(msg):
    warnings.append(msg)


facts_path = os.path.join(ROOT, "facts_coverage.json")
if not os.path.exists(facts_path):
    err("facts_coverage.json missing")
    facts = {}
else:
    facts = json.load(open(facts_path, encoding="utf-8")).get("facts", {})

nodes = {}
reference_elements = []
declared_outcomes = set()
for path in sorted(glob.glob(os.path.join(ROOT, "graph_coverage", "*.json"))):
    data = json.load(open(path, encoding="utf-8"))
    declared_outcomes |= set(data.get("outcomes", []))
    for node in data.get("nodes", []):
        if node.get("id") in nodes:
            err(f"duplicate node id {node.get('id')}")
        nodes[node.get("id")] = node
    reference_elements.extend(data.get("reference_elements", []))

ledger_files = {os.path.basename(p) for p in glob.glob(os.path.join(ROOT, "rulings", "*.md"))}


def ledger_ok(ref):
    return ref and ref.startswith("rulings/") and os.path.basename(ref) in ledger_files


def walk(expr, on_var, op_seen):
    if not isinstance(expr, dict):
        return
    for op, arg in expr.items():
        op_seen.add(op)
        if op == "var":
            if isinstance(arg, str):
                on_var(arg)
            else:
                walk(arg, on_var, op_seen)
        elif op == "in":
            walk(arg[0], on_var, op_seen)
            if isinstance(arg[1], dict):
                walk(arg[1], on_var, op_seen)
            elif not isinstance(arg[1], list):
                err(f"'in' second arg must be list or var expression: {arg[1]}")
        else:
            items = arg if isinstance(arg, list) else [arg]
            for item in items:
                walk(item, on_var, op_seen)


def check_expr(expr, node_id):
    seen = set()

    def on_var(fid):
        if fid not in facts:
            err(f"{node_id}: fact '{fid}' not defined in facts_coverage.json")

    walk(expr, on_var, seen)
    bad = seen - ALLOWED_OPS
    if bad:
        err(f"{node_id}: unsupported JSONLogic operators {sorted(bad)}")


for outcome in declared_outcomes:
    if outcome not in OUTCOMES:
        err(f"declared outcome not allowed: {outcome}")

orders = {}
for node_id, node in nodes.items():
    for field in ("id", "type", "order", "applies_to", "title", "needs_facts", "source_quote", "source", "_origin"):
        if field not in node:
            err(f"{node_id}: missing required field {field}")
    if node.get("type") not in NODE_TYPES:
        err(f"{node_id}: bad node type {node.get('type')}")
    if node.get("outcome") and node["outcome"] not in OUTCOMES:
        err(f"{node_id}: bad outcome {node['outcome']}")
    if "evaluate" in node:
        check_expr(node["evaluate"], node_id)
    for fid in node.get("needs_facts", []):
        if fid not in facts:
            err(f"{node_id}: needs_facts '{fid}' not defined")
    if not node.get("source", {}).get("version"):
        err(f"{node_id}: source.version missing")
    origin = node.get("_origin", {})
    if not origin.get("artifact") or not origin.get("path") or not origin.get("source_id"):
        err(f"{node_id}: _origin must include artifact/path/source_id")
    conf = node.get("conflict")
    if conf and conf.get("status") == "open" and not ledger_ok(conf.get("ledger_ref")):
        err(f"{node_id}: conflict ledger_ref missing: {conf.get('ledger_ref')}")
    key = (tuple(node.get("applies_to", [])), node.get("order"))
    orders.setdefault(key, []).append(node_id)

for key, ids in orders.items():
    if len(ids) > 1:
        warn(f"shared order {key}: {ids} (allowed, but check intended ordering by id)")

for ref in reference_elements:
    for field in ("source_id", "status", "source_quote", "_origin"):
        if field not in ref:
            err(f"reference element missing {field}: {ref}")
    if ref.get("status") not in {"reference", "ledger", "deferred", "excluded"}:
        err(f"bad reference status {ref.get('status')} for {ref.get('source_id')}")

print(
    f"coverage_validate.py — {len(nodes)} nodes, {len(facts)} facts, "
    f"{len(reference_elements)} reference elements, {sum(1 for f in ledger_files if f.startswith('RUL-'))} rulings"
)
for warning in warnings:
    print("  WARN ", warning)
for error in errors:
    print("  ERROR", error)
print(f"\n{'GREEN — 0 errors' if not errors else 'RED — ' + str(len(errors)) + ' error(s)'}" + (f", {len(warnings)} warning(s)" if warnings else ""))
sys.exit(1 if errors else 0)
