# Open decisions

Every question the agent cannot settle on its own. The agent reads this before a task and does not build on an item marked OPEN.

How to close one: write the decision under it, change Status to DECIDED with the date, and update the rules file or PRD it names. The agent then applies that change to the named file.

Recommendations are the agent's suggestion only. They are not decisions.

The PRD's own open questions (section 14) stay in the PRD and are not repeated here.

---

## A. Conflicts between files

### D1. How a ledger entry links to a payment attempt
- PRD 8.5 links LedgerEntry to PaymentAttempt through `gatewayReference`.
- .agent/rules/data-model.md and data-model-schema.md link by `paymentAttemptId` and keep `gatewayReference` only as a lookup key.
- Blocks: prisma/schema.prisma.
- Recommendation: the rules version. It gives the reason (a relation on a nullable unique column is fragile). Then update PRD 8.5 to match.
- Status: DECIDED 2026-09-30. The rules version: LedgerEntry links by paymentAttemptId, and gatewayReference is only the webhook lookup key. PRD 8.5 updated to match.

### D2. Where the pre-router runs
- PRD 7.2 says on-device. PRD 8.2 and 6.2 say on the server. ai.md and AGENTS.md both flag this.
- Blocks: Feature 1 and Feature 2 routing.
- Recommendation: the server. FR-6 logs question text on the server anyway, so text reaches the gym's server either way. A server router is a single list in a single place to audit, and ships no code to the phone.
- Status: DECIDED 2026-10-05. The server, in src/server/router/. ai.md, the PRD and AGENTS.md updated to match.

### D3. What the home screen shows during the foundation build
- PRD FR-1 and client-constraints.md say home shows the status strip, four common questions, and an optional text box.
- The foundation brief says home is static, minimal, and has no data.
- Recommendation: a static layout with the three regions in place and written placeholder copy. No figures, no zeros, no currency symbols.
- Status: DECIDED 2026-09-30. Static shell, top to bottom: the name Spotter; a status strip with the labels Tier, Expires, Days trained, Balance and no values; the four questions from D4 as buttons that do nothing yet; an optional text input, 300 characters max, that does nothing yet. Height 100dvh with a 100vh fallback. No page scroll, no hidden overflow, no images, icons or decoration. Tap targets use size-tap.

### D4. The four common questions
- client-constraints.md says the human supplies them. They appear nowhere in the PRD.
- Blocks: the real home screen, not the foundation.
- Status: DECIDED 2026-09-30. In this order: What time is Saturday class? / Can I bring a guest? / How many days did I train this month? / Do I owe anything? Kept in one place, apart from the layout.

### D5. Model names
- AGENTS.md says model names live in the rules files. ai.md names none. PRD 7.1 names Gemini 2.0 Flash and text-embedding-004 at 768 dimensions.
- The 768 dimension is fixed in the schema, so a different embedding model may need a schema change.
- Recommendation: confirm both models are still offered in a no-training configuration, then record the names in ai.md.
- Blocks: any model code. It does not block the foundation.
- Status: OPEN

### D6. Next.js file name for request interception
- auth.md globs `src/middleware.ts`. Recent Next.js releases renamed this file.
- Recommendation: pin the Next.js version first, then update the auth.md glob to match that version's file name.
- Added 2026-10-05: auth.md now also globs `src/server/auth/**`, and sign-in is email and password, not activation code and PIN.
- Status: DECIDED 2026-10-05. src/proxy.ts. The auth.md glob is updated to match.

---

## B. Design system gaps

### D7. No spacing, radius, size, or breakpoint tokens
- The token files hold color, type, and shadow only. The foundation layout cannot be built without spacing.
- Recommendation: add a spacing scale and a radius scale in Figma, export, and regenerate.
- Status: DONE 2026-09-30. Collections space, radius and size are in Figma and in the CSS: space-1, 2, 3, 4, 6, 8 and 12 (4 to 48 px), radius-sm 8, radius-md 12, radius-lg 16, radius-full 9999, size-tap 48. The hand-typed groups were removed. Exported 2026-09-30: the Figma connector hit its plan limit, so the agent built both token JSON files from live Figma data and the existing export, in the plugin's format, then regenerated the CSS. A later export from the Design Tokens plugin should produce the same content.

