import { useState } from 'react'
import { toast } from 'sonner'
import { ExternalLink, RefreshCw } from 'lucide-react'
import { Pager, SearchBox } from '@/app/components/admin'
import { useSearchPaged } from '@/app/lib/table'
import { EmptyState, PageHeader } from '@/app/components/common'
import { Badge } from '@/app/components/ui/badge'
import { Card } from '@/app/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select'
import { Switch } from '@/app/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table'
import { setPostingHidden, useDb } from '@/app/lib/api'
import { formatDate } from '@/app/lib/format'

const ALL = '__semua'

export default function AdminLowongan() {
  const db = useDb()
  const [job, setJob] = useState(ALL)
  const [status, setStatus] = useState<'semua' | 'tampil' | 'sembunyi'>('semua')
  const jobs = new Map(db.jobs.map((j) => [j.id, j]))
  const list = db.postings
    .filter((p) => (job === ALL || p.jobRoleId === job) && (status === 'semua' || p.hidden === (status === 'sembunyi')))
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal))
  const t = useSearchPaged(list, (p) => `${p.judul} ${p.perusahaan} ${p.lokasi}`)
  const hiddenCount = db.postings.filter((p) => p.hidden).length

  return (
    <>
      <PageHeader
        title="Lowongan"
        description="Hasil tarikan otomatis dari Jooble dan JSearch. Sembunyikan lowongan yang tidak relevan supaya tidak tampil ke pengguna."
      />
      <p className="-mt-3 mb-5 flex items-center gap-1.5 text-xs text-muted-foreground">
        <RefreshCw className="size-3.5" /> Tarikan terakhir: hari ini 06.00 · {db.postings.length} lowongan, {hiddenCount} disembunyikan
      </p>

      <div className="mb-4 flex flex-col gap-3 md:flex-row">
        <SearchBox value={t.q} onChange={t.setQ} placeholder="Cari judul, perusahaan, kota" />
        <Select
          value={job}
          onValueChange={(v) => {
            setJob(v)
            t.setPage(1)
          }}
        >
          <SelectTrigger className="w-full bg-card md:w-56" aria-label="Filter pekerjaan">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Semua pekerjaan</SelectItem>
            {db.jobs.map((j) => (
              <SelectItem key={j.id} value={j.id}>
                {j.nama}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v as typeof status)
            t.setPage(1)
          }}
        >
          <SelectTrigger className="w-full bg-card md:w-44" aria-label="Filter status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua status</SelectItem>
            <SelectItem value="tampil">Tampil</SelectItem>
            <SelectItem value="sembunyi">Disembunyikan</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {t.total === 0 ? (
        <EmptyState title="Tidak ada lowongan" />
      ) : (
        <Card className="gap-0 overflow-hidden py-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="pl-4">Lowongan</TableHead>
                <TableHead className="hidden md:table-cell">Pekerjaan</TableHead>
                <TableHead className="hidden lg:table-cell">Sumber</TableHead>
                <TableHead className="hidden sm:table-cell">Tanggal</TableHead>
                <TableHead className="pr-4 text-right">Tampil</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {t.rows.map((p) => (
                <TableRow key={p.id} className={p.hidden ? 'text-muted-foreground' : undefined}>
                  <TableCell className="max-w-72 pl-4">
                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium hover:underline">
                      {p.judul} <ExternalLink className="size-3" />
                      <span className="sr-only">(buka di tab baru)</span>
                    </a>
                    <div className="truncate text-xs text-muted-foreground">
                      {p.perusahaan} · {p.lokasi}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{jobs.get(p.jobRoleId)?.nama}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <Badge variant="outline">{p.sumber}</Badge>
                  </TableCell>
                  <TableCell className="hidden whitespace-nowrap sm:table-cell">{formatDate(p.tanggal)}</TableCell>
                  <TableCell className="pr-4 text-right">
                    <Switch
                      checked={!p.hidden}
                      aria-label={`Tampilkan ${p.judul} di ${p.perusahaan}`}
                      onCheckedChange={async (on) => {
                        await setPostingHidden(p.id, !on)
                        toast.success(on ? 'Lowongan ditampilkan' : 'Lowongan disembunyikan', { description: p.judul })
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pager page={t.page} pages={t.pages} total={t.total} setPage={t.setPage} />
        </Card>
      )}
    </>
  )
}
