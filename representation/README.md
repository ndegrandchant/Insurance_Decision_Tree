# representation/ — Machine-usable representation of LBC Automotores (the verbatim source extraction)

This folder is **Part 1** of the project: a high-fidelity, **verbatim-anchored** structured extraction
of the logic in two registered Spanish (Bolivia) insurance PDFs for **La Boliviana Ciacruz (LBC),
línea Automotores**. It is faithful to the source and self-describing, but it is **not executable** —
it is the canonical *representation* that the executable Part-2 graph (`../crawlable/`) is generated
from.

> **Status:** complete and verified (mechanical checks 100%; every derived field also had an
> independent fresh-context semantic pass). It is the **read-only source of truth** — `../crawlable/`
> is built *from* it and never edits it.
>
> **For the whole-project map** see [`../README.md`](../README.md); for onboarding + task routing see
> [`../PROJECT_CONTEXT.md`](../PROJECT_CONTEXT.md); for *why* it is shaped this way see
> [`../decisions.md`](../decisions.md) (D1–D13); for how it was verified see
> [`../verification_report.md`](../verification_report.md).

---

## The two source documents

| Source PDF (in the workspace root; note the literal `:` in the name) | Nature | How it is represented here |
|---|---|---|
| `AUTOMOTORES.:underwriter_manual.pdf` (41 pp., code `MAN-015`) | **Underwriting guidelines** — rules, eligibility, exclusions, authority matrices, tariffs, renewal/retroactivity bands. *Decision-shaped.* | A **rule registry** + **parameter tables** + **decision trees** → `underwriting_manual/` |
| `AUTOMOTORES.:clausulas_generales.pdf` (311 pp.) | **Registered policy-clause bundle** — Condiciones Generales LBC-AUTO + Secciones I–VII + a catalog of 144 clauses/anexos with APS "Código Asignado" codes. *Contract-text-shaped.* | A **clause registry** + **verbatim texts** + a **structured base policy** → `clausulas_generales/`. **Not** a decision tree (see [`../decisions.md`](../decisions.md) D1). |

The two were modeled **deliberately differently** because their content is different in kind: the
manual *decides*, the bundle *says what the contract is*. **Not everything is a decision tree.**

## Quick reference (counts)

| Artifact | Count |
|---|---|
| Atomic rules (`rules.json`) | **84** (ids `R-001`…`R-122`, with gaps) |
| Parameter tables (`tables.json`) | **24** (10 `verbatim_table` + 14 `parameter_digest`) |
| Decision trees (`decision_trees.json`) | **4** |
| Manual → external cross-references | **15** |
| Distinct APS clause codes (`clause_registry.json`) | **152** (base + 7 secciones + 144 cláusulas) |
| Verbatim clause-text files (`clause_texts/`) | **168** (split per print where reprints differ) |
| Cross-code findings | **6** |
| Bundle → external cross-references | **18** |
| Manual ↔ clause linkage edges (`linkage.json`) | **16** |

---

## Layout

```
representation/
  README.md                      ← this file
  underwriting_manual/           ← the underwriting manual (decision logic)
    document.json                identity, version history, inconsistencies, source artifacts
    rules.json                   84 atomic rules (logic + verbatim trigger + source anchors)
    tables.json                  24 parameter tables (authority/tariffs/mínimas/franquicias/…)
    decision_trees.json          4 trees (only where the source genuinely branches)
    cross_references.json        15 pointers out (other manuals/anexos/systems/laws)
    supplementary.json           products, objectives, examples, glossary, effective dates
  clausulas_generales/           ← the registered policy-clause bundle (contract text)
    document.json                bundle map, APS code system, reprint analysis, the 2023 conflict
    clause_registry.json         152 entries (one per distinct code) + 6 cross-code findings
    clause_texts/                168 verbatim text files (one per code; per-print where they differ)
    base_policy.json             Condiciones Generales + Secciones I–VII, structured
    cross_references.json        18 laws/entities the clause texts cite
  linkage.json                   manual-mention ↔ clause-code mapping, with match confidence
```

---

## File-by-file reference

### `underwriting_manual/`

