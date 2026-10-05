import type { MetadataRoute } from 'next';
import colorsTokens from '../../colorsdesign-tokens.tokens.json';

function normalizeHex(hex: string): string {
  if (hex.length === 9 && hex.toLowerCase().endsWith('ff')) {
    return hex.slice(0, 7);
  }
  return hex;
}

type RoleName = keyof (typeof colorsTokens)['color roles spotter'];

// Follows a role's alias, e.g. "{primitives.color palette.primary.primary40}",
// to the primitive's hex value, so the manifest tracks the role, not a tone.
function roleColor(role: RoleName): string {
  const alias = colorsTokens['color roles spotter'][role].value;
  const path = alias.replace(/^\{|\}$/g, '').split('.');
  let node: unknown = colorsTokens;
  for (const key of path) {
    node = (node as Record<string, unknown>)[key];
  }
  const value = (node as { value?: unknown } | undefined)?.value;
  if (typeof value !== 'string') {
    throw new Error(`Color role "${role}" does not resolve to a color value`);
  }
  return normalizeHex(value);
}

const themeColor = roleColor('primary');
const backgroundColor = roleColor('surface');

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Spotter',
    short_name: 'Spotter',
    description: "Ask your gym. Answers come from the gym's own records.",
    start_url: '/',
    scope: '/',
    display: 'standalone',
    lang: 'en',
    theme_color: themeColor,
    background_color: backgroundColor,
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
