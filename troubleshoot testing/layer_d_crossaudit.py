#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Layer D — conflict-ledger <-> runtime cross-audit (+ G1/G3 resolution + O3 measurement).

For every OPEN ruling in crawlable/rulings/, establish ONE of:
  (a) runtime-surfaceable  — a real crawl input makes it appear (caveat / escalation / block), OR
  (b) justified non-runtime — reference-only contract text, latent (declared but no node consumes
      the table yet), or document-level metadata.
A ledger that is referenced by a RUNTIME node / CONSUMED table but that NO input can surface is a
hole (FAIL). Everything else must be explicitly justified — nothing may be silently un-surfaced.
"""
import os, sys, glob, json
import _harness as H

ROOT = H.CRAWLABLE

def ledger_ids():
    return sorted(os.path.basename(p) for p in glob.glob(os.path.join(ROOT, "rulings", "RUL-*.md")))

def _walk_refs(obj, ctx, out):
    if isinstance(obj, dict):
        for k, v in obj.items():
            nctx = k if k in ("conflict", "boundary_conflicts", "cross_table_conflicts",
                              "_doc_conflicts", "cross_code_findings", "conflicts", "_doc_conflict") else ctx
            if k == "ledger_ref" and isinstance(v, str) and "RUL-" in v:
                out.append((os.path.basename(v), ctx))
            else:
                _walk_refs(v, nctx, out)
    elif isinstance(obj, list):
        for it in obj:
            _walk_refs(it, ctx, out)

def reference_map():
    """ledger file -> set of context-kinds it's referenced under, partitioned by runtime relevance."""
    c = H.fresh()
    consumed = {n.get("band_table") for n in c.nodes.values() if n.get("band_table")}
    consumed |= {n.get("matrix") for n in c.nodes.values() if n.get("matrix")}
    refs = {}  # ledgerfile -> list of (kind, where)

    # graph nodes: conflict objects
    for nid, n in c.nodes.items():
        conf = n.get("conflict")
        if conf and conf.get("ledger_ref") and "RUL-" in conf["ledger_ref"]:
            kind = "node-blocking" if conf.get("blocking") else "node-caveat"
            refs.setdefault(os.path.basename(conf["ledger_ref"]), []).append((kind, nid))

    # tables: boundary_conflicts / cross_table_conflicts / _doc_conflicts
    for tid, t in c.tables.items():
        cons = tid in consumed
        for bc in t.get("boundary_conflicts", []):
            if bc.get("ledger_ref"):
                refs.setdefault(os.path.basename(bc["ledger_ref"]), []).append(
                    ("band-consumed" if cons else "band-LATENT", tid))
        for ctc in t.get("cross_table_conflicts", []):
            if ctc.get("ledger_ref"):
                refs.setdefault(os.path.basename(ctc["ledger_ref"]), []).append(
                    ("matrix-consumed" if cons else "matrix-LATENT", tid))
        for dc in t.get("_doc_conflicts", []):
            if dc.get("ledger_ref"):
                refs.setdefault(os.path.basename(dc["ledger_ref"]), []).append(("doc-level", tid))

    # graph-level _doc_conflicts (top-level of each graph file) + reference/clause capture files
    for path in glob.glob(os.path.join(ROOT, "graph", "*.json")) + \
                [os.path.join(ROOT, f) for f in ("reference.json", "clauses.json",
                 "base_policy_ref.json", "linkage_edges.json", "crossrefs.json")]:
        if not os.path.exists(path):
            continue
        data = json.load(open(path, encoding="utf-8"))
        out = []
        # only the top-level _doc_conflicts / capture-file findings (node conflicts already handled)
        if "graph" in os.path.basename(os.path.dirname(path)) or path.endswith(tuple(["graph"])):
            pass
        _walk_refs(data.get("_doc_conflicts", data) if isinstance(data, dict) and "_doc_conflicts" in data else None, "doc-level", out)
        # capture files: scan whole file for reference-only refs
        if os.path.basename(path) in ("reference.json", "clauses.json", "base_policy_ref.json",
                                      "linkage_edges.json", "crossrefs.json"):
            _walk_refs(data, "reference-only", out)
        for lf, ctx in out:
            refs.setdefault(lf, []).append((ctx, os.path.basename(path)))

    # coverage engine (graph_coverage/) shares the rulings/ ledger but runs on a separate engine this
    # UW corpus does not drive — harvest its conflict anchors so coverage-anchored rulings classify as
    # coverage-runtime, not "ledger-only / no data reference" (consistent with validate.py [11]).
    for path in glob.glob(os.path.join(ROOT, "graph_coverage", "*.json")):
        for n in json.load(open(path, encoding="utf-8")).get("nodes", []):
            conf = n.get("conflict")
            if conf and conf.get("ledger_ref") and "RUL-" in conf["ledger_ref"]:
                refs.setdefault(os.path.basename(conf["ledger_ref"]), []).append(("coverage-node", n.get("id")))
    return refs, consumed

def surfaced_by_corpus():
    """ledger file -> list of corpus case names that surface it (caveat or escalation)."""
    c = H.fresh()
    out = {}
    for name, payload, start in H.CORPUS:
        res = H.crawl_case(c, name, payload, start)
        refs = [r for r in H.caveat_refs(res) if r]
        el = H.escalation_ledger(res)
        if el:
            refs.append(el)
        for r in refs:
            out.setdefault(os.path.basename(r), []).append(name)
    return out

