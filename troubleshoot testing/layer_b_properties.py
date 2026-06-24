#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Layer B — property & fuzz sweeps (deterministic, in-memory, read-only).

Asserts runtime INVARIANTS over generated inputs, not example cases:
  B1 band-edge sweep   — every declared band/bracket edge escalates with a ledger_ref; no UNDECLARED
                         escalation (the generic no-ledger branch); clear interiors resolve uniquely.
  B2 authority sweep   — each suscriptor at limit -> within; at limit+1 -> refer_authority; unknown
                         suscriptor -> refer_authority; Lizeth-Rios row caveats, a normal row doesn't.
  B3 missing-fact matrix — deleting any supplied fact yields a clean outcome OR a graceful escalation
                         (never a crash); every missing_fact escalation uses its facts.json on_missing.
  B4 determinism       — same input twice, and with permuted fact-dict order -> identical signature.
  B5 type fuzz         — wrong-typed numeric facts on-path -> evaluation_error escalation, never crash,
                         never a confident outcome.
"""
import os, sys, json, random
import _harness as H

# --------------------------------------------------------------------------- B1 band-edge sweep
def _edge_test_points(bc, gran):
    kind, edge, eu = bc.get("kind"), bc.get("edge"), bc.get("edge_upper")
    if edge is None:
        return []
    if kind == "gap":
        hi_g = eu if eu is not None else edge + 1
        pts = [(edge + hi_g) / 2.0]
        if gran:
            pts.append(round(edge + gran, 6))
        return pts
    return [edge]  # undefined_boundary / overlap / precedence -> exact edge sits in >=2 bands

def sweep_bands():
    c = H.fresh()
    fails, notes = [], []
    bracket_tables = {tid: t for tid, t in c.tables.items() if t.get("role") == "bracket_map"}
    consumed = {n.get("band_table") for n in c.nodes.values() if n.get("band_table")}
    runtime_tables = {tid: t for tid, t in bracket_tables.items() if tid in consumed}
    latent_tables  = {tid: t for tid, t in bracket_tables.items() if tid not in consumed}

    # ---- RUNTIME-CONSUMED tables: strict no-silent-resolution invariants ----
    for tid, t in runtime_tables.items():
        rows, gran, bcs = t.get("rows", []), (t.get("granularity") or 0), t.get("boundary_conflicts", [])
        for bc in bcs:
            for pt in _edge_test_points(bc, gran):
                out, conf = H.bracket_lookup(t, pt)
                if conf is None:
                    fails.append(f"B1 {tid}: declared {bc.get('kind')} edge {pt} RESOLVED to {out} (silent resolution)")
                elif not conf.get("ledger_ref"):
                    fails.append(f"B1 {tid}: edge {pt} escalated WITHOUT ledger_ref ({conf.get('reason')})")
        # no UNDECLARED gap/overlap: scan row bounds +-1 and gran
        samples = set()
        for r in rows:
            for b in (r.get("lower"), r.get("upper")):
                if b is not None:
                    for d in (0, 1, -1, (gran or 1), -(gran or 1)):
                        samples.add(round(b + d, 6))
        for pt in samples:
            out, conf = H.bracket_lookup(t, pt)
            if conf is not None and conf.get("reason") == "bracket_no_unique_match":
                fails.append(f"B1 {tid}: point {pt} hit UNDECLARED gap/overlap (generic no-unique-match, no ledger_ref)")

    # ---- LATENT (not wired to any node) tables: forward-looking findings, not current failures ----
    for tid, t in latent_tables.items():
        notes.append(f"{tid}: LATENT S2 table — consumed by NO runtime node (rating stage deferred, O3/O5).")
        if t.get("special_rows"):
            for bc in t.get("boundary_conflicts", []):
                edge = bc.get("edge")
                if edge is None:
                    continue
                out, conf = H.bracket_lookup(t, edge)
                if conf is None:
                    notes.append(f"  ↳ FORWARD-LOOKING: {tid} declares '{bc.get('kind')}' at {edge} but bracket_lookup RESOLVES it "
                                 f"to {out} — special_rows are NOT consulted; this conflict will NOT surface when the table is wired.")
    notes.append(f"B1 runtime-consumed bracket tables: {sorted(runtime_tables)}; latent: {sorted(latent_tables)}")
    return ("B1 band-edge sweep (runtime-consumed)", fails, notes, len(runtime_tables))

# --------------------------------------------------------------------------- B2 authority sweep
CAP = 3480000  # capacidad_max_por_vehiculo_bob (capacity node intercepts above this)

def sweep_authority():
    """Probe the authority node's '<=' inclusivity on the CLEAN path (Case-UW: no X15/high-value
    gate). Standard authority is shadowed by X15 (declines at 1.05M, importer-path above 700k) — we
    MEASURE that shadow rather than mis-probe through it."""
    c = H.fresh()
    fails, notes = [], []
    node = c.nodes["case_underwriting.authority"]
    matrix = c.tables[node["matrix"]]
    kcol, lookup_by = matrix.get("lookup_key", "suscriptor"), node["lookup_by"]
    vc = next(cc for cc in node["constraints"] if "valor" in cc["fact"])
    probed = 0
    for row in matrix["rows"]:
        key, limit = row.get(kcol), row.get(vc["row_field"])
        if not isinstance(limit, (int, float)) or isinstance(limit, bool):
            continue
        if limit >= CAP:
            notes.append(f"B2 {key}: limit {limit} == capacity ceiling; limit+1 is capacity-bound (skipped authority edge)")
            continue
        probed += 1
        within = c.crawl(H.U(**{lookup_by: key, vc["fact"]: limit, "cantidad_vehiculos": 1}), start=H.CU_GATE)
        exceed = c.crawl(H.U(**{lookup_by: key, vc["fact"]: limit + 1, "cantidad_vehiculos": 1}), start=H.CU_GATE)
        if within.get("outcome") != "eligible":
            fails.append(f"B2 {key}: valor=limit ({limit}) -> {within.get('outcome')} (expected eligible; '<=' inclusive)")
        if exceed.get("outcome") != "refer_authority":
            fails.append(f"B2 {key}: valor=limit+1 ({limit+1}) -> {exceed.get('outcome')} (expected refer_authority)")
    # unknown suscriptor (modest valor so only the unknown key drives the refer)
    unk = c.crawl(H.U(suscriptor="ZZ Unknown", valor_asegurado=500000), start=H.CU_GATE)
    if unk.get("outcome") != "refer_authority":
        fails.append(f"B2 unknown suscriptor -> {unk.get('outcome')} (expected refer_authority)")
    # Lizeth Rios row-conditional caveat present; a normal suscriptor carries none
    lr = c.crawl(H.U(suscriptor="Lizeth Rios", valor_asegurado=1000000, cantidad_vehiculos=50), start=H.CU_GATE)
    normal = c.crawl(H.U(suscriptor="José Carlos López", valor_asegurado=1000000, cantidad_vehiculos=50), start=H.CU_GATE)
    if not any("LIZETH" in (r or "").upper() for r in H.caveat_refs(lr)):
        fails.append(f"B2 Lizeth Rios lookup did NOT carry the threshold_variance caveat -> {H.caveat_refs(lr)}")
    if any("LIZETH" in (r or "").upper() for r in H.caveat_refs(normal)):
        fails.append(f"B2 normal suscriptor wrongly carried the Lizeth-Rios caveat -> {H.caveat_refs(normal)}")
    # MEASURE the standard-authority X15 shadow
    smatrix = c.tables["TBL-AUTH-ESTANDAR"]
    shadowed = sum(1 for r in smatrix["rows"]
                   if isinstance(r.get("max_valor_bob"), (int, float)) and r["max_valor_bob"] > 700000)
    notes.append(f"B2 standard authority X15-SHADOW: {shadowed}/{len(smatrix['rows'])} standard rows have a "
                 f"valor limit > 700.000, but X15 declines standard at 1.050.000 and routes the importer-path "
                 f"above 700.000 — so those rows can never bind in the standard flow (O3/structural; possible "
                 f"source tension: X15 1.05M decline vs standard matrix limits up to 3.48M).")
    return ("B2 authority sweep (Case-UW <= probe + standard-shadow measure)", fails, notes, probed)

# --------------------------------------------------------------------------- B3 missing-fact matrix
def missing_fact_matrix():
    c = H.fresh()
    fails, notes = [], []
    bases = [("standard", H.E(), H.GATE), ("case_uw", H.U(), H.CU_GATE),
             ("router", H.R(), None),
             ("renovacion", H.RN(siniestralidad=100), "renovacion.comercial"),
             ("retro", H.RT(retroactividad_dias=15), "retroactividad.siniestro_overlay")]
    fired_missing = {}
    for label, base, start in bases:
        for fact in list(base.keys()):
            payload = dict(base); del payload[fact]
            try:
                res = c.crawl(payload, start=start) if start else c.crawl(payload)
            except Exception as ex:  # a crash is the failure mode we forbid
                fails.append(f"B3 {label}: deleting '{fact}' CRASHED the crawler: {type(ex).__name__}: {ex}")
                continue
            reason = H.escalation_reason(res) or ""
            if reason.startswith("missing_fact"):
                mode = (res.get("escalation") or {}).get("on_missing")
                declared = c.facts.get(fact, {}).get("on_missing", "ask")
                bf = (res.get("escalation") or {}).get("blocking_fact")
                fired_missing[bf] = mode
                if bf == fact and mode != declared:
                    fails.append(f"B3 {label}: '{fact}' escalated on_missing='{mode}' but facts.json declares '{declared}'")
            elif not (H.is_outcome(res) or H.is_escalate(res)):
                fails.append(f"B3 {label}: deleting '{fact}' produced neither outcome nor escalation -> {res.get('outcome')}")
    notes.append(f"B3 facts that triggered a missing_fact escalation: {sorted(k for k in fired_missing if k)}")
    return ("B3 missing-fact matrix", fails, notes, sum(len(b[1]) for b in bases))

# --------------------------------------------------------------------------- B4 determinism
def determinism():
    c = H.fresh()
    fails, notes = [], []
    for name, payload, start in H.CORPUS:
        s1 = H.signature(H.crawl_case(c, name, payload, start))
        s2 = H.signature(H.crawl_case(c, name, payload, start))
        if json.dumps(s1, sort_keys=True) != json.dumps(s2, sort_keys=True):
            fails.append(f"B4 {name}: non-deterministic across two identical runs")
        # permute fact-dict order
        items = list(payload.items()); random.Random(1234).shuffle(items)
        perm = dict(items)
        s3 = H.signature(c.crawl(perm, start=start) if start else c.crawl(perm))
        if json.dumps(s1, sort_keys=True) != json.dumps(s3, sort_keys=True):
            fails.append(f"B4 {name}: outcome depends on fact-dict insertion order")
    return ("B4 determinism + permutation", fails, notes, len(H.CORPUS))

# --------------------------------------------------------------------------- B5 type fuzz
def type_fuzz():
    c = H.fresh()
    fails, notes = [], []
    probes = [  # (label, payload factory, start) where the bad-typed fact is ON-PATH
        ("valor_asegurado=str", H.E(valor_asegurado="ochocientos mil", importer="Toyosa"), H.GATE),
        ("siniestralidad=str", H.RN(siniestralidad="cien"), "renovacion.comercial"),
        ("cantidad_vehiculos=str", H.U(valor_asegurado=2000000, suscriptor="José Carlos López", cantidad_vehiculos="cincuenta"), H.CU_GATE),
        ("retroactividad_dias=str", H.RT(retroactividad_dias="quince"), "retroactividad.siniestro_overlay"),
        ("tonnage_tn=str", H.E(segment="consumer", vehicle_class="camion", is_heavy=True, tonnage_tn="cinco"), H.GATE),
    ]
    for label, payload, start in probes:
        try:
            res = c.crawl(payload, start=start) if start else c.crawl(payload)
        except Exception as ex:
            fails.append(f"B5 {label}: CRASHED instead of escalating: {type(ex).__name__}: {ex}")
            continue
        if H.is_outcome(res):
            fails.append(f"B5 {label}: bad-typed fact produced a CONFIDENT outcome ({res.get('outcome')}) — should escalate")
        elif H.escalation_reason(res) != "evaluation_error":
            notes.append(f"B5 {label}: escalated as '{H.escalation_reason(res)}' (acceptable if missing_fact/band, but not evaluation_error)")
    return ("B5 type fuzz", fails, notes, len(probes))

# --------------------------------------------------------------------------- run
def main():
    layers = [sweep_bands(), sweep_authority(), missing_fact_matrix(), determinism(), type_fuzz()]
    total_fail = 0
    print("=" * 92 + "\nLAYER B — property & fuzz sweeps\n" + "=" * 92)
    for label, fails, notes, n in layers:
        print(f"\n● {label}  ({n} units probed)")
        for note in notes:
            print(f"    · {note}")
        for fl in fails:
            print(f"    ✗ {fl}")
        print(f"    {'PASS' if not fails else 'FAIL — ' + str(len(fails))}")
        total_fail += len(fails)
    print("\n" + "=" * 92)
    print(f"LAYER B: {'GREEN — all invariants hold' if not total_fail else 'RED — ' + str(total_fail) + ' failure(s)'}")
    return 1 if total_fail else 0

if __name__ == "__main__":
    sys.exit(main())
