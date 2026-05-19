import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

type ButtonVariant = 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive'
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

const variants: Record<ButtonVariant, string> = {
  default: 'bg-emerald-700 text-white hover:bg-emerald-800 dark:bg-emerald-300 dark:text-emerald-950',
  secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-50',
  outline: 'border border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900',
  ghost: 'hover:bg-slate-100 dark:hover:bg-slate-800',
  destructive: 'bg-red-600 text-white hover:bg-red-700',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5',
  icon: 'h-10 w-10 p-0',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
)

Button.displayName = 'Button'
