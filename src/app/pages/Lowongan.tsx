import { useSearchParams } from 'react-router'
import { ExternalLink, MapPin, Search } from 'lucide-react'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select'
import { EmptyState, PageHeader } from '@/app/components/common'
import { PageControls } from '@/app/components/PageControls'
import { fetchVacanciesPage, type Vacancy } from '@/app/lib/api'
import { useServerPage, useUrlSearch } from '@/app/lib/hooks'

const SOURCES = [
  ['grab', 'Grab'],
  ['cermati', 'Cermati.com'],
  ['dkatalis', 'DKatalis'],
  ['softwareseni', 'SoftwareSeni'],
  ['kredivo', 'Kredivo Group'],
] as const
const CATEGORIES = [
  ['software-engineer', 'Software Engineer & Developer'],
  ['devops', 'DevOps'],
  ['data-analyst', 'Data Analyst'],
] as const

export default function Lowongan() {
  const [params,setParams] = useSearchParams()
  const [q,setQ] = useUrlSearch('q')
  const [city,setCity] = useUrlSearch('city')
  const search=params.get('q') ?? ''
  const selectedCity=params.get('city') ?? ''
  const source=params.get('source') ?? ''
  const category=params.get('category') ?? ''
  const offset=Math.max(0,Number(params.get('offset')) || 0)
  const limit=12
  const result=useServerPage(fetchVacanciesPage,{q:search,city:selectedCity,source,category,offset,limit},q===search && city===selectedCity)
  const change=(key:string,value:string)=>setParams((p)=>{if(value)p.set(key,value);else p.delete(key);p.delete('offset');return p})
  const shown=result.data?.items ?? []

  return <>
    <PageHeader title="Lowongan" description="Lowongan software dari halaman karier perusahaan di Indonesia. Detail dan tautan lamaran berasal dari sumber perusahaan." />
    <p className="-mt-3 mb-5 text-xs text-muted-foreground">Diperbarui otomatis tiap 6 jam. Lowongan yang sudah tutup atau lama tidak diperbarui tidak ditampilkan.</p>

    <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input maxLength={120} value={q} onChange={(event)=>setQ(event.target.value)} placeholder="Cari posisi atau perusahaan" className="bg-card pl-9" aria-label="Cari posisi atau perusahaan" />
      </div>
      <Input maxLength={200} value={city} onChange={(event)=>setCity(event.target.value)} placeholder="Filter kota, misal: Jakarta" className="bg-card" aria-label="Filter kota" />
      <Select value={source || '__all'} onValueChange={(value)=>change('source',value==='__all'?'':value)}>
        <SelectTrigger className="bg-card" aria-label="Filter sumber"><SelectValue placeholder="Semua sumber" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="__all">Semua sumber</SelectItem>
          {SOURCES.map(([key,label])=><SelectItem key={key} value={key}>{label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={category || '__all'} onValueChange={(value)=>change('category',value==='__all'?'':value)}>
        <SelectTrigger className="bg-card" aria-label="Filter kategori pekerjaan"><SelectValue placeholder="Semua kategori" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="__all">Semua kategori</SelectItem>
          {CATEGORIES.map(([key,label])=><SelectItem key={key} value={key}>{label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>

    {result.loading ? <p role="status">Memuat lowongan...</p> : result.error ? <p role="alert">{result.error} <button className="underline" onClick={result.retry}>Coba lagi</button></p> : shown.length===0 ? (
      <EmptyState title="Tidak ada lowongan yang cocok">Coba hapus filter atau gunakan kata kunci lain.</EmptyState>
    ) : <>
      <p className="mb-3 text-[13px] text-muted-foreground" aria-live="polite">{result.data?.total ?? 0} lowongan</p>
      <div className="grid gap-3 md:grid-cols-2">
        {shown.map((vacancy)=><VacancyCard key={vacancy.id} vacancy={vacancy} />)}
      </div>
    </>}
    <PageControls offset={offset} limit={limit} total={result.data?.total ?? 0} disabled={result.loading} onChange={(next)=>setParams((p)=>{p.set('offset',String(next));return p})} />
  </>
}

function VacancyCard({vacancy:v}:{vacancy:Vacancy}) {
  return <article className="flex flex-col rounded-xl border bg-card p-4 transition-shadow hover:shadow-md sm:p-5">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="font-semibold leading-snug">{v.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{v.company}</p>
      </div>
      <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
        <Badge variant="secondary">{CATEGORIES.find(([key])=>key===v.category)?.[1] ?? 'Software Engineer & Developer'}</Badge>
        <Badge variant="outline">{SOURCES.find(([key])=>key===v.source)?.[1] ?? v.source}</Badge>
      </div>
    </div>
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{[v.city,v.region].filter(Boolean).join(', ') || v.country}</span>
      {v.workplace && <span>{v.workplace}</span>}
      {v.employmentType && <span>{v.employmentType}</span>}
      {v.postedAt && <span>Diposting {new Date(v.postedAt).toLocaleDateString('id-ID')}</span>}
    </div>
    {(v.description || v.requirements) && <details className="mt-4 border-t pt-3 text-sm">
      <summary className="cursor-pointer font-medium">Detail dan kualifikasi</summary>
      {v.description && <p className="mt-2 whitespace-pre-line text-muted-foreground">{v.description}</p>}
      {v.requirements && <p className="mt-2 whitespace-pre-line"><span className="font-medium">Kualifikasi: </span>{v.requirements}</p>}
    </details>}
    <div className="mt-auto flex flex-wrap gap-2 pt-4">
      <Button asChild size="sm"><a href={v.applyUrl} target="_blank" rel="noopener noreferrer">Lamar <ExternalLink /><span className="sr-only"> (buka di tab baru)</span></a></Button>
      <Button asChild size="sm" variant="outline"><a href={v.sourceUrl} target="_blank" rel="noopener noreferrer">Lihat sumber <ExternalLink /><span className="sr-only"> (buka di tab baru)</span></a></Button>
    </div>
  </article>
}
