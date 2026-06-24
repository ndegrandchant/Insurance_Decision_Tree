# verification_report.md — Method, results, and what remains unverified

Verification of the extracted representation against the two source PDFs. Anchors cite physical PDF pages; the page-anchored extraction (`source_text/*.txt`) is the auditable intermediate.

## 1. Method (three layers)

**L1 — Deterministic/mechanical (run twice: after build, and re-run after every correction).**

- JSON validity of all artifacts (22/22 parse; no zero-byte/truncated files).
- Structural invariants: 152 registry entries (base + 7 secciones + 144 cláusulas); 258 coded prints + cover; all 168 verbatim text files exist, non-empty, headers well-formed; every `table_ref`/`tree_ref` resolves; no duplicate rule ids.
- **Verbatim layer, exhaustively:** every `quote_verbatim` of all 84 rules; every exclusion text and quote in the 4 decision trees; every cell of the 10 `verbatim_table` tables and every numeric/value token of the 14 `parameter_digest` tables; all 19 definiciones, 30 consideraciones blocks, 10 obligaciones, invalidez-scale rows (concept + each percentage), and Secciones I–VII numeric parameters; every clause-registry title at its first print page; the head of every clause text file at its print pages; every cross-reference quote. **Final state: 0 failures.**
- Segmentation forensics: duplicate-print comparison by content hash + diff (57 codes printed >1×: 44 identical, 13 differing → classified presentational / form_template_variation / substantive with full diffs reviewed); clause-code inventory derived case-insensitively (gaps 2025, 2131, 2146 confirmed by direct search).
- Table cross-check: authority matrices and bracket tables re-extracted independently via pdfplumber table extraction and compared with the text layer before transcription.
- The illegible l was transcribed from a page render (`work/manual_p26_formula.png`), not from the corrupt text layer.

**L2 — Fresh-context semantic verifiers (subagents, adversarial, no build context).**

- V-MAN: checked the structured `logic` of all (then-)81 rules and all 4 trees against source meaning (told quotes/anchors were already machine-verified; focus on distortion/omission). Read the full manual.
- V-CLA: checked 12 sampled clause classifications (2003, 2008, 2018, 2023, 2032, 2038, 2050, 2069, 2111, 2126, 2140, 2147) against their verbatim texts; independently confirmed the three conflict findings (CONF-CG-001, XC-001, XC-002) by reading the source pages; checked 5 consideraciones blocks and Secciones III & VII parameters semantically.
- **Full-sweep extension (second round):** 4 further verifiers covered the remaining **132 clause classifications** (each judged strictly against its canonical verbatim text file), and a 5th covered the remaining base-policy material: all 18 unsampled consideraciones blocks that carry `structured_parameters` (the other 7 blocks carry verbatim text only, no derived parameters), Secciones I, II, IV, V, VI, and the obligation-item parameters. With this, **every derived classification and every structured parameter in the deliverable has had an independent semantic pass.**
- Earlier in the build, 4 reader subagents produced the derived classifications; their outputs were extracted from transcripts (not retyped) and merged keyed by code.

**L3 — Coverage.**

- Section-coverage check: every body section of the manual (1.1–6) is claimed by ≥1 rule/table/tree/supplementary item.
- V-MAN additionally swept for normative statements with no counterpart (found 5; all incorporated — see §3).

## 2. Incidents during verification (full disclosure)

- Two credit/spend-limit freezes interrupted the session. Freeze 1 occurred around artifact assembly: post-hoc forensics (JSON re-validation, batch completeness 4×36 objects, hash comparison of the one at-risk file, mtime timeline) showed **no corruption** — all writes were completed atomic `json.dump` calls. Freeze 2 killed the first two rounds of verifier subagents mid-run (first round: 0 work; second round: large read transcripts, no final reports). Verifiers are read-only; no workspace files were touched (verified by modification-time sweep). Verification was then restructured into the L1/L2 design above and completed.
- One subagent result arrived truncated through the notification channel; the full output was recovered from its transcript file and validated (36/36 objects). A mistakenly spawned context-less agent never wrote to the workspace (hash-verified).

## 3. Findings and dispositions

**Found by L1 (mechanical):**


