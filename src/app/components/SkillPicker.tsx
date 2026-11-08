import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Check, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/app/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover'
import { fetchCatalog } from '@/app/lib/api'
import { useDebounced, useServerPage } from '@/app/lib/hooks'
import { LoadingNote } from './common'
import { Skeleton } from './ui/skeleton'
import { cn } from '@/app/lib/utils'
import type { Skill } from '@/app/lib/types'

const LIMIT = 20
const loadSkills = (query: import('@/app/lib/api').BrowseParams, signal?: AbortSignal) => fetchCatalog<Skill>('skills',query,signal)

/** Searchable dictionary picker (matches names and aliases). Selected skills show a check and toggle off. */
export function SkillPicker({
  selected,
  onToggle,
  children,
  closeOnPick = false,
}: {
  skills: Skill[]
  selected: Set<string>
  onToggle: (id: string) => void
  children?: ReactNode
  closeOnPick?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [q,setQ] = useState('')
  const [offset,setOffset] = useState(0)
  const search=useDebounced(q)
  const page=useServerPage(loadSkills,{q:search,offset,limit:LIMIT},open && q===search)
  const total=page.data?.total ?? 0
  const list=useRef<HTMLDivElement>(null)
  // A new page starts at its first item, not wherever the previous page was scrolled to.
  useEffect(()=>{list.current?.scrollTo({top:0})},[offset])
  const skills=useMemo(()=>page.data?.items ?? [],[page.data])
  const groups = useMemo(() => {
    const m = new Map<string, Skill[]>()
    for (const s of [...skills].sort((a, b) => a.nama.localeCompare(b.nama, 'id'))) m.set(s.kategori, [...(m.get(s.kategori) ?? []), s])
    return [...m].sort(([a], [b]) => a.localeCompare(b, 'id'))
  }, [skills])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children ?? (
          <Button type="button" variant="outline" size="sm" className="rounded-full border-dashed">
            <Plus /> Tambah skill
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-[min(22rem,calc(100vw-2rem))] overflow-hidden p-0" align="start" collisionPadding={16}>
        <Command shouldFilter={false}>
          <CommandInput value={q} onValueChange={(value)=>{setQ(value);setOffset(0)}} placeholder="Cari skill, misal: excel, js, k3…" />
          <CommandList ref={list} className="overscroll-contain" style={{ maxHeight: "min(18rem, 45dvh)" }}>
            {page.loading ? (
              <div className="grid gap-3 p-3">
                <LoadingNote>Memuat skill...</LoadingNote>
                <div className="grid gap-2.5" aria-hidden>
                  <Skeleton className="h-3 w-20" />
                  {[70, 55, 80, 60, 45].map((w) => <Skeleton key={w} className="h-4" style={{ width: `${w}%` }} />)}
                </div>
              </div>
            ) : page.error ? (
              <p role="alert" className="p-3 text-sm">{page.error} <button className="underline" onClick={page.retry}>Coba lagi</button></p>
            ) : (
              <CommandEmpty className="px-3 py-6 text-center text-sm text-muted-foreground">
                {q ? `Tidak ada skill "${q}" di kamus.` : 'Kamus skill masih kosong.'}
              </CommandEmpty>
            )}
            {groups.map(([kategori, list]) => (
              <CommandGroup key={kategori} heading={kategori}>
                {list.map((s) => {
                  const on = selected.has(s.id)
                  return (
                    <CommandItem
                      key={s.id}
                      className={cn('gap-2 py-2', on && 'font-medium text-mint-ink')}
                      value={s.nama}
                      keywords={s.alias}
                      onSelect={() => {
                        onToggle(s.id)
                        if (closeOnPick) setOpen(false)
                      }}
                    >
                      <span className="flex-1 truncate">{s.nama}</span>
                      {on && <Check className="text-mint-ink" aria-label="dipilih" />}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            ))}
          </CommandList>
          {total > LIMIT && (
            <nav aria-label="Halaman skill" className="flex items-center justify-between gap-2 border-t bg-muted/40 px-3 py-1.5">
              <span className="text-xs text-muted-foreground tabular-nums">
                {offset + 1}-{Math.min(offset + LIMIT, total)} dari {total}
              </span>
              <div className="flex gap-1">
                <Button type="button" variant="ghost" size="icon" className="size-8" aria-label="Halaman sebelumnya" disabled={page.loading || offset === 0} onClick={() => setOffset(Math.max(0, offset - LIMIT))}>
                  <ChevronLeft />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="size-8" aria-label="Halaman berikutnya" disabled={page.loading || offset + LIMIT >= total} onClick={() => setOffset(offset + LIMIT)}>
                  <ChevronRight />
                </Button>
              </div>
            </nav>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  )
}
