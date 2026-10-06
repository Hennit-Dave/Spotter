# Spotter

## Description
Spotter is a web app a gym gives its own members that answers a member's questions from the gym's own records only, and never from the internet. It answers shared facts from typed cards found by meaning search, and private facts like attendance and balance from the member's own records fetched by exact member ID, and the two paths never mix. When no record covers a question, the app says it does not have it and hands off; when a question is on the never-answer list, the app refuses in one sentence and hands off.

## Who uses it
- Member: the only user of the member app. Asks questions, checks in, pays, and is handed to the desk when the app cannot answer. Anyone can sign up with name, email, phone and the answer to "Already a member at the gym?". They set their password by using the link emailed to them, and then the system creates the member record and its membership ID. There is no desk linking. See .agent/rules/auth.md.
- Owner: a record supplier, not a user of the member app. Approves cards, sets the monthly price, enters an existing member's opening balance and paid-until date, enters cash and transfer payments, and reads a weekly review page.
- Staff: record suppliers, not users of the member app. Draft and edit cards for owner approval, see which paid members still need an access card and mark one issued, set the daily check-in code, and record a manual check-in. Staff appear to members only as the named person on handoff.

## One thing that the agent must do well
Never invent an answer. Answer only from the gym's own records, show the source with a date, and hand off to the desk when no record covers the question or the question is on the never-answer list. Private records are read by exact member ID and are never embedded or searched by meaning. Attendance counts and balances are computed from the database and rendered by fixed templates; the model never writes a private-record number.

## Defined Scope for the MVP
Five member features:
1. Ask about the gym: pass only the single top card that clears the similarity gate to the model; below the gate, hand off. The model answers from that one card only, never from general knowledge. Show the card and its last-confirmed date. Gate value in .agent/rules/retrieval.md.
2. My records: answer attendance and balance from the member's own records only. Always phrase money as a dated report, for example "Our records show X outstanding, as of [date]." Never phrase it as a ruling such as "you owe." A member who signed up as already a member of the gym sees no balance until the owner has entered their opening balance; until then hand off and never show a zero. A member who signed up as new starts with nothing outstanding and sees that at once. See .agent/rules/data-model.md.
3. Check in: a paid member types the daily code. A free member cannot check in. Write one attendance row per member per calendar day in Africa/Lagos; a second check-in the same day writes no new row. Show the updated count at once.
4. Pay: member pays one month of membership, or a balance, through Flutterwave. The webhook is the only source of truth, must be idempotent on the gateway reference, and repeat pay taps reuse one payment via the idempotency key. A verified membership payment extends paid time by one month in one transaction. Show the receipt only after the verified webhook. Paying does not open the gym door: the desk issues the access card. See .agent/rules/payments.md.
5. Ask the desk: hand off to the named on-duty staff when there is no answer.
Account screens are not features: landing, sign up, verify email, log in, and forgot password.
Owner and staff screens are input, not features, and are described under "Who uses it".
Log every question with the fields the PRD lists, including whether it was answered, refused, or handed off.

## Not in scope items for the MVP
- Live door state answers.
- Reminders, nudges, follow-ups, or any automated message. The only emails are email verification and password reset, sent when the person asks.
- Reading old WhatsApp or chat history.
- Refunds, waivers, discounts, and cancellations inside the app.
- Part-month price maths. A paid month is a whole calendar month.
- Stored history of old card text. Paid-until changes are audited; card text is not.
- Door access from payment. The desk issues the access card. The free plan is app use only and gives no door access.
- A stronger presence control for check-in.

## Stack
- Next.js with the App Router.
- TypeScript.
- Prisma.
- PostgreSQL.
- pgvector for card embeddings, inside the same PostgreSQL.
- Flutterwave for payments.
- Resend for the two account emails only.
- Use Gemini in a no-training configuration for the language model and embeddings, as set in .agent/rules/ai.md. Never send question text to any tier that trains on inputs.
Do not add a second database, a separate vector service, a different ORM, or a different framework. Ask the human first if a task seems to need one.

## Folder map
The PRD defines no folder layout. The human approved one on 2026-10-05; it is in .agent/rules/folder-map.md. Create a folder only from that tree, and only when the feature that needs it begins. For any other folder, propose it and wait. The PRD is at docs/spotter-prd-revised.md. If it is missing, stop and ask the human before building.

