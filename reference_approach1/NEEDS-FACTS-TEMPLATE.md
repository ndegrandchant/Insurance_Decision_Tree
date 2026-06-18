# The `needs_facts` Template — and where it sits in the architecture

You asked for the template, but first the honest question: **is a fact contract
what the tree needs to resolve fully?** Answer: it's one of three legs, and the
review report proves you're currently missing parts of the other two. So this doc
gives you the template *and* the frame it lives in, so you don't build a perfect
fact layer on top of an unresolvable tree.

---

## What "resolve fully" actually requires (three legs)

To take a case from input to a final outcome, the tree needs all three:

1. **The decision logic** — nodes + conditions. ✅ You have this (`graph.json`).
2. **The facts** — what each node needs, typed, sourced, with a defined behavior
   when a fact is missing. ⚠️ This is the `needs_facts` contract below. Likely
   *sparse today*, the same way `see_also` was — verify before trusting it.
3. **The resolution rules** — what happens when a branch is ambiguous (`hit_policy`)
   or when nothing matches (`on_no_match`), plus declared precedence between
   processes. ❌ Your review report shows this is partly missing:
   `root.process_router` has *no explicit precedence* when several processes could
   apply.

A fact contract makes leg 2 solid. It does **not** fix leg 3. Build all three or the
agent will still stall on the cases leg 3 doesn't cover.

---

## The key idea for your data-shape anxiety: facts are a *demand contract*

You said you don't know what shape of data they'll hand you. Good news: **with this
design you never have to assume one.** The tree declares the facts it *demands*; a
thin **adapter** maps whatever the source *supplies* onto those facts. The data
shape lives in the adapter, never in the tree.

```
  SUPPLY (varies, unknown)              DEMAND (fixed, the tree owns it)
  ┌─────────────────────┐   adapter    ┌──────────────────────────────┐
  │ CRM quote object    │ ───────────▶ │ fact registry (needs_facts)  │
  │ ACORD XML / form     │ ───────────▶ │  vehicle_class, valor_bob,   │
  │ interactive Q&A      │ ───────────▶ │  importador, ...             │
  │ document extraction  │ ───────────▶ │                              │
  └─────────────────────┘              └──────────────────────────────┘
```

Industry note: insurers already standardize this supply side with **ACORD** — a data
standard (ACORD 125 commercial application, 126 underwriting info, etc.) and an
Information Model of 1000+ insurance entities used as a *semantic bridge* across
disparate legacy systems. You don't have to adopt ACORD, but if you ever want a
ready-made target vocabulary for the adapter, that's the industry's answer. Either
way, the pattern is the same: **define the demand, adapt the supply.**

This is also why you can defer the "where does data come from" decision at zero cost
— see the per-option impact analysis in the to-do. The fact registry is built the
same regardless.

---

## Fact definition schema

One entry per fact in a registry (e.g. `facts.json`), referenced by node `needs_facts`.

```json
{
  "id": "importador_autorizado",
  "prompt": "¿El importador del vehículo está en la lista de autorizados?",
  "type": "boolean",                 // enum | number | boolean | string | date
  "values": null,                    // for enum: the allowed set
  "unit": null,                      // for number: e.g. "BOB"
  "source": "derived",               // user_input | external_system | document | derived
  "derivation": "importador IN @tables.allowlist_importadores",  // if source=derived
  "clause_ref": null,                // see_also id if its DEFINITION lives in the contract
  "needs_ruling": false,             // true while a definition is contested (e.g. A9)
  "on_missing": "refer",             // ask | refer | default | block  ← the safety field
  "default": null,                   // used only if on_missing = default
  "required_by": ["standard.elig.high_value"]   // impact: which nodes depend on it
}
```

The load-bearing field is **`on_missing`** — it's what stops the agent from guessing:

- `ask` — request it from the underwriter (interactive mode).
- `refer` — can't proceed safely → route to human review. (Use for unvalidatable or
  high-stakes facts.)
- `default` — use a stated default (only where the manual truly specifies one).
- `block` — hard stop; the case cannot be decided without it.

This directly answers your review item `standard.elig.high_value`: the >700k tramo
needs `importador_autorizado`; its `source` is `derived` from the importer allowlist,
and if the importer can't be validated, `on_missing: refer` — *not* a silent decline.

---

## Node-side schema (and the leg-3 fields)

```json
{
  "id": "root.process_router",
  "type": "router",
  "needs_facts": ["channel", "client_segment", "vehicle_class", "valor_bob", "uso"],
  "branches": [
    { "when": "uso == 'rent_a_car'",                  "goto": "refer.process.case_uw" },
    { "when": "vehicle_class == 'pesado'",            "goto": "refer.process.case_uw" },
    { "when": "channel == 'masiva'",                  "goto": "masiva.entry" }
  ],
  "hit_policy": "priority",          // unique | first | priority | collect — DECLARED
  "precedence": ["case_uw", "licitaciones", "masiva", "automatica", "estandar"],
  "on_no_match": "estandar.entry"    // exhaustiveness valve — never undefined
}
```

`hit_policy` + `precedence` + `on_no_match` are leg 3. Your review report flags that
`precedence` is currently *inferred from "desviaciones a condiciones estándar"* — i.e.
not actually stated in the manual. That's a ruling to get (see the to-do), not a
value to invent.

---

## Bonus: the process picks the *processing mode*

A finding from the research worth carrying into the design: the router doesn't only
pick a *process*, it implicitly picks how the case is *processed*. Industry practice
is hybrid — straight-through processing (STP) for routine risks, referral queues for
complex ones. So:

- **Masiva / simple Estándar** → STP-friendly → complete-payload mode is fine.
- **Case Underwriting** → complex, judgment-heavy → interactive / referral mode.

You don't choose one runtime mode globally. The adapter pattern lets each process
run the mode that fits it. That's the clean resolution of the data-shape question.

---

## Before you trust this layer

Same discipline as `see_also`: **check whether `needs_facts` is actually populated**
in your Trial-1 `graph.json`. If nodes have conditions but no declared facts, the
fact layer is sparse and the standardized Prompt B needs a "declare every fact this
node reads" instruction — exactly as we're fixing clause capture. Don't assume the
contract exists just because the schema allows it.
