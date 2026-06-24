---
id: RUL-ALCOHOLEMIA
status: open
kind: cross_doc_tension
raised_by: ["R-097 licitaciones constraint; CG exclusion; clause 2002 (Phase 1/4)"]
source: representation/linkage.json (alcoholemia link) + rules.json R-097
---

# RUL-ALCOHOLEMIA — Three blood-alcohol numbers coexist across the documents

## Conflict
Three different alcohol thresholds live in the two documents with no reconciliation.

## Source variants (verbatim)
- **CG exclusion: 0.50 g/1000 ml** — general policy exclusion in the Condiciones Generales.
- **Manual licitaciones cap: 0,70 g/l** — R-097: "Alcoholemia permitida mayor a 0,70 gramos
  por litro de sangre" may **not** be subscribed (an upper cap on what can be agreed).
- **Clause 2002:** allows a dosage to be agreed in the Condiciones Particulares.

Representation note (linkage): "Se registran los tres sin armonizar."

## Runtime status (raised by the Layer-E tier review, verifier V3) — coverage gap O14
R-097 §3.5.5 is verbatim a list of conditions that **"no pueden ser suscritas"** in licitaciones
(alcoholemia > 0,70 g/l, Valor Admitido, licencia vencida > 90 días, …) — i.e. *executable*
underwriting prohibitions, not mere reference. The licitaciones graph defers them ("Phase 1"), so a
licitación quote requesting a barred condition is **not** blocked/escalated at runtime today. The
cross-document *number* tension (CG 0.50 g/1000 ml vs 0,70 g/l) is genuinely REFERENCE-ONLY (tier
confirmed 3/3); the *prohibition* is the executable part that should surface when licitaciones
eligibility is node-ified. Tracked as **O14** in `crawlable/CONVERSION_RECORD.md` §9.

## Recommended resolution (NON-BINDING — D-P2)
These operate at different layers and may all stand: 0.50 g/1000ml is the *default coverage
exclusion*; 0,70 g/l is the *maximum a licitación may negotiate*; 2002 is the *mechanism* to
set a particular dosage within that cap. Recommend documenting them as a 3-layer rule
(default / negotiation ceiling / mechanism) rather than picking one. Confirm units
(g/1000ml vs g/l) are intentionally different. *Advisory only.*

## Resolution (filled when ruled)
_layering_confirmed:_ — · _unit_reconciliation:_ — · _ruled_by:_ —
