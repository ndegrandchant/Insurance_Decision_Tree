# Phase 0.5 Data Availability Report

Generated from the current workspace state. No production database connection or imported CSV/Excel portfolio dataset is present in this repo at implementation time.

## Required Linkage Verdict

| Downstream module | Verdict | Reason |
|---|---|---|
| Claims feedback | gated | No row-level claims dataset with `invoked_node_id`, `invoked_clause_code`, or `invoked_section_code` is present. |
| Friction / exclusion layer | gated | Same claim-to-node/clause linkage is required for source-backed friction drilldown. |
| Simulation sandbox | gated | No historical `submission.fact_vector` dataset is present; replay cannot be run honestly. |
| AI proposal analyst | gated | Requires both replayable `fact_vector`s and claim node/clause linkage, plus actuarial credibility checks. |

## Implementation Consequence

The platform schema and APIs are ready for these modules, but dashboards, simulations, and AI proposals must remain gated until imports or a read-only source database supplies the required fields. No synthetic linkage was generated.
