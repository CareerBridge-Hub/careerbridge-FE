import { useMemo, useState, type ReactNode } from 'react'
import { Check, Plus } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/app/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover'
import { fetchCatalog } from '@/app/lib/api'
import { useDebounced, useServerPage } from '@/app/lib/hooks'
import { PageControls } from './PageControls'
import type { Skill } from '@/app/lib/types'

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
  const page=useServerPage(loadSkills,{q:search,offset,limit:20},open && q===search)
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
      <PopoverContent className="w-[min(320px,calc(100vw-2rem))] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput value={q} onValueChange={(value)=>{setQ(value);setOffset(0)}} placeholder="Cari skill, misal: excel, js, k3…" />
          <CommandList className="max-h-72">
            {page.loading ? <p role="status" className="p-3 text-sm">Memuat skill...</p> : page.error ? <p role="alert" className="p-3 text-sm">{page.error} <button onClick={page.retry}>Coba lagi</button></p> : <CommandEmpty>Skill tidak ada di kamus.</CommandEmpty>}
            {groups.map(([kategori, list]) => (
              <CommandGroup key={kategori} heading={kategori}>
                {list.map((s) => {
                  const on = selected.has(s.id)
                  return (
                    <CommandItem
                      key={s.id}
                      value={s.nama}
                      keywords={s.alias}
                      onSelect={() => {
                        onToggle(s.id)
                        if (closeOnPick) setOpen(false)
                      }}
                    >
                      <span className="flex-1">{s.nama}</span>
                      {on && <Check className="text-mint-ink" />}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            ))}
            <PageControls offset={offset} limit={20} total={page.data?.total ?? 0} onChange={setOffset} disabled={page.loading}/>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
