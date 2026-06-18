---
id: RUL-FRANQ-MOTO-OVERLAP
status: open
kind: overlap
raised_by: ["TBL-FRANQ-MOTO"]
source: representation/underwriting_manual/tables.json → TBL-FRANQ-MOTO.note
---

# RUL-FRANQ-MOTO-OVERLAP — Moto franquicia rows overlap above 70.000 (S2 boundary)

## Conflict
The Moto Protección minimum-deductible table prints three rows; rows 2 ("Mayor a Bs. 35.000")
and 3 ("Mayor a Bs. 70.000") are both **open above** their lower bound, so for any
`valor_asegurado > 70.000` **both** rows match with different outputs, and the manual does not
state which prevails.

## Source variants (verbatim)
| valor_asegurado | Santa Cruz/La Paz/Trinidad | Resto del País |
|---|---|---|
| Hasta Bs. 35.000,00 | Bs. 350 | Bs. 350 |
| Mayor a Bs. 35.000,00 | Bs. 700 | Bs. 350 |
| Mayor a Bs. 70.000,00 | Bs. 1.500 | Bs. 1.500 |

Representation note: "Los tramos 2 y 3 se solapan para VA > 70.000 (un VA > 70.000 también es
> 35.000). El manual no define la precedencia; se transcribe tal cual."

## Behaviour
`TBL-FRANQ-MOTO` is `hit_policy: unique`; the overlap edge (70.000) is listed in
`boundary_conflicts → RUL-FRANQ-MOTO-OVERLAP`. A `bracket_lookup` for a VA > 70.000 finds 2
matching rows ⇒ unique violation ⇒ the crawler **escalates** citing this entry (it does not
pick 700 or 1.500). A VA in (35.000, 70.000] resolves cleanly to row 2; VA ≤ 35.000 to row 1.

## Recommended resolution (NON-BINDING — D-P2)
Read it as a tiered ladder (the obvious intent): row 2 = **(35.000, 70.000]**, row 3 =
**(70.000, ∞)**, i.e. cap row 2's upper at 70.000 inclusive. Then VA > 70.000 ⇒ Bs. 1.500.
Confirm the 70.000 edge belongs to row 3 ("Mayor a 70.000" = strictly greater ⇒ exactly
70.000 stays in row 2). *Advisory only — table stays unique+flagged until ruled.*

## Resolution (filled when ruled)
_row2_upper:_ — · _row2_upper_inclusive:_ — · _row3_lower:_ — · _ruled_by:_ —
