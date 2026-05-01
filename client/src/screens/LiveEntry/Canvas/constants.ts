// Pill geometry
export const PILL_H = 38
export const HH = PILL_H / 2
export const GAP = 6
export const CHIP_H = 22

// Physics. Tuned for an overdamped settle — pills approach equilibrium
// without any oscillation / bounce-back. The reference values were
// 2.6 / 150 / 1400 / 0.82.
export const CENTER_K = 0.9
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

// Soft bounds inset
export const BOUNDS_MARGIN = 30
