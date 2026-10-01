import { toast } from 'sonner'
import { Clock, ExternalLink, MapPin, Monitor, Star, Users } from 'lucide-react'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { setTarget } from '@/app/lib/api'
import { relativeDay, rupiah } from '@/app/lib/format'
import type { Institution, JobPosting, Skill, Training } from '@/app/lib/types'
import { cn } from '@/app/lib/utils'
import { SkillBadge } from './common'

export function TrainingCard({
  training: t,
  inst,
  skillsById,
  wajibGap,
  opsionalGap,
  className,
}: {
  training: Training
  inst: Institution | undefined
  skillsById: Map<string, Skill>
  wajibGap: Set<string>
  opsionalGap: Set<string>
  className?: string
}) {
  const skills = [...t.skillIds].sort(
    (a, b) => Number(wajibGap.has(b)) * 2 + Number(opsionalGap.has(b)) - (Number(wajibGap.has(a)) * 2 + Number(opsionalGap.has(a))),
  )
  return (
    <article className={cn('flex flex-col rounded-xl border bg-card p-4 transition-shadow hover:shadow-md sm:p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold leading-snug">{t.nama}</h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[13px] text-muted-foreground">
            {inst?.nama ?? 'Lembaga dihapus'}
            {inst && (
              <Badge variant="outline" className="h-5 px-1.5 text-[11px] font-medium">
                {inst.jenis}
              </Badge>
            )}
          </p>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full px-2.5 py-1 text-[13px] font-semibold',
            t.biaya === 0 ? 'bg-mint-soft text-mint-ink' : 'bg-secondary',
          )}
        >
          {rupiah(t.biaya)}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {skills.map((id) => (
          <SkillBadge key={id} tone={wajibGap.has(id) ? 'wajib' : opsionalGap.has(id) ? 'opsional' : 'neutral'} className="h-6 px-2.5 text-xs">
            {skillsById.get(id)?.nama ?? id}
          </SkillBadge>
        ))}
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
          <li className="flex items-center gap-1.5">
            {t.moda === 'daring' ? <Monitor className="size-3.5" /> : <Users className="size-3.5" />}
            {t.moda === 'daring' ? 'Daring' : 'Tatap muka'}
          </li>
          <li className="flex items-center gap-1.5">
            <MapPin className="size-3.5" />
            {t.moda === 'daring' ? 'Online' : inst ? `${inst.kota}, ${inst.provinsi}` : '-'}
          </li>
          <li className="flex items-center gap-1.5">
            <Clock className="size-3.5" />
            {t.durasi}
          </li>
        </ul>
        <Button asChild size="sm" variant="outline">
          <a href={t.urlDaftar} target="_blank" rel="noopener noreferrer">
            Daftar <ExternalLink />
            <span className="sr-only">(buka di tab baru)</span>
          </a>
        </Button>
      </div>
    </article>
  )
}

export function PostingItem({ posting: p, jobName, score }: { posting: JobPosting; jobName?: string; score?: number }) {
  return (
    <article className="flex flex-col gap-3 rounded-xl border bg-card p-4 transition-shadow hover:shadow-md sm:flex-row sm:items-center">
      <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary font-display text-sm" aria-hidden="true">
        {p.perusahaan.replace(/^(PT|CV)\s+/, '').slice(0, 2).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-semibold">{p.judul}</h3>
        <p className="truncate text-[13px] text-muted-foreground">
          {p.perusahaan} · {p.lokasi}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span>{relativeDay(p.tanggal)}</span>
          <span aria-hidden="true">·</span>
          <span>via {p.sumber}</span>
          {jobName && (
            <Badge variant="secondary" className="ml-1 h-5 text-[11px]">
              {jobName}
              {score !== undefined && ` · cocok ${score}%`}
            </Badge>
          )}
        </div>
      </div>
      <Button asChild size="sm" variant="outline" className="self-start sm:self-center">
        <a href={p.url} target="_blank" rel="noopener noreferrer">
          Lihat di sumber <ExternalLink />
          <span className="sr-only">(buka di tab baru)</span>
        </a>
      </Button>
    </article>
  )
}

export function TargetButton({ jobId, jobName, isTarget, className }: { jobId: string; jobName: string; isTarget: boolean; className?: string }) {
  return (
    <Button
      type="button"
      size="sm"
      variant={isTarget ? 'default' : 'outline'}
      aria-pressed={isTarget}
      className={cn('relative z-10', className)}
      onClick={async () => {
        await setTarget(isTarget ? null : jobId)
        toast.success(isTarget ? 'Incaran dilepas' : `${jobName} jadi pekerjaan incaranmu`)
      }}
    >
      <Star className={cn(isTarget && 'fill-mint text-mint')} />
      {isTarget ? 'Incaranmu' : 'Jadikan incaran'}
    </Button>
  )
}
