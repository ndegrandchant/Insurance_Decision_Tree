# Import Templates

v1 imports are CSV/Excel-first. Required replay/linkage columns are intentionally explicit.

## submissions.csv

Required: `submission_id`, `quote_date`, `product_or_policy_type`, `fact_vector`.

`fact_vector` must be JSON keyed by the active `facts.json` ids. Simulation and historical replay are gated when this column is missing.

## claims.csv

Required: `claim_id`, `policy_id`, `loss_date`, `cause_of_loss`, `coverage_invoked`, `status`, `outcome`.

Preferred linkage columns: `invoked_node_id`, `invoked_clause_code`, `invoked_section_code`. Claims feedback, friction, and AI proposals are gated when these cannot be supplied or reconstructed by replay.

## policy_clause_attachments.csv

Required: `policy_id`, `clause_title` or `clause_code`.

Clause titles normalize through `representation/linkage.json` as `exact`, `partial`, `related`, or `unmatched`. Unmatched rows go to review; no silent defaults.
