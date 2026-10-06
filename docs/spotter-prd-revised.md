# Spotter Product Requirements Document (Revised)

This revision resolves nineteen lapses found in a section-by-section review. Changes are woven into the relevant sections, not appended.

## 1. Product Summary

Spotter is a web app (a website saved to the phone home screen, not a Play Store download) that a gym gives to its own members. It answers a member's questions from the gym's own records only, and never from the internet. The only user is the member. Staff and the owner never open the member app; they supply and approve records behind the scenes and appear to the member only as a named person to contact when the app cannot answer.

Spotter answers along two separate paths. Shared facts, such as the timetable and the guest policy, come from typed cards found by meaning search. Private facts, such as attendance and balance, come from the member's own records fetched by exact member ID and never from a card. The two paths never mix.

Members sign up themselves. When a member verifies their email, Spotter creates their record and membership ID. There are two plans. FREE is app use only: it never expires, it is not a gym membership and it gives no door access. PAID, bought one month at a time, adds training plans and trainer guidance. Paying in the app does not open the gym door: the desk still issues the access card.

What makes it different from a general chatbot: a chatbot cannot tell a member "you trained on these nine days in July," because that lives in this gym's own records, not on the internet. For shared facts, a chatbot guesses an average gym answer, while Spotter shows this gym's own card, the date it was last confirmed, and says it does not know when no card covers the question.

## 2. Problem

This gym has four hundred members. Two staff share one front desk, one person at a time, and the desk closes at eight. One paper timetable is taped to the wall. The same few questions arrive all day: Saturday class time, guest rules, days trained this month, money owed. The desk officer knows some answers, guesses others, and cannot answer anything about attendance or balance without opening a ledger she does not have in front of her.

Failure scene. It is 7:45pm. Chidinma asks the officer whether she is covered for July, since she sent a bank transfer but is not sure it landed. The officer has no ledger open, so she says "should be fine" to avoid a scene at closing. Chidinma trains all month believing she is paid up. In reality the transfer never arrived. The gym is out 15,000 naira it now has to chase, and Chidinma feels cheated when the desk later tells her she owes.

The boundary Spotter draws: it answers from recorded payments only. A transfer the desk has not yet entered still shows as outstanding, so the fix is same-day entry of every cash and transfer payment (FR-9). Spotter does not invent a payment it cannot see; it reports what the records hold and shows the date they hold as of.

## 3. Goals

1. Reduce the questions that reach the desk. Measured against a one-week paper tally of desk questions taken before launch, compared to the desk-question rate after launch. The pre-launch tally is a required step (see 3.1).
2. Give every member a correct, sourced answer about their own attendance and balance without a staff member opening a ledger. Measured as private-record questions answered in-app, paired with the wrong-answer-report rate on those answers.
3. Make in-building check-in a habit so attendance data exists to answer from. Measured as paid members with at least one app check-in in the last seven days. This is the product's main unproven behavioural bet (see section 4 and risk 2).
4. Collect in-app payments that settle straight into the gym account with a confirmed receipt. Measured as payment success rate (see section 12 for the exact denominator).
5. Build a clean record of every question, answer, gap and payment so version two can add reminders. Measured by the presence of complete logs, not a rate.

### 3.1 Required pre-launch baseline

For one week before launch, staff keep a paper stroke count of questions asked at the desk, split into the five recurring types. This gives Goal 1 a real denominator. Without it, a reduction in desk load cannot be shown.

### Non goals

- Spotter will not decide money disputes. It reports figures, it does not rule on them.
- Spotter will not tell a member whether the physical door will open right now.
- Spotter will not send any reminder, nudge or follow-up in version one. The only emails are email verification and password reset, sent when the person asks for them.
- Spotter will not replace the gym's access hardware or act as a lock.
- Spotter will not answer anything from general internet knowledge.

## 4. Users and Personas

### The member (the only user)

Chidinma, 27, office worker, trains most weekday evenings. Phone: an inexpensive Android, three years old. Data: small bundles bought a few days at a time, so she watches every megabyte. Power: unreliable, so her phone is often low. Nobody technical helps her.

How often she opens the app is not yet known. The design hopes she checks in on most visits, since check-in is what makes her attendance answers true, and asks a real question a few times a month. That check-in habit is an assumption, not a measured fact. It is the single behaviour the whole attendance half of the product rests on. If members do not check in, Feature 2 stays empty and half the value never switches on. This is why check-in adoption is a stop-building signal in section 12 and a top risk in section 13, and why Feature 3 gives an instant, visible reward for checking in.

How she gets in: she signs up with her name, email and phone, and answers one question, "Already a member at the gym?". She opens the link Spotter emails her, checks her details, and sets her password. Spotter then creates her record and her membership ID at once. If she said Yes, she sees no balance until the owner has entered it, and the app hands her to the desk until then. If she said No, she starts on the free plan with nothing outstanding and sees that at once.

### The owner (record supplier, not a user)

Approves cards, sets the monthly price, enters an existing member's opening balance and paid-until date, enters cash and transfer payments, and reads a weekly review page. The owner never opens the member app.

### Staff (record suppliers, not users)

Draft and edit cards for the owner to approve, see which paid members still need an access card and mark one issued, set the daily check-in code, and record a manual check-in when a member's phone is dead. **Staff never open the member app.** They appear to members only as the named person to contact on handoff.

## 5. Scope

### In scope for version one (the five features)

1. Ask about the gym.
2. My records (attendance and balance).
3. Check in.
4. Pay.
5. Ask the desk (handoff).

### Account screens (not features)

Open sign-up with an email check. Anyone can create an account with a name, email and phone. The person sets their password by using the link emailed to them, and that is when the system creates their member record. There is no desk linking step. The screens are: landing, sign up, verify email (set password), log in, and forgot password. See FR-16 to FR-20.

### Plans and payment

There are two plans. FREE never expires and sees the free cards: timetable, prices, rules, access hours, guest policy, and pause or cancellation. PAID adds training plans and trainer guidance. FREE means using the app only. It is not a gym membership and gives no door access. A FREE member cannot check in.

A member's plan is not stored. It is worked out from one date, the day they are paid through. A member is PAID when that date is today or later in Africa/Lagos, and FREE otherwise. When paid time runs out the member is FREE again, with nothing written and no scheduled job.

Paying makes a member PAID for one month. On the verified Flutterwave webhook, or on the owner's cash or transfer entry for membership, one transaction writes the ledger charge and payment, extends the paid-until date by one calendar month (clamped to the end of the month, counted from the later of today and the current paid-until, so paying early never loses days), and records the change in the audit. A change from the webhook is a system change with no author. A payment for a balance never extends paid time. A payment carries a fixed purpose of RENEWAL or BALANCE only.

