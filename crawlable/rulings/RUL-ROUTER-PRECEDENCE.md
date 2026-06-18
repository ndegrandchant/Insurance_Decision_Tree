---
id: RUL-ROUTER-PRECEDENCE
status: open
kind: derived_reading
raised_by: ["root.process_router"]
source: representation decisions.md D2 + reference_approach1/graph/router.json gap
---

# RUL-ROUTER-PRECEDENCE — No stated global precedence between the 5 processes

## Conflict
The manual describes 5 underwriting processes (Estándar, Automática, Case Underwriting,
Masiva, Licitaciones) and the profile of each, but **never states a top-level precedence**
when several could apply to one risk (e.g. a state fleet quoting an enlatado product; or
LBC|Auto, which is both a Standard product (R-011) and has enlatado plans routed to
Automática (R-060)). Part-1 `decisions.md` D2 deliberately declined to invent a master router.

## Modelling (decisions.md D-P4)
`root.process_router` asserts only the source-stated refer-outs (public tender → licitaciones;
mass/wholesale → masiva; enlatado product → automatica; deviation / Consumer-fleet ≥4 →
case_underwriting). `hit_policy:"unique"` + `on_no_match:"standard"` means: **0** explicit
triggers ⇒ Standard (sourced fast-lane default, R-010); **exactly 1** ⇒ route; **>1** ⇒ this
unresolved precedence ⇒ the crawler escalates citing this entry. No precedence order is
shipped as logic.

## Source variants (verbatim)
- R-010: "El procedimiento de Suscripción Estándar representa la vía rápida de atención a
  nuestros clientes, mediante productos no diferenciados…"
- R-070: "este procedimiento debe ser analizado considerando factores ajenos a la misma
  póliza, como ser: antigüedad del cliente, volumen del programa…"
- R-060 (Automática): "En este procedimiento no aplican autoridades de suscripción, ya que los
  productos ‘enlatados’ cuentan con términos y condiciones definidas…"

## Recommended resolution (NON-BINDING — D-P2)
Adopt a **most-specific-first** order — `licitaciones > masiva > automatica > case_underwriting
> standard` — as the precedence when multiple triggers fire, since licitación/masiva are
channel-determined and automatica is product-determined (both narrower than the
profile-based Standard/Case split). Have Suscripción confirm, especially the
enlatado-vs-Standard overlap for LBC|Auto. *Advisory only — the router still escalates on a
multi-match until this is ruled.*

## Resolution (filled when ruled)
_precedence_order:_ — · _ruled_by:_ — · _date:_ — · _rationale:_ —
