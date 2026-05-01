// Pill geometry — base dimensions for the 'md' (default) size. The actual
// rendered size is base × pillScale (see PILL_SCALE_FACTORS).
export const PILL_H = 48
export const HH = PILL_H / 2
export const PILL_FONT_SIZE = 17
export const PILL_PADDING_X = 20

// Pill-size presets. The user cycles through these from the admin drawer.
export type PillSize = 'sm' | 'md' | 'lg'
export const PILL_SCALE_FACTORS: Record<PillSize, number> = {
  sm: 0.85,
  md: 1.0,
  lg: 1.18,
}
export const PILL_SIZE_CYCLE: Record<PillSize, PillSize> = {
  sm: 'md',
  md: 'lg',
  lg: 'sm',
}
export const GAP = 6
export const CHIP_H = 22

// Physics. Tuned for an overdamped settle — pills approach equilibrium
// without any oscillation / bounce-back. The reference values were
// 2.6 / 150 / 1400 / 0.82.
// No centre-spring — pills stay wherever they were last moved (by drag,
// repulsion, or the chip-zone push-out). The bounds clamp + non-overlap
// pass still keep them on-screen and apart; we just don't drag them back
// toward the canvas centre.
export const CENTER_K = 0
// Soft repulsion only kicks in when pill-to-pill clearance is below
// REPULSE_R px. Smaller = pills allowed to sit closer before pushing apart.
export const REPULSE_R = 30
export const REPULSE_K = 500
// Friction here is the per-frame velocity multiplier (0 = stop instantly,
// 1 = no damping). 0.65 means 35% of velocity decays each frame, which kills
// any momentum within ~6 frames (≈100ms at 60fps).
export const FRICTION = 0.65
// Tap vs drag distinction (px). Bumped from 5 to forgive thumb shake.
export const TAP_THRESH = 6
// Velocities below this each frame snap to zero. With heavy friction the
// snap rarely matters, but it eliminates any sub-pixel jitter at rest.
export const MIN_SPEED = 1.5

// Hard non-overlap minimum gap between two pill rects (px). Small value =
// pills can cluster cozily without touching.
export const BUFFER = 2
export const ARROW_REPEL_NEAR = 32
export const ARROW_REPEL_K = 900

// Sweep animation
export const SWEEP_DURATION_MS = 400
export const SWEEP_EASING = 'cubic-bezier(0.4, 0, 0.2, 1)'

// Soft bounds inset — distance kept clear between the pill (or chip
// footprint) and the canvas edge. Horizontal margin is tighter than
// vertical so pills can hug the left/right edges where there's nothing
// else competing for space (drawers handle their own width via flex).
export const BOUNDS_MARGIN_X = 5
export const BOUNDS_MARGIN_Y = 15
// Kept for API compatibility with anything still importing the original
// uniform constant.
export const BOUNDS_MARGIN = BOUNDS_MARGIN_Y