The monthly price is set by the owner in one place the app reads. It is never taken from card text. Pay stays closed until the owner sets it.

While a payment is pending, a member who has had paid time before keeps paid access for twenty four hours. A member who has never had paid time gets no hold.

### Out of scope for version one

- Live door state. The access hardware is a standalone machine the app cannot read, so any live answer would be a guess.
- Reminders, nudges, follow-ups and any automated message. The only emails are email verification and password reset, sent when the person asks.
- Reading old WhatsApp or chat history. Records are typed and approved, not scraped.
- Refunds, waivers, discounts and cancellations inside the app. These are money rulings the app must never make.
- Part-month price maths. A paid month is a whole calendar month.
- Door access from payment. The desk issues the access card. The free plan is app use only.
- A stored history of old card text (prices, timetables). Only the current approved card is kept. Note: this does not apply to paid-until changes, which are audited (see FR-8 and section 8.5).

### Deferred to version two, with the data version one must collect

- Renewal reminders. Needs the paid-until log and the change history that version one records.
- "You have not checked in for two weeks" nudges. Needs the check-in log version one records.
- A gap-filling worklist for the owner. Needs the unanswered-question log version one records.
- Payment retry prompts. Needs the payment-attempt log, including failures, that version one records.
- A stronger presence control for check-in (a rotating or per-session code). Version one uses a light check only.

## 6. Functional Requirements

Requirements are numbered FR-1 onward. Acceptance criteria are written so a tester can mark each pass or fail.

### 6.1 Cross-cutting requirements

**FR-1. Home screen is not an empty chat box.** The first screen shows a cached status strip: plan (Free or Paid), the paid-until date, days trained this month, and balance. A FREE member has no paid-until date, so the strip says the plan is Free and shows no date. Below it are four tappable common questions. A text box is present but optional.
- Money wording on the strip: the balance line reads "Our records show [X] outstanding, as of [date]," or "Our records show nothing outstanding, as of [date]." It is never a bare number and never phrased as a ruling.
- The whole strip carries an "as of [time]" stamp, so a value that is stale from cache reads as stale rather than as current truth.
- Empty state: before the member's first check-in, "days trained this month" reads "Check-in just started. Your training days show here from your first check-in." **ASSUMPTION: this exact copy, because a bare zero on day one reads as broken.**
- Acceptance: with the phone offline, the strip renders from cache, shows the "as of" stamp, and phrases the balance as a dated report. Fail if it is blank, shows a bare balance number, or shows no "as of" stamp.

**FR-2. Every answer shows its source.** A shared-card answer shows the card body underneath and its last-confirmed date. A private-record answer shows the underlying entries and an "as of" date.
- Acceptance: no answer renders without either a card reference or a private-record reference plus a date. Fail if any answer shows text with no source.

**FR-3. Plan gating.** A FREE member never receives PAID content (training plans and trainer guidance). PAID cards are filtered out before retrieval, not after. The member's plan is worked out at the moment of the question from the paid-until date. (Retrieval means the search step that finds a matching card.)
- Acceptance: a FREE member asking a question whose only match is a PAID card receives the no-record handoff, not the PAID card. A member whose paid time ended yesterday is treated as FREE. Fail if any PAID card text reaches a FREE member.

**FR-4. Private records are fetched by exact member ID.** Attendance and balance are read with a database filter on the logged-in member's ID. They are never searched by meaning and never embedded. (Embedding means turning text into numbers for meaning search.)
- Acceptance: a code review confirms no private table is queried without a filter on the member link of the signed-in account. Fail if any private query omits the filter.

**FR-5. Refusal and never-answer list.** The app refuses, in one sentence followed by a named handoff, on: anything about another member, whether the door will open now, refunds, waivers, discounts and cancellations, and staff conduct. It refuses even when a record exists.

Medical and training-plan boundary. The app may repeat what an approved training-plan card states, word for word, with the card shown. It refuses any question that asks it to assess a symptom or advise beyond the card text. Worked examples:
- "What does my plan say about back pain?" is allowed if a training-plan card says it. The app shows the card.
- "My back hurts during deadlifts, what should I do?" is refused as medical, with a handoff, because it asks for advice beyond the card.

- Acceptance (measured, not absolute): a fixed test set of at least forty never-answer questions, covering every listed category plus the two medical examples above, must produce zero leaks before launch. After launch, every miss caught by a wrong-answer report is logged and reviewed weekly. Fail the launch gate if any of the forty leak.

**FR-6. Every question is logged.** The app logs question text, timestamp, member ID, plan, whether an answer was found, which card answered it, whether it was refused and why, whether it handed off, and whether the intent was resolved by the pre-router or the model (see section 7).
- Acceptance: after any question, one QuestionLog row exists with these fields set. Fail if a question produces no log row.

### 6.2 Feature 1: Ask about the gym

**User story.** As a member, I type a question in plain words so I get this gym's answer without waiting for the desk.

**Trigger.** Member taps a common question or types text and submits.

**Flow.**
1. App sends the question to the ask endpoint.
2. The server runs the pre-router (section 7.2). If it confidently labels the question ATTENDANCE or BALANCE, it routes to Feature 2. If it confidently matches a never-answer phrase, it routes to Feature 5. Otherwise it continues.
3. For a gym question, the server embeds the question and runs a plan-filtered similarity search over approved card embeddings, taking the top card.
4. If the top card's similarity is at or above the threshold, the model writes a one or two line answer grounded only in that card. If below, the server routes to Feature 5.
5. The answer renders with the card body and last-confirmed date underneath.

**Inputs.** Question text (max 300 characters), member session, member plan.

**Outputs.** A one or two line answer, the source card, the last-confirmed date.

**Empty state.** No approved cards yet: every gym question hands off to the desk.

**Error state.** Model unreachable, or the model rate limit is hit: the app shows "Cannot reach the answer desk right now" and offers the handoff button. It never shows a half answer.

**Acceptance.**
- A question matching an approved card returns an answer plus that card.
- A question with no matching card returns the handoff, not a guess.
- A FREE member never receives a PAID card (see FR-3).

### 6.3 Feature 2: My records

**User story.** As a member, I ask how many days I trained or whether I owe, so I know my own standing without the desk.

**Trigger.** Member asks an attendance or balance question, or taps the status strip.

**Flow (attendance).**
1. The server confirms the question is an attendance question.
2. The server queries the Attendance table filtered by the signed-in account's member ID for the named month.
3. The server returns the count and the list of actual dates.

