// Full-screen takeover when the device is in portrait orientation. The whole
// app is designed around landscape; portrait would mangle the three-pane
// layout, so we just block it with a rotate prompt.
//
// Pure CSS visibility — toggles via Tailwind's `portrait:` variant. No JS
// listeners, no resize hooks, no flicker.

export function RotateOverlay() {
  return (
    <div
      className="hidden portrait:flex fixed inset-0 z-[100] flex-col items-center justify-center gap-4 px-6 text-center"
      style={{ background: 'var(--color-bg)', color: 'var(--color-content)' }}
    >
      <RotateIcon />
      <div className="text-lg font-bold">Rotate your device</div>
      <div className="text-sm" style={{ color: 'var(--color-muted)' }}>
        Ultimate Stat Tracker is designed for landscape orientation.
      </div>
    </div>
  )
}

function RotateIcon() {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ color: 'var(--color-muted)' }}
    >
      {/* Phone outline */}
      <rect x="6" y="2" width="12" height="20" rx="2" />
      {/* Curved arrow indicating rotation */}
      <path d="M3 14a9 9 0 0 1 9-9" transform="translate(8 -3)" />
      <path d="M19 8l2 -3 -3 -2" />
    </svg>
  )
}
