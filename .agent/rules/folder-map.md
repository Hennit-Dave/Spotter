---
trigger: always_on
---

# folder-map.md

One job: where code lives. Approved by the human on 2026-10-05.

Create a folder only when the feature that needs it begins. Do not create the whole tree up front. Do not add a folder this file does not list without asking.

## The tree

```
src/
  app/
    layout.tsx, manifest.ts, page.tsx
    (account)/        member account screens, no member session needed
      sign-up/  verify-email/  log-in/  forgot-password/  reset-password/
      waiting/        unverified, pending or rejected accounts
    (member)/         linked members only; session and link check in the layout
      ask/  records/  check-in/  pay/  desk/
    admin/            own area, own login, own cookie path
      log-in/  forgot-password/  reset-password/
      link-accounts/  members/  cards/  check-in-code/  duty/  payments/  review/  staff/
    api/
      webhooks/flutterwave/
  components/
    home/  account/  member/  admin/
  server/             server-only code; never imported into a client component
    auth/             shared by the member and admin sides
      password.ts  tokens.ts  email.ts  cookie.ts  throttle.ts  membership-id.ts
      member-session.ts  admin-session.ts
    members/          the one shared member-scoped query helper
    admin/            cross-member reads and writes, always behind the role check
    payments/  ai/  router/  retrieval/  checkin/
    db.ts             the single Prisma client
    time.ts           the Africa/Lagos calendar day
  proxy.ts            request interception (D6)
  styles/
public/icons/         manifest icons supplied by the human
prisma/migrations/    created when the human runs a migration
```

## Rules

**Shared auth code lives once, in src/server/auth/.** The member and admin sides both call it. Only member-session.ts and admin-session.ts differ. Do not copy hashing, token, email or cookie code into another folder.

Reason: two copies of password or token code drift apart, and the weaker copy becomes the way in.

**The two sessions are separate.** The signed cookie payload carries a kind, member or admin. They use two cookie names. The admin cookie is set with Path=/admin. A member cookie must never pass an admin check, and the reverse.

**Server code stays on the server.** Nothing in src/server/ is imported by a client component. Route handlers and server actions call it.

**Member reads go through src/server/members/ only. Admin reads go through src/server/admin/ only,** after the role check. See privacy.md.

**Tests are colocated.** A test sits beside the code it tests, named `*.test.ts`. The runner is Vitest, a dev dependency approved on 2026-10-05, added when the first test is written, not before.

**Route groups.** (account) and (member) are route groups and add nothing to the URL. Admin screens are under /admin.

**The webhook route is public.** It lives at src/app/api/webhooks/flutterwave/ and checks the signature before it reads the body. See payments.md.
