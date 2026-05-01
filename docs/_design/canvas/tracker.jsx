// Stat Tracker — ground-up rewrite.
//
// Architecture:
//   - Positions live in `posRef` (mutable, never via setState during physics).
//   - Each pill has a `nodeRef` we mutate directly with `transform: translate(...)`.
//   - A single requestAnimationFrame loop runs physics + writes DOM.
//   - React state holds only: openIndex (single int|null) and draggingIndex.
//   - Drag uses document-level pointermove/pointerup (capture phase),
//     mouse+touch fallbacks, and is robust against scaled iframes.
//
// Behavior:
//   • Tap a pill (mouse-down / mouse-up with <5px movement) → toggles open.
//   • Drag a pill (>=5px movement) → moves it, suppresses the tap.
//   • Open pill is pinned (no physics) AND can still be dragged.
//   • Closed pills are pulled toward the center of the canvas with light damping
//     and repel each other (and any open pill) with breathing room.
//   • Single-open: opening a pill closes any other.

// ─────────────── Tunables ───────────────
const NEON = '#39FF14';
const CHIP_FG = '#ffffff';
const CHIP_BG = '#000000';
const CHIP_BORDER = 'rgba(255,255,255,0.85)';

const PLAYERS = ['Ada', 'Theodora', 'Wen', 'Marquise', 'Jojo', 'Penelope', 'Kai'];

// Logical canvas the physics runs in. Pixel-for-pixel == screen.
function getStageSize() {
  return { w: window.innerWidth, h: window.innerHeight };
}

const PILL_H = 38;
const GAP = 6;
const HH = PILL_H / 2;

const buildActions = (HW) => [
  { id: 'rec',  label: 'Receiver Error',     ax: -(HW + GAP), ay: 0,            align: 'right-center' },
  { id: 'goal', label: 'Goal',               ax: 0,           ay: HH + GAP,     align: 'center-top' },
  { id: 'tw',   label: 'Throwaway',          ax: HW + GAP,    ay: -(HH + 14),   align: 'left-center' },
  { id: 'blk',  label: 'Defensive Block',    ax: HW + GAP,    ay: 0,            align: 'left-center' },
  { id: 'int',  label: 'Defensive Intercept', ax: HW + GAP,   ay: HH + 14,      align: 'left-center' },
];

// Physics constants
const CENTER_K   = 2.6;   // spring constant pulling toward center
const REPULSE_R  = 150;   // closed-vs-closed repulsion radius
const REPULSE_K  = 1400;  // repulsion strength
const FRICTION   = 0.82;  // velocity decay per frame (~60Hz)
const TAP_THRESH = 5;     // px movement below which it's a tap

// Buffer kept between any pill and any chip / other pill
const BUFFER     = 12;    // px of breathing room
const OPEN_PUSH_K  = 2600; // strength of the displacement out of the zone

// Approx chip rendered widths (font: 11px/600). label.length * 6.5 + 20 padding.
const chipWidth = (label) => Math.round(label.length * 6.5 + 20);
const CHIP_H = 22;
// Approx pill rendered width: 15px/600 font, padding 16, border 1.5 each side.
const pillHalfWidth = (name) => Math.round((name.length * 8.5 + 32 + 3) / 2);

// Distance from a rect's center along direction (ux, uy) to its boundary.
// Rect is centered at origin with half-width hw and half-height hh.
function rectExitDist(ux, uy, hw, hh) {
  const tx = ux !== 0 ? hw / Math.abs(ux) : Infinity;
  const ty = uy !== 0 ? hh / Math.abs(uy) : Infinity;
  return Math.min(tx, ty);
}