### D8. White on primary fails contrast
- `--color-on-primary` (white) on `--color-primary` (#00e3aa) is 1.67 to 1. The WCAG AA minimum for body text is 4.5 to 1. The other on-role pairs are between 6.4 and 16 to 1.
- Recommendation: change `on primary` to a dark primary tone in Figma. Until then, do not place text on `--color-primary`.
- Status: DONE 2026-09-30. `On primary` points at Primary10 (#012016), a contrast of 10.3 to 1. Exported 2026-09-30: the Figma connector hit its plan limit, so the agent built both token JSON files from live Figma data and the existing export, in the plugin's format, then regenerated the CSS. A later export from the Design Tokens plugin should produce the same content.

### D9. The primary ramp is out of order
- `primary40` is #00e3aa, which is lighter than primary50 to primary70. In every other ramp, 40 is darker than 50. `primary40` looks like it was set to the key color by hand.
- Status: DECIDED 2026-09-30. Leave as is. Primary40 stays #00e3aa, the brand primary. The out-of-order ramp is a known exception, noted in design-system.md.

### D10. Invalid values and name typos in the tokens
- `--typo-scale-fontweights-*` are the words "Medium" and "SemiBold", which CSS does not accept as weights. The composite `--type-*` styles use valid numbers, so nothing breaks while only composites are used.
- `--typo-scale-fontweights-inter-0` names Inter, which is not a Spotter font.
- Name typos from Figma: `shadoww`, `scondary95`, `typograhpy`, `colorr`. Style names mix `dmsans` and `dm-sans`.
- The generator's header comment says primitives sit under `[data-theme]`, but it writes them to `:root`.
- Recommendation: fix the names in Figma and map weight words to numbers in the generator, as one approved change.
- Status: DONE 2026-09-30. Collection, variable and style names were corrected in Figma, and the unused inter-0 was deleted. The generator maps weight words to 500 and 600. CSS names that changed: --shadow-*-shadow, --primitive-color-palette-secondary-secondary95, and every --type-* style now ends in dmsans. Exported 2026-09-30: the Figma connector hit its plan limit, so the agent built both token JSON files from live Figma data and the existing export, in the plugin's format, then regenerated the CSS. A later export from the Design Tokens plugin should produce the same content.

### D11. No dark theme
- Only one set of roles exists.
- Recommendation: light only for version one.
- Status: OPEN

### D12. Loading DM Sans
- Every type style uses DM Sans. client-constraints.md says not to add a font pack without asking.
- Recommendation: next/font, which is built into Next.js, self-hosts the font, and needs no package. Load only weights 500 and 600, the two the styles use.
- Status: DECIDED 2026-09-30. DM Sans, weights 500 and 600, latin subset, via next/font/google with the variable --font-dm-sans. The generator now writes each --type-*-font-family token as var(--font-dm-sans, "DM Sans"), then the system UI stack. Fallback: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif. No font CDN tags.

### D21. Surface container tones are made up by the generator
- The four `--color-surface-container*` roles point at neutral92, neutral94 and neutral96. These tones are not in the Figma export. scripts/generate-design-tokens.js blends them from neutral90, 95 and 98.
- These are values the design system never defined.
- Recommendation: export the three tones from Figma, then remove the blending from the generator.
- Status: DONE 2026-09-30. Neutral92 #e2ebe6, Neutral94 #e7f0eb and Neutral96 #edf6f1 are real Primitives, and the surface container roles point at them. The hidden 'Primitive Collection Colors' collection is left in Figma, unreferenced. Exported 2026-09-30: the Figma connector hit its plan limit, so the agent built both token JSON files from live Figma data and the existing export, in the plugin's format, then regenerated the CSS. A later export from the Design Tokens plugin should produce the same content.

### D23. Focus indicator
- The question input had `outline: none` and no replacement, so keyboard and switch users could not see focus. The design system has no stroke-width token.
- Options offered: A, new stroke-focus tokens (3 and 2 px, the Material style); B, the CSS keyword `medium` with no new token; C, borrow a spacing token.
- Status: DECIDED 2026-09-30. Option B. Every tappable element shows `outline: medium solid var(--color-secondary)` on `:focus-visible`. Secondary is 6.1 to 1 on surface and 5.0 to 1 on neutral-container. Primary fails at 1.6 and 1.3, so it is not used. There is no offset, because an offset needs a length and there is no token for it. Revisit if stroke tokens are added.

---

## C. Setup

### D13. Packages
- Needed for the foundation: next, react, react-dom, typescript, @types/react, @types/react-dom, @types/node, prisma, @prisma/client. Also eslint and eslint-config-next, for the lint gate in testing.md.
- Also needed: which package manager to use and which Node version to pin.
- Status: DECIDED 2026-09-30. Node 24, pinned in .nvmrc and engines. npm, with package-lock.json committed. Pinned: next 16.3.8, react and react-dom 19.3.0, prisma and @prisma/client 7.10.0 (npm's latest prisma is an 8.0 release candidate), typescript 6.0.3 (typescript-eslint needs a version below 6.1), eslint 9.39.5 exact (changed 2026-09-30: eslint-plugin-import, jsx-a11y and react, all required by eslint-config-next 16.3.8, accept ESLint up to 9 only, so 10 fails to install), eslint-config-next 16.3.8, prettier, dotenv, @types/node, @types/react, @types/react-dom. Nothing else without asking.
- Approved 2026-10-05, installed only when the feature that needs each one begins: @node-rs/argon2 (password hashing), resend (the two account emails), and vitest as a dev dependency (colocated *.test.ts tests). Nothing else without asking.

### D14. Styling method
- Recommendation: CSS Modules, which are built into Next.js and need no package. No Tailwind and no UI library. That keeps payload small and every value a token.
- Status: DECIDED 2026-09-30. CSS Modules plus token custom properties. No hex, rgb, hsl, px, rem or em values outside the token source. Keywords, percentages and viewport units are allowed.

### D15. Git
- git.md assumes a repository and work on branches. This folder is not a git repository.
- Recommendation: the human runs git init, makes an initial commit of the context files on main, and names a working branch.
- Status: DECIDED 2026-09-30. git init with main as the branch. The human makes the first commit on main with the context files. The agent works on scaffold/foundation and never commits to main. No remote, no push. One-line imperative commit messages with no prefixes.

### D16. The Prisma schema in the foundation
- Options: an empty datasource only, or the full schema from data-model-schema.md.
- The full schema depends on D1. Either way, no migration runs. The agent may run client generation only.
- Status: DECIDED 2026-09-30. The schema in .agent/rules/data-model-schema.md, whose header is now the Prisma 7 header, plus prisma.config.ts at the root. DATABASE_URL lives in .env. The agent runs only prisma validate and prisma generate. No client instance yet.

### D17. Environment variable names
- .agent/rules/env.md is a DRAFT. Only DATABASE_URL is confirmed.
- Proposed names, added 2026-10-05, not decided: RESEND_API_KEY (the key for sending the two account emails), EMAIL_FROM (the sender address, which depends on D24), SESSION_SECRET (signs the session cookie). Each is server-only and never carries a client-visible prefix, per secrets.md.
- Proposed 2026-10-05: two connection strings. DATABASE_URL is Neon's pooled string, used by the app at runtime through the adapter in src/server/db.ts. DIRECT_URL is Neon's direct string, read only by prisma.config.ts for the CLI and migrations.
- APP_URL: approved by the human on 2026-10-05, as named. It is the public address of the app, for the links in the two account emails. A link needs a base address the app can trust, and the request's Host header cannot be trusted for that.
- Proposed 2026-10-05: TEST_DATABASE_URL, the connection string for the Neon branch named test. Read only by database-backed tests.
- Status: OPEN. Until the names are approved, .env.example holds only DATABASE_URL (trimmed 2026-09-30). Each other name is added when the human approves it and the feature that reads it begins.

### D18. Web app manifest in the foundation
- client-constraints.md requires a Progressive Web App. The foundation brief does not mention one.
- Recommendation: add a static manifest to the foundation, and defer the service worker to when the status strip exists.
- Status: DECIDED 2026-09-30. app/manifest.ts with the fields the human listed. background_color comes from the surface role and theme_color from the primary role, both resolved from colorsdesign-tokens.tokens.json in code, never typed. The human supplies the icons in public/icons/. No service worker yet.

### D22. Audit findings inside the Prisma command-line tool
- npm audit on 2026-09-30 reports 4 high findings, all in the dev dependency prisma 7.10.0: mysql2 3.15.3 (two advisories: GHSA-3f6p-5ww8-9rcr and GHSA-rgwj-5xj2-c3m3) and deepmerge-ts (stack exhaustion on recursive merge) through @prisma/config.
- Spotter uses PostgreSQL only, so the MySQL driver is not loaded. The CLI runs on developer machines, not in the member app.
- `npm audit fix --force` would drop Prisma to 6.19.3, which breaks D16. Do not run it.
- Recommendation: upgrade to the first Prisma 7 patch that clears these, and recheck before launch.
- Update 2026-10-05: npm audit now reports 9 high findings, all in dev tooling. The Prisma ones above, plus fast-glob, micromatch and braces (stack exhaustion on deeply nested patterns), reached through eslint-config-next and @next/eslint-plugin-next. None come from argon2, resend, the pg adapter, pg or vitest. The human decided to leave all of them as they are. No changes made. Recheck before launch.
- Status: OPEN. Recheck before launch.

---

## D. Values the rules say must come from the human

### D19. Activation code lifetime
- auth.md: ask the human, do not invent.
- Status: RETIRED 2026-10-05. Replaced by open sign-up. Activation codes no longer exist.

### D20. Wrong-PIN and wrong-activation-code limits
- auth.md requires a limit but only gives a number for the daily check-in code: five in ten minutes.
- Status: RETIRED 2026-10-05. Replaced by open sign-up. PINs and activation codes no longer exist. The sign-in limit is now in auth.md: five wrong passwords for one email in ten minutes pauses that email for ten minutes.

### D24. Resend sending domain
- auth.md: the sending domain must be verified with Resend before launch. Ask the human which domain.
- Blocks: launch, and sending any account email. Does not block the account screens or the landing page. EMAIL_FROM (D17) depends on it.
- Status: OPEN

### D25. Staff and owner sign-in
- auth.md: staff and owner screens use their own sign-in and session, with a role check before any read or write. How staff sign in is not decided. The Staff model has no sign-in fields.
- Blocks: every admin screen, including desk linking of new accounts, and the single schema migration. The migration is not proposed until this is settled.
- Status: DECIDED 2026-10-05. Staff and owner sign in with email and password, the same way as members. There is no open sign-up for staff: the owner creates staff accounts. Each has a role, OWNER or STAFF. They use the same argon2 hashing and the same single-use reset link. The admin session is its own signed httpOnly cookie, separate from the member session, and the role is checked before every admin read or write. Still to apply: .agent/rules/auth.md and the Staff model in data-model-schema.md.

---

## E. Draft rules files waiting for approval

- .agent/rules/env.md: DRAFT
- .agent/rules/design-system.md: DRAFT
