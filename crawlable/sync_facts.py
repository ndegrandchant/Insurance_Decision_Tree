#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
crawlable/sync_facts.py — regenerate every fact's `required_by` from the graph.

`required_by` is a documentation impact-index (which nodes read each fact). It is derived, not
authored, so this keeps it authoritative as conversion batches add cross-process fact reuse.
Run after each batch; it rewrites facts.json in place, preserving the one-line-per-fact format
(only the `required_by` array on each fact line is replaced).
"""
import json, re, os, glob
import sys
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")  # print UTF-8 regardless of locale (avoids UnicodeEncodeError on —/✓/→/accents)


ROOT = os.path.dirname(os.path.abspath(__file__))
facts_path = os.path.join(ROOT, "facts.json")
facts = json.load(open(facts_path, encoding="utf-8"))["facts"]

readers = {}
for path in glob.glob(os.path.join(ROOT, "graph", "*.json")):
    for n in json.load(open(path, encoding="utf-8")).get("nodes", []):
        for f in n.get("needs_facts", []):
            readers.setdefault(f, set()).add(n["id"])

lines = open(facts_path, encoding="utf-8").read().split("\n")
changed = 0
for i, line in enumerate(lines):
    m = re.match(r'\s*"([A-Za-z_]+)":\s*\{', line)
    if not m or m.group(1) not in facts:
        continue
    fid = m.group(1)
    rb = json.dumps(sorted(readers.get(fid, [])), ensure_ascii=False)
    new = re.sub(r'"required_by":\s*\[[^\]]*\]', '"required_by": ' + rb, line)
    if new != line:
        lines[i] = new; changed += 1

open(facts_path, "w", encoding="utf-8").write("\n".join(lines))
json.load(open(facts_path, encoding="utf-8"))  # re-parse guard
print(f"sync_facts.py — regenerated required_by for {changed} fact line(s); facts.json re-parses OK")
