---
id: RUL-CASEUW-C05-RENTACAR
status: open
kind: dual_text
blocking: true
raised_by: ["case_underwriting.elig.rent_a_car (C05)"]
source: representation/underwriting_manual/decision_trees.json → T-ELIG-CASEUW C05.flag
---

# RUL-CASEUW-C05-RENTACAR — Case-UW Rent-A-Car exclusion contradicts its own clarification

## Conflict
Case-UW exclusion C05 excludes "Vehículos de alquiler (Rent-A-Car)" but the very next sentence
says "Esta exclusión no aplica a vehículos alquilados." A Rent-A-Car **is** a rented vehicle, so
the outcome for a rented vehicle is indeterminate. The crawler therefore **escalates** at C05
(blocking conflict) instead of asserting decline.

## Source variants (verbatim)
- **exclusion:** "Vehículos de alquiler (Rent-A-Car)"
- **clarification:** "Esta exclusión no aplica a vehículos alquilados."

Representation flag: "La aclaración de la fuente es ambigua (excluye Rent-A-Car pero 'no aplica
a vehículos alquilados'); se transcribe sin interpretar."

## Interaction worth noting (cross-process)
Standard exclusion X10 routes **rent-a-car-petroleras → Case Underwriting**. Once in Case UW,
this C05 contradiction is exactly what such a vehicle hits. So the X10→Case-UW path terminates
here at an escalation until C05 is ruled — surfacing the tension rather than silently declining
a vehicle Standard deliberately forwarded.

## Recommended resolution (NON-BINDING — D-P2)
The clarification likely intends a narrower exclusion than its heading: e.g. exclude only
Rent-A-Car *fleets/operators*, while individually-rented vehicles (the "vehículos alquilados"
the clarification protects) remain admissible under Case UW. That reading would also make the
X10 forward-route coherent. Confirm with Suscripción which population C05 actually bars.
*Advisory only — C05 escalates until ruled.*

## Resolution (filled when ruled)
_c05_excludes:_ rent_a_car_operators | all_rented | — · _ruled_by:_ — · _date:_ —
