---
trigger: always_on
---

# env.md

**DRAFT. Not approved by the human. Do not rely on any name marked PROPOSED until the human approves it. See docs/open-decisions.md.**

One job: the names of the environment variables the app reads.

Read secrets.md for how these values are handled. This file only names them.

## The list

| Name | Status | What it is for | Source |
|---|---|---|---|
| DATABASE_URL | CONFIRMED | Neon pooled PostgreSQL connection string (host has -pooler), with pgvector in the same database. The app uses it at runtime through the adapter in src/server/db.ts. | PRD 8.5, the Prisma datasource |
| DIRECT_URL | PROPOSED | Neon direct connection string. Read only by prisma.config.ts, for the CLI and migrations. The app never reads it. | D17 |
| RESEND_API_KEY | PROPOSED | Key for sending the two account emails. | auth.md |
| EMAIL_FROM | PROPOSED | Sender address for the two account emails. Depends on the sending domain in D24. | auth.md |
| APP_URL | APPROVED 2026-10-05 | Public address of the app, used to build the verify and reset links. A link needs a base address the app can trust, so the request's Host header is never used. | auth.md |
| TEST_DATABASE_URL | PROPOSED | Connection string for the Neon branch named test. Read only by database-backed tests, never by the app. The agent may write to this branch and never to the main branch. | AGENTS.md, testing.md |
| GEMINI_API_KEY | PROPOSED | Key for the Gemini no-training configuration, for both answers and embeddings. | PRD 7.1 |
| SESSION_SECRET | PROPOSED | Signs the httpOnly session cookie. | PRD 8.3, auth.md |
| FLUTTERWAVE_SECRET_KEY | PROPOSED | Server key used to initiate and verify payments. | PRD 6.5, payments.md |
| FLUTTERWAVE_WEBHOOK_SECRET_HASH | PROPOSED | Value used to check the webhook signature. | PRD 6.5, payments.md |

SESSION_SECRET signs both the member and the admin cookie. The payload carries the kind, so one secret serves both (folder-map.md). Do not add a second secret.

## Rules

- Every variable the code reads appears in this table and in `.env.example`.
- No name in this table carries the client-visible prefix. See secrets.md.
- Add a new variable here first, marked PROPOSED, and ask the human before code reads it.

Reason: one list of names means one place to check that nothing is missing and nothing leaks to the browser.
