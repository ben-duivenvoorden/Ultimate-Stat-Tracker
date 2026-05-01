import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Player, PlayerId } from '@/core/types'
import { TAP_THRESH, HH } from './constants'
import {
  initialPositions, pillHalfWidth, stepPhysics, eventXY, computeArrowPath,
  type ChipSpec, type Vec,
} from './physics'
import { buildActions, chipAction, type ChipAction, type ChipId } from './layout'
import { PlayerNode } from './PlayerNode'
import { PassArrowLayer, type PassArrowSpec, type ArrowNodeRefs } from './PassArrowLayer'

export type StageMode = 'in-play' | 'awaiting-pull' | 'pick'

export interface StageProps {
  /** Stable identifier for the rendered team — used as React key by parent so a
   *  team swap unmounts/remounts the stage cleanly. */
  teamId: string
  players: Player[]
  teamColor: string

  mode: StageMode
  /** Pill that should render with thick-border / filled-bg holder styling.
   *  In awaiting-pull, the engine-set discHolder is null, so this is null. */
  holderId: PlayerId | null
  /** Pill highlighted as the selected puller (only relevant in awaiting-pull). */
  pullerId: PlayerId | null
  /** Pills that can't be tapped (rendered at low opacity). */
  ineligibleIds: PlayerId[]

  /** Recording-options-driven chip toggles. */
  stallShown: boolean
  bonusShown: boolean

  /** Pass arrows to render on this stage; from/to indices match `players`. */
  arrows: PassArrowSpec[]

  /** Logical canvas centre + bounds. Parent shifts cx if drawers are open. */
  centre: { x: number; y: number }
  bounds: { w: number; h: number }

  /** Tap on a pill that doesn't open chips (defender / teammate / puller). */
  onPillTap: (player: Player) => void
  /** Tap on an action chip emitted by an opened pill. */
  onChipTap: (player: Player, action: ChipAction) => void
  /** Tap on the empty canvas background (used to cancel pick mode). */
  onBackgroundTap: () => void
}

