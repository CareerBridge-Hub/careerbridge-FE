import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, ArrowRight, ChevronDown, Sparkles } from 'lucide-react'
import { PostingItem, TargetButton, TrainingCard } from '@/app/components/cards'
import { ChipsSkeleton, LoadingNote, Score, ScoreBar, SkillBadge } from '@/app/components/common'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Skeleton } from '@/app/components/ui/skeleton'
import { useCareer, useTypewriter, useAnalysis, useJob, useServerPage } from '@/app/lib/hooks'
import { fetchVacanciesPage, type Vacancy } from '@/app/lib/api'
import { cn } from '@/app/lib/utils'
import { POINTS, matchJob, type JobMatch } from '@/app/lib/matching'
import type { JobRole, JobSkill, Skill } from '@/app/lib/types'
import NotFound from './NotFound'


export default function PekerjaanDetail() {
  const { id } = useParams()
  const { user, skillsById, db, instById, postings } = useCareer()
  const detail = useJob(id)
  // Every occupation has a search-queue keyword, so vacancies are filtered by occupation id.
  const vacancies = useServerPage(fetchVacanciesPage, { occupation: id, limit: 5 }, !!id)
  const m = detail.data?.items[0]
  const analysis = useAnalysis(id)
  if (detail.loading) return <DetailSkeleton />
  if (detail.error) return <p role="alert">{detail.error} <button onClick={detail.retry}>Coba lagi</button></p>
  if (!m) return <NotFound />

  const count = (list: JobSkill[], tipe: JobSkill['tipe']) => list.filter((s) => s.tipe === tipe).length
  const own = { wajib: count(m.owned, 'wajib'), opsional: count(m.owned, 'opsional') }
  const all = { wajib: count(m.job.skills, 'wajib'), opsional: count(m.job.skills, 'opsional') }
  const ownedIds = new Set(m.owned.map((s) => s.skillId))
  const rows = (['wajib', 'opsional'] as const).map((tipe) => ({
    tipe,
    label: tipe === 'wajib' ? 'Wajib' : 'Tambahan',
    own: own[tipe],
    earned: own[tipe] * POINTS[tipe],
    total: all[tipe] * POINTS[tipe],
    // owned first so the filled blocks read left to right
    skills: m.job.skills
      .filter((s) => s.tipe === tipe)
      .map((s) => ({ ...s, have: ownedIds.has(s.skillId) }))
      .sort((a, b) => Number(b.have) - Number(a.have)),
  }))
  // shared scale so 1 poin is the same width in both rows
  const maxUnits = Math.max(1, ...rows.map((r) => r.total))
  const recs = (analysis.data?.trainings ?? []).slice(0, 3)
  const jobPostings = postings.filter((p) => p.jobRoleId === m.job.id).slice(0, 5)
  const wajibGap = new Set(m.missingWajib.map((s) => s.skillId))
  const opsGap = new Set(m.missingOpsional.map((s) => s.skillId))
  const explanation = analysis.data?.explanation ?? ''
  const userSkillIds = user.skills.map((s) => s.skillId)
  const related = (analysis.data?.relatedOccupationIds ?? [])
    .map((jobId) => analysis.data?.relatedOccupations?.find((j) => j.id === jobId) ?? db.jobs.find((j) => j.id === jobId))
    .filter((job): job is JobRole => !!job)
    .map((job) => ({ job, match: job.skills?.length ? matchJob(job, userSkillIds) : null }))
    .sort((a, b) => (b.match?.score ?? -1) - (a.match?.score ?? -1))

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-3 text-muted-foreground">
        <Link to="/pekerjaan">
          <ArrowLeft /> Semua pekerjaan
        </Link>
      </Button>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{m.job.bidang}</Badge>
            <span className="text-xs text-muted-foreground">KBJI {m.job.kodeKbji}</span>
          </div>
          <h1 className="mt-2 font-display text-[28px] tracking-tight">{m.job.nama}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{m.job.deskripsi}</p>
        </div>
        <TargetButton jobId={m.job.id} jobName={m.job.nama} isTarget={user.targetJobId === m.job.id} className="shrink-0" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <Card>
          <CardHeader>
            <CardDescription>Skor kecocokan</CardDescription>
          </CardHeader>
          <CardContent>
            <Score value={m.score} className="text-7xl leading-none" />
            <ScoreBar value={m.score} label={`Skor kecocokan ${m.job.nama}`} className="mt-4 h-2.5" />
            <div className="mt-5 rounded-xl bg-muted p-4 text-[13px] leading-relaxed tabular-nums">
              <p className="font-medium">Cara menghitung skor</p>
              <p className="mt-0.5 text-muted-foreground">
                Skill wajib bernilai {POINTS.wajib} poin, skill tambahan {POINTS.opsional} poin.
              </p>
              <dl className="mt-3 grid gap-2.5">
                {[
                  { label: 'Poin kamu', hint: 'skill yang sudah kamu punya', n: own, value: m.earned },
                  { label: 'Poin maksimal', hint: 'jika semua skill dimiliki', n: all, value: m.total },
                ].map((r) => (
                  <div key={r.label} className="flex items-start justify-between gap-3">
                    <dt>
                      <span className="font-medium">{r.label}</span>{' '}
                      <span className="text-muted-foreground">· {r.hint}</span>
                      <span className="block text-muted-foreground">
                        {r.n.wajib} wajib × {POINTS.wajib} + {r.n.opsional} tambahan × {POINTS.opsional}
                      </span>
                    </dt>
                    <dd className="text-base font-semibold">{r.value}</dd>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-3 border-t border-foreground/10 pt-2.5">
                  <dt className="font-medium">
                    Skor <span className="font-normal text-muted-foreground">· {m.earned} ÷ {m.total} × 100%</span>
                  </dt>
                  <dd className="text-base font-semibold">{m.score}%</dd>
                </div>
              </dl>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rincian poin skill</CardTitle>
            <CardDescription>Tiap kotak = 1 skill. Skill wajib bernilai 2 poin, skill tambahan 1 poin.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            {rows.map((r) => (
              <div key={r.tipe}>
                <div className="mb-2 flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium">
                    {r.label} <span className="font-normal text-muted-foreground">· {POINTS[r.tipe]} poin per skill</span>
                  </span>
                  <span className="font-medium tabular-nums">
                    {r.earned} / {r.total} poin
                  </span>
                </div>
                {r.skills.length > 0 ? (
                  <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${maxUnits}, minmax(0, 1fr))` }}>
                    {r.skills.map((s) => (
                      <div
                        key={s.skillId}
                        title={`${skillsById.get(s.skillId)?.nama ?? s.skillId}: ${s.have ? 'dimiliki' : 'belum dimiliki'}, ${POINTS[r.tipe]} poin`}
                        className={cn('h-7 rounded-md', s.have ? 'bg-chart-1' : 'bg-[#f4a3a3]')}
                        style={{ gridColumn: `span ${POINTS[r.tipe]}` }}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-[13px] text-muted-foreground">Tidak ada skill {r.label.toLowerCase()}.</p>
                )}
                <p className="mt-1.5 text-[13px] text-muted-foreground tabular-nums">
                  {r.own} dari {r.skills.length} skill dimiliki × {POINTS[r.tipe]} poin = {r.earned} poin
                </p>
              </div>
            ))}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-sm">
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm bg-chart-1" /> Dimiliki
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm bg-[#f4a3a3]" /> Belum dimiliki
                </span>
              </div>
              <span className="font-medium tabular-nums">
                Total {m.earned} / {m.total} poin
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <SkillColumn title="Sudah dimiliki" list={m.owned} tone="owned" skillsById={skillsById} empty="Belum ada skill yang cocok." />
        <SkillColumn title="Wajib, belum dimiliki" list={m.missingWajib} tone="wajib" skillsById={skillsById} empty="Lengkap. Semua skill wajib sudah kamu punya." />
        <SkillColumn title="Tambahan, belum dimiliki" list={m.missingOpsional} tone="opsional" skillsById={skillsById} empty="Lengkap." />
      </div>

      {analysis.loading && <AnalysisSkeleton waiting={analysis.progress === 0} />}
      {analysis.error && <p role="alert">{analysis.error} <button onClick={analysis.retry} className="underline">Coba lagi</button></p>}
      {analysis.data && <AiExplanation key={explanation} text={explanation} m={m} fallback={analysis.data.fallback} />}
      {related.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-lg">Pekerjaan serupa yang mungkin cocok</h2>
          <p className="mt-1 mb-3 text-sm text-muted-foreground">
            Dipilih dari kemiripan skill di profilmu, diurutkan dari skor tertinggi.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {related.map(({ job, match }) => (
              <RelatedJob key={job.id} job={job} match={match} />
            ))}
          </div>
        </section>
      )}

      {recs.length > 0 && (
        <section className="mt-8">
          <div className="mb-3 flex items-end justify-between gap-3">
            <h2 className="font-display text-lg">Pelatihan yang disarankan</h2>
            <Button asChild variant="link" className="h-auto shrink-0 px-0">
              <Link to={`/pelatihan?job=${m.job.id}`}>
                Semua pelatihan <ArrowRight />
              </Link>
            </Button>
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            {recs.map((r) => (
              <TrainingCard key={r.training.id} training={r.training} evidence={analysis.data?.trainingEvidence?.[r.training.id]} inst={instById.get(r.training.institutionId)} skillsById={skillsById} wajibGap={wajibGap} opsionalGap={opsGap} />
            ))}
          </div>
        </section>
      )}

      {!!analysis.data?.relatedTrainings?.length && <section className="mt-8">
        <h2 className="mb-3 font-display text-lg">Pelatihan terkait lainnya</h2>
        <p className="mb-3 text-sm text-muted-foreground">Periksa silabus untuk memastikan skill yang diajarkan sesuai kebutuhanmu.</p>
        <div className="grid gap-3 lg:grid-cols-3">{analysis.data.relatedTrainings.map((training)=><TrainingCard key={training.id} training={training} evidence={analysis.data?.trainingEvidence?.[training.id]} inst={instById.get(training.institutionId)} skillsById={skillsById} wajibGap={wajibGap} opsionalGap={opsGap}/>)}</div>
      </section>}

      <section className="mt-8">
        <h2 className="mb-3 font-display text-lg">Contoh lowongan</h2>
        {vacancies.loading ? (
          <div className="grid gap-2.5">
            <LoadingNote>Memuat lowongan...</LoadingNote>
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4" aria-hidden>
                <div className="grid flex-1 gap-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3.5 w-1/3" />
                </div>
                <Skeleton className="h-8 w-32 rounded-lg" />
              </div>
            ))}
          </div>
        ) : vacancies.error ? (
          <p role="alert" className="rounded-xl border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">{vacancies.error} <button className="underline" onClick={vacancies.retry}>Coba lagi</button></p>
        ) : vacancies.data?.items.length ? (
          <div className="grid gap-2.5">
            {vacancies.data.items.map((vacancy) => <RelatedVacancy key={vacancy.id} vacancy={vacancy} />)}
          </div>
        ) : jobPostings.length > 0 ? (
          <div className="grid gap-2.5">
            {jobPostings.map((p) => (
              <PostingItem key={p.id} posting={p} />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">Belum ada lowongan untuk pekerjaan ini.</p>
        )}
      </section>
    </>
  )
}

function DetailSkeleton() {
  return (
    <div className="grid gap-6">
      <LoadingNote>Memuat pekerjaan...</LoadingNote>
      <div className="grid gap-6" aria-hidden>
        <div className="grid gap-3">
          <Skeleton className="h-5 w-32 rounded-full" />
          <Skeleton className="h-8 w-72 max-w-full" />
          <Skeleton className="h-4 w-full max-w-2xl" />
          <Skeleton className="h-4 w-2/3 max-w-xl" />
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
          <div className="grid content-start gap-4 rounded-xl border bg-card p-6">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-16 w-36" />
            <Skeleton className="h-2.5 w-full rounded-full" />
            <Skeleton className="h-36 w-full rounded-xl" />
          </div>
          <div className="grid content-start gap-5 rounded-xl border bg-card p-6">
            <Skeleton className="h-5 w-40" />
            {[0, 1].map((i) => (
              <div key={i} className="grid gap-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-7 w-full rounded-md" />
                <Skeleton className="h-3.5 w-56" />
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="grid gap-3 rounded-xl border bg-card p-6">
              <Skeleton className="h-4 w-32" />
              <ChipsSkeleton count={4} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Same frame as the AI card, so the explanation lands in place instead of pushing the page. */
function AnalysisSkeleton({ waiting }: { waiting: boolean }) {
  return (
    <Card className="mt-4 overflow-hidden border-primary/15">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <span className="grid size-7 place-items-center rounded-lg bg-primary text-mint">
            <Sparkles className="size-4 animate-pulse" />
          </span>
          Penjelasan AI
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="grid content-start gap-3">
          <LoadingNote>{waiting ? 'Menunggu antrean analisis...' : 'AI sedang menyusun analisis...'}</LoadingNote>
          <div className="grid gap-2" aria-hidden>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="mt-3 h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
        <div className="grid content-start gap-3 lg:border-l lg:pl-8" aria-hidden>
          <Skeleton className="h-4 w-48" />
          {[80, 65, 90, 70].map((w) => (
            <Skeleton key={w} className="h-4" style={{ width: `${w}%` }} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function RelatedVacancy({ vacancy }: { vacancy: Vacancy }) {
  return <article className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
    <div className="min-w-0">
      <h3 className="font-medium">{vacancy.title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{vacancy.company} · {[vacancy.city, vacancy.region].filter(Boolean).join(', ') || vacancy.country}</p>
    </div>
    <Button asChild size="sm"><a href={vacancy.applyUrl} target="_blank" rel="noopener noreferrer">Lihat lowongan <ArrowRight /><span className="sr-only"> (buka di tab baru)</span></a></Button>
  </article>
}

function SkillColumn({
  title,
  list,
  tone,
  skillsById,
  empty,
}: {
  title: string
  list: JobSkill[]
  tone: 'owned' | 'wajib' | 'opsional'
  skillsById: Map<string, Skill>
  empty: string
}) {
  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm">
          {title}
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs tabular-nums">{list.length}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {list.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">{empty}</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {list.map((s) => (
              <SkillBadge key={s.skillId} tone={tone}>
                {skillsById.get(s.skillId)?.nama ?? s.skillId}
                {tone === 'owned' && <span className="font-normal opacity-60">{s.tipe === 'wajib' ? 'wajib' : 'tambahan'}</span>}
              </SkillBadge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function RelatedJob({ job, match }: { job: JobRole; match: JobMatch | null }) {
  const gap = match?.missingWajib.length ?? 0
  return (
    <Link
      to={`/pekerjaan/${job.id}`}
      className="group flex flex-col rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-medium group-hover:underline">{job.nama}</h3>
          <p className="mt-0.5 text-[13px] text-muted-foreground">{job.bidang}</p>
        </div>
        {match && <span className="font-display text-xl leading-none tabular-nums">{match.score}%</span>}
      </div>
      {match && (
        <>
          <ScoreBar value={match.score} label={`Skor kecocokan ${job.nama}`} className="mt-4 h-1.5" />
          <p className="mt-2 text-[13px] text-muted-foreground">
            {gap === 0 ? 'Semua skill wajib sudah kamu punya' : `${gap} skill wajib belum kamu punya`}
          </p>
        </>
      )}
    </Link>
  )
}

function scoreFaq(m: JobMatch, fallback: boolean) {
  const nWajib = m.missingWajib.length
  const nOps = m.missingOpsional.length
  const projected = m.total ? Math.round(((m.earned + nWajib * POINTS.wajib) / m.total) * 100) : 0
  return [
    {
      q: `Bagaimana skor ${m.score}% ini dihitung?`,
      a: `Setiap skill wajib bernilai ${POINTS.wajib} poin dan skill tambahan ${POINTS.opsional} poin. Dari semua skill pekerjaan ini kamu mengumpulkan ${m.earned} poin, sedangkan poin maksimalnya ${m.total}. Skornya ${m.earned} ÷ ${m.total} × 100% = ${m.score}%.`,
    },
    {
      q: 'Kenapa skill wajib bernilai lebih besar?',
      a: `Skill wajib adalah kemampuan inti yang hampir selalu diminta untuk pekerjaan ini. Bobotnya dua kali skill tambahan, jadi satu skill wajib setara dua skill tambahan. Dengan begitu skor mencerminkan kesiapanmu, bukan sekadar jumlah skill.`,
    },
    {
      q: 'Berapa skorku kalau skill yang kurang sudah dikuasai?',
      a:
        nWajib + nOps === 0
          ? 'Kamu sudah punya semua skill yang dibutuhkan, jadi skormu sudah maksimal.'
          : nWajib > 0
            ? `Melengkapi ${nWajib} skill wajib menambah ${nWajib * POINTS.wajib} poin, jadi skormu naik menjadi ${projected}%.${nOps > 0 ? ` Kalau ${nOps} skill tambahan juga dikuasai, skormu mencapai 100%.` : ''}`
            : `Tinggal ${nOps} skill tambahan, masing-masing ${POINTS.opsional} poin. Kalau semuanya dikuasai, skormu mencapai 100%.`,
    },
    {
      q: 'Apakah skor tinggi menjamin diterima kerja?',
      a: 'Tidak. Skor hanya membandingkan skill di profilmu dengan daftar skill pekerjaan ini. Pengalaman, portofolio, dan hasil wawancara tetap ikut menentukan.',
    },
    {
      q: 'Dari mana penjelasan ini dibuat?',
      a: fallback
        ? 'Jawaban AI tidak tersedia atau tidak lolos pengecekan saat analisis dibuat, jadi yang tampil adalah penjelasan cadangan yang disusun langsung dari data skor dan skill di sistem.'
        : 'Ditulis oleh AI berdasarkan skor, daftar skill, dan pelatihan di sistem. Sebelum ditampilkan, server mengecek setiap angka di dalamnya. Kalau ada angka yang tidak cocok dengan data, yang tampil adalah penjelasan cadangan.',
    },
  ]
}

function AiExplanation({ text, m, fallback }: { text: string; m: JobMatch; fallback: boolean }) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 900)
    return () => clearTimeout(t)
  }, [])
  const { shown, done } = useTypewriter(text, ready)
  const paragraphs = shown.split('\n\n')

  return (
    <Card className="mt-4 overflow-hidden border-primary/15 bg-gradient-to-br from-card to-mint-soft/40">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <span className="grid size-7 place-items-center rounded-lg bg-primary text-mint">
            <Sparkles className="size-4" />
          </span>
          Penjelasan AI
          <Badge variant="outline" className="bg-card font-normal">
            Hanya dari data skill di sistem
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div>
          {!ready ? (
            <div className="grid gap-2" aria-label="AI sedang menulis">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : (
            <div className="grid max-w-[68ch] gap-3 text-[15px] leading-relaxed" aria-live="polite" aria-busy={!done}>
              {paragraphs.map((p, i) => (
                <p key={i} className={i === 0 ? 'font-medium' : undefined}>
                  {p}
                  {!done && i === paragraphs.length - 1 && (
                    <span className="ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 animate-pulse rounded-sm bg-foreground/60" />
                  )}
                </p>
              ))}
            </div>
          )}
          <p className="mt-4 text-xs text-muted-foreground">Nama skill dan skor diverifikasi oleh server. Penjelasan cadangan digunakan jika AI tidak tersedia.</p>
        </div>

        <div className="lg:border-l lg:pl-8">
          <h3 className="text-sm font-medium">Pertanyaan yang sering muncul</h3>
          <div className="mt-1">
            {scoreFaq(m, fallback).map((f) => (
              <details key={f.q} className="group border-b border-foreground/10 last:border-b-0">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-md py-3 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <p className="pb-3 text-[13px] leading-relaxed text-muted-foreground tabular-nums">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
