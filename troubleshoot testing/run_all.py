#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
run_all.py — run the runtime-conflict stress harness (Layers A-D) and print a consolidated verdict.

NON-DESTRUCTIVE: every layer only reads crawlable/* and mutates in-memory clones. Run from this dir:
    python3 run_all.py
"""
import sys
import _harness
import layer_a_snapshot, layer_b_properties, layer_c_mutation, layer_d_crossaudit

def main():
    print("#" * 92)
    print("# RUNTIME-CONFLICT STRESS HARNESS — Layers A-D (in-memory, canonical data untouched)")
    print("#" * 92)
    rc = {}
    rc["A snapshot"]   = layer_a_snapshot.main([])
    print()
    rc["B properties"] = layer_b_properties.main()
    print()
    rc["C mutation"]   = layer_c_mutation.main()
    print()
    rc["D cross-audit"] = layer_d_crossaudit.main()
    fired, uncovered = _harness.node_coverage()
    print(f"\n[node-coverage] corpus exercises {len(fired)}/{len(fired)+len(uncovered)} nodes "
          f"(informational; full coverage needs the O4 underwriter corpus). "
          f"uncovered: {uncovered if len(uncovered) <= 14 else str(uncovered[:14]) + ' …'}")
    print("\n" + "#" * 92)
    print("# CONSOLIDATED VERDICT")
    print("#" * 92)
    for k, v in rc.items():
        print(f"   {'GREEN' if v == 0 else 'RED  '}  Layer {k}")
    total = sum(rc.values())
    print(f"\n{'ALL GREEN — runtime conflict handling held under stress' if total == 0 else 'RED — ' + str(total) + ' layer(s) failed'}")
    return 1 if total else 0

if __name__ == "__main__":
    sys.exit(main())
