import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Loader2, Pencil, Plus } from 'lucide-react'
import { ConfirmDelete, CsvImportDialog, Pager, SearchBox, TagInput, type RowResult } from '@/app/components/admin'
import { splitList, useSearchPaged } from '@/app/lib/table'
import { EmptyState, Field, FormError, PageHeader } from '@/app/components/common'
import { invalid } from '@/app/lib/utils'
import { Button } from '@/app/components/ui/button'
import { Card } from '@/app/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/components/ui/dialog'
import { Input } from '@/app/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table'
import { ApiError, deleteSkill, importRows, newId, saveSkill, useDb } from '@/app/lib/api'
import { normalizeKey, skillNameConflicts } from '@/app/lib/matching'
import type { Skill } from '@/app/lib/types'

const ALL = '__semua'

export default function AdminSkill() {
  const db = useDb()
  const [kategori, setKategori] = useState(ALL)
  const [editing, setEditing] = useState<Skill | 'new' | null>(null)
  const categories = [...new Set(db.skills.map((s) => s.kategori))].sort((a, b) => a.localeCompare(b, 'id'))
  const list = db.skills
    .filter((s) => kategori === ALL || s.kategori === kategori)
    .sort((a, b) => a.nama.localeCompare(b.nama, 'id'))
  const t = useSearchPaged(list, (s) => `${s.nama} ${s.alias.join(' ')}`)
  const usage = (id: string) => db.jobs.filter((j) => j.skills.some((s) => s.skillId === id)).length

  const parse = (rec: Record<string, string>, accepted: Skill[]): RowResult<Skill> => {
    const nama = rec.nama ?? ''
    const key = normalizeKey(nama)
    if (!key) return { ok: false, key: `#${Math.random()}`, label: nama, error: 'Nama kosong.' }
    if (!rec.kategori) return { ok: false, key, label: nama, error: 'Kategori kosong.' }
    const existing = db.skills.find((s) => normalizeKey(s.nama) === key)
    const item: Skill = { id: existing?.id ?? newId('sk'), nama, kategori: rec.kategori, alias: splitList(rec.alias) }
    const clash = skillNameConflicts(item, [...db.skills, ...accepted])
    if (clash.length) return { ok: false, key, label: nama, error: `Sudah dipakai skill lain: ${clash.join(', ')}` }
    return { ok: true, item, key, label: nama, isNew: !existing }
  }

  return (
    <>
      <PageHeader
        title="Kamus skill"
        description="Nama skill beserta nama lainnya (alias). Alias dipakai untuk menyamakan hasil bacaan CV, misalnya “JS” menjadi JavaScript."
        actions={
          <>
            <CsvImportDialog
              entity="skill"
              columns={[{ name: 'nama', required: true }, { name: 'kategori', required: true }, { name: 'alias' }]}
              example={['Microsoft Excel', 'Perkantoran', 'excel|ms excel|spreadsheet']}
              parse={parse}
              onImport={(items) => importRows('skills', items)}
            />
            <Button onClick={() => setEditing('new')}>
              <Plus /> Tambah skill
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <SearchBox value={t.q} onChange={t.setQ} placeholder="Cari nama atau alias" />
        <Select
          value={kategori}
          onValueChange={(v) => {
            setKategori(v)
            t.setPage(1)
          }}
        >
          <SelectTrigger className="w-full bg-card sm:w-56" aria-label="Filter kategori">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Semua kategori</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {t.total === 0 ? (
        <EmptyState title="Skill tidak ditemukan" />
      ) : (
        <Card className="gap-0 overflow-hidden py-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="pl-4">Nama</TableHead>
                <TableHead className="hidden md:table-cell">Kategori</TableHead>
                <TableHead className="hidden lg:table-cell">Alias</TableHead>
                <TableHead className="text-right">Dipakai</TableHead>
                <TableHead className="w-24 pr-4 text-right">
                  <span className="sr-only">Aksi</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {t.rows.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="pl-4 font-medium">
                    {s.nama}
                    <div className="text-xs font-normal text-muted-foreground md:hidden">{s.kategori}</div>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">{s.kategori}</TableCell>
                  <TableCell className="hidden max-w-xs lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {s.alias.slice(0, 3).map((a) => (
                        <span key={a} className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                          {a}
                        </span>
                      ))}
                      {s.alias.length > 3 && <span className="px-1 text-xs text-muted-foreground">+{s.alias.length - 3}</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">{usage(s.id)} pekerjaan</TableCell>
                  <TableCell className="pr-4 text-right">
                    <Button variant="ghost" size="icon-sm" onClick={() => setEditing(s)} aria-label={`Ubah ${s.nama}`}>
                      <Pencil />
                    </Button>
                    <ConfirmDelete
                      name={s.nama}
                      detail={`Skill ini dipakai ${usage(s.id)} pekerjaan dan ${db.trainings.filter((x) => x.skillIds.includes(s.id)).length} pelatihan. Semuanya akan kehilangan skill ini, termasuk daftar skill pengguna.`}
                      onConfirm={() => deleteSkill(s.id)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pager page={t.page} pages={t.pages} total={t.total} setPage={t.setPage} />
        </Card>
      )}

      <SkillDialog key={editing === 'new' ? 'new' : editing?.id ?? 'none'} skill={editing} categories={categories} skills={db.skills} onClose={() => setEditing(null)} />
    </>
  )
}

function SkillDialog({
  skill,
  categories,
  skills,
  onClose,
}: {
  skill: Skill | 'new' | null
  categories: string[]
  skills: Skill[]
  onClose: () => void
}) {
  const existing = skill && skill !== 'new' ? skill : null
  const [f, setF] = useState({ nama: existing?.nama ?? '', kategori: existing?.kategori ?? '', alias: existing?.alias ?? [] })
  const [errors, setErrors] = useState<{ nama?: string; kategori?: string; form?: string }>({})
  const [pending, setPending] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const next: typeof errors = {}
    if (!f.nama.trim()) next.nama = 'Nama wajib diisi.'
    if (!f.kategori.trim()) next.kategori = 'Kategori wajib diisi.'
    const alias = f.alias.filter((a) => normalizeKey(a) !== normalizeKey(f.nama))
    const clash = skillNameConflicts({ id: existing?.id, nama: f.nama, alias }, skills)
    if (clash.length) next.form = `Sudah dipakai skill lain: ${clash.join(', ')}. Satu nama hanya boleh menunjuk ke satu skill.`
    setErrors(next)
    if (Object.keys(next).length) return
    setPending(true)
    try {
      await saveSkill({ id: existing?.id, nama: f.nama.trim(), kategori: f.kategori.trim(), alias })
      toast.success(existing ? 'Skill diperbarui' : 'Skill ditambahkan')
      onClose()
    } catch (err) {
      setErrors({ form: err instanceof ApiError ? err.message : 'Gagal menyimpan.' })
      setPending(false)
    }
  }

  return (
    <Dialog open={skill !== null} onOpenChange={(o) => !o && !pending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existing ? 'Ubah skill' : 'Tambah skill'}</DialogTitle>
          <DialogDescription>Tambahkan alias untuk ejaan lain yang sering muncul di CV.</DialogDescription>
        </DialogHeader>
        <form id="skill-form" onSubmit={submit} noValidate className="grid gap-4">
          <FormError>{errors.form}</FormError>
          <Field label="Nama skill" htmlFor="sk-nama" error={errors.nama}>
            <Input id="sk-nama" value={f.nama} onChange={(e) => setF({ ...f, nama: e.target.value })} {...invalid('sk-nama', errors.nama)} />
          </Field>
          <Field label="Kategori" htmlFor="sk-kategori" error={errors.kategori} hint="Pilih yang ada atau ketik kategori baru.">
            <Input id="sk-kategori" list="sk-kategori-list" value={f.kategori} onChange={(e) => setF({ ...f, kategori: e.target.value })} {...invalid('sk-kategori', errors.kategori)} />
            <datalist id="sk-kategori-list">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field label="Alias" htmlFor="sk-alias" hint="Tekan Enter atau koma untuk menambah.">
            <TagInput id="sk-alias" value={f.alias} onChange={(alias) => setF({ ...f, alias })} placeholder="misal: excel, ms excel" />
          </Field>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Batal
          </Button>
          <Button type="submit" form="skill-form" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
