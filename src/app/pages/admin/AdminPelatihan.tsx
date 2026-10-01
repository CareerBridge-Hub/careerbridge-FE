import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Loader2, Pencil, Plus, X } from 'lucide-react'
import { ConfirmDelete, CsvImportDialog, Pager, SearchBox, type RowResult } from '@/app/components/admin'
import { isUrl, splitList, useSearchPaged } from '@/app/lib/table'
import { EmptyState, Field, FormError, PageHeader, SkillBadge } from '@/app/components/common'
import { invalid } from '@/app/lib/utils'
import { SkillPicker } from '@/app/components/SkillPicker'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { Card } from '@/app/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/components/ui/dialog'
import { Input } from '@/app/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs'
import { PROVINCES } from '@/app/data/seed'
import { ApiError, deleteInstitution, deleteTraining, importRows, newId, saveInstitution, saveTraining, useDb } from '@/app/lib/api'
import { rupiah } from '@/app/lib/format'
import { normalizeKey, normalizeSkills } from '@/app/lib/matching'
import type { Db, Institution, InstitutionType, Moda, Training } from '@/app/lib/types'

const TYPES: InstitutionType[] = ['LPK', 'BLK', 'Platform']
const MODES: Moda[] = ['daring', 'luring']

export default function AdminPelatihan() {
  const db = useDb()
  return (
    <>
      <PageHeader title="LPK & pelatihan" description="Lembaga penyelenggara dan program pelatihannya, beserta skill yang diajarkan." />
      <Tabs defaultValue="program">
        <TabsList>
          <TabsTrigger value="program">Program ({db.trainings.length})</TabsTrigger>
          <TabsTrigger value="lembaga">Lembaga ({db.institutions.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="program" className="mt-4">
          <Programs db={db} />
        </TabsContent>
        <TabsContent value="lembaga" className="mt-4">
          <Institutions db={db} />
        </TabsContent>
      </Tabs>
    </>
  )
}

function Programs({ db }: { db: Db }) {
  const [editing, setEditing] = useState<Training | 'new' | null>(null)
  const inst = new Map(db.institutions.map((i) => [i.id, i]))
  const skills = new Map(db.skills.map((s) => [s.id, s]))
  const list = [...db.trainings].sort((a, b) => a.nama.localeCompare(b.nama, 'id'))
  const t = useSearchPaged(list, (x) => `${x.nama} ${inst.get(x.institutionId)?.nama ?? ''}`)
  const key = (nama: string, lembagaId: string) => `${normalizeKey(nama)}@${lembagaId}`

  const parse = (rec: Record<string, string>): RowResult<Training> => {
    const nama = rec.nama ?? ''
    const lembaga = db.institutions.find((i) => normalizeKey(i.nama) === normalizeKey(rec.lembaga ?? ''))
    const k = key(nama, lembaga?.id ?? '?')
    const label = `${nama} · ${rec.lembaga ?? ''}`
    const fail = (error: string): RowResult<Training> => ({ ok: false, key: normalizeKey(nama) ? k : `#${Math.random()}`, label, error })
    if (!normalizeKey(nama)) return fail('Nama kosong.')
    if (!lembaga) return fail(`Lembaga “${rec.lembaga ?? ''}” belum ada. Import lembaga dulu.`)
    // Accepts 850000, 850.000, Rp850.000; rejects decimals like 850.000,00 that would read as 85 juta.
    if (!/^\s*(rp\.?\s*)?\d{1,3}([.,\s]?\d{3})*\s*$/i.test(rec.biaya ?? '')) return fail('biaya harus angka bulat, contoh 850000 (0 = gratis).')
    const biaya = Number((rec.biaya ?? '').replace(/\D/g, ''))
    const moda = (rec.moda ?? '').toLowerCase() as Moda
    if (!MODES.includes(moda)) return fail('moda harus “daring” atau “luring”.')
    if (!isUrl(rec.url_daftar ?? '')) return fail('url_daftar harus link http/https.')
    const sk = normalizeSkills(splitList(rec.skill), db.skills)
    if (sk.unknown.length) return fail(`Skill tidak ada di kamus: ${sk.unknown.join(', ')}`)
    if (sk.matched.length === 0) return fail('Minimal satu skill.')
    const existing = db.trainings.find((x) => key(x.nama, x.institutionId) === k)
    return {
      ok: true,
      key: k,
      label,
      isNew: !existing,
      item: {
        id: existing?.id ?? newId('tr'),
        institutionId: lembaga.id,
        nama,
        biaya,
        moda,
        durasi: rec.durasi ?? '',
        urlDaftar: rec.url_daftar,
        skillIds: sk.matched.map((m) => m.skillId),
      },
    }
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchBox value={t.q} onChange={t.setQ} placeholder="Cari program atau lembaga" />
        <div className="flex gap-2">
          <CsvImportDialog
            entity="program pelatihan"
            columns={[
              { name: 'nama', required: true },
              { name: 'lembaga', required: true },
              { name: 'biaya', required: true },
              { name: 'moda', required: true },
              { name: 'durasi' },
              { name: 'url_daftar', required: true },
              { name: 'skill', required: true },
            ]}
            example={['K3 Dasar', 'BLK Bekasi', '0', 'luring', '5 hari', 'https://contoh.go.id/daftar', 'K3 Dasar']}
            parse={parse}
            onImport={(items) => importRows('trainings', items)}
          />
          <Button onClick={() => setEditing('new')} disabled={db.institutions.length === 0}>
            <Plus /> Tambah program
          </Button>
        </div>
      </div>

      {t.total === 0 ? (
        <EmptyState title="Program tidak ditemukan" />
      ) : (
        <Card className="gap-0 overflow-hidden py-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="pl-4">Program</TableHead>
                <TableHead className="hidden md:table-cell">Biaya</TableHead>
                <TableHead className="hidden sm:table-cell">Moda</TableHead>
                <TableHead className="hidden lg:table-cell">Skill</TableHead>
                <TableHead className="w-24 pr-4">
                  <span className="sr-only">Aksi</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {t.rows.map((x) => (
                <TableRow key={x.id}>
                  <TableCell className="pl-4">
                    <div className="font-medium">{x.nama}</div>
                    <div className="text-xs text-muted-foreground">{inst.get(x.institutionId)?.nama}</div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{rupiah(x.biaya)}</TableCell>
                  <TableCell className="hidden capitalize sm:table-cell">{x.moda}</TableCell>
                  <TableCell className="hidden max-w-xs lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {x.skillIds.map((id) => (
                        <span key={id} className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                          {skills.get(id)?.nama ?? id}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="pr-4 text-right whitespace-nowrap">
                    <Button variant="ghost" size="icon-sm" onClick={() => setEditing(x)} aria-label={`Ubah ${x.nama}`}>
                      <Pencil />
                    </Button>
                    <ConfirmDelete name={x.nama} onConfirm={() => deleteTraining(x.id)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pager page={t.page} pages={t.pages} total={t.total} setPage={t.setPage} />
        </Card>
      )}

      <ProgramDialog key={editing === 'new' ? 'new' : editing?.id ?? 'none'} training={editing} db={db} onClose={() => setEditing(null)} />
    </>
  )
}

function ProgramDialog({ training, db, onClose }: { training: Training | 'new' | null; db: Db; onClose: () => void }) {
  const existing = training && training !== 'new' ? training : null
  const [f, setF] = useState({
    nama: existing?.nama ?? '',
    institutionId: existing?.institutionId ?? '',
    biaya: String(existing?.biaya ?? 0),
    moda: existing?.moda ?? ('luring' as Moda),
    durasi: existing?.durasi ?? '',
    urlDaftar: existing?.urlDaftar ?? '',
    skillIds: existing?.skillIds ?? [],
  })
  const [errors, setErrors] = useState<Partial<Record<'nama' | 'institutionId' | 'biaya' | 'urlDaftar' | 'skillIds' | 'form', string>>>({})
  const [pending, setPending] = useState(false)
  const byId = new Map(db.skills.map((s) => [s.id, s]))
  const selected = new Set(f.skillIds)
  const toggle = (id: string) => setF((p) => ({ ...p, skillIds: selected.has(id) ? p.skillIds.filter((x) => x !== id) : [...p.skillIds, id] }))

  async function submit(e: FormEvent) {
    e.preventDefault()
    const next: typeof errors = {}
    if (!f.nama.trim()) next.nama = 'Nama wajib diisi.'
    if (!f.institutionId) next.institutionId = 'Pilih lembaga.'
    if (!/^\d+$/.test(f.biaya)) next.biaya = 'Isi angka tanpa titik. 0 = gratis.'
    if (!isUrl(f.urlDaftar)) next.urlDaftar = 'Link harus diawali http:// atau https://'
    if (f.skillIds.length === 0) next.skillIds = 'Pilih minimal satu skill.'
    setErrors(next)
    if (Object.keys(next).length) return
    setPending(true)
    try {
      await saveTraining({ id: existing?.id, ...f, nama: f.nama.trim(), durasi: f.durasi.trim(), biaya: Number(f.biaya) })
      toast.success(existing ? 'Program diperbarui' : 'Program ditambahkan')
      onClose()
    } catch (err) {
      setErrors({ form: err instanceof ApiError ? err.message : 'Gagal menyimpan.' })
      setPending(false)
    }
  }

  return (
    <Dialog open={training !== null} onOpenChange={(o) => !o && !pending && onClose()}>
      <DialogContent className="max-h-[90svh] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{existing ? 'Ubah program' : 'Tambah program'}</DialogTitle>
          <DialogDescription>Program muncul di rekomendasi kalau mengajarkan skill yang kurang.</DialogDescription>
        </DialogHeader>
        <form id="tr-form" onSubmit={submit} noValidate className="-mx-6 grid content-start gap-4 overflow-y-auto px-6 pb-1">
          <FormError>{errors.form}</FormError>
          <Field label="Nama program" htmlFor="tr-nama" error={errors.nama}>
            <Input id="tr-nama" value={f.nama} onChange={(e) => setF({ ...f, nama: e.target.value })} {...invalid('tr-nama', errors.nama)} />
          </Field>
          <Field label="Lembaga" htmlFor="tr-lembaga" error={errors.institutionId}>
            <Select value={f.institutionId} onValueChange={(v) => setF({ ...f, institutionId: v })}>
              <SelectTrigger id="tr-lembaga" className="w-full" {...invalid('tr-lembaga', errors.institutionId)}>
                <SelectValue placeholder="Pilih lembaga" />
              </SelectTrigger>
              <SelectContent>
                {db.institutions.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.nama} · {i.kota}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Biaya (Rp)" htmlFor="tr-biaya" error={errors.biaya} hint={Number(f.biaya) === 0 ? 'Gratis' : rupiah(Number(f.biaya) || 0)}>
              <Input id="tr-biaya" inputMode="numeric" value={f.biaya} onChange={(e) => setF({ ...f, biaya: e.target.value.replace(/\D/g, '') })} {...invalid('tr-biaya', errors.biaya)} />
            </Field>
            <Field label="Moda" htmlFor="tr-moda">
              <Select value={f.moda} onValueChange={(v) => setF({ ...f, moda: v as Moda })}>
                <SelectTrigger id="tr-moda" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daring">Daring (online)</SelectItem>
                  <SelectItem value="luring">Luring (tatap muka)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Durasi" htmlFor="tr-durasi">
            <Input id="tr-durasi" placeholder="5 hari" value={f.durasi} onChange={(e) => setF({ ...f, durasi: e.target.value })} />
          </Field>
          <Field label="Link pendaftaran" htmlFor="tr-url" error={errors.urlDaftar}>
            <Input id="tr-url" type="url" placeholder="https://" value={f.urlDaftar} onChange={(e) => setF({ ...f, urlDaftar: e.target.value })} {...invalid('tr-url', errors.urlDaftar)} />
          </Field>
          <div className="grid gap-2">
            <span className="text-sm font-medium">Skill yang diajarkan</span>
            <div className="flex flex-wrap gap-1.5">
              {f.skillIds.map((id) => (
                <SkillBadge
                  key={id}
                  action={
                    <button type="button" onClick={() => toggle(id)} className="grid size-5 place-items-center rounded-full hover:bg-black/10" aria-label={`Lepas ${byId.get(id)?.nama}`}>
                      <X className="size-3" />
                    </button>
                  }
                >
                  {byId.get(id)?.nama ?? id}
                </SkillBadge>
              ))}
              <SkillPicker skills={db.skills} selected={selected} onToggle={toggle} />
            </div>
            {errors.skillIds && <p className="text-[13px] text-destructive">{errors.skillIds}</p>}
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Batal
          </Button>
          <Button type="submit" form="tr-form" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Institutions({ db }: { db: Db }) {
  const [editing, setEditing] = useState<Institution | 'new' | null>(null)
  const list = [...db.institutions].sort((a, b) => a.nama.localeCompare(b.nama, 'id'))
  const t = useSearchPaged(list, (i) => `${i.nama} ${i.kota} ${i.provinsi}`)
  const programs = (id: string) => db.trainings.filter((x) => x.institutionId === id).length

  const parse = (rec: Record<string, string>): RowResult<Institution> => {
    const nama = rec.nama ?? ''
    const key = normalizeKey(nama)
    const fail = (error: string): RowResult<Institution> => ({ ok: false, key: key || `#${Math.random()}`, label: nama, error })
    if (!key) return fail('Nama kosong.')
    const jenis = TYPES.find((x) => x.toLowerCase() === (rec.jenis ?? '').toLowerCase())
    if (!jenis) return fail('jenis harus LPK, BLK, atau Platform.')
    const provinsi = PROVINCES.find((p) => normalizeKey(p) === normalizeKey(rec.provinsi ?? ''))
    if (!provinsi) return fail(`Provinsi “${rec.provinsi ?? ''}” tidak dikenal.`)
    if (!rec.kota) return fail('Kota kosong.')
    if (rec.website && !isUrl(rec.website)) return fail('website harus link http/https.')
    const existing = db.institutions.find((i) => normalizeKey(i.nama) === key)
    return {
      ok: true,
      key,
      label: nama,
      isNew: !existing,
      item: { id: existing?.id ?? newId('lpk'), nama, jenis, provinsi, kota: rec.kota, website: rec.website ?? '' },
    }
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchBox value={t.q} onChange={t.setQ} placeholder="Cari lembaga atau kota" />
        <div className="flex gap-2">
          <CsvImportDialog
            entity="lembaga"
            columns={[{ name: 'nama', required: true }, { name: 'jenis', required: true }, { name: 'provinsi', required: true }, { name: 'kota', required: true }, { name: 'website' }]}
            example={['BLK Bekasi', 'BLK', 'Jawa Barat', 'Bekasi', 'https://contoh.go.id']}
            parse={parse}
            onImport={(items) => importRows('institutions', items)}
          />
          <Button onClick={() => setEditing('new')}>
            <Plus /> Tambah lembaga
          </Button>
        </div>
      </div>

      {t.total === 0 ? (
        <EmptyState title="Lembaga tidak ditemukan" />
      ) : (
        <Card className="gap-0 overflow-hidden py-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="pl-4">Lembaga</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead className="hidden md:table-cell">Lokasi</TableHead>
                <TableHead className="text-right">Program</TableHead>
                <TableHead className="w-24 pr-4">
                  <span className="sr-only">Aksi</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {t.rows.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="pl-4 font-medium">{i.nama}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{i.jenis}</Badge>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {i.kota}, {i.provinsi}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{programs(i.id)}</TableCell>
                  <TableCell className="pr-4 text-right whitespace-nowrap">
                    <Button variant="ghost" size="icon-sm" onClick={() => setEditing(i)} aria-label={`Ubah ${i.nama}`}>
                      <Pencil />
                    </Button>
                    <ConfirmDelete
                      name={i.nama}
                      detail={programs(i.id) > 0 ? `${programs(i.id)} program pelatihan dari lembaga ini ikut terhapus.` : undefined}
                      onConfirm={() => deleteInstitution(i.id)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pager page={t.page} pages={t.pages} total={t.total} setPage={t.setPage} />
        </Card>
      )}

      <InstitutionDialog key={editing === 'new' ? 'new' : editing?.id ?? 'none'} inst={editing} all={db.institutions} onClose={() => setEditing(null)} />
    </>
  )
}

function InstitutionDialog({ inst, all, onClose }: { inst: Institution | 'new' | null; all: Institution[]; onClose: () => void }) {
  const existing = inst && inst !== 'new' ? inst : null
  const [f, setF] = useState({
    nama: existing?.nama ?? '',
    jenis: existing?.jenis ?? ('LPK' as InstitutionType),
    provinsi: existing?.provinsi ?? '',
    kota: existing?.kota ?? '',
    website: existing?.website ?? '',
  })
  const [errors, setErrors] = useState<Partial<Record<'nama' | 'provinsi' | 'kota' | 'website' | 'form', string>>>({})
  const [pending, setPending] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const next: typeof errors = {}
    if (!f.nama.trim()) next.nama = 'Nama wajib diisi.'
    else if (all.some((i) => i.id !== existing?.id && normalizeKey(i.nama) === normalizeKey(f.nama))) next.nama = 'Lembaga dengan nama ini sudah ada.'
    if (!f.provinsi) next.provinsi = 'Pilih provinsi.'
    if (!f.kota.trim()) next.kota = 'Kota wajib diisi.'
    if (f.website && !isUrl(f.website)) next.website = 'Link harus diawali http:// atau https://'
    setErrors(next)
    if (Object.keys(next).length) return
    setPending(true)
    try {
      await saveInstitution({ id: existing?.id, ...f, nama: f.nama.trim(), kota: f.kota.trim(), website: f.website.trim() })
      toast.success(existing ? 'Lembaga diperbarui' : 'Lembaga ditambahkan')
      onClose()
    } catch (err) {
      setErrors({ form: err instanceof ApiError ? err.message : 'Gagal menyimpan.' })
      setPending(false)
    }
  }

  return (
    <Dialog open={inst !== null} onOpenChange={(o) => !o && !pending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existing ? 'Ubah lembaga' : 'Tambah lembaga'}</DialogTitle>
          <DialogDescription>LPK, BLK, atau platform belajar online.</DialogDescription>
        </DialogHeader>
        <form id="inst-form" onSubmit={submit} noValidate className="grid gap-4">
          <FormError>{errors.form}</FormError>
          <Field label="Nama lembaga" htmlFor="in-nama" error={errors.nama}>
            <Input id="in-nama" value={f.nama} onChange={(e) => setF({ ...f, nama: e.target.value })} {...invalid('in-nama', errors.nama)} />
          </Field>
          <Field label="Jenis" htmlFor="in-jenis">
            <Select value={f.jenis} onValueChange={(v) => setF({ ...f, jenis: v as InstitutionType })}>
              <SelectTrigger id="in-jenis" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((x) => (
                  <SelectItem key={x} value={x}>
                    {x}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Provinsi" htmlFor="in-prov" error={errors.provinsi}>
              <Select value={f.provinsi} onValueChange={(v) => setF({ ...f, provinsi: v })}>
                <SelectTrigger id="in-prov" className="w-full" {...invalid('in-prov', errors.provinsi)}>
                  <SelectValue placeholder="Pilih" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {PROVINCES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Kota" htmlFor="in-kota" error={errors.kota}>
              <Input id="in-kota" value={f.kota} onChange={(e) => setF({ ...f, kota: e.target.value })} {...invalid('in-kota', errors.kota)} />
            </Field>
          </div>
          <Field label="Website (opsional)" htmlFor="in-web" error={errors.website}>
            <Input id="in-web" type="url" placeholder="https://" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} {...invalid('in-web', errors.website)} />
          </Field>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Batal
          </Button>
          <Button type="submit" form="inst-form" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