**Flow (balance).**
1. The server confirms the question is a balance question.
2. If the member answered Yes to "Already a member at the gym?" and the owner has not yet entered their opening balance, the server returns the honest handoff: "We do not have your balance on record yet. Ask the desk." It never shows a zero in place of missing data. A member who answered No starts with nothing outstanding, so their balance shows at once as a dated report.
3. Otherwise the server reads the member's ledger entries filtered by member ID: the owner-entered opening charge and all recorded payments.
4. The server computes outstanding as total charges minus total payments and returns the figure, the payment list (amount, date, method), and an "as of" date equal to the most recent ledger entry.

**Money wording rule.** The app reports, it does not rule. "Our records show 15,000 naira outstanding for July" is allowed. "You owe 15,000 naira" is not. **ASSUMPTION: outstanding is tracked with a small ledger of charges and payments, because balance must be calculated from an opening balance plus recorded payments and never typed.**

**Inputs.** Member session, month (defaults to current month).

**Outputs.** Attendance count with dates, or outstanding figure with payment list and "as of" date, or the honest handoff when no opening balance is on record.

**Empty state.** No check-ins yet: the day-one copy from FR-1. No opening balance on record: the honest handoff above.

**Error state.** Database unreachable: show the last cached status with its "as of" time and a note that it may be out of date.

**Acceptance.**
- Attendance answer lists the real dates, counted only from this member's own records.
- Balance answer never uses "owe" as a ruling, always shows an "as of" date, and never shows a zero when the opening balance is missing.
- No query returns another member's data (see FR-4).

### 6.4 Feature 3: Check in

**User story.** As a member, I type the code on the desk whiteboard so my visit is recorded and my attendance answers are true.

**Trigger.** Member arrives and opens the check-in screen.

**Only paid members can check in.** A FREE member sees "Check-in is for paid members." and no attendance row is written (D28).

**Flow.**
1. The member reads the four-digit code written on the whiteboard that morning and types it.
2. The server compares it to today's CheckInCode.
3. On match, the server writes one Attendance row for today (one row per member per calendar day, Africa/Lagos), source CODE, unless one already exists for the member today.
4. The screen immediately shows the updated days-trained count, so the reward for checking in is instant and visible.

**What the code is and is not.** The code is a light check that deters casual false check-ins. **It does not prove the member is inside the building.** A daily code written on a whiteboard can be shared, so attendance is a good-faith record, not a verified presence log. A stronger presence control (a rotating or per-session code) is a version-two item, added only if version two ties attendance to something that matters. **ASSUMPTION: staff write the code on the whiteboard and set the same code in the staff screen each morning.**

**Inputs.** Four-digit code, member session.

**Outputs.** Confirmation and the updated count.

**Empty state.** No code set for today: "Check-in is not open yet today. Ask the desk." Handoff offered.

**Error state.** Wrong code: "That code does not match today's code." The member may retry. After five wrong tries in ten minutes, the app asks the member to see the desk. **ASSUMPTION: five tries, to blunt guessing without locking out a fat-fingered member.**

**Acceptance.**
- A correct code writes exactly one Attendance row per member per calendar day. A second correct entry the same day writes no new row.
- The updated count shows on the check-in screen without a page reload.
- A wrong code writes no row.
- A FREE member entering the code writes no row and sees the written explanation.

### 6.5 Feature 4: Pay

**User story.** As a member, I pay for a month of membership, or a balance, in the app so money reaches the gym and I get a receipt.

**Trigger.** Member taps Pay.

**Flow.**
1. The member selects a purpose: RENEWAL (one month of membership, at the monthly price the owner set) or BALANCE (the outstanding figure). Pay is closed until the owner has set the price.
2. The app calls the pay-initiate endpoint with the purpose, a client idempotency key and, for a balance, the amount. For a renewal the server uses the monthly price and ignores any amount from the client. (Idempotency key means a value that makes a repeated tap reuse the same payment instead of starting a second one.)
3. The server creates a PaymentAttempt in status INITIATED, calls the gateway, and returns the gateway checkout link.
4. The member pays on the gateway page.
5. The gateway calls the Spotter webhook. The server verifies the signature, then in one transaction (with the member row locked) checks whether a ledger row or member change already exists for this attempt. If one exists, it acknowledges and does nothing. If the paid amount differs from the attempt's amount, it writes the ledger payment for the amount received with no charge, extends nothing, and marks the attempt NEEDS_REVIEW. Otherwise it marks the attempt SUCCESS. For a renewal it writes a ledger charge and a ledger payment for the month, extends paid-until by one calendar month, and writes one audit row with no author and the attempt. For a balance it writes the ledger payment only.
6. The receipt appears once the webhook confirms. After a first payment the app says the desk will issue the access card. Paying does not open the gym door.

**Webhook is the only source of truth.** The app never marks a payment done because the phone showed a success screen.

**Webhook idempotency.** Gateways can send the same webhook more than once. The handler is idempotent on the gateway reference: a second webhook for a reference that already has a ledger row is acknowledged and ignored, so no double ledger entry is possible.

**Idempotency on repeat taps.** If the member taps Pay again while a PaymentAttempt for the same amount and purpose is still INITIATED or PENDING, the server returns the existing attempt, not a new one.

**Network loss mid payment.** The PaymentAttempt stays PENDING. When the member returns, the app calls the verify endpoint with the attempt reference. A member who has had paid time before keeps paid access for twenty four hours while the gateway confirms, so a pending payment does not lapse their paid access. A member who has never had paid time gets no hold. The hold is worked out at access-check time and writes nothing.

**A membership payment extends paid time.** A RENEWAL payment makes the member PAID for one more calendar month, counted from the later of today and the current paid-until, in the same transaction as its ledger entries. A BALANCE payment settles money only. The owner's own cash or transfer entry for membership does the same as the webhook (FR-9).

**Inputs.** Purpose (RENEWAL or BALANCE), amount (balance only), idempotency key, member session.

**Outputs.** Gateway checkout link, then a confirmed receipt.

**Empty state.** Nothing outstanding: the Pay button offers one month of membership. No price set yet: "Payments are not open yet."

**Error state.** Gateway unreachable at initiate: "Cannot start payment right now, try again shortly." No attempt is left half-written.

**Acceptance.**
- No card Payment ledger row exists without a verified webhook.
- A verified renewal webhook writes the charge, the payment, the one-month extension and the audit row together or not at all. A balance payment never changes paid time.
- A webhook whose amount does not match writes the payment to the ledger with no charge, extends nothing, and marks the attempt for the owner to review.
- Two payments arriving at once both add their month.
- Two fast taps produce one PaymentAttempt, not two.
- Two identical webhooks for one reference produce one ledger row, not two.
- A member who loses network mid payment sees PENDING, keeps access for twenty four hours, and sees a receipt only after the webhook.
- The app never stores a wallet balance.