| Finding                                                                                                         | Disposition                                                                                                                              |
| --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 4 clause codes initially missed because the `Código Asignado` line appears in different casings (2050 ×3, 2127) | Parser made case-insensitive; re-segmented; registry rebuilt (152 codes, not 148)                                                        |
| Same-code reprints with differing text (13 codes)                                                               | Diff-reviewed individually: 2023 substantive (→ CONF-CG-001, both texts preserved); 2036/2050 form-template variation; 10 presentational |
| `tables.json` originally claimed all tables verbatim                                                            | Split into `provenance: verbatim_table` (10) vs `parameter_digest` (14, composed labels + verbatim values); note corrected               |
| TBL-RC-LIMITES row sourced from p.26 lacked machine-readable anchor                                             | `row_sources` added                                                                                                                      |
| R-036 referenced nonexistent R-091                                                                              | Re-pointed to R-103                                                                                                                      |
| R-090 cited §3.5/p.29 for a quote on p.30 (§3.5.1)                                                              | Anchor corrected                                                                                                                         |


**Found by V-MAN (semantic), all fixed and re-verified:**


| Finding                                                                                                                                                                                                                            | Disposition                                                                                          |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| R-071 said "12 exclusiones"; list has 11                                                                                                                                                                                           | Corrected                                                                                            |
| R-105 widened the vigencia exceptions to >12 months; source allows them only for shorter terms                                                                                                                                     | `exceptions_scope` made explicit                                                                     |
| R-074 dropped the qualifier "diferentes a las permitidas también para el caso Estándar"                                                                                                                                            | Restored in logic and quote                                                                          |
| R-107 footnote (*) on indemnity base applies to Secciones I, II, III, V — was readable as all seven                                                                                                                                | Scoped                                                                                               |
| T-RENOVACION: the pesados/motos band scheme sits *inside* the Consumer block and overlaps/conflicts with the Consumer bands (e.g., siniestralidad 200% → +50% vs +17%); the tree didn't flag it; 50%/51% gap unflagged             | `placement_in_source`, `conflict_flag`, and band-gap flag added — conflict represented, not resolved |
| T-RETROACTIVIDAD modeled the siniestro case as a third exclusive branch; it is an overlay condition                                                                                                                                | Restructured (duration question + overlay), general rule added to the tree root                      |
| R-017: source's own internal cross-reference says "Apartado 3.1.6" (TOC-style numbering); rule silently normalized                                                                                                                 | Verbatim reference recorded + flag; INC-MAN-001 strengthened with this evidence                      |
| R-082 dropped the masivos/colectivos "respectivamente" mapping and the coordination-plan duty                                                                                                                                      | Restored                                                                                             |
| Omitted normative content: full-policy incentive duty (p.15), licitación representative duty (p.32), suscriptor-must-authorize-unregistered-clauses (p.33), Moto Protección product parameters & Brevet information duty (pp.9-10) | Added: R-024, R-095/R-098 logic, R-004, R-005 (rules now 84)                                         |


**Found by V-CLA (semantic), all fixed:**


| Finding                                                                                                         | Disposition                                                 |
| --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| CONF-CG-001 `condition_verbatim` lead-in said "siempre y cuando éste cuente"; source reads "siempre que cuente" | Corrected to true verbatim (re-verified by substring match) |
| XC-001 omitted that 2133's rule is scoped to the AP-Ocupantes coverage                                          | Scope added                                                 |
| 2140: insurer's reserved right mislabeled as `conditions_precedent`                                             | Moved to `reservas_de_la_aseguradora`                       |
| Sección III exclusion (b) dropped "a pesar de existir un daño estructural y/o mecánico severo y evidente"       | Restored                                                    |
| Sección III conflated the unavailable-parts/Flete-Aéreo rule with the 20% import-differential rule              | Split into two parameters                                   |


**Confirmed correct by V-CLA:** all three conflict findings (2023 two-texts; 2133 vs 2140; 2136 vs 2139) verified against source pages; all 12 sampled classifications faithful; sampled base-policy blocks and Secciones III/VII parameters faithful; the source's own ambiguities (e.g., CRPVA rule placement in Sección VII, clause 2008's dual formulations) correctly preserved rather than resolved.

**Found by the full-sweep extension (132 clause classifications + remaining base policy), all fixed and re-verified:**


