import type { RawEventType, AppScreen, TeamId, UiMode } from './types'
import { otherTeam } from './types'

// ─── Pick-mode registry ───────────────────────────────────────────────────────
// Single source of truth for "tap a player to resolve a pending action" flows.
// Adding a new pick mode = one entry here + one entry in UiMode in types.ts.

export type PickTapAction =
  | { kind: 'record'; eventType: RawEventType; team: 'possession' | 'defending' }
  | { kind: 'navigate'; screen: AppScreen; setIsInjurySub?: boolean }

export interface PickModeConfig {
  /** Short label for the PlayerPane header (e.g. "PICK BLOCKER"). */
  paneLabel: string
  /** Full instruction shown in the ActionPane context strip. */
  contextLabel: string | ((ctx: { defendingShort: string }) => string)
  /** Display name for the PickModePlaceholder badge (e.g. "Blocked by Defence"). */
  displayName: string
  /** Accent color (CSS var). */
  color: string
  /** Background color tint for the PlayerPane (CSS var). */
  bgColor: string
  /** What happens when a player is tapped while in this mode. */
  onTap: PickTapAction
}

export const PICK_MODES = {
  'block-pick': {
    paneLabel:    'PICK BLOCKER',
    contextLabel: ({ defendingShort }) => `PICK BLOCKER FROM ${defendingShort}`,
    displayName:  'Blocked by Defence',
    color:        'var(--color-block)',
    bgColor:      'var(--color-block-bg)',
    onTap:        { kind: 'record', eventType: 'block', team: 'defending' },
  },
  'intercept-pick': {
    paneLabel:    'PICK INTERCEPTOR',
    contextLabel: ({ defendingShort }) => `PICK INTERCEPTOR FROM ${defendingShort}`,
    displayName:  'Intercepted by Defence',
    color:        'var(--color-intercept)',
    bgColor:      'var(--color-intercept-bg)',
    onTap:        { kind: 'record', eventType: 'intercept', team: 'defending' },
  },
  'receiver-error-pick': {
    paneLabel:    'PICK PLAYER',
    contextLabel: 'TAP PLAYER WHO HAD ERROR',
    displayName:  'Receiver Error',
    color:        'var(--color-warn)',
    bgColor:      'var(--color-warn-bg)',
    onTap:        { kind: 'record', eventType: 'turnover-receiver-error', team: 'possession' },
  },
  'injury-pick': {
    paneLabel:    'PICK INJURED',
    contextLabel: 'TAP INJURED PLAYER',
    displayName:  'Injury Sub',
    color:        'var(--color-warn)',
    bgColor:      'var(--color-injury-bg)',
    onTap:        { kind: 'navigate', screen: 'line-selection', setIsInjurySub: true },
  },
} as const satisfies Record<Exclude<UiMode, 'idle'>, PickModeConfig>

export type PickUiMode = keyof typeof PICK_MODES

export function isPickMode(m: UiMode): m is PickUiMode {
  return m !== 'idle'
}

/** Which team's players should be active (tappable) during this pick mode? */
export function pickActiveTeam(mode: PickUiMode, possession: TeamId): TeamId {
  const cfg = PICK_MODES[mode]
  if (cfg.onTap.kind === 'record' && cfg.onTap.team === 'defending') {
    return otherTeam(possession)
  }
  return possession
}

/** Resolve the contextLabel for an ActionPane render. */
export function resolveContextLabel(mode: PickUiMode, ctx: { defendingShort: string }): string {
  const l = PICK_MODES[mode].contextLabel
  return typeof l === 'function' ? l(ctx) : l
}
