---
id: RUL-RENOV-CONSUMER-PESADOS-OVERLAP
status: open
kind: overlap
raised_by: ["T-RENOVACION (Phase 1 rating/renovación)"]
source: representation/underwriting_manual/decision_trees.json → T-RENOVACION.conflict_flag
---

# RUL-RENOV-CONSUMER-PESADOS-OVERLAP — Consumer bands vs pesados/motos scheme contradict

## Conflict
The Consumer renovación policy declares its scope as "cualquier póliza que corresponda a un
riesgo con perfil de Suscripción Estándar (livianos, **pesados, motocicletas**, etc.)", which
overlaps the separate point-3 scheme for "Vehículos Pesados y motocicletas". For a
Consumer-segment pesado/moto the two give different outputs and the source states no
precedence.

## Source variants (verbatim, worked points)
- siniestralidad **55%**: Consumer bands → "mismas tasas" (≤60%) vs pesados/motos → "+17%"
  (51–250%) — **contradictory**.
- siniestralidad **200%**: Consumer bands → "+50%" (150–250%) vs pesados/motos → "+17%" —
  **contradictory**.
- siniestralidad **40%**: "mismas tasas" vs "mantener tasas" — coincident.

Representation conflict_flag: "La fuente no indica cuál esquema prevalece para
pesados/motocicletas del segmento Consumer."

## Recommended resolution (NON-BINDING — D-P2)
Apply the **more-specific point-3 pesados/motos scheme** to Consumer pesados/motos (specific
overrides general), reserving the Consumer bands for livianos. This is a guess about intent;
the source does not say so — confirm with Suscripción. *Advisory only.*

## Resolution (filled when ruled)
_governing_scheme_for_consumer_pesados:_ — · _ruled_by:_ — · _date:_ —
