import { useMemo, useState, type ReactNode } from 'react'
import { Check, Plus } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/app/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover'
import type { Skill } from '@/app/lib/types'

/** Searchable dictionary picker (matches names and aliases). Selected skills show a check and toggle off. */
export function SkillPicker({
  skills,
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
        <Command>
          <CommandInput placeholder="Cari skill, misal: excel, js, k3…" />
          <CommandList className="max-h-72">
            <CommandEmpty>Skill tidak ada di kamus.</CommandEmpty>
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
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
