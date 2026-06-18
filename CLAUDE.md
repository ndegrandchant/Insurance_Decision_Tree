# CLAUDE.md — Working guidelines for the insurance-manual extraction

These are behavioral guardrails for how to work, not a restatement of the task. The task
prompt is the source of truth for *what* to build; this file governs *how* to behave
while building it. Where this file and the task prompt ever seem to conflict, the task
prompt wins.

## 1. Accuracy is the single hard priority

- Never invent, infer, smooth over, or "improve" logic that is not in the source.
- Every rule, node, or clause you extract must carry a pointer to where it came from
  (section, clause, page, or the triggering source text).
- When the source is ambiguous, incomplete, or the two manuals conflict, represent that
  ambiguity or conflict explicitly. Do not resolve it silently.

## 2. Make the calls yourself; pause only when truly blocked

- You own the design decisions: the data shape, the schema, the per-document treatment,
  and whether a given document needs a decision tree at all. Decide and record — do not
  ask permission for each choice.
- Record assumptions in `decisions.md` and keep going, rather than waiting on me.
- Pause for me only for genuinely blocking input: source material you cannot access, or
  a real contradiction you cannot represent. Otherwise proceed end to end.
- Do not present a menu of options you won't pursue. If you weigh a choice, make it and
  note why.

## 3. Simplicity — with one explicit, required exception

- Use the minimum structure that captures the logic faithfully. No speculative
  abstractions, no configurability nobody asked for, no error handling for cases that
  cannot occur, no premature generalization.
- **Exception (required, not speculative):** the forward-looking metadata,
  cross-references / pointers to other manuals, and illustrative examples — *including
  ones that will not appear in the decision tree* — are required deliverables. Capture
  them in full and keep them clearly tagged as distinct from the core decision logic.
  "Keep it simple" applies to the machinery you build, never to how completely you cover
  the source.

## 4. Verify against the source, not against a test suite

- Here, "verify" means confirming that each extracted element matches the manual and
  cites its location — it does **not** mean writing unit tests, unless you write code
  whose own correctness genuinely needs testing.
- Establish a checking method and run it at intervals using fresh-context verifier
  subagents. A separate verifier with clean context catches more than self-review.
- Before reporting progress or completion, audit each claim against an actual result.
  Report only what you can point to evidence for. If something is unverified, incomplete,
  or uncertain, say so plainly — do not hedge a finished item and do not assert a
  finished one you haven't checked.

## 5. Stay in scope and log your reasoning in the right place

- Produce the representation and its supporting files. Don't reformat the manuals, create
  defensive backups, or take side actions that weren't asked for.
- Keep a `decisions.md` log of the design choices you made and why (structure per
  document, tree-or-not, how conflicts were handled). That log is where your rationale
  belongs — don't transcribe your internal reasoning into chat responses.
- When you do report to me, lead with the outcome: what you built, what you verified, and
  anything you couldn't confirm. Detail after.
