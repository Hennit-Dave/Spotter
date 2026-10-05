---
name: build-admin-screen
description: Build an owner or staff input screen in Spotter, in order, from the PRD functional requirement through the role check and transaction rules to the test gates. Use when building or changing any owner or staff screen, such as card approval, the member list, cash entry, or the weekly review.
---

# Build an admin screen

One job: take one owner or staff screen from its PRD functional requirement to a merged, gated build.

Use this for owner and staff screens only. For a member screen, use build-member-feature.

## Step 1: Read the functional requirement

Open the FR for this screen in the PRD. Copy its acceptance criteria into your working notes.

Check: you can name every criterion the screen must pass.

## Step 2: Confirm the session type

This screen uses the staff session, never the member session.

Check: the route reads a staff session and verifies the staff role before any read or write.

## Step 3: Confirm the query path

Admin reads may cross members. They do not use the member query helper.

Check: this route imports no member-scoped helper, and the member app cannot reach this route.

## Step 4: Wrap the writes that must be atomic

Three writes are never split:

- A change to a member's tier or expiry writes the audit row in the same transaction.
- Entering a member's opening balance sets the opening balance flag in the same transaction as the opening charge.
- Approving a card writes its embedding in the same transaction.

Check: each of these appears inside one transaction block. If the second half fails, the first half does not persist.

## Step 5: Build the form or list

Build the input. Validate every field before the write.

Check: an invalid entry is rejected with a message and writes nothing.

## Step 6: Write the empty state

Write what the screen shows before any record exists.

Check: an empty list shows a written sentence, not a blank area.

## Step 7: Protect read-only records

Records the gateway owns cannot be edited here.

Check: an in-app card payment renders without an edit control, and no route accepts an edit to one.

## Step 8: Record who did it

Any write that creates or changes a record stores the staff member who made it.

Check: perform one write and confirm the stored author matches the signed-in staff member.

## Step 9: Run the gates

Run the isolation gate and every other gate in testing.md that this path touches. Run the type check and lint.

Check: each gate passes. If one fails, report the gate name, the input, and the output. Do not change the gate.

## Step 10: Report

Say what was built, which transactions were wrapped, which gates ran, and which acceptance criteria are now met.

Check: your report names every criterion from step 1.