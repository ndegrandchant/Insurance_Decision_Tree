#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
crawlable/build_clauses.py — capture the clause-side (Phase 4 / Batch 5) from the representation.

Per decisions.md D1 the cláusulas are contract text, NOT a decision tree: a registry keyed by APS
code + verbatim texts + a structured base policy. So this MECHANICALLY captures (no retype):
  - clauses.json          : 152 clause records (reference; code, title, category, effect summary,
                            text_file) — so a crawl outcome can cite the governing clause.
  - base_policy_ref.json  : the base Condiciones Generales elements (reference).
  - linkage_edges.json    : rule↔clause forward edges + the free reverse inversion (edges).
  - crossrefs.json        : the manual + clause cross-references (reference).
Each record carries _origin so coverage.py accounts every clause code / base element / link /
cross-ref. Clause conflicts (cross_code_findings) are ledgered (see rulings/), not resolved.
"""
import json, os
import sys
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")  # print UTF-8 regardless of locale (avoids UnicodeEncodeError on —/✓/→/accents)


ROOT = os.path.dirname(os.path.abspath(__file__))
REP = os.path.join(os.path.dirname(ROOT), "representation")
def load(p): return json.load(open(os.path.join(REP, p), encoding="utf-8"))

reg = load("clausulas_generales/clause_registry.json")
base = load("clausulas_generales/base_policy.json")
linkage = load("linkage.json")["links"]
xref_m = load("underwriting_manual/cross_references.json")["references"]
xref_c = load("clausulas_generales/cross_references.json")["references"]

LEDGER = {"XC-001": "RUL-2133-2140", "XC-002": "RUL-2133-2140", "XC-003": "RUL-CG-2023",
          "XC-004": "RUL-2038-2112", "XC-005": "RUL-2008", "XC-006": "RUL-2018-PESO"}

# ---- clauses.json ----
clauses = {"_material_class": "clause registry capture (reference — clauses are contract text, D1)",
           "_note": "152 distinct APS codes captured verbatim from clause_registry.json. effect_summary_es is a DERIVED reading (tagged); the canonical text is clause_texts/<text_file>. Clause conflicts are in rulings/ (see cross_code_findings below).",
           "clauses": [], "cross_code_findings": []}
for e in reg["entries"]:
    dc = e.get("derived_classification") or {}
    clauses["clauses"].append({
        "code_suffix": e["code_suffix"],
        "title": e.get("title"),
        "category": e.get("category") or dc.get("category"),
        "text_file": e.get("text_file"),
        "prints": len(e.get("prints", [])),
        "effect_summary_es": dc.get("effect_summary_es"),
        "usage_restriction_verbatim": dc.get("usage_restriction_verbatim"),
        "_derived": bool(dc),
        "_origin": {"artifact": "clause_registry.json", "source_id": e["code_suffix"]}
    })
for f in reg.get("cross_code_findings", []):
    clauses["cross_code_findings"].append({"id": f["id"], "codes": f.get("codes"),
                                           "ledger_ref": "rulings/%s.md" % LEDGER.get(f["id"], "?"),
                                           "_origin": {"artifact": "clause_registry.json", "source_id": f["id"]}})

# ---- base_policy_ref.json ----
bp_keymap = {"prelacion_documental": "prelacion_documental", "definiciones": "definiciones",
             "consideraciones_generales": "consideraciones_generales",
             "obligaciones_del_asegurado": "obligaciones_del_asegurado_en_caso_de_siniestro",
             "exclusiones_generales": "exclusiones_generales", "invalidez_scale": "invalidez_scale"}
base_ref = {"_material_class": "base policy (Condiciones Generales) capture (reference)",
            "_note": "Structured base policy elements; canonical detail in base_policy.json + clause_texts/CG-base.txt.",
            "elements": []}
for eid, realkey in bp_keymap.items():
    base_ref["elements"].append({"element": eid, "representation_key": realkey, "present": realkey in base,
                                 "_origin": {"artifact": "base_policy.json", "source_id": eid}})
for i, sec in enumerate(base.get("secciones", [])):
    title = sec.get("titulo") or sec.get("title") or sec.get("name") or sec.get("seccion")
    base_ref["elements"].append({"element": "seccion[%d]" % (i + 1), "title": title,
                                 "_origin": {"artifact": "base_policy.json", "source_id": "seccion[%d]" % (i + 1)}})

# ---- linkage_edges.json ----
edges = {"_material_class": "rule↔clause linkage edges (forward + reverse inversion)",
         "_note": "Forward edges from linkage.json (manual mention/rule -> bundle clause codes) with match-confidence. Reverse (clause -> rules) is the free inversion. Lets a crawl outcome cite the governing clause(s).",
         "edges": [], "reverse_index": {}}
for i, l in enumerate(linkage):
    e = {"manual_mention": l.get("manual_mention"), "manual_rule": l.get("manual_rule"),
         "bundle_codes": l.get("bundle_codes"), "match": l.get("match"), "note": l.get("note"),
         "_origin": {"artifact": "linkage.json", "source_id": "link[%d]" % i}}
    edges["edges"].append(e)
    for code in (l.get("bundle_codes") or []):
        edges["reverse_index"].setdefault(code, []).append(l.get("manual_rule") or l.get("manual_mention"))

# ---- crossrefs.json ----
cr = {"_material_class": "cross-references capture (reference — pointers to other docs/laws/systems)",
      "_note": "Manual + clause cross-references (laws, manuals, anexos, systems). Captured for the human layer; not decision logic.",
      "references": []}
for i, r in enumerate(xref_m):
    cr["references"].append({"side": "manual", "id": r.get("id"), "target": r.get("target"),
                             "type": r.get("type"), "_origin": {"artifact": "cross_references", "source_id": "man:%d" % i}})
for i, r in enumerate(xref_c):
    cr["references"].append({"side": "clausula", "id": r.get("id"), "target": r.get("target"),
                             "_origin": {"artifact": "cross_references", "source_id": "cla:%d" % i}})

for fn, obj in [("clauses.json", clauses), ("base_policy_ref.json", base_ref),
                ("linkage_edges.json", edges), ("crossrefs.json", cr)]:
    json.dump(obj, open(os.path.join(ROOT, fn), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("clauses.json: %d clauses + %d cross_code_findings" % (len(clauses["clauses"]), len(clauses["cross_code_findings"])))
print("base_policy_ref.json: %d elements" % len(base_ref["elements"]))
print("linkage_edges.json: %d edges, %d clauses in reverse index" % (len(edges["edges"]), len(edges["reverse_index"])))
print("crossrefs.json: %d references" % len(cr["references"]))