| Finding                                                                                                                                                                 | Disposition                                                                                                            |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 2019: summary omitted the per-occupant hospedaje limit (Condicionado Particular) and the CRPVA occupant cap                                                             | Restored                                                                                                               |
| 2027: repatriation cover summarized without the condition that death result from a covered traffic event                                                                | Condition restored in summary and `conditions_precedent`                                                               |
| 2040: `modifies_target/quote` null despite the express "No obstante… Condiciones Generales" derogation                                                                  | Recorded (quote re-verified verbatim in the clause text)                                                               |
| 2070, 2071, 2130: insurer's discretionary rights (supervision; documentation; derecho de repetir) and a peritaje dispute mechanism mislabeled as `conditions_precedent` | Moved to new `reservas_de_la_aseguradora` / `mecanismo_de_discrepancias` fields (same fix class as 2140 in the sample) |
| 2142: summary dropped two excluded causes ("sobre esfuerzo", "deficiente instalación de partes y piezas")                                                               | Restored                                                                                                               |
| COSTO DE SALVAMENTO: dropped gating condition "cuando el vehículo no pueda moverse por sus propios medios"                                                              | Restored                                                                                                               |
| COBERTURA PARA ACCESORIOS: "cambio y/o" trigger dropped from the extra-prima obligation                                                                                 | Restored                                                                                                               |
| SUBROGACIÓN: blanket relatives bar stated without the "comprometan… la responsabilidad del propio Asegurado" qualifier                                                  | Restored                                                                                                               |
| Sección II: robo total missing "perpetrado por personas desconocidas"; $us. 500 rule missing the pre-indemnification timing and altered-numbers context                 | Both restored                                                                                                          |
| Sección V: security-measures exclusion missing "salvo pacto escrito en contrario"                                                                                       | Restored                                                                                                               |
| Obligación i): 48-hour deadline stated without "salvo impedimento razonablemente justificado"                                                                           | Restored                                                                                                               |


Every restored qualifier was re-verified verbatim against the source after editing. Clean batches: 33/33 in batch 3 (2076–2108); 30–31/33 in the others; 21 of 28 base-policy units.

## 4. What was verified vs what remains unverified (be aware downstream)

**Fully verified (mechanical, 100% coverage):** all quotes, anchors, table values, registry identities/pages, text-file heads, definitions, obligations, invalidez scale, code inventory, duplicate-print classification.

**Semantically verified (independent fresh-context pass, 100% coverage):** all 84 rule logics and 4 trees; **all 144 derived clause classifications**; the 6 cross-code findings; **all 23 consideraciones blocks carrying structured parameters** (the other 7 blocks hold verbatim text only), **all 7 secciones**, and the parameterized obligation items.

**Remaining residual risk (cannot be improved by further verification of this kind):**

1. The clause bodies' OCR-level fidelity is bounded by the PDF text layer (e.g., clause 2052 contains source-side OCR artifacts like "danos", "0 sean" — preserved verbatim and flagged in its anomalies, not corrected). Checking against the rendered page images for all 311 pages was not performed (done only for the manual's p.26 formula, where the text layer was unusable).
2. **Presentational reprint classification** for 10 codes rests on whitespace/signature-normalized hash+diff evidence (diffs were individually reviewed at build time, not re-read by a fresh verifier; the evidence is deterministic and reproducible from `work/`).
3. `linkage.json` matches are title/object correspondences with confidence labels; the `unmatched`/`related` entries are judgment calls, recorded as such.
4. Semantic verification is single-pass per item (one fresh verifier each); items were not multi-vote adjudicated.

## 4b. Residual risk — deeper explanation, and how Part 2 (the crawlable graph) inherits it

The §4 residuals are properties of the *source extraction*. Part 2 (`crawlable/`) is **generated
from this representation and never re-extracts the PDFs**, so it inherits each residual unchanged —
no better, no worse. Detail on where each comes from, the risk, and the downstream effect:

