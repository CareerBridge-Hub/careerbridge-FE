import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react'
import { PostingItem, TargetButton, TrainingCard } from '@/app/components/cards'
import { Score, ScoreBar, SkillBadge } from '@/app/components/common'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Skeleton } from '@/app/components/ui/skeleton'
import { useCareer, useTypewriter } from '@/app/lib/hooks'
import { cn } from '@/app/lib/utils'
import { explainGap, POINTS, rankTrainings } from '@/app/lib/matching'
import type { JobSkill, Skill } from '@/app/lib/types'
import NotFound from './NotFound'


export default function PekerjaanDetail() {
  const { id } = useParams()
  const { ranked, user, skillsById, demand, db, instById, postings } = useCareer()
  const m = ranked.find((x) => x.job.id === id)
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
  const recs = rankTrainings(db.trainings, m.missingWajib.map((s) => s.skillId), m.missingOpsional.map((s) => s.skillId)).slice(0, 3)
  const jobPostings = postings.filter((p) => p.jobRoleId === m.job.id).slice(0, 5)
  const wajibGap = new Set(m.missingWajib.map((s) => s.skillId))
  const opsGap = new Set(m.missingOpsional.map((s) => s.skillId))
  const explanation = explainGap(m, skillsById, demand, db.trainings)

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
            <div className="mt-5 rounded-xl bg-muted p-3.5 text-[13px] leading-relaxed">
              <p className="text-muted-foreground">Poin skill yang kamu punya ÷ total poin × 100%</p>
              <p className="mt-1.5 font-medium tabular-nums">
                ({own.wajib}×2 + {own.opsional}×1) ÷ ({all.wajib}×2 + {all.opsional}×1)
                <br />= {m.earned} ÷ {m.total} = {m.score}%
              </p>
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

      <AiExplanation key={explanation} text={explanation} />

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
              <TrainingCard key={r.training.id} training={r.training} inst={instById.get(r.training.institutionId)} skillsById={skillsById} wajibGap={wajibGap} opsionalGap={opsGap} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-3 font-display text-lg">Contoh lowongan</h2>
        {jobPostings.length > 0 ? (
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

function AiExplanation({ text }: { text: string }) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 900)
    return () => clearTimeout(t)
  }, [])
  const { shown, done } = useTypewriter(text, ready)

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
      <CardContent>
        {!ready ? (
          <div className="grid gap-2" aria-label="AI sedang menulis">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : (
          <p className="text-[15px] leading-relaxed" aria-live="polite" aria-busy={!done}>
            {shown}
            {!done && <span className="ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 animate-pulse rounded-sm bg-foreground/60" />}
          </p>
        )}
        <p className="mt-4 text-xs text-muted-foreground">Mode demo: teks disusun otomatis dari hasil hitungan, belum memanggil DeepSeek.</p>
      </CardContent>
    </Card>
  )
}
