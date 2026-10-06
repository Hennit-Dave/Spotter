---
trigger: glob
globs: src/server/auth/**,src/proxy.ts
---


# auth.md

One job: how a person creates an account, proves they own the inbox, and becomes a member.

Read privacy.md for what a signed-in member may read. Read data-model.md for the Account, EmailToken and Member models.

## A verified account becomes a member

Anyone can sign up. There is no desk step. When the person verifies their email, the system creates their Member record, with its membership ID, in the same transaction that makes the account ACTIVE. Until then the account has no member and reaches no private record and no card.

Reason: owning an inbox is what the system can check, so that is what makes a member. Doing both writes in one transaction means there is never an ACTIVE account without a member.

## The membership ID is generated at verification

Format: `SPT-` followed by four characters. The characters are the uppercase letters A to Z without I, L and O, and the digits 2 to 9. That is 31 characters.

The system generates the four characters at random, checks the ID is unused, and retries on a collision. Nobody types an ID. An ID is permanent and never reused. It is a reference for the desk, for example when issuing an access card. It grants no access.

If the ID is taken, the database refuses the insert and the whole transaction rolls back. Generate a new ID and try again in a fresh transaction, up to a small fixed number of times.

Reason: random IDs cannot be guessed by trying the next number. The removed characters are the ones people misread when copying an ID off paper.

## Sign up

Fields, all required: name, email, password, phone, and one question: "Already a member at the gym?", answered Yes or No.

Store the email in lowercase, trimmed, and compare it in lowercase everywhere. This applies to every email in the system, member Account and Staff alike.

The phone is stored as international digits only, by the rule in data-model.md. A phone that cannot be placed is rejected with a message. That message says nothing about whether any account exists.

Create the account with status UNVERIFIED, holding the name, phone and answer. Create no member.

Passwords are at least 8 characters and at most 1,000, with no rules about mixing character types. Store them only as an argon2id hash, with a memory cost of 19,456 KiB, a time cost of 2 and a parallelism of 1. Never log a password or return it from any endpoint. These settings apply to members and staff alike and live in one place, src/server/auth/password.ts. Change them only with the human's approval.

When there is no stored hash, such as an unknown email or a staff account that has not set a password, still do the same hashing work against a throwaway value before refusing. The response time must not reveal whether the account exists.

**Signing up with an email that already has an account.** If the email belongs to an UNVERIFIED account, replace that account's name, phone, answer and password with the new ones, and send a new verification link, inside the limit below. If the email belongs to an ACTIVE account, change nothing and send nothing. An ACTIVE account's email is never replaced. In every case the sign-up response is the same as for a brand new email.

**Cleaning up.** Each time a new sign-up is written, delete UNVERIFIED accounts older than 2 months. There is no scheduled job. The rule and its limits are in privacy.md.

Reason: a sign-up page that says "that email already has an account" tells a stranger which emails are members. Replacing an unverified account lets a person who mistyped, or never got the first email, try again. Length matters more than character rules, and character rules push people toward passwords they forget. The 1,000 character ceiling stops one enormous input from tying up the server.

## Verify the email

After sign up, send one verification email containing a single-use link. When the link is used, do these in one transaction:

1. Set the account to ACTIVE and record the verification time.
2. Create the Member: the account's name and phone, the account's answer as claimsExistingMember, a generated membership ID, no paid time, and the opening-balance flag set only if the answer was No. A Yes answer leaves it unset.
3. Set the account's member link to the new member.

If any step fails, none persists. Using the link a second time creates no second member: a used link does nothing.

The link expires after 24 hours. Store only a hash of the token. A used or expired link does nothing except offer to send a new one.

**A verification email is sent at most 3 times per email address per hour,** counting both the first and every resend. Count every request in the FailedAttempt table with the kind VERIFICATION_EMAIL and the lowercase email as the key, whether or not an account exists. Once 3 have been counted in the last hour, send nothing. The person sees the same confirmation either way.

An unverified account may sign in, but sees only a screen asking it to verify, with a button to resend the link. It reaches no card and no record, and cannot check in or pay.

Reason: verification proves the person owns the inbox, which is what makes a password reset by email safe later. The limit protects the free email plan, which allows 100 emails a day, from being used up by one person.

## Sign in

Sign in with email and password.

The error for a wrong password and for an unknown email is the same message.

After five wrong passwords for one email in ten minutes, refuse further tries for that email for ten minutes.

The count lives in the FailedAttempt table, not in server memory. Write one row per wrong try, with the kind, the key (the lowercase email) and the time. Count the rows for that kind and key in the last ten minutes. Member sign in, admin sign in and the daily check-in code each have their own kind, so a pause on one does not pause another. Clear nothing on success: the rows age out of the ten-minute window. The retention rule for these rows is in privacy.md.

Reason: different messages tell a stranger which emails have accounts. The limit makes guessing a password slow enough to be pointless. Serverless memory is lost between requests, so only a stored count holds.

## Password reset

"Forgot password" asks for an email address. The confirmation message is the same whether or not an account exists.

If an account exists, send one email with a single-use reset link. The link expires after one hour. Store only a hash of the token.

A reset email is sent at most 3 times per email address per hour. Count every request in the FailedAttempt table with the kind PASSWORD_RESET_EMAIL and the lowercase email as the key, whether or not an account exists. Once 3 have been counted in the last hour, send nothing. The person sees the same confirmation either way, so the limit does not reveal whether the account exists. This applies to member and staff reset requests alike.

Reason: the reset form is public and the free email plan allows 100 emails a day. Without a limit, anyone could use up the day's emails, or flood one person's inbox.

Setting a new password ends every other session for that account, by adding one to the account's session version. It does not change the account's member link. See The session.

Reason: a reset link is a key to the account, so it must be short-lived and usable once. Ending other sessions locks out whoever caused the reset to be needed.

## Exactly two emails

The app sends two kinds of email and no others: email verification and password reset. Each is sent only because the person just asked for it, and each has its own limit of 3 per email address per hour. A staff or owner password reset is the same reset email.

No welcome email, no receipts by email, no reminders, no nudges, no marketing.

Emails go through Resend. The free plan sends at most 100 emails a day. If more people sign up in one day than that allows, the emails stop until the next day.

The sending domain must be verified with Resend before launch. Ask the human which domain.

Reason: the PRD allows these two because the person asked for them. Anything else breaks the version one rule that the app sends nothing on its own.

## There is no SMS

Do not build any SMS code or SMS message.

Reason: every SMS costs money the project does not have.

## The session

The session is a signed httpOnly cookie carrying the account ID and the account's session version.

**Lifetime.** A member session lasts 30 days. An admin session lasts 12 hours. The expiry is inside the signed value, not only on the cookie, so a copied cookie cannot outlive it. The values live in one place, src/server/auth/cookie.ts.

**Cookie settings.** Both cookies are httpOnly and are marked secure in production. The member cookie is SameSite Lax with Path /. The admin cookie is SameSite Strict with Path /admin, so the browser never sends it to a member route. The two use different cookie names.

On every request, the server also compares the cookie's session version with the one stored on the account. A mismatch means the session has ended: treat the person as signed out. A password reset adds one to the stored version, which ends every other session at once.

On every request, the server loads the account and reads its member link. A private read uses that member link and nothing else. If the account is not ACTIVE, or the link is empty, there is no private read.

Do not put the account ID or member ID in local storage, a client-readable cookie, or a URL.

Reason: the member link is only ever set by the system, at verification. Reading it fresh on the server means an unverified account can never act as a member.

## Staff and owner sign in with email and password

Decided 2026-10-05 (D25). Staff and owner sign in with email and password, the same way as members. Their screens live under /admin, with their own sign in and reset screens.

**There is no open sign-up for staff.** The owner creates every staff account, on the admin staff screen, with a name, an email, a phone, a WhatsApp number and a role, OWNER or STAFF. Staff never create their own account. The first owner row is inserted by the human, because no owner exists yet to create it.

**A new staff account has no password.** The password hash is empty until the staff member sets one through the reset link: they ask for it on the admin Forgot password screen. Sign in is refused while the hash is empty, with the same message as any other failed sign in.

**Same hashing, same reset link.** Staff passwords use the same argon2 hash, the same minimum length, the same single-use hashed reset token with a one-hour life, and the same wrong-password pause as members. They use the shared code in src/server/auth/. Do not copy it.

**Staff emails are not verified by link.** The owner typed the address, and a reset link proves the person controls the inbox.

**The admin session is its own cookie.** It is a signed httpOnly cookie with a different name from the member cookie, set with Path=/admin. Its signed payload carries the kind admin, the staff ID and the staff session version. A member cookie never passes an admin check, and an admin cookie never passes a member check.

**The role is checked before every admin read or write.** On every admin request the server loads the staff row fresh, confirms the account is active, compares the session version, and checks the role. Owner-only actions need OWNER: approve cards, enter an existing member's opening balance and add charges, change a member's paid-until date or existing-member answer, enter cash and transfers (for membership or for a balance), set the monthly price, create or deactivate staff, and read the weekly review. A STAFF role cannot reach them.

Both OWNER and STAFF may draft and edit cards, read the member list, mark or un-mark a member's access card, set the daily check-in code, record a manual check-in, and set who is on duty. Nobody creates a member by hand: members make themselves by signing up. Every change to paid-until, the existing-member answer or the access card is audited, per data-model.md. Deactivating a staff member, or a password reset, ends their sessions.

Reason: admin screens read across members and write records. They must never share a session with the member app, and a role stored only in the cookie could not be taken back when someone leaves. Reading the row fresh on each request means a removed or demoted person loses access immediately.
