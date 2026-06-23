-- Dynamic UW + Coverage Intelligence Platform
-- Postgres schema. Source truth remains in representation/ and crawlable/; these
-- tables index versions, operational data, governance, and audit only.

create table if not exists graph_version (
  version_id text primary key,
  engine text not null check (engine in ('uw', 'coverage')),
  line_of_business text not null,
  product_or_policy_type text not null,
  status text not null check (status in ('draft', 'in_review', 'approved', 'published', 'archived')),
  valid_from date not null,
  valid_to date,
  source_version text not null,
  artifact_root text not null,
  built_from_commit text not null,
  validator_report jsonb not null default '{}'::jsonb,
  release_diff jsonb not null default '{}'::jsonb,
  created_by text,
  approved_by text,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists ledger_entry (
  id text primary key,
  kind text not null,
  status text not null,
  source_refs jsonb not null default '[]'::jsonb,
  recommended_resolution text,
  resolution jsonb,
  ruled_by text,
  ruled_at timestamptz,
  path text not null,
  indexed_at timestamptz not null default now()
);

create table if not exists fact_definition (
  fact_id text not null,
  engine text not null check (engine in ('uw', 'coverage')),
  version_id text not null references graph_version(version_id),
  type text not null,
  allowed_values jsonb,
  unit text,
  on_missing text not null,
  prompt text,
  source_quote text not null,
  required_by jsonb not null default '[]'::jsonb,
  primary key (fact_id, engine, version_id)
);

create table if not exists broker (
  broker_id text primary key,
  name text not null,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists customer (
  customer_id text primary key,
  name text not null,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists vehicle (
  vehicle_id text primary key,
  customer_id text references customer(customer_id),
  vehicle_class text,
  model_year int,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists submission (
  submission_id text primary key,
  quote_date date not null,
  line_of_business text not null default 'automotores',
  product_or_policy_type text not null,
  broker_id text references broker(broker_id),
  customer_id text references customer(customer_id),
  vehicle_id text references vehicle(vehicle_id),
  graph_version_id text references graph_version(version_id),
  fact_vector jsonb not null,
  outcome text,
  audit_id text,
  created_at timestamptz not null default now()
);

create table if not exists policy (
  policy_id text primary key,
  submission_id text references submission(submission_id),
  bind_date date not null,
  valid_from date not null,
  valid_to date,
  broker_id text references broker(broker_id),
  customer_id text references customer(customer_id),
  vehicle_id text references vehicle(vehicle_id),
  premium_amount numeric,
  premium_currency text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists policy_coverage (
  policy_coverage_id text primary key,
  policy_id text not null references policy(policy_id),
  coverage_code text not null,
  coverage_title text not null,
  limit_amount numeric,
  limit_currency text,
  deductible_amount numeric,
  deductible_currency text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists policy_clause_attachment (
  policy_clause_attachment_id text primary key,
  policy_id text not null references policy(policy_id),
  clause_code text not null,
  clause_title text,
  linkage_match text check (linkage_match in ('exact', 'partial', 'unmatched', 'related')),
  source jsonb not null default '{}'::jsonb
);

create table if not exists claim (
  claim_id text primary key,
  policy_id text references policy(policy_id),
  loss_date date not null,
  reported_at timestamptz,
  cause_of_loss text,
  coverage_invoked text,
  status text,
  outcome text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists claim_payment_reserve (
  claim_payment_reserve_id text primary key,
  claim_id text not null references claim(claim_id),
  kind text not null check (kind in ('paid', 'reserve')),
  amount numeric not null,
  currency text not null,
  booked_at date not null
);

create table if not exists claim_document (
  claim_document_id text primary key,
  claim_id text not null references claim(claim_id),
  document_type text not null,
  received_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists claim_coverage_link (
  claim_coverage_link_id text primary key,
  claim_id text not null references claim(claim_id),
  coverage_code text,
  invoked_node_id text,
  invoked_clause_code text,
  invoked_section_code text,
  source jsonb not null default '{}'::jsonb
);

create table if not exists claim_decision (
  claim_decision_id text primary key,
  claim_id text not null references claim(claim_id),
  engine text not null check (engine in ('coverage', 'uw')),
  graph_version_id text references graph_version(version_id),
  fact_vector jsonb not null,
  outcome text not null,
  audit jsonb not null,
  decided_at timestamptz not null default now()
);

create table if not exists friction_event (
  friction_event_id text primary key,
  claim_id text references claim(claim_id),
  reason_code text not null,
  invoked_node_id text,
  invoked_clause_code text,
  source_quote text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists human_task (
  human_task_id text primary key,
  packet_id text,
  engine text not null check (engine in ('coverage', 'uw')),
  task_type text not null,
  status text not null check (status in ('needs_human_input', 'resumed_needs_more_input', 'completed', 'cancelled')),
  owner_role text not null,
  priority text not null default 'normal',
  source_channel text,
  source_sender text,
  initial_slip text,
  question text not null,
  requested_fact text,
  current_node jsonb not null default '{}'::jsonb,
  answer_schema jsonb,
  packet jsonb not null,
  answer jsonb,
  resume_result jsonb,
  next_task_id text,
  created_by text not null,
  completed_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists chat_conversation (
  conversation_id text primary key,
  channel text not null check (channel in ('chat', 'email', 'web')),
  engine text not null check (engine in ('coverage', 'uw')),
  title text not null,
  status text not null check (status in ('open', 'needs_fact_confirmation', 'ran_tree', 'human_task_created', 'closed')),
  source_sender text,
  pending_facts jsonb not null default '{}'::jsonb,
  confirmed_facts jsonb not null default '{}'::jsonb,
  last_result_summary jsonb,
  human_task_id text references human_task(human_task_id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists chat_message (
  message_id text primary key,
  conversation_id text not null references chat_conversation(conversation_id),
  sender text not null check (sender in ('cliente', 'broker', 'assistant', 'sistema', 'sales', 'uw', 'pricing', 'governance', 'claims_accidents', 'c_suite')),
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists chat_action (
  agent_action_id text primary key,
  conversation_id text references chat_conversation(conversation_id),
  actor_role text not null,
  action text not null,
  tool_name text,
  decision_right text not null check (decision_right in ('operational', 'approval_required', 'forbidden')),
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists broker_case (
  case_id text primary key,
  conversation_id text references chat_conversation(conversation_id),
  channel text not null default 'chat',
  title text not null,
  engine text not null check (engine in ('coverage', 'uw')),
  client_type text not null default 'por_confirmar',
  sales_path text not null default 'client_type_pending',
  stage text not null,
  status text not null check (status in ('open', 'won', 'lost', 'blocked', 'closed')),
  owner_role text not null check (owner_role in ('sales', 'uw', 'claims_accidents', 'c_suite', 'pricing', 'governance')),
  priority text not null default 'normal',
  source_sender text,
  confirmed_facts jsonb not null default '{}'::jsonb,
  pending_facts jsonb not null default '{}'::jsonb,
  last_result_summary jsonb not null default '{}'::jsonb,
  human_task_id text references human_task(human_task_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists followup_rule (
  rule_id text primary key,
  label text not null,
  role text not null check (role in ('sales', 'uw', 'claims_accidents', 'c_suite', 'pricing', 'governance')),
  client_type text not null default 'any',
  stage text not null default 'any',
  channel text not null default 'any',
  priority text not null default 'any',
  delay_minutes int not null default 180,
  enabled boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists scheduled_followup (
  followup_id text primary key,
  target_type text not null,
  target_id text not null,
  role text not null check (role in ('sales', 'uw', 'claims_accidents', 'c_suite', 'pricing', 'governance')),
  stage text not null default 'any',
  client_type text not null default 'any',
  channel text not null default 'any',
  priority text not null default 'normal',
  status text not null check (status in ('scheduled', 'sent', 'snoozed', 'completed', 'cancelled')),
  due_at timestamptz not null,
  rule_id text,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists role_queue_snapshot (
  role_queue_snapshot_id text primary key,
  role text not null check (role in ('sales', 'uw', 'claims_accidents', 'c_suite', 'pricing', 'governance')),
  summary_only boolean not null default false,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists voice_reply (
  voice_reply_id text primary key,
  conversation_id text references chat_conversation(conversation_id),
  channel text not null default 'chat',
  text_canonical text not null,
  generate_audio_requested boolean not null default false,
  audio_status text not null,
  provider text,
  live_calls_status text not null default 'future_phase',
  created_by_role text not null check (created_by_role in ('sales', 'uw', 'claims_accidents', 'c_suite', 'pricing', 'governance')),
  created_at timestamptz not null default now()
);

create table if not exists proposal (
  proposal_id text primary key,
  title text not null,
  status text not null check (status in ('draft', 'simulated', 'submitted_for_review', 'uw_manager_approved', 'actuarial_pricing_approved', 'legal_compliance_approved', 'release_approved', 'published', 'archived', 'rejected')),
  created_by text not null,
  credibility_verdict jsonb not null default '{}'::jsonb,
  evidence_packet jsonb not null default '{}'::jsonb,
  caveats jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists proposal_patch (
  proposal_patch_id text primary key,
  proposal_id text not null references proposal(proposal_id),
  patch_type text not null check (patch_type in ('node-edit', 'threshold-edit', 'clause-applicability', 'exclusion-edit', 'table-row-change')),
  ledger_entry_id text references ledger_entry(id),
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists simulation_run (
  simulation_run_id text primary key,
  proposal_id text not null references proposal(proposal_id),
  current_version_id text not null references graph_version(version_id),
  candidate_version_id text references graph_version(version_id),
  selection jsonb not null,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists approval (
  approval_id text primary key,
  proposal_id text not null references proposal(proposal_id),
  role text not null check (role in ('uw_manager', 'actuarial_pricing', 'legal_compliance', 'admin')),
  decision text not null check (decision in ('approved', 'rejected')),
  comments text,
  decided_by text not null,
  decided_at timestamptz not null default now()
);

create table if not exists audit_log (
  audit_id text primary key,
  actor_id text,
  role text not null,
  action text not null,
  target_type text,
  target_id text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
