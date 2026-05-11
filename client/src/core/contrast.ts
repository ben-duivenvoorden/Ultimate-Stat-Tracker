// Luminance-aware ink picker.
//
// Used wherever a UI element renders text/icons *on* a team-colour fill
// (solid, not alpha-tinted). With Lizards Eastside playing in white today,
// a hard-coded `text-white` over `background: color` becomes invisible —
// `inkOn(color)` returns dark for light fills and light for dark fills.
//
// `light` / `dark` default to the app's design tokens so the chosen ink
// stays consistent with the rest of the palette (and inherits any future
// theme tweaks). Pass explicit hex strings for callers that don't go
// through CSS variables (e.g. SVG strokes inside a foreignObject).

const DEFAULT_DARK_INK  = 'var(--color-bg)'
const DEFAULT_LIGHT_INK = '#fff'

/** Returns dark ink when `bg` is bright, light ink otherwise. Threshold is
 *  ~60% relative luminance (WCAG-ish); the in-between band leans light so
 *  most saturated team colours still read as "dark" backgrounds. */
export function inkOn(
  bg: string,
  light: string = DEFAULT_LIGHT_INK,
  dark:  string = DEFAULT_DARK_INK,
): string {
  const rgb = parseHex(bg)
  if (!rgb) return light
  // Per-channel relative luminance, approximated with simple sRGB weights —
  // accurate enough to drive a binary contrast switch.
  const lum = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255
  return lum > 0.6 ? dark : light
}

interface Rgb { r: number; g: number; b: number }

function parseHex(hex: string): Rgb | null {
  if (!hex || hex[0] !== '#') return null
  const h = hex.slice(1)
  if (h.length === 3) {
    return {
      r: parseInt(h[0] + h[0], 16),
      g: parseInt(h[1] + h[1], 16),
      b: parseInt(h[2] + h[2], 16),
    }
  }
  if (h.length === 6) {
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    }
  }
  return null
}