export function Stage(props: StageProps) {
  const N = props.players.length
  const posRef = useRef<Vec[]>([])
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([])
  if (nodeRefs.current.length !== N) {
    nodeRefs.current = Array.from({ length: N }, () => null)
  }

  // Per-pill measured half-width (px). Seeded with the heuristic so physics
  // works on the first frame; PlayerNode replaces these via onMeasureWidth.
  const halfWidthsRef = useRef<number[]>([])
  if (halfWidthsRef.current.length !== N) {
    halfWidthsRef.current = props.players.map(p => pillHalfWidth(p.name))
  }

  // Initial positions on mount / when team-id changes (parent re-keys Stage).
  useLayoutEffect(() => {
    posRef.current = initialPositions(N, props.bounds.w, props.bounds.h)
    halfWidthsRef.current = props.players.map(p => pillHalfWidth(p.name))
    applyDOM()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [N, props.teamId])

  const [openIdx, setOpenIdx] = useState(-1)
  const [dragIdx, setDragIdx] = useState(-1)
  const stateRef = useRef({ openIdx: -1, dragIdx: -1 })
  stateRef.current.openIdx = openIdx
  stateRef.current.dragIdx = dragIdx

  // Reset open state when the mode changes (e.g. entering pick mode while
  // staying on the same team). Team changes already remount Stage via the
  // parent's key prop, so they reset openIdx implicitly.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setOpenIdx(-1) }, [props.mode])

  const dragInfo = useRef({ idx: -1, offX: 0, offY: 0, startX: 0, startY: 0, moved: false })

  // Compute the chip set per pill. Always non-empty for pills that *could*
  // be opened (holder in in-play, puller in awaiting-pull) so the chips are
  // already mounted (invisible) and can transition in when isOpen flips.
  const chipsForPlayer = (player: Player): ChipSpec[] => {
    if (props.mode === 'pick') return []
    const idx = props.players.indexOf(player)
    const HW = idx >= 0 ? halfWidthsRef.current[idx] : pillHalfWidth(player.name)
    if (props.mode === 'awaiting-pull') {
      if (player.id !== props.pullerId) return []
      return buildActions(HW, { phase: 'awaiting-pull', bonusShown: props.bonusShown })
    }
    if (player.id !== props.holderId) return []
    return buildActions(HW, { phase: 'in-play', stallShown: props.stallShown })
  }

  // Chips for whichever pill is currently open — handed to physics so chip
  // rects participate in push-out. Recomputed each render off the latest
  // measured widths.
  const openPlayer = openIdx >= 0 ? props.players[openIdx] : null
  const openChips: ChipSpec[] = openPlayer ? chipsForPlayer(openPlayer) : []

  // Latest-props ref so the rAF loop sees current centre/bounds without restarting.
  const tickCtx = useRef({
    centre: props.centre,
    bounds: props.bounds,
    arrows: props.arrows,
    openChips,
  })
  tickCtx.current = {
    centre: props.centre,
    bounds: props.bounds,
    arrows: props.arrows,
    openChips,
  }

  function applyDOM() {
    const arr = posRef.current
    for (let i = 0; i < arr.length; i++) {
      const el = nodeRefs.current[i]
      if (!el) continue
      el.style.transform = `translate3d(${arr[i].x}px, ${arr[i].y}px, 0)`
    }
  }

  // Arrow node refs — mutated each frame from the rAF tick.
  const arrowRefs = useRef<ArrowNodeRefs[]>([{ path: null, head: null }, { path: null, head: null }])

  // rAF loop — runs once per Stage instance (per team).
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const tick = (t: number) => {
      const dt = Math.min(0.04, (t - last) / 1000)
      last = t
      const ctx = tickCtx.current

      stepPhysics({
        positions:  posRef.current,
        halfWidths: halfWidthsRef.current,
        dt,
        centre:     ctx.centre,
        bounds:     ctx.bounds,
        drag:       stateRef.current.dragIdx,
        open:       stateRef.current.openIdx,
        openChips:  ctx.openChips,
      })

      // Update pass arrows (recent at slot 0, previous at slot 1).
      for (let k = 0; k < 2; k++) {
        const slot = arrowRefs.current[k]
        if (!slot?.path || !slot?.head) continue
        const passIdx = ctx.arrows.length - 1 - k
        const pass = ctx.arrows[passIdx]
        if (!pass || pass.fromIdx < 0 || pass.toIdx < 0
                  || pass.fromIdx >= posRef.current.length
                  || pass.toIdx   >= posRef.current.length) {
          slot.path.setAttribute('opacity', '0')
          slot.head.setAttribute('opacity', '0')
          continue
        }
        const a = posRef.current[pass.fromIdx]
        const b = posRef.current[pass.toIdx]
        if (!a || !b) continue
        const halfA = { hw: halfWidthsRef.current[pass.fromIdx], hh: HH }
        const halfB = { hw: halfWidthsRef.current[pass.toIdx],   hh: HH }
        const geom = computeArrowPath(a.x, a.y, b.x, b.y, halfA, halfB)
        slot.path.setAttribute('d', geom.d)
        slot.path.setAttribute('opacity', k === 0 ? '1' : '0.35')
        slot.head.setAttribute('points', geom.head)
        slot.head.setAttribute('opacity', k === 0 ? '1' : '0.35')
      }

      applyDOM()
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [N])

  // ─── Drag handlers ───
  function beginDrag(i: number, e: React.MouseEvent | React.TouchEvent) {
    e.stopPropagation()
    e.preventDefault()
    const xy = eventXY(e.nativeEvent as MouseEvent | TouchEvent)
    const p = posRef.current[i]
    dragInfo.current = {
      idx: i, offX: xy.x - p.x, offY: xy.y - p.y,
      startX: xy.x, startY: xy.y, moved: false,
    }
    setDragIdx(i)

    const onMove = (ev: MouseEvent | TouchEvent) => {
      const idx = dragInfo.current.idx
      if (idx < 0) return
      const m = eventXY(ev)
      if (!dragInfo.current.moved) {
        const dist = Math.hypot(m.x - dragInfo.current.startX, m.y - dragInfo.current.startY)
        if (dist > TAP_THRESH) dragInfo.current.moved = true
      }
      const pp = posRef.current[idx]
      pp.x = m.x - dragInfo.current.offX
      pp.y = m.y - dragInfo.current.offY
      pp.vx = 0; pp.vy = 0
      const el = nodeRefs.current[idx]
      if (el) el.style.transform = `translate3d(${pp.x}px, ${pp.y}px, 0)`
      ev.preventDefault?.()
    }

    const onEnd = () => {
      const wasDrag = dragInfo.current.moved
      dragInfo.current.idx = -1
      setDragIdx(-1)
      if (wasDrag) {
        const swallow = (ev: Event) => {
          ev.stopPropagation()
          ev.preventDefault()
          document.removeEventListener('click', swallow, true)
        }
        document.addEventListener('click', swallow, true)
      }
      document.removeEventListener('mousemove',  onMove, true)
      document.removeEventListener('mouseup',    onEnd,  true)
      document.removeEventListener('touchmove',  onMove as EventListener, true)
      document.removeEventListener('touchend',   onEnd,  true)
      document.removeEventListener('touchcancel', onEnd, true)
    }

    document.addEventListener('mousemove', onMove, true)
    document.addEventListener('mouseup',   onEnd,  true)
    document.addEventListener('touchmove', onMove as EventListener, { capture: true, passive: false })
    document.addEventListener('touchend',  onEnd,  true)
    document.addEventListener('touchcancel', onEnd, true)
  }

  // ─── Pill tap ───
  function onPillClick(i: number) {
    return (e: React.MouseEvent) => {
      e.stopPropagation()
      if (dragInfo.current.moved) return
      const player = props.players[i]
      if (props.ineligibleIds.includes(player.id)) return

      const canOpen =
        props.mode === 'in-play'       ? player.id === props.holderId :
        props.mode === 'awaiting-pull' ? player.id === props.pullerId :
        false

      if (canOpen) {
        setOpenIdx(prev => prev === i ? -1 : i)
      } else {
        setOpenIdx(-1)
        props.onPillTap(player)
      }
    }
  }

  function onChipTap(player: Player, id: ChipId) {
    setOpenIdx(-1)
    props.onChipTap(player, chipAction(id))
  }

  function onBackgroundClick() {
    if (dragInfo.current.moved) return
    setOpenIdx(-1)
    props.onBackgroundTap()
  }

  return (
    <div
      className="absolute inset-0"
      onClick={onBackgroundClick}
      style={{ touchAction: 'none' }}
    >
      <PassArrowLayer teamColor={props.teamColor} refs={arrowRefs} />
      {props.players.map((p, i) => {
        const isHolder = p.id === props.holderId
        const isPuller = p.id === props.pullerId
        const isOpen   = i === openIdx
        const dragging = i === dragIdx
        const ineligible = props.ineligibleIds.includes(p.id)

        return (
          <PlayerNode
            key={p.id}
            ref={(el) => { nodeRefs.current[i] = el }}
            name={p.name}
            teamColor={props.teamColor}
            isHolder={isHolder}
            isPuller={isPuller}
            isOpen={isOpen}
            dragging={dragging}
            ineligible={ineligible}
            chips={chipsForPlayer(p)}
            onMouseDown={(e) => { if (!ineligible) beginDrag(i, e) }}
            onTouchStart={(e) => { if (!ineligible) beginDrag(i, e) }}
            onClick={onPillClick(i)}
            onChipClick={(id) => onChipTap(p, id)}
            onMeasureWidth={(hw) => { halfWidthsRef.current[i] = hw }}
          />
        )
      })}
    </div>
  )
}
