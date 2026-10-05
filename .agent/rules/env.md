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
| DATABASE_URL | CONFIRMED | PostgreSQL connection string, with pgvector in the same database. | PRD 8.5, the Prisma datasource |
| GEMINI_API_KEY | PROPOSED | Key for the Gemini no-training configuration, for both answers and embeddings. | PRD 7.1 |
| SESSION_SECRET | PROPOSED | Signs the httpOnly session cookie. | PRD 8.3, auth.md |
| FLUTTERWAVE_SECRET_KEY | PROPOSED | Server key used to initiate and verify payments. | PRD 6.5, payments.md |
| FLUTTERWAVE_WEBHOOK_SECRET_HASH | PROPOSED | Value used to check the webhook signature. | PRD 6.5, payments.md |

The PRD does not settle whether staff and owner sessions need a separate signing secret. Ask the human. Do not add one.

## Rules

- Every variable the code reads appears in this table and in `.env.example`.
- No name in this table carries the client-visible prefix. See secrets.md.
- Add a new variable here first, marked PROPOSED, and ask the human before code reads it.

Reason: one list of names means one place to check that nothing is missing and nothing leaks to the browser.
