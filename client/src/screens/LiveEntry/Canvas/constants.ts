// Pill geometry
export const PILL_H = 38
export const HH = PILL_H / 2
export const GAP = 6
export const CHIP_H = 22

// Physics — calmer than the reference design (was 2.6 / 150 / 1400 / 0.82).
export const CENTER_K = 1.6
export const REPULSE_R = 120
export const REPULSE_K = 900
export const FRICTION = 0.88
// Tap vs drag distinction (px). Bumped from 5 to forgive thumb shake.
export const TAP_THRESH = 6
// Velocities below this each frame snap to zero so pills come visibly to rest.
export const MIN_SPEED = 0.4

// Open-pill push-out + arrow repulsion
export const BUFFER = 12
export const ARROW_REPEL_NEAR = 32
export const ARROW_REPEL_K = 900

// Sweep animation
export const SWEEP_DURATION_MS = 400
export const SWEEP_EASING = 'cubic-bezier(0.4, 0, 0.2, 1)'

// Soft bounds inset
export const BOUNDS_MARGIN = 30
