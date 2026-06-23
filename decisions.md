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

---

## D-PLAT-1. Operational changes route through ledger + regenerate, never graph patching

**Decision.** The platform treats `representation/` as immutable source truth and generated
`crawlable/**` graphs as immutable version snapshots. Business changes are represented as governed
ledger entries (`RUL-*` or `OVL-*`) and become executable only through regenerate + validate +
new `graph_version`.

**Why.** This preserves the existing single-source-of-truth rule and prevents a UI or AI module from
silently diverging from the verified extraction.

## D-PLAT-2. Reusable artifact graph skeleton for future manuals

**Decision.** Net-new executable domains use a generic `ArtifactGraphEngine`: facts file + graph
JSON + JSONLogic + source/source_quote/_origin + ledger conflicts. The Automotores coverage slice is
configuration/data over this runtime, not a one-off evaluator.

**Why.** The skeleton must be reusable for different manuals. New manuals should swap artifacts and
validators, not rewrite runtime behavior.

## D-PLAT-3. Coverage logic lives under `crawlable/graph_coverage/`

**Decision.** Daños Propios + Robo Parcial coverage artifacts live in `crawlable/graph_coverage/`
with `facts_coverage.json`, `coverage_validate.py`, and `coverage_reconcile.py`.

**Why.** Coverage is net-new, but it should reuse the repo's extraction-grade discipline and remain
close to the existing generated graph artifacts.

## D-PLAT-4. v1 vigencia is version-ready but single-version honest

**Decision.** The schema supports version/vigencia selection, but the seeded live UW version is the
one extracted source version. Cross-version date selection remains dormant until a second extracted
manual/wording version exists.

**Why.** Backfilling historical versions would require a separate Part-1 extraction. The platform
must not fake historical source versions.

## D-PLAT-5. Data-dependent modules are gated by Phase 0.5 discovery

**Decision.** Claims feedback, friction, simulations, and AI proposals remain gated unless imports or
a read-only source DB provide `submission.fact_vector` and claim-to-node/clause/section linkage.

**Why.** Without replayable fact vectors and source-backed claim linkage, those modules would be
descriptive guesses rather than auditable intelligence.

## D-PLAT-6. Chatbot and AI extraction are advisory only

**Decision.** `/api/nl/extract-facts` returns unconfirmed advisory facts. `/api/uw/run` and
`/api/coverage/run` reject unconfirmed NL extraction payloads.

**Why.** The deterministic engines must never consume facts invented or ambiguously inferred by an
LLM. The user must confirm/correct before execution.

## D-PLAT-7. Coverage outputs are orientation, not final determinations

**Decision.** Coverage engine responses include the guardrail "orientation, not a coverage
determination"; source conflicts, causation/valuation/document ambiguity, and cross-document tension
escalate.

**Why.** Spanish wording remains canonical, and coverage decisions are legally sensitive.

## D-PLAT-8. Renewal changes are scoped deltas, not graph forks

**Decision.** Client renewal exceptions store the base `graph_version` plus client/policy-scoped
price adjustments and changed target refs (`node`, `table`, `clause`, `fact`, or `rating_factor`).
They do not clone the full tree and do not edit `representation/` or generated `crawlable/` graph
artifacts.

**Why.** Many clients may need small renewal-specific adjustments. Storing deltas keeps storage tiny,
preserves replayability, and avoids corrupting the source-backed graph used for everyone else.

## D-PLAT-9. Pricing is a UW terminal stage, not a standalone workflow

**Decision.** Pricing is no longer exposed as its own independent workflow. The UW run appends a
rating stage only after the UW walk reaches an eligible/conditional outcome. As of D-PLAT-15, that
stage is `rating.lbc_auto.final_prices` and uses the isolated LBC Auto rating module. A final approved
price is returned only when UW is eligible and pricing has no review flags.

**Why.** Underwriters should approve one underwriting packet: eligibility path plus final price. The
rating parameters stay outside the source-backed graph, but the produced price belongs to the UW
decision trace rather than a separate calculator.

## D-PLAT-10. Spanish-first product language with stable internal contracts

**Decision.** User-facing platform language is Spanish-first: UI labels, operational prompts,
human-review packets, governed proposal copy, renewal workbench text, and backend messages that can
surface to users. Internal API keys, graph node ids, route names, canonical outcome/status values,
and verbatim/source-backed manual text remain unchanged unless the source itself changes.

**Why.** The users and manuals are Spanish-speaking, but translating machine contracts or cited source
text would break integrations and weaken auditability.

## D-PLAT-11. `decline` is rendered as "No elegible", not "Rechazar"

**Decision.** The UI displays the canonical executable outcome `decline` as "No elegible". The raw
machine value remains `decline`.

**Why.** The underwriting source and generated graphs usually express these terminal states as
"excluido" or "NO elegible" within a procedure. "Rechazar" can imply a final case rejection and would
overstate the source-backed meaning, especially where another procedure or human review may still be
appropriate.

## D-PLAT-12. Multimodal extraction stays advisory and Spanish-first

**Decision.** The NL endpoint may use OpenAI for Spanish-first text extraction, image OCR/vision, and
audio transcription, but those outputs are merged only as unconfirmed suggestions. Deterministic regex
matches are not overwritten by AI suggestions, and executable engines still reject unconfirmed facts.
Source-backed manual text, node ids, and canonical machine values remain unchanged.

