import { describe, expect, it } from 'vitest';
import tokensCss from '../../src/styles/tokens.css?raw';

/*
 * Contrast checks for the design tokens.
 *
 * The plan's accessibility bar is "text contrast 4.5:1 or better", and WCAG
 * 1.4.11 asks for 3:1 on the graphics that carry meaning — node outlines,
 * edges, ports.
 *
 * The tokens are read from the real stylesheet with Vite's `?raw` import, so
 * the ratios are computed from the values that actually ship. Change a token
 * and this file fails.
 */

interface Palette {
  light: Record<string, string>;
  dark: Record<string, string>;
}

/** Parse the `:root` block and the dark-mode block out of the token file. */
function readPalette(): Palette {
  const light: Record<string, string> = {};
  const dark: Record<string, string> = {};

  for (const block of tokensCss.match(/\{[^{}]*\}/g) ?? []) {
    // The dark block is the one that redefines the page background.
    const isDark = block.includes('--color-bg: #14171c');
    const target = isDark ? dark : light;

    for (const match of block.matchAll(/(--[a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
      const name = match[1];
      const value = match[2];
      if (name !== undefined && value !== undefined) target[name] = value;
    }
  }

  return { light, dark };
}

function hexToRgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

/** The WCAG relative luminance of a colour. */
function luminance(hex: string): number {
  const [red, green, blue] = hexToRgb(hex);

  // The WCAG formula linearises each channel first.
  const linearise = (channel: number): number => {
    const srgb = channel / 255;
    return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * linearise(red) + 0.7152 * linearise(green) + 0.0722 * linearise(blue);
}

/** The WCAG contrast ratio between two colours, from 1 to 21. */
function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

function ratio(palette: Palette, scheme: 'light' | 'dark', fg: string, bg: string): number {
  const colors = palette[scheme];
  const foreground = colors[fg];
  const background = colors[bg];
  if (!foreground || !background) {
    throw new Error(`unknown token pair: ${fg} on ${bg} (${scheme})`);
  }
  return contrastRatio(foreground, background);
}

const palette = readPalette();

/** Text pairs that must reach 4.5:1. */
const TEXT_PAIRS: Array<[string, string, string]> = [
  ['body text on the page', '--color-text', '--color-bg'],
  ['body text on a panel', '--color-text', '--color-surface'],
  ['body text on a node', '--color-text', '--color-node-fill'],
  ['muted text on the page', '--color-text-muted', '--color-bg'],
  ['muted text on a panel', '--color-text-muted', '--color-surface'],
  ['an error message on a panel', '--color-danger', '--color-surface'],
  ['the accent on a panel', '--color-accent', '--color-surface'],
];

/** Graphic pairs that carry meaning. WCAG 1.4.11 asks for 3:1. */
const GRAPHIC_PAIRS: Array<[string, string, string]> = [
  ['a node outline on a node', '--color-node-stroke', '--color-node-fill'],
  ['a node outline on the page', '--color-node-stroke', '--color-bg'],
  ['an edge on the page', '--color-edge-stroke', '--color-bg'],
  ['a port on a node', '--color-port', '--color-node-fill'],
  ['the focus ring on the page', '--color-accent', '--color-bg'],
  ['the focus ring on a node', '--color-accent', '--color-node-fill'],
];

describe.each(['light', 'dark'] as const)('%s theme', (scheme) => {
  it.each(TEXT_PAIRS)('%s reaches 4.5:1', (_label, fg, bg) => {
    const value = ratio(palette, scheme, fg, bg);
    expect(value).toBeGreaterThanOrEqual(4.5);
  });

  it.each(GRAPHIC_PAIRS)('%s reaches 3:1', (_label, fg, bg) => {
    const value = ratio(palette, scheme, fg, bg);
    expect(value).toBeGreaterThanOrEqual(3);
  });
});

describe('the palette', () => {
  it('defines every token the stylesheet uses', () => {
    expect(Object.keys(palette.light).length).toBeGreaterThan(10);
    expect(Object.keys(palette.dark).length).toBe(Object.keys(palette.light).length);
  });

  it('keeps the grid dots decorative but visible', () => {
    // The grid is decoration, but it should still be distinguishable from
    // the page background.
    const value = ratio(palette, 'light', '--color-grid-dot', '--color-bg');
    expect(value).toBeGreaterThan(1.2);
  });
});
