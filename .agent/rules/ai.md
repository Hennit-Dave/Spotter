---
trigger: glob
globs: src/server/ai/**, src/server/router/**
---

# ai.md

One job: how the model is called, and what stops it answering from general knowledge.

This file owns the pre-router. retrieval.md and refusal.md point here rather than describing it again.
Read refusal.md for what must be refused. Read privacy.md for name-stripping.

## refusal.md is the source for what is refused

The categories written into the prompt below are a copy, because the prompt has to carry them to work. refusal.md is the source of truth. If the two ever differ, refusal.md wins and the prompt is corrected to match.

Reason: the same list living in two places will drift. Naming which one wins means the drift is resolved the same way every time.

## No-training configuration only

Call Gemini in a configuration where submitted text is not used to improve the provider's products.

Do not call any tier that trains on inputs, even for a quick test, even with fake data.

If a no-training configuration is not available on the free tier, stop and ask the human before making any model call. Do not fall back to the default tier.

Reason: the member types freely and can include personal detail. Text that trains a third party's model cannot be taken back.

## The pre-router runs first

Before any model call, a keyword and pattern router runs on the incoming question.

**Confidence means an exact match against a maintained phrase list.** No fuzzy matching, no scoring, no embedding. Either the question contains a listed phrase or it does not. Keep the lists in one module so they can be extended in one place.

- A question containing an attendance phrase routes to the attendance path with no model call. Starting list: how many days, did I train, my attendance, days trained.
- A question containing a balance phrase routes to the balance path with no model call. Starting list: do I owe, my balance, outstanding, what do I owe.
- A question containing a never-answer phrase routes to the handoff with no model call. See refusal.md for the categories the list must cover.
- Anything with no listed phrase goes to the model classifier.

These lists are starting points, not the complete set. Extend them from real questions in the question log. Do not replace exact matching with a scored match without asking.

Record on the question log whether the router resolved the question without a model call.

Open point: the PRD describes the pre-router as on-device in one section and server-side in another. Confirm with the human which is intended before building it. Do not pick one silently.

Reason: most questions are the same few questions. Resolving them without a model call cuts cost, cuts data use on a small bundle, and keeps common question text off the network. Exact matching is used because a scored router that guesses wrong sends a private question down the shared-card path.

## The classifier contract

When the pre-router finds no match, one classifier call runs. It receives the name-stripped question and returns exactly one label, as plain text, with nothing else:

- SHARED: a question about the gym that a card might answer.
- ATTENDANCE: a question about this member's own training days.
- BALANCE: a question about this member's own money.
- REFUSE: a question in any never-answer category.
- OTHER: none of the above.

Prompt:

```text
Label the QUESTION with exactly one of: SHARED, ATTENDANCE, BALANCE, REFUSE, OTHER.
Output the label only. No punctuation, no explanation, no other text.

SHARED: about the gym's timetable, prices, rules, access hours, guest policy,
pause or cancellation terms, or a training plan.
ATTENDANCE: about the asker's own training days or visits.
BALANCE: about the asker's own money, payments, or what is outstanding.
REFUSE: about another person, whether a door will open now, refunds, waivers,
discounts, cancellations, staff conduct, or any symptom, injury, pain, diet or
supplement question about the asker.
OTHER: anything else.

QUESTION: <question>
```

Any output that is not one of the five labels is treated as OTHER, which hands off.

Reason: without a stated contract the agent invents its own labels and output format, and the branching code silently stops matching. Treating an unexpected output as a handoff fails safe.

## The model never writes a private number

Attendance counts and balance figures are computed from the database and rendered by fixed templates in code. Do not pass a private figure to the model and ask it to phrase the answer.

Reason: a model that phrases a number can change it. A template cannot.

## The model sees one card and nothing else

For a shared question, pass the single card that cleared the threshold, along with the member tier and the question. Never pass several cards, never pass a summary of the card set, never pass conversation history.

Temperature is 0.

Reason: a model given one card can only answer from that card. A model given several starts blending them, which is how a wrong answer that sounds right appears.

## The grounding prompt

```text
You are Spotter, the answer desk for this one gym. You answer only from the
CARD given to you in this request. You never use outside or general knowledge.

You receive:
- MEMBER_TIER: the member's tier.
- CARD: one gym card with title, body, category and last confirmed date. It may
  be empty.
- QUESTION: the member's question.

Rules:
1. If CARD is empty, output exactly: NO_RECORD
2. If CARD is present, answer QUESTION in one or two short lines using only text
   found in CARD. Do not add any fact that is not written in CARD.
3. You may repeat what a TRAINING_PLAN card states, with the card shown. You must
   refuse any question that asks you to assess a symptom, injury, pain, diet or
   supplement, or to advise beyond the card text. Reading back the card is
   allowed; advising beyond it is not.
4. Never mention any other member. Never say whether a door will open now. Never
   rule on refunds, waivers, discounts or cancellations. Never comment on staff
   conduct. If QUESTION asks for any of these, output exactly: REFUSE <reason_code>
   where reason_code is one of ANOTHER_MEMBER, MEDICAL, LIVE_DOOR, MONEY_RULING,
   STAFF_CONDUCT.
5. Report money, do not rule on it. Write "Our records show X" not "You owe X".
6. Do not combine or calculate across records. Do not guess.
7. Output plain text only. No markdown, no preamble.
```

Change this prompt here and nowhere else. Do not edit a copy inside a route.

## Handling the model's output

- Output NO_RECORD: hand off. Do not show the member any part of the model output.
- Output starting REFUSE: hand off with the matching reason logged. Do not show the reason code to the member.
- Any other output: show it with the source card and its last confirmed date.

Reason: these two strings are control signals, not answers. Rendering them to a member leaks the internals and reads as a broken app.

## Rate limits

The per-minute request cap is the real ceiling, not the daily total, because questions cluster after a timetable change.

On a rate-limit response, retry with backoff. If the retries fail, hand off to the desk.

Never leave the member waiting on a stuck model call. Never show a partial answer.

Reason: a slow app on a bad connection is worse than an honest handoff, and the desk is the fallback the product is designed around.

## Two calls at most

A question the pre-router cannot resolve uses at most one classifier call and one answer call. Do not add a summarising call, a rewriting call, or a verification call.

Reason: every extra call costs money, time, and another chance for text to leave the device.