**`document.json`** — the manual's identity and structural metadata. Key blocks:
`title_verbatim`, `document_code` (`MAN-015`), `issuer`, `page_anchor_convention`; `version_identity`
(holds the **version conflict** — see Conflicts below — via `inconsistency_flag`); `governance`
(área líder, elaborado/revisado/aprobado por); `change_log.entries`; `structural_inconsistencies[]`
(`{id,type,detail,additional}`); `source_artifacts[]` (notable verbatim snippets with `pdf_page`);
and `files` (a manifest of the sibling artifacts).

**`rules.json`** — the decision logic as **84 atomic rules**. Each entry:
| Field | Meaning |
|---|---|
| `id` | `R-001`…`R-122` (non-contiguous; 84 actual) |
| `source` | `{pdf_page, printed_page, section}` — page anchors (see Conventions) |
| `type` | rule category (eligibility / exclusion / authority / pricing / etc.) |
| `applies_to` | scope (process, segment, vehicle class…) |
| `logic` | the **structured reading** of the rule (derived; tagged) |
| `quote_verbatim` | the **verbatim Spanish trigger text** (canonical) |
| `flags` | conflicts / ambiguities / notes (where present) |
| `table_ref` / `tree_ref` | pointer to the `tables.json` / `decision_trees.json` element that carries the rule's numbers or branch shape (where present) |

**`tables.json`** — **24 parameter tables**, each `{id, name, source, columns, rows, quote, provenance}`.
The `provenance` field separates two classes: **`verbatim_table`** (printed grids transcribed
cell-for-cell, 10 of them) vs **`parameter_digest`** (prose parameters composed into a table — labels
editorial, **values verbatim**, 14 of them). **This is the single source of truth for every number.**
Includes the three authority matrices `TBL-AUTH-ESTANDAR` / `TBL-AUTH-CASEUW` / `TBL-AUTH-LICITACIONES`
(kept **separate** because their rows deliberately differ), the tariff tables `TBL-TAR-*`, the minimum
premiums `TBL-PRIMAS-MIN*`, the deductibles `TBL-FRANQ-*`, capacity `TBL-CAPACIDAD`, payment
`TBL-PAGO`, and the RC/AP/accessory/renewal tables.

**`decision_trees.json`** — **4 trees**, built **only where the source actually branches**:
`T-ELIG-ESTANDAR`, `T-ELIG-CASEUW` (eligibility for the Standard and Case-Underwriting processes),
`T-RENOVACION` (renewal by loss-ratio band), `T-RETROACTIVIDAD` (retroactivity by elapsed days). Each
tree: `{id, name, source, evaluation_order, root, exclusiones[], default_outcome}`. A gate (`root`)
admits the risk, then `exclusiones[]` are tested in `evaluation_order`; an exclusion may carry a
`lift_condition` (the documented way it can be waived). The trees are **not the whole logic** — most
eligibility/authority/rating lives in `rules.json`; the trees only capture the genuinely branch-shaped
parts.

**`cross_references.json`** — **15** outward pointers `{id, target, type, availability, sources,
context_quote}`: other LBC manuals/anexos, external systems, laws and notes the manual references but
that live elsewhere. Tagged distinct from decision logic.

**`supplementary.json`** — material that is **not** decision logic but is required context, kept
clearly apart (`_material_class: supplementary`): `products` (LBC Auto, Plan Protección Brevet, Plan
Moto Protección), `strategic_objectives`, `illustrative_examples`, `segment_and_terms_glossary`,
`effective_dates`.

### `clausulas_generales/`

**`document.json`** — the bundle's map and code system. Key blocks: `document_nature`, `product`
(`{name_verbatim, base_code_verbatim, cover_page}`), `code_system` (the APS Código-Asignado scheme;
`clause_suffix_range_present` = `2001–2147`; `codes_not_present_in_bundle` = `[2025, 2131, 2146]`),
`structure_map[]` (which pdf pages hold what), `repetition_analysis` (the **reprint study** — see
below), `conflicts[]` (the clause-2023 dual-text conflict `CONF-CG-001`), and `files`.

> **Reprint study (`repetition_analysis`).** 258 coded text blocks resolve to 152 distinct codes;
> **57 codes are printed more than once**. Of those, **44 are textually identical** and **13 differ**.
> The 13 are classed: **`presentational`** (10: 2030, 2051, 2056, 2059, 2062, 2063, 2069, 2080, 2081,
> 2100), **`form_template_variation`** (2: 2036, 2050), and **`substantive`** (1: **2023** only).