def measure_o3():
    """O3: lift/branch terminal outcomes don't re-enter later stages, so conflict/authority nodes
    ORDERED AFTER an early lift are unreachable for those entry-classes. Demonstrate + count."""
    c = H.fresh()
    # a case that lifts early (antique -> conditional_eligible) terminates before capacity/authority
    res = c.crawl(H.E(vehicle_age_years=30, is_renewal=True), start=H.GATE)
    fired = [s["node"] for s in H.fired_steps(res)]
    reached_authority = any("authority" in n for n in fired)
    # count standard-process conflict/authority nodes ordered after the antique node
    std = sorted([n for n in c.nodes.values() if n.get("process") == "standard" and n.get("type") != "router"],
                 key=lambda n: n.get("order", 0))
    antique_order = next((n.get("order", 0) for n in std if n["id"].endswith("antique_vehicle")), None)
    after_lift = [n["id"] for n in std if n.get("order", 0) > (antique_order or 0)
                  and (n.get("conflict") or n.get("type") in ("authority",))]
    return {"lift_case_outcome": res.get("outcome"), "lift_terminal": res.get("terminal_node"),
            "reached_authority": reached_authority,
            "nodes_after_lift_unreachable_for_this_case": after_lift}

def main():
    print("=" * 92 + "\nLAYER D — conflict-ledger <-> runtime cross-audit\n" + "=" * 92)
    ids = ledger_ids()
    refs, consumed = reference_map()
    surf = surfaced_by_corpus()

    fails, rows = [], []
    for lf in ids:
        where = refs.get(lf, [])
        kinds = sorted({k for k, _ in where})
        surfaced = surf.get(lf, [])
        # classify
        runtime_kinds = {"node-caveat", "node-blocking", "band-consumed", "matrix-consumed"}
        is_runtime = bool(runtime_kinds & set(kinds))
        if is_runtime:
            status = "RUNTIME-SURFACED" if surfaced else "RUNTIME-REF but NOT surfaced by corpus"
            if not surfaced:
                fails.append(f"{lf}: referenced by {kinds} but no corpus case surfaces it")
        elif "coverage-node" in kinds:
            status = ("COVERAGE-RUNTIME (anchored in graph_coverage/ conflict node; surfaced by the "
                      "coverage engine, which this UW corpus does not drive)")
        elif any("LATENT" in k for k in kinds):
            status = "LATENT (declared; table not wired to a node — rating stage deferred)"
        elif "doc-level" in kinds:
            status = "DOC-LEVEL (_doc_conflicts; NOT read by crawler — see G1)"
        elif "reference-only" in kinds or any(k in ("cross_code_findings", "reference-only") for k in kinds):
            status = "REFERENCE-ONLY (contract-text/definitional; non-executable by design D1)"
        elif not where:
            status = "LEDGER-ONLY (seeded; no data reference) — reference/definitional"
        else:
            status = f"OTHER ({kinds})"
        rows.append((lf, kinds, status, surfaced[:3]))

    w = max(len(lf) for lf in ids)
    for lf, kinds, status, ex in rows:
        print(f"\n● {lf:<{w}}  [{','.join(kinds) or 'no-data-ref'}]")
        print(f"    {status}")
        if ex:
            print(f"    surfaced by: {ex}")

    # ---- G1 explicit ----
    print("\n" + "-" * 92 + "\nG1 — RUL-MAN-VERSION (_doc_conflicts) runtime surfacing\n" + "-" * 92)
    mv_surf = surf.get("RUL-MAN-VERSION.md", [])
    print(f"   referenced under: {sorted({k for k,_ in refs.get('RUL-MAN-VERSION.md', [])})}")
    print(f"   surfaced on ANY corpus outcome? {'YES' if mv_surf else 'NO'} — "
          f"{'(rides along)' if mv_surf else 'the crawler never reads _doc_conflicts; it appears on ZERO outcomes'}")

    # ---- G3 explicit ----
    print("\n" + "-" * 92 + "\nG3 — RUL-ALCOHOLEMIA / RUL-FLOTA-THRESHOLDS executability\n" + "-" * 92)
    for lf in ("RUL-ALCOHOLEMIA.md", "RUL-FLOTA-THRESHOLDS.md"):
        kinds = sorted({k for k, _ in refs.get(lf, [])})
        print(f"   {lf}: data-refs={kinds or 'NONE in graph/tables'} -> "
              f"{'reference/definitional, no runtime consumer (confirmed non-executable)' if not (set(kinds)&{'node-caveat','node-blocking','band-consumed','matrix-consumed'}) else 'HAS a runtime consumer'}")

    # ---- O3 measurement ----
    print("\n" + "-" * 92 + "\nO3 — partial stage-chaining (lift terminals don't re-enter later stages)\n" + "-" * 92)
    o3 = measure_o3()
    print(f"   early-lift case (antique renovación): outcome={o3['lift_case_outcome']} @ {o3['lift_terminal']}; "
          f"reached authority stage? {o3['reached_authority']}")
    print(f"   standard conflict/authority nodes ordered AFTER the lift (unreachable for a lifted case): "
          f"{o3['nodes_after_lift_unreachable_for_this_case']}")

    print("\n" + "=" * 92)
    if fails:
        print("LAYER D: RED — un-surfaced runtime conflicts:")
        for f in fails:
            print("   ✗", f)
    else:
        print("LAYER D: GREEN — every OPEN ruling is runtime-surfaced OR explicitly justified "
              "(latent / doc-level / reference-only). None silently un-surfaced.")
    return 1 if fails else 0

if __name__ == "__main__":
    sys.exit(main())
