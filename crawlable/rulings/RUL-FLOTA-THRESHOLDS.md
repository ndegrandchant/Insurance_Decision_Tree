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

## Layer-E note (tier review — dissent recorded, declined)
Considered surfacing this as a provenance caveat on the router's `consumer_fleet_4plus` branch
(verifier V3). Majority (V1 + V2) declined: that branch keys off the caller-supplied `client_type`
enum, which already fixes the **Consumer** segment, so the ≥4 reading is unambiguous *there* — the
other thresholds (≥3 PN con NIT, ≥2 Empresas, "uno o más" Commercial) belong to other segments /
§3.1.5 tarification, not this branch. Recorded for completeness; no caveat added (it would be noise,
not signal). Tier: REFERENCE-ONLY.

## Resolution (filled when ruled)
_keep_context_scoped:_ — · _ruled_by:_ — · _date:_ —
