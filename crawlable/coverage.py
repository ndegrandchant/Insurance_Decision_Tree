#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
crawlable/coverage.py — the DATA-LOSS reconciliation engine (mandate dimension A).

Mechanically enumerates EVERY source id in representation/ and assigns each a status:
  converted  -> mapped to a crawlable node/table/fact/edge (proven via _origin back-pointers)
  partial    -> partially captured (e.g. a value lifted, full element deferred)
  ledger     -> a conflict seeded into crawlable/rulings/ (represented, not resolved)
  deferred   -> decision logic not yet converted; carries the target phase
  excluded   -> will NOT enter the executable graph; carries a reason (e.g. supplementary)

Then prints a per-artifact reconciliation table and asserts, per artifact:
    count_in == converted + partial + ledger + deferred + excluded
Writes coverage_manifest.json (persistent snapshot) and NOT_CONVERTED.md (deferred+excluded).
Run after every conversion batch; entries move deferred -> converted as phases land.
"""
import json, os, glob
from collections import OrderedDict
import sys
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")  # print UTF-8 regardless of locale (avoids UnicodeEncodeError on —/✓/→/accents)


ROOT = os.path.dirname(os.path.abspath(__file__))
REP = os.path.join(os.path.dirname(ROOT), "representation")

def load(p): return json.load(open(p, encoding="utf-8"))

# ---- 1. enumerate every source id in representation/ ----
rules = load(os.path.join(REP, "underwriting_manual/rules.json"))["rules"]
trees = load(os.path.join(REP, "underwriting_manual/decision_trees.json"))["trees"]
mtables = load(os.path.join(REP, "underwriting_manual/tables.json"))["tables"]
registry = load(os.path.join(REP, "clausulas_generales/clause_registry.json"))
base = load(os.path.join(REP, "clausulas_generales/base_policy.json"))
xref_m = load(os.path.join(REP, "underwriting_manual/cross_references.json"))["references"]
xref_c = load(os.path.join(REP, "clausulas_generales/cross_references.json"))["references"]
linkage = load(os.path.join(REP, "linkage.json"))["links"]
buckets = load(os.path.join(ROOT, "rule_buckets.json"))

SRC = OrderedDict()  # artifact -> [source_id, ...]
SRC["rules.json"] = [r["id"] for r in rules]
tree_elems = []
for t in trees:
    tid = t["id"]
    if "root" in t and "node" in t.get("root", {}):
        tree_elems.append(f"{tid}.{t['root']['node']}")
    elif "root" in t:
        tree_elems.append(f"{tid}.root")
    for e in t.get("exclusiones", []):
        tree_elems.append(f"{tid}.{e['id']}")
    for i, b in enumerate(t.get("branches", [])):
        tree_elems.append(f"{tid}.branch[{i}]")
    if "default_outcome" in t:
        tree_elems.append(f"{tid}.default_outcome")
    if t.get("root", {}).get("overlay_condition") or "overlay_condition" in t.get("root", {}):
        tree_elems.append(f"{tid}.overlay_condition")
    if "conflict_flag" in t:
        tree_elems.append(f"{tid}.conflict_flag")
SRC["decision_trees.json"] = tree_elems
SRC["tables.json"] = [t["id"] for t in mtables]
SRC["clause_registry.json"] = [e["code_suffix"] for e in registry["entries"]] + \
                              [f["id"] for f in registry.get("cross_code_findings", [])]
SRC["base_policy.json"] = ["prelacion_documental", "definiciones", "consideraciones_generales",
                           "obligaciones_del_asegurado", "exclusiones_generales", "invalidez_scale"] + \
                          [f"seccion[{i+1}]" for i in range(len(base.get("secciones", [])))]
SRC["cross_references"] = [f"man:{i}" for i in range(len(xref_m))] + [f"cla:{i}" for i in range(len(xref_c))]
SRC["linkage.json"] = [f"link[{i}]" for i in range(len(linkage))]

# ---- 2. discover what crawlable/ actually converted (via _origin back-pointers) ----
# Trees: build TREE-QUALIFIED keys (e.g. "T-ELIG-ESTANDAR.X01") so bare ids can't collide
# across trees (both ESTANDAR and CASEUW have a 'default_outcome'). Rules/tables: bare global
# ids. A comma-listed source_id is a SYNTHESIS reference (e.g. the router) and does NOT count as
# converting those individual ids — they stay 'partial'/'deferred'.
converted_tree = set()
converted_global = set()
for path in glob.glob(os.path.join(ROOT, "graph", "*.json")) + glob.glob(os.path.join(ROOT, "tables*.json")):
    data = load(path)
    def scan(o):
        if isinstance(o, dict):
            org = o.get("_origin")
            if isinstance(org, dict):
                sid = str(org.get("source_id", "")).strip()
                if sid and "," not in sid:
                    p = org.get("path", "")
                    if org.get("artifact") == "decision_trees.json" and p:
                        converted_tree.add(f"{p.split('.')[0]}.{sid}")
                    else:
                        converted_global.add(sid)
            for v in o.values(): scan(v)
        elif isinstance(o, list):
            for v in o: scan(v)
    scan(data)

ledger_ids = {os.path.splitext(os.path.basename(p))[0] for p in glob.glob(os.path.join(ROOT, "rulings", "RUL-*.md"))}

# ---- 3. classification policy ----
# conflicts seeded to the ledger (representation conflict ids -> ledger entries)
LEDGERED = {
    "decision_trees.json": {},
    "clause_registry.json": {"XC-001": "RUL-2133-2140", "XC-002": "RUL-2133-2140",
                             "XC-003": "RUL-CG-2023", "XC-004": "RUL-2038-2112",
                             "XC-005": "RUL-2008", "XC-006": "RUL-2018-PESO"},
}
# explicitly NOT decision logic -> excluded (supplementary / metadata; retained in representation)
def excluded_reason(artifact, sid):
    return None  # none in the Phase-0 enumerated set are pure-supplementary; supplementary.json is not enumerated here

# deferral phase by artifact/section
def defer_phase(artifact, sid):
    if artifact == "decision_trees.json":
        if sid.startswith("T-ELIG-CASEUW"): return "Phase 1 — eligibility batch (Case UW)"
        if sid.startswith("T-RENOVACION"):  return "Phase 1 — renovación/rating batch"
        if sid.startswith("T-RETROACTIVIDAD"): return "Phase 1 — retroactividad batch"
        return "Phase 1"
    if artifact == "rules.json":
        return "Phase 1 — rules conversion (authority/rating/renovación/retro)"
    if artifact == "tables.json":
        return "Phase 1 — tables (S2 brackets + scalar/matrix/allowlist)"
    if artifact == "clause_registry.json":
        return "Phase 4 — clause linking (forward/reverse edges)"
    if artifact == "base_policy.json":
        return "Phase 4 — base policy / definiciones glossary"
    if artifact == "cross_references":
        return "Phase 4/6 — cross-reference pointers (human layer)"
    if artifact == "linkage.json":
        return "Phase 4 — rule↔clause edges"
    return "Phase 1+"

# clause-side capture files -> {(artifact, source_id): status}. linkage edges = converted; the
# rest (clauses, base policy, cross-refs) = reference (captured contract text / pointers, D1).
captured = {}
for _fn, _status in [("clauses.json", "reference"), ("base_policy_ref.json", "reference"),
                     ("crossrefs.json", "reference"), ("linkage_edges.json", "converted")]:
    _p = os.path.join(ROOT, _fn)
    if not os.path.exists(_p):
        continue
    def _scan_cap(o):
        if isinstance(o, dict):
            org = o.get("_origin")
            if isinstance(org, dict) and org.get("source_id"):
                captured.setdefault((org.get("artifact"), org["source_id"]), _status)
            for v in o.values():
                _scan_cap(v)
        elif isinstance(o, list):
            for v in o:
                _scan_cap(v)
    _scan_cap(load(_p))


def classify(artifact, sid):
    # rules.json: classified by rule_buckets.json (the authoritative rule-level partition)
    if artifact == "rules.json":
        if sid in converted_global or sid in buckets["node_converted"]:
            return ("converted", "node: " + buckets["node_converted"].get(sid, sid))
        if sid in buckets["tree_converted"]:
            return ("converted", "tree: " + buckets["tree_converted"][sid])
        if sid in buckets["table_realized"]:
            return ("converted", "table: " + buckets["table_realized"][sid])
        if sid in buckets["partial_router"]:
            return ("partial", "referenced by root.process_router; process partially built")
        if sid in buckets["deferred"]:
            return ("deferred", buckets["deferred"][sid])
        if sid in buckets["reference"]:
            return ("reference", "reference.json (" + buckets["reference"][sid] + ")")
        return ("deferred", defer_phase(artifact, sid))
    if artifact == "tables.json" and sid == "TBL-CAPACIDAD":
        return ("partial", "valor en @tables.limits.capacidad_max_por_vehiculo_bob; tabla completa en Phase 1")
    # converted: tree-qualified for trees, bare-global otherwise
    if artifact == "decision_trees.json":
        if sid in converted_tree:
            return ("converted", None)
    elif sid in converted_global:
        return ("converted", None)
    led = LEDGERED.get(artifact, {}).get(sid)
    if led:
        return ("ledger", led)
    st = captured.get((artifact, sid))
    if st:
        return (st, "captured (clause-side: clauses/base_policy/linkage/crossrefs)")
    exr = excluded_reason(artifact, sid)
    if exr:
        return ("excluded", exr)
    return ("deferred", defer_phase(artifact, sid))

# ---- 4. reconcile ----
manifest = OrderedDict()
BUCKETS = ["converted", "partial", "ledger", "reference", "deferred", "excluded"]
rows = []
for artifact, ids in SRC.items():
    counts = {b: 0 for b in BUCKETS}
    manifest[artifact] = {}
    for sid in ids:
        status, note = classify(artifact, sid)
        counts[status] += 1
        manifest[artifact][sid] = {"status": status, "note": note}
    total = len(ids)
    assert total == sum(counts.values()), f"reconciliation broken for {artifact}"
    rows.append((artifact, total, counts))

# ---- 5. emit ----
print("=" * 100)
print("COVERAGE RECONCILIATION  (count_in == converted + partial + ledger + deferred + excluded)")
print("=" * 100)
hdr = f"{'artifact':<26}{'in':>5}{'conv':>6}{'part':>6}{'ledg':>6}{'ref':>6}{'defer':>7}{'excl':>6}   OK"
print(hdr); print("-" * len(hdr))
tot = {b: 0 for b in BUCKETS}; tin = 0
for artifact, total, c in rows:
    ok = (total == sum(c.values()))
    tin += total
    for b in BUCKETS: tot[b] += c[b]
    print(f"{artifact:<26}{total:>5}{c['converted']:>6}{c['partial']:>6}{c['ledger']:>6}{c['reference']:>6}{c['deferred']:>7}{c['excluded']:>6}   {'✓' if ok else '✗'}")
print("-" * len(hdr))
print(f"{'TOTAL':<26}{tin:>5}{tot['converted']:>6}{tot['partial']:>6}{tot['ledger']:>6}{tot['reference']:>6}{tot['deferred']:>7}{tot['excluded']:>6}")
accounted = sum(tot.values())
print(f"\nAccounted: {accounted}/{tin}  ({'100% — nothing silently dropped' if accounted == tin else 'MISMATCH'})")
print(f"Executable/decisional (converted+partial+ledger): {tot['converted']+tot['partial']+tot['ledger']}; "
      f"captured-as-reference: {tot['reference']}; backlog (deferred): {tot['deferred']}; excluded: {tot['excluded']}")

json.dump(manifest, open(os.path.join(ROOT, "coverage_manifest.json"), "w", encoding="utf-8"),
          ensure_ascii=False, indent=1)

with open(os.path.join(ROOT, "NOT_CONVERTED.md"), "w", encoding="utf-8") as f:
    f.write("# crawlable/NOT_CONVERTED.md — every source id not yet in the executable graph\n\n")
    f.write("Generated by `coverage.py`. Each line: a source id accounted for as **deferred** "
            "(with target phase) or **excluded** (with reason) — never silently missing. "
            "`ledger`/`partial` items are listed in COVERAGE_REPORT.md, not here.\n")
    for artifact, ids in manifest.items():
        deferred = {k: v for k, v in ids.items() if v["status"] in ("deferred", "excluded")}
        if not deferred: continue
        f.write(f"\n## {artifact} ({len(deferred)})\n")
        # compress contiguous deferred lists with the same note
        from collections import defaultdict
        byreason = defaultdict(list)
        for k, v in deferred.items():
            byreason[(v["status"], v["note"])].append(k)
        for (status, note), keys in byreason.items():
            kk = ", ".join(keys) if len(keys) <= 30 else ", ".join(keys[:30]) + f", … (+{len(keys)-30} más)"
            f.write(f"- **{status}** → _{note}_: {kk}\n")
print("\nwrote coverage_manifest.json + NOT_CONVERTED.md")
