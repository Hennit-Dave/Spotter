---
trigger: glob
globs: src/server/auth/**,src/proxy.ts
---


# auth.md

One job: how a person creates an account, proves who they are, and gets connected to a gym member record.

Read privacy.md for what a linked account may read. Read data-model.md for the Account, EmailToken and Member models.

## An account is not a member

Anyone can create an account. A new account reaches no private record and no card. It reaches a member's records only after staff link it to that member.

Reason: owning an email address proves nothing about gym membership. The desk knows the members, so the desk is the identity check.

## The desk assigns the membership ID first

Staff create the member record before the member signs up. The system generates the membership ID at that moment, and staff give it to the member.

Format: `SPT-` followed by four characters. The characters are the uppercase letters A to Z without I, L and O, and the digits 2 to 9. That is 31 characters.

The system generates the four characters at random, checks the ID is unused, and retries on a collision. Staff never type an ID. An ID is permanent and never reused, even after a member leaves.

Reason: random IDs cannot be guessed by trying the next number. The removed characters are the ones people misread when copying an ID off paper.

## Normalise the ID on input

Accept the ID in any case, with or without the dash, and with surrounding spaces. Convert it to `SPT-XXXX` in uppercase before storing or comparing.

Reason: `spt7k4q` and `SPT-7K4Q` are the same ID to a member, and they must be to the app.

## Sign up

Fields, all required: name, email, password, membership ID.

Create the account with status UNVERIFIED and store the normalised ID as the claim. Do not link it.

The sign-up response is the same whether or not the claimed ID exists, and whether or not it is already linked.

Passwords are at least 8 characters, with no rules about mixing character types. Store them only as an argon2 hash. Never log a password or return it from any endpoint.

Reason: a sign-up page that says "that ID belongs to someone else" tells a stranger which IDs are real. Length matters more than character rules, and character rules push people toward passwords they forget.

## Verify the email

After sign up, send one verification email containing a single-use link. When the link is used, set the account to PENDING_LINK and record the time.

The link expires after 24 hours. Store only a hash of the token. A used or expired link does nothing except offer to send a new one.

An unverified account may sign in, but sees only a screen asking it to verify, with a button to resend the link.

Reason: verification proves the person owns the inbox, which is what makes a password reset by email safe later.

## Desk linking

Staff see every PENDING_LINK account on an admin screen, showing the account name, email and claimed ID, beside the name on the member record that ID points to. Staff tap Link or Reject.

The app raises flags. It never links on its own.

- The claimed ID matches no member: flag NO_SUCH_ID.
- The account name differs from the record name, ignoring case and extra spaces: flag NAME_MISMATCH. Staff may still link, after checking in person.
- The record is already linked to another account: flag ALREADY_LINKED and block the link.
- Two pending accounts claim the same ID: flag both DUPLICATE_CLAIM. Link neither until staff choose one. When one is linked, reject the other.

Linking sets the account's member link, status LINKED, the linking staff member and the time, in one transaction.

Reason: a membership ID can be seen, shared or copied. A person who knows the members confirming each link is what stops someone claiming a friend's record.

## Before linking

An account that is UNVERIFIED, PENDING_LINK or REJECTED sees only a waiting screen and a way to sign out. The waiting screen says the account is not linked to a membership yet and the front desk will connect it.

It sees no card, no record, and cannot check in or pay.

Reason: until a person at the desk has confirmed who this is, the app does not know whether they are a member at all.

## Sign in

Sign in with email and password.

The error for a wrong password and for an unknown email is the same message.

After five wrong passwords for one email in ten minutes, refuse further tries for that email for ten minutes.

Reason: different messages tell a stranger which emails have accounts. The limit makes guessing a password slow enough to be pointless.

## Password reset

"Forgot password" asks for an email address. The confirmation message is the same whether or not an account exists.

If an account exists, send one email with a single-use reset link. The link expires after one hour. Store only a hash of the token.

Setting a new password ends every other session for that account. It does not change the account's link.

Reason: a reset link is a key to the account, so it must be short-lived and usable once. Ending other sessions locks out whoever caused the reset to be needed.

## Exactly two emails

The app sends two kinds of email and no others: email verification and password reset. Each is sent only because the person just asked for it.

No welcome email, no receipts by email, no reminders, no nudges, no marketing.

Emails go through Resend. The free plan sends at most 100 emails a day. If more people sign up in one day than that allows, the emails stop until the next day, so members are onboarded in batches.

The sending domain must be verified with Resend before launch. Ask the human which domain.

Reason: the PRD allows these two because the person asked for them. Anything else breaks the version one rule that the app sends nothing on its own.

## There is no SMS

Do not build any SMS code or SMS message.

Reason: every SMS costs money the project does not have.

## The session

The session is a signed httpOnly cookie carrying the account ID.

On every request, the server loads the account and reads its member link. A private read uses that member link and nothing else. If the link is empty, there is no private read.

Do not put the account ID or member ID in local storage, a client-readable cookie, or a URL.

Reason: the member link is the only thing staff have vouched for. Reading it fresh on the server means an unlinked or rejected account can never act as a member.

## Staff and owner sign in separately

Staff and owner screens use their own sign-in and their own session, and check the staff role before any read or write. A member session never reaches an admin route.

How staff sign in is not decided. Ask the human before building it.

Reason: admin screens read across members and write records. They must never share a session with the member app.