#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
crawlable/crawler/crawl.py — minimal crawler for the LBC crawlable graph (Phase 0).

What it does (Crawlable_Roadmap.md 0.2–0.3):
  - loads graph/*.json + facts.json + tables.json (+ checks rulings/ refs exist),
  - pulls facts via a stub adapter (a plain dict), fires on_missing,
  - applies hit_policy, walks the ordered eligibility filter,
  - returns an OUTCOME with a full AUDIT PATH (nodes fired, source_quotes, facts used),
  - does escalation-with-context (refer THIS question + the blocking fact/fork + which node).

Conflict policy (decisions.md D-P1/D-P2). The crawler never silently resolves a conflict:
  - STRUCTURAL fork (cannot pick) -> ESCALATE, no outcome:
      hit_policy 'unique' with >1 match · bracket overlap (>=2 rows) · reevaluation loop ·
      missing fact (on_missing refer/ask/block).
  - PROVENANCE caveat (branches encode the agreed reading; the contest is meta, e.g. the X15
    derived split or the version identity) -> return the outcome but attach a LOUD non-binding
    CAVEAT (node id + ledger_ref) to the result. Nothing is hidden; the ledger ref rides along.

Self-contained JSONLogic over the closed operator set in node_schema.md §0.1 (no dependency,
no eval). 'and'/'or' short-circuit, so a missing fact inside an un-reached operand never fires
on_missing (e.g. cilindrada_cc is not demanded for a non-motorcycle).
"""
import json, os, glob, sys
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")  # print UTF-8 regardless of locale (avoids UnicodeEncodeError on —/✓/→/accents)


HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)  # crawlable/

class MissingFact(Exception):
    def __init__(self, fact): self.fact = fact

class EvalError(Exception):
    pass

# ----- load -------------------------------------------------------------------
def load_graph():
    nodes = {}
    for path in sorted(glob.glob(os.path.join(ROOT, "graph", "*.json"))):
        data = json.load(open(path, encoding="utf-8"))
        for n in data.get("nodes", []):
            if n["id"] in nodes:
                raise EvalError(f"duplicate node id {n['id']}")
            n["_file"] = os.path.basename(path)
            nodes[n["id"]] = n
    return nodes

def load_facts():
    return json.load(open(os.path.join(ROOT, "facts.json"), encoding="utf-8"))["facts"]

def load_tables():
    merged = {}
    for p in sorted(glob.glob(os.path.join(ROOT, "tables*.json"))):
        for k, v in json.load(open(p, encoding="utf-8")).items():
            if not k.startswith("_"):
                merged[k] = v
    return merged

def load_doc_conflicts():
    """Document-level conflicts (`_doc_conflicts`, e.g. the manual's v3.0/v4.0 identity) declared at
    the top of each graph/table file. They are NOT per-node branch logic; they are surfaced ONCE per
    crawl result as `document_provenance` so a represented document-level conflict is never invisible
    at runtime (it rides as metadata, not as a per-node caveat — keeps the caveat channel for
    decision-relevant conflicts)."""
    seen = {}
    for p in sorted(glob.glob(os.path.join(ROOT, "graph", "*.json")) + glob.glob(os.path.join(ROOT, "tables*.json"))):
        d = json.load(open(p, encoding="utf-8"))
        for dc in (d.get("_doc_conflicts") or []):
            ref = dc.get("ledger_ref")
            if ref and ref not in seen:
                seen[ref] = {"kind": "document_provenance", "ledger_ref": ref,
                             "note": dc.get("note") or dc.get("detail")}
    return list(seen.values())

def flatten_tables(tables):
    """Expose @tables.<id>.<key> (scalars) and @tables.<id>.values (allowlists) as context vars."""
    ctx = {}
    for tid, t in tables.items():
        role = t.get("role")
        if role == "scalar_group":
            for key, spec in t.get("keys", {}).items():
                ctx[f"@tables.{tid}.{key}"] = spec["value"]
        elif role == "allowlist":
            ctx[f"@tables.{tid}.values"] = t["values"]
        # bracket_map / matrix_lookup are consumed by lookups, not flattened
    return ctx

def load_linkage():
    """rule_id -> [{bundle_codes, match, note}] from linkage_edges.json (O5: surface the governing
    clause codes on an outcome). Match-confidence labels are preserved (R3 residual: the crawler
    CITES a clause, it never asserts proven legal equivalence)."""
    idx = {}
    p = os.path.join(ROOT, "linkage_edges.json")
    if os.path.exists(p):
        for e in json.load(open(p, encoding="utf-8")).get("edges", []):
            r = e.get("manual_rule")
            if r:
                idx.setdefault(r, []).append({"bundle_codes": e.get("bundle_codes"),
                                              "match": e.get("match"), "note": e.get("note")})
    return idx

# ----- JSONLogic (closed set, short-circuit) ----------------------------------
def jl(expr, ctx):
    if not isinstance(expr, dict):
        return expr  # literal (number, string, bool, list)
    if len(expr) != 1:
        raise EvalError(f"bad JSONLogic node: {expr}")
    op, arg = next(iter(expr.items()))

    if op == "var":
        key = arg if isinstance(arg, str) else jl(arg, ctx)
        if key not in ctx:
            raise MissingFact(key)
        return ctx[key]
    if op == "and":
        r = True
        for a in arg:
            r = jl(a, ctx)
            if not r:
                return r          # short-circuit: later operands (and their vars) untouched
        return r
    if op == "or":
        r = False
        for a in arg:
            r = jl(a, ctx)
            if r:
                return r          # short-circuit
        return r
    if op == "!":
        return not jl(arg, ctx)
    if op == "in":
        needle = jl(arg[0], ctx)
        hay = jl(arg[1], ctx)
        if not isinstance(hay, list):
            raise EvalError(f"'in' second arg must be a list, got {type(hay).__name__}")
        return needle in hay
    if op in ("==", "!="):
        a, b = jl(arg[0], ctx), jl(arg[1], ctx)
        return (a == b) if op == "==" else (a != b)
    if op in (">", ">=", "<", "<="):
        a, b = jl(arg[0], ctx), jl(arg[1], ctx)
        for v in (a, b):
            if isinstance(v, bool) or not isinstance(v, (int, float)):
                raise EvalError(f"numeric comparison on non-number: {a!r} {op} {b!r}")
        return {">": a > b, ">=": a >= b, "<": a < b, "<=": a <= b}[op]
    raise EvalError(f"unsupported operator: {op}")

# ----- bracket_lookup (S2) ----------------------------------------------------
def _row_matches(row, x):
    lo, hi = row.get("lower"), row.get("upper")
    if lo is not None:
        if row.get("lower_inclusive"):
            if x < lo: return False
        else:
            if x <= lo: return False
    if hi is not None:
        if row.get("upper_inclusive"):
            if x > hi: return False
        else:
            if x >= hi: return False
    return True

def bracket_lookup(table, x):
    """Return (output, None) on a unique hit, or (None, conflict) on overlap/gap -> escalate.
    On a non-unique match the conflict is attributed to the DECLARED boundary edge x actually hit
    (nearest edge / containing [edge, edge_upper]), not blindly to boundary_conflicts[0] — so a
    150% value cites the 150 edge, not 60. The ledger_ref is unchanged; only the cited edge/detail
    becomes faithful to the value that triggered the escalation."""
    matches = [(i, r) for i, r in enumerate(table["rows"]) if _row_matches(r, x)]
    # O12a: a table with categorical special_rows cannot be resolved by numeric lookup alone in the
    # region where a special_row's declared precedence applies — escalate (the categorical overlap
    # needs a category fact the numeric lookup lacks), never silently return the numeric row. So the
    # franquicia-lujo precedence (@420000) escalates instead of silently picking the VA bracket.
    if table.get("special_rows"):
        for bc in table.get("boundary_conflicts", []):
            if bc.get("kind") == "precedence" and bc.get("edge") is not None and x > bc["edge"]:
                return None, {"reason": "bracket_precedence_special_row", "edge": bc.get("edge"),
                              "ledger_ref": bc["ledger_ref"], "detail": bc.get("detail"),
                              "special_rows": True, "matched_rows": [i for i, _ in matches]}
    if len(matches) == 1:
        return matches[0][1]["output"], None
    # 0 or >1 -> attribute to the nearest/containing declared boundary edge
    bcs = table.get("boundary_conflicts", [])
    if bcs:
        def edge_dist(bc):
            e, eu = bc.get("edge"), bc.get("edge_upper")
            if e is None:
                return float("inf")
            if eu is not None and e <= x <= eu:
                return 0
            return min(abs(x - e), abs(x - eu) if eu is not None else float("inf"))
        bc = min(bcs, key=edge_dist)
        return None, {"reason": "bracket_" + bc["kind"], "edge": bc.get("edge"),
                      "edge_upper": bc.get("edge_upper"), "ledger_ref": bc["ledger_ref"],
                      "detail": bc.get("detail"), "matched_rows": [i for i, _ in matches]}
    return None, {"reason": "bracket_no_unique_match", "matched_rows": [i for i, _ in matches]}

# ----- crawler ----------------------------------------------------------------
# processes whose graphs are not yet built; a refer_process to one terminates with a note.
# As batches land, processes move out of this set and refer_process continues into them.
PROCESSES_NOT_BUILT = {"masiva", "automatica"}

class Crawler:
    def __init__(self):
        self.nodes = load_graph()
        self.facts = load_facts()
        self.tables = load_tables()
        self.doc_conflicts = load_doc_conflicts()
        self.rule_clauses = load_linkage()
        self.table_ctx = flatten_tables(self.tables)
        self.by_process = {}
        for n in self.nodes.values():
            self.by_process.setdefault(n.get("process"), []).append(n)
        for p in self.by_process:
            self.by_process[p].sort(key=lambda n: (n.get("order", 0)))
        # entry node (min order) per BUILT process -> refer_process to it continues the crawl
        self.process_entry = {p: ns[0]["id"] for p, ns in self.by_process.items()
                              if p not in (None,) and ns}

    def _next_in_process(self, node):
        p, o = node.get("process"), node.get("order", 0)
        nxt = [n for n in self.by_process.get(p, []) if n.get("order", 0) > o]
        return nxt[0] if nxt else None

    def _facts_used(self, node, ctx):
        return {f: ctx.get(f) for f in node.get("needs_facts", []) if f in ctx}

    def crawl(self, supplied, start="root.process_router"):
        """Public entry: run the crawl, then surface document-level provenance conflicts (e.g. the
        manual's v3.0/v4.0 identity) ONCE on the result so they are never silently omitted."""
        res = self._crawl_impl(supplied, start)
        if self.doc_conflicts:
            res["document_provenance"] = self.doc_conflicts
        gc = self._governing_clauses(res)
        if gc:
            res["governing_clauses"] = gc
        return res

    def _governing_clauses(self, res):
        """O5: from the fired nodes' (and the terminal node's) rule origins, surface the clause codes
        that govern this outcome, each with its match-confidence label. Cites, never asserts
        equivalence (R3). Empty when the decisive nodes are tree-origin with no rule->clause edge."""
        rules, gc, seen = [], [], set()
        for step in res.get("audit", []):
            if step.get("result") == "advance":
                continue
            n = self.nodes.get(step.get("node"))
            sid = (n or {}).get("_origin", {}).get("source_id")
            if sid:
                rules.append(sid)
        tn = res.get("terminal_node")
        if tn in self.nodes:
            sid = self.nodes[tn].get("_origin", {}).get("source_id")
            if sid:
                rules.append(sid)
        for r in rules:
            for link in self.rule_clauses.get(r, []):
                key = (r, tuple(link.get("bundle_codes") or []))
                if key not in seen:
                    seen.add(key)
                    gc.append({"rule": r, "via": "linkage", **link})
        # also promote clauses an exception node attached inline (e.g. the antique-vehicle lift) so
        # they ride on the result, not only buried in the audit step.
        for step in res.get("audit", []):
            rc = step.get("required_clauses")
            if rc:
                key = ("required", step.get("node"), tuple(rc) if isinstance(rc, list) else str(rc))
                if key not in seen:
                    seen.add(key)
                    gc.append({"via": step.get("node"), "required_clauses": rc, "match": "exact"})
        return gc

    def _crawl_impl(self, supplied, start="root.process_router"):
        ctx = {**self.table_ctx, **supplied}
        audit, caveats, visited = [], [], set()
        node = self.nodes[start]
        while True:
            nid = node["id"]
            if nid in visited:
                return self._escalate("reevaluation_loop", node, audit, caveats,
                                      f"Ciclo de reevaluación en {nid}: ningún proceso admite el riesgo automáticamente.",
                                      ledger="rulings/RUL-ROUTER-PRECEDENCE.md")
            visited.add(nid)
            try:
                res = self._step(node, ctx, audit, caveats)
            except MissingFact as mf:
                return self._missing(mf.fact, node, audit, caveats)
            except EvalError as ee:
                # bad DATA (wrong fact type/value) -> escalate with context, never a hard crash.
                # (Genuine code bugs raise other exceptions and still surface.)
                return {"kind": "escalate", "outcome": "ESCALATE", "audit": audit, "caveats": caveats,
                        "escalation": {"reason": "evaluation_error", "at_node": node["id"],
                                       "node_title": node.get("title"), "message": "Dato inválido: " + str(ee),
                                       "source_quote": node.get("source_quote")}}
            if res["kind"] == "advance":
                nxt = self._next_in_process(node)
                if nxt is None:
                    return self._escalate("dead_end", node, audit, caveats,
                                          f"Sin nodo siguiente tras {nid} y sin terminal.")
                node = nxt
            elif res["kind"] == "goto":
                node = self.nodes[res["target"]]
            elif res["kind"] == "result":
                res["audit"], res["caveats"] = audit, caveats
                return res
            elif res["kind"] == "escalate":
                return res

    # -- per-node handling --
    def _step(self, node, ctx, audit, caveats):
        t = node["type"]
        fu = self._facts_used(node, ctx)
        rec = lambda **kw: audit.append({"node": node["id"], "type": t,
                                         "title": node.get("title"),
                                         "source_quote": node.get("source_quote"),
                                         "facts_used": fu, **kw})

        if t == "terminal":
            # record the terminal in the audit path too (completeness — sibling of the B6 fix for
            # plain-fired condition/referral nodes; previously terminals set terminal_node but never
            # appeared as an audit step).
            rec(result="terminal", detail=node.get("outcome") or (node.get("referral_target") or {}).get("name"))
            return self._emit_outcome(node, node.get("outcome"), node.get("referral_target"),
                                      ctx, audit, caveats, rec, reason="terminal")

        if t == "router" or "branches" in node:
            # optional entry gate (evaluate) before branches (e.g. rent_a_car): if false, fall through
            if "evaluate" in node and not jl(node["evaluate"], ctx):
                rec(result="advance", detail="evaluate (compuerta) falso; no aplica")
                return {"kind": "advance"}
            hp = node.get("hit_policy", "first")
            matches = [b for b in node["branches"] if jl(b["when"], ctx)]
            if not matches:
                onm = node.get("on_no_match")
                if onm is None:
                    rec(result="advance", detail="ninguna rama coincide; fall-through")
                    return {"kind": "advance"}
                rec(result="on_no_match", detail=f"ninguna rama coincide -> {onm}")
                return self._route(onm, node, ctx, audit, caveats)
            if hp == "unique" and len(matches) > 1:
                # structural fork: the source's unresolved precedence
                conf = node.get("conflict", {})
                return self._escalate("ambiguous_precedence", node, audit, caveats,
                                      "Más de una rama aplica y la fuente no define precedencia: "
                                      + ", ".join(b.get("target", b["outcome"]) for b in matches),
                                      ledger=conf.get("ledger_ref"),
                                      extra={"matched": [b.get("target", b["outcome"]) for b in matches]})
            b = matches[0]
            blk = self._blocking(node)
            if blk:
                rec(result="conflict_block", detail=blk.get("summary"))
                return self._escalate("contested_outcome", node, audit, caveats,
                                      blk.get("summary", ""), ledger=blk.get("ledger_ref"))
            # router precedence is a MULTI-match conflict (surfaced via the escalate path above); on a
            # clean single-match route there is no precedence question, so don't attach the router's
            # caveat (it was noise on every route). Non-router branch nodes still caveat normally.
            if node.get("type") != "router":
                self._maybe_caveat(node, caveats)
            rec(result="branch", detail=b.get("reason"), chosen=b.get("target", b["outcome"]))
            return self._emit_outcome(node, b["outcome"], None, ctx, audit, caveats, rec,
                                      target=b.get("target"), reason=b.get("reason"))

        if t == "authority":
            return self._handle_authority(node, ctx, audit, caveats, rec)

        if t == "accumulator" and "band_table" in node:
            return self._handle_band(node, ctx, audit, caveats, rec)

        if t in ("condition", "gate", "referral", "accumulator"):
            ev = node.get("evaluate")
            fired = jl(ev, ctx) if ev is not None else True
            if t == "gate":
                if fired:
                    rec(result="pass", detail="tipo admitido; continúa el filtro")
                    return {"kind": "advance"}
                onm = node["on_no_match"]
                rec(result="block", detail=f"no pasa el gate -> {onm}")
                return self._route(onm, node, ctx, audit, caveats)
            if not fired:
                rec(result="advance", detail="no aplica; siguiente exclusión")
                return {"kind": "advance"}
            # node fired
            blk = self._blocking(node)
            if blk:
                rec(result="conflict_block", detail=blk.get("summary"))
                return self._escalate("contested_outcome", node, audit, caveats,
                                      blk.get("summary", ""), ledger=blk.get("ledger_ref"))
            if "exception" in node:
                return self._handle_exception(node, ctx, audit, caveats, rec)
            self._maybe_caveat(node, caveats)
            rec(result="fired", detail=node.get("outcome") or (node.get("referral_target") or {}).get("name"))
            return self._emit_outcome(node, node.get("outcome"), node.get("referral_target"),
                                      ctx, audit, caveats, rec, reason="fired")
        raise EvalError(f"unknown node type {t}")

    def _handle_exception(self, node, ctx, audit, caveats, rec):
        exc = node["exception"]
        if not exc.get("liftable", False):
            self._maybe_caveat(node, caveats)
            rec(result="no_lift", detail="exclusión no levantable")
            return self._emit_outcome(node, exc.get("no_lift_outcome", "decline"),
                                      node.get("referral_target"), ctx, audit, caveats, rec, reason="no_lift")
        if "cases" in exc:
            for case in exc["cases"]:
                if jl(case["applies_when"], ctx):
                    self._maybe_caveat(node, caveats)
                    rec(result="lift", detail=f"caso '{case['case']}' aplica",
                        required_clauses=case.get("required_clauses"))
                    return self._emit_outcome(node, case["on_lift_outcome"], None,
                                              ctx, audit, caveats, rec, reason=f"lift:{case['case']}")
            self._maybe_caveat(node, caveats)
            rec(result="no_lift", detail="ningún caso de levantamiento aplica")
            return self._emit_outcome(node, exc.get("no_lift_outcome", "decline"),
                                      None, ctx, audit, caveats, rec, reason="no_lift")
        # single-case lift: ALL conditions must hold
        conds = exc.get("conditions", [])
        passed = all(jl(c, ctx) for c in conds)
        self._maybe_caveat(node, caveats)
        if passed:
            rec(result="lift", detail="todas las condiciones de levantamiento se cumplen",
                authority_required=exc.get("authority_required"))
            return self._emit_outcome(node, exc["on_lift_outcome"], None, ctx, audit, caveats, rec, reason="lift")
        rec(result="no_lift", detail="no se cumplen las condiciones de levantamiento")
        return self._emit_outcome(node, exc.get("no_lift_outcome", "decline"),
                                  None, ctx, audit, caveats, rec, reason="no_lift")

    def _handle_authority(self, node, ctx, audit, caveats, rec):
        """authority node: look up the binding suscriptor in a matrix_lookup table and check the
        risk is within their (max_vehiculos, max_valor) limits. Within -> advance to next stage;
        exceeds -> refer_authority (higher tier); suscriptor not in matrix -> refer_authority."""
        matrix = self.tables.get(node["matrix"])
        key_fact = node["lookup_by"]
        if key_fact not in ctx:
            raise MissingFact(key_fact)
        key = ctx[key_fact]
        kcol = matrix.get("lookup_key", "suscriptor")
        rows = [r for r in matrix["rows"] if r.get(kcol) == key]
        self._maybe_caveat(node, caveats)
        if not rows:
            rec(result="authority_unknown", detail=f"'{key}' no está en {node['matrix']}")
            return self._emit_outcome(node, node.get("unknown_key_outcome", "refer_authority"),
                                      None, ctx, audit, caveats, rec,
                                      reason=f"suscriptor '{key}' no figura en la matriz {node['matrix']}")
        row = rows[0]
        # row-level conflict (e.g. a suscriptor whose limits differ across matrices) -> caveat
        for ctc in matrix.get("cross_table_conflicts", []):
            if ctc.get("row_key") == key:
                caveats.append({"node": node["id"], "kind": "threshold_variance",
                                "ledger_ref": ctc["ledger_ref"], "summary": ctc.get("detail")})
        fails = []
        for c in node.get("constraints", []):
            if c["fact"] not in ctx:
                raise MissingFact(c["fact"])
            fv, rf = ctx[c["fact"]], row.get(c["row_field"])
            if rf is None:  # 'No aplica' / unlimited (None always means no limit on this dimension)
                continue
            for val in (fv, rf):
                if isinstance(val, bool) or not isinstance(val, (int, float)):
                    raise EvalError(f"authority constraint on '{c['fact']}': valor no numérico ({fv!r} vs {rf!r})")
            op = c.get("op", "<=")
            ok = {"<=": fv <= rf, "<": fv < rf, ">=": fv >= rf, ">": fv > rf}[op]
            if not ok:
                fails.append(f"{c['fact']}={fv} {op} {c['row_field']}={rf} es falso")
        if fails:
            rec(result="authority_exceeds", detail=f"{key}: " + "; ".join(fails))
            return self._emit_outcome(node, node.get("exceeds_outcome", "refer_authority"),
                                      None, ctx, audit, caveats, rec,
                                      reason=f"excede la autoridad de '{key}': " + "; ".join(fails))
        rec(result="authority_within", detail=f"{key}: dentro de su autoridad")
        return {"kind": "advance"}

    def _handle_band(self, node, ctx, audit, caveats, rec):
        """accumulator with a band_table: gate on `evaluate`; if it applies, look up the band
        (e.g. siniestralidad) and emit the band's outcome + carry its rate action. A value landing
        on a flagged band edge escalates (S2: no silent inequality)."""
        ev = node.get("evaluate")
        if ev is not None and not jl(ev, ctx):
            rec(result="advance", detail="no aplica a este segmento/tipo")
            return {"kind": "advance"}
        bt = self.tables.get(node["band_table"])
        bi = node["band_input"]
        if bi not in ctx:
            raise MissingFact(bi)
        v = ctx[bi]
        if isinstance(v, bool) or not isinstance(v, (int, float)):
            raise EvalError(f"band input '{bi}'={v!r} no es numérico")
        out, conf = bracket_lookup(bt, v)
        if conf:
            rec(result="band_edge", detail=f"{bi}={ctx[bi]} cae en una frontera de banda no definida")
            return self._escalate("band_boundary", node, audit, caveats,
                                  conf.get("detail", "valor en frontera de banda; la fuente no define a qué banda pertenece"),
                                  ledger=conf.get("ledger_ref"))
        self._maybe_caveat(node, caveats)
        rec(result="band", detail=out.get("action"), band_action=out.get("action"))
        res = self._emit_outcome(node, out.get("outcome", "conditional_eligible"), None,
                                 ctx, audit, caveats, rec, target=out.get("target"), reason=out.get("action"))
        if res.get("kind") == "result":
            res["rate_action"] = out.get("action")
        return res

    def _emit_outcome(self, node, outcome, referral_target, ctx, audit, caveats, rec, target=None, reason=None):
        if outcome in ("refer_process", "refer_line"):
            tgt = target or (referral_target or {}).get("name")
            return self._refer(node, outcome, tgt, referral_target, ctx, audit, caveats, reason)
        if outcome == "refer_authority":
            # refers to an authority level (suscriptor) or a named committee/body
            res = {"kind": "result", "outcome": "refer_authority", "process": node.get("process"),
                   "terminal_node": node["id"], "reason": reason,
                   "source_quote": node.get("source_quote")}
            if referral_target:
                res["referral_target"] = referral_target
            else:
                res["needs_authority"] = "suscriptor con autoridad suficiente para validar/autorizar"
            return res
        return {"kind": "result", "outcome": outcome, "process": node.get("process"),
                "terminal_node": node["id"], "reason": reason,
                "source_quote": node.get("source_quote")}

    def _refer(self, node, outcome, target, referral_target, ctx, audit, caveats, reason):
        # refer back to the router (not-admitted) -> loop guard turns it into an escalation
        if target == "root.process_router":
            return {"kind": "goto", "target": "root.process_router"}
        # The router SELECTS a process to run -> continue into it. Every other refer_process is a
        # handoff/referral (e.g. retroactividad>30 -> Case UW analiza; renovación>=150% -> Case UW
        # revisa): it terminates with context, the receiving process is a separate crawl.
        if outcome == "refer_process" and target in self.process_entry and node.get("type") == "router":
            return {"kind": "goto", "target": self.process_entry[target]}
        note = None
        if target in PROCESSES_NOT_BUILT:
            note = f"Grafo del proceso '{target}' aún no construido (entrega Phase 1)."
        return {"kind": "result", "outcome": outcome, "process": node.get("process"),
                "terminal_node": node["id"], "referral_target": referral_target or {"name": target},
                "reason": reason, "note": note, "source_quote": node.get("source_quote")}

    def _route(self, onm, node, ctx, audit, caveats):
        if onm in self.nodes:
            return {"kind": "goto", "target": onm}
        # on_no_match names an outcome
        return {"kind": "result", "outcome": onm, "process": node.get("process"),
                "terminal_node": node["id"], "reason": "on_no_match",
                "source_quote": node.get("source_quote")}

    def _maybe_caveat(self, node, caveats):
        c = node.get("conflict")
        if c and c.get("status") == "open":
            caveats.append({"node": node["id"], "kind": c.get("kind"),
                            "ledger_ref": c.get("ledger_ref"), "summary": c.get("summary")})

    def _blocking(self, node):
        """A decisive node whose OUTCOME the source genuinely contradicts (conflict.blocking)
        must escalate, not assert an outcome. (Provenance conflicts -> caveat; structural forks
        -> handled by hit_policy/lookup. This is the third kind: a contested outcome.)"""
        c = node.get("conflict")
        return c if (c and c.get("status") == "open" and c.get("blocking")) else None

    # -- escalations --
    def _escalate(self, reason, node, audit, caveats, message, ledger=None, extra=None):
        return {"kind": "escalate", "escalation": {
            "reason": reason, "at_node": node["id"], "node_title": node.get("title"),
            "source_quote": node.get("source_quote"), "message": message,
            "ledger_ref": ledger, **({"detail": extra} if extra else {})},
            "outcome": "ESCALATE", "audit": audit, "caveats": caveats}

    def _missing(self, fact, node, audit, caveats):
        spec = self.facts.get(fact, {})
        om = spec.get("on_missing", "ask")
        msg = {"ask": "Solicitar el dato al suscriptor",
               "refer": "Derivar a revisión humana (dato no validable automáticamente)",
               "block": "Detención dura: el caso no puede decidirse sin este dato",
               "default": "Usar valor por defecto"}.get(om, om)
        return {"kind": "escalate", "escalation": {
            "reason": f"missing_fact:{om}", "at_node": node["id"], "node_title": node.get("title"),
            "blocking_fact": fact, "fact_prompt": spec.get("prompt"),
            "fact_source_quote": spec.get("source_quote"), "on_missing": om, "message": msg,
            "source_quote": node.get("source_quote")},
            "outcome": "ESCALATE", "audit": audit, "caveats": caveats}


if __name__ == "__main__":
    c = Crawler()
    supplied = json.load(open(sys.argv[1], encoding="utf-8")) if len(sys.argv) > 1 else {}
    print(json.dumps(c.crawl(supplied), ensure_ascii=False, indent=2))
