---
trigger: always_on
---

# secrets.md

One job: keeping keys out of the browser, out of logs, and out of the repository.

This file is not specific to Spotter. It belongs in every project.

## Secrets live in the environment

Every secret is read from an environment variable on the server. Declare each one in `.env.example` with an empty value and a one-line comment saying what it is for.

`.env.example` is committed. `.env` and every other real environment file is in `.gitignore` and is never committed.

Reason: `.env.example` is the checkable list of what the project needs. The real values never enter version control, where they cannot be removed later.

## Never prefix a secret for the client

In Next.js, an environment variable prefixed for public use is compiled into the browser bundle and is visible to anyone who opens the page.

Never add that prefix to a secret key, a webhook signing value, or a session secret. If a value will not resolve in a client component, that is the framework telling you the value belongs on the server, not a problem to solve with a prefix.

Reason: this is the most common way a key leaks in this stack, and it leaks silently. The build succeeds and the app works.

## Secrets are read on the server only

Read secrets inside route handlers, server actions, or server-only modules. Never import a module that reads a secret into a client component.

Reason: an import chain can pull a server value into the client bundle without anyone intending it.

## Never log a secret

Do not log a key, a token, a session value, a password, or a full webhook payload that contains credentials. Do not print them in an error message returned to the client.

When an error involves a secret, log the fact and the identifier, not the value.

Reason: logs are read by more people and more services than the code is.

## Never hardcode a secret

No key, token, or password in source, in a test file, in a comment, in a commit message, or in a seeded record. Not even a test key.

Reason: a test key in history is still a key in history, and it teaches the next person the pattern is acceptable.

## Rotation

If a secret is ever committed, logged, or pasted anywhere shared, tell the human immediately and treat it as compromised. Do not quietly remove the line and continue.

Reason: deleting a line does not remove it from git history or from wherever it was pasted. Only rotation fixes it.

## Checks before merge

- No real secret value appears anywhere in the repository.
- No secret carries a client-visible prefix.
- No secret is read inside a client component.
- Every variable the code reads exists in `.env.example`.