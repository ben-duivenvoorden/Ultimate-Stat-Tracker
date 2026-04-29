import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'default' | 'primary' | 'ghost' | 'success' | 'warn' | 'danger' | 'block'
type Size    = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface BtnProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children: ReactNode
  variant?: Variant
  size?: Size
  full?: boolean
}

const variantClasses: Record<Variant, string> = {
  default: 'bg-surf-3 text-content border-border-2 hover:bg-surf-2',
  primary: 'bg-team-a text-white border-transparent hover:opacity-90',
  ghost:   'bg-transparent text-muted border-border hover:text-content hover:border-border-2',
  success: 'bg-success text-white border-transparent hover:opacity-90',
  warn:    'bg-warn text-bg border-transparent hover:opacity-90',
  danger:  'bg-danger text-white border-transparent hover:opacity-90',
  block:   'bg-block text-white border-transparent hover:opacity-90',
}

const sizeClasses: Record<Size, string> = {
  xs: 'h-7 px-2 text-[11px]',
  sm: 'h-8 px-3 text-xs',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-5 text-[15px]',
  xl: 'h-14 px-6 text-base',
}

export function Btn({
  children,
  variant = 'default',
  size = 'md',
  full = false,
  disabled,
  className = '',
  ...rest
}: BtnProps) {
  return (
    <button
      {...rest}
      disabled={disabled}
      className={[
        'inline-flex items-center justify-center rounded-lg border font-semibold',
        'whitespace-nowrap transition-opacity select-none cursor-pointer',
        'disabled:opacity-30 disabled:cursor-default',
        variantClasses[variant],
        sizeClasses[size],
        full ? 'w-full' : '',
        className,
      ].join(' ')}
    >
      {children}
    </button>
  )
}
