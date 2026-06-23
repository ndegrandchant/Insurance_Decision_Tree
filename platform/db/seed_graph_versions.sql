insert into graph_version (
  version_id,
  engine,
  line_of_business,
  product_or_policy_type,
  status,
  valid_from,
  source_version,
  artifact_root,
  built_from_commit,
  validator_report
) values
(
  'uw-automotores-manual-v3-seed',
  'uw',
  'automotores',
  'manual_suscripcion',
  'published',
  date '2020-06-01',
  'manual page-stamp 3.0; cover/changelog 4.0 conflict in RUL-MAN-VERSION',
  'crawlable/graph',
  'seed',
  '{}'::jsonb
),
(
  'coverage-automotores-danos-robo-v1',
  'coverage',
  'automotores',
  'danos_propios_robo_parcial',
  'draft',
  date '2026-06-19',
  '101 - 910547 - 2017 09 400',
  'crawlable/graph_coverage',
  'seed',
  '{}'::jsonb
)
on conflict (version_id) do nothing;
