import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Loader2, Pencil, Plus, X } from 'lucide-react'
import { ConfirmDelete, CsvImportDialog, Pager, SearchBox, type RowResult } from '@/app/components/admin'
import { splitList, useSearchPaged } from '@/app/lib/table'
import { EmptyState, Field, FormError, PageHeader } from '@/app/components/common'
import { invalid } from '@/app/lib/utils'
import { SkillPicker } from '@/app/components/SkillPicker'
import { Button } from '@/app/components/ui/button'
import { Card } from '@/app/components/ui/card'
import { Input } from '@/app/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/app/components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table'
import { Textarea } from '@/app/components/ui/textarea'
import { ApiError, deleteJob, importRows, newId, saveJob, useDb } from '@/app/lib/api'
import { normalizeKey, normalizeSkills } from '@/app/lib/matching'
import type { JobRole, JobSkill, Skill, SkillType } from '@/app/lib/types'

const KBJI_RE = /^\d{4}$/

export default function AdminPekerjaan() {
  const db = useDb()
  const [editing, setEditing] = useState<JobRole | 'new' | null>(null)
  const list = [...db.jobs].sort((a, b) => a.nama.localeCompare(b.nama, 'id'))
  const t = useSearchPaged(list, (j) => `${j.nama} ${j.bidang} ${j.kodeKbji}`)
  const fields = [...new Set(db.jobs.map((j) => j.bidang))].sort()
  const count = (j: JobRole, tipe: SkillType) => j.skills.filter((s) => s.tipe === tipe).length

  const parse = (rec: Record<string, string>): RowResult<JobRole> => {
    const nama = rec.nama ?? ''
    const key = normalizeKey(nama)
    const fail = (error: string): RowResult<JobRole> => ({ ok: false, key: key || `#${Math.random()}`, label: nama, error })
    if (!key) return fail('Nama kosong.')
    if (!KBJI_RE.test(rec.kode_kbji ?? '')) return fail('kode_kbji harus 4 digit angka.')
    if (!rec.bidang) return fail('Bidang kosong.')
    const wajib = normalizeSkills(splitList(rec.skill_wajib), db.skills)
    const ops = normalizeSkills(splitList(rec.skill_tambahan), db.skills)
    const unknown = [...wajib.unknown, ...ops.unknown]
    if (unknown.length) return fail(`Skill tidak ada di kamus: ${unknown.join(', ')}`)
    if (wajib.matched.length === 0) return fail('Minimal satu skill wajib.')
    const wajibIds = new Set(wajib.matched.map((m) => m.skillId))
    const both = ops.matched.filter((m) => wajibIds.has(m.skillId))
    if (both.length) return fail(`Skill ada di wajib dan tambahan sekaligus: ${both.map((b) => b.raw).join(', ')}`)
    const existing = db.jobs.find((j) => normalizeKey(j.nama) === key)
    return {
      ok: true,
      key,
      label: nama,
      isNew: !existing,
      item: {
        id: existing?.id ?? newId('job'),
        nama,
        kodeKbji: rec.kode_kbji,
        bidang: rec.bidang,
        deskripsi: rec.deskripsi ?? '',
        skills: [
          ...wajib.matched.map((m): JobSkill => ({ skillId: m.skillId, tipe: 'wajib' })),
          ...ops.matched.map((m): JobSkill => ({ skillId: m.skillId, tipe: 'opsional' })),
        ],
      },
    }
  }

  return (
    <>
      <PageHeader
        title="Pekerjaan"
        description="Jenis pekerjaan, kode KBJI, serta skill wajib (2 poin) dan tambahan (1 poin) yang dipakai untuk menghitung skor kecocokan."
        actions={
          <>
            <CsvImportDialog
              entity="pekerjaan"
              columns={[
                { name: 'nama', required: true },
                { name: 'kode_kbji', required: true },
                { name: 'bidang', required: true },
                { name: 'deskripsi' },
                { name: 'skill_wajib', required: true },
                { name: 'skill_tambahan' },
              ]}
              example={['Data Analyst', '2511', 'Teknologi Informasi', 'Mengolah data untuk keputusan bisnis.', 'SQL|Microsoft Excel|Statistika', 'Python|Power BI']}
              parse={parse}
              onImport={(items) => importRows('jobs', items)}
            />
            <Button onClick={() => setEditing('new')}>
              <Plus /> Tambah pekerjaan
            </Button>
          </>
        }
      />

      <div className="mb-4">
        <SearchBox value={t.q} onChange={t.setQ} placeholder="Cari nama, bidang, atau kode" />
      </div>

      {t.total === 0 ? (
        <EmptyState title="Pekerjaan tidak ditemukan" />
      ) : (
        <Card className="gap-0 overflow-hidden py-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="pl-4">Nama</TableHead>
                <TableHead>KBJI</TableHead>
                <TableHead className="hidden md:table-cell">Bidang</TableHead>
                <TableHead className="text-right">Wajib</TableHead>
                <TableHead className="text-right">Tambahan</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Lowongan</TableHead>
                <TableHead className="w-24 pr-4">
                  <span className="sr-only">Aksi</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {t.rows.map((j) => (
                <TableRow key={j.id}>
                  <TableCell className="pl-4 font-medium">{j.nama}</TableCell>
                  <TableCell className="tabular-nums">{j.kodeKbji}</TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">{j.bidang}</TableCell>
                  <TableCell className="text-right tabular-nums">{count(j, 'wajib')}</TableCell>
                  <TableCell className="text-right tabular-nums">{count(j, 'opsional')}</TableCell>
                  <TableCell className="hidden text-right text-muted-foreground tabular-nums sm:table-cell">
                    {db.postings.filter((p) => p.jobRoleId === j.id).length}
                  </TableCell>
                  <TableCell className="pr-4 text-right whitespace-nowrap">
                    <Button variant="ghost" size="icon-sm" onClick={() => setEditing(j)} aria-label={`Ubah ${j.nama}`}>
                      <Pencil />
                    </Button>
                    <ConfirmDelete
                      name={j.nama}
                      detail="Lowongan untuk pekerjaan ini ikut terhapus, dan pengguna yang mengincarnya akan kehilangan pekerjaan incaran."
                      onConfirm={() => deleteJob(j.id)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pager page={t.page} pages={t.pages} total={t.total} setPage={t.setPage} />
        </Card>
      )}

      <JobSheet key={editing === 'new' ? 'new' : editing?.id ?? 'none'} job={editing} jobs={db.jobs} skills={db.skills} fields={fields} onClose={() => setEditing(null)} />
    </>
  )
}

function JobSheet({
  job,
  jobs,
  skills,
  fields,
  onClose,
}: {
  job: JobRole | 'new' | null
  jobs: JobRole[]
  skills: Skill[]
  fields: string[]
  onClose: () => void
}) {
  const existing = job && job !== 'new' ? job : null
  const [f, setF] = useState({
    nama: existing?.nama ?? '',
    kodeKbji: existing?.kodeKbji ?? '',
    bidang: existing?.bidang ?? '',
    deskripsi: existing?.deskripsi ?? '',
    skills: existing?.skills ?? [],
  })
  const [errors, setErrors] = useState<{ nama?: string; kodeKbji?: string; bidang?: string; skills?: string; form?: string }>({})
  const [pending, setPending] = useState(false)
  const byId = new Map(skills.map((s) => [s.id, s]))
  const selected = new Set(f.skills.map((s) => s.skillId))
  const toggle = (id: string) =>
    setF((p) => ({ ...p, skills: selected.has(id) ? p.skills.filter((s) => s.skillId !== id) : [...p.skills, { skillId: id, tipe: 'wajib' }] }))
  const setTipe = (id: string, tipe: SkillType) => setF((p) => ({ ...p, skills: p.skills.map((s) => (s.skillId === id ? { ...s, tipe } : s)) }))
  const total = f.skills.reduce((n, s) => n + (s.tipe === 'wajib' ? 2 : 1), 0)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const next: typeof errors = {}
    if (!f.nama.trim()) next.nama = 'Nama wajib diisi.'
    else if (jobs.some((j) => j.id !== existing?.id && normalizeKey(j.nama) === normalizeKey(f.nama))) next.nama = 'Pekerjaan dengan nama ini sudah ada.'
    if (!KBJI_RE.test(f.kodeKbji)) next.kodeKbji = 'Kode KBJI 4 digit angka.'
    if (!f.bidang.trim()) next.bidang = 'Bidang wajib diisi.'
    if (!f.skills.some((s) => s.tipe === 'wajib')) next.skills = 'Minimal satu skill wajib.'
    setErrors(next)
    if (Object.keys(next).length) return
    setPending(true)
    try {
      await saveJob({ id: existing?.id, ...f, nama: f.nama.trim(), bidang: f.bidang.trim(), deskripsi: f.deskripsi.trim() })
      toast.success(existing ? 'Pekerjaan diperbarui' : 'Pekerjaan ditambahkan')
      onClose()
    } catch (err) {
      setErrors({ form: err instanceof ApiError ? err.message : 'Gagal menyimpan.' })
      setPending(false)
    }
  }

  return (
    <Sheet open={job !== null} onOpenChange={(o) => !o && !pending && onClose()}>
      <SheetContent className="w-full gap-0 sm:max-w-lg">
        <SheetHeader className="border-b">
          <SheetTitle>{existing ? 'Ubah pekerjaan' : 'Tambah pekerjaan'}</SheetTitle>
          <SheetDescription>Skor = poin skill dimiliki ÷ total poin. Wajib 2 poin, tambahan 1 poin.</SheetDescription>
        </SheetHeader>
        <form id="job-form" onSubmit={submit} noValidate className="grid flex-1 content-start gap-4 overflow-y-auto p-4">
          <FormError>{errors.form}</FormError>
          <Field label="Nama pekerjaan" htmlFor="j-nama" error={errors.nama}>
            <Input id="j-nama" value={f.nama} onChange={(e) => setF({ ...f, nama: e.target.value })} {...invalid('j-nama', errors.nama)} />
          </Field>
          <div className="grid grid-cols-[120px_1fr] gap-3">
            <Field label="Kode KBJI" htmlFor="j-kbji" error={errors.kodeKbji}>
              <Input id="j-kbji" inputMode="numeric" maxLength={4} value={f.kodeKbji} onChange={(e) => setF({ ...f, kodeKbji: e.target.value.replace(/\D/g, '') })} {...invalid('j-kbji', errors.kodeKbji)} />
            </Field>
            <Field label="Bidang" htmlFor="j-bidang" error={errors.bidang}>
              <Input id="j-bidang" list="j-bidang-list" value={f.bidang} onChange={(e) => setF({ ...f, bidang: e.target.value })} {...invalid('j-bidang', errors.bidang)} />
              <datalist id="j-bidang-list">
                {fields.map((x) => (
                  <option key={x} value={x} />
                ))}
              </datalist>
            </Field>
          </div>
          <Field label="Deskripsi" htmlFor="j-desk">
            <Textarea id="j-desk" rows={2} value={f.deskripsi} onChange={(e) => setF({ ...f, deskripsi: e.target.value })} />
          </Field>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Skill ({f.skills.length}, total {total} poin)</span>
              <SkillPicker skills={skills} selected={selected} onToggle={toggle} />
            </div>
            {errors.skills && <p className="text-[13px] text-destructive">{errors.skills}</p>}
            <ul className="grid gap-1.5">
              {f.skills.map((s) => (
                <li key={s.skillId} className="flex items-center gap-2 rounded-lg border bg-card py-1.5 pr-1.5 pl-3 text-sm">
                  <span className="flex-1 truncate">{byId.get(s.skillId)?.nama ?? s.skillId}</span>
                  <Select value={s.tipe} onValueChange={(v) => setTipe(s.skillId, v as SkillType)}>
                    <SelectTrigger size="sm" className="w-[136px]" aria-label={`Tipe ${byId.get(s.skillId)?.nama}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wajib">Wajib (2)</SelectItem>
                      <SelectItem value="opsional">Tambahan (1)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="ghost" size="icon-sm" onClick={() => toggle(s.skillId)} aria-label={`Lepas ${byId.get(s.skillId)?.nama}`}>
                    <X />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </form>
        <SheetFooter className="flex-row justify-end border-t">
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Batal
          </Button>
          <Button type="submit" form="job-form" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            Simpan
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
