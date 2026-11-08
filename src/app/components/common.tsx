import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/app/lib/utils'
import { Skeleton } from '@/app/components/ui/skeleton'

/** Same mark and wordmark files as the landing header. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <img src="/assets/group-1116.svg" alt="" className="size-8 shrink-0" />
      <img src="/assets/careerbridge/logo-text.svg" alt="CareerBridge" className="h-[17px] w-auto" />
    </span>
  )
}

/** Visible, announced loading label. Sits above a skeleton so everyone knows what is coming. */
export function LoadingNote({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p role="status" className={cn('inline-flex items-center gap-2 text-[13px] text-muted-foreground', className)}>
      <span className="relative flex size-2" aria-hidden>
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-mint opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-mint" />
      </span>
      {children}
    </p>
  )
}

const CHIP_WIDTHS = [88, 64, 104, 72, 96, 56, 80, 112, 68, 92, 60, 84]
/** Placeholder for a wrap of skill badges. */
export function ChipsSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="flex flex-wrap gap-1.5" aria-hidden>
      {CHIP_WIDTHS.slice(0, count).map((w, i) => (
        <Skeleton key={i} className="h-7 rounded-full" style={{ width: w }} />
      ))}
    </div>
  )
}

/**
 * Page we cannot predict yet (route chunk loading, admin catalog): title, description and two
 * plain panels. Neutral on purpose, so it never pretends to be a dashboard on the CV page.
 */
export function PageSkeleton({ label = 'Memuat halaman...' }: { label?: string }) {
  return (
    <div className="grid gap-4">
      <LoadingNote>{label}</LoadingNote>
      <div className="grid gap-4" aria-hidden>
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-96 max-w-full" />
        <div className="mt-2 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:items-start">
          {[3, 5].map((lines, i) => (
            <div key={i} className="grid content-start gap-3 rounded-xl border bg-card p-6">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3.5 w-56 max-w-full" />
              {Array.from({ length: lines }, (_, j) => (
                <Skeleton key={j} className="h-4" style={{ width: `${92 - j * 12}%` }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Reload before the session is known: AppLayout is not mounted yet, so draw its frame (sidebar,
 * top bar, same content width and padding) and keep the page from flashing full-bleed.
 */
export function AppShellSkeleton() {
  return (
    <div className="flex min-h-dvh">
      <aside className="hidden w-64 shrink-0 flex-col gap-6 border-r bg-sidebar p-3 md:flex" aria-hidden>
        <div className="flex h-8 items-center">
          <Logo />
        </div>
        <div className="grid gap-2">
          <Skeleton className="mb-1 h-3 w-12" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-2 px-2 py-1.5">
              <Skeleton className="size-4 rounded" />
              <Skeleton className="h-3.5" style={{ width: 70 + ((i * 23) % 50) }} />
            </div>
          ))}
        </div>
        <div className="mt-auto flex items-center gap-2 px-2 py-1.5">
          <Skeleton className="size-8 rounded-lg" />
          <div className="grid flex-1 gap-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-2.5 w-32" />
          </div>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="flex h-14 items-center gap-3 border-b px-4 sm:px-6" aria-hidden>
          <Skeleton className="size-7 rounded-md" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          <PageSkeleton label="Memeriksa sesi..." />
        </div>
      </div>
    </div>
  )
}

/** Header, four stat tiles and a chart panel: the shape of Beranda. */
export function DashboardSkeleton({ label }: { label: string }) {
  return (
    <div className="grid gap-4">
      <LoadingNote>{label}</LoadingNote>
      <div className="grid gap-4" aria-hidden>
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
        <div className="mt-2 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="grid gap-3 rounded-xl border bg-card p-4">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-7 w-14" />
              <Skeleton className="h-3 w-28 max-w-full" />
            </div>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <Skeleton className="h-72 rounded-xl" />
          <div className="grid content-start gap-4 rounded-xl border bg-card p-6">
            <Skeleton className="h-5 w-48" />
            {[90, 70, 55, 40, 30].map((w) => (
              <Skeleton key={w} className="h-6 rounded-md" style={{ width: `${w}%` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Grid of card placeholders shaped like the job, training and vacancy cards. */
export function CardGridSkeleton({ label, count = 6, cols = 'sm:grid-cols-2 lg:grid-cols-3' }: { label: string; count?: number; cols?: string }) {
  return (
    <div className="grid gap-3">
      <LoadingNote>{label}</LoadingNote>
      <div className={cn('grid gap-3', cols)} aria-hidden>
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="grid gap-3 rounded-xl border bg-card p-5">
            <div className="flex justify-between">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-3.5 w-16" />
            </div>
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="mt-2 h-2 w-full rounded-full" />
            <div className="mt-2 flex justify-between border-t pt-4">
              <Skeleton className="h-8 w-28 rounded-lg" />
              <Skeleton className="h-4 w-14" />
            </div>
          </div>
        ))}
      </div>
    </div>
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
