---
trigger: always_on
---

# database-changes.md

One job: how a schema change is proposed, so the agent never runs one.

This file is not specific to Spotter. It belongs in every project using Prisma.
Read data-model.md for what the schema currently is and which invariants it carries.

## The agent does not run migrations

Do not run any command that creates, alters, drops, seeds, or migrates database tables or data. This includes migrate dev, migrate deploy, db push, db seed, db execute, and any raw SQL that changes a table or a row outside the app's normal write paths.

Do not open Prisma Studio. It edits rows through a browser window, which puts it past a list of commands while doing the same damage.

Generating the Prisma client is allowed, because it changes no data.

Reason: a migration is irreversible in a way code is not. The human runs it because the human can see the database state, the backups, and what is already live.

## How to propose a change

Give the human four things together, in one message:

1. The schema change, as the exact lines to add or alter.
2. The reason, in one sentence, tied to a requirement.
3. The migration command to run.
4. What happens to existing rows.

Do not proceed with dependent code until the human confirms the migration ran.

Reason: code written against a schema that does not exist yet fails in ways that look like logic bugs.

## Additive first

Prefer adding a column, a table, or an index over renaming or dropping one.

When a field must change shape, propose it in steps: add the new field, backfill it, move the code across, then drop the old field as a separate change the human approves separately.

Reason: an additive change is safe to run on a live database. A rename or a drop is not, and doing them in one step leaves no way back.

## Every migration must be reversible

Say in the proposal how the change is undone. If a change cannot be undone, say so plainly and let the human decide before it runs.

Reason: the answer to "can we roll this back" must be known before the change, not discovered after it.

## Enums, counts, restore points and order

PostgreSQL cannot drop one value from an enum. Removing a value means renaming the type, creating the new one, converting the column, and dropping the old type. Say so in the proposal, and give the exact SQL and its undo. Renaming a value in place keeps every row.

With each proposal, give the human read-only count queries to run first, so the effect on existing rows is known before the migration runs.

Before a migration that drops a column or a table, remind the human to take a Neon restore point first. Dropped data cannot be rebuilt from an undo statement.

A schema change goes to the dev branch first, then the test branch, then production, each applied by the human.

Reason: the counts show what a migration will touch. A restore point is the only undo for dropped data. Dev first means a mistake costs fake data.

## Nullable or defaulted, when rows already exist

A new column on a table with existing rows is nullable, or has a default. Never add a required column with no default to a populated table.

Reason: the migration fails, or it fills real rows with a value nobody chose.

## Naming

Follow the naming already in the schema. Do not introduce a second convention partway through. If the existing convention seems wrong, say so and ask, rather than fixing it silently in one place.

Reason: two conventions in one schema is worse than one imperfect convention.

## Raw SQL migrations

Some things Prisma cannot express, such as a partial unique index. These go in a raw SQL migration.

When one is needed, say why Prisma cannot express it, give the exact SQL, and give the statement that undoes it.

Reason: raw SQL is invisible to the Prisma schema, so the reason has to live in the proposal or it is lost.

## Never edit a migration that has run

Once a migration is applied, it is history. A mistake is fixed by a new migration, never by editing the old one.

Reason: editing an applied migration puts environments out of step with each other and with the migration record.

## One-time exception, 2026-10-06

The human gave the agent permission to run `prisma migrate deploy` against the dev branch and the test branch, once, for the member plan migrations (A and B). That permission was scoped to that task and is spent. It was not a change to this file's rules.

The rule is unchanged: the agent does not run migrations unless the human gives permission for a specific task. Permission for one task does not carry over to the next. Production was never touched, and the agent never connects to it.
