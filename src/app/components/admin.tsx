import { useState, type KeyboardEvent, type ReactNode } from 'react'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, CircleCheck, CircleX, Download, FileUp, Loader2, Search, Trash2, X } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/app/components/ui/alert-dialog'
import { Button } from '@/app/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog'
import { Input } from '@/app/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table'
import { ApiError } from '@/app/lib/api'
import { csvRecords } from '@/app/lib/csv'
import { downloadCsv, PAGE_SIZE } from '@/app/lib/table'
import { normalizeKey } from '@/app/lib/matching'
import { cn } from '@/app/lib/utils'

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative w-full sm:w-72">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="bg-card pl-9" />
    </div>
  )
}

export function Pager({ page, pages, total, setPage }: { page: number; pages: number; total: number; setPage: (p: number) => void }) {
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  return (
    <div className="flex items-center justify-between gap-3 border-t px-4 py-3 text-[13px] text-muted-foreground">
      <span>
        {from}–{Math.min(page * PAGE_SIZE, total)} dari {total}
      </span>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon-sm" onClick={() => setPage(page - 1)} disabled={page <= 1} aria-label="Halaman sebelumnya">
          <ChevronLeft />
        </Button>
        <span className="min-w-12 text-center tabular-nums">
          {page} / {pages}
        </span>
        <Button variant="ghost" size="icon-sm" onClick={() => setPage(page + 1)} disabled={page >= pages} aria-label="Halaman berikutnya">
          <ChevronRight />
        </Button>
      </div>
    </div>
  )
}

