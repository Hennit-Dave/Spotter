#!/usr/bin/env node

/**
 * generate-design-tokens.js
 *
 * Reads the Figma-exported design token JSON files and produces a single
 * CSS file that is the source of truth for the Spotter UI.
 *
 * Architecture (standard design-system practice):
 *
 *   1. PRIMITIVES  — raw colour palette values, declared as CSS custom
 *      properties under `:root`. These are never used
 *      directly on UI elements; they exist only so the semantic layer can
 *      reference them with `var()`.
 *
 *   2. COLOR ROLES — semantic / functional tokens that map to primitives.
 *      These are the variables every component and page actually uses
 *      (e.g. `var(--color-primary)`, `var(--color-on-surface)`).
 *
 *   3. TYPOGRAPHY  — type-scale primitives and composite type styles.
 *
 *   4. EFFECTS     — shadow tokens.
 *
 * Usage:
 *   node scripts/generate-design-tokens.js
 *
 * Output:
 *   src/styles/design-tokens.css
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------
const ROOT = path.resolve(__dirname, '..');
const COLORS_FILE = path.join(ROOT, 'colorsdesign-tokens.tokens.json');
const SPOTTER_FILE = path.join(ROOT, 'Spottdesign-tokens.tokens.json');
const OUTPUT_FILE = path.join(ROOT, 'src', 'styles', 'design-tokens.css');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Turn a human-readable token name into a CSS-variable-safe slug. */
function slugify(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

/**
 * Convert an 8-char hex colour (#rrggbbaa) to a standard CSS hex.
 * If alpha is ff (fully opaque), strip it to a 6-char hex.
 * Otherwise, keep the 8-char form.
 */
function normHex(hex) {
  if (!hex || typeof hex !== 'string') return hex;
  const h = hex.toLowerCase();
  if (h.length === 9 && h.endsWith('ff')) {
    return h.slice(0, 7); // #rrggbb
  }
  return h;
}

/**
 * Resolve a Figma alias reference like
 *   "{primitives.color palette.primary.primary40}"
 * into the CSS variable name we generated for that primitive.
 */
function resolveAlias(ref, primitiveLookup) {
  // Strip braces
  const inner = ref.replace(/^\{/, '').replace(/\}$/, '');

  // Normalise the path: split on ".", slugify each segment, rejoin.
  const segments = inner.split('.').map(slugify);

  // Try increasingly specific keys until we find one.
  // The lookup key mirrors what we built when we walked the primitives tree.
  const key = segments.join('.');
  if (primitiveLookup[key]) return primitiveLookup[key];

  // Some roles reference a different collection name
  // ("primitive collection colors" vs "primitives"), so try stripping the
  // first segment and matching on the rest.
  for (let start = 1; start < segments.length; start++) {
    const partial = segments.slice(start).join('.');
    if (primitiveLookup[partial]) return primitiveLookup[partial];
  }

  // Fall back: return null so caller can inline the raw value or add a comment.
  return null;
}

// ---------------------------------------------------------------------------
// Read inputs
// ---------------------------------------------------------------------------
const colors = JSON.parse(fs.readFileSync(COLORS_FILE, 'utf8'));
const spotter = JSON.parse(fs.readFileSync(SPOTTER_FILE, 'utf8'));

// ---------------------------------------------------------------------------
// 1.  Collect PRIMITIVE colours  (the "primitives" key)
// ---------------------------------------------------------------------------

/**
 * Walk an object tree and collect every leaf that has `type: "color"`.
 * Returns a flat map of   dotPath → { varName, value }
 */
function collectPrimitiveColors(obj, pathSegments = [], lookup = {}) {
  for (const [key, val] of Object.entries(obj)) {
    const nextPath = [...pathSegments, slugify(key)];

    if (val && val.type === 'color' && typeof val.value === 'string') {
      const dotPath = nextPath.join('.');
      const varName = '--primitive-' + nextPath.join('-');
      lookup[dotPath] = { varName, value: normHex(val.value) };
    } else if (val && typeof val === 'object' && !Array.isArray(val)) {
      collectPrimitiveColors(val, nextPath, lookup);
    }
  }
  return lookup;
}

const primitiveLookup = {};
if (colors.primitives) {
  collectPrimitiveColors(colors.primitives, [], primitiveLookup);
}

// ---------------------------------------------------------------------------
// Synthetic primitives: neutral92, neutral94, neutral96
// The Figma token files reference these tones from a different collection
// ("primitive collection colors") that was not exported. We interpolate them
// from the existing neutral palette stops (neutral90 → neutral95 → neutral98).
// ---------------------------------------------------------------------------
function lerpHex(hex1, hex2, t) {
  const r1 = parseInt(hex1.slice(1, 3), 16);
  const g1 = parseInt(hex1.slice(3, 5), 16);
  const b1 = parseInt(hex1.slice(5, 7), 16);
  const r2 = parseInt(hex2.slice(1, 3), 16);
  const g2 = parseInt(hex2.slice(3, 5), 16);
  const b2 = parseInt(hex2.slice(5, 7), 16);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('');
}

const n90 = primitiveLookup['color-palette.neutral.neutral90']?.value ?? '#dce5e0';
const n95 = primitiveLookup['color-palette.neutral.neutral95']?.value ?? '#eaf3ee';
const n98 = primitiveLookup['color-palette.neutral.neutral98']?.value ?? '#f2fbf7';

const syntheticNeutrals = {
  neutral92: lerpHex(n90, n95, 2 / 5),   // 2/5 of the way from 90 to 95
  neutral94: lerpHex(n90, n95, 4 / 5),   // 4/5 of the way from 90 to 95
  neutral96: lerpHex(n95, n98, 1 / 3),   // 1/3 of the way from 95 to 98
};

// Only fill a tone the export lacks. Since 2026-09-30 Figma holds all three
// in Primitives, so after a fresh export this loop adds nothing.
for (const [tone, hex] of Object.entries(syntheticNeutrals)) {
  const dotPath = `color-palette.neutral.${tone}`;
  if (primitiveLookup[dotPath]) continue;
  const varName = `--primitive-color-palette-neutral-${tone}`;
  primitiveLookup[dotPath] = { varName, value: hex, synthetic: true };
}

// Also register under the alternate collection path that the roles reference.
const altAliases = {
  'neutral-color-palette.neutral92': 'color-palette.neutral.neutral92',
  'neutral-color-palette.neutral94': 'color-palette.neutral.neutral94',
  'neutral-color-palette.neutral96': 'color-palette.neutral.neutral96',
};

// Build a quick varName-only map for alias resolution.
const aliasMap = {}; // dotPath → varName string
for (const [dotPath, entry] of Object.entries(primitiveLookup)) {
  aliasMap[dotPath] = entry.varName;
}
// Add alternate-path aliases so cross-collection references resolve.
for (const [alt, canonical] of Object.entries(altAliases)) {
  if (aliasMap[canonical]) aliasMap[alt] = aliasMap[canonical];
}

// ---------------------------------------------------------------------------
// 2.  Collect COLOR ROLES  (the "colorr roles spotter" key)
// ---------------------------------------------------------------------------

function collectColorRoles(obj) {
  const roles = [];
  for (const [key, val] of Object.entries(obj)) {
    if (!val || typeof val !== 'object') continue;
    if (val.type !== 'color') continue;

    const roleName = '--color-' + slugify(key);
    const raw = val.value;

    // Is it an alias reference?
    if (typeof raw === 'string' && raw.startsWith('{')) {
      const resolved = resolveAlias(raw, aliasMap);
      if (resolved) {
        roles.push({ varName: roleName, value: `var(${resolved})`, comment: raw });
      } else {
        // Alias could not be resolved — likely a cross-collection reference
        // to a value we don't have in the primitives (e.g. neutral92/94/96).
        // We'll note it and the developer must supply the value.
        roles.push({
          varName: roleName,
          value: `/* UNRESOLVED: ${raw} — supply manually */`,
          comment: raw,
          unresolved: true,
        });
      }
    } else {
      roles.push({ varName: roleName, value: normHex(raw) });
    }
  }
  return roles;
}

const rolesKey = Object.keys(colors).find((k) => k.toLowerCase().includes('role'));
const colorRoles = rolesKey ? collectColorRoles(colors[rolesKey]) : [];

// ---------------------------------------------------------------------------
// 3.  Collect TYPOGRAPHY scale primitives  (from colors file)
// ---------------------------------------------------------------------------

// The collection was exported as "typograhpy system scale" before its name
// was corrected in Figma; accept either spelling.
const typoScaleKey = Object.keys(colors).find((k) => /^typogra\w* system scale$/.test(k));

const FONT_WEIGHTS = {
  thin: 100, extralight: 200, light: 300, regular: 400, medium: 500,
  semibold: 600, bold: 700, extrabold: 800, black: 900,
};

function collectTypographyScale(obj) {
  const vars = [];
  for (const [category, entries] of Object.entries(obj)) {
    if (typeof entries !== 'object') continue;
    for (const [key, val] of Object.entries(entries)) {
      if (!val || typeof val !== 'object') continue;
      const slug = slugify(category) + '-' + slugify(key);

      if (val.type === 'dimension' && val.value != null) {
        vars.push({ varName: `--typo-scale-${slug}`, value: `${val.value}px` });
      } else if (val.type === 'string' && val.value != null) {
        const needsQuotes = category === 'fontfamilies';
        // Figma font-style variables hold words ("Medium"); CSS needs numbers.
        const weight = category === 'fontweights' ? FONT_WEIGHTS[val.value.toLowerCase().replace(/\s+/g, '')] : null;
        const formatted = needsQuotes ? `"${val.value}"` : weight ?? val.value;
        vars.push({ varName: `--typo-scale-${slug}`, value: formatted });
      }
    }
  }
  return vars;
}

const typoScale = typoScaleKey ? collectTypographyScale(colors[typoScaleKey]) : [];

// ---------------------------------------------------------------------------
// 4.  Collect composite TYPOGRAPHY styles  (from Spotter file)
// ---------------------------------------------------------------------------

// The app self-hosts each family with next/font, which registers it under a
// generated name and exposes that name as `--font-<family slug>`. The family
// token points at that variable first, then the plain name, then the system
// UI stack, so text never waits on the web font.
const SYSTEM_UI_STACK = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

function fontFamilyValue(family) {
  return `var(--font-${slugify(family)}, "${family}"), ${SYSTEM_UI_STACK}`;
}

function collectTypographyStyles(obj) {
  const styles = [];
  for (const [name, def] of Object.entries(obj)) {
    if (!def || typeof def !== 'object') continue;
    const slug = slugify(name);
    const prefix = `--type-${slug}`;

    if (def.fontSize?.value != null)
      styles.push({ varName: `${prefix}-font-size`, value: `${def.fontSize.value}px` });
    if (def.fontFamily?.value != null)
      styles.push({ varName: `${prefix}-font-family`, value: fontFamilyValue(def.fontFamily.value) });
    if (def.fontWeight?.value != null)
      styles.push({ varName: `${prefix}-font-weight`, value: `${def.fontWeight.value}` });
    if (def.lineHeight?.value != null)
      styles.push({ varName: `${prefix}-line-height`, value: `${def.lineHeight.value}px` });
    if (def.letterSpacing?.value != null)
      styles.push({ varName: `${prefix}-letter-spacing`, value: `${def.letterSpacing.value}px` });
  }
  return styles;
}

const typoStyles = spotter.typography ? collectTypographyStyles(spotter.typography) : [];

// ---------------------------------------------------------------------------
// 5.  Collect EFFECT (shadow) tokens  (from Spotter file)
// ---------------------------------------------------------------------------

function collectEffects(obj) {
  const effects = [];
  for (const [name, def] of Object.entries(obj)) {
    if (!def || def.type !== 'custom-shadow') continue;
    const v = def.value;
    const slug = slugify(name);
    const shadow = `${v.offsetX}px ${v.offsetY}px ${v.radius}px ${v.spread}px ${v.color}`;
    effects.push({ varName: `--shadow-${slug}`, value: shadow });
  }
  return effects;
}

const effects = spotter.effect ? collectEffects(spotter.effect) : [];

// ---------------------------------------------------------------------------
// 5b. Collect DIMENSION tokens: spacing, radius, size  (either file)
// Any top-level collection not handled above whose leaves are dimension or
// number values. A leaf becomes `--<leaf slug>` when the leaf name already
// carries its group (e.g. "space-1"), otherwise `--<group slug>-<leaf slug>`.
// ---------------------------------------------------------------------------

const HANDLED_COLLECTIONS = new Set([
  'primitives', rolesKey, typoScaleKey, 'typography', 'effect',
]);

function collectDimensions(obj, group, out = []) {
  for (const [key, val] of Object.entries(obj)) {
    if (!val || typeof val !== 'object') continue;
    if ((val.type === 'dimension' || val.type === 'number') && typeof val.value === 'number') {
      const leaf = slugify(key);
      const varName = leaf.startsWith(group) ? `--${leaf}` : `--${group}-${leaf}`;
      out.push({ varName, value: `${val.value}px` });
    } else if (!('type' in val)) {
      collectDimensions(val, group, out);
    }
  }
  return out;
}

const dimensions = [];
for (const file of [colors, spotter]) {
  for (const [collection, tree] of Object.entries(file)) {
    if (HANDLED_COLLECTIONS.has(collection) || !tree || typeof tree !== 'object') continue;
    collectDimensions(tree, slugify(collection), dimensions);
  }
}

// ---------------------------------------------------------------------------
// 6.  Render the CSS
// ---------------------------------------------------------------------------

const GENERATED_BANNER = `/*
 * ============================================================
 * Spotter Design Tokens — AUTO-GENERATED
 * ============================================================
 *
 * Source of truth for all colours, typography, and effects.
 *
 * DO NOT EDIT BY HAND.
 * Re-generate by running:
 *   node scripts/generate-design-tokens.js
 *
 * Generated: ${new Date().toISOString()}
 *
 * Architecture:
 *   • Primitive colours  → internal reference only, never used
 *     directly on UI elements.
 *   • Color roles        → semantic tokens consumed by every
 *     component.  Always use these in your CSS/JSX.
 *   • Typography         → type-scale primitives and composite
 *     styles (font-size, weight, line-height, letter-spacing).
 *   • Effects            → box-shadow tokens.
 * ============================================================
 */
`;

let css = GENERATED_BANNER;

// --- Primitives (internal) -------------------------------------------------
css += `\n/* ========================================\n`;
css += ` * PRIMITIVES — internal reference colours\n`;
css += ` * Do NOT use these directly on UI elements.\n`;
css += ` * They exist so colour roles can reference\n`;
css += ` * them via var().  Changing a primitive here\n`;
css += ` * updates every role that points to it.\n`;
css += ` * ======================================== */\n`;
css += `:root {\n`;

// Group primitives by their first path segment for readability.
const groupedPrimitives = {};
for (const [dotPath, entry] of Object.entries(primitiveLookup)) {
  const group = dotPath.split('.').slice(0, 2).join('.');
  if (!groupedPrimitives[group]) groupedPrimitives[group] = [];
  groupedPrimitives[group].push(entry);
}

for (const [group, entries] of Object.entries(groupedPrimitives)) {
  css += `\n  /* ${group} */\n`;
  for (const { varName, value } of entries) {
    css += `  ${varName}: ${value};\n`;
  }
}

css += `}\n`;

// --- Color Roles (semantic — use these) ------------------------------------
css += `\n/* ========================================\n`;
css += ` * COLOR ROLES — semantic tokens\n`;
css += ` * USE THESE in components and pages.\n`;
css += ` * Each role maps to a primitive via var()\n`;
css += ` * so re-theming is a single-source change.\n`;
css += ` * ======================================== */\n`;
css += `:root {\n`;

for (const role of colorRoles) {
  if (role.unresolved) {
    css += `  /* ${role.varName}: ${role.value} */\n`;
  } else {
    const commentStr = role.comment ? `  /* ${role.comment} */` : '';
    css += `  ${role.varName}: ${role.value};${commentStr}\n`;
  }
}

css += `}\n`;

// --- Typography scale primitives -------------------------------------------
css += `\n/* ========================================\n`;
css += ` * TYPOGRAPHY SCALE — primitive scale values\n`;
css += ` * ======================================== */\n`;
css += `:root {\n`;
for (const t of typoScale) {
  css += `  ${t.varName}: ${t.value};\n`;
}
css += `}\n`;

// --- Typography composite styles -------------------------------------------
css += `\n/* ========================================\n`;
css += ` * TYPOGRAPHY STYLES — composite type tokens\n`;
css += ` * Use these to set font properties on\n`;
css += ` * headings, body, labels, etc.\n`;
css += ` * ======================================== */\n`;
css += `:root {\n`;
for (const t of typoStyles) {
  css += `  ${t.varName}: ${t.value};\n`;
}
css += `}\n`;

// --- Effects ---------------------------------------------------------------
css += `\n/* ========================================\n`;
css += ` * EFFECTS — shadow tokens\n`;
css += ` * ======================================== */\n`;
css += `:root {\n`;
for (const e of effects) {
  css += `  ${e.varName}: ${e.value};\n`;
}
css += `}\n`;

// --- Dimensions ------------------------------------------------------------
if (dimensions.length) {
  css += `\n/* ========================================\n`;
  css += ` * DIMENSIONS — spacing, radius, size\n`;
  css += ` * ======================================== */\n`;
  css += `:root {\n`;
  for (const d of dimensions) {
    css += `  ${d.varName}: ${d.value};\n`;
  }
  css += `}\n`;
}

// ---------------------------------------------------------------------------
// 7.  Write output
// ---------------------------------------------------------------------------

fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
fs.writeFileSync(OUTPUT_FILE, css, 'utf8');

// Summary
const totalPrimitives = Object.keys(primitiveLookup).length;
const totalRoles = colorRoles.length;
const unresolvedCount = colorRoles.filter((r) => r.unresolved).length;

console.log(`✓  Design tokens generated → ${path.relative(ROOT, OUTPUT_FILE)}`);
console.log(`   Primitive colours : ${totalPrimitives}`);
console.log(`   Colour roles      : ${totalRoles}` + (unresolvedCount ? ` (${unresolvedCount} unresolved)` : ''));
console.log(`   Typography scale  : ${typoScale.length}`);
console.log(`   Typography styles : ${typoStyles.length}`);
console.log(`   Effect tokens     : ${effects.length}`);
console.log(`   Dimension tokens  : ${dimensions.length}`);

if (unresolvedCount) {
  console.log(`\n⚠  ${unresolvedCount} colour role(s) reference primitives not found in the token files.`);
  console.log(`   Search the output CSS for "UNRESOLVED" and supply the hex values manually,`);
  console.log(`   or add the missing primitives to colorsdesign-tokens.tokens.json and re-run.`);
}
