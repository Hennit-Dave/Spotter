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

**Private isolation.** No member-scoped query runs without the member ID from the signed-in, verified account. A test asserts the shared query helper rejects a call with no member ID. A second test asserts an admin read is unreachable without a staff role.
Proves: the isolation invariant holds in code, not just in review.

**Unverified accounts reach nothing.** An UNVERIFIED account receives no card, no private record, no check-in and no payment.
Proves: open sign-up cannot become a way in.

**Sign-up makes no member.** Signing up creates an UNVERIFIED account and no Member row. Signing up again with an UNVERIFIED account's email replaces its name, phone, answer and password and sends a new link. Signing up with an ACTIVE account's email changes nothing and sends nothing.
Proves: a member exists only after the inbox is verified, and a stranger cannot take over an active account by signing up.

**Verification is atomic.** Using a verification link makes the account ACTIVE, creates the member with its membership ID, and links them, all together or not at all. Using the link twice creates one member. A membership ID collision is retried and never saved twice.
Proves: there is never an ACTIVE account with no member, or two members for one account.

**ID lookup.** `spt7k4q`, `SPT 7K4Q` and `SPT-7K4Q` resolve to the same ID wherever staff search by membership ID.
Proves: the desk is not turned away for typing an ID differently.

**Email links.** A verification or reset link works once, and an expired link does nothing.
Proves: an old or forwarded link cannot be reused.

**No account enumeration.** Sign up, sign in and password reset give the same response whether or not the email exists, and whether that account is unverified or active.
Proves: the app does not tell a stranger which accounts are real.

**Only two emails.** No code path sends an email other than verification and password reset.
Proves: the version one rule against automated messages holds.

**Email limits.** A fourth verification email, or a fourth reset email, for one address within an hour sends nothing and gives the same confirmation. Requests for an address with no account are counted the same.
Proves: one person cannot use up the day's emails, and the limit does not reveal which addresses have accounts.

**Cleanup is narrow.** Writing a sign-up deletes UNVERIFIED accounts older than 2 months and nothing else. FailedAttempt rows older than 24 hours are deleted when one is written, and nothing else.
Proves: the two approved deletions cannot reach a member, an active account or any other record.

**Name-stripping.** Question text containing a full name or a long digit run reaches the model with those removed.
Proves: the privacy step actually runs before the call, rather than existing as a function nobody invokes.

**No model-written private numbers.** Attendance and balance answers are produced by templates. A test asserts no private figure is passed into a model call.
Proves: the model cannot alter a number the member will act on.

**Tier gating.** A FREE member asking a question whose only match is a training plan or trainer guidance card receives a handoff, not the card. A PAID member receives it. A member whose paid time ended yesterday is treated as FREE.
Proves: the pre-filter is in the query, uses the plan worked out at that moment, and is not applied afterwards.

**One plan function.** Only the function in src/server/plan/ reads Member.paidUntil. A source check fails if any other file reads it.
Proves: the card filter, the status strip and the check-in gate cannot each use a slightly different rule.

**Paid-time arithmetic.** An extension is one calendar month clamped to the end of the month, counted from the later of today (Africa/Lagos) and the current paid-until. Paying early loses no days. A pair either side of midnight in Africa/Lagos gives the right date.
Proves: the date a member is paid through is the one they were promised.

**Lapse writes nothing.** Working out the plan for a member whose paid time has ended writes no row. A test checks the member row and the audit table are unchanged.
Proves: no scheduled job or hidden write is needed, and a read cannot change money.

**Hold scope.** A pending payment gives a member who has had paid time before a 24-hour hold, and gives a member with no paid time before nothing. The hold writes nothing.
Proves: starting a payment is not a way to get paid cards for free.

**FREE cannot check in.** A FREE member entering the daily code writes no attendance row and sees the written explanation. A PAID member can.
Proves: check-in follows the plan, as decided in D28.

**Attendance uniqueness.** Two check-ins on the same calendar day write one row, including a pair either side of midnight in Africa/Lagos.
Proves: the unique constraint is on the Lagos calendar day, not a UTC timestamp.

**Webhook idempotency.** Two identical webhooks for one reference write one ledger charge, one ledger payment, one paid-until change and one audit row.
Proves: a resent webhook cannot double-credit or double-extend.

**Webhook atomicity and amount.** If any write in a membership payment fails, none persists. A webhook whose amount differs from the attempt extends no paid time and marks the attempt NEEDS_REVIEW. Two different payments arriving at once both add their month.
Proves: money and paid time cannot disagree, and a lost update cannot cost a member a month.

**System audit.** A change to paid-until made by a webhook has no author, the source PAYMENT and the attempt. A change made by the owner has the owner as author and the source STAFF.
Proves: every change to paid time can be traced to who or what made it.

**Owner membership entry.** An owner's cash or transfer entry for membership writes the same four things as the webhook, in one transaction. One for a balance writes a ledger payment only and does not change paid-until.
Proves: both routes to paid time are the same mechanism, and balance money never buys time.

**Tap idempotency.** Two fast pay taps create one payment attempt.
Proves: a double tap on a slow page cannot double-charge.

**Price source.** The amount of a renewal equals the monthly price setting, whatever the client sends and whatever a card says. With no price set, no attempt can be created.
Proves: a payment amount comes from one place the owner controls.

**Money wording.** No answer and no status strip renders a balance without an "as of" date, and none uses the word owe as a ruling.
Proves: the report-not-rule rule survives contact with real strings.

**Balance start.** A member who answered Yes and whose opening balance is not set receives a handoff, never a zero. A member who answered No sees "nothing outstanding" as a dated report at once. The opening-balance flag is written only by the verification transaction (for a No) and by the owner's opening-balance entry. A source check fails if any other code writes it.
Proves: missing data is not shown as nothing owed, and the flag cannot be switched on by accident.

**Owner identity confirmation.** The owner's opening-balance entry for an existing member cannot be saved without the identity confirmation, and the screen shows name, email, phone and possible duplicates.
Proves: the desk's old identity check was replaced by a deliberate step, not dropped.

**Access card queue.** The queue lists exactly the members who are PAID today and have no access card record. Marking and un-marking each write an audit row with who and when. Paying never changes the card record.
Proves: nobody who paid is missed, and the desk's record of cards is traceable.

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