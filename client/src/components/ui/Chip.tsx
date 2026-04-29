import type { ReactNode } from 'react'

interface ChipProps {
  children: ReactNode
  color?: string
  className?: string
}

// Chip uses an inline color style so team colors work dynamically.
export function Chip({ children, color = '#666666', className = '' }: ChipProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-px rounded-full text-[10px] font-mono
        whitespace-nowrap border tracking-wide ${className}`}
      style={{
        background: `${color}1a`,
        color,
        borderColor: `${color}33`,
      }}
    >
      {children}
    </span>
  )
}