### 6.6 Feature 5: Ask the desk (handoff)

**User story.** As a member, when the app has no answer I get sent to a named person, not a dead end.

**Trigger.** No matching card, similarity below threshold, a never-answer question, or the model being unreachable or rate-limited.

**Flow.**
1. The server names the staff member on duty.
2. The app shows one sentence: "We do not have that in the gym's records. Message [staff name] at the desk."
3. Tapping opens WhatsApp with the member's question already typed in.
4. The handoff is logged on the QuestionLog.

**On-duty name.** **ASSUMPTION: the current on-duty staff is the single active Duty row (see section 8.5), because two staff share the desk one at a time and the named fallback must match whoever is there now.**

**Inputs.** The member's question, the on-duty staff record.

**Outputs.** A one-line message and a pre-filled WhatsApp deep link.

**Empty state.** No on-duty staff set: the app names the owner as fallback.

**Error state.** WhatsApp not installed: the app shows the staff phone number to call or message.

**Acceptance.**
- Every handoff names a real person and logs the event.
- The app never fills the gap with general knowledge.

### 6.7 Owner screens (input, not features)

**FR-7. Approve or reject drafted cards.** The owner sees each drafted card version and approves or rejects it. No card reaches a member until approved. Approval stamps the approver and a last-confirmed date. Approval and embedding are one unit: if the embedding step fails, approval does not complete (see section 9.5).
- Acceptance: an unapproved card never appears in member retrieval. An APPROVED card always has a matching embedding. Fail if a draft is retrievable, or if an APPROVED card has no embedding.

**FR-8. Maintain the member list.** Members make themselves by signing up. The owner opens a member to: confirm in person who the account belongs to, enter an existing member's opening balance and set their paid-until date, change the member's existing-member answer, add a charge at any time, and change the paid-until date. Staff can read the list but cannot change these. Every change to paid-until, the existing-member answer or the access card writes a MemberChange audit row (old value, new value, field, author, timestamp). The screen shows name, email, phone and possible duplicates by name and phone, and the owner must confirm identity before saving an opening balance.
- Acceptance: an opening balance entry writes a ledger charge with the owner as author and a note, and sets the opening-balance flag in the same transaction. A paid-until, existing-member-answer or access-card change writes a MemberChange row. Fail if a balance can be typed directly onto a member, if the flag is set anywhere else except for a No answer at verification, or if a change leaves no audit row.

**FR-9. Enter cash and transfer payments.** The owner records a cash or transfer payment with amount, date, method, member and purpose. The typist is recorded. A payment for membership uses the same mechanism as the webhook: in one transaction it writes the charge, the payment and the one-month extension, audited with the owner as author. A payment for a balance writes the payment only and does not extend paid time. In-app card payments cannot be edited here. Same-day entry is required so the balance answer stays honest (see section 2).
- Acceptance: a cash entry writes a ledger payment with the recorder's ID. A membership entry also writes the charge, the extension and the audit row in one transaction. A card payment row is read-only on this screen.

**FR-10. Weekly review page.** The owner reads wrong-answer reports and unanswered questions for the week.
- Acceptance: the page lists every WrongAnswerReport and every QuestionLog with answerFound false for the last seven days.

**FR-21. Set the monthly price.** The owner sets the price of one month in whole naira, in one setting the app reads. It is never taken from card text. Until it is set, Pay is closed.
- Acceptance: with no price set, no payment attempt can be created. The amount of a renewal always equals the setting.

### 6.8 Staff screens (input, not features)

**FR-11. Draft and edit cards.** Staff create and edit card versions for owner approval. A staff edit never goes live on its own.
- Acceptance: a staff-saved card is status DRAFT until the owner approves.

**FR-12. Set the daily check-in code.** Staff set today's four-digit code once per day.
- Acceptance: one active CheckInCode exists per day. A second set replaces the value and logs the change.

**FR-13. (Removed.)** Staff no longer create members. A member is created by the system when a person verifies their email, with a generated membership ID in the form SPT- plus four characters, unique and permanent, retried on a collision.
- Acceptance: every member created by verification gets a unique ID in the right format. A collision is retried, never saved twice. An ID cannot be edited or reused.

**FR-14. Record a manual check-in.** Staff record a check-in for a member whose phone is dead. The entry is marked source MANUAL with the staff ID, one row per member per calendar day.
- Acceptance: a manual check-in writes an Attendance row with source MANUAL and a staff author, and does not create a second row if one exists for that day.

**FR-15. Access cards.** Staff and the owner see every member who is PAID today and has no access card recorded, and mark a card issued. They can un-mark one. Each change is audited with who and when. Paying never changes the card record. The desk issues the card.
- Acceptance: the list shows exactly the members who are PAID today and have no card. Marking and un-marking each write an audit row.

### 6.9 Account screens (not features)

**FR-16. Landing.** A person who is not signed in sees what Spotter is, a Create account button, and a Log in button.
- Acceptance: the landing page loads with no data calls and no images beyond the logo.

**FR-17. Sign up.** Name, email, phone, and one question: "Already a member at the gym?" Sign-up collects no password. The phone is stored as international digits only. The account is created unverified, with no password and no member. Signing up with an unverified account's email updates its details and sends a fresh link, within the limit in FR-18. Signing up with an active account's email changes nothing. The response is the same in every case. Each sign-up also deletes unverified accounts older than 2 months.
- Acceptance: a new email, an unverified email and an active email return the same message. An active account is never changed by a sign-up. No sign-up sets or replaces a password.

**FR-18. Verify email and set a password.** One email with a single-use link that expires after 24 hours. The link opens a page that shows the details given at sign-up, name, phone and answer, for the person to check or correct, and asks them to set a password of at least 8 characters. Submitting it, in one transaction, uses the link, sets the password, makes the account active, creates the member with its membership ID from the details as corrected, and links them. Someone who answered No starts with nothing outstanding and their balance shows at once. A verification email is sent at most 3 times per email address per hour, with the same confirmation either way.
- Acceptance: a used or expired link changes nothing and shows nothing about the account. Using a link twice creates one member and cannot set the password again. An account's first password can only be set by using its verification link. A wrong password or detail leaves the link unused. The app sends no email other than this one and the reset email, and a fourth request in an hour sends nothing.

**FR-19. Log in and password reset.** Log in with email and password. Five wrong tries in ten minutes pause that email for ten minutes. Forgot password sends, for an active account, one single-use link that expires after one hour, and the confirmation message is the same whether or not the account exists. A new password ends every other session.
- Acceptance: an unknown email and a wrong password show the same error. A reset link works once.

