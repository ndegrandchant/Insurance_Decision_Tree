# Reusable Engine Skeleton

The platform has two execution modes:

- `UWEngine` wraps the existing Automotores `crawlable/crawler/crawl.py` without copying it.
- `ArtifactGraphEngine` is the reusable skeleton for new coverage/manual-style graph domains.

`insurance_engine/catalog.py` is the compartment boundary. Each manual/domain is registered as
an `EngineSpec` with:

- engine id and display label
- family (`underwriting`, `claims`, rating-style blocks later, etc.)
- runtime kind (`crawlable_adapter` or `artifact_graph`)
- generated graph artifact root
- facts JSON path
- validator path
- source roots to scan for issues
- line of business, product, vigencia/source metadata
- optional coverage-style section discriminator and terminal defaults

Platform code should ask this catalog what exists. It should not branch on a specific manual unless
the runtime itself is truly special, as the current Automotores UW adapter is.

To onboard another manual or coverage slice, keep the machinery and swap the artifacts:

1. Produce immutable source extraction under `representation/`.
2. Author generated executable artifacts under a new `crawlable/graph_<domain>/` directory.
3. Add a `facts_<domain>.json` file with typed facts, prompts, `on_missing`, and source quotes.
4. Register the block in `insurance_engine/catalog.py`.
5. Configure `ArtifactGraphConfig` from the catalog spec, or write a thin adapter only if the
   legacy runtime cannot use artifact-graph semantics.
6. Add a domain validator/reconciler mirroring `crawlable/coverage_validate.py` and `crawlable/coverage_reconcile.py`.

Every node remains data, not code: `id`, `type`, `order`, `applies_to`, `needs_facts`, JSONLogic `evaluate`, optional `outcome`, `source_quote`, `source`, `_origin`, and optional `conflict.ledger_ref`.

The runtime supplies the reusable behavior: short-circuit JSONLogic, missing-fact escalation, conflict escalation, audit trail, caveats, and terminal outcome shape.

The current UI exposes four user workflows (`Underwriting`, `Claims`, `Graph Reviewer`, `Issues`),
but those are product-facing compartments. Underneath, the interchangeable building blocks are the
engine specs and their generated artifacts.

## Pricing Boundary

`insurance_engine/lbc_auto_rating.py` is a separate rating compartment. It is not part of the
source-backed graph runtime and does not mutate `representation/` or `crawlable/`. UW executions call
it only after an eligible/conditional result, so the decision path stays auditable while the final LBC
Auto option prices are attached as a pricing stage.
