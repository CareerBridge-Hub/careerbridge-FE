import { Link } from 'react-router'
import { Bar, BarChart, Cell, LabelList, XAxis, YAxis } from 'recharts'
import { ArrowRight, BadgeCheck, BriefcaseBusiness, FileText, GraduationCap, Target, TriangleAlert } from 'lucide-react'
import { PostingItem } from '@/app/components/cards'
import { EmptyState, PageHeader, Score, ScoreBar, SkillBadge, Stat } from '@/app/components/common'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/app/components/ui/chart'
import { useCareer } from '@/app/lib/hooks'

const chartConfig = { score: { label: 'Skor', color: 'var(--chart-1)' } } satisfies ChartConfig
const toneFill = (s: number) => (s >= 70 ? 'var(--chart-1)' : s >= 40 ? 'var(--chart-5)' : 'var(--chart-4)')

export default function Beranda() {
  const { user, ranked, target, focus, skillsById, postings, db } = useCareer()
  const firstName = user.nama.split(' ')[0]

  if (user.skills.length === 0)
    return (
      <>
        <PageHeader title={`Halo, ${firstName}`} description="Ayo mulai. Tiga langkah dan kamu tahu harus belajar apa." />
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: FileText, title: 'Upload CV atau pilih skill', text: 'AI membaca skill dari CV-mu. Belum punya CV? Pilih sendiri dari daftar.', to: '/cv', cta: 'Mulai' },
            { icon: Target, title: 'Pilih pekerjaan incaran', text: 'Lihat skor kecocokanmu untuk setiap pekerjaan.', to: '/pekerjaan' },
            { icon: GraduationCap, title: 'Tutup skill yang kurang', text: 'Temukan pelatihan gratis dan berbayar di dekatmu.', to: '/pelatihan' },
          ].map((s, i) => (
            <Card key={s.title} className="animate-rise gap-3" style={{ animationDelay: `${i * 70}ms` }}>
              <CardHeader>
                <span className="mb-2 grid size-10 place-items-center rounded-xl bg-mint-soft text-mint-ink">
                  <s.icon className="size-5" />
                </span>
                <CardDescription>Langkah {i + 1}</CardDescription>
                <CardTitle className="text-base">{s.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col text-sm text-muted-foreground">
                {s.text}
                {s.cta && (
                  <Button asChild className="mt-4 w-fit">
                    <Link to={s.to}>
                      {s.cta} <ArrowRight />
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </>
    )

  const best = ranked[0]
  const freeForFocus = focus
    ? db.trainings.filter((t) => t.biaya === 0 && t.skillIds.some((id) => focus.missingWajib.some((m) => m.skillId === id) || focus.missingOpsional.some((m) => m.skillId === id))).length
    : 0
  const chartData = ranked.slice(0, 6).map((m) => ({ id: m.job.id, nama: m.job.nama, score: m.score }))
  const focusPostings = postings.filter((p) => p.jobRoleId === focus?.job.id).slice(0, 3)

  return (
    <>
      <PageHeader
        title={`Halo, ${firstName}`}
        description="Ringkasan kecocokan skill-mu dengan pekerjaan yang ada di sistem."
        actions={
          <Button asChild variant="outline">
            <Link to="/cv">Perbarui skill</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Skill dimiliki" value={user.skills.length} hint={user.cv ? 'Dari CV dan pilihanmu' : 'Dipilih manual'} icon={<BadgeCheck />} />
        <Stat label="Paling cocok" value={best ? `${best.score}%` : '-'} hint={best?.job.nama} icon={<BriefcaseBusiness />} />
        <Stat
          label="Skill wajib kurang"
          value={focus ? focus.missingWajib.length : '-'}
          hint={focus ? `untuk ${focus.job.nama}` : undefined}
          icon={<TriangleAlert />}
        />
        <Stat label="Pelatihan gratis" value={freeForFocus} hint="untuk skill yang kurang" icon={<GraduationCap />} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        {target ? (
          <Card className="relative overflow-hidden">
            <img src="/assets/careerbridge/kucing-list.webp" alt="" className="pointer-events-none absolute top-4 right-4 w-20 rotate-6 sm:w-24" />
            <CardHeader>
              <CardDescription>Pekerjaan incaran</CardDescription>
              <CardTitle className="pr-20 font-display text-xl">{target.job.nama}</CardTitle>
            </CardHeader>
            <CardContent>
              <Score value={target.score} className="text-6xl leading-none" />
              <ScoreBar value={target.score} label={`Skor kecocokan ${target.job.nama}`} className="mt-4 h-2.5" />
              <p className="mt-5 text-sm text-muted-foreground">
                {target.missingWajib.length > 0 ? 'Skill wajib yang kurang' : 'Semua skill wajib sudah kamu punya.'}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {target.missingWajib.map((s) => (
                  <SkillBadge key={s.skillId} tone="wajib">
                    {skillsById.get(s.skillId)?.nama}
                  </SkillBadge>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                <Button asChild size="lg" className="flex-1">
                  <Link to={`/pelatihan?job=${target.job.id}`}>Cari pelatihan</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to={`/pekerjaan/${target.job.id}`}>Lihat detail</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <EmptyState
            title="Belum ada pekerjaan incaran"
            image="kucing-outro-wink"
            action={
              <Button asChild>
                <Link to="/pekerjaan">Pilih pekerjaan</Link>
              </Button>
            }
          >
            Pilih satu pekerjaan supaya rekomendasi pelatihan lebih tepat.
          </EmptyState>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kecocokan per pekerjaan</CardTitle>
            <CardDescription>6 pekerjaan dengan skor tertinggi</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="aspect-auto h-[260px] w-full">
              <BarChart data={chartData} layout="vertical" margin={{ left: 4, right: 40 }} barCategoryGap={10}>
                <YAxis dataKey="nama" type="category" width={128} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                <XAxis type="number" domain={[0, 100]} hide />
                <ChartTooltip cursor={{ fill: 'var(--muted)' }} content={<ChartTooltipContent hideIndicator formatter={(v) => `Skor ${v}%`} />} />
                <Bar dataKey="score" radius={6} animationDuration={700}>
                  {chartData.map((d) => (
                    <Cell key={d.id} fill={toneFill(d.score)} />
                  ))}
                  <LabelList dataKey="score" position="right" formatter={(v) => `${v}%`} className="fill-foreground text-xs font-medium" />
                </Bar>
              </BarChart>
            </ChartContainer>
            <Button asChild variant="link" className="mt-1 h-auto px-0">
              <Link to="/pekerjaan">
                Semua pekerjaan <ArrowRight />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {focus && (
        <section className="mt-8">
          <div className="mb-3 flex items-end justify-between gap-3">
            <h2 className="font-display text-lg">Lowongan terbaru · {focus.job.nama}</h2>
            <Button asChild variant="link" className="h-auto shrink-0 px-0">
              <Link to={`/lowongan?job=${focus.job.id}`}>Lihat semua</Link>
            </Button>
          </div>
          {focusPostings.length > 0 ? (
            <div className="grid gap-2.5">
              {focusPostings.map((p) => (
                <PostingItem key={p.id} posting={p} />
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">Belum ada lowongan untuk pekerjaan ini.</p>
          )}
        </section>
      )}
    </>
  )
}