**FR-20. Check your email.** After sign up the person sees one message asking them to check their email, with a form to ask for a fresh link. An account that has not verified has no password and cannot sign in.
- Acceptance: an unverified account has no session and reaches no card, no private record, no check-in and no payment.

## 7. AI and AI Related Tools and Solutions

### 7.1 Models, configuration and free-tier limits

- **Language model: Google Gemini 2.0 Flash**, called through Google AI Studio. It writes the one or two line answer from a retrieved card, and classifies intent only when the pre-router is unsure. **The model must be called in a no-training configuration**, meaning a paid tier or a data-processing setting where submitted text is not used to improve the provider's products. Member question text can contain personal detail, so it must not train a third party's models. If a no-training free configuration is not available, the PRD's cost section treats the paid data-processing tier as the baseline, not the training-on free tier.
- **Embedding model: Google text-embedding-004**, 768 dimensions, same key and same no-training configuration. It turns each approved card and each incoming gym question into a 768-number vector for meaning search.
- **Question text reaches Google only when the pre-router cannot resolve it.** Every question reaches the gym's own server and is logged there. The PRD states plainly: when the pre-router cannot resolve a question, its text is sent to Google under a no-training configuration to classify or answer it. This is disclosed to the member in the app's privacy note.

### 7.2 Pre-router (server-side, added to cut calls and keep common text from the model provider)