// Compute curved arrow geometry from `a` to `b` (stage coords). Returns
// { d, head: "x1,y1 x2,y2 x3,y3", control: {x,y} } where d is the SVG path
// for a quadratic bezier offset perpendicular to the line for a graceful arc,
// and `head` is the arrowhead polygon points string near b.
// halfA / halfB are {hw, hh} for from-pill and to-pill.
function computeArrowPath(ax, ay, bx, by, halfA, halfB) {
  const dx = bx - ax, dy = by - ay;
  const dist = Math.hypot(dx, dy) || 1;
  const ux = dx / dist, uy = dy / dist;
  // shrink so start/end sit just OUTSIDE each pill's rect, with a small gap
  const GAP_AB = 8; // visible gap between arrow tip and pill edge
  const startInset = rectExitDist(ux, uy, halfA.hw, halfA.hh) + GAP_AB;
  const endInset   = rectExitDist(ux, uy, halfB.hw, halfB.hh) + GAP_AB;
  const sx = ax + ux * startInset;
  const sy = ay + uy * startInset;
  const ex = bx - ux * endInset;
  const ey = by - uy * endInset;
  // subtle perpendicular offset for arc
  const arcAmt = Math.min(22, dist * 0.07);
  const px = -uy, py = ux;
  const cx = (sx + ex) / 2 + px * arcAmt;
  const cy = (sy + ey) / 2 + py * arcAmt;
  // Bezier tangent at t=1 is direction (ex - cx, ey - cy). Use this for the
  // arrowhead so it aligns with the curve's actual endpoint direction.
  const tdx = ex - cx, tdy = ey - cy;
  const tlen = Math.hypot(tdx, tdy) || 1;
  const tx = tdx / tlen, ty = tdy / tlen;
  const ah = 10, aw = 6;
  // Path ends at the arrowhead's base (along the curve tangent) so the
  // stroke doesn't poke through the head polygon.
  const pex = ex - tx * ah;
  const pey = ey - ty * ah;
  const d = `M ${sx} ${sy} Q ${cx} ${cy} ${pex} ${pey}`;
  // arrowhead polygon — base perpendicular to curve tangent
  const nx = -ty, ny = tx;
  const tipX = ex, tipY = ey;
  const baseX = pex, baseY = pey;
  const lX = baseX + nx * aw, lY = baseY + ny * aw;
  const rX = baseX - nx * aw, rY = baseY - ny * aw;
  const head = `${tipX},${tipY} ${lX},${lY} ${rX},${rY}`;
  return { d, head, control: { x: cx, y: cy }, start: { x: sx, y: sy }, end: { x: ex, y: ey } };
}

// Sample N points along a quadratic bezier P0→C→P1, used for arrow obstacle
// avoidance. Returns array of {x, y}.
function sampleBezier(p0x, p0y, cx, cy, p1x, p1y, n) {
  const out = [];
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const it = 1 - t;
    out.push({
      x: it * it * p0x + 2 * it * t * cx + t * t * p1x,
      y: it * it * p0y + 2 * it * t * cy + t * t * p1y,
    });
  }
  return out;
}

// Returns array of axis-aligned rects (in stage coords) covering the open
// pill's footprint at center (cx, cy), given pill half-width HW.
// Each rect: {l, r, t, b}.
function openZoneRects(cx, cy, HW) {
  const rects = [];
  // The pill itself
  rects.push({ l: cx - HW, r: cx + HW, t: cy - HH, b: cy + HH });
  for (const a of buildActions(HW)) {
    const cw = chipWidth(a.label);
    let l, r, t, b;
    // Determine chip's actual rect from its alignment + ax/ay (which is the
    // anchor point, then translate(tx, ty) shifts it). The anchor sits at
    // (cx + ax, cy + ay) in stage coords.
    const acx = cx + a.ax, acy = cy + a.ay;
    if (a.align === 'right-center') {       // chip's right edge at anchor
      r = acx; l = acx - cw;
      t = acy - CHIP_H / 2; b = acy + CHIP_H / 2;
    } else if (a.align === 'left-center') { // chip's left edge at anchor
      l = acx; r = acx + cw;
      t = acy - CHIP_H / 2; b = acy + CHIP_H / 2;
    } else if (a.align === 'center-top') {  // chip's top edge at anchor
      l = acx - cw / 2; r = acx + cw / 2;
      t = acy; b = acy + CHIP_H;
    } else {                                // center-center fallback
      l = acx - cw / 2; r = acx + cw / 2;
      t = acy - CHIP_H / 2; b = acy + CHIP_H / 2;
    }
    rects.push({ l, r, t, b });
  }
  return rects;
}

