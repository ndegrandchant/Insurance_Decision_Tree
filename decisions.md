# decisions.md — Design decisions and rationale

Extraction of machine-usable logic from two source PDFs (La Boliviana Ciacruz, línea Automotores, Bolivia):

- `AUTOMOTORES.:underwriter_manual.pdf` — "Manual de Lineamientos de Suscripción – Automotores" (41 PDF pages).
- `AUTOMOTORES.:clausulas_generales.pdf` — registered policy-text bundle for "Póliza de Seguro de Automotores LBC-AUTO (Individual/Flota)": Condiciones Generales + Secciones I–VII + catálogo de cláusulas/anexos con códigos APS (311 PDF pages).

Each numbered entry records a decision, why it was made, and (where relevant) what was rejected.

---

## D1. Different structure per document (core judgment)

**Decision.**
- **Underwriter manual → rule registry + decision tables + decision trees.** The manual is normative/decisional: eligibility lists, exclusion lists with override conditions, authority matrices, tariff tables, siniestralidad bands → actions. It decomposes faithfully into atomic rules (`rules.json`), verbatim parameter tables (`tables.json`), and decision trees **only** where the source itself is branch-shaped (`decision_trees.json`).
- **Cláusulas generales → clause registry + verbatim texts + structured base policy. NOT a decision tree.** The document is a contract-text compilation. Its "logic" is contractual language whose authoritative form is the wording itself. Forcing a tree would require inventing evaluation order and conditions that the source does not state. Instead: a registry keyed by the APS "Código Asignado" (the document's own identifier system), verbatim clause text files extracted mechanically, plus a structured decomposition of the base Condiciones Generales (definitions, general dispositions, obligations, exclusions, Secciones I–VII) where each element carries its source anchor and verbatim basis.

**Why.** Fidelity. The manual states decisions; the clauses state terms. A tree is the right shape only for the first.

## D2. Decision trees built only where the source is branch-shaped

Trees produced (underwriter manual only):
1. **Eligibility / perfil de riesgo — Suscripción Estándar** (§3.1.2): allowed-vehicle gate + explicit exclusion list, including the exclusions the manual itself says can be lifted under stated conditions ("se podrá levantar esta exclusión…"). Tree nodes mirror the source's own structure: list of exclusions, each with optional lift-conditions branch.
2. **Eligibility / perfil de riesgo — Case Underwriting** (§3.3.1): same shape, its own exclusion list.
3. **Renovación de pólizas** (§4.1): the source defines outcome bands over siniestralidad (Comercial; Consumer with 5 bands; pesados/motocicletas with 3 bands) → genuinely tree/band-shaped.
4. **Retroactividad** (§4.11): conditional flow stated in the source (≤30 días + 2 conditions; >30 días → Case UW; siniestro en el periodo → Comité de Riesgos & Siniestros).

NOT turned into trees (kept as rules/tables to avoid inventing logic):
- Authority matrices (§3.1.3, §3.3.2, §3.5.2) → tables; the source provides no branching beyond the lookup itself.
- Tarificación (§3.1.5): segment-based parameter tables + selector conditions exactly as stated; the manual does not define a complete routing algorithm over all segments, so none was invented (`tariff_selection` is encoded as a decision *table* with explicit source conditions per row).
- Franquicias/primas mínimas (§3.1.5.4) → bracket tables, verbatim.
- A hypothetical master "which procedure does a risk go through" router. The manual describes 5 procedures with profiles but never defines a global precedence/routing algorithm. Inventing one would violate the accuracy mandate. The per-procedure eligibility trees + procedure descriptions are what the source supports.

## D3. Clause identity = APS code; duplicates represented, not collapsed silently

The bundle prints 255 coded text blocks but only **150 distinct codes** (base CG + 7 Secciones + 142 cláusulas/anexos; clause numbering 2001–2147 with gaps 2025, 2050, 2127, 2131, 2146 — recorded as `codes_not_present`). The licitación clause set (≈2051–2096) is printed three times; several other codes twice.

**Decision.** `clause_registry.json` has **one entry per distinct code**, with every print location listed (`prints[]`, each with PDF pages and a SHA-1 of its whitespace-normalized text). Where reprint texts differ only in page-furniture/signature-block casing or form-blank style, the canonical text = first print, and the difference is recorded as `variant_class: "presentational"`. Where wording differs substantively, **both texts are kept** and the entry is flagged `conflict: true` (see D4). Rationale: collapsing silently would hide source facts; exploding 255 entries would misrepresent the registry (the code is the legal identity).

## D4. Conflicts and ambiguities are represented, never resolved

Maintained in the artifacts via `flags` / `conflicts` fields plus a consolidated list in each `document.json`. Highlights found during scoping (full list in the artifacts):
- **Clause 2023 (Eliminación de la Limitación de Edad Máxima): two prints with substantively different conditions** — p.51: license "vigente al momento del evento"; p.237: license issued "y la vigencia sea mayor al vencimiento de la póliza". Same APS code, different registered wording → both texts preserved, flagged as conflict.
- **Manual version identity inconsistent**: cover "VERSIÓN 4.0" and change-table "VERSIÓN: 4.0", but document-info table "Nro. de Versión 3.0" and every page header "Versión 3.0". Recorded verbatim in `document.json`; not resolved.
- **Manual TOC numbering ≠ body numbering** in §3.1.5.x–3.1.8 (e.g., TOC "3.1.6 Primas y Franquicias…" vs body "3.1.5.4 Primas y Franquicias…"). Both numberings recorded; rules cite the **body** numbering with page anchors.
- **"Flota" thresholds differ by segment/context** (≥3 vehicles for Personas Naturales con NIT §3.1.5.1.2; "a partir del segundo vehículo" for Empresas §3.1.5.1.4; ≥4 vehicles for Consumer §4.4; "uno o más vehículos" for Commercial §4.4). All four definitions captured separately with anchors; the tension is flagged, not harmonized.
- **Alcoholemia thresholds differ across documents** (CG exclusion: 0.50 g/1000 ml; manual licitaciones constraint: no suscribir alcoholemia permitida >0.70 g/l) → captured on both sides + linkage note.
- Case UW vs Licitaciones authority for Lizeth Rios differs (100 / 1.400.000 vs 10 / 700.000) — kept as two separate tables (not assumed to be a typo).

## D5. Verbatim text is extracted mechanically, not retyped

All clause bodies in `clause_texts/` come from a deterministic parser over the page-anchored text layer (`source_text/*.txt`, produced with pdfplumber). I did not hand-retype contract text, eliminating LLM transcription drift for the bulkiest, most fidelity-critical content. What the parser does is recorded here for auditability:
- Anchors on `Código Asignado…` lines; titles collected upward (uppercase lines, keyword-initial Title-Case lines, parentheticals, wrapped continuations), stopping at signature blocks.
- Strips ONLY page furniture: my `===== PAGE n =====` markers and the repeated page-top boilerplate (`Forma parte integrante de la Póliza: Certificado:` / `Emitida a favor de:`), which is recorded once in `document.json` as `page_header_template`. Signature blocks are kept inside texts.
- Embedded Word-comment artifacts (`Comentado [..]: …`) are removed from titles, preserved in a `word_comments` field, and noted as source artifacts.
- PDF page spans recorded per print. Line-wrap hyphens/whitespace are preserved as extracted (text fidelity over prettiness).

## D6. The underwriter manual's rules are hand-structured but quote-anchored

Manual rules require interpretation into condition→outcome form; every `rules.json` entry therefore carries `source` (PDF page + printed page + section) and `quote` (verbatim Spanish trigger text) so each structured reading can be audited against the manual. Where my structured reading involves any judgment beyond restating the sentence, the entry carries `notes`/`flags` explaining the reading. Original-language terms are kept verbatim throughout (plaza de circulación, franquicia deducible, eje troncal, etc.); no translation of normative content.

## D7. Supplementary material captured and tagged as distinct from decision logic

Per the task's explicit requirement (this is the deliberate exception to minimalism):
- `cross_references.json` per document: every pointer to other manuals/anexos/sistemas/leyes (Manual de Ingeniería de Riesgos, Anexo 1/2, CRM/FIDENS, RUAT, APS, Código de Comercio arts., Ley 365, Ley 708, Ley 1008, SOAT, etc.) with location and quoted context.
- `supplementary.json` (manual) / fields in clause registry & base policy (clauses): definitions, worked examples / illustrative cases (e.g., the manual's enumerated examples like "motos BMW o DUCATTI", importer whitelist; the YPFB licitación anexos as concrete licitación examples), version history/change log (forward-looking metadata: what changed, when, where), effective dates, leftover authoring artifacts ("Comentado [JR1]", "Con formato: Sin Resaltar").
- Everything supplementary carries `material_class` tags (`metadata`, `cross_reference`, `example`, `artifact`, `definition`) so downstream features can separate it from operative logic.

## D8. Page anchoring convention

`pdf_page` = physical page of the PDF file (1-based, what a reader opens). For the manual, `printed_page` (the "Página n" in the footer/header, offset −7 from PDF page) is also recorded since the manual's own change log cites printed pages. The cláusulas bundle has no printed page numbers → PDF pages only.

## D9. Intermediate working files kept for audit

`source_text/*.txt` (page-anchored extraction) and `work/` (parser outputs, table dumps, rendered formula image) are working artifacts that make verification reproducible; they are not deliverables but are intentionally left in place so every anchor can be checked without re-running extraction. The garbled loss-ratio formula (manual PDF p.26) was transcribed from a page render: `Ind. Siniestralidad = (Siniestralidad Pagada + Siniestralidad en Reserva) / Producción de Primas Netas × 100` (image: `work/manual_p26_formula.png`).

## D10. Verification approach

- Mechanical layer: re-parse + hash checks (clause segmentation, code inventory, duplicate-text classification) are deterministic and re-runnable.
- Semantic layer: fresh-context verifier subagents check artifacts against `source_text/*.txt`: (a) clause registry sample + all flagged conflicts; (b) base_policy.json sampled blocks/secciones; (c) every manual rule/tree logic vs the manual text; (d) coverage checks for normative content not captured. Findings fixed and logged in `verification_report.md`; anything unverifiable is reported there plainly.
- **Revision (post build):** after two spend-limit interruptions killed the original four heavyweight verifiers mid-run, verification was restructured: an exhaustive deterministic verbatim layer run in-session (every quote/anchor/table value/registry identity checked programmatically — 100% coverage at near-zero cost) plus two lean fresh-context semantic verifiers focused purely on meaning-distortion (full pass over manual rules/trees; sampled pass over clause classifications and base policy). The split of labor and the resulting residual-risk boundary are documented in `verification_report.md` §1 and §4.

## D13. Provenance classes for manual tables (added after verification)

`tables.json` distinguishes `verbatim_table` (a printed grid transcribed cell-for-cell, e.g. the three authority matrices, Moto brackets, franquicia brackets) from `parameter_digest` (parameters stated in prose, restructured as rows: labels are editorial, values verbatim). The original note claimed blanket verbatim transcription; the mechanical verifier showed digest labels are not source text, so the claim was corrected rather than the tables reshaped — the values were always verbatim and remain machine-checked.

## D11. Clause classification fields are derived, and marked as such

`clause_registry.json` enrichment (categoría, usage restriction, what the clause modifies, 1–2 sentence effect summary, numeric parameters) is **derived** from the verbatim text (by reader subagents + my review), tagged `derived: true`, and never substitutes the verbatim text, which remains canonical. Usage restrictions are taken only from explicit text ("PARA USO EXCLUSIVO EN LICITACIONES", "(PETROLERAS)", "– BCP", "Personas Naturales", "TIPO B"), not inferred.

## D12. Scope guardrails

No re-formatting of the source PDFs, no backups, no extra tooling beyond extraction/verification needs. Names of underwriters (personal data in authority matrices) are part of the source logic and are reproduced as-is because the matrices are operative rules.
