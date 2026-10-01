import { useSearchParams } from 'react-router'
import { Info, TriangleAlert } from 'lucide-react'
import { TrainingCard } from '@/app/components/cards'
import { EmptyState, PageHeader, SkillBadge } from '@/app/components/common'
import { Button } from '@/app/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/app/components/ui/toggle-group'
import { useCareer } from '@/app/lib/hooks'
import { matchesFilter, rankTrainings, type TrainingFilter } from '@/app/lib/matching'

const ALL = '__semua'

export default function Pelatihan() {
  const { ranked, focus, db, instById, skillsById, user } = useCareer()
  const [params, setParams] = useSearchParams()
  const m = ranked.find((x) => x.job.id === params.get('job')) ?? focus
  // URL values are user input: anything unexpected falls back to "semua".
  const pick = <T extends string, F extends string>(v: string | null, allowed: readonly T[], fallback: F): T | F =>
    allowed.includes(v as T) ? (v as T) : fallback
  const filter: TrainingFilter = {
    biaya: pick(params.get('biaya'), ['gratis', 'berbayar'] as const, 'semua'),
    moda: pick(params.get('moda'), ['daring', 'luring'] as const, 'semua'),
    provinsi: params.get('provinsi') ?? '',
  }
  const setParam = (k: string, v: string, empty: string) =>
    setParams(
      (p) => {
        if (v === empty) p.delete(k)
        else p.set(k, v)
        return p
      },
      { replace: true },
    )
  const provinces = [...new Set(db.institutions.map((i) => i.provinsi))].sort((a, b) => a.localeCompare(b, 'id'))

  if (!m) return <EmptyState title="Belum ada data pekerjaan" />

  const wajibIds = m.missingWajib.map((s) => s.skillId)
  const opsIds = m.missingOpsional.map((s) => s.skillId)
  const wajibGap = new Set(wajibIds)
  const opsGap = new Set(opsIds)
  const all = rankTrainings(db.trainings, wajibIds, opsIds)
  const shown = all.filter((r) => matchesFilter(r.training, instById.get(r.training.institutionId), filter))
  const filtered = filter.biaya !== 'semua' || filter.moda !== 'semua' || filter.provinsi !== ''
  const card = (id: string) => {
    const t = db.trainings.find((x) => x.id === id)!
    return <TrainingCard key={t.id} training={t} inst={instById.get(t.institutionId)} skillsById={skillsById} wajibGap={wajibGap} opsionalGap={opsGap} />
  }

  return (
    <>
      <PageHeader
        title="Pelatihan untukmu"
        description="Pelatihan yang mengajarkan skill yang belum kamu punya. Yang menutup paling banyak skill wajib ada di paling atas."
      />

      <div className="mb-5 grid gap-3 rounded-xl border bg-card p-4 lg:grid-cols-[minmax(0,1.2fr)_auto_auto_minmax(0,1fr)] lg:items-end">
        <label className="grid gap-1.5 text-[13px] font-medium">
          Untuk pekerjaan
          <Select value={m.job.id} onValueChange={(v) => setParam('job', v, '')}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ranked.map((r) => (
                <SelectItem key={r.job.id} value={r.job.id}>
                  {r.job.nama} · {r.score}%{r.job.id === user.targetJobId ? ' · incaran' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <div className="grid gap-1.5 text-[13px] font-medium">
          <span id="f-biaya">Biaya</span>
          <ToggleGroup type="single" variant="outline" value={filter.biaya} onValueChange={(v) => v && setParam('biaya', v, 'semua')} aria-labelledby="f-biaya">
            <ToggleGroupItem value="semua" className="px-3">Semua</ToggleGroupItem>
            <ToggleGroupItem value="gratis" className="px-3">Gratis</ToggleGroupItem>
            <ToggleGroupItem value="berbayar" className="px-3">Berbayar</ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="grid gap-1.5 text-[13px] font-medium">
          <span id="f-moda">Cara belajar</span>
          <ToggleGroup type="single" variant="outline" value={filter.moda} onValueChange={(v) => v && setParam('moda', v, 'semua')} aria-labelledby="f-moda">
            <ToggleGroupItem value="semua" className="px-3">Semua</ToggleGroupItem>
            <ToggleGroupItem value="daring" className="px-3">Daring</ToggleGroupItem>
            <ToggleGroupItem value="luring" className="px-3">Tatap muka</ToggleGroupItem>
          </ToggleGroup>
        </div>
        <label className="grid gap-1.5 text-[13px] font-medium">
          Provinsi
          <Select value={filter.provinsi || ALL} onValueChange={(v) => setParam('provinsi', v === ALL ? '' : v, '')}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Semua provinsi</SelectItem>
              {provinces.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                  {p === user.provinsi ? ' (provinsimu)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        {filter.provinsi && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground lg:col-span-4">
            <Info className="size-3.5 shrink-0" /> Pelatihan daring tetap tampil karena bisa diikuti dari mana saja.
          </p>
        )}
      </div>

      {wajibIds.length + opsIds.length === 0 ? (
        <EmptyState title={`Skill-mu sudah lengkap untuk ${m.job.nama}`} image="kucing-reviews">
          Tidak ada skill yang perlu ditutup. Cek lowongan untuk pekerjaan ini.
        </EmptyState>
      ) : (
        <Tabs defaultValue="rekomendasi">
          <TabsList>
            <TabsTrigger value="rekomendasi">Urut rekomendasi</TabsTrigger>
            <TabsTrigger value="skill">Per skill yang kurang</TabsTrigger>
          </TabsList>

          <TabsContent value="rekomendasi" className="mt-4">
            <p className="mb-3 text-[13px] text-muted-foreground">
              {shown.length} dari {all.length} pelatihan{filtered ? ' sesuai filter' : ''}. Skill{' '}
              <SkillBadge tone="wajib" className="h-5 px-2 text-[11px]">merah</SkillBadge> = wajib yang kurang,{' '}
              <SkillBadge tone="opsional" className="h-5 px-2 text-[11px]">abu</SkillBadge> = tambahan yang kurang.
            </p>
            {shown.length === 0 ? (
              <FilteredOut onReset={() => setParams(m ? { job: m.job.id } : {}, { replace: true })} />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">{shown.map((r) => card(r.training.id))}</div>
            )}
          </TabsContent>

          <TabsContent value="skill" className="mt-4 grid gap-6">
            {[...m.missingWajib, ...m.missingOpsional].map((s) => {
              const teaching = all.filter((r) => r.training.skillIds.includes(s.skillId))
              const visible = teaching.filter((r) => shown.includes(r))
              return (
                <section key={s.skillId}>
                  <h2 className="mb-2.5 flex flex-wrap items-center gap-2 font-medium">
                    <SkillBadge tone={s.tipe === 'wajib' ? 'wajib' : 'opsional'}>{skillsById.get(s.skillId)?.nama}</SkillBadge>
                    <span className="text-[13px] font-normal text-muted-foreground">
                      {s.tipe === 'wajib' ? 'wajib' : 'tambahan'} · {visible.length} pelatihan
                    </span>
                  </h2>
                  {teaching.length === 0 ? (
                    <p className="flex items-center gap-2 rounded-xl border border-dashed bg-warn-soft/50 p-3.5 text-[13px] text-warn-ink">
                      <TriangleAlert className="size-4 shrink-0" /> Belum ada data pelatihan untuk skill ini.
                    </p>
                  ) : visible.length === 0 ? (
                    <p className="rounded-xl border border-dashed bg-card p-3.5 text-[13px] text-muted-foreground">
                      Ada {teaching.length} pelatihan, tapi tidak ada yang cocok dengan filter.
                    </p>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">{visible.map((r) => card(r.training.id))}</div>
                  )}
                </section>
              )
            })}
          </TabsContent>
        </Tabs>
      )}
    </>
  )
}

function FilteredOut({ onReset }: { onReset: () => void }) {
  return (
    <EmptyState
      title="Tidak ada pelatihan yang cocok dengan filter"
      action={
        <Button variant="outline" onClick={onReset}>
          Hapus filter
        </Button>
      }
    >
      Coba longgarkan filter biaya, cara belajar, atau provinsi.
    </EmptyState>
  )
}
