---
id: RUL-FLOTA-THRESHOLDS
status: open
kind: threshold_variance
raised_by: ["flota definition (Phase 1 rating + R-103)"]
source: representation/underwriting_manual/rules.json → R-103.flags
---

# RUL-FLOTA-THRESHOLDS — "Flota" means a different count in four places

## Conflict
The threshold that makes a group of vehicles a "flota" differs by context; the source states
all four without harmonizing them.

## Source variants (verbatim)
- **≥3 vehicles** — PN con NIT (§3.1.5.1.2): "flota de mínimamente 3 vehículos…"
- **from the 2nd vehicle** — Empresas (§3.1.5.1.4): "se considera una flota a partir del
  segundo vehículo a una póliza…"
- **"uno o más"** — Commercial (§4.4): "uno o más vehículos suscritos bajo una misma póliza
  dentro del Segmento Commercial (no Consumer)…"
- **≥4 vehicles** — Consumer (§4.4): "grupo de mínimamente 4 vehículos bajo una misma
  póliza…"

Representation flag (R-103): "No se armoniza: cada regla cita su propio umbral."

## Recommended resolution (NON-BINDING — D-P2)
Do **not** unify into one threshold — they are context-scoped and each is correct for its
segment/tariff. Keep four context-keyed definitions (`flota_threshold[segment]`) rather than a
single `flota_size` rule. Confirm this is intended segmentation, not an editing drift.
*Advisory only.*

## Resolution (filled when ruled)
_keep_context_scoped:_ — · _ruled_by:_ — · _date:_ —
