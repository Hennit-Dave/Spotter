---
trigger: glob
globs: src/server/payments/**, src/server/api/payments/**
---


# payments.md

One job: taking money safely through Flutterwave.

Read data-model.md for the payment and ledger schema. Read secrets.md for how the keys are handled.

## The app never holds money

Money settles into the gym's own Flutterwave account. There is no wallet, no stored value, no balance the app controls.

Reason: holding money is a different product with different obligations. Spotter reports and collects, nothing more.

## Amounts are whole naira integers

Every amount in the app, the database, and the gateway call is a whole number of naira. No kobo, no decimals, no floating point.

Reason: a decimal amount rounds differently in two places and produces a balance that cannot be reconciled with the payments behind it.

## The flow

Only a linked account can start a payment. An unlinked account never reaches this flow.

1. The member picks a purpose: renewal or balance.
2. The app calls initiate with the amount, the purpose, and a client idempotency key.
3. The server generates a transaction reference, creates a payment attempt in status INITIATED holding that reference, calls Flutterwave with it, and returns the checkout link.
4. The member pays on the Flutterwave page.
5. Flutterwave calls the webhook carrying that same reference. The server verifies the signature, finds the attempt by the reference, then writes the result.
6. The receipt appears only after the webhook confirms.

The reference the server generates at step 3 is the single value that ties the attempt, the gateway, and the ledger entry together. Store it on the attempt before the gateway call, not after.

Reason: storing it after the call leaves a window where a fast webhook arrives for a reference the database has never seen.

## The webhook is the only source of truth

Never mark a payment successful because the member's phone showed a success screen, because the redirect carried a success parameter, or because a verify call looked good in the client.

Only a signature-verified webhook writes a ledger entry.

Reason: a client can be manipulated, and a redirect can be replayed. The gateway calling the server is the only signal that cannot be faked by the phone.

## Verify the signature before reading the payload

Check the webhook signature against the configured secret before trusting any field in the body. An unverified webhook is discarded and logged.

Reason: the webhook endpoint is public. Anything can post to it.

## Webhook idempotency, on the transaction reference

Before writing anything, check whether a ledger entry already exists for this reference.

If one exists, acknowledge the webhook with a success response and write nothing.
If none exists, set the attempt status and, on success, write exactly one ledger entry.

Reason: gateways resend webhooks. This is normal behaviour, not an edge case. Without this check, a resent webhook either double-credits the member or throws on the unique constraint and gets retried forever.

## Tap idempotency, on the idempotency key

If the member taps pay again while an attempt with the same idempotency key is INITIATED or PENDING, return the existing attempt and its checkout link. Do not create a second attempt.

Reason: a slow page on a poor connection gets tapped twice. Two attempts means two possible charges.

## Network loss during payment

The attempt stays PENDING. When the member returns, the app calls verify with the stored reference.

While an attempt is PENDING, the member keeps access for twenty four hours from the attempt's creation time.

**This hold is evaluated at access-check time. It is never written to the database.** Do not add twenty four hours to the member's expiry date. Do not write any field to grant the hold. The access check reads the expiry date and, separately, looks for a pending attempt younger than twenty four hours.

Reason: the expiry date is audited and decides access and money. A payment path that writes to it corrupts a field the owner is responsible for, and the audit trail will show a change nobody made.

## Payment never changes tier

A payment settles money only. Its purpose is renewal or balance, never an upgrade instruction.

When a member pays intending to upgrade, show: "Your upgrade takes effect once the desk confirms." The owner then sets the tier by hand.

Reason: the system has no automatic upgrade path. A payment that silently implies one produces a member who paid for Premium and sees Basic.

## Cash and transfer payments

These are recorded by the owner, not by the gateway. They write a ledger entry with the method, the date, and the person who recorded it. They carry no transaction reference.

In-app card payments are read-only on the owner screen and cannot be edited there.

Same-day entry is required for cash and transfers.

Reason: the balance answer is only as honest as the payments behind it. An unentered transfer shows as outstanding to a member who has actually paid.

## Failure states

- Gateway unreachable at initiate: show "Cannot start payment right now, try again shortly." Leave no half-written attempt.
- Webhook says failed: set the attempt to FAILED. Write no ledger entry.
- Member abandons checkout: the attempt becomes ABANDONED, which is not a failure. See testing.md for why the two are counted separately.

## Checks before merge

- No ledger entry can be written without a signature-verified webhook.
- Two identical webhooks for one reference produce one ledger entry.
- Two fast pay taps produce one attempt.
- No code path writes to a member's tier or expiry date from a payment handler.