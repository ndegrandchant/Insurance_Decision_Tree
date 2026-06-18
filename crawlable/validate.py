#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
crawlable/validate.py — mechanical validator (node_schema.md §9.5).

Extends verification_report.md from "matches source" to "executes deterministically".
Exit 0 = green. Prints every ERROR (fails the build) and WARNING (advisory).

Checks:
 1  node has id(unique), type, process, source, source_quote, _origin
 2  every fact in needs_facts / evaluate / branches / exception is defined in facts.json
 3  every @tables.<id>.<key> resolves in tables.json
 4  every referral_target / branch.target resolves (node id | known process | known line)
 5  every outcome in OUTCOMES
 6  every router/gate (and any branches node) has hit_policy + on_no_match (gate/router)
 7  no order collision within a process; no unreachable node
 8  every bracket_map partitions its domain under hit_policy, or each gap/overlap edge is in
    boundary_conflicts with a resolvable ledger_ref
 9  every conflict.ledger_ref / boundary_conflicts[].ledger_ref points to an existing rulings/ file
10  JSONLogic uses only the allowed operators; 'in' 2nd arg is a list (literal or @tables.*.values)
"""
import json, os, glob, sys
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")  # print UTF-8 regardless of locale (avoids UnicodeEncodeError on —/✓/→/accents)


ROOT = os.path.dirname(os.path.abspath(__file__))
OUTCOMES = {"eligible", "conditional_eligible", "decline", "refer_authority", "refer_process", "refer_line"}
NODE_TYPES = {"router", "gate", "condition", "authority", "referral", "accumulator", "terminal"}
PROCESSES = {"standard", "automatica", "case_underwriting", "masiva", "licitaciones", "all",
             "renovacion", "retroactividad", None}
LINES = {"ingenieria", "responsabilidad_civil", "seguros_personales"}
COMMITTEES = {"comite_riesgos_siniestros"}
ALLOWED_OPS = {"var", "==", "!=", ">", ">=", "<", "<=", "and", "or", "!", "in"}

errors, warnings = [], []
def err(m): errors.append(m)
def warn(m): warnings.append(m)

# ---- load ----
nodes = {}
for path in sorted(glob.glob(os.path.join(ROOT, "graph", "*.json"))):
    data = json.load(open(path, encoding="utf-8"))
    for n in data.get("nodes", []):
        if n["id"] in nodes:
            err(f"[1] duplicate node id {n['id']}")
        nodes[n["id"]] = n
facts = json.load(open(os.path.join(ROOT, "facts.json"), encoding="utf-8"))["facts"]
tables = {}
for _tp in sorted(glob.glob(os.path.join(ROOT, "tables*.json"))):
    for _k, _v in json.load(open(_tp, encoding="utf-8")).items():
        if not _k.startswith("_"):
            tables[_k] = _v
ledger_files = {os.path.basename(p) for p in glob.glob(os.path.join(ROOT, "rulings", "*"))}

# entry node (min order) per built process — refer_process to a process resolves to its entry
proc_entry = {}
for _n in nodes.values():
    _p = _n.get("process")
    if _p in (None,):
        continue
    if _p not in proc_entry or _n.get("order", 0) < nodes[proc_entry[_p]].get("order", 0):
        proc_entry[_p] = _n["id"]
def resolve_target(t):
    """A branch/referral target may be a node id or a (built) process name -> its entry node."""
    if t in nodes:
        return t
    return proc_entry.get(t)

def ledger_ok(ref):
    return ref and ref.startswith("rulings/") and os.path.basename(ref) in ledger_files

def tables_ref_ok(path):
    # path like "@tables.limits.valor_max_standard_bob" or "@tables.allowlist_importadores.values"
    parts = path.split(".")
    if len(parts) < 3 or parts[0] != "@tables":
        return False
    tid = parts[1]
    t = tables.get(tid)
    if not t:
        return False
    if t.get("role") == "scalar_group":
        return parts[2] in t.get("keys", {})
    if t.get("role") == "allowlist":
        return parts[2] == "values"
    return False

# ---- JSONLogic walk ----
def walk(expr, on_var, on_in_secondarg=None, op_seen=None):
    if not isinstance(expr, dict):
        return
    for op, arg in expr.items():
        if op_seen is not None:
            op_seen.add(op)
        if op == "var":
            key = arg if isinstance(arg, str) else None
            if key is not None:
                on_var(key)
            else:
                walk(arg, on_var, on_in_secondarg, op_seen)
        elif op == "in":
            walk(arg[0], on_var, on_in_secondarg, op_seen)
            if on_in_secondarg:
                on_in_secondarg(arg[1])
            walk(arg[1], on_var, on_in_secondarg, op_seen)
        else:
            items = arg if isinstance(arg, list) else [arg]
            for a in items:
                walk(a, on_var, on_in_secondarg, op_seen)

def check_expr(expr, ctx_label, node_id):
    op_seen = set()
    def on_var(key):
        if key.startswith("@tables."):
            if not tables_ref_ok(key):
                err(f"[3] {node_id}: @tables ref does not resolve: {key} ({ctx_label})")
        elif key not in facts:
            err(f"[2] {node_id}: fact '{key}' not defined in facts.json ({ctx_label})")
    def on_in_secondarg(second):
        ok = isinstance(second, list) or (isinstance(second, dict) and second.get("var", "").endswith(".values"))
        if not ok:
            err(f"[10] {node_id}: 'in' second arg must be a list or @tables.*.values ({ctx_label}) -> {second}")
    walk(expr, on_var, on_in_secondarg, op_seen)
    bad = op_seen - ALLOWED_OPS
    if bad:
        err(f"[10] {node_id}: unsupported operator(s) {bad} ({ctx_label})")

# ---- per-node checks ----
proc_orders = {}
for nid, n in nodes.items():
    # (1)
    for f in ("id", "type", "source", "source_quote", "_origin"):
        if f not in n:
            err(f"[1] {nid}: missing required field '{f}'")
    if n.get("type") not in NODE_TYPES:
        err(f"[1] {nid}: bad type {n.get('type')}")
    if n.get("process") not in PROCESSES:
        err(f"[1] {nid}: bad process {n.get('process')}")
    src = n.get("source", {})
    if "version" not in src:
        err(f"[1] {nid}: source.version missing (S1 mandatory)")
    # order collisions (2 nodes same process+order)
    if n.get("type") != "router":
        key = (n.get("process"), n.get("order"))
        proc_orders.setdefault(key, []).append(nid)

    # (2/3/10) expressions
    if "evaluate" in n:
        check_expr(n["evaluate"], "evaluate", nid)
    for b in n.get("branches", []):
        check_expr(b["when"], "branch.when", nid)
        # (5) branch outcome
        if b.get("outcome") not in OUTCOMES:
            err(f"[5] {nid}: branch outcome '{b.get('outcome')}' not in OUTCOMES")
        # (4) branch target
        tgt = b.get("target")
        if b.get("outcome") in ("refer_process", "refer_line") and tgt:
            if not (tgt in nodes or tgt in PROCESSES or tgt in LINES):
                err(f"[4] {nid}: branch target '{tgt}' unresolved")
    exc = n.get("exception", {})
    for c in exc.get("conditions", []):
        check_expr(c, "exception.condition", nid)
    for case in exc.get("cases", []):
        check_expr(case["applies_when"], f"exception.case[{case.get('case')}]", nid)
        if case.get("on_lift_outcome") not in OUTCOMES:
            err(f"[5] {nid}: case on_lift_outcome '{case.get('on_lift_outcome')}' not in OUTCOMES")
    for k in ("on_lift_outcome", "no_lift_outcome"):
        if k in exc and exc[k] not in OUTCOMES:
            err(f"[5] {nid}: exception.{k} '{exc[k]}' not in OUTCOMES")

    # (5) node outcome
    if "outcome" in n and n["outcome"] not in OUTCOMES:
        err(f"[5] {nid}: outcome '{n['outcome']}' not in OUTCOMES")

    # (2) needs_facts defined
    for f in n.get("needs_facts", []):
        if f not in facts:
            err(f"[2] {nid}: needs_facts '{f}' not in facts.json")

    # (4) referral_target
    rt = n.get("referral_target")
    if rt:
        name = rt.get("name")
        if not (name in nodes or name in PROCESSES or name in LINES or name in COMMITTEES):
            err(f"[4] {nid}: referral_target '{name}' unresolved")

    # authority node specifics: matrix resolves (matrix_lookup), outcomes/facts valid
    if n["type"] == "authority":
        mt = tables.get(n.get("matrix"))
        if not mt or mt.get("role") != "matrix_lookup":
            err(f"[3] {nid}: authority matrix '{n.get('matrix')}' missing or not role matrix_lookup")
        for k in ("exceeds_outcome", "unknown_key_outcome"):
            if n.get(k) and n[k] not in OUTCOMES:
                err(f"[5] {nid}: authority {k} '{n.get(k)}' not in OUTCOMES")
        if n.get("lookup_by") not in facts:
            err(f"[2] {nid}: authority lookup_by '{n.get('lookup_by')}' not in facts.json")
        for c in n.get("constraints", []):
            if c.get("fact") not in facts:
                err(f"[2] {nid}: authority constraint fact '{c.get('fact')}' not in facts.json")

    # (6) hit_policy / on_no_match
    if n["type"] in ("router", "gate"):
        if "on_no_match" not in n:
            err(f"[6] {nid}: {n['type']} missing on_no_match")
        if n["type"] == "router" and "hit_policy" not in n:
            err(f"[6] {nid}: router missing hit_policy")
    if "branches" in n and "hit_policy" not in n:
        err(f"[6] {nid}: node with branches missing hit_policy")
    # gate on_no_match target resolves
    onm = n.get("on_no_match")
    if onm is not None and not (onm in nodes or onm in OUTCOMES):
        err(f"[4] {nid}: on_no_match '{onm}' is neither a node id nor an OUTCOME")

    # (9) conflict ledger refs
    conf = n.get("conflict")
    if conf and conf.get("status") == "open":
        if not ledger_ok(conf.get("ledger_ref")):
            err(f"[9] {nid}: conflict.ledger_ref does not exist: {conf.get('ledger_ref')}")

# (7) order collisions
for (p, o), ids in proc_orders.items():
    if len(ids) > 1:
        err(f"[7] order collision in process {p} at order {o}: {ids}")

# ---- table checks (8/9) ----
def bracket_partition_ok(t):
    """Under hit_policy 'unique' the rows must neither OVERLAP nor leave a GAP, unless the problem
       edge is declared in boundary_conflicts (-> ledger).
       - Overlap (O2 fix) is inclusivity-aware: two rows that both *include* a shared endpoint DO
         overlap; rows that merely touch where at least one side excludes the point do not.
       - Gap (O1 fix) is detected between consecutive rows (sorted by lower): a RANGE gap whose
         width exceeds the table's `granularity` (default 0 = continuous; money tables set 0.01 so
         adjacent centavos like 10500.00 / 10500.01 are not a gap), or a POINT gap where two rows
         touch but both EXCLUDE the shared endpoint (e.g. the siniestralidad 60/150/250 edges).
       Edges are compared numerically; see O11 (boundary_conflicts edges are numeric)."""
    INF = float("inf")
    declared = {bc.get("edge") for bc in t.get("boundary_conflicts", [])}
    gran = t.get("granularity", 0)
    rows = t["rows"]
    problems = []
    def lo(r): return -INF if r.get("lower") is None else r.get("lower")
    def hi(r): return INF if r.get("upper") is None else r.get("upper")
    # --- O2: inclusivity-aware overlap (the two rows share >= 1 point) ---
    for i in range(len(rows)):
        for j in range(i + 1, len(rows)):
            a, b = rows[i], rows[j]
            aL, aH, bL, bH = lo(a), hi(a), lo(b), hi(b)
            a_left = aH < bL or (aH == bL and not (a.get("upper_inclusive") and b.get("lower_inclusive")))
            b_left = bH < aL or (bH == aL and not (b.get("upper_inclusive") and a.get("lower_inclusive")))
            if not (a_left or b_left):
                edge = max(aL, bL)
                if edge not in declared:
                    problems.append(f"rows {i}&{j} overlap near {edge} (undeclared)")
    # --- O1: gaps between consecutive rows ---
    order = sorted(range(len(rows)), key=lambda k: lo(rows[k]))
    for k in range(len(order) - 1):
        prev, cur = rows[order[k]], rows[order[k + 1]]
        pu, cl = hi(prev), lo(cur)
        if pu == INF:
            continue  # prev unbounded above; any real overlap is caught above
        if pu < cl:  # range gap (pu, cl) — epsilon guards float noise (10500.01-10500 != exactly 0.01)
            if (cl - pu) - gran > 1e-9 and pu not in declared and cl not in declared:
                problems.append(f"gap ({pu},{cl}) between rows {order[k]}&{order[k+1]} (undeclared)")
        elif pu == cl:  # rows touch at pu
            if not (prev.get("upper_inclusive") or cur.get("lower_inclusive")) and pu not in declared:
                problems.append(f"point gap at {pu} between rows {order[k]}&{order[k+1]} (undeclared)")
    return problems

for tid, t in tables.items():
    if t.get("role") != "bracket_map":
        continue
    for r in t.get("rows", []):
        for k in ("lower_inclusive", "upper_inclusive"):
            if k not in r:
                err(f"[8] {tid}: row missing {k} (boundary inclusivity is mandatory): {r.get('source_quote')}")
    probs = bracket_partition_ok(t)
    for p in probs:
        err(f"[8] {tid}: {p} — not in boundary_conflicts")
    for bc in t.get("boundary_conflicts", []):
        if not ledger_ok(bc.get("ledger_ref")):
            err(f"[9] {tid}: boundary_conflicts ledger_ref does not exist: {bc.get('ledger_ref')}")

# (9) matrix_lookup cross_table_conflicts ledger refs
for tid, t in tables.items():
    if t.get("role") == "matrix_lookup":
        for ctc in t.get("cross_table_conflicts", []):
            if not ledger_ok(ctc.get("ledger_ref")):
                err(f"[9] {tid}: cross_table_conflicts ledger_ref does not exist: {ctc.get('ledger_ref')}")

# ---- reachability (7) ----
def successors(n):
    out = set()
    onm = n.get("on_no_match")
    if onm in nodes:
        out.add(onm)
    for b in n.get("branches", []):
        r = resolve_target(b.get("target"))
        if r:
            out.add(r)
    rt = n.get("referral_target")
    if rt:
        r = resolve_target(rt.get("name"))
        if r:
            out.add(r)
    # advance / fall-through -> next in same process by order
    same = sorted([m for m in nodes.values() if m.get("process") == n.get("process") and m.get("type") != "router"],
                  key=lambda m: m.get("order", 0))
    for m in same:
        if m.get("order", 0) > n.get("order", 0):
            out.add(m["id"]); break
    return out

# roots: the process router + every process's entry node (a crawl may enter any process flow
# directly — e.g. renovacion/retroactividad are triggered by their own events, not routed to).
roots = ["root.process_router"] + [n for n in proc_entry.values() if n in nodes]
reach, stack = set(), list(dict.fromkeys(roots))
while stack:
    cur = stack.pop()
    if cur in reach or cur not in nodes:
        continue
    reach.add(cur)
    stack.extend(successors(nodes[cur]))
for nid in nodes:
    if nid not in reach:
        err(f"[7] unreachable node: {nid}")

# ---- required_by soft cross-check (advisory; required_by is a documentation impact-index,
# not an execution invariant — the load-bearing direction needs_facts->defined is checked above).
# Warn only on STALE pointers (a real defect); incompleteness is fixed by sync_facts.py. ----
graph_readers = {}
for nid, n in nodes.items():
    for f in n.get("needs_facts", []):
        graph_readers.setdefault(f, set()).add(nid)
for fid, spec in facts.items():
    for nid in spec.get("required_by", []):
        if nid not in nodes:
            warn(f"fact '{fid}'.required_by names a non-existent node: {nid} (stale — run sync_facts.py)")
    missing = graph_readers.get(fid, set()) - set(spec.get("required_by", []))
    if missing:
        warn(f"fact '{fid}'.required_by missing {sorted(missing)} (run sync_facts.py to regenerate)")

# ---- reference.json (non-branch captured rules): each has _origin + source_quote ----
ref_count = 0
_refp = os.path.join(ROOT, "reference.json")
if os.path.exists(_refp):
    for rr in json.load(open(_refp, encoding="utf-8")).get("rules", []):
        ref_count += 1
        if not rr.get("source_quote"):
            err(f"[1] reference rule {rr.get('id')}: missing source_quote")
        if not rr.get("_origin"):
            err(f"[1] reference rule {rr.get('id')}: missing _origin")

# ---- clause-side capture files: each record carries _origin ----
cap_count = 0
for capfn, listkey in [("clauses.json", "clauses"), ("base_policy_ref.json", "elements"),
                       ("linkage_edges.json", "edges"), ("crossrefs.json", "references")]:
    cp = os.path.join(ROOT, capfn)
    if os.path.exists(cp):
        for rec in json.load(open(cp, encoding="utf-8")).get(listkey, []):
            cap_count += 1
            if not rec.get("_origin"):
                err(f"[1] {capfn}: a record is missing _origin")

# ---- report ----
_rulings = sum(1 for _f in ledger_files if _f.startswith("RUL-"))
print(f"validate.py — {len(nodes)} nodes, {len(facts)} facts, {len(tables)} tables, "
      f"{ref_count} reference rules, {cap_count} clause-side records, {_rulings} conflict rulings")
for w in warnings:
    print("  WARN ", w)
for e in errors:
    print("  ERROR", e)
print(f"\n{'GREEN — 0 errors' if not errors else 'RED — ' + str(len(errors)) + ' error(s)'}"
      + (f", {len(warnings)} warning(s)" if warnings else ""))
sys.exit(1 if errors else 0)
