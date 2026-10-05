---
trigger: model_decision
description: Read when writing, changing a test.
---


# testing.md

One job: which checks block a merge, and how a failure is reported.

This file names the gates. It does not hold the test content. The refusal questions live in refusal.md. The schema rules live in data-model.md.

## Running them

Test, lint, and type-check commands come from the project's package.json. Read it rather than assuming a command. If there is no test script, say so and ask the human before adding one.

Reason: an invented command either fails or, worse, runs something else.

## Blocking gates

A change does not merge until every gate that touches it passes. These are the gates, and what each one proves.

**Refusal set.** The fixed set in refusal.md returns zero leaks. A leak is any listed category returning content instead of a refusal.
Proves: the app will not answer what it must never answer.

**Private isolation.** No member-scoped query runs without the linked member ID from the signed-in account. A test asserts the shared query helper rejects a call with no member ID. A second test asserts an admin read is unreachable without a staff role.
Proves: the isolation invariant holds in code, not just in review.

**Unlinked accounts reach nothing.** An UNVERIFIED, PENDING_LINK or REJECTED account receives no card, no private record, no check-in and no payment.
Proves: open sign-up cannot become a way in.

**A claimed ID grants nothing.** An account that claims a real membership ID reads nothing from that member until staff link it.
Proves: knowing someone's ID is not enough to see their records.

**Claim rules flag, never link.** Each case in auth.md (no such ID, name mismatch, already linked, duplicate claim) raises its flag, and none links on its own.
Proves: only a person at the desk connects an account to a member.

**ID normalisation.** `spt7k4q`, `SPT 7K4Q` and `SPT-7K4Q` resolve to the same ID.
Proves: a member is not turned away for typing their ID differently.

**Email links.** A verification or reset link works once, and an expired link does nothing.
Proves: an old or forwarded link cannot be reused.

**No account enumeration.** Sign up, sign in and password reset give the same response whether or not the email or ID exists.
Proves: the app does not tell a stranger which accounts are real.

**Only two emails.** No code path sends an email other than verification and password reset.
Proves: the version one rule against automated messages holds.

**Name-stripping.** Question text containing a full name or a long digit run reaches the model with those removed.
Proves: the privacy step actually runs before the call, rather than existing as a function nobody invokes.

**No model-written private numbers.** Attendance and balance answers are produced by templates. A test asserts no private figure is passed into a model call.
Proves: the model cannot alter a number the member will act on.

**Tier gating.** A Basic member asking a question whose only match is a Premium card receives a handoff, not the card.
Proves: the pre-filter is in the query, not applied afterwards.

**Attendance uniqueness.** Two check-ins on the same calendar day write one row, including a pair either side of midnight in Africa/Lagos.
Proves: the unique constraint is on the Lagos calendar day, not a UTC timestamp.

**Webhook idempotency.** Two identical webhooks for one reference write one ledger entry.
Proves: a resent webhook cannot double-credit.

**Tap idempotency.** Two fast pay taps create one payment attempt.
Proves: a double tap on a slow page cannot double-charge.

**Money wording.** No answer and no status strip renders a balance without an "as of" date, and none uses the word owe as a ruling.
Proves: the report-not-rule rule survives contact with real strings.

**Missing balance.** A member whose opening balance is not set receives a handoff, never a zero.
Proves: missing data is not shown as nothing owed.

**Approved card has an embedding.** No approved card version exists without a matching embedding row.
Proves: approval and embedding stayed atomic.

**Type check and lint.** Both pass with no errors.
Proves: nothing obvious is broken.

## What a new feature needs

A feature merges with a test for its acceptance criteria, plus every gate above that its code path touches.

A change that touches a private query, the vector query, the model call, or the payment handler always runs the matching gate, even when the change looks unrelated.

Reason: these four areas are where a small change breaks an invariant quietly.

## Reporting a failure

When a gate fails, report the gate name, the exact input that failed, and the actual output. Do not summarise it as broken.

Do not change a gate to make it pass. If a gate looks wrong, say so and ask the human. A gate is a decision, not a detail.

Reason: a gate that can be edited by whoever it blocks is not a gate.

## What is not tested here

Success metrics are product measurement, not merge gates. They are defined in the PRD and read from the question log, the attendance table, and the payment attempts. Do not build them as tests.

Reason: a metric tells the founder whether the product is working. A gate tells the agent whether the code is correct. Mixing them means a failing business signal blocks a correct change.