## How to work in this codebase
- Make one change at a time. Do not batch unrelated changes.
- Ask before adding any package or dependency.
- Do not run any command that creates, alters, drops, seeds, or migrates database tables or data. Propose the schema change and the migration; the human runs it.
- Databases, decided 2026-10-06: local development uses the Neon branch named dev, through DATABASE_URL and DIRECT_URL. A schema change goes to dev first, then test, then production, each applied by the human. The agent never runs a migration on any of them.
- One exception, approved by the human on 2026-10-05: database-backed tests may write to the Neon branch named test, and only through the connection string in TEST_DATABASE_URL. Never write to the main branch, and never use DATABASE_URL or DIRECT_URL in a test. The exception covers rows in a branch the human created for this. It does not cover schema changes or migrations, even on the test branch.
- Run the pre-router first, strip names before any model call, and use only the no-training Gemini configuration.
- Paid-until changes are audited in the same transaction; the plan is worked out in one function and nowhere else; card approval and its embedding are one atomic step; exactly one on-duty row may be active.
- List your assumptions at the end of every response.
- Stop and ask when the PRD is silent or open on anything affecting money, privacy, the refusal rules, the data model, or MVP scope.
- Read docs/spotter-prd-revised.md before starting a task. When this file and the PRD agree, follow both. When they seem to disagree, stop and ask.

## Where the detailed rules live
Do not inline schema, SQL, model names, dimensions, thresholds, prices, or environment variable names in this file or in code comments. They live in these rules files. Read the relevant rules file before writing any code in its area. Every rule in these files is binding in every session, not optional.
- .agent/rules/data-model.md: the invariants: automatic membership, the derived plan, paid time and its audit, the opening-balance flag, the one-check-in-per-calendar-day rule, and the single active on-duty rule.
- .agent/rules/retrieval.md: embedding step, plan pre-filter before search, the similarity threshold, and the retrieval query.
- .agent/rules/ai.md: the fixed Gemini no-training configuration, the grounding prompt, the pre-router, name-stripping before any model call, and rate-limit handling.
- .agent/rules/refusal.md: the never-answer list, the medical and training-plan boundary, and the refusal test set.
- .agent/rules/payments.md: Flutterwave initiate, verify, webhook signature check, webhook idempotency on the gateway reference, and idempotency on repeat taps.
- .agent/rules/auth.md: sign up, email verification that creates the member, the membership ID, sign in, password reset, and the session cookie.
- .agent/rules/privacy.md: member-ID filtering on every private read, what is never embedded, and where access is enforced.
- .agent/rules/secrets.md: where secrets live and how they stay out of the browser, logs and repository.
- .agent/rules/client-constraints.md: the cheap phone, small bundle and weak connection rules, including the account screens.
- .agent/rules/testing.md: the gates that block a merge.
- .agent/rules/folder-map.md: where code lives, and where the shared auth code sits.
- .agent/rules/database-changes.md: how a schema change is proposed. The agent never runs one.
- .agent/rules/git.md: the git commands the agent must never run.
Skills in skills/ are step-by-step procedures: build-member-feature, build-admin-screen, question-log-triage. Use the matching skill when a task fits it.
These rules files may not exist yet. If one is missing, do not invent its contents. Draft it from the cited PRD section, mark it DRAFT, and get human approval before relying on it.

## Definitions
- Plan (tier): a member is FREE or PAID. It is worked out from one paid-until date in one function, never stored. FREE never expires and sees the free cards. PAID adds training plans and trainer guidance. A FREE member never receives a PAID card. The filter runs before the similarity search.
- Record: two kinds. Shared records are typed cards, the same for everyone, gated by tier. Private records are one member's own attendance and balance, fetched by exact member ID and never searched across members.
- Never-answer list: questions refused even when a record exists, covering another member, live door state, refunds, waivers, discounts, cancellations, and staff conduct. Full rules in .agent/rules/refusal.md.
- Retrieval: the search step that finds a matching shared card.
- Embedding: turning text into numbers for meaning search. Only approved shared cards are embedded.
- Chunk: one approved card embedded whole as one unit.
- Pre-router: a keyword and pattern step that resolves obvious attendance, balance, and never-answer questions without a model call. It runs on the server.
- Handoff: sending the member to a named staff member when the app cannot answer.
- Membership ID: the permanent ID the system assigns each member when their email is verified, in the form SPT-7K4Q. It is a reference for the desk and grants no access.
- Verified account: an account whose email has been verified. It has a member record. Only a verified account reaches private records or cards.
- Paid-until: the one date a member is paid through. Paying extends it by one calendar month.
- Idempotency key: a value that makes a repeated pay tap reuse the same payment instead of starting a new one.
- Progressive Web App: a website saved to the home screen that behaves like an app.