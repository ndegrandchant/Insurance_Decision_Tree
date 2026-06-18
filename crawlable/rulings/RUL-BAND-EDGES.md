---
id: RUL-BAND-EDGES
status: open
kind: undefined_boundary
raised_by: ["T-RENOVACION bands; TBL-TAR-MOTO (Phase 1 rating)"]
source: representation decision_trees.json T-RENOVACION band flags + tables.json TBL-TAR-MOTO.note
---

# RUL-BAND-EDGES — Undefined band-boundary inclusivity (50/51, 60, 150, 250; moto-VA gap)

## Conflict
Several siniestralidad/VA band boundaries are stated so adjacent bands share or skip an edge,
and the source never fixes which band owns the exact value. In S2 every such edge must be an
explicit flagged row, never a silent `<`/`<=`.

## Source variants (verbatim)
- **Consumer bands:** "hasta el 60%" vs "entre el 60% y el 150%"; "entre 150% y 250%" vs
  "mayor al 250%" — the exact 60 / 150 / 250 values appear in two adjacent bands.
  Representation: "la fuente no precisa a qué banda pertenece el valor exacto de frontera."
- **Pesados/motos bands:** "menor o igual al 50%" vs "desde el 51%" (the open interval
  (50%,51%) is unassigned); "hasta el 250%" vs "a partir del 250%" (250 shared).
- **Moto VA tariff (TBL-TAR-MOTO):** two cent-level gaps — tramo 2 ends "21.000,00" / tramo 3
  starts "21.001,00" (21.000,01–21.000,99 undefined); tramo 3 ends "35.000,00" / tramo 4 starts
  "35.001,00" (35.000,01–35.000,99 undefined). Both flagged in `TBL-TAR-MOTO.boundary_conflicts`.
- **Franquicia Empresas (TBL-FRANQ-EMPRESAS):** the VA bracket "Mayor a 420.000 hasta 700.000"
  (Bs. 1.500) and the categorical row "Vehículos de Lujo mayores a Bs. 420.000" (Bs. 2.100) both
  match a lujo vehicle > 420.000; the source states no precedence between VA-bracket and
  category. Modelled with the categoricals as `special_rows` (more specific), but the precedence
  is not in the source — flagged here, not silently resolved.

## Recommended resolution (NON-BINDING — D-P2)
Standard actuarial convention: make each lower bound **inclusive** and each upper bound
**exclusive** (`[lower, upper)`), and read "(50%,51%)" as the 50% boundary belonging to the
"≤50%" band (so the gap closes upward). For the moto-VA cent.-level gap, round to the band
below. These are conventions, not source — confirm with Suscripción before binding. *Advisory.*

## Resolution (filled when ruled)
_inclusivity_convention:_ — · _50_51_gap_owner:_ — · _ruled_by:_ —
