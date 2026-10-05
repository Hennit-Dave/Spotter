---
trigger: glob
globs: src/app/**, src/components/**, src/styles/**, **/*.css
---

# design-system.md

**DRAFT. Not approved by the human. Written from the human's styling instructions and the token files as they stand. Gaps are listed in docs/open-decisions.md.**

One job: every visual value comes from a design token, used for the role it is defined for.

Read client-constraints.md for weight limits on fonts and libraries.

## Where the tokens come from

The Figma exports Spottdesign-tokens.tokens.json and colorsdesign-tokens.tokens.json are the source. scripts/generate-design-tokens.js turns them into src/styles/design-tokens.css.

Never edit design-tokens.css by hand. A token change is made in Figma, exported, and regenerated.

Reason: a hand edit is overwritten on the next run and silently lost.

## Tokens only

No hard-coded hex, rgb, or hsl values. No arbitrary pixel values. No one-off font sizes. No magic numbers in CSS.

If there is no token for something you need, stop and ask the human. Do not invent a token and do not add a value "just this once."

Reason: one invented value becomes the pattern the next screen copies.

## Applying color

- Use the color role tokens, the ones named `--color-*`. Never use a `--primitive-*` token on a UI element.
- Each role is used with its paired "on" role. Text or icons sitting on `--color-X` use `--color-on-X`. Text or icons sitting on `--color-X-container` use `--color-on-X-container`.
- Page and panel backgrounds use `--color-surface` or a `--color-surface-container*` role. Text on them uses `--color-on-surface`, or `--color-on-surface-variant` for secondary text.
- `--color-error` and `--color-warning` roles are for error and warning states only. Never use them for decoration or emphasis.
- Do not swap a role for another because it looks close enough. Pick the role by what the element is, not by its shade.

Reason: roles let the palette change in one place. A shade picked by eye breaks the first time the palette moves.

## Type

Set type with a whole composite style from the `--type-*` group: size, family, weight, line height, and letter spacing together. Do not mix properties from two styles.

Do not use the `--typo-scale-*` primitives directly on elements.

The font is DM Sans, weights 500 and 600, latin subset, self-hosted with next/font/google. next/font must expose it as the CSS variable `--font-dm-sans`. Every `--type-*-font-family` token reads that variable first, then falls back to the system UI stack. Do not set font-family any other way.

Reason: next/font registers the font under a generated name. Without the variable, the tokens would name a font the browser never loaded.

## Focus

Every tappable element shows a focus ring on `:focus-visible`: `outline: medium solid var(--color-secondary)`. Never remove an outline without this replacement. Do not use `--color-primary` for focus; it is below 3 to 1 on the light surfaces. See D23.

Reason: a member using a keyboard or switch access must be able to see where they are.

## Shadows

Use the `--shadow-*` tokens only.

## Known gaps and exceptions

- There are no breakpoint tokens. Stop and ask before adding a layout breakpoint.
- There is no dark theme. Version one is light only until the human decides otherwise.
- Primary40 is the brand green #00e3aa, which is lighter than Primary50 to 80. This is a deliberate exception (D9). Do not "fix" the ramp.
- Spacing (`--space-*`), radius (`--radius-*`), and tap size (`--size-tap`) tokens exist. Anything a member taps is at least `--size-tap` in both directions.
