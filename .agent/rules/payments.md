---
trigger: glob
globs: src/server/payments/**, src/app/api/webhooks/flutterwave/**
---


# payments.md

One job: taking money safely through Flutterwave.

Read data-model.md for the payment, ledger and paid-until rules. Read secrets.md for how the keys are handled.

## The app never holds money

Money settles into the gym's own Flutterwave account. There is no wallet, no stored value, no balance the app controls.

Reason: holding money is a different product with different obligations. Spotter reports and collects, nothing more.

## Amounts are whole naira integers

Every amount in the app, the database, and the gateway call is a whole number of naira. No kobo, no decimals, no floating point.

Reason: a decimal amount rounds differently in two places and produces a balance that cannot be reconciled with the payments behind it.

## The flow

Only a verified account with a member can start a payment. An unverified account never reaches this flow. A FREE member can pay.

Pay is closed until the owner has set the monthly price (D27). While there is no price, the Pay screen says payments are not open yet and no attempt can be created.

1. The member picks a purpose: renewal (one month of paid time) or balance (money already owed).
2. The app calls initiate with the purpose, a client idempotency key and, for a balance, the amount. For a renewal, the server ignores any amount from the client and takes it from the monthly price setting, never from card text.
3. The server generates a transaction reference, creates a payment attempt in status INITIATED holding that reference, calls Flutterwave with it, and returns the checkout link.
4. The member pays on the Flutterwave page.
5. Flutterwave calls the webhook carrying that same reference. The server verifies the signature, finds the attempt by the reference, then writes the result.
6. The receipt appears only after the webhook confirms.

The reference the server generates at step 3 is the single value that ties the attempt, the gateway, and the ledger entry together. Store it on the attempt before the gateway call, not after.

Reason: storing it after the call leaves a window where a fast webhook arrives for a reference the database has never seen.

## The webhook is the only source of truth

Never mark a payment successful because the member's phone showed a success screen, because the redirect carried a success parameter, or because a verify call looked good in the client.

Only a signature-verified webhook writes a ledger entry for a card payment, and only that webhook extends paid time for a card payment.

Reason: a client can be manipulated, and a redirect can be replayed. The gateway calling the server is the only signal that cannot be faked by the phone.

## Verify the signature before reading the payload

Check the webhook signature against the configured secret before trusting any field in the body. An unverified webhook is discarded and logged.

Reason: the webhook endpoint is public. Anything can post to it.

## The webhook writes one transaction

After the signature is verified and the attempt is found by its reference, a successful webhook does all of this in one database transaction, with the member row locked:

1. Check whether a ledger entry or a member change already exists for this attempt. If so, acknowledge the webhook with a success response and write nothing. A resent webhook must never write a second time.
2. Check that the amount the gateway reports equals the attempt's amount. If it does not, set the attempt to NEEDS_REVIEW and write no paid time. The owner reviews it (D33). Do not write a ledger entry for it until the human decides what a mismatch should record.
3. For a renewal: write a ledger CHARGE for the month and a ledger PAYMENT for the same amount, linked to the attempt. Extend paid time by one calendar month, clamped to the end of the month, counted from the later of today (Africa/Lagos) and the current paid-until. Write one MemberChange row with the field PAID_UNTIL, no author, the source PAYMENT and the attempt. Set the attempt to SUCCESS.
4. For a balance: write a ledger PAYMENT only, linked to the attempt. Do not touch paid time. Set the attempt to SUCCESS.

If any write fails, none persists. The unique link from the audit row to the attempt is a second guard: it makes a second extension for one attempt impossible even if step 1 were skipped.

The arithmetic lives in src/server/plan/, shared with the owner's own cash and transfer entry. Do not write it a second time here.

Reason: gateways resend webhooks, and this is normal behaviour. Without the check, a resent webhook double-credits the member or throws on the unique constraint and is retried forever. The member row is locked so two payments arriving together both add a month instead of both reading the same old date. The charge and payment pair keeps the balance at zero for a member who only bought a month.

## Tap idempotency, on the idempotency key

If the member taps pay again while an attempt with the same idempotency key is INITIATED or PENDING, return the existing attempt and its checkout link. Do not create a second attempt.

Reason: a slow page on a poor connection gets tapped twice. Two attempts means two possible charges.

## Network loss during payment

The attempt stays PENDING. When the member returns, the app calls verify with the stored reference.

While an attempt is PENDING, a member who has had paid time before keeps paid access for twenty four hours from the attempt's creation time. A member who has never had paid time (paid-until empty) gets no hold. Starting a payment must never be a way to get paid cards for free (D29).

**This hold is evaluated at access-check time. It is never written to the database.** Do not add twenty four hours to the member's paid-until date. Do not write any field to grant the hold. The one function in src/server/plan/ that works out the plan reads paid-until and, separately, looks for a pending attempt younger than twenty four hours.

Reason: the paid-until date is audited and decides access and money. A payment path that writes to it outside the webhook transaction corrupts a field the owner is responsible for, and the audit trail will show a change nobody made.

## A membership payment extends paid time

Paying for membership makes the member PAID for one month. Paying early never loses days, because the month is counted from the later of today and the current paid-until. This reverses the version one rule that a payment never changes the plan (decided with the plan model, D41).

Paying in the app does not open the gym door. The desk issues the access card. After a first payment, show the member that the desk will issue their access card.

When paid time runs out, the member is FREE again. Nothing is written when that happens. It is worked out at access-check time.

Reason: the plan follows the money. The only other route to paid time is the owner's own entry below, and both routes use the same code.

## Cash and transfer payments

These are recorded by the owner, not by the gateway. They carry no transaction reference.

A cash or transfer payment for membership uses the same mechanism as the webhook (D31). The owner's entry writes, in one transaction with the member row locked: the ledger CHARGE for the month, the ledger PAYMENT with the method, the date and the owner as the person who recorded it, the one-month extension, and a MemberChange row for PAID_UNTIL with the owner as author and the source STAFF.

A cash or transfer payment to settle a balance writes a ledger PAYMENT only and never extends paid time.

In-app card payments are read-only on the owner screen and cannot be edited there.

Same-day entry is required for cash and transfers.

Reason: the balance answer is only as honest as the payments behind it. An unentered transfer shows as outstanding to a member who has actually paid.

## Failure states

- Gateway unreachable at initiate: show "Cannot start payment right now, try again shortly." Leave no half-written attempt.
- Webhook says failed: set the attempt to FAILED. Write no ledger entry and no paid time.
- Webhook succeeded but the amount does not match the attempt: set the attempt to NEEDS_REVIEW and extend no paid time. The owner sees it.
- No monthly price set: Pay is closed. Show that payments are not open yet.
- Member abandons checkout: the attempt becomes ABANDONED, which is not a failure. See testing.md for why the two are counted separately.

## Checks before merge

- No ledger entry for a card payment can be written without a signature-verified webhook.
- Two identical webhooks for one reference produce one ledger entry, one paid-until change and one audit row.
- A webhook whose amount does not match extends no paid time.
- A renewal writes the charge, the payment, the extension and the audit row together or not at all.
- Two different payments arriving at once both add their month.
- A balance payment never changes paid-until.
- The paid-until arithmetic exists once, in src/server/plan/.
- Two fast pay taps produce one attempt.
- No code path writes paid-until except the webhook transaction, the owner's cash or transfer entry for membership, and the owner's edit of paid-until.
- The hold writes nothing and gives nothing to a member who has never had paid time.
- The amount of a renewal comes from the monthly price setting, never from the client or card text.