**`clause_registry.json`** — **152 entries** (one per distinct APS code = one legal text identity),
plus `cross_code_findings[]` (6). Each entry: `{code, code_normalized, code_suffix, title, prints[],
text_file, category, structured_in}`. `prints[]` lists every place the code appears in the bundle;
`text_file` points into `clause_texts/`; `structured_in` notes where the clause is further structured
(e.g. the base policy). Use this as the **index** into the clause texts.

**`clause_texts/`** — **168 verbatim text files**, the **canonical** clause wording (mechanically
sliced from the source text layer — never retyped, never paraphrased; derived fields elsewhere never
replace these). Naming: one file per code (`CG-<code>.txt`); where a code is reprinted with **differing
text**, it is split per print, e.g. `CG-2023__print_p51.txt` / `CG-2023__print_p237.txt`.

**`base_policy.json`** — the Condiciones Generales and Secciones I–VII, structured (code
`101 - 910547 - 2017 09 400`, pdf pages 2–43): `prelacion_documental` (document precedence order, with
`_derived` tagging), `definiciones` (19 defined terms), `consideraciones_generales.blocks` (30 blocks),
`obligaciones_del_asegurado_en_caso_de_siniestro` (a)–j) + the verbatim effect-of-breach clause),
`exclusiones_generales` (preamble + groups + highlighted parameters), `secciones[]` (the 7 coverage
sections, each `{code, title, pdf_pages, text_file, key_parameters}`), and `invalidez_scale` (the
disability percentage scale, the left-handed rule, and the cap). This is the **base contract skeleton**
that the catalog clauses modify.

**`cross_references.json`** — **18** references `{id, target, articles_cited, where}` to laws and
entities the clause texts cite (e.g. Código de Comercio articles, the APS regulator).

### `linkage.json` (cross-document)

The bridge between the two PDFs: **16** links `{manual_mention, manual_source, manual_rule,
bundle_codes, bundle_title, match, note}`. It maps where the **manual** names or relies on a clause to
the **bundle** code(s) that contain that clause's text, with a `match` **confidence** label and a
`note` for tensions. (The reverse — clause → rules — is a free inversion of this.) It is the proof the
two documents must be read together: e.g. "vehículo pesado" is *defined in the clauses* but used
*uncited in the manual*.

---

## Conventions (these hold across every file)

- **Anchoring.** Every element carries `pdf_page` — the **physical, 1-based PDF page** a reader opens.
  Manual artifacts also carry `printed_page` = `pdf_page − 7` (the "Página n" the manual prints in its
  own change log). The clause bundle has **no** printed numbering. Quote the trigger text alongside the
  anchor.
- **Verbatim is canonical; derived is tagged.** `quote_verbatim`, every `*_quote`, and the
  `clause_texts/` files are **source truth**. Structured fields — `logic`, `key_parameters`,
  `derived_classification`, the trees' readings — are **interpretations** of that text, marked
  `_derived` wherever judgment was involved. **The verbatim always prevails** over a derived reading.
- **Original-language terms stay verbatim.** Normative Spanish is preserved (franquicia deducible,
  plaza de circulación, eje troncal, prima ganada, siniestralidad, …). Source typos are kept with a
  `[sic]` note (e.g. `COCHABAMABA`).
- **Numbers are verbatim.** Bolivian formatting is kept exactly as printed: `Bs. 3.480.000,00`,
  `2,8%`, `$us. 1,000`.
- **Ambiguity is data — never silently resolved.** Conflicts and tensions are *represented*, not
  fixed: see `flags` fields, `*/document.json → structural_inconsistencies` / `conflicts`,
  `clause_registry.json → cross_code_findings`, and `linkage.json` notes.
- **Clause identity = the APS `Código Asignado`** (suffix `2001`–`2147`; `base` = Condiciones
  Generales; `1001`–`1007` = the Secciones). Reprints are classified, not merged; absent codes are
  recorded, not invented.

---

## Consuming the artifacts (how to actually use this)

- **Eligibility of a risk for a process** → walk `underwriting_manual/decision_trees.json`: enter at
  `root` (the admission gate), then test `exclusiones[]` in `evaluation_order`; honor any
  `lift_condition`; fall through to `default_outcome`. Cross-check the relevant `rules.json` rules
  (most eligibility detail is there, not in the tree).
