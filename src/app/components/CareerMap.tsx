import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight, ChevronDown, ExternalLink, Sparkles, Star } from 'lucide-react'
import { TargetButton } from '@/app/components/cards'
import { EmptyState, LoadingNote, Score, SkillBadge } from '@/app/components/common'
import { Button } from '@/app/components/ui/button'
import { Skeleton } from '@/app/components/ui/skeleton'
import { fetchMatchesPage, fetchVacanciesPage, type Analysis } from '@/app/lib/api'
import {
  BAND,
  RINGS,
  defaultSelection,
  insights,
  layoutOrbit,
  planCost,
  planSteps,
  projectedScore,
  ringOf,
  type OrbitNode,
  type Ring,
} from '@/app/lib/careerMap'
import { rupiah } from '@/app/lib/format'
import { useAnalysis, useCareer, useServerPage } from '@/app/lib/hooks'
import type { JobMatch } from '@/app/lib/matching'
import type { Institution, Skill } from '@/app/lib/types'
import { cn } from '@/app/lib/utils'

// The orbit stays readable up to about ten labels; the rest live on the Pekerjaan page.
const TOP = { limit: 10 }

export default function PetaKarir() {
  const { user, skillsById } = useCareer()
  const top = useServerPage(fetchMatchesPage, TOP, user.skills.length > 0)
  const items = (top.data?.items ?? []).filter((m) => m.score > 0)
  // The chosen target always appears on the map, even when it is outside the top ten.
  const targetMissing = !!user.targetJobId && !!top.data && !items.some((m) => m.job.id === user.targetJobId)
  const extra = useServerPage(fetchMatchesPage, { ids: user.targetJobId ?? '', limit: 1 }, targetMissing)
  const matches = targetMissing && extra.data ? [...items, ...extra.data.items] : items
  const [picked, setPicked] = useState<string | null>(null)
  const selectedId = picked && matches.some((m) => m.job.id === picked) ? picked : defaultSelection(matches, user.targetJobId)

  const header = (
    <div className="mb-6">
      <h1 className="font-display text-2xl tracking-tight sm:text-[28px]">Peta karir</h1>
      <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
        Pekerjaan yang bisa kamu tuju dari {user.skills.length} skill-mu sekarang, dan jalan ke sana.
      </p>
    </div>
  )

  if (user.skills.length === 0)
    return (
      <>
        {header}
        <EmptyState
          title="Peta karir butuh skill-mu dulu"
          action={<Button asChild><Link to="/cv">Upload CV</Link></Button>}
        >
          Upload CV atau pilih skill sendiri. Setelah itu peta menunjukkan pekerjaan yang bisa kamu tuju.
        </EmptyState>
      </>
    )
  if (top.loading) return <>{header}<MapSkeleton /></>
  if (top.error)
    return (
      <>
        {header}
        <p role="alert" className="rounded-xl border border-dashed bg-card p-6 text-sm">
          {top.error} <button className="underline" onClick={top.retry}>Coba lagi</button>
        </p>
      </>
    )
  if (matches.length === 0)
    return (
      <>
        {header}
        <EmptyState title="Belum ada pekerjaan yang nyambung" action={<Button asChild variant="outline"><Link to="/cv">Tambah skill</Link></Button>}>
          Skill-mu belum dipakai di pekerjaan mana pun di katalog. Tambah skill lain supaya peta terisi.
        </EmptyState>
      </>
    )

  const selected = matches.find((m) => m.job.id === selectedId) ?? matches[0]

  return (
    <>
      {header}
      <Summary matches={matches} skillsById={skillsById} />
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-4">
          <ul className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-muted-foreground">
            <li><b className="font-medium text-foreground">Jarak ke tengah</b>: jumlah skill wajib yang belum kamu punya, bukan persentase cocok</li>
            <li><b className="font-medium text-foreground">Titik di garis</b>: skill wajib yang masih kurang</li>
          </ul>
          <Orbit matches={matches} selected={selected} targetId={user.targetJobId} onSelect={setPicked} />
          <p className="mt-4 text-center text-[13px] text-muted-foreground">
            Menampilkan {matches.length} pekerjaan paling cocok.{' '}
            <Link to="/pekerjaan" className="font-medium text-foreground underline underline-offset-2">Lihat semua pekerjaan</Link>
          </p>
        </div>
        <Detail key={selected.job.id} m={selected} isTarget={user.targetJobId === selected.job.id} />
      </div>
    </>
  )
}