// ─────────────── Initial layout ───────────────
function initialPositions(n) {
  const { w, h } = getStageSize();
  const cx = w / 2, cy = h / 2;
  const r = Math.min(w, h) * 0.28;
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return {
      x: cx + Math.cos(a) * r,
      y: cy + Math.sin(a) * r * 0.7,
      vx: 0, vy: 0,
    };
  });
}

// ─────────────── Components ───────────────

function ActionChip({ label, ax, ay, align, visible, delay }) {
  let tx = '-50%', ty = '-50%';
  if (align === 'left-center')  { tx = '0%';    ty = '-50%'; }
  if (align === 'right-center') { tx = '-100%'; ty = '-50%'; }
  if (align === 'center-top')   { tx = '-50%';  ty = '0%'; }
  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        left: '50%', top: '50%',
        transform: visible
          ? `translate(${ax}px, ${ay}px) translate(${tx}, ${ty}) scale(1)`
          : `translate(0px, 0px) translate(-50%, -50%) scale(0.5)`,
        opacity: visible ? 1 : 0,
        transition: visible
          ? `transform 360ms cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms, opacity 180ms ease ${delay}ms`
          : 'transform 140ms ease, opacity 120ms ease',
        pointerEvents: visible ? 'auto' : 'none',
        padding: '5px 10px',
        borderRadius: 9999,
        border: `1px solid ${CHIP_BORDER}`,
        background: CHIP_BG,
        color: CHIP_FG,
        fontSize: 11, fontWeight: 600, letterSpacing: 0.2,
        whiteSpace: 'nowrap',
        boxShadow: '0 0 12px rgba(255,255,255,0.18)',
        userSelect: 'none',
      }}
    >
      {label}
    </div>
  );
}

const PlayerNode = React.forwardRef(function PlayerNode({
  name, open, dragging, onMouseDown, onTouchStart, onClick,
}, ref) {
  const pillRef = React.useRef(null);
  const [hw, setHw] = React.useState(48);
  React.useLayoutEffect(() => {
    if (pillRef.current) setHw(pillRef.current.offsetWidth / 2);
  }, [name]);
  const actions = React.useMemo(() => buildActions(hw), [hw]);

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute', left: 0, top: 0,
        transform: 'translate3d(0,0,0)',
        willChange: 'transform',
        zIndex: open || dragging ? 5 : 2,
      }}
    >
      {actions.map((a, i) => (
        <ActionChip
          key={a.id}
          label={a.label}
          ax={a.ax} ay={a.ay} align={a.align}
          visible={open}
          delay={i * 28}
        />
      ))}
      <div
        ref={pillRef}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onClick={onClick}
        style={{
          height: PILL_H,
          padding: '0 16px',
          boxSizing: 'border-box',
          borderRadius: 9999,
          border: `1.5px solid ${NEON}`,
          background: open ? 'rgba(57,255,20,0.10)' : 'rgba(57,255,20,0.02)',
          color: NEON,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          position: 'absolute', left: 0, top: 0,
          transform: dragging
            ? 'translate(-50%, -50%) scale(1.06)'
            : 'translate(-50%, -50%) scale(1)',
          fontFamily: '"SF Pro Text", -apple-system, system-ui, sans-serif',
          fontSize: 15, fontWeight: 600, letterSpacing: 0.2,
          whiteSpace: 'nowrap',
          userSelect: 'none', WebkitUserSelect: 'none',
          cursor: dragging ? 'grabbing' : 'grab',
          touchAction: 'none',
          boxShadow: dragging
            ? `0 0 0 2px rgba(57,255,20,0.30), 0 8px 22px rgba(0,0,0,0.55), 0 0 22px rgba(57,255,20,0.55)`
            : open
              ? `0 0 0 2px rgba(57,255,20,0.20), 0 0 18px rgba(57,255,20,0.45)`
              : '0 0 0 0 transparent',
          transition: 'box-shadow 160ms ease, background 160ms ease, transform 140ms ease',
        }}
      >
        {name}
      </div>
    </div>
  );
});

