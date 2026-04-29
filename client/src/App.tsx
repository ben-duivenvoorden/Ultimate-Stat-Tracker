import { useGameStore } from '@/core/store'
import GameSetup from '@/screens/GameSetup'
import GameSettings from '@/screens/GameSettings'
import LineSelection from '@/screens/LineSelection'
import LiveEntry from '@/screens/LiveEntry'

export default function App() {
  const screen = useGameStore(s => s.screen)

  return (
    <div className="h-full w-full bg-bg text-content font-sans overflow-hidden">
      {screen === 'game-setup'     && <GameSetup />}
      {screen === 'game-settings'  && <GameSettings />}
      {screen === 'line-selection' && <LineSelection />}
      {screen === 'live-entry'     && <LiveEntry />}
    </div>
  )
}
