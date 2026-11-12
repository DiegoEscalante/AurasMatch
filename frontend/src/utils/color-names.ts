/**
 * Perceptual CIELAB color naming and matching utility for AurasMatch.
 * Translates cosmetic HEX colors into descriptive Spanish color names for
 * color-blind users and screen readers (WCAG 2.1/2.2 SC 1.4.1 Use of Color).
 * Also powers the Color axis of the Triple Filter in the Feed.
 */

export type ColorFamilyId =
  | 'black_charcoal'
  | 'brown_cocoa'
  | 'nude_beige'
  | 'red_crimson'
  | 'burgundy_plum'
  | 'pink_rose'
  | 'coral_peach'
  | 'purple_lavender'
  | 'blue_navy'
  | 'green_olive'
  | 'gold_shimmer';

export interface ColorFamilyDefinition {
  id: ColorFamilyId;
  name: string;
  sampleHex: string;
  lab: [number, number, number];
}

function hexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return [r, g, b];
}

export function hexToCielab(hex: string): [number, number, number] | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;

  const gamma = (c: number) => {
    const n = c / 255;
    return n > 0.04045 ? Math.pow((n + 0.055) / 1.055, 2.4) : n / 12.92;
  };

  const r = gamma(rgb[0]);
  const g = gamma(rgb[1]);
  const b = gamma(rgb[2]);

  const x = ((r * 0.4124564 + g * 0.3575761 + b * 0.1804375) * 100) / 95.047;
  const y = ((r * 0.2126729 + g * 0.7151522 + b * 0.072175) * 100) / 100.0;
  const z = ((r * 0.0193339 + g * 0.119192 + b * 0.9503041) * 100) / 108.883;

  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x);
  const fy = f(y);
  const fz = f(z);

  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

export function computeDeltaE(
  lab1: [number, number, number],
  lab2: [number, number, number]
): number {
  const dl = lab1[0] - lab2[0];
  const da = lab1[1] - lab2[1];
  const db = lab1[2] - lab2[2];
  return Math.sqrt(dl * dl + da * da + db * db);
}

const RAW_FAMILIES: { id: ColorFamilyId; name: string; sampleHex: string }[] = [
  { id: 'black_charcoal', name: 'Negro / Carbón oscuro', sampleHex: '#2B2928' },
  { id: 'brown_cocoa', name: 'Marrón cacao / Café', sampleHex: '#63473B' },
  { id: 'nude_beige', name: 'Nude / Beige suave', sampleHex: '#C59B87' },
  { id: 'red_crimson', name: 'Rojo carmín intenso', sampleHex: '#B81D2A' },
  { id: 'burgundy_plum', name: 'Vino / Ciruela oscuro', sampleHex: '#5B1E31' },
  { id: 'pink_rose', name: 'Rosa / Frambuesa', sampleHex: '#D46A8E' },
  { id: 'coral_peach', name: 'Coral / Durazno cálido', sampleHex: '#E07A5F' },
  { id: 'purple_lavender', name: 'Morado / Lavanda', sampleHex: '#7E579F' },
  { id: 'blue_navy', name: 'Azul profundo', sampleHex: '#2C4A7E' },
  { id: 'green_olive', name: 'Verde esmeralda / Oliva', sampleHex: '#3B6E52' },
  { id: 'gold_shimmer', name: 'Dorado / Bronce luminoso', sampleHex: '#C89D54' },
];

export const COLOR_FAMILIES: ColorFamilyDefinition[] = RAW_FAMILIES.map((item) => ({
  ...item,
  lab: hexToCielab(item.sampleHex) ?? [50, 0, 0],
}));

export function getClosestColorFamily(hex: string): ColorFamilyDefinition {
  const lab = hexToCielab(hex);
  if (!lab) return COLOR_FAMILIES[0];

  let best = COLOR_FAMILIES[0];
  let minDistance = Infinity;

  for (const family of COLOR_FAMILIES) {
    const dist = computeDeltaE(lab, family.lab);
    if (dist < minDistance) {
      minDistance = dist;
      best = family;
    }
  }
  return best;
}

export function getSpanishColorName(hex?: string | null): string {
  if (!hex) return 'Tono sin especificar';
  return getClosestColorFamily(hex).name;
}

export function formatAccessibleColorLabel(hex?: string | null): string {
  if (!hex) return 'Tono sin especificar';
  const normalizedHex = hex.startsWith('#') ? hex.toUpperCase() : `#${hex.toUpperCase()}`;
  return `${getSpanishColorName(normalizedHex)} (${normalizedHex})`;
}

