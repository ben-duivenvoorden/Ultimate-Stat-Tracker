// SVG layer holding the pass-arrow path + arrowhead nodes.
// Stage's rAF tick mutates `d` / `points` directly via the forwarded refs.
// Two slots: [0] = most recent (solid), [1] = previous (faded + dashed).

import { forwardRef } from 'react'

export interface PassArrowSpec {
  /** Index into the team's `players` array. */
  fromIdx: number
  toIdx: number
}

export interface ArrowNodeRefs {
  path: SVGPathElement | null
  head: SVGPolygonElement | null
}

interface PassArrowLayerProps {
  teamColor: string
  refs: { current: ArrowNodeRefs[] }
}

export const PassArrowLayer = forwardRef<SVGSVGElement, PassArrowLayerProps>(
  function PassArrowLayer({ teamColor, refs }, ref) {
    return (
      <svg
        ref={ref}
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          pointerEvents: 'none', zIndex: 1,
        }}
      >
        {/* Recent (solid) */}
        <path
          ref={el => { refs.current[0] = { ...refs.current[0], path: el } }}
          d=""
          fill="none"
          stroke={teamColor}
          strokeWidth={2}
          strokeLinecap="round"
          opacity={0}
          style={{ filter: `drop-shadow(0 0 6px ${teamColor}88)` }}
        />
        <polygon
          ref={el => { refs.current[0] = { ...refs.current[0], head: el } }}
          points=""
          fill={teamColor}
          opacity={0}
          style={{ filter: `drop-shadow(0 0 6px ${teamColor}88)` }}
        />

        {/* Previous (faded, dashed) */}
        <path
          ref={el => { refs.current[1] = { ...refs.current[1], path: el } }}
          d=""
          fill="none"
          stroke={teamColor}
          strokeWidth={1.5}
          strokeLinecap="round"
          opacity={0}
          strokeDasharray="4 4"
        />
        <polygon
          ref={el => { refs.current[1] = { ...refs.current[1], head: el } }}
          points=""
          fill={teamColor}
          opacity={0}
        />
      </svg>
    )
  },
)
