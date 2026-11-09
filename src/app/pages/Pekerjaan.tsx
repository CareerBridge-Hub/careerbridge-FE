import { Link, useSearchParams } from 'react-router'
import { ArrowRight, Search } from 'lucide-react'
import { TargetButton } from '@/app/components/cards'
import { CardGridSkeleton, EmptyState, PageHeader, ScoreBar } from '@/app/components/common'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/app/components/ui/toggle-group'
import { PageControls } from '@/app/components/PageControls'
import { fetchMatchesPage } from '@/app/lib/api'
import { useCareer, useServerPage, useUrlSearch } from '@/app/lib/hooks'
import { cn } from '@/app/lib/utils'

export default function Pekerjaan() {
  const { user } = useCareer()
  const [params,setParams] = useSearchParams()
  const [q,setQ]=useUrlSearch()
  const search=params.get('q') ?? ''
  const bidang=params.get('category') ?? 'semua'
  const offset=Math.max(0,Number(params.get('offset')) || 0)
  const limit=6
  const result=useServerPage(fetchMatchesPage,{offset,limit,q:search,category:bidang==='semua'?'':bidang},q===search)
  const fields=result.data?.fields ?? []
  const shown=result.data?.items ?? []
  const change=(key:string,value:string)=>setParams((p)=>{if(value)p.set(key,value);else p.delete(key);p.delete('offset');return p})

  return (
    <>
      <PageHeader
        title="Pekerjaan"
        description="Diurutkan dari yang paling cocok dengan skill-mu. Skor = poin skill yang kamu punya ÷ total poin skill pekerjaan (wajib 2 poin, tambahan 1 poin)."
      />

      {user.skills.length === 0 && (
        <div className="mb-5 flex flex-col gap-3 rounded-xl border border-mint bg-mint-soft/60 p-4 text-sm sm:flex-row sm:items-center">
          <p className="flex-1">Semua skor masih 0% karena kamu belum menyimpan skill.</p>
          <Button asChild size="sm">
            <Link to="/cv">
              Isi skill dulu <ArrowRight />
            </Link>
          </Button>
        </div>
      )}

      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative md:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input maxLength={120} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari pekerjaan" className="h-10 bg-card pl-9" aria-label="Cari pekerjaan" />
        </div>
        <ToggleGroup
          type="single"
          value={bidang}
          onValueChange={(v) => v && change('category',v)}
          variant="outline"
          className="flex-wrap bg-card"
          aria-label="Filter bidang"
        >
          <ToggleGroupItem value="semua" className="px-3">
            Semua
          </ToggleGroupItem>
          {fields.map((f) => (
            <ToggleGroupItem key={f} value={f} className="px-3">
              {f}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {result.loading ? <CardGridSkeleton label="Memuat pekerjaan..." /> : result.error ? <p role="alert">{result.error} <button onClick={result.retry}>Coba lagi</button></p> : shown.length === 0 ? (
        <EmptyState title="Tidak ada pekerjaan yang cocok dengan pencarian" />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((m, i) => {
            const isTarget = user.targetJobId === m.job.id
            return (
              <article
                key={m.job.id}
                className={cn(
                  'group relative flex animate-rise flex-col rounded-xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-md',
                  isTarget && 'border-primary ring-1 ring-primary',
                )}
                style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
              >
                <div className="flex items-start justify-between gap-2">
                  <Badge variant="secondary" className="min-w-0 shrink text-[11px] whitespace-normal">
                    {m.job.bidang}
                  </Badge>
                  <span className="shrink-0 text-xs whitespace-nowrap text-muted-foreground">KBJI {m.job.kodeKbji}</span>
                </div>
                <h2 className="mt-3 font-semibold">
                  <Link to={`/pekerjaan/${m.job.id}`} className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none after:focus-visible:ring-[3px] after:focus-visible:ring-ring/50">
                    {m.job.nama}
                  </Link>
                </h2>
                <div className="mt-4 flex items-baseline justify-between">
                  <span className="font-display text-3xl tabular-nums">{m.score}%</span>
                  <span className="text-xs text-muted-foreground">
                    {m.earned}/{m.total} poin
                  </span>
                </div>
                <ScoreBar value={m.score} label={`Skor ${m.job.nama}`} className="mt-2" />
                <p className={cn('mt-3 text-[13px]', m.missingWajib.length ? 'text-danger-ink' : 'text-mint-ink')}>
                  {m.missingWajib.length ? `${m.missingWajib.length} skill wajib belum dimiliki` : 'Skill wajib lengkap'}
                </p>
                <div className="mt-4 flex items-center justify-between gap-2 border-t pt-4">
                  <TargetButton jobId={m.job.id} jobName={m.job.nama} isTarget={isTarget} />
                  <span className="flex items-center gap-1 text-[13px] font-medium text-muted-foreground transition-colors group-hover:text-foreground">
                    Detail <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </article>
            )
          })}
        </div>
      )}
      <PageControls offset={offset} limit={limit} total={result.data?.total ?? 0} disabled={result.loading} onChange={(n)=>setParams((p)=>{p.set('offset',String(n));return p})}/>
    </>
  )
}