Before any model call, a small keyword and pattern router runs on the server:
- Obvious attendance phrases ("how many days," "did I train," "attendance") route to Feature 2 without a model call.
- Obvious balance phrases ("do I owe," "my balance," "outstanding") route to Feature 2 without a model call.
- Obvious never-answer phrases (another member's name pattern, "refund," "cancel," "discount," "the door," symptom words) route to Feature 5 without a model call.
- Anything the router is not confident about goes to the model classifier, then the shared-card flow.

This keeps the common private and refusal cases away from the model provider, ships no router code to the phone, keeps one list in one place to audit, and reduces model calls.

### 7.3 Name-stripping before any model call

Before question text is sent to the model, the server removes or masks obvious personal-name patterns and long digit strings. A question like "does Chidinma Okafor owe" is reduced to the intent, not the identity. This lowers the chance of shipping a member's name to a third party even under the no-training configuration.

### 7.4 Retrieval flow for a shared-card question

1. The question passes the pre-router without a confident match.
2. The model classifier labels it SHARED, ATTENDANCE, BALANCE, REFUSE, or OTHER.
3. For SHARED, the server embeds the question with text-embedding-004.
4. The server runs a plan-filtered similarity search over CardEmbedding.
5. It takes the single closest card. At or above 0.72 similarity, it passes that one card to the model with the grounding prompt. Below 0.72, it hands off. **ASSUMPTION: 0.72 cosine similarity, tunable after testing.**
6. The model answers from that card only. The app shows the card and its last-confirmed date.

### 7.5 Retrieval flow for a private-record question

1. The pre-router or the classifier labels the question ATTENDANCE or BALANCE.
2. **The server skips retrieval and the vector store entirely.** It queries the Attendance table or the ledger with a filter on the signed-in account's member ID.
3. The server fills a fixed answer template with the numbers from the database. The model never writes private-record numbers, so it cannot invent them.
4. The app shows the underlying entries and an "as of" date.

Private records are read by member ID with a database filter and nothing else.

### 7.6 System prompt (answer generation)

```text
You are Spotter, the answer desk for this one gym. You answer only from the
CARD given to you in this request. You never use outside or general knowledge.

You receive:
- MEMBER_TIER: the member's plan, FREE or PAID.
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

### 7.7 Grounding, refusal and low-confidence rules

- **Grounding.** The model sees one card and is told to use only that card. The app renders the same card underneath. Temperature is 0.
- **Refusal, two guards.** The pre-router catches obvious never-answer phrases first. The model prompt refuses as a second guard. The training-plan boundary in rule 3 lets a plan card be read back without becoming medical advice.
- **Low confidence.** Below 0.72 similarity, the app does not call the model for an answer; it hands off. A `NO_RECORD` or `REFUSE` string also routes to handoff.

### 7.8 Rate limits, token and cost estimate

- The real ceiling is the per-minute request cap, not the daily total. A busy evening after a timetable change can cluster calls. The server uses backoff on the model call, and when the per-minute cap is hit it falls back to the handoff rather than making the member wait.
- Per gym question needing the model: a classifier call (about 65 tokens) plus an answer call (about 450 input, 60 output). Private and obvious-refusal questions resolved by the pre-router use no model call at all.
- Expected volume: about 8 gym questions per member per month, near 110 model-answered questions a day at four hundred members, which sits under the daily ceiling. The per-minute cap is handled by backoff and handoff.
- Money cost: on the no-training configuration, state the per-call price in the cost section and confirm it before launch (see open question 2). Do not assume a training-on free tier.

## 8. Technical Architecture with a Prisma Data Model

### 8.1 System diagram in text

```text
[Member Android browser, app saved to home screen, service worker cache]
        |  HTTPS
        v
[Next.js App Router on Vercel free tier]
   - route handlers and server actions
   - session check on every request
   - pre-router -> model only if unsure
        |                         |
        | SHARED path             | ATTENDANCE / BALANCE path
        v                         v
[Google AI Studio, no-training]  [PostgreSQL on Neon]
  embed + generate                 - private tables, member-ID filtered
        |                          - pgvector table for card embeddings
        v                              ^
[pgvector similarity search] ----------+
        |
        v
[Answer + source card] -> back to browser

[Flutterwave] -- webhook (idempotent on reference) --> [Next.js webhook route] --> [Payment ledger]
[Next.js auth routes] --> [Resend] --> verification and reset emails only
[Owner / Staff admin screens] --> [Next.js admin routes] --> [Postgres]
```

### 8.2 Request flow from browser to answer

1. The browser sends the question with the session cookie.
2. The server verifies the session, loads the account, and confirms it is active with a member. It reads the member ID from the account's member link and works out the member's plan from the paid-until date. An unverified account stops here.
3. The pre-router runs on the server; the model classifier runs only if the router is unsure.
4. The server branches to shared retrieval or a private query.
5. The server returns the answer and source, and writes a QuestionLog row.

### 8.3 Auth: self sign-up with automatic membership

- Anyone can sign up with name, email, phone and the answer to "Already a member at the gym?". The account starts unverified, with no password and no member.
- The person opens the single-use emailed link, checks their details and sets their password. In one transaction the system makes the account active and creates the member with a generated permanent membership ID such as SPT-7K4Q from 31 unambiguous characters, and links them. There is no desk linking.
- Signing up again with an unverified account's email updates its details and sends a fresh link. An active account is never touched. Unverified accounts older than 2 months are deleted when a new sign-up is written.
- Log in is email plus password. Passwords are stored only as argon2 hashes.
- Password reset is by a single-use emailed link. Verification and reset emails are each limited to 3 per address per hour.
- The session is a signed httpOnly cookie carrying the account ID. The server reads the member link fresh on every request.
- Emails go through Resend and are limited to verification and reset. There is no SMS.
- Full rules live in .agent/rules/auth.md.

### 8.4 Caching, offline and cold start

- The app is a Progressive Web App. A service worker caches the app shell and the last status payload.
- The status strip renders from cache with an "as of" time when offline.
- Check-in, pay and questions need the network. Offline, these show a short "you are offline" state.
- The Neon free database sleeps after inactivity, so the first request after a quiet spell has a cold-start delay of a few seconds. On a poor connection this is felt. The app shows a brief loading state rather than a dead screen, and the cached status strip fills the wait.

### 8.5 Prisma schema

The schema lives only in .agent/rules/data-model-schema.md.

### 8.6 Data model summary

| Model | Kind | Read rule |
|---|---|---|
| Account | Private | The signed-in account only; its member link is set by the system at verification |
| EmailToken | Private | Hashed, single use, by token only |
| Member | Private | By the member ID on the signed-in, verified account only. Holds paid-until, not a stored plan |
| MemberChange | Audit | Admin only, tracks paid-until, existing-member answer and access card changes, by a person or by a verified payment |
| Attendance | Private | By member ID only, one per calendar day |
| LedgerEntry | Private | By member ID only |
| PaymentAttempt | Private | By member ID only |
| QuestionLog | Private | By member ID only |
| WrongAnswerReport | Private | By member ID only |
| Card / CardVersion | Shared | Approved only, plan gated |
| CardEmbedding | Shared | Approved only, plan gated, no private data |
| CheckInCode | Shared operational | Today's code |
| Staff / Duty | Staff | Admin only, one active duty row |
| AppSetting | Settings | Owner-edited, read by the app. Holds the monthly price |

### 8.7 Row-level access rules and where they are enforced

- Every private read runs inside a server route or server action that first loads the signed-in account, confirms it is active with a member, and filters on its member link. There is no client-side database access.
- Card reads for members always add `status = APPROVED` and `minTier` within the plans the member is allowed, worked out by the one plan function.
- Admin routes check the Staff session and role before any write. Paid-until, existing-member answer and access card changes also insert a MemberChange row in the same transaction.
- The webhook route verifies the signature and is idempotent on the gateway reference.
- The vector search query always carries the plan filter and only ever selects from CardEmbedding.
- **ASSUMPTION: access is enforced in the application layer, not with Postgres row-level security, while a single app owns all database access; if direct database access is ever added, add row-level security then.**

## 9. Vector Database Architecture and Design

### 9.1 Vector store and justification

The vector store is **pgvector**, the vector extension inside the same PostgreSQL database on Neon. It lives inside the locked PostgreSQL, so there is no extra service and no data copied out of Postgres. The stack stays as locked: Next.js, TypeScript, Prisma, PostgreSQL, with pgvector as a Postgres extension.

### 9.2 What is embedded and what is never embedded

- Embedded: the title and body of each approved CardVersion, one vector per approved version.
- Never embedded: every private record. No attendance, no balance, no ledger, no member detail, no question log. The index holds shared cards and nothing else.

### 9.3 Chunking for short cards

Cards are short. Each approved card is embedded whole as one chunk. **ASSUMPTION: if any single card exceeds about 400 words, split it into two cards at edit time rather than chunk it silently, because the member should always see the whole source card.**

### 9.4 Plan filtering: before the search

Filtering happens before the similarity search, as a SQL `WHERE` on `minTier`. A FREE member's query only compares against FREE cards. Pre-filtering is chosen over post-filtering because a PAID card must never be a candidate for a FREE member. With dozens of cards, the search is exact nearest-neighbour, so pre-filtering costs nothing in speed.

### 9.5 Reindexing, made atomic

- Card approval and embedding are one unit. On approval, the server computes the embedding and inserts one CardEmbedding row in the same transaction. If the embedding call fails, approval does not complete and the card stays DRAFT with an error shown to the owner.
- On a new approved version of the same card, the server inserts the new embedding and deletes the previous version's embedding.
- On reject or revoke, the server deletes that version's embedding at once.
- A reconciliation check runs on a schedule and on server start: it finds any APPROVED CardVersion with no matching CardEmbedding and repairs it, so a card can never be silently unsearchable.

### 9.6 Similarity threshold

Similarity is cosine similarity, one minus cosine distance. At or above 0.72, the app answers from the card. Below, it hands off and logs the question as unanswered. The 0.72 value is tunable after real questions arrive.

### 9.7 The blunt paragraph

No private record ever enters this index. The vector store holds only approved shared cards. Attendance, balance, ledger entries, payment records, question logs and member details are read by exact member ID with a database filter and are never embedded, never inserted into pgvector, and never compared by meaning. If a feature ever seems to need a private record in the index, that feature is wrong and stops here.

## 10. Vector Database Model

### 10.1 Storage

The vectors live in the `CardEmbedding` table. Prisma has no native vector type, so the column is `Unsupported("vector(768)")`. Prisma can create, migrate and read the row's other fields, but similarity ordering runs through a raw SQL query, because Prisma cannot order by the vector distance operator.

### 10.2 Field list

| Field | Type | Notes |
|---|---|---|
| id | text | Primary key |
| cardId | text | The logical card |
| cardVersionId | text | Unique. The exact approved version embedded |
| category | enum CardCategory | One of the eight card categories |
| minTier | enum Tier | FREE or PAID. The plan filter key |
| embedding | vector(768) | 768 numbers from text-embedding-004 |
| createdAt | timestamp | When embedded |

Metadata: `category` is one of the eight card categories. `minTier` is FREE or PAID. The free cards are timetable, prices, rules, access hours, guest policy, and pause or cancellation. Training plans and trainer guidance are PAID.

### 10.3 Index type and parameters

At dozens of cards, exact search is used and no approximate index is required. The distance operator is cosine distance `<=>`.

Future footnote (not a version-one action): if card volume ever grows into the thousands, do not reach for a bare IVFFlat with a tier `WHERE` and `LIMIT 1`, because an approximate index combined with a pre-filter and a tiny result count can drop the true nearest card. The safer direction at that scale is HNSW with a post-filter, or a per-tier partitioned index. This never triggers at gym scale.

### 10.4 Example insert

```sql
INSERT INTO "CardEmbedding" (id, "cardId", "cardVersionId", category, "minTier", embedding, "createdAt")
VALUES (
  'emb_123',
  'card_saturday',
  'cardver_saturday_v3',
  'TIMETABLE',
  'FREE',
  '[0.0123, -0.0456, 0.0789, ...]',  -- 768 numbers from text-embedding-004
  now()
);
```

### 10.5 Example query with the tier filter applied

For a FREE member, the allowed tiers array is `{FREE}`. For a PAID member it is `{FREE,PAID}`.

```sql
SELECT
  ce.id,
  cv.title,
  cv.body,
  cv."lastConfirmedAt",
  1 - (ce.embedding <=> $1::vector) AS similarity
FROM "CardEmbedding" ce
JOIN "CardVersion" cv ON cv.id = ce."cardVersionId"
WHERE ce."minTier" = ANY($2)          -- tier pre-filter, before the search
  AND cv.status = 'APPROVED'
ORDER BY ce.embedding <=> $1::vector   -- cosine distance, closest first
LIMIT 1;
```

The application then checks that `similarity >= 0.72`. If not, it hands off.

## 11. Business Model

### 11.1 Who pays and how much

- The member pays the monthly price the owner sets in the app (open question 12), now through the app. Examples below that use 15,000 naira are illustrations only.
- Who bears the gateway fee is an open decision, not settled here (see open question 3). The gym may absorb it or pass it to the member from the Flutterwave dashboard. The PRD does not promise a zero member-side fee, because that decision is not yet made.
- The gym pays nothing for the software tools in version one, except the model's no-training configuration cost if the free tier cannot be used without training on inputs (see section 7 and open question 2).

### 11.2 Gateway fee in naira

On a 15,000 naira renewal by a Nigerian local card, the Flutterwave fee is 2 percent, which is 300 naira (1.4 percent transaction plus 0.6 percent platform), capped at 2,000 naira per transaction. On top sit 7.5 percent VAT on the fee, about 22 naira, and a 50 naira stamp duty on card payments above 10,000 naira. The all-in deduction is about 372 naira. Flutterwave does not waive the fee on small transactions.

### 11.3 Monthly running cost at four hundred members

| Item | Cost basis | When it starts to cost |
|---|---|---|
| Hosting (Vercel Hobby) | Free | Above free bandwidth and function limits, beyond this size |
| Database (Neon) | Free tier, about 0.5 GB, sleeps when idle | Above 0.5 GB, or the cold-start delay on the first request after idle |
| Vector store (pgvector) | Free, inside Neon | Same as the database |
| AI model (no-training config) | Per-call, confirm before launch | Every model-answered question; the pre-router cuts this |
| Payment gateway (Flutterwave) | Per live transaction | About 372 naira all-in on a 15,000 naira renewal |
| Email (Resend) | Free plan: 3,000 emails a month, 100 a day, one verified domain | A day with more than 100 verification and reset emails (each address is limited to 3 an hour) |

Realistic monthly gateway cost. If most of four hundred members renew by card at 15,000 naira, that is up to six million naira processed a month. At about 2 percent all-in, roughly 120,000 naira a month leaves the gym in fees. This is the honest figure the gym weighs when deciding whether to absorb the fee or pass it on. It is not a rounding error, and it is why the fee-bearer is an open decision, not a footnote.

Model cost. With the pre-router resolving the common private and refusal cases on the server without a model call, only genuine gym questions reach the model. On a no-training configuration this is a small per-call cost, confirmed before launch, not zero.

### 11.4 Break-even

There is no fixed monthly software cost to recover, so the software breaks even from the first day. The money leaving the gym is the gateway fee and the per-call model cost, both small per unit, both shown above so the gym can see the true deduction.

## 12. Success Metrics

Five metrics, each measured from the logs version one collects.

| Metric | Exact definition | How measured | Baseline | Target |
|---|---|---|---|---|
| Answer quality | Self-serve answer rate paired with wrong-answer-report rate | answerFound true over all QuestionLog, alongside WrongAnswerReport count over answered questions | Desk-tally baseline from 3.1; 0 in-app | 70 percent answered AND under 5 percent of answers reported wrong, by week six |
| Private-record answers | Attendance and balance questions answered in-app per week, with their wrong-answer rate | QuestionLog with attendance or balance intent and answerFound true, plus reports | 0 | 200 per week at under 5 percent reported wrong |
| Check-in adoption | PAID members with at least one app check-in in the last seven days over PAID members. FREE members cannot check in | Distinct memberId in Attendance source CODE in seven days, over members whose paid-until is today or later | 0 | 60 percent by week six |
| Payment success rate | SUCCESS over SUCCESS plus FAILED, excluding ABANDONED and NEEDS_REVIEW. NEEDS_REVIEW attempts are counted and reported separately for the owner | PaymentAttempt statuses | Not tracked today | 90 percent |
| Stop-building signal | Answer quality and the answer-active share after six weeks | The logs above | Not applicable | Stop if self-serve answer rate is under 30 percent, OR answer-active members are under 15 percent of verified members (FREE and PAID) |

Definitions that matter:
- "Active" for the stop-building signal means a member who asked a question or made a payment in the week. A check-in tap alone does not count as active, so a healthy turnstile cannot hide a dead answer product.
- "Member" in every metric means a person with a verified account and a member record, whether FREE or PAID. Metrics that depend on the plan say so. A person who has not verified their email is not a member and is not counted.
- "Answered" is not the same as "correct." That is why answer quality pairs the answered rate with the wrong-answer-report rate. A confidently wrong answer from a stale card lowers quality, it does not raise it.

## 13. Risks

Six risks, ordered by severity, worst first.

| Rank | Risk | Why it is severe | Early warning signal | Mitigation built into the requirements |
|---|---|---|---|---|
| 1 | Wrong money answer | Hits money and trust together, can start a dispute at the desk | Wrong-answer reports on balance questions in the weekly review | FR-1 and FR-2 report, never rule, always show an "as of" date; balance calculated from a ledger, never typed; no balance shown until the opening balance is verified (FR-8 flag); same-day cash and transfer entry (FR-9) |
| 2 | Check-in non-adoption | If members do not check in, attendance stays empty and Feature 2 plus half the value never switch on. This is the product's main behavioural bet | Check-in adoption below target in the weekly numbers | Feature 3 gives an instant training-count reward; the redefined stop-building signal catches it early; version two adds nudges built on this data |
| 3 | Member question text leaks to a third party | Sending names and personal detail to a training-on model breaks the privacy spine | Any question text found in a provider's training logs; a privacy review | No-training model configuration (7.1); server-side pre-router keeps common cases away from the provider (7.2); name-stripping before any model call (7.3) |
| 4 | Half-finished or double-fired payment | A dropped connection or a repeat webhook can leave money unconfirmed or double-counted | PaymentAttempt rows stuck in PENDING; duplicate ledger attempts | Webhook is the only source of truth; idempotent on the gateway reference; idempotency key on repeat taps; PENDING state; 24-hour access hold |
| 5 | The owner matches an existing member to the wrong account | One member's balance, plan or attendance shown to another person, now that the desk no longer links accounts | Wrong-answer or complaint reports from a newly set-up member | The owner's screen shows name, email, phone and possible duplicates, and requires an in-person identity confirmation before an opening balance is saved; one account per member; every entry audited with its author (FR-8) |
| 6 | Wrong starting data, including a wrong No | A mistyped opening balance or paid-until, or an existing member who answers No and sees nothing outstanding, gives confident wrong answers from day one | Wrong-answer reports clustered on newly signed-up members | A Yes answer shows no balance until the owner enters it; the owner sees every member's answer and can change it and add charges at any time, audited; no balance shown until set; paid-until and answer changes audited |
| 7 | The webhook writes money and paid time | A forged, replayed, mismatched or half-written webhook could give free months or double an extension | Attempts in NEEDS_REVIEW; paid-until changes with no matching payment | Signature checked first; idempotent on the attempt; amount must match; one transaction with the member row locked; one audit row per attempt; the arithmetic exists once (FR-9, section 6.5) |
| 8 | Verification emails used up | Free email plan allows 100 a day, so one person could block real sign-ups | Verification emails not arriving | Limit of 3 verification emails per address per hour, counted whether or not an account exists |
| 9 | Starting a payment to get paid cards | A free member could start payments to get the 24-hour hold | PAID cards served to members with no paid time | The hold applies only to members who have had paid time before |

## 14. Open Questions

Each question needs information only the founder has. Each lists why it blocks work and what was assumed so the document could be finished.

1. **Does the guest policy have a number that must be counted, such as two guests a month?** Blocks whether Feature 1 needs a per-member guest-visit count. Assumed: a flat rule with no count, so no guest-visit record exists in version one. If it has a number, add a GuestVisit private model fetched by member ID.
2. **Is a no-training configuration of Google's models available on the free tier, and what is the per-call price if not?** Blocks the cost claim and the privacy claim in section 7. Assumed: a no-training configuration is used even if it is a paid data-processing tier, and question text is never sent to a tier that trains on inputs. The real constraint is the per-minute rate cap and the training-on-inputs behaviour, not the daily total. Confirm both before launch.
3. **Should the gym absorb or pass on the roughly 372 naira gateway fee?** Blocks the final member-facing renewal price and section 11.1. Assumed open, not settled. The realistic monthly figure (around 120,000 naira at full card uptake) is shown so the founder can decide.
4. **How is the on-duty staff member chosen through the day?** Blocks the named handoff. Assumed: staff set the single active Duty row from the staff screen; a partial unique index enforces one active row.
5. **Does an owner member list already exist to import, or does every existing member sign up themselves?** Blocks setup time and the wrong-starting-data risk. Decided: existing members sign up and say Yes. No balance is shown until the owner enters their opening balance and confirms who they are; until then the balance path returns the honest handoff, not a zero.
6. **What time zone and currency rounding apply?** Blocks month boundaries and figure display. Assumed: Africa/Lagos time and whole naira with no kobo. Attendance uniqueness is per calendar day in Africa/Lagos.
7. **How long are question logs and private records kept?** Blocks a retention rule before real member data goes in. Assumed: kept through version one for the version-two build, with a retention decision before wider rollout.
8. **What can an unverified account see?** Decided: nothing but the verify screen, a resend button and sign out.
9. **How do staff and the owner sign in?** Resolved by D25: email and password, the owner creates staff accounts, and they use the same hashing and reset link as members.
10. **Which domain sends the account emails?** Blocks launch, because Resend's free plan needs one verified domain.
11. **Are the link lifetimes right?** Assumed: 24 hours for email verification, one hour for password reset.
12. **What is the monthly price?** Open (D27). Blocks Pay. The owner sets it in the app. No default is assumed.
13. **What does a webhook amount mismatch write to the ledger?** Resolved by D33: the payment, for the amount received, with no charge and no paid time. The attempt is marked NEEDS_REVIEW for the owner.
14. **Is the unverified account cleanup 2 months or 7 days?** Resolved: 2 months (D37, confirmed).

## All assumptions in this document

1. Day-one attendance copy reads "Check-in just started..." rather than a bare zero.
2. Outstanding balance is a small ledger of charges and payments, calculated and never typed.
3. Staff write the daily check-in code on the whiteboard and set the same code in the staff screen.
4. Five wrong check-in tries in ten minutes before the app sends the member to the desk.
5. The current on-duty staff is the single active Duty row, enforced by a partial unique index.
6. Passwords use argon2 hashing, at least 8 characters with no character-type rules, and the session is a signed httpOnly cookie carrying the account ID.
7. The 0.72 cosine similarity threshold, tunable after testing.
8. A no-training model configuration is used; question text never trains a third party. The per-minute cap is the real ceiling, handled by backoff and handoff.
9. Access is enforced in the application layer, not with Postgres row-level security, while a single app owns all database access.
10. Any card over about 400 words is split into two cards at edit time rather than chunked silently.
11. Who bears the roughly 372 naira Flutterwave fee is an open decision, not a promise of a zero member-side fee.
12. Africa/Lagos time zone, whole-naira money, and attendance uniqueness per calendar day.
13. Question logs and private records are kept through version one, with a retention decision before wider rollout.
14. Check-in adoption is unproven and is the product's main behavioural bet, not a stated fact.
15. A membership payment extends paid time by one calendar month on a verified webhook or the owner's own entry, never otherwise. The plan is worked out from the paid-until date, not stored.
16. The Neon free database sleeps when idle, so the first request after a quiet spell has a cold-start delay.
17. An unverified account has no password and cannot sign in. A verified account has a member. A password is set only by using a verification or reset link.
18. Email verification links last 24 hours and reset links last one hour.
19. Five wrong passwords in ten minutes pause that email for ten minutes.
20. Verification and reset emails are each limited to 3 per address per hour, to stay under Resend's free daily limit.
21. FREE means app use only: no gym membership and no door access. FREE members cannot check in (D26, D28).
22. A paid month is a whole calendar month, clamped to the end of the month (D34).
23. The 24-hour hold applies only to members who have had paid time before (D29).
24. Unverified accounts older than 2 months are deleted when a new sign-up is written (D37).