- **Pricing** → `rules.json` selects the applicable mechanism/table (the pricing rules in the
  `R-030…R-044` range carry `table_ref`); the **numbers live only in `tables.json`** — resolve the
  `table_ref` and read the row, respecting `provenance` (`verbatim_table` vs `parameter_digest`).
- **Authority** → the three matrices in `tables.json` (`TBL-AUTH-ESTANDAR` / `TBL-AUTH-CASEUW` /
  `TBL-AUTH-LICITACIONES`). They differ on purpose — do **not** merge them; pick the matrix for the
  process in play.
- **Policy wording / what the contract actually says** → start at `clausulas_generales/clause_registry.json`
  (find the code by title/category; filter `derived_classification` for licitación/petroleras/BCP-specific
  texts), open its `text_file` in `clause_texts/` for the verbatim, and consult
  `clausulas_generales/base_policy.json` for the base contract the clause modifies.
- **Connecting the manual to the contract** → `linkage.json` (manual rule/mention ↔ bundle code, with
  confidence). This is how a manual decision is traced to its governing clause text.

---

## Known source conflicts & ambiguities (preserved, not resolved — and where each lives)

These are **facts about the source**, captured deliberately. Do **not** silently resolve any of them.

| Conflict | Where it is recorded |
|---|---|
| **Clause 2023** printed twice with *different operative conditions* (license "vigente al momento del evento", p.51 vs "vigencia mayor al vencimiento de la póliza", p.237) — both kept | `clausulas_generales/document.json → conflicts[CONF-CG-001]`; both `clause_texts/CG-2023__print_*.txt` |
| **Manual version identity**: cover/change-table say "4.0", page headers + info table say "3.0" | `underwriting_manual/document.json → version_identity.inconsistency_flag` |
| **TOC numbering ≠ body numbering** in §3.1.5.x–3.1.8 (artifacts cite the *body* numbering) | `underwriting_manual/document.json → structural_inconsistencies` |
| **"Flota" threshold differs by context**: ≥3 (PN con NIT) / from 2nd vehicle (Empresas livianos) / "uno o más" (Commercial) / ≥4 (Consumer) | `rules.json` rule `flags` |
| **Renovación overlap**: Consumer bands vs the separate Pesados/motos scheme contradict for a Consumer-segment pesado (e.g. 55% siniestralidad → "mismas tasas" vs "+17%") | `decision_trees.json → T-RENOVACION` (`conflict_flag`) |
| **Band boundaries undefined**: the 50/51, 60, 250 edges — inclusivity unstated | `decision_trees.json` / rule `flags` |
| **Alcoholemia**: CG exclusion 0.50 g/1000 ml vs the manual's 0,70 g/l licitación cap | `linkage.json` note / rule `flags` |
| **Clauses 2133 vs 2140** share a title with contradictory content (aranceles médicos) | `clause_registry.json → cross_code_findings` |
| **Codes 2025, 2131, 2146** absent from the bundle (recorded, not inferred) | `clausulas_generales/document.json → code_system.codes_not_present_in_bundle` |

---

## Provenance & verification

- **Mechanical before model.** All bulk verbatim text (`clause_texts/`, `quote_verbatim`, table
  values) was **sliced by parser** from the page-anchored source extraction
  (`../source_text/*.txt`), never retyped. Every `pdf_page` anchor can be checked against that file.
- **Two-layer verification.** Mechanical checks pass at 100% (quotes, anchors, table values,
  registry identities, definitions, scales, code inventory, reprint classification); separately, every
  *derived* field (rule logics, trees, clause classifications, base-policy parameters) had an
  independent fresh-context semantic pass. Method, findings, and the **honest residual-risk boundary**
  are in [`../verification_report.md`](../verification_report.md) (§4 / §4b — the residuals that the
  Part-2 graph inherits unchanged).
- **Design rationale** (why two models, why some things are trees and others are not, how conflicts
  are handled) is in [`../decisions.md`](../decisions.md) (D1–D13).

## Relationship to the rest of the project

`representation/` is the **read-only, canonical fidelity source.** The executable decision graph in
`../crawlable/` is **generated from** this folder (+ its conflict ledger `../crawlable/rulings/`);
resolutions are recorded in that ledger and regenerated — **this folder is never edited by Part-2
work.** Start at [`../README.md`](../README.md) for the full project map and
[`../PROJECT_CONTEXT.md`](../PROJECT_CONTEXT.md) for task routing.