export function ConfirmDelete({ name, detail, onConfirm }: { name: string; detail?: ReactNode; onConfirm: () => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  return (
    <AlertDialog open={open} onOpenChange={(o) => !pending && setOpen(o)}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:bg-danger-soft hover:text-destructive" aria-label={`Hapus ${name}`}>
          <Trash2 />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus “{name}”?</AlertDialogTitle>
          <AlertDialogDescription>{detail ?? 'Data yang dihapus tidak bisa dikembalikan.'}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Batal</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive hover:bg-destructive/90"
            disabled={pending}
            onClick={async (e) => {
              e.preventDefault()
              setPending(true)
              try {
                await onConfirm()
                toast.success(`“${name}” dihapus`)
                setOpen(false)
              } catch (err) {
                toast.error(err instanceof ApiError ? err.message : 'Gagal menghapus.')
              } finally {
                setPending(false)
              }
            }}
          >
            {pending && <Loader2 className="animate-spin" />}
            Hapus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/** Free-text tags (Enter or comma adds, Backspace on empty removes the last). */
export function TagInput({ id, value, onChange, placeholder }: { id: string; value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [text, setText] = useState('')
  const add = () => {
    const t = text.trim().replace(/,$/, '').trim()
    if (t && !value.some((v) => normalizeKey(v) === normalizeKey(t))) onChange([...value, t])
    setText('')
  }
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      add()
    } else if (e.key === 'Backspace' && !text && value.length) onChange(value.slice(0, -1))
  }
  return (
    <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-2 py-1.5 shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
      {value.map((v) => (
        <span key={v} className="inline-flex h-6 items-center gap-1 rounded-full bg-secondary pr-1 pl-2.5 text-xs font-medium">
          {v}
          <button type="button" onClick={() => onChange(value.filter((x) => x !== v))} className="grid size-4 place-items-center rounded-full hover:bg-black/10" aria-label={`Hapus alias ${v}`}>
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKey}
        onBlur={add}
        placeholder={value.length ? '' : placeholder}
        className="h-6 min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  )
}

export type RowResult<T> = { ok: true; item: T; key: string; label: string; isNew: boolean } | { ok: false; key: string; label: string; error: string }

type Preview<T> = { fileName: string; rows: RowResult<T>[] }

/**
 * Upload → preview with per-row errors → confirm. `parse` validates one record against current data;
 * duplicate keys inside the same file are rejected here so every page gets that check.
 */
export function CsvImportDialog<T>({
  entity,
  columns,
  example,
  parse,
  onImport,
}: {
  entity: string
  columns: { name: string; required?: boolean }[]
  example: string[]
  /** `accepted` = rows earlier in the same file that passed, for cross-row checks. */
  parse: (rec: Record<string, string>, accepted: T[]) => RowResult<T>
  onImport: (items: T[]) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [preview, setPreview] = useState<Preview<T> | null>(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const valid = preview?.rows.filter((r): r is Extract<RowResult<T>, { ok: true }> => r.ok) ?? []

  async function read(file: File) {
    setError('')
    setPreview(null)
    if (!/\.csv$/i.test(file.name)) return setError('File harus berformat .csv')
    const { headers, records } = csvRecords(await file.text())
    const missing = columns.filter((c) => c.required && !headers.includes(c.name)).map((c) => c.name)
    if (missing.length) return setError(`Kolom wajib tidak ada: ${missing.join(', ')}. Unduh template untuk melihat formatnya.`)
    if (records.length === 0) return setError('File tidak berisi baris data.')
    const seen = new Set<string>()
    const accepted: T[] = []
    const rows = records.map((rec): RowResult<T> => {
      const r = parse(rec, accepted)
      if (seen.has(r.key)) return { ok: false, key: r.key, label: r.label, error: 'Duplikat dengan baris lain di file ini.' }
      seen.add(r.key)
      if (r.ok) accepted.push(r.item)
      return r
    })
    setPreview({ fileName: file.name, rows })
  }

  async function confirm() {
    setPending(true)
    try {
      await onImport(valid.map((r) => r.item))
      const added = valid.filter((r) => r.isNew).length
      toast.success(`${valid.length} ${entity} diimpor`, { description: `${added} baru, ${valid.length - added} diperbarui.` })
      setOpen(false)
      setPreview(null)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Import gagal.')
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (pending) return
        setOpen(o)
        if (!o) {
          setPreview(null)
          setError('')
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileUp /> Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import {entity} dari CSV</DialogTitle>
          <DialogDescription>
            Kolom: {columns.map((c) => (c.required ? c.name : `${c.name} (opsional)`)).join(', ')}. Isi beberapa nilai dalam satu kolom dipisah dengan “|”.
            Data dengan nama yang sama akan diperbarui.
          </DialogDescription>
        </DialogHeader>

        <div className="-mx-6 grid content-start gap-4 overflow-y-auto px-6">
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors focus-within:ring-[3px] focus-within:ring-ring/50 hover:bg-primary/90">
              <FileUp className="size-4" /> {preview ? 'Pilih file lain' : 'Pilih file CSV'}
              <input
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  e.target.value = ''
                  if (f) void read(f)
                }}
              />
            </label>
            <Button variant="ghost" onClick={() => downloadCsv(`template-${entity.replace(/\W+/g, '-')}.csv`, [columns.map((c) => c.name), example])}>
              <Download /> Unduh template
            </Button>
          </div>

          {error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2.5 text-sm text-danger-ink">{error}</p>}

          {preview && (
            <div className="animate-in fade-in">
              <p className="mb-2 text-[13px] text-muted-foreground">
                {preview.fileName}: <span className="font-medium text-mint-ink">{valid.length} siap diimpor</span>
                {preview.rows.length - valid.length > 0 && (
                  <>
                    , <span className="font-medium text-danger-ink">{preview.rows.length - valid.length} error dilewati</span>
                  </>
                )}
              </p>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Baris</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.rows.map((r, i) => (
                      <TableRow key={i} className={cn(!r.ok && 'bg-danger-soft/40')}>
                        <TableCell className="text-muted-foreground tabular-nums">{i + 2}</TableCell>
                        <TableCell className="max-w-56 truncate font-medium">{r.label || '(kosong)'}</TableCell>
                        <TableCell className="whitespace-normal">
                          {r.ok ? (
                            <span className="inline-flex items-center gap-1.5 text-mint-ink">
                              <CircleCheck className="size-4" /> {r.isNew ? 'Baru' : 'Perbarui'}
                            </span>
                          ) : (
                            <span className="inline-flex items-start gap-1.5 text-danger-ink">
                              <CircleX className="mt-0.5 size-4 shrink-0" /> {r.error}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={confirm} disabled={pending || valid.length === 0}>
            {pending && <Loader2 className="animate-spin" />}
            Import {valid.length > 0 ? `${valid.length} baris` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
