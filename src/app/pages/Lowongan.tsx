import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { RefreshCw, Search } from 'lucide-react'
import { PostingItem } from '@/app/components/cards'
import { EmptyState, PageHeader } from '@/app/components/common'
import { Input } from '@/app/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select'
import { useCareer } from '@/app/lib/hooks'
import { normalizeKey } from '@/app/lib/matching'

const ALL = '__semua'

export default function Lowongan() {
  const { postings, ranked } = useCareer()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const jobId = ranked.some((m) => m.job.id === params.get('job')) ? params.get('job')! : ALL
  const byJob = new Map(ranked.map((m) => [m.job.id, m]))
  const shown = postings.filter(
    (p) =>
      (jobId === ALL || p.jobRoleId === jobId) &&
      normalizeKey(`${p.judul} ${p.perusahaan} ${p.lokasi}`).includes(normalizeKey(q)),
  )

  return (
    <>
      <PageHeader
        title="Lowongan"
        description="Contoh lowongan asli di Indonesia untuk setiap pekerjaan, lengkap dengan link ke sumbernya."
      />
      <p className="-mt-3 mb-5 flex items-center gap-1.5 text-xs text-muted-foreground">
        <RefreshCw className="size-3.5" /> Diambil otomatis sekali sehari pukul 06.00 dari Jooble dan JSearch.
      </p>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <Select value={jobId} onValueChange={(v) => setParams(v === ALL ? {} : { job: v }, { replace: true })}>
          <SelectTrigger className="w-full bg-card sm:w-64" aria-label="Filter pekerjaan">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Semua pekerjaan</SelectItem>
            {ranked.map((m) => (
              <SelectItem key={m.job.id} value={m.job.id}>
                {m.job.nama}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari judul, perusahaan, kota" className="bg-card pl-9" aria-label="Cari lowongan" />
        </div>
      </div>

      <p className="mb-3 text-[13px] text-muted-foreground" aria-live="polite">
        {shown.length} lowongan
      </p>
      {shown.length === 0 ? (
        <EmptyState title="Tidak ada lowongan yang cocok">Coba ganti pekerjaan atau kata kunci.</EmptyState>
      ) : (
        <div className="grid gap-2.5">
          {shown.map((p) => {
            const m = byJob.get(p.jobRoleId)
            return <PostingItem key={p.id} posting={p} jobName={jobId === ALL ? m?.job.nama : undefined} score={jobId === ALL ? m?.score : undefined} />
          })}
        </div>
      )}
    </>
  )
}
