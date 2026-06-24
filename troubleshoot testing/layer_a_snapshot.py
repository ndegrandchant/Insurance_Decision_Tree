#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Layer A — golden snapshot + regression diff.

Captures a stable signature (outcome + decisive path + caveats + escalation) for every corpus
case into golden_snapshot.json. On later runs it DIFFS current vs golden and reports drift.
This turns "the cases pass" into a durable regression guard: any change to the graph/crawler that
silently alters an outcome shows up here.

Usage:
  python3 layer_a_snapshot.py            # diff against golden (creates it on first run)
  python3 layer_a_snapshot.py --bless     # (re)write golden = current  (deliberate re-baseline)

Honest limit: this guards against REGRESSION (drift from the recorded baseline), not against being
wrong-vs-underwriter (that is O4 / Phase-2 ground truth, out of scope here).
"""
import os, json, sys
import _harness as H

GOLDEN = os.path.join(H.HARNESS_DIR, "golden_snapshot.json")

def _norm(x):
    # canonicalize through JSON so tuples<->lists match after a golden round-trip
    return json.loads(json.dumps(x, ensure_ascii=False, sort_keys=True))

def capture():
    c = H.fresh()
    snap = {}
    for name, payload, start in H.CORPUS:
        snap[name] = _norm(H.signature(H.crawl_case(c, name, payload, start)))
    return snap

def main(argv):
    cur = capture()
    if "--bless" in argv or not os.path.exists(GOLDEN):
        with open(GOLDEN, "w", encoding="utf-8") as f:
            json.dump(cur, f, ensure_ascii=False, indent=2, sort_keys=True)
        action = "BLESSED (deliberate re-baseline)" if "--bless" in argv else "CREATED (first run)"
        print(f"[A] golden_snapshot.json {action} — {len(cur)} cases")
        return 0
    golden = json.load(open(GOLDEN, encoding="utf-8"))
    drift = []
    for name in cur:
        if name not in golden:
            drift.append(f"NEW case not in golden: {name}")
        elif cur[name] != golden[name]:
            drift.append(f"DRIFT: {name}\n     golden={json.dumps(golden[name], ensure_ascii=False, sort_keys=True)}"
                         f"\n     now   ={json.dumps(cur[name], ensure_ascii=False, sort_keys=True)}")
    for name in golden:
        if name not in cur:
            drift.append(f"MISSING case (in golden, not produced): {name}")
    print(f"[A] snapshot diff — {len(cur)} cases vs golden")
    for d in drift:
        print("   ", d)
    print(f"[A] {'GREEN — snapshot stable' if not drift else 'RED — ' + str(len(drift)) + ' drift(s)'}")
    return 1 if drift else 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