- **R1 — clause-body OCR fidelity (bounded by the PDF text layer).** *Origin:* clause bodies in
`clause_texts/` were sliced mechanically from the pdfplumber text layer (decisions.md D5), not
re-OCR'd from page images; where that text layer is imperfect the artifact carries the artifacts
verbatim (e.g. clause 2052: "danos" for "daños", "0 sean"). *Risk:* a clause's operative wording
could be wrong at the character level in a way a human reading the rendered page would catch but
no text-layer check can — a glyph error could alter meaning. *Part-2 effect:* `crawlable/clauses.json`
captures these records BY REFERENCE from the same `clause_texts/`, so it inherits the exact bound;
the crawler *cites* a clause, it does not re-validate its characters. *Mitigation:* re-OCR the
clauses carrying `anomalies` from page images before relying on their exact wording in a binding
decision.
- **R2 — presentational-reprint classification (10 codes).** *Origin:* of 13 same-code reprints
that differ, 10 were classed "presentational" (only whitespace / signature-block casing) by a
deterministic hash+diff over normalized text (D3), reviewed at build time but NOT re-read by a
fresh-context verifier (only the 3 substantive ones were). *Risk:* if a "presentational" diff
actually hid a small operative wording change, two genuinely-different reprints would be collapsed
to one canonical text — represented-as-identical when they aren't. Low (conservative normalization;
evidence reproducible from `work/`) but unverified by fresh eyes. *Part-2 effect:* `clauses.json`
carries one record per code with the canonical `text_file`; a wrong collapse would make the graph
cite the wrong-but-canonical variant. *Mitigation:* a fresh verifier re-reads the 10 diffs (cheap).
- **R3 — linkage match confidence (rule↔clause edges).** *Origin:* `linkage.json` maps manual
mentions ↔ clause codes by title/object correspondence with confidence labels (exact / partial /
related / unmatched); the non-exact calls are human judgment, not proven legal equivalence.
*Risk:* a wrong or missing edge means a crawl outcome could cite the wrong governing clause or
miss one (e.g. the antique-vehicle "Nota Aclaratoria" is `unmatched` — a required lift condition
with no clause text; the extraterritorialidad↔2027 edge is `partial` with a known tension).
*Part-2 effect:* `crawlable/linkage_edges.json` copies these edges + the free reverse inversion
and **preserves the confidence labels**, so the uncertainty is carried, not hidden; the crawler
cites, it does not assert equivalence. *Mitigation / where it's addressed — two distinct things:*
**(a) confidence** of the edges that exist (the `unmatched`/`related` judgment calls) is the
Phase-4 clause-linking review queue, and the Phase-3 trial (`improvement_crawler_test/`) sampled it
**4/4 clean**; **(b) completeness** of the map (only ~2 of 84 rules carry a clause edge) is the
**Phase-4 forward-edge build (Roadmap §4.1 / CONVERSION_RECORD O16)**. Neither is touched by the
Phase-2 rulings loop (resolving conflicts ≠ adding edges), and neither affects decision outcomes —
`governing_clauses` is enrichment, not a decision input.
- **R4 — single-pass semantic verification.** *Part-1:* each derived field got one fresh-context
pass, not multi-vote. *Part-2:* the crawlable **executable logic** (decision-bearing nodes + S2 /
authority / band tables) now carries a **second independent fresh-context vote** (the re-check
added for open-item O8 — see `crawlable/CONVERSION_RECORD.md` §8/§9). The non-executable reference
capture (clauses / base policy / cross-refs) remains single-pass and inherits R1–R3.

**Net:** these residuals bound what the crawlable graph can claim about *clause-text* fidelity; they
do **not** affect the manual-side decision logic (rules / trees / tables), which had a mechanical
verbatim check **and** (now) a double independent semantic pass.