function Summary({ matches, skillsById }: { matches: JobMatch[]; skillsById: Map<string, Skill> }) {
  const { counts, strongest, sharedGap } = insights(matches)
  const name = (id: string) => skillsById.get(id)?.nama ?? 'Skill'
  const gapJobs = sharedGap
    ? sharedGap.jobNames.length === 2
      ? sharedGap.jobNames.join(' dan ')
      : `${sharedGap.jobNames.slice(0, 2).join(', ')}, dan ${sharedGap.jobNames.length - 2} lainnya`
    : ''
  return (
    <div className="grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(0,1fr))]">
      <section className="rounded-xl bg-card p-4">
        <h2 className="text-[13px] text-muted-foreground">Tujuan yang terbuka</h2>
        <p className="mt-1 font-display text-2xl tabular-nums">
          {matches.length} <span className="font-sans text-sm font-normal text-muted-foreground">pekerjaan</span>
        </p>
        <ul className="mt-1.5 grid gap-0.5 text-[13px]">
          {(Object.keys(RINGS) as Ring[]).map((r) => (
            <li key={r} className="flex items-center gap-2 tabular-nums">
              <RingDot ring={r} /> {counts[r]} {RINGS[r].label.toLowerCase()}
            </li>
          ))}
        </ul>
      </section>
      {strongest && (
        <section className="rounded-xl bg-card p-4">
          <h2 className="text-[13px] text-muted-foreground">Skill terkuatmu</h2>
          <p className="mt-1 font-display text-lg leading-snug">{name(strongest.skillId)}</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Dipakai di {strongest.jobs} dari {matches.length} tujuan di peta.
          </p>
        </section>
      )}
      {sharedGap && (
        <section className="rounded-xl bg-mint-soft p-4">
          <h2 className="text-[13px] text-mint-ink">Satu skill, beberapa pintu</h2>
          <p className="mt-1 font-display text-lg leading-snug">{name(sharedGap.skillId)}</p>
          <p className="mt-1 text-[13px] text-[#14523a]">
            Skill wajib yang masih kurang di {gapJobs}. Kuasai sekali, {sharedGap.jobNames.length} tujuan makin dekat.
          </p>
        </section>
      )}
    </div>
  )
}

function RingDot({ ring }: { ring: Ring }) {
  return <span aria-hidden className="inline-block size-2.5 shrink-0 rounded-full border-[2.5px] bg-card" style={{ borderColor: RINGS[ring].color }} />
}

/** Below this orbit width names do not fit; nodes show the score only and a list carries the names. */
const COMPACT_BELOW = 440

/** Orbit width in px, tracked so the collision layout uses the real size. */
function useWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(520)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}

