---
trigger: always_on
---

# client-constraints.md

One job: making the app usable on a cheap phone, a small data bundle, and an unreliable connection.

Read ai.md for the handoff fallback when a model call cannot complete. Read data-model.md for the rules behind the empty states this file renders.

## The member's conditions

An inexpensive Android phone a few years old. Data bought in small bundles, so every megabyte is noticed. Power is unreliable, so the phone is often low. Nobody technical to help.

Every rule below follows from these four facts.

## It is a web app saved to the home screen

Build a Progressive Web App. Do not build a Play Store app and do not add a native wrapper.

Reason: an install from a store costs data and a decision the member may not make. A saved page costs neither.

## Account screens are light

A person who is not signed in lands on a landing page: one or two lines saying what Spotter is, a Create account button, and a Log in button.

The other account screens are sign up (name, email, password, phone, and the question "Already a member at the gym?"), verify your email, log in, and forgot password. An account that has not verified its email sees one message asking it to verify, with a resend button. Each is one short form or one message. No images beyond the logo, no carousel, no marketing copy.

Reason: these screens are crossed once or rarely, on a small data bundle. They should cost almost nothing to load.

## The member home is not an empty chat box

For a signed-in member, the first screen shows a status strip with the member's plan (Free or Paid), the paid-until date, days trained this month, and balance. A FREE member has no paid-until date to show, so the strip says the plan is Free and shows no date, never a blank or a zero. Below it sit four tappable common questions. A text box is present but optional.

**The four questions are supplied by the human. Do not invent them.** Ask for them before building the screen, and put them in one place so they can be changed without touching the layout.

Reason: a member who has to think of a question before seeing anything useful will not open the app twice, and tappable questions cost no typing on a small keyboard. The four are invented nowhere in the PRD, and because they will be the most-used path in the app, guessing them decides what members ask.

## Everything dated carries an "as of" stamp

The status strip carries an "as of" time for the whole strip. Money on the strip is phrased as a dated report, never as a bare number and never as a ruling.

Reason: the strip renders from cache, so it can be stale. A stale value that looks current is a wrong answer with no warning.

## What the service worker caches

Cache the app shell and the last status payload.

Do not cache answers to questions, private record responses beyond the status payload, or anything from the payment flow.

Reason: the shell and status make the app open instantly and work offline. Caching answers risks showing a member a figure that has since changed.

## Offline behaviour

Offline, the status strip renders from cache with its "as of" time.

Check-in, pay, and questions need the network. Offline, each shows a short plain state saying the member is offline. Never show a spinner that cannot resolve.

Reason: a member on a dead connection needs to know to try later, not to watch an animation.

## Cold start

The database sleeps when idle, so the first request after a quiet spell takes a few seconds.

Show a brief loading state. Let the cached status strip fill the wait so the screen is never blank.

Reason: a blank screen on a slow first load reads as a broken app, and the member has nobody to ask.

## Empty states are written, not blank

Every screen has a written empty state. The first two are not free choices, because the rule behind each lives in data-model.md:

- Before a member's first check-in, the training days line explains that check-in has just started and days will show from their first check-in. Never render a zero.
- While a member's opening balance is not set, the balance path hands off to the desk. Never render a zero, and never render a currency symbol with no figure.
- A FREE member who opens Check in sees a written sentence saying check-in is for paid members. Never a blank screen and never a disabled control with no explanation.
- While no monthly price is set, the Pay screen says payments are not open yet. Never a price of zero or a currency symbol with no figure.

Reason: these two are where a rendering shortcut becomes a false claim to the member. The rule is set elsewhere; this file only fixes how it appears on screen.

## Weight

Keep the initial payload small. Prefer server rendering over shipping logic to the browser. Do not add a heavy UI library, an animation library, or a font pack without asking.

Reason: every kilobyte is paid for by the member from a bundle they bought.