**Why.** Intake will often include photos, voice notes, and informal Spanish. Multimodal
parsing can reduce typing, but it must not drift from the manuals or silently turn ambiguous user
messages into source-backed decisions.

## D-PLAT-13. Chat is a local memory workflow, not an external agent

**Decision.** The project no longer carries an external agent integration. The frontend exposes a
plain `Chat` module backed by `/api/chat` and `/api/chat/{session_id}`. It persists case memory,
known facts, pending facts, current question, last customer message, and last RiskIQ summary in the
project JSONL store. It may run RiskIQ automatically when the conversation contains insurance intent
and enough facts, but RiskIQ remains the decision authority.

**Why.** The previous agent-shaped layer was a simulation inside this repo. The user asked to remove
that integration and keep only the OpenAI parser/key plus simple chat memory, so the implementation
should not imply that a live external agent or messaging bridge exists.

## D-PLAT-15. LBC Auto pricing is an isolated reverse-engineered rating compartment

**Decision.** The old demo heuristic remains in the repo for compatibility, but tree executions now
call `platform/engine/insurance_engine/lbc_auto_rating.py` for pricing. The module implements the
user-provided LBC Auto formula: value tier/floor/cap logic, city/brand/year calibrated factors,
three fixed option ratios and floors, extraterritorialidad, and credit installment math. The
underwriting graph and `representation/` artifacts are not edited; pricing is appended only after an
eligible/conditional UW result as `rating.lbc_auto.final_prices`. Unknown city or brand inputs use
the calibrated La Paz/Toyota base and trigger pricing review instead of silently approving.

**Why.** The formula was reverse-engineered from API observations, not extracted from the manuals or
the live SAVIA/ATIC tariff database. Keeping it outside the source-backed decision graph lets us
return final option prices from tree runs now, while preserving a clean replacement point for a future
official tariff integration.

## D-PLAT-16. Chat runs as part of the backend stack

**Decision.** The chat channel is not a separate runtime. The same backend that serves the RiskIQ APIs
also serves `/api/chat`, stores sessions in `platform/db/chat_sessions.jsonl`, and exposes the
frontend packet rail. The VPS stack remains backend, scheduler, Postgres, and reverse proxy.

**Why.** This keeps the project deployable without a second agent process, external messaging
credentials, or a simulated messaging process. It also makes chat memory inspectable in the project
data store.

## D-PLAT-18. Missing facts split into client follow-up vs professional task

**Decision.** A stopped tree packet now carries `resolution_channel`. If a missing fact is
`client_followup`, the chat asks the client or broker the exact missing question, treats the next
answer in that conversational context as the confirmed value for that requested fact, and replays
RiskIQ. If the packet is `human_task`,
the backend creates a routed task for the professional role. The first branch is used for ordinary
`on_missing=ask` facts; the second is used for `on_missing=refer`, derived/professional validation,
pricing review, governance/source conflicts, and non-resumable review.
Client-facing questions are intentionally conversational: booleans invite `sí`/`no`, numeric facts
can be answered with just the number, and enum facts show short examples. A short answer is treated
as an answer to the current pending question, not as a new free-form intake.

**Why.** Most sales conversations should not become underwriting tasks just because the next fact is
missing. Asking the client for reasonably knowable facts keeps the sale moving and preserves UW
capacity for facts or judgments the client cannot reliably provide. RiskIQ still decides only after
facts are confirmed and the tree is replayed.

## D-PLAT-20. Local chat is intent-first, with regex only as fallback

**Decision.** The local chat prefers the OpenAI parser when configured and uses deterministic phrase
matching only as a no-network fallback. The parser prompt is allowed to map direct commercial intent
to facts when the wording supports it, such as treating "cotizar automotores" as generic
`product=otro`, but it must not infer risk conditions like absence of deviations, licitation, mass
grouping, vehicle exclusions, or coverage flags without client wording. The chat persists known
facts, pending facts, current question, requested fact, last customer message, and last result
summary. A memory confirmation such as "están bien" confirms pending facts from an older advisory
turn instead of starting a new extraction; if RiskIQ is already asking a specific blocking question,
the same phrase keeps the packet unchanged and repeats the required datum rather than inventing an
answer. The chat does not ask for a final "Confirmar y continuar" step; when RiskIQ stops on a
client-answerable fact, short answers like "no" are parsed against that pending question.

**Why.** The broker flow should feel like a working packet, not a form with a chat skin. Automatic
execution is acceptable in this channel because RiskIQ remains the decision authority and the chat
only converts the client's conversational turn into typed facts with visible packet state.

## D-PLAT-19. Scheduler cancels stale operational follow-ups

**Decision.** The follow-up scheduler cancels pending/snoozed follow-ups when their target case is no
longer open or their human task is no longer awaiting input. It still creates new follow-ups for
open cases, active human tasks, and renewals when no open follow-up exists.

**Why.** The broker queue should represent work that still needs action. Leaving follow-ups attached
to won/lost/closed cases or completed human tasks would create false pressure and make C-suite
metrics noisy.