function Orbit({ matches, selected, targetId, onSelect }: { matches: JobMatch[]; selected: JobMatch; targetId: string | null; onSelect: (id: string) => void }) {
  const [ref, width] = useWidth()
  const compact = width < COMPACT_BELOW
  const { nodes, captions } = useMemo(() => layoutOrbit(matches, width, compact), [matches, width, compact])
  const sel = nodes.find((n) => n.match.job.id === selected.job.id) ?? nodes[0]
  const stops = sel.match.missingWajib.length
  return (
    <>
      <div ref={ref} className="relative mx-auto my-5 aspect-square w-full max-w-[580px]">
        <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" aria-hidden>
          <circle cx="50" cy="50" r={BAND.jauh * 100} className="fill-none stroke-foreground/20" strokeDasharray="5 6" vectorEffect="non-scaling-stroke" strokeWidth="1.5" />
          <circle cx="50" cy="50" r={BAND.dekat * 100} className="fill-none stroke-foreground/20" strokeDasharray="5 6" vectorEffect="non-scaling-stroke" strokeWidth="1.5" />
          <circle cx="50" cy="50" r={BAND.siap * 100} className="fill-mint-soft/60 stroke-mint" vectorEffect="non-scaling-stroke" strokeWidth="1.5" />
          <line x1="50" y1="50" x2={sel.x} y2={sel.y} className="stroke-primary" strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          {Array.from({ length: stops }, (_, i) => {
            const t = 0.3 + 0.5 * ((i + 1) / (stops + 1))
            return <circle key={i} cx={50 + (sel.x - 50) * t} cy={50 + (sel.y - 50) * t} r={(6 / width) * 100} className="fill-card stroke-primary" strokeWidth="3" vectorEffect="non-scaling-stroke" />
          })}
        </svg>
        <div className="absolute top-1/2 left-1/2 grid aspect-square w-[19%] -translate-1/2 place-content-center rounded-full bg-primary text-center text-white">
          <b className="font-display text-sm leading-tight sm:text-base">Kamu</b>
        </div>
        {/* Zone captions sit on their ring line; the layout keeps every node clear of them. */}
        {captions.map((c) => (
          <span
            key={c.ring}
            aria-hidden
            className="pointer-events-none absolute z-[5] flex h-[22px] w-max -translate-1/2 items-center gap-1.5 rounded-full border bg-card px-2.5 text-[11px] font-medium text-foreground shadow-sm"
            style={{ left: `${c.x}%`, top: `${c.y}%` }}
          >
            <RingDot ring={c.ring} />
            {RINGS[c.ring].label}
          </span>
        ))}
        {nodes.map((n) => {
          const on = n.match.job.id === sel.match.job.id
          const target = n.match.job.id === targetId
          return (
            <button
              key={n.match.job.id}
              type="button"
              onClick={() => onSelect(n.match.job.id)}
              aria-pressed={on}
              aria-label={`${n.match.job.nama}, ${n.match.job.bidang}, ${n.match.score}% cocok, ${RINGS[n.ring].label}${target ? ', incaranmu' : ''}`}
              title={`${n.match.job.nama} (${n.match.job.bidang})`}
              className={cn(
                // w-max: near the right edge an absolute box would otherwise shrink and clip its text
                'absolute z-10 flex w-max -translate-1/2 items-center gap-1.5 border-2 bg-card text-left shadow-sm transition-[scale,box-shadow] hover:z-30 hover:scale-105 focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none',
                compact ? 'rounded-full p-0.5' : 'rounded-2xl py-1 pr-3 pl-1',
                on && 'z-20 border-primary bg-primary text-white shadow-lg shadow-primary/25',
              )}
              style={{ left: `${n.x}%`, top: `${n.y}%`, borderColor: on ? undefined : RINGS[n.ring].color }}
            >
              <span className={cn('shrink-0 rounded-full px-1.5 text-[11px] leading-[18px] font-semibold tabular-nums', on ? 'bg-mint text-primary' : 'text-white')} style={on ? undefined : { background: RINGS[n.ring].color }}>
                {n.match.score}%
              </span>
              {!compact && (
                <span className="grid max-w-[8.5rem] min-w-0">
                  <span className="line-clamp-2 text-xs leading-[15px] font-semibold">
                    {target && <Star aria-hidden className="mr-0.5 inline size-3 -translate-y-px fill-mint text-mint-ink" />}
                    {n.match.job.nama}
                  </span>
                  <span className={cn('truncate text-[10.5px] leading-[14px]', on ? 'text-white/75' : 'text-muted-foreground')}>{n.match.job.bidang}</span>
                </span>
              )}
            </button>
          )
        })}
      </div>
      <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
        {(Object.keys(RINGS) as Ring[]).map((r) => (
          <li key={r} className="flex items-center gap-1.5"><RingDot ring={r} />{RINGS[r].label}</li>
        ))}
        {targetId && <li className="flex items-center gap-1.5"><Star aria-hidden className="size-3 fill-mint text-mint-ink" />Incaranmu</li>}
      </ul>
      {compact && <MobileList nodes={nodes} selectedId={sel.match.job.id} onSelect={onSelect} />}
    </>
  )
}

/** On narrow screens the orbit only shows percentages, so names are picked from this list. */
function MobileList({ nodes, selectedId, onSelect }: { nodes: OrbitNode[]; selectedId: string; onSelect: (id: string) => void }) {
  return (
    <div className="mt-4 grid gap-1.5">
      {[...nodes].sort((a, b) => b.match.score - a.match.score).map((n) => (
        <button
          key={n.match.job.id}
          type="button"
          aria-pressed={n.match.job.id === selectedId}
          onClick={() => onSelect(n.match.job.id)}
          className={cn('flex items-center gap-2.5 rounded-xl border bg-card px-3 py-2.5 text-left text-sm', n.match.job.id === selectedId && 'border-primary ring-1 ring-primary')}
        >
          <RingDot ring={n.ring} />
          <span className="flex-1 font-medium">{n.match.job.nama}</span>
          <span className="text-muted-foreground tabular-nums">{n.match.score}%</span>
        </button>
      ))}
    </div>
  )
}

