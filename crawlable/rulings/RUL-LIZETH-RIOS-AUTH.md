---
id: RUL-LIZETH-RIOS-AUTH
status: open
kind: threshold_variance
raised_by: ["TBL-AUTH-CASEUW vs TBL-AUTH-LICITACIONES (Lizeth Rios row)"]
source: representation/underwriting_manual/tables.json (TBL-AUTH-CASEUW / TBL-AUTH-LICITACIONES) + decisions.md D4
---

# RUL-LIZETH-RIOS-AUTH — Lizeth Rios authority differs between Case-UW and Licitaciones

## Conflict
The same suscriptor, Lizeth Rios, has different authority limits in the Case-UW matrix vs the
Licitaciones matrix. The source does not mark either as a typo; both are kept (decisions.md D4).

## Source variants (verbatim)
- **Case Underwriting** (§3.3.2): Lizeth Rios — número de vehículos **100** / mayor vehículo
  **Bs. 1.400.000,00**.
- **Licitaciones** (§3.5.2): Lizeth Rios — número de vehículos **10** / mayor vehículo
  **Bs. 700.000,00**.

(Note: the Estándar matrix §3.1.3 lists "Lizeth Ríos" with 100 / 1.400.000,00 — consistent with
Case-UW. Only the Licitaciones row diverges.)

## Behaviour
The two matrices are kept as separate `matrix_lookup` tables, so an authority check for Lizeth
Rios returns 100 / 1.4M under `case_underwriting.authority` and 10 / 700k under
`licitaciones.authority`. Both authority nodes carry a non-binding caveat → this entry, so any
Lizeth-Rios authority decision surfaces the discrepancy in its audit. Nothing is harmonized.

## Recommended resolution (NON-BINDING — D-P2)
The Licitaciones limits (10 / 700k) are markedly lower than this suscriptor's Estándar/Case-UW
limits (100 / 1.4M); this may be intentional (tighter authority for public-tender risk) or a
transcription slip. Confirm with Suscripción whether Lizeth Rios's licitación authority is
genuinely 10 / 700.000. *Advisory only — both tables stand until ruled.*

## Resolution (filled when ruled)
_licitaciones_row_correct:_ yes/no · _corrected_values:_ — · _ruled_by:_ — · _date:_ —
