import type { VisLogEntry, Player, PlayerId } from './types'

// UI-layer formatting for visual log entries.
// Engine produces structured data; this layer renders strings.
// Kept separate so i18n / alternative renderings can plug in here.

function nameLookup(players: Player[]) {
  return (id: PlayerId) => players.find(p => p.id === id)?.name ?? id
}

export function formatVisLogEntry(entry: VisLogEntry, players: Player[]): string {
  const name = nameLookup(players)
  switch (entry.type) {
    case 'point-start':              return '— Point Started —'
    case 'pull':                     return `Pull — ${name(entry.playerId)}`
    case 'pull-bonus':               return `Pull Bonus — ${name(entry.playerId)}`
    case 'possession':               return `→ ${name(entry.playerId)}`
    case 'turnover-throw-away':      return `Throw Away — ${name(entry.playerId)}`
    case 'turnover-receiver-error':  return `Receiver Error — ${name(entry.playerId)}`
    case 'turnover-stall':           return `Stall — ${name(entry.playerId)}`
    case 'block':                    return `Block — ${name(entry.playerId)}`
    case 'intercept':                return `Intercept — ${name(entry.playerId)}`
    case 'goal':                     return `Goal — ${name(entry.playerId)}`
    case 'injury-sub':               return `Injury Sub — ${name(entry.outPlayerId)} → ${name(entry.inPlayerId)}`
    case 'half-time':                return '— Half Time —'
    case 'end-game':                 return '— Game Over —'
    case 'timeout':                  return 'Timeout'
    case 'foul':                     return 'Foul'
    case 'pick':                     return 'Pick'
    case 'system':                   return entry.text
  }
}

export function getVisLogColor(type: VisLogEntry['type']): string {
  switch (type) {
    case 'pull':
    case 'pull-bonus':
      return 'var(--color-team-a)'
    case 'possession':
      return 'var(--color-muted)'
    case 'turnover-throw-away':
    case 'turnover-receiver-error':
    case 'turnover-stall':
      return 'var(--color-danger)'
    case 'block':
    case 'intercept':
      return 'var(--color-block)'
    case 'goal':
      return 'var(--color-success)'
    case 'injury-sub':
    case 'timeout':
    case 'foul':
    case 'pick':
      return 'var(--color-warn)'
    case 'point-start':
    case 'half-time':
    case 'end-game':
    case 'system':
      return 'var(--color-dim)'
  }
}

export function isMutedLogEntry(type: VisLogEntry['type']): boolean {
  return type === 'possession' || type === 'system' || type === 'point-start'
}
