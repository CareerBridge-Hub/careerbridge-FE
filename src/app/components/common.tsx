import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/app/lib/utils'

/** Same mark and wordmark files as the landing header. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <img src="/assets/group-1116.svg" alt="" className="size-8 shrink-0" />
      <img src="/assets/careerbridge/logo-text.svg" alt="CareerBridge" className="h-[17px] w-auto" />
    </span>
  )
}

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Counts up from 0 (or the previous value) to `value`; jumps straight there under reduced motion. */
function useAnimatedNumber(value: number, duration = 800) {
  const [shown, setShown] = useState(() => (reducedMotion() ? value : 0))
  const current = useRef(shown)
  useEffect(() => {
    const from = current.current
    if (reducedMotion() || from === value) {
      current.current = value
      setShown(value)
      return
    }
    let raf = 0
    const start = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration)
      current.current = Math.round(from + (value - from) * (1 - (1 - p) ** 3))
      setShown(current.current)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])
  return shown
}

function scoreTone(score: number) {
  return score >= 70 ? 'bg-mint' : score >= 40 ? 'bg-chart-5' : 'bg-chart-4'
}

/** Progress bar that grows in on mount. `value` is 0–100. */
export function ScoreBar({ value, className, label }: { value: number; className?: string; label: string }) {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const raf = requestAnimationFrame(() => setWidth(value))
    return () => cancelAnimationFrame(raf)
  }, [value])
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-secondary', className)}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-700 ease-out', scoreTone(value))}
        style={{ width: `${width}%` }}
      />
    </div>
  )
}

export function Score({ value, className }: { value: number; className?: string }) {
  const n = useAnimatedNumber(value)
  return <span className={cn('font-display tabular-nums', className)}>{n}%</span>
}

type SkillTone = 'owned' | 'wajib' | 'opsional' | 'neutral'

const toneClass: Record<SkillTone, string> = {
  owned: 'border-mint/60 bg-mint-soft text-mint-ink',
  wajib: 'border-danger-ink/25 bg-danger-soft text-danger-ink',
  opsional: 'border-border bg-secondary text-muted-foreground',
  neutral: 'border-border bg-card text-foreground',
}

export function SkillBadge({
  children,
  tone = 'neutral',
  className,
  action,
}: {
  children: ReactNode
  tone?: SkillTone
  className?: string
  action?: ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex h-7 items-center gap-1 rounded-full border px-3 text-[13px] font-medium whitespace-nowrap',
        toneClass[tone],
        action && 'pr-1',
        className,
      )}
    >
      {tone === 'owned' && <Check className="size-3.5" aria-hidden="true" />}
      {children}
      {action}
    </span>
  )
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-2xl tracking-tight sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function EmptyState({
  title,
  children,
  action,
  image = 'kucing-soon',
  className,
}: {
  title: string
  children?: ReactNode
  action?: ReactNode
  image?: 'kucing-soon' | 'kucing-reviews' | 'kucing-outro-wink'
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-xl border border-dashed bg-card px-6 py-10 text-center',
        className,
      )}
    >
      <img src={`/assets/careerbridge/${image}.webp`} alt="" className="mb-3 h-24 w-auto" />
      <h3 className="font-display text-lg">{title}</h3>
      {children && <div className="mt-1 max-w-sm text-sm text-muted-foreground">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Stat({ label, value, hint, icon }: { label: string; value: ReactNode; hint?: ReactNode; icon: ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between text-[13px] text-muted-foreground">
        {label}
        <span className="grid size-8 place-items-center rounded-lg bg-secondary text-foreground [&_svg]:size-4">{icon}</span>
      </div>
      <div className="mt-2 truncate font-display text-2xl">{value}</div>
      {hint && <div className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</div>}
    </div>
  )
}

/** Label + control + inline error. The control should set aria-invalid / aria-describedby itself via `errorId`. */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
}: {
  label: ReactNode
  htmlFor: string
  error?: string
  hint?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('grid gap-1.5', className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="animate-in fade-in text-[13px] text-destructive">
          {error}
        </p>
      ) : (
        hint && <p className="text-[13px] text-muted-foreground">{hint}</p>
      )}
    </div>
  )
}

export function FormError({ children }: { children?: ReactNode }) {
  if (!children) return null
  return (
    <div role="alert" className="animate-in fade-in rounded-lg border border-destructive/25 bg-danger-soft px-3 py-2.5 text-sm text-danger-ink">
      {children}
    </div>
  )
}
