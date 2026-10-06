---
name: build-member-feature
description: Build a member-facing screen and its answer path in Spotter, in order, from the PRD acceptance criteria through the states to the test gates. Use when building or changing any of the five member features: ask about the gym, attendance, balance, check in, pay.
---

# Build a member feature

One job: take one member feature from its PRD acceptance criteria to a merged, gated build.

Use this for member screens only. For an owner or staff screen, use build-admin-screen.

## Step 1: Read the acceptance criteria

Open the PRD section for this feature. Copy its acceptance criteria into your working notes.

Check: you can name every criterion the feature must pass before you write any code.

## Step 2: Name the answer path

Decide which one this feature is:

- Shared card path: the answer comes from an approved card.
- Private record path: the answer comes from this member's own records.
- Neither: the feature performs an action and answers nothing.

Check: you have written down one of the three. If the feature seems to be two, stop and ask the human.

## Step 3: Build the server route

Put the logic in a server route handler or a server action. Verify the session, load the account, and confirm it is ACTIVE with a member. Read the member ID from the account's member link, never from anything the client sends. An unverified account gets the verify screen and nothing else. For anything that depends on the plan, call the one plan function in src/server/plan/. Never read paid-until yourself.

For a private record path, call the shared member query helper. Do not write the query inline.

Check: the route file contains no database call that runs before the session check, no private query written inline, and an unverified account cannot get past the check, and the plan comes only from the plan function.

## Step 4: Write the empty state

Write what the screen shows when there is no data yet. Write this before the happy path.

Check: you can open the screen with an empty database and see a written sentence, not a blank area, a zero, or a currency symbol with no figure.

## Step 5: Write the error state

Write what the screen shows when the request fails, the model cannot be reached, or the gateway is unreachable.

Check: every failure shows a short plain sentence and, where the feature allows it, the handoff. No spinner remains on screen after a failure.

## Step 6: Add the offline and loading states

Add the offline state for any action that needs the network. Add a loading state that covers the database cold start.

Check: with the network disabled, the screen shows an offline sentence. On a slow first load, the screen shows something rather than staying blank.

## Step 7: Add the "as of" stamp

Any value that could be stale or that reports money carries a date or time.

Check: no figure renders without a date beside it or above it.

## Step 8: Build the happy path

Now write the successful case.

Check: the feature meets every acceptance criterion you copied in step 1.

## Step 9: Write the question log row

If this feature answers, refuses, or hands off a question, write one log row for every one of those outcomes.

Check: run the feature once for each outcome and confirm one row exists each time, with every field populated.

## Step 10: Run the gates

Run every gate in testing.md that this code path touches. Run the type check and lint.

Check: each gate passes. If one fails, report the gate name, the input, and the output. Do not change the gate.

## Step 11: Report

Say which gates ran, which did not apply and why, and which acceptance criteria are now met.

Check: your report names every criterion from step 1.