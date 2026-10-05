---
trigger: glob
globs: src/server/retrieval/**
---

# retrieval.md

One job: finding the right shared card, and keeping the index honest.

Read ai.md for what happens to the card after it is found. Read privacy.md for what may never be embedded and for name-stripping.

## Only approved shared cards are embedded

One embedding per approved card version. The embedded text is the card title and body.

Reason: an unapproved card must not be findable. The owner's approval is the gate.

## Cards are embedded whole

Each card is one chunk. Do not split a card across several embeddings.

If a card exceeds about 400 words, do not chunk it. Tell the owner to split it into two cards at edit time.

Reason: the member is shown the whole source card under the answer. A half card under an answer is not a source the member can check.

## What is embedded on the question side

Embed the member's question text after name-stripping, and nothing else. Do not prepend the tier, the member ID, a date, or an instruction to the text being embedded.

Reason: anything added to the text moves the vector and changes which card wins, for reasons nobody can trace later.

## The tier filter runs before the similarity search

The query carries a SQL WHERE on the card's minimum tier, restricting to the tiers the member is allowed, and that filter is part of the same query as the distance ordering. Do not search first and filter the results afterwards.

Reason: a Premium card must never be a candidate for a Basic member, not even for the moment between search and filter. Pre-filtering also costs nothing at this card count, because the search is exact.

## Take one card, then check the gate

Order by cosine distance, take the single closest allowed card, then check its similarity against the threshold.

Threshold: similarity at or above 0.72 passes. Similarity is one minus cosine distance.

Three outcomes, only three:

- At or above the threshold: pass that one card to the model.
- Below the threshold: hand off. Do not call the model for an answer.
- Zero rows returned, because no approved card matches the member's tiers or the index is empty: hand off, exactly as for below threshold.

The 0.72 value is tunable once real questions arrive. Change it here, in one place, not in the calling code.

Reason: the threshold is what stops a weak match becoming a confident wrong answer. The zero-row case is the normal state on day one, before any card is approved, so it needs a stated path rather than a guess.

## The query

Prisma cannot order by the vector distance operator, so this runs as a raw query. Keep it in one module so there is one place to audit.

```sql
SELECT
  ce.id,
  cv.title,
  cv.body,
  cv."lastConfirmedAt",
  1 - (ce.embedding <=> $1::vector) AS similarity
FROM "CardEmbedding" ce
JOIN "CardVersion" cv ON cv.id = ce."cardVersionId"
WHERE ce."minTier" = ANY($2)
  AND cv.status = 'APPROVED'
ORDER BY ce.embedding <=> $1::vector
LIMIT 1;
```

Parameter one is the question embedding. Parameter two is the allowed tier array: BASIC only for a Basic member, BASIC and PREMIUM for a Premium member.

## Approval and embedding are one atomic step

On approval, compute the embedding and insert the embedding row in the same transaction as the approval. If the embedding call fails, the approval does not complete and the card stays in draft with an error shown to the owner.

Reason: an approved card with no embedding is invisible to search. Every question it should answer would hand off instead, and nobody would know why.

## Reindexing on change

- A new approved version: insert the new embedding and delete the previous version's embedding.
- A rejected or revoked card: delete its embedding immediately.

Reason: only the live version may be searchable. A revoked card that stays in the index can still be quoted to a member.

## Reconciliation check

A check runs on a schedule and on server start. It finds any approved card version with no matching embedding row and repairs it.

Reason: the atomic step covers the normal path. This catches anything that slipped through, so a card can never be silently unsearchable.

## Index type

At dozens of cards, use exact search. No approximate index is needed. The distance operator is cosine distance.

Future note, not a version one action: if cards ever reach the thousands, do not add a bare IVFFlat index alongside the tier filter and a single-row limit. An approximate index combined with a pre-filter and a tiny result set can miss the true nearest card. The direction at that scale is HNSW with a post-filter, or a per-tier partitioned index. Ask the human before making this change.