// ─────────────── Stage ───────────────
function Stage() {
  const N = PLAYERS.length;
  const posRef = React.useRef(initialPositions(N));
  const nodeRefs = React.useRef([]);
  if (nodeRefs.current.length !== N) {
    nodeRefs.current = Array.from({ length: N }, () => React.createRef());
  }

  const [openIdx, setOpenIdx] = React.useState(-1);
  const [dragIdx, setDragIdx] = React.useState(-1);
  const stateRef = React.useRef({ openIdx: -1, dragIdx: -1 });
  stateRef.current.openIdx = openIdx;
  stateRef.current.dragIdx = dragIdx;

  const dragInfo = React.useRef({ idx: -1, offX: 0, offY: 0, startX: 0, startY: 0, moved: false });

  // passes: array of {from, to}. Most recent at end. Max 2 kept (most recent
  // shown solid; previous shown faded; older are dropped).
  const passesRef = React.useRef([]);
  const lastOpenedRef = React.useRef(-1);
  const arrowRefs = React.useRef([null, null]); // SVG <path> nodes [recent, prev]
  const arrowHeadRefs = React.useRef([null, null]); // <polygon> nodes

  // Apply position ref to DOM nodes.
  const applyDOM = () => {
    const arr = posRef.current;
    for (let i = 0; i < arr.length; i++) {
      const el = nodeRefs.current[i].current;
      if (!el) continue;
      el.style.transform = `translate3d(${arr[i].x}px, ${arr[i].y}px, 0)`;
    }
  };

  // Physics + render loop
  React.useEffect(() => {
    let raf;
    let last = performance.now();
    const tick = (t) => {
      const dt = Math.min(0.04, (t - last) / 1000);
      last = t;
      const arr = posRef.current;
      const { w, h } = getStageSize();
      const cx = w / 2, cy = h / 2;
      const drag = dragInfo.current.idx;
      const open = stateRef.current.openIdx;

      // Forces on each particle
      for (let i = 0; i < arr.length; i++) {
        if (i === drag) continue;       // user owns this one
        if (i === open) continue;       // pinned

        const p = arr[i];

        // spring to center
        p.vx += (cx - p.x) * CENTER_K * dt;
        p.vy += (cy - p.y) * CENTER_K * dt;

        // simple pairwise repulsion
        for (let j = 0; j < arr.length; j++) {
          if (j === i) continue;
          const q = arr[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < REPULSE_R * REPULSE_R && d2 > 0.01) {
            const d = Math.sqrt(d2);
            const f = (REPULSE_R - d) / REPULSE_R;
            p.vx += (dx / d) * f * REPULSE_K * dt;
            p.vy += (dy / d) * f * REPULSE_K * dt;
          }
        }

        // friction
        p.vx *= FRICTION;
        p.vy *= FRICTION;

        // integrate
        p.x += p.vx * dt * 60;
        p.y += p.vy * dt * 60;

        // soft bounds
        const mB = 30;
        if (p.x < mB) { p.x = mB; p.vx *= -0.3; }
        if (p.x > w - mB) { p.x = w - mB; p.vx *= -0.3; }
        if (p.y < mB) { p.y = mB; p.vy *= -0.3; }
        if (p.y > h - mB) { p.y = h - mB; p.vy *= -0.3; }
      }

      // Positional-only: push pills out of the open pill's chip rectangles.
      // No velocity changes — just teleport them out by the overlap amount.
      // This guarantees no overlap with chips without creating constant
      // repulsion forces.
      if (open >= 0) {
        const o = arr[open];
        const ohw = pillHalfWidth(PLAYERS[open]);
        const rects = openZoneRects(o.x, o.y, ohw);
        for (let i = 0; i < arr.length; i++) {
          if (i === drag || i === open) continue;
          const p = arr[i];
          const phw = pillHalfWidth(PLAYERS[i]);
          const pl = p.x - phw - BUFFER, pr = p.x + phw + BUFFER;
          const pt = p.y - HH - BUFFER,  pb = p.y + HH + BUFFER;
          for (const rc of rects) {
            const rl = rc.l, rr = rc.r, rt = rc.t, rb = rc.b;
            const ox = Math.min(pr, rr) - Math.max(pl, rl);
            const oy = Math.min(pb, rb) - Math.max(pt, rt);
            if (ox > 0 && oy > 0) {
              const rcx = (rl + rr) / 2;
              const rcy = (rt + rb) / 2;
              if (oy < ox) {
                const sgn = p.y === rcy ? 1 : Math.sign(p.y - rcy);
                p.y += sgn * oy;
                // kill velocity heading back into the rect
                if (Math.sign(p.vy) !== sgn && p.vy !== 0) p.vy = 0;
              } else {
                const sgn = p.x === rcx ? 1 : Math.sign(p.x - rcx);
                p.x += sgn * ox;
                if (Math.sign(p.vx) !== sgn && p.vx !== 0) p.vx = 0;
              }
            }
          }
        }
      }

      // Update pass arrows: write `d` and arrowhead onto the SVG nodes,
      // and apply a soft repulsion to pills near the most-recent arrow.
      const passes = passesRef.current;
      const REPEL_NEAR = 32; // px from arrow path
      const REPEL_K2   = 900;
      // Render arrows
      for (let k = 0; k < 2; k++) {
        const path = arrowRefs.current[k];
        const head = arrowHeadRefs.current[k];
        if (!path || !head) continue;
        // Most recent is the LAST entry. arrowRefs[0] = recent, [1] = previous.
        const passIdx = passes.length - 1 - k;
        const pass = passes[passIdx];
        if (!pass) {
          path.setAttribute('opacity', '0');
          head.setAttribute('opacity', '0');
          continue;
        }
        const a = arr[pass.from], b = arr[pass.to];
        if (!a || !b) continue;
        const halfA = { hw: pillHalfWidth(PLAYERS[pass.from]), hh: HH };
        const halfB = { hw: pillHalfWidth(PLAYERS[pass.to]),   hh: HH };
        const geom = computeArrowPath(a.x, a.y, b.x, b.y, halfA, halfB);
        path.setAttribute('d', geom.d);
        path.setAttribute('opacity', k === 0 ? '1' : '0.35');
        head.setAttribute('points', geom.head);
        head.setAttribute('opacity', k === 0 ? '1' : '0.35');
      }
      // Pills repel from points along the most-recent arrow
      if (passes.length > 0) {
        const recent = passes[passes.length - 1];
        const a = arr[recent.from], b = arr[recent.to];
        if (a && b) {
          const halfA = { hw: pillHalfWidth(PLAYERS[recent.from]), hh: HH };
          const halfB = { hw: pillHalfWidth(PLAYERS[recent.to]),   hh: HH };
          const geom = computeArrowPath(a.x, a.y, b.x, b.y, halfA, halfB);
          const pts = sampleBezier(geom.start.x, geom.start.y, geom.control.x, geom.control.y, geom.end.x, geom.end.y, 10);
          for (let i = 0; i < arr.length; i++) {
            if (i === drag || i === recent.from || i === recent.to || i === open) continue;
            const p = arr[i];
            for (const pt of pts) {
              const dx = p.x - pt.x, dy = p.y - pt.y;
              const d2 = dx * dx + dy * dy;
              if (d2 < REPEL_NEAR * REPEL_NEAR && d2 > 0.01) {
                const d = Math.sqrt(d2);
                const f = (REPEL_NEAR - d) / REPEL_NEAR;
                p.vx += (dx / d) * f * REPEL_K2 * dt;
                p.vy += (dy / d) * f * REPEL_K2 * dt;
              }
            }
          }
        }
      }

      applyDOM();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Place initially
  React.useLayoutEffect(() => { applyDOM(); }, []);

  // Re-center on resize
  React.useEffect(() => {
    const onR = () => {
      // gentle: nothing — physics will pull them in
    };
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
  }, []);

  // ─── Drag handlers ───
  const eventXY = (e) => {
    if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    if (e.changedTouches && e.changedTouches[0]) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  };

  const beginDrag = (i, e) => {
    e.stopPropagation();
    e.preventDefault();
    const { x, y } = eventXY(e);
    const p = posRef.current[i];
    dragInfo.current = {
      idx: i, offX: x - p.x, offY: y - p.y,
      startX: x, startY: y, moved: false,
    };
    setDragIdx(i);

    const onMove = (ev) => {
      const idx = dragInfo.current.idx;
      if (idx < 0) return;
      const xy = eventXY(ev);
      if (!dragInfo.current.moved) {
        const dist = Math.hypot(xy.x - dragInfo.current.startX, xy.y - dragInfo.current.startY);
        if (dist > TAP_THRESH) dragInfo.current.moved = true;
      }
      const p = posRef.current[idx];
      p.x = xy.x - dragInfo.current.offX;
      p.y = xy.y - dragInfo.current.offY;
      p.vx = 0; p.vy = 0;
      // direct DOM write — don't wait for next physics tick
      const el = nodeRefs.current[idx].current;
      if (el) el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
      ev.preventDefault && ev.preventDefault();
    };

    const onEnd = () => {
      const wasDrag = dragInfo.current.moved;
      dragInfo.current.idx = -1;
      setDragIdx(-1);
      // If we dragged, the click event that follows on mouseup should be suppressed.
      // We do this by capturing the next click on the document.
      if (wasDrag) {
        const swallow = (ev) => {
          ev.stopPropagation();
          ev.preventDefault();
          document.removeEventListener('click', swallow, true);
        };
        document.addEventListener('click', swallow, true);
      }
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('mouseup', onEnd, true);
      document.removeEventListener('touchmove', onMove, true);
      document.removeEventListener('touchend', onEnd, true);
      document.removeEventListener('touchcancel', onEnd, true);
    };

    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('mouseup', onEnd, true);
    document.addEventListener('touchmove', onMove, { capture: true, passive: false });
    document.addEventListener('touchend', onEnd, true);
    document.addEventListener('touchcancel', onEnd, true);
  };

  const onPillClick = (i) => (e) => {
    e.stopPropagation();
    if (dragInfo.current.moved) return;
    setOpenIdx(prev => {
      const next = prev === i ? -1 : i;
      // Record a pass when OPENING a new pill (not closing).
      if (next !== -1 && lastOpenedRef.current !== -1 && lastOpenedRef.current !== next) {
        const arr = passesRef.current.slice();
        arr.push({ from: lastOpenedRef.current, to: next });
        // keep at most 2 most-recent
        while (arr.length > 2) arr.shift();
        passesRef.current = arr;
      }
      if (next !== -1) lastOpenedRef.current = next;
      return next;
    });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', overflow: 'hidden' }}>
      {/* Pass arrows overlay */}
      <svg
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          pointerEvents: 'none', zIndex: 1,
        }}
      >
        {/* recent (solid) */}
        <path
          ref={el => arrowRefs.current[0] = el}
          d=""
          fill="none"
          stroke={NEON}
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0"
          style={{ filter: 'drop-shadow(0 0 6px rgba(57,255,20,0.55))' }}
        />
        <polygon
          ref={el => arrowHeadRefs.current[0] = el}
          points=""
          fill={NEON}
          opacity="0"
          style={{ filter: 'drop-shadow(0 0 6px rgba(57,255,20,0.55))' }}
        />
        {/* previous (faded) */}
        <path
          ref={el => arrowRefs.current[1] = el}
          d=""
          fill="none"
          stroke={NEON}
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0"
          strokeDasharray="4 4"
        />
        <polygon
          ref={el => arrowHeadRefs.current[1] = el}
          points=""
          fill={NEON}
          opacity="0"
        />
      </svg>
      {PLAYERS.map((name, i) => (
        <PlayerNode
          key={i}
          ref={nodeRefs.current[i]}
          name={name}
          open={openIdx === i}
          dragging={dragIdx === i}
          onMouseDown={(e) => beginDrag(i, e)}
          onTouchStart={(e) => beginDrag(i, e)}
          onClick={onPillClick(i)}
        />
      ))}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<Stage />);