**Phase-3 sampled re-derivation (2026-06-19) — R1 & R3 tested against source, confirmed.** A fresh,
independent trial (`improvement_crawler_test/`) re-derived both residuals from the source and compared
to the canonical: **R1** — re-OCR'd 5/53 anomaly-flagged clauses from rendered page images (2052, 2034,
2008, 2050, 2062); **5/5 FAITHFUL** — the page glyphs match the canonical, so the defects ("danos",
"0 sean", "Surbrogatario", "a afectos", "tasas") are genuine *source-side* print errors correctly
preserved, not text-layer corruptions (re-OCR confirms, doesn't correct). **R3** — re-judged 4/8
non-exact linkage edges against source; **4/4 AGREE** with the canonical labels, incl. the canonical
correctly *not* conflating CG-2023 (driver age >69) with the antique-*vehicle* Nota Aclaratoria
(unmatched). These are **sampled** confirmations (high agreement, not exhaustive), so R1/R3 remain
*bounded, not eliminated* — but the trial substantially de-risks them and found **no** correction
needed in `representation/`. Full comparison: `improvement_crawler_test/R1_R3_RESULTS.md`.

## 4c. Runtime-conflict verification (dynamic; the Part-2 executable graph)

The L1/L2/L3 layers above verify that the *representation matches the source*. A separate, later pass
verifies that the **crawler executes that logic without ever silently resolving a conflict** — the
runtime analog of "represent, never resolve". It is a standing, non-destructive harness under
`troubleshoot testing/` (reads `crawlable/` read-only; all fault injection is in-memory; nothing under
`crawlable/` is written). Full detail + the reviewer-facing findings table: `troubleshoot testing/STRESS_REPORT.md`.

**The property proven:** no supplied input yields a confident outcome (`eligible`/`decline`/
`conditional`/`refer`) where the source contradicts itself or leaves a value undefined — such a case
must **escalate** or carry a loud non-binding **caveat**. Four layers, each a loop:

- **A — golden snapshot / regression guard:** every demonstration case's outcome + decisive path +
  caveats + escalation is pinned; drift is caught.
- **B — property/fuzz sweeps:** declared band edges escalate with a `ledger_ref` and interiors
  resolve; authority `<=` inclusivity holds; the 50-fact missing-fact matrix escalates gracefully
  (no crash); determinism + fact-order independence; type-fuzz → escalate, never a confident outcome.
- **C — mutation testing (proves the checks are load-bearing):** 9/9 injected faults caught (flip
  band inclusivity, delete a `boundary_conflicts` entry, remove a `blocking`/`conflict` flag, router
  `unique→first`, nudge a threshold, re-tier blocking→caveat, drop a `source_quote`, drop
  `_doc_conflicts`). A surviving fault would be a blind spot to fix.
- **D — conflict-ledger ↔ runtime cross-audit:** every OPEN ruling is runtime-surfaced **or**
  explicitly justified (reference-only / latent / document-level / ledger-only-by-design). The
  completeness analog of L3 section-coverage, for conflicts.

**What it caught and fixed (all outcome-preserving — snapshot stayed stable; logged in
`crawlable/CONVERSION_RECORD.md` §8F):**
- The version-identity conflict `RUL-MAN-VERSION` was referenced 14× via `_doc_conflicts` but the
  crawler never read that key → it surfaced on **zero** outcomes. Now surfaced once per result as
  `document_provenance`, and **checked** by `validate.py [11]`/`[9]`.
- `bracket_lookup` cited `boundary_conflicts[0]` regardless of which edge a value hit (a 150% value
  reported edge 60) → now attributes to the edge actually hit (safe before, but audit-misleading).
- A new `validate.py [11]` conflict-coverage check now fails the build if any OPEN ruling is neither
  referenced by a data construct nor justified as ledger-only — closing the "a conflict no input can
  surface" gap for good.

**Tier review (Layer E — DONE 2026-06-19):** three independent fresh-context verifiers
(perspective-diverse lenses — under-surfacing / over-escalation / missing-executable-surfacing)
re-judged every conflict's *tier* (caveat / escalate / block / doc-level / reference-only).
**9/11 tiers confirmed correct, 0 silent-resolution holes; no tier flipped** (flipping on a lone
dissent would *resolve* a question that belongs to the underwriter). The four med/low dissents were
*represented*, not silenced: the X15 validated→`eligible` accept (open sub-question added to its
ledger), the MAN-VERSION data-currency risk (ledger note), R-097's unwired licitaciones prohibition
list (new open item **O14**), and the declined FLOTA router-caveat. Detail: `crawlable/CONVERSION_RECORD.md`
§8G + `troubleshoot testing/layer_e_verdicts.json`.

**Bucket-1 correction pass (DONE 2026-06-19):** the triage's "fixable-now" items were fixed and
verified, all outcome-preserving — O12a (`bracket_lookup` escalates the franquicia `special_rows`
precedence), the router single-route caveat noise removed, O5 (`governing_clauses` surfaced on
outcomes), and O14 (R-097's licitaciones prohibited-condition list node-ified into 5 gates — a tender
requesting alcoholemia > 0,70 / Valor Admitido / etc. now declines or refers instead of routing to
eligible, and RUL-ALCOHOLEMIA surfaces at runtime). Detail: `crawlable/CONVERSION_RECORD.md` §8H; a
FIXED-vs-NOT-FIXED scoreboard is at §9.0.

**Residual (deferred, not data loss):** O3 partial stage-chaining (lift/branch outcomes don't re-enter
authority/rating); O12b — the latent S2 rating tables are still wired to no node (O12a already made the
lookup safe for when they are); and O15 — a Part-1 reference re-verification pass (R2 reprint re-read +
a second vote over the clause/base-policy reference capture), reclassified as reference-side. These are
the next passes.

## 5. Conclusion

After corrections, every check in scope passes, and **every derived field in the deliverable — rule logics, trees, clause classifications, base-policy parameters — has now had both a mechanical verbatim check and an independent semantic pass.** The three genuine source conflicts (clause 2023 dual text; 2133/2140 same-title contradiction; Consumer vs pesados/motos renewal-band overlap) plus the manual's version/numbering inconsistencies are represented explicitly as source facts, not resolved. The items in §4 are the honest boundary of what this verification establishes.