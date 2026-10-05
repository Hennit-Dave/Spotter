---
name: question-log-triage
description: Turn a week of Spotter question logs and wrong-answer reports into sorted buckets and specific changes. Use for the weekly review, or whenever the app is handing off questions it should be answering.
---

# Triage the question log

One job: turn last week's unanswered questions and wrong-answer reports into three buckets and the changes each bucket calls for.

Change nothing until every question is bucketed.

## Step 1: Pull the week

Get every question log row from the last seven days where no answer was found. Get every wrong-answer report from the same period.

Check: you have two lists and a count for each.

## Step 2: Bucket every question

Put each one in exactly one bucket:

- Bucket A, no card exists. The gym has never written down this answer.
- Bucket B, a card exists but was not found. The answer is in an approved card the member's tier allows, and the app still handed off.
- Bucket C, a refusal was missed. The app answered something it should have refused.

To decide between A and B, search the approved cards yourself for the answer.

Check: every question sits in one bucket. The three counts add up to the total from step 1.

## Step 3: Handle bucket A

Write the list of missing answers for the owner to draft.

Do not write card content. Do not create cards.

Check: your output is a list of gaps addressed to the owner, containing no drafted answers.

## Step 4: Handle bucket B

For each one, find the cause. There are two:

- The pre-router sent it down the wrong path, or failed to catch a phrase it should have.
- The card was searched for correctly but scored below the similarity threshold.

Propose the specific change: a phrase to add to a pre-router list, or a threshold change.

Do not lower the threshold because of a single question. A threshold change needs at least three questions in this bucket pointing the same way.

Check: each bucket B question names one cause and one proposed change. Any threshold proposal cites three or more questions.

## Step 5: Handle bucket C

Add the exact wording of each missed question to the refusal test set.

Check: the set has grown by the size of bucket C, and each added question is worded exactly as the member typed it.

## Step 6: Run the refusal gate

Run the refusal gate against the grown set.

Check: zero leaks. If a question leaks, report it and stop. Do not remove it from the set to make the gate pass.

## Step 7: Report

Give the three bucket counts, the gaps for the owner, the proposed pre-router and threshold changes with their evidence, and the refusal gate result.

Check: your report accounts for every question pulled in step 1.