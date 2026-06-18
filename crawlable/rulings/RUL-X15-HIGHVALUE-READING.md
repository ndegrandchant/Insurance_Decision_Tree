---
id: RUL-X15-HIGHVALUE-READING
status: open
kind: derived_reading
raised_by: ["standard.elig.high_value"]
source: representation/underwriting_manual/decision_trees.json → T-ELIG-ESTANDAR X15.flag
---

# RUL-X15-HIGHVALUE-READING — High-value bullet packs two rules into one sentence

## Conflict
The source states the high-value exclusion and the importer-validation step in a **single
bullet**. The structured reading splits it into two thresholds (`>= 1.050.000` ⇒ excluded;
`> 700.000` ⇒ must validate authorized importer). That split is **derived from the syntax**,
not stated as two rules — flagged in the representation and carried onto the node.

## Source variant (verbatim)
> "Vehículos que tengan un Valor Asegurado igual o mayor a Bs. 1.050.000,00 … para aquellos
> que superen los Bs. 700.000 se deberá validar que hayan sido importados y comercializados
> por: Toyosa, SACI, Andar Motors, Ovando, Taiyo Motors e IMCRUZ."

Representation flag: "La fuente enlaza ambas condiciones en una sola viñeta; la lectura
estructurada (>=1.050.000 excluye; >700.000 exige validación de importador) es derivada de la
sintaxis."

## The genuinely open sub-questions
1. Is the `>700.000` importer check a *blocking gate* (decline if unvalidated) or a *data step*
   (obtain the fact, then proceed)? Modelled as `refer_authority` (validate), per
   `importer.on_missing = refer` — never a silent decline.
2. Boundary inclusivity at exactly 700.000 (the source says "superen" = strictly greater).

## Recommended resolution (NON-BINDING — D-P2)
Keep the two-threshold reading (it is the only coherent parse) and treat the importer check as
a **validation step → `refer_authority`**, not a decline: an unverifiable importer routes to a
human, never an auto-reject. Confirm `700.000` is exclusive (">700.000"). *Advisory only.*

## Resolution (filled when ruled)
_reading_confirmed:_ — · _importer_check_is_:_ gate|data_step · _700k_inclusive:_ — · _ruled_by:_ —
