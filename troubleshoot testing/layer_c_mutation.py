#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Layer C — mutation testing (in-memory fault injection; NOTHING written to disk).

Proves the harness/validator checks are LOAD-BEARING, not vacuous: deep-copy the loaded crawler,
inject a fault the project fears, and assert SOME check goes red. A fault that survives = a blind
spot to fix. Each fault is reverted by simply discarding the mutated clone.

Catchers used here are RUNTIME-observable (the focus of this pass): the band sweep (B1 logic), the
conflict-surfacing invariant (a contested/blocking node must escalate), caveat presence, audit
source_quote integrity, and snapshot drift. (Static-only guardians like validate.py [1]/[8] are
noted where they ALSO catch a fault.)
"""
import sys, json
import _harness as H
from layer_b_properties import _edge_test_points

def band_problems(t):
    """Mirror of B1's runtime invariants for one table dict (declared edges escalate w/ ledger;
    no undeclared generic escalation)."""
    probs, gran = [], (t.get("granularity") or 0)
    for bc in t.get("boundary_conflicts", []):
        for pt in _edge_test_points(bc, gran):
            out, conf = H.bracket_lookup(t, pt)
            if conf is None:
                probs.append(f"declared edge {pt} RESOLVES to {out} (silent resolution)")
            elif not conf.get("ledger_ref"):
                probs.append(f"edge {pt} escalates without ledger_ref")
    samples = set()
    for r in t.get("rows", []):
        for b in (r.get("lower"), r.get("upper")):
            if b is not None:
                for d in (0, 1, -1):
                    samples.add(round(b + d, 6))
    for pt in samples:
        out, conf = H.bracket_lookup(t, pt)
        if conf is not None and conf.get("reason") == "bracket_no_unique_match":
            probs.append(f"UNDECLARED escalation at {pt} (generic no-unique-match)")
    return probs

def _find_case(name):
    for n, p, s in H.CORPUS:
        if n.startswith(name):
            return (n, p, s)
    raise KeyError(name)

def run():
    base = H.fresh()
    results = []  # (mutation, caught_by, caught: bool)

    # --- M1: flip a band row's inclusivity so a declared edge resolves uniquely ---
    # The renovación edges are modelled as exclusive-bounded GAPS (60 matches neither row -> escalate).
    # CLOSING the gap (set the (0,60) row's upper_inclusive=True) makes 60 resolve into it = silent
    # resolution of a flagged edge — exactly the fault the band sweep must catch.
    c = H.clone(base)
    t = c.tables["TBL-RENOV-CONSUMER"]
    for r in t["rows"]:
        if r.get("upper") == 60:
            r["upper_inclusive"] = True
    probs = band_problems(t)
    results.append(("M1 close a declared band gap (RENOV-CONSUMER @60 -> resolves)", "B1 band sweep", bool(probs), probs[:2]))

    # --- M2: delete a boundary_conflicts entry -> undeclared gap/overlap ---
    c = H.clone(base)
    t = c.tables["TBL-RENOV-CONSUMER"]
    t["boundary_conflicts"] = []
    probs = band_problems(t)
    undeclared = [p for p in probs if "UNDECLARED" in p]
    results.append(("M2 delete boundary_conflicts (RENOV-CONSUMER)", "B1 undeclared-escalation", bool(undeclared), undeclared[:2]))

    # --- M3: remove C05 'blocking' -> contested rent-a-car no longer escalates ---
    c = H.clone(base)
    c.nodes["case_underwriting.elig.rent_a_car"]["conflict"].pop("blocking", None)
    n, p, s = _find_case("CU2")
    res = c.crawl(p, start=s)
    caught = not H.is_escalate(res)   # it should NOW (wrongly) resolve -> that change is the catch
    results.append(("M3 remove C05 blocking flag", "conflict-surfacing (CU2 must escalate)", caught,
                    f"CU2 now -> {res.get('outcome')} ({res.get('terminal_node')})"))

    # --- M4: remove X15 conflict -> provenance caveat disappears ---
    c = H.clone(base)
    # find a corpus case that currently carries an X15/high-value caveat
    base_caveat_case = None
    for n2, p2, s2 in H.CORPUS:
        refs = H.caveat_refs(base.crawl(p2, start=s2) if s2 else base.crawl(p2))
        if any("X15" in (r or "").upper() or "HIGHVALUE" in (r or "").upper() for r in refs):
            base_caveat_case = (n2, p2, s2); break
    if base_caveat_case:
        c.nodes["standard.elig.high_value"].pop("conflict", None)
        n2, p2, s2 = base_caveat_case
        res = c.crawl(p2, start=s2) if s2 else c.crawl(p2)
        gone = not any("X15" in (r or "").upper() or "HIGHVALUE" in (r or "").upper() for r in H.caveat_refs(res))
        results.append(("M4 remove X15 conflict object", f"caveat-presence ({n2})", gone,
                        f"caveats now {H.caveat_refs(res)}"))
    else:
        results.append(("M4 remove X15 conflict object", "caveat-presence", False,
                        "NO corpus case carries the X15 caveat — cannot prove via corpus (see note)"))

    # --- M5: router hit_policy unique -> first -> precedence silently resolved ---
    c = H.clone(base)
    c.nodes["root.process_router"]["hit_policy"] = "first"
    n, p, s = _find_case("R1")
    res = c.crawl(p)
    caught = not H.is_escalate(res)   # R1 used to escalate (ambiguous precedence); now it resolves
    results.append(("M5 router hit_policy unique->first", "precedence-escalation (R1 must escalate)", caught,
                    f"R1 now -> {res.get('outcome')}"))

    # --- M6: nudge an authority threshold -> snapshot drift ---
    c = H.clone(base)
    for r in c.tables["TBL-AUTH-CASEUW"]["rows"]:
        if r.get("suscriptor") == "José Carlos López":
            r["max_valor_bob"] = 1900000   # was 2.1M; A3 uses VA 2.0M
    n, p, s = _find_case("A3")
    before = H.signature(base.crawl(p, start=s))
    after = H.signature(c.crawl(p, start=s))
    caught = json.dumps(before, sort_keys=True) != json.dumps(after, sort_keys=True)
    results.append(("M6 nudge authority limit (José Carlos López 2.1M->1.9M)", "snapshot drift (A3)", caught,
                    f"A3 {before.get('outcome')} -> {after.get('outcome')}"))

    # --- M7: re-tier blocking -> caveat (C05) -> contested outcome asserted with only a caveat ---
    c = H.clone(base)
    conf = c.nodes["case_underwriting.elig.rent_a_car"]["conflict"]
    conf["blocking"] = False           # downgrade: now it would assert decline + caveat
    n, p, s = _find_case("CU2")
    res = c.crawl(p, start=s)
    caught = not H.is_escalate(res)
    results.append(("M7 re-tier C05 blocking->caveat", "conflict-surfacing (CU2 must escalate)", caught,
                    f"CU2 now -> {res.get('outcome')} caveats={H.caveat_refs(res)}"))

    # --- M8: drop a source_quote -> audit integrity ---
    c = H.clone(base)
    c.nodes["standard.elig.competicion"].pop("source_quote", None)
    n, p, s = _find_case("E2")
    res = c.crawl(p, start=s)
    missing = H.audit_missing_source_quotes(res)
    results.append(("M8 drop source_quote (competicion X05)", "audit-integrity + validate.py[1]", bool(missing),
                    f"fired nodes missing source_quote: {missing}"))

    # --- M9: G1 surfacing is load-bearing — drop _doc_conflicts -> document_provenance disappears ---
    c = H.clone(base)
    c.doc_conflicts = []
    n, p, s = _find_case("E1")
    res = c.crawl(p, start=s)
    caught = not res.get("document_provenance")  # baseline carries it; removal must be observable
    results.append(("M9 drop _doc_conflicts (G1 surfacing)", "document_provenance presence", caught,
                    f"document_provenance now: {res.get('document_provenance')}"))

    # --- M9: disable an exception's liftability -> a liftable case can no longer lift ---
    c = H.clone(base)
    node = c.nodes["standard.elig.antique_vehicle"]
    if "exception" in node:
        node["exception"]["liftable"] = False
        node["exception"].pop("cases", None)
    n, p, s = _find_case("E3")
    res = c.crawl(p, start=s)
    caught = res.get("outcome") != "conditional_eligible"   # was a lift -> now declines
    results.append(("M10 disable antique exception liftability", "snapshot/outcome (E3 must change)", caught,
                    f"E3 now -> {res.get('outcome')} ({res.get('terminal_node')})"))

    return results

def main():
    print("=" * 92 + "\nLAYER C — mutation testing (in-memory; nothing written to disk)\n" + "=" * 92)
    results = run()
    survivors = 0
    for mut, catcher, caught, detail in results:
        mark = "✓ caught" if caught else "✗ SURVIVED"
        print(f"\n● {mut}")
        print(f"    catcher: {catcher}")
        print(f"    {mark} — {detail}")
        if not caught:
            survivors += 1
    print("\n" + "=" * 92)
    print(f"LAYER C: {'GREEN — every injected fault was caught (checks are load-bearing)' if not survivors else 'RED — ' + str(survivors) + ' fault(s) SURVIVED (blind spot)'}")
    return 1 if survivors else 0

if __name__ == "__main__":
    sys.exit(main())
