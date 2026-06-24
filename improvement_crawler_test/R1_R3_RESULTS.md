# improvement_crawler_test — Phase-3 trial: R1 (clause OCR) + R3 (linkage) vs the canonical data

> A fresh, independent re-derivation of the two reference-side residuals, compared **closely** against
> the canonical `representation/` extraction. Method: render the actual PDF page glyphs (R1) / read the
> source + judge legal equivalence (R3), *without* copying the canonical first, then diff.
> Tooling: `render.py` (page→PNG), `crop.py` (high-res passage crops) under `renders/`.

---

## R1 — clause-body OCR fidelity (re-read the page glyphs vs the canonical clause_texts)

**Question.** For each anomaly-flagged clause, does the rendered **page image** confirm the canonical
text (a *faithful* preservation of a genuine source-print defect), or does it reveal a **text-layer
extraction error** (image shows the correct glyph, canonical got it wrong)?

**Sample (5 of 53 anomaly-flagged clauses; the OCR/typo-flavored ones).**

| clause | pg | canonical (flagged) | image glyphs (fresh read) | verdict |
|---|---|---|---|---|
| **2052** | 100 | "los **danos**", "causados **0** sean", Art.4 "**do** la Póliza" | "danos" (no ñ); standalone **0** (zero, taller than the lowercase "o" in "Directa o indirecta" below); "do" | **FAITHFUL** — all 3 are genuine source-print defects |
| **2034** | 78 | "del **Surbrogatario** (de existir)" | "Surbrogatario" (extra *r*), while "Subrogatario" is correct in the lines above/below | **FAITHFUL** — genuine isolated source typo |
| **2008** | 90 | run-on "…15 días **calendario.por** los costos…" (garbled/spliced) | exact same run-on; note "daños" *is* correctly ñ-spelled here | **FAITHFUL** — source corruption; proves ñ is kept when present |
| **2050** | 98 | "a **afectos** que el Subrogatario" | "afectos" (a-for-e) | **FAITHFUL** — genuine source typo for "efectos" |
| **2062** | 111 | "tapas o **tasas** de llantas" | "tasas" (s-for-z) | **FAITHFUL** — genuine source typo for "tazas" |

**R1 verdict: 5/5 FAITHFUL. Zero text-layer errors found.** In every case the rendered page glyphs
**agree** with the canonical text — the defects live in the source PDF itself, not in the extraction.
The 2008 case is decisive evidence both ways: the extraction kept "daños" (with ñ) where the source
has it and "danos" (without) where the source lacks it — i.e. the slicer faithfully mirrors the page.

**Disposition.** The residual-R1 worry (a meaning-altering glyph error the text layer got wrong but an
image would catch) is **not realized** in this sample. The canonical's `[sic]`/`anomalies` flagging was
the correct call: these are source-side defects to *preserve*, not extraction bugs to *fix*. Re-OCR
**confirms** the canonical rather than correcting it. (Caveat: a 5/53 sample — high agreement, not a
proof over all 53; but it strongly downgrades the likelihood that the text layer silently corrupted
meaning.) Nothing to change in `representation/`.

---

## R3 — linkage rule↔clause match confidence (re-judge the judgment-call edges vs source)

**Question.** For each non-exact edge (`partial`/`related`/`unmatched`), is the link target right and is
the confidence label faithful to the actual source correspondence? (16 edges: 8 exact, 5 partial, 2
related, 1 unmatched — the 8 non-exact are the judgment calls.)

**Sample (4 of the 8 non-exact edges).**

| edge | canonical | fresh judgment from source | verdict |
|---|---|---|---|
| **R-015 → 2034** | partial | R-015 lists "Renovación y Depreciación Anual…" as not-available in Standard; CG-2034 *is* that clause (renovación + 10% depreciación anual + Valor Asegurado actualizado). Only the manual's mention adds the scope phrase "para Pólizas Mayores a Un Año" absent from the registered title. | **AGREE** — link correct; `partial` is *conservative* (content-exact, title-partial) |
| **extraterritorialidad → 2027** | partial | CG-2027 *is* the extraterritorialidad clause; the 30-días period matches the manual. Real tension: manual calls it "que forma parte de la póliza" (base) vs 2027 titled "COBERTURA **ADICIONAL**". | **AGREE** — `partial` faithfully captures the base-vs-additional tension |
| **Nota Aclaratoria (vehículos antiguos) → [] ** | unmatched | Manual X12 lifts the >20-yr-vehicle exclusion if a "Nota Aclaratoria sobre este tipo de vehículos" + the Talleres clause (CG-2045) are included. No "Nota Aclaratoria" text exists in the bundle. **Critically, CG-2023 "Eliminación de la Limitación de Edad Máxima" is about the DRIVER's age (>69 yrs), NOT the vehicle's age** — so it is *not* this clause. | **AGREE** — genuine source gap; canonical correctly **avoided a false match to 2023** |
| **alcoholemia → 2002** | related | CG-2002 sets no number — it defers the permitted dosage to the Condiciones Particulares (a *mechanism*). R-097 caps what may be pactado (0,70 g/l); the CG exclusion is 0,50 g/1000ml. Three layered, distinct rules. | **AGREE** — `related` (not exact) is correct: connected but not the same rule |

**R3 verdict: 4/4 AGREE with the canonical labels.** The link targets are right and the confidence
labels are honest and appropriately conservative. The standout is edge 3: the canonical's
discriminating judgment — **not** conflating CG-2023 (driver age) with the antique-*vehicle* Nota
Aclaratoria despite the superficial "edad máxima" similarity — is exactly right; a careless linker
would have produced a false positive. The `unmatched` edge is a *real* represented gap (a required X12
lift condition with no clause text), and it already surfaces at runtime (the crawler's antique
exception lists `nota_aclaratoria_vehiculos_antiguos (linkage: unmatched — sin texto en el bundle)` —
confirmed via the O5 `governing_clauses` output).

**Disposition.** No edge needs re-labeling. (Caveat: 4/8 non-exact edges sampled.) Nothing to change
in `representation/linkage.json`.

---

## Conclusion — Phase-3 reference residuals validated against source

| residual | sample | result | canonical holds? |
|---|---|---|---|
| **R1** clause-body OCR fidelity | 5 / 53 anomaly clauses | 5/5 **FAITHFUL** — page glyphs match the canonical; defects are source-side, correctly preserved | **Yes** — re-OCR confirms, doesn't correct |
| **R3** linkage match confidence | 4 / 8 non-exact edges | 4/4 **AGREE** — targets right, labels honest, false-match correctly avoided | **Yes** — no re-labeling needed |

**Bottom line.** Both reference-side residuals were re-derived independently from the source and
**confirmed**: the canonical extraction is faithful (R1) and its linkage judgment calls are sound (R3).
No corrections to `representation/`. These were *sampled* checks (high agreement, not exhaustive proof),
so the residuals remain *bounded* rather than *eliminated* — but the trial substantially de-risks them
and shows the extraction discipline (preserve source defects with flags; label match-confidence
honestly; avoid false matches) held up under a fresh adversarial re-read. This was the last untested
surface; with the crawler runtime closed out, Phase-3 verification is complete on these samples.