function Detail({ m, isTarget }: { m: JobMatch; isTarget: boolean }) {
  const { skillsById, instById } = useCareer()
  const ring = ringOf(m)
  const id = m.job.id
  const analysis = useAnalysis(id)
  const vacancies = useServerPage(fetchVacanciesPage, { occupation: id, limit: 2 })
  const name = (skillId: string) => skillsById.get(skillId)?.nama ?? 'Skill'
  const totalSkills = m.owned.length + m.missingWajib.length + m.missingOpsional.length
  const [first, ...rest] = (analysis.data?.explanation ?? '').split('\n\n')

  return (
    <article className="rounded-2xl border bg-card p-5 sm:p-6" aria-live="polite">
      <header className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl leading-tight sm:text-[22px]">{m.job.nama}</h2>
          <p className="mt-1.5 flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-0.5 font-medium text-foreground">
              <RingDot ring={ring} /> {RINGS[ring].label}
              <span className="font-normal text-muted-foreground">· {m.missingWajib.length ? `${m.missingWajib.length} skill wajib lagi` : 'skill wajib lengkap'}</span>
            </span>
            {m.job.bidang}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <Score value={m.score} className="text-3xl leading-none" />
          <p className="text-xs text-muted-foreground">cocok</p>
        </div>
      </header>
      {m.job.deskripsi && <p className="mt-3 text-sm text-muted-foreground">{m.job.deskripsi}</p>}
      {m.job.custom && <p className="mt-2 text-xs text-muted-foreground">Pekerjaan pribadimu dari CV. Syarat skill-nya perkiraan AI, bukan standar resmi.</p>}

      <Why analysis={analysis} first={first} rest={rest} />

      <section className="mt-6">
        <h3 className="flex items-baseline justify-between gap-2 text-sm font-medium">
          Skill yang sudah kamu bawa
          <span className="text-xs font-normal text-muted-foreground tabular-nums">{m.owned.length} dari {totalSkills}</span>
        </h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {m.owned.map((s) => <SkillBadge key={s.skillId} tone="owned">{name(s.skillId)}</SkillBadge>)}
          {m.missingWajib.map((s) => <SkillBadge key={s.skillId} tone="wajib">{name(s.skillId)}</SkillBadge>)}
          {m.missingOpsional.map((s) => <SkillBadge key={s.skillId} tone="opsional">{name(s.skillId)}</SkillBadge>)}
        </div>
        <div className="mt-3 flex gap-[3px]" aria-hidden>
          {m.owned.map((s) => <i key={s.skillId} className="h-1.5 flex-1 rounded-full bg-mint-ink" />)}
          {[...m.missingWajib, ...m.missingOpsional].map((s) => <i key={s.skillId} className="h-1.5 flex-1 rounded-full border border-foreground/40" />)}
        </div>
        <p className="mt-2 flex flex-wrap gap-x-4 text-xs text-muted-foreground">
          <span>Hijau: sudah punya</span><span>Merah: wajib, belum punya</span><span>Abu-abu: tambahan</span>
        </p>
      </section>

      <RoutePlan m={m} analysis={analysis} instById={instById} name={name} vacancyTotal={vacancies.data?.total} />

      <section className="mt-6">
        <h3 className="flex items-baseline justify-between gap-2 text-sm font-medium">
          Lowongan yang sedang buka
          {vacancies.data && <span className="text-xs font-normal text-muted-foreground tabular-nums">{vacancies.data.total} aktif</span>}
        </h3>
        {vacancies.loading ? (
          <div className="mt-2 grid gap-2" aria-hidden><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
        ) : vacancies.error ? (
          <p role="alert" className="mt-2 text-sm">{vacancies.error} <button className="underline" onClick={vacancies.retry}>Coba lagi</button></p>
        ) : vacancies.data?.items.length ? (
          <ul className="mt-1 divide-y">
            {vacancies.data.items.map((v) => (
              <li key={v.id}>
                <a href={v.applyUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 py-2.5 text-sm hover:underline">
                  <span className="min-w-0"><span className="block truncate font-medium">{v.title}</span><span className="block truncate text-[13px] text-muted-foreground">{v.company}{v.city ? `, ${v.city}` : ''}</span></span>
                  <ExternalLink className="size-4 shrink-0 text-muted-foreground" /><span className="sr-only">(buka di tab baru)</span>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Belum ada lowongan aktif untuk pekerjaan ini.</p>
        )}
      </section>

      <div className="mt-6 flex flex-wrap gap-2">
        <TargetButton jobId={id} jobName={m.job.nama} isTarget={isTarget} />
        {!!vacancies.data?.total && <Button asChild size="sm" variant="outline"><Link to={`/lowongan?occupation=${id}`}>Lihat {vacancies.data.total} lowongan</Link></Button>}
        <Button asChild size="sm" variant="ghost"><Link to={`/pekerjaan/${id}`}>Detail pekerjaan <ArrowRight /></Link></Button>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Skor dihitung dari skill wajib (2 poin) dan tambahan (1 poin) di katalog. Alasan dan urutan langkah disusun AI dari profilmu, lalu dicek server.
      </p>
    </article>
  )
}

type AnalysisState = ReturnType<typeof useAnalysis>

function Why({ analysis, first, rest }: { analysis: AnalysisState; first: string; rest: string[] }) {
  if (analysis.loading)
    return (
      <div className="mt-4 grid gap-2 rounded-xl bg-mint-soft/60 p-4">
        <LoadingNote>{analysis.progress === 0 ? 'Menunggu antrean analisis...' : 'AI sedang membaca profilmu...'}</LoadingNote>
        <Skeleton className="h-3.5 w-full bg-mint/30" /><Skeleton className="h-3.5 w-4/5 bg-mint/30" />
      </div>
    )
  if (analysis.error)
    return <p role="alert" className="mt-4 rounded-xl border border-dashed p-4 text-sm">{analysis.error} <button className="underline" onClick={analysis.retry}>Coba lagi</button></p>
  if (!first) return null
  return (
    <div className="mt-4 rounded-xl bg-mint-soft p-4 text-sm text-[#14523a]">
      <p className="flex items-center gap-1.5 font-medium"><Sparkles className="size-4" /> Kenapa ini cocok untukmu</p>
      <p className="mt-1.5 leading-relaxed">{first}</p>
      {rest.length > 0 && (
        <details className="group mt-2">
          <summary className="flex cursor-pointer list-none items-center gap-1 font-medium underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden">
            Baca penjelasan lengkap <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
          </summary>
          {rest.map((p, i) => <p key={i} className="mt-2 leading-relaxed">{p}</p>)}
        </details>
      )}
      {analysis.data?.fallback && <p className="mt-2 text-xs opacity-80">AI sedang tidak tersedia, jadi ini penjelasan cadangan dari data skor.</p>}
    </div>
  )
}

function RoutePlan({ m, analysis, instById, name, vacancyTotal }: { m: JobMatch; analysis: AnalysisState; instById: Map<string, Institution>; name: (id: string) => string; vacancyTotal?: number }) {
  const data: Analysis | null = analysis.data
  const steps = data ? planSteps(m, data.prioritySkillIds, data.trainings) : []
  const ready = m.missingWajib.length === 0
  const cost = planCost(steps)
  const projected = projectedScore(m)

  return (
    <section className="mt-6">
      <h3 className="flex items-baseline justify-between gap-2 text-sm font-medium">
        {ready ? 'Kamu sudah bisa melamar' : 'Jalan ke sana'}
        {data && steps.length > 0 && <span className="text-xs font-normal text-muted-foreground">urutan disarankan AI</span>}
      </h3>
      {!ready && (
        <dl className="mt-2 grid grid-cols-3 gap-2 text-[13px]">
          <div className="rounded-xl bg-muted p-3"><dt className="text-xs text-muted-foreground">Skill wajib kurang</dt><dd className="mt-0.5 font-semibold tabular-nums">{m.missingWajib.length}</dd></div>
          <div className="rounded-xl bg-muted p-3"><dt className="text-xs text-muted-foreground">Skor jika lengkap</dt><dd className="mt-0.5 font-semibold tabular-nums">{projected}%</dd></div>
          <div className="rounded-xl bg-muted p-3"><dt className="text-xs text-muted-foreground">Biaya pelatihan</dt><dd className="mt-0.5 font-semibold tabular-nums">{data ? (cost === null ? 'Belum pasti' : rupiah(cost)) : '...'}</dd></div>
        </dl>
      )}
      {ready && (
        <p className="mt-2 rounded-xl bg-mint-soft p-3 text-sm text-[#14523a]">
          Semua skill wajib sudah kamu punya.{steps.length > 0 ? ' Skill tambahan di bawah bisa memperkuat lamaranmu.' : ''}
        </p>
      )}
      {analysis.loading ? (
        <div className="mt-4 grid gap-4" aria-hidden>
          {[0, 1].map((i) => (
            <div key={i} className="grid grid-cols-[30px_1fr] gap-3"><Skeleton className="size-[30px] rounded-full" /><div className="grid gap-2"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-14 w-full rounded-xl" /></div></div>
          ))}
        </div>
      ) : (
        data && (
          <ol className="mt-4">
            {steps.map((s, i) => {
              const t = s.training?.training
              const inst = t ? instById.get(t.institutionId) : undefined
              return (
                <li key={s.skillId} className="relative grid grid-cols-[30px_1fr] gap-3 pb-5 before:absolute before:top-[30px] before:bottom-0 before:left-[14px] before:w-0.5 before:bg-border">
                  <span className="z-10 grid size-[30px] place-items-center rounded-full border-[2.5px] border-primary bg-card text-[13px] font-semibold">{i + 1}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {name(s.skillId)} <span className={cn('ml-1 text-xs font-normal', s.required ? 'text-danger-ink' : 'text-muted-foreground')}>{s.required ? 'wajib' : 'tambahan'}</span>
                    </p>
                    {t ? (
                      <div className="mt-2 rounded-xl border p-3">
                        <p className="text-[13.5px] font-medium">{t.nama}</p>
                        <p className="mt-0.5 text-[13px] text-muted-foreground">
                          {[inst?.nama, t.moda === 'daring' ? 'daring' : t.moda === 'luring' ? `tatap muka${inst?.kota ? ` di ${inst.kota}` : ''}` : null, rupiah(t.biaya), t.durasi || null].filter(Boolean).join(', ')}
                        </p>
                        <Link to={`/pelatihan?job=${m.job.id}&skillId=${s.skillId}`} className="mt-1 inline-block text-[13px] font-medium text-mint-ink hover:underline">Pilihan pelatihan lain</Link>
                      </div>
                    ) : (
                      <p className="mt-1 text-[13px] text-muted-foreground">
                        Belum ada pelatihan di katalog yang tercatat mengajarkan skill ini.{' '}
                        <Link to={`/pelatihan?job=${m.job.id}&skillId=${s.skillId}`} className="font-medium text-mint-ink hover:underline">Cari pelatihan</Link>
                      </p>
                    )}
                  </div>
                </li>
              )
            })}
            <li className="grid grid-cols-[30px_1fr] gap-3">
              <span className="grid size-[30px] place-items-center rounded-full bg-mint text-[13px] font-semibold text-primary">✓</span>
              <div>
                <p className="text-sm font-medium">Lamar</p>
                <p className="text-[13px] text-muted-foreground">
                  {vacancyTotal === undefined ? 'Memuat lowongan...' : vacancyTotal > 0 ? `${vacancyTotal} lowongan aktif untuk pekerjaan ini.` : 'Belum ada lowongan aktif. Pantau halaman Lowongan.'}
                </p>
              </div>
            </li>
          </ol>
        )
      )}
    </section>
  )
}

function MapSkeleton() {
  return (
    <div className="grid gap-4">
      <LoadingNote>Menyusun peta karirmu...</LoadingNote>
      <div className="grid gap-3 sm:grid-cols-3" aria-hidden>
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]" aria-hidden>
        <Skeleton className="mx-auto aspect-square w-[82%] max-w-[540px] rounded-full" />
        <Skeleton className="h-[520px] rounded-2xl" />
      </div>
    </div>
  )
}
