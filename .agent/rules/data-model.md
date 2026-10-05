---
trigger: glob
globs: prisma/**
---

# data-model.md

One job: the schema and the invariants that live in it.

Read privacy.md for who may read these models. This file does not restate those rules.
Read database-changes.md before proposing any change to this schema.

## Which models are private

Private: Account, EmailToken, FailedAttempt, Member, MemberChange, Attendance, LedgerEntry, PaymentAttempt, QuestionLog, WrongAnswerReport.
Shared: Card, CardVersion, CardEmbedding, CheckInCode.
Staff: Staff, Duty.

Staff now holds credentials: an email, a password hash and a session version. Staff is admin-only, read and written only in admin routes after the role check, and never embedded. Only the handoff may show a staff member's name, WhatsApp number or phone to a member, and it shows nothing else from the row.

Every private model carries a comment in the schema saying how it is fetched. Member records are fetched by the linked member ID only. Account and EmailToken are fetched for the signed-in account only. FailedAttempt is counted by kind and key only, by the sign-in and check-in code, and is never shown to anyone.

Reason: the agent must be able to tell at a glance which side of the line a model sits on.

## Structural rules

**One attendance row per member per calendar day, Africa/Lagos.** The day column stores a calendar date with no time. Uniqueness is on member plus day.

Derive the day by converting the current instant to the Africa/Lagos zone and then taking the date part. Never truncate a UTC timestamp to get the date, and never let the server's own zone decide it.

Reason: a timestamp makes two check-ins on the same day two different values, so the one-per-day rule silently fails and the training count is wrong. The derivation is spelled out because a UTC truncation is correct for most of the day and wrong for evening check-ins after 11pm Lagos time, which is exactly when people train.

**An account is not a member.** An Account is a sign-in identity. A Member is the gym's record. They are separate models. An account reaches a member only through the link field that staff set.

Reason: anyone can create an account, so the account cannot be trusted to say who it is. Keeping the two apart means a bug in sign-up can never become a read of a member's records.

**The claimed membership ID grants nothing.** The ID a person types at sign-up is stored on the account as a claim. No query ever uses it to read a member record for that person. Only the member link, set by staff, does.

Reason: the ID is written on paper and shown to people. If typing it unlocked a record, seeing someone's ID would be enough to read their balance.

**One account per member, one member per account.** The member link on Account is unique.

Reason: two accounts on one record means two people reading one member's money.

**The membership ID is generated, unique, and permanent.** It is `SPT-` plus four characters from the 31-character set in auth.md, created by the system when staff create the member, checked for uniqueness, retried on a collision, and never changed or reused.

Reason: a reused or edited ID points an old claim at a new person.

**Balance is never a stored number.** There is no balance column on Member. Outstanding is calculated as total charges minus total payments from ledger entries.

Reason: a typed balance drifts from the payments behind it and cannot be explained to a member who disputes it.

**A member's balance is hidden until the opening balance is set.** Member carries a flag. While the flag is false, the balance path hands off instead of showing a figure.

The flag is set in exactly one place: the owner action that enters the opening balance, in the same transaction as the opening ledger charge. It defaults to false, is never set by a migration default, is never set by a payment, and is never set as a side effect of any other write.

Reason: an unset balance is missing data, not zero. Showing zero tells a member they owe nothing when nobody has checked. Naming the single writer stops the flag being flipped to true by a convenience default during setup, which would turn the whole protection off silently.

**Tier and expiry changes are audited.** Every change to a member's tier or expiry writes a MemberChange row holding the field, the old value, the new value, the author, and the time. The audit row is written in the same transaction as the update.

Reason: these two fields decide access and money. A dispute or a mis-entry has to be traceable. Card text has no history; these do.

**Payment purpose is a fixed set.** A payment attempt carries a purpose of RENEWAL or BALANCE only, as an enum, not free text.

Reason: free text invites a purpose like "upgrade" that implies the system acts on it. It does not. See payments.md.

**Exactly one on-duty row may be active.** Enforce with a partial unique index on the active column where active is true, added in a raw migration.

Reason: the handoff names whoever is on duty. Two active rows means the name is whichever row the query returns first.

**The ledger links to a payment attempt by its primary key, not by the gateway reference.** The ledger entry carries a unique optional reference to the attempt's ID. The gateway reference stays on both rows as a plain unique column, used only to look up a webhook.

Reason: a Prisma relation pointing at a nullable unique column is fragile and will fight the agent at generate time. Separating the relation from the lookup key keeps both jobs simple: one links rows, the other makes a resent webhook findable.

**Refusal reason records two different outcomes.** A no-record handoff is logged with the reason NO_RECORD and the refused flag false. Every other reason is logged with the refused flag true.

Reason: the weekly review needs to tell a missing card apart from a deliberate refusal. A missing card is work for the owner. A refusal is the app behaving correctly.

**A card version and its embedding are one to one.** CardEmbedding has a unique reference to the card version it embeds.

Reason: prevents two embeddings for one version, which would make the same card win a search twice.

## The schema

The schema lives only in data-model-schema.md. Do not copy it into this file.
