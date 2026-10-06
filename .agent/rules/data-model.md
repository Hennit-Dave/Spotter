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
Settings: AppSetting, edited by the owner and read by the app. It holds no personal data.

Staff now holds credentials: an email, a password hash and a session version. Staff is admin-only, read and written only in admin routes after the role check, and never embedded. Only the handoff may show a staff member's name, WhatsApp number or phone to a member, and it shows nothing else from the row.

Every private model carries a comment in the schema saying how it is fetched. Member records are fetched by the member ID on the signed-in, verified account only. Account and EmailToken are fetched for the signed-in account only. FailedAttempt is counted by kind and key only, by the sign-in and check-in code, and is never shown to anyone.

Reason: the agent must be able to tell at a glance which side of the line a model sits on.

## Structural rules

**One attendance row per member per calendar day, Africa/Lagos.** The day column stores a calendar date with no time. Uniqueness is on member plus day.

Derive the day by converting the current instant to the Africa/Lagos zone and then taking the date part. Never truncate a UTC timestamp to get the date, and never let the server's own zone decide it.

Reason: a timestamp makes two check-ins on the same day two different values, so the one-per-day rule silently fails and the training count is wrong. The derivation is spelled out because a UTC truncation is correct for most of the day and wrong for evening check-ins after 11pm Lagos time, which is exactly when people train.

**An account is not a member until it is verified.** An Account is a sign-in identity. A Member is the gym's record. They are separate models. An UNVERIFIED account has no member. When the email is verified, the system creates the member in the same transaction that makes the account ACTIVE, and sets the account's member link. Nothing else sets that link, and no person does.

Reason: owning an inbox is the only thing the system checks, so a member record must not exist before that. Doing both writes in one transaction means there is never an ACTIVE account with no member, or a member with no account.

**A member is made only by verification.** There is no staff form that creates a member, and no typed or claimed membership ID. The member's name comes from the account, and the phone and the "Already a member at the gym?" answer are copied from it.

Reason: a member made any other way has no account, and the person's own sign-up would then make a second record with a second ID and a second balance.

**One account per member, one member per account.** The member link on Account is unique.

Reason: two accounts on one record means two people reading one member's money.

**The membership ID is generated, unique, and permanent.** It is `SPT-` plus four characters from the 31-character set in auth.md, created by the system when the email is verified, checked for uniqueness, retried on a collision, and never changed or reused. It is a reference for the desk, for example when issuing an access card. It grants no access.

Reason: a reused or edited ID points an old reference at a new person.

**Balance is never a stored number.** There is no balance column on Member. Outstanding is calculated as total charges minus total payments from ledger entries.

Reason: a typed balance drifts from the payments behind it and cannot be explained to a member who disputes it.

**A member's balance is hidden until the opening balance is set.** Member carries a flag. While the flag is false, the balance path hands off to the desk instead of showing a figure.

The flag is written in exactly two places:
- The verification transaction, when the member answered No to "Already a member at the gym?". The member then starts FREE with nothing outstanding and the balance shows at once, as a dated report.
- The owner action that enters an existing member's opening balance, in the same transaction as the opening ledger charge. The owner may enter an opening balance of zero, which sets the flag and writes no charge.

It defaults to false, is never set by a migration default, is never set by a payment, and is never set as a side effect of any other write. A source check confirms there are no other writers.

The owner can change a member's existing-member answer, and add a charge, at any time. Both are audited with the owner as author: the answer as a CLAIMS_EXISTING audit row, the charge as a ledger entry with the owner recorded.

Reason: an unset balance is missing data, not zero. Showing zero tells a member they owe nothing when nobody has checked. A person who says they are not already a member is the one case where zero is the honest starting figure. Naming the two writers stops the flag being flipped to true by a convenience default, which would turn the protection off silently.

**A member's plan is worked out, never stored.** Member.paidUntil is one nullable date. The plan is PAID when paidUntil is today or later in Africa/Lagos, and FREE otherwise, including when it is empty. FREE never expires. One function in src/server/plan/ works this out, and it is the only code that reads paidUntil. A source check enforces that. Nothing is written when paid time runs out.

The 24-hour hold for a pending payment (payments.md) is applied inside that same function, only for a member whose paidUntil is not empty, and it writes nothing.

Reason: with one stored date and one function, the plan cannot disagree with itself, no scheduled job is needed, and a card filter, a status strip and a check-in gate cannot each use a slightly different rule.

**Paid time changes only in three places, and every change is audited.** The places are the verified payment webhook for a membership payment, the owner's cash or transfer entry for a membership payment, and the owner's edit of paid-until on the member screen. Each writes a MemberChange row with the field PAID_UNTIL, the old value, the new value and the time, in the same transaction as the update. A person's change has the author. A change from the webhook has no author, the source PAYMENT, and the payment attempt that caused it. Each attempt can cause at most one such row.

An extension is one calendar month, clamped to the end of the month, counted from the later of today (Africa/Lagos) and the current paid-until. Paying early never loses days.

A membership payment, from the webhook or from the owner, writes in one transaction: a ledger CHARGE for the month, a ledger PAYMENT for the same amount, the paid-until update and the audit row, with the member row locked so two payments at once both count. A payment with the purpose BALANCE writes a ledger PAYMENT only and never changes paid time.

Reason: paid time decides access and money. A charge and a payment as a pair keep the balance at zero for someone who only bought a month. The lock stops two payments reading the same old date and one extension being lost.

**A paid-until date is a calendar date.** The column is a date with no time. Read it back with UTC date parts, and compare it with today's date in Africa/Lagos. Never convert it through the server's own time zone. A member is PAID through the whole of that date.

Reason: the owner thinks in days. Converting through the wrong zone shifts an evening value to the next or previous day, the same trap as the attendance day.

**An access card record is audited.** Staff and the owner can mark a member's access card issued, and can un-mark it. Each change writes a MemberChange row with the field ACCESS_CARD and the author, in the same transaction. Paying never changes the card record. The desk issues the card.

Reason: paying in the app does not open the gym door. The queue of paid members with no card is built from this record, so a wrong mark means someone is missed or served twice.

**The price of a month lives in one setting.** The AppSetting row monthly_price_naira holds it, in whole naira. The app reads it only from there. It is never taken from card text, including the prices card. If no row exists, Pay stays closed.

Reason: card text is written for people to read and can be stale or phrased loosely. A payment amount must come from one place the owner controls.

**A phone number is stored as international digits only.** A phone number is required at sign-up. A person may type it in local or international form, for example 0807 465 2543 or +234 807 465 2543. Store it as digits with the country code and nothing else, for example 2348074652543, the same format as the staff WhatsApp number. No plus sign, spaces, dashes or brackets are stored.

The conversion: remove spaces, dashes, dots and brackets. A leading plus or 00 means the number already has its country code, so keep the digits (8 to 15 of them, first digit not 0). A Nigerian number is 234 followed by 10 digits, and a stray 0 after 234 is dropped. An 11 digit number starting with 0, or a 10 digit number starting with 7, 8 or 9, is a Nigerian local number and gets 234 in front. Anything else is rejected, never guessed.

Reason: one stored form means the same person typed two ways is the same number, so a duplicate check can compare them and a WhatsApp link can be built from the stored value.

**Payment purpose is a fixed set.** A payment attempt carries a purpose of RENEWAL or BALANCE only, as an enum, not free text. RENEWAL buys one month of paid time. BALANCE settles money owed and never changes paid time.

Reason: free text invites a purpose nobody planned for. A fixed set means the webhook knows exactly which of two writes to make. See payments.md.

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
