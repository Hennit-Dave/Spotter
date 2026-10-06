---
trigger: always_on
---

# privacy.md

One job: the isolation invariant. Who can read what, and what never leaves the database.

This file owns the rule. Other files point here. Do not restate these rules elsewhere.

## Two session types, two different rules

**A signed-in member may read only their own records.** The filter is the member link on their account, loaded on the server from the verified session. Never take a member ID from a URL parameter, a request body, a header, the membership ID typed at sign-up, or any client-supplied field.

An account with no member link reads no private record and no card, however long it has existed. An UNVERIFIED account never has one.

**A staff or owner session may read across members, after a role check.** The member list, the weekly review, and cash entry all need this. These reads run only in admin routes, only after the staff role is verified, and never through the member query helper.

No member session ever reaches an admin route, and no admin route is reachable without a staff role check.

**Matching a person to a gym record is a desk decision, now made by the owner.** A person who signs up as already a member sees no balance until the owner enters their opening balance. The owner's screen shows the person's name, email and phone, and the owner must confirm in person that this account is that member before the entry is saved. The screen also shows possible duplicates by name and phone. Entering a balance on the wrong member's row shows one person's money to another.

Reason: the desk used to confirm each account against a membership ID. With self sign-up that check moves here, so it has to be a deliberate step, not a side effect of typing a number.

Reason: the member-scoped rule alone would make the owner screens impossible to build, and an agent that hits that wall will either break the rule or build the screen wrong. Naming both cases removes the guess.

## Member reads go through one helper

All member-scoped reads use a shared query helper that takes the linked member ID, read from the signed-in account on the server, as a required argument. Do not write a raw member-scoped query inline in a route.

Admin reads do not use this helper. They use their own path, behind the role check.

Reason: one place to audit. A reviewer reads the helper and knows every member read is scoped, instead of checking every route.

## Private records are never embedded

No private record is turned into an embedding, inserted into the vector index, or compared by meaning. This covers attendance, ledger entries, payment attempts, question logs, wrong-answer reports, member details, accounts, and email tokens.

If a feature seems to need a private record in the vector index, that feature is wrong. Stop and ask the human.

Reason: the vector index is searched across all rows. Anything inside it can surface for any member. Private records must be reachable only by exact ID.

## No cross-member comparison is shown to a member

A member never sees an aggregate, ranking, average, or comparison that involves other members, even anonymously.

Reason: aggregates leak. "You trained more than most members" reveals other members' data indirectly.

## Access is enforced on the server

All private database access runs inside a server route handler or a server action, after the session is verified. There is no client-side database access and no private query in a client component.

Access is enforced in the application layer, not with Postgres row level security. This holds only while a single app owns all database access. If direct database access is ever added, tell the human that row level security is now needed.

Reason: a rule enforced in the browser is not enforced.

## Name-stripping before any model call

Before question text is sent to any model, apply both of these to the text:

- Remove or mask runs of five or more digits.
- Remove or mask consecutive capitalised words that are not at the start of a sentence, which is how a typed full name usually appears.

Separately, never add the member's own stored name, phone number, or ID into a prompt. The model does not need to know who is asking.

Reason: the member types freely and can include a name. The two patterns above are the ones a person actually types, and they are checkable in a test, unlike a vague instruction to remove personal detail.

## Question text is not sent outside with identity

Question text may be stored in the app's own database with the member ID, because that is the gym's own record. It must not be sent, exported, or logged to any third-party service together with member identity.

Reason: the gym's own database is the boundary. Outside it, identity plus content is a leak.

## The verification page shows details only to the holder of the link

The verification page shows the name, phone and answer given at sign-up so the person can check them. It shows them only to someone holding a valid, unused, unexpired link, and never in a URL, a log or an email. A used or expired link shows nothing about the account.

Reason: the details are personal and the page is public. The link is the only proof that the viewer controls the inbox.

## Email addresses go to one provider, for one purpose

An account's email address is sent to the email provider only to deliver the two account emails described in auth.md. Never send an email address, an account name, or a membership ID to the model or to any other third party.

Reason: the email provider needs the address to deliver a link the person asked for. Nothing else needs it.

## Retention is not decided

There is no retention or deletion rule yet. Do not build a deletion job, an expiry sweep, or an anonymisation step for any private record. Ask the human first.

**Approved exception one:** FailedAttempt rows older than 24 hours may be deleted. They are operational counters for the wrong-password and wrong-check-in-code pauses, not member records. The cleanup runs inside the code that writes a FailedAttempt row: each time one is written, rows older than 24 hours are deleted in the same call. There is no scheduled job. The delete filters on that table and the age only, and must not touch any other model.

Reason: the PRD leaves retention open. A deletion job built on a guess destroys records nobody agreed to destroy. FailedAttempt holds an email address and a timestamp for a ten-minute window, so keeping it longer than a day serves no purpose.

**Approved exception two (D37):** UNVERIFIED accounts older than 2 months may be deleted, by the same kind of rule: the cleanup runs inside the code that writes a new sign-up, deletes in the same call, and there is no scheduled job. The delete filters on status UNVERIFIED and age only, in the Account table only. It deletes that account's email tokens with it. An UNVERIFIED account has no member, so no member record, ledger entry or attendance row is touched. An ACTIVE account is never deleted by it.

Reason: an account that never verified holds a name, phone and email and no password, and serves no purpose. FREE accounts never expire, so without a cleanup, abandoned sign-ups would pile up.

## Checks before merge

- No member-scoped query exists without the member link from the session's account.
- No account without a member link can reach a private record or a card.
- No admin read runs without a staff role check.
- An existing member's opening balance cannot be saved without the owner's identity confirmation.
- The Account cleanup deletes only UNVERIFIED accounts older than 2 months.
- The verification page shows no details without a valid, unused link.
- No private model appears in any embedding or vector insert path.
- No private query runs in a client component.
- Name-stripping runs before every model call.