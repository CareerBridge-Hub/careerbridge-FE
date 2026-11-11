import { useEffect, useMemo, useState, useRef, type DragEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { ArrowRight, Briefcase, Check, FileText, Loader2, Plus, RefreshCw, Sparkles, Trash2, Upload, X } from 'lucide-react'
import { ChipsSkeleton, EmptyState, LoadingNote, PageHeader, SkillBadge } from '@/app/components/common'
import { SkillPicker } from '@/app/components/SkillPicker'
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Skeleton } from '@/app/components/ui/skeleton'
import { Checkbox } from '@/app/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog'
import { ApiError, CV_STEPS, fetchSkillsByIds, deleteCv, queueCv, watchCv, latestCv, dismissCv, cvResult, type CvJob, saveSkills, validateCv, type ParsedCv } from '@/app/lib/api'
import { fetchCatalog, type BrowseParams } from '@/app/lib/api'
import { fileSize, formatDate } from '@/app/lib/format'
import { useCareer } from '@/app/lib/hooks'
import { useServerPage } from '@/app/lib/hooks'
import { normalizeKey } from '@/app/lib/matching'
import type { Skill, UserSkill } from '@/app/lib/types'
import { cn } from '@/app/lib/utils'
import { PageControls } from '@/app/components/PageControls'

const loadSkillPage = (query: BrowseParams, signal?: AbortSignal) => fetchCatalog<Skill>('skills', query, signal)

type Review = {
  file: {name:string;size:number}
  parsed: ParsedCv
  seconds: number
  /** skill id → raw text the AI produced for it */
  skills: Map<string, string>
  unknown: string[]
  customSkills: string[]
  /** Save the AI occupation suggestion together with the skills. */
  acceptOccupation: boolean
}

export default function Cv() {
  const { user, db, skillsById } = useCareer()
  const navigate = useNavigate()
  const ownIds=user.skills.map((s)=>s.skillId).join(',')
  useEffect(()=>{const controller=new AbortController();void fetchSkillsByIds(ownIds.split(',').filter(Boolean),controller.signal).catch((e)=>{if(!controller.signal.aborted)toast.error(e.message)});return()=>controller.abort()},[ownIds])
  const [processing, setProcessing] = useState<{ step: number; fileName: string } | null>(null)
  const [review, setReview] = useState<Review | null>(null)
  const [replacing, setReplacing] = useState(false)

  const [checking,setChecking]=useState(true)
  const [failure,setFailure]=useState<{id?:string;message:string;terminal?:boolean}|null>(null)
  const connection=useRef<AbortController|null>(null)
  async function follow(id:string,signal:AbortSignal,file?:{name:string;size:number},existing?:CvJob){
    const job=existing?.status==='selesai'?existing:await watchCv(id,(step)=>{if(!signal.aborted)setProcessing({step,fileName:file?.name ?? existing?.fileName ?? 'CV'})},signal)
    if(signal.aborted)return
    const parsed=cvResult(job)
    await fetchSkillsByIds((parsed.matched ?? []).map((m)=>m.skillId),signal)
    if(signal.aborted)return
    setReview({file:file ?? {name:job.fileName,size:job.size},parsed,seconds:(job.durationMs ?? 0)/1000,
      skills:new Map((parsed.matched ?? []).map((m)=>[m.skillId,m.raw])),unknown:parsed.unknown ?? [],customSkills:user.customSkills ?? [],acceptOccupation:true})
  }
  useEffect(()=>{
    const controller=new AbortController();connection.current=controller
    void (async()=>{
      let id:string|undefined
      try{
        const job=await latestCv(controller.signal)
        if(controller.signal.aborted)return
        setChecking(false)
        if(!job || job.reviewed)return
        id=job.id
        if(job.status==='gagal'){setFailure({id,message:job.error ?? 'CV gagal diproses.',terminal:true});return}
        setProcessing({step:job.step,fileName:job.fileName})
        await follow(job.id,controller.signal,undefined,job)
      }catch(error){if(!controller.signal.aborted)setFailure({id,message:error instanceof Error?error.message:'Proses tidak dapat dimuat.',terminal:error instanceof ApiError && error.code==='job_failed' && error.status===0})}
      finally{if(!controller.signal.aborted){setChecking(false);setProcessing(null)}}
    })()
    return()=>controller.abort()
  },[user.id])
  async function handleFile(file:File){
    const problem=await validateCv(file)
    if(problem){toast.error(problem,{description:file.name});return}
    connection.current?.abort()
    const controller=new AbortController();connection.current=controller
    setFailure(null);setProcessing({step:-1,fileName:file.name})
    let id:string|undefined
    try{
      const uploaded=await queueCv(file);id=uploaded.id
      if(controller.signal.aborted)return
      await follow(id,controller.signal,file)
    }catch(error){if(!controller.signal.aborted)setFailure({id,message:error instanceof Error?error.message:'CV gagal dibaca.',terminal:error instanceof ApiError && error.code==='job_failed' && error.status===0})}
    finally{if(!controller.signal.aborted){setProcessing(null);setReplacing(false)}}
  }
  async function reconnect(){
    if(!failure?.id){location.reload();return}
    const id=failure.id
    connection.current?.abort();const controller=new AbortController();connection.current=controller
    setFailure(null);setProcessing({step:0,fileName:'CV'})
    try{await follow(id,controller.signal)}
    catch(error){if(!controller.signal.aborted)setFailure({id,message:error instanceof Error?error.message:'Koneksi terputus.',terminal:error instanceof ApiError && error.code==='job_failed' && error.status===0})}
    finally{if(!controller.signal.aborted)setProcessing(null)}
  }

  return (
    <>
      <PageHeader
        title="CV & Skill"
        description="Upload CV dalam PDF, AI memisahkan pendidikan, pengalaman, dan skill. Kamu bisa membetulkan hasilnya sebelum disimpan."
      />

      {failure && <div role="alert" className="mb-4 rounded-xl border p-4 text-sm">{failure.message}
        {!failure.terminal && <Button variant="outline" className="ml-3" onClick={()=>void reconnect()}>Sambung lagi</Button>}
        {failure.id && failure.terminal && <Button variant="ghost" onClick={()=>void dismissCv(failure.id!).then(()=>setFailure(null)).catch((e)=>toast.error(e.message))}>Abaikan hasil</Button>}
      </div>}
      {checking ? <CvSkeleton /> : processing ? (
        <ProcessingCard step={processing.step} fileName={processing.fileName} />
      ) : review ? (
        <ReviewCard
          review={review}
          setReview={(next)=>{
            if(next===null && review.parsed.cvId)void dismissCv(review.parsed.cvId).then(()=>setReview(null)).catch((e)=>toast.error(e.message))
            else setReview(next)
          }}
          skills={db.skills}
          skillsById={skillsById}
          manual={user.skills.filter((s) => s.sumber === 'manual')}
          onDone={() => {
            setReview(null)
            toast.success('Skill dari CV disimpan', {
              action: { label: 'Lihat pekerjaan', onClick: () => navigate('/pekerjaan') },
            })
          }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:items-start">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">CV kamu</CardTitle>
              <CardDescription>PDF, maksimal 2 MB. Hanya kamu yang bisa melihat CV ini.</CardDescription>
            </CardHeader>
            <CardContent>
              {user.cv && !replacing ? (
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex items-center gap-3 rounded-xl border bg-muted/50 p-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-danger-soft text-danger-ink">
                      <FileText className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{user.cv.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {fileSize(user.cv.size)} · diunggah {formatDate(user.cv.uploadedAt)}
                      </p>
                    </div>
                  </div>
                  <CvDetails pendidikan={user.cv.pendidikan} pengalaman={user.cv.pengalaman} />
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => setReplacing(true)}>
                      <RefreshCw /> Ganti CV
                    </Button>
                    <DeleteCvButton />
                  </div>
                </div>
              ) : (
                <div className="grid gap-3">
                  <Dropzone onFile={handleFile} />
                  {replacing && (
                    <Button variant="ghost" className="w-fit" onClick={() => setReplacing(false)}>
                      Batal ganti CV
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <SkillEditor key={user.skills.map((s) => s.skillId).join()} initial={user.skills} initialCustom={user.customSkills ?? []} skillsById={skillsById} hasCv={!!user.cv} />
        </div>
      )}
    </>
  )
}

/** Mirrors the idle layout (CV card + skill editor) so nothing jumps when the check finishes. */
function CvSkeleton() {
  return (
    <div className="grid gap-3">
      <LoadingNote>Memeriksa proses CV sebelumnya...</LoadingNote>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:items-start" aria-hidden>
        <Card>
          <CardHeader className="gap-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-3.5 w-64 max-w-full" />
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex items-center gap-3 rounded-xl border p-3">
              <Skeleton className="size-10 shrink-0 rounded-lg" />
              <div className="grid flex-1 gap-2">
                <Skeleton className="h-4 w-3/5" />
                <Skeleton className="h-3 w-2/5" />
              </div>
            </div>
            <div className="grid gap-2">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-4/5" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-28 rounded-lg" />
              <Skeleton className="h-9 w-24 rounded-lg" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="gap-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3.5 w-72 max-w-full" />
          </CardHeader>
          <CardContent className="grid gap-5">
            <Skeleton className="h-9 w-full rounded-lg" />
            <ChipsSkeleton count={10} />
            <Skeleton className="h-9 w-32 rounded-lg" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Dropzone({ onFile }: { onFile: (f: File) => void }) {
  const [over, setOver] = useState(false)
  const drop = (e: DragEvent) => {
    e.preventDefault()
    setOver(false)
    const f = e.dataTransfer.files[0]
    if (f) onFile(f)
  }
  return (
    <label
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={drop}
      className={cn(
        'group flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/40',
        over ? 'border-mint bg-mint-soft/60' : 'border-border hover:border-mint hover:bg-mint-soft/30',
      )}
    >
      <span className={cn('grid size-12 place-items-center rounded-xl bg-primary text-white transition-transform', over ? 'scale-110' : 'group-hover:-translate-y-0.5')}>
        <Upload className="size-5" />
      </span>
      <span className="mt-4 font-medium">Tarik CV ke sini atau klik untuk memilih</span>
      <span className="mt-1 text-[13px] text-muted-foreground">Format PDF, maksimal 2 MB</span>
      <input
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) onFile(f)
        }}
      />
    </label>
  )
}

function ProcessingCard({ step, fileName }: { step: number; fileName: string }) {
  const visible=Math.max(0,step)
  const pct = step===0?25:((visible+0.5)/CV_STEPS.length)*100
  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Loader2 className="size-4 animate-spin" /> {step<0?'Mengunggah':'Membaca'} {fileName}
        </CardTitle>
        <CardDescription>{step<0 ? 'Tunggu sampai unggahan selesai sebelum menutup halaman.' : step===0 ? 'File diterima dan menunggu antrean server. Kamu bisa kembali nanti untuk melihat hasilnya.' : 'Proses berjalan di server. Kamu bisa meninggalkan halaman ini dan kembali untuk melihat hasilnya.'}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-mint transition-[width] duration-700 ease-out" style={{ width: `${pct}%` }} />
        </div>
        <ol className="mt-5 grid gap-3" aria-live="polite">
          {CV_STEPS.map((label, i) => (
            <li key={label} className={cn('flex items-center gap-3 text-sm transition-opacity', (i > visible || (step===0 && i>0)) && 'opacity-45')}>
              <span
                className={cn(
                  'grid size-6 shrink-0 place-items-center rounded-full border',
                  (i < visible || (step===0 && i===0)) && 'border-mint bg-mint text-primary',
                  step!==0 && i===visible && 'border-primary',
                )}
              >
                {i<visible || (step===0 && i===0) ? <Check className="size-3.5" /> : step!==0 && i===visible ? <Loader2 className="size-3.5 animate-spin" /> : null}
              </span>
              {label}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}

function CvDetails({ pendidikan, pengalaman }: Pick<ParsedCv, 'pendidikan' | 'pengalaman'>) {
  return (
    <dl className="grid content-start gap-3 text-sm">
      <div>
        <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Pendidikan</dt>
        {pendidikan.map((p) => (
          <dd key={p} className="mt-1">
            {p}
          </dd>
        ))}
      </div>
      <div>
        <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Pengalaman</dt>
        {pengalaman.map((p) => (
          <dd key={p.posisi + p.tempat} className="mt-1">
            <span className="font-medium">{p.posisi}</span> · {p.tempat} <span className="text-muted-foreground">({p.periode})</span>
          </dd>
        ))}
      </div>
    </dl>
  )
}

function ReviewCard({
  review,
  setReview,
  skills,
  skillsById,
  manual,
  onDone,
}: {
  review: Review
  setReview: (r: Review | null) => void
  skills: Skill[]
  skillsById: Map<string, Skill>
  manual: UserSkill[]
  onDone: () => void
}) {
  const [saving, setSaving] = useState(false)
  const update = (patch: Partial<Review>) => setReview({ ...review, ...patch })
  const toggle = (id: string, raw?: string) => {
    const next = new Map(review.skills)
    if (next.has(id)) next.delete(id)
    else next.set(id, raw ?? skillsById.get(id)!.nama)
    update({ skills: next })
  }

  async function save() {
    setSaving(true)
    try {
      const fromCv: UserSkill[] = [...review.skills.keys()].map((skillId) => ({ skillId, sumber: review.parsed.matched?.find((m) => m.skillId === skillId)?.sumber ?? 'manual' }))
      await saveSkills([...fromCv, ...manual.filter((m) => !review.skills.has(m.skillId))], {
        id: review.parsed.cvId,
        fileName: review.file.name,
        size: review.file.size,
        uploadedAt: new Date().toISOString(),
        pendidikan: review.parsed.pendidikan,
        pengalaman: review.parsed.pengalaman,
      }, review.customSkills, review.acceptOccupation)
      onDone()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal menyimpan. Coba lagi.')
      setSaving(false)
    }
  }

  return (
    <Card className="animate-rise">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <Sparkles className="size-4 text-mint-ink" /> Periksa hasil bacaan AI
        </CardTitle>
        <CardDescription>
          {review.file.name} dibaca dalam {review.seconds.toLocaleString('id-ID', { maximumFractionDigits: 1 })} detik. Hapus skill yang salah,
          tambahkan yang terlewat, lalu simpan.

        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <CvDetails pendidikan={review.parsed.pendidikan} pengalaman={review.parsed.pengalaman} />

        <div className="grid content-start gap-5">
          <section>
            <h3 className="text-sm font-medium">Skill terdeteksi ({review.skills.size + review.customSkills.length})</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[...review.skills].map(([id, raw]) => {
                const nama = skillsById.get(id)?.nama ?? id
                const renamed = normalizeKey(raw) !== normalizeKey(nama)
                return (
                  <SkillBadge
                    key={id}
                    tone="owned"
                    action={<RemoveButton label={nama} onClick={() => toggle(id)} />}
                  >
                    {nama}
                    {renamed && <span className="font-normal opacity-70">dari “{raw}”</span>}
                  </SkillBadge>
                )
              })}
              {review.customSkills.map((name)=><SkillBadge key={normalizeKey(name)} tone="owned" action={<RemoveButton label={name} onClick={()=>update({customSkills:review.customSkills.filter((item)=>normalizeKey(item)!==normalizeKey(name))})} />}>{name}<span className="font-normal opacity-70">(lainnya)</span></SkillBadge>)}
              <SkillBrowser selected={new Set(review.skills.keys())} onToggle={(id)=>toggle(id)} customSkills={review.customSkills} onCustomSkillsChange={(customSkills)=>update({customSkills})} />
            </div>
          </section>

          {review.unknown.length > 0 && (
            <section className="rounded-xl border border-dashed bg-warn-soft/50 p-3.5">
              <h3 className="text-sm font-medium">Tidak ada di kamus skill</h3>
              <p className="mt-0.5 text-[13px] text-muted-foreground">Cocokkan ke skill yang ada, atau abaikan. Yang diabaikan tidak disimpan.</p>
              <ul className="mt-3 grid gap-2">
                {review.unknown.map((raw) => (
                  <li key={raw} className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="mr-auto font-medium">“{raw}”</span>
                    <SkillPicker
                      skills={skills}
                      selected={new Set(review.skills.keys())}
                      closeOnPick
                      onToggle={(id) => {
                        const next = new Map(review.skills)
                        next.set(id, raw)
                        update({ skills: next, unknown: review.unknown.filter((u) => u !== raw) })
                      }}
                    >
                      <Button size="sm" variant="outline" className="bg-card">
                        Cocokkan
                      </Button>
                    </SkillPicker>
                    <Button size="sm" variant="ghost" onClick={() => update({ unknown: review.unknown.filter((u) => u !== raw) })}>
                      Abaikan
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {review.parsed.occupation && (
            <OccupationSuggestionCard
              suggestion={review.parsed.occupation}
              accepted={review.acceptOccupation}
              onAcceptedChange={(acceptOccupation) => update({ acceptOccupation })}
            />
          )}

          <div className="flex flex-wrap gap-2 border-t pt-5">
            <Button size="lg" onClick={save} disabled={saving || (review.skills.size === 0 && review.customSkills.length === 0)}>
              {saving && <Loader2 className="animate-spin" />}
              Simpan {review.skills.size + review.customSkills.length} skill
            </Button>
            <Button size="lg" variant="ghost" onClick={() => setReview(null)} disabled={saving}>
              Batal
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function OccupationSuggestionCard({
  suggestion,
  accepted,
  onAcceptedChange,
}: {
  suggestion: NonNullable<ParsedCv['occupation']>
  accepted: boolean
  onAcceptedChange: (accepted: boolean) => void
}) {
  const custom = suggestion.kind === 'custom'
  return (
    <section className="rounded-xl border bg-mint-soft/40 p-3.5" aria-labelledby="occupation-suggestion">
      <h3 id="occupation-suggestion" className="flex items-center gap-1.5 text-sm font-medium">
        <Briefcase className="size-4 text-mint-ink" /> Saran pekerjaan dari AI
      </h3>
      <p className="mt-1.5 font-display text-lg">{suggestion.nama}</p>
      {custom && <p className="mt-0.5 text-[13px] text-muted-foreground">{suggestion.deskripsi}</p>}
      {suggestion.evidence.length > 0 && (
        <p className="mt-2 text-[13px] text-muted-foreground">
          Berdasarkan: {suggestion.evidence.map((e) => `“${e}”`).join(', ')}
        </p>
      )}
      {custom ? (
        <label htmlFor="accept-occupation" className="mt-3 flex cursor-pointer gap-2.5 text-[13px] leading-relaxed">
          <Checkbox id="accept-occupation" checked={accepted} onCheckedChange={(v) => onAcceptedChange(v === true)} className="mt-0.5" />
          <span>
            Belum ada di daftar pekerjaan. Simpan sebagai pekerjaan pribadimu (hanya kamu yang bisa melihat) untuk skor kecocokan,
            rekomendasi pelatihan, dan lowongan. Syarat skill-nya perkiraan AI, bukan standar resmi.
          </span>
        </label>
      ) : (
        <p className="mt-2 text-[13px] text-muted-foreground">Sudah ada di daftar pekerjaan.</p>
      )}
    </section>
  )
}

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid size-5 place-items-center rounded-full opacity-70 transition hover:bg-black/10 hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      aria-label={`Hapus ${label}`}
    >
      <X className="size-3" />
    </button>
  )
}

function SkillEditor({
  initial,
  initialCustom,
  skillsById,
  hasCv,
}: {
  initial: UserSkill[]
  initialCustom: string[]
  skillsById: Map<string, Skill>
  hasCv: boolean
}) {
  const [draft, setDraft] = useState(initial)
  const [customDraft, setCustomDraft] = useState(initialCustom)
  const [saving, setSaving] = useState(false)
  const selected = useMemo(() => new Set(draft.map((s) => s.skillId)), [draft])
  const dirty = draft.length !== initial.length || initial.some((s) => !selected.has(s.skillId)) || customDraft.join('\0') !== initialCustom.join('\0')
  const toggle = (id: string) =>
    setDraft((d) => (d.some((s) => s.skillId === id) ? d.filter((s) => s.skillId !== id) : [...d, { skillId: id, sumber: 'manual' }]))

  async function save() {
    setSaving(true)
    try {
      await saveSkills(draft, undefined, customDraft)
      toast.success('Skill diperbarui', { description: 'Skor kecocokan sudah dihitung ulang.' })
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal menyimpan. Coba lagi.')
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Skill kamu ({draft.length + customDraft.length})</CardTitle>
        <CardDescription>
          {hasCv ? 'Dari CV dan yang kamu tambahkan sendiri.' : 'Belum punya CV? Pilih skill-mu sendiri dari daftar.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {draft.length === 0 && customDraft.length === 0 ? (
          <EmptyState title="Belum ada skill" className="border-none bg-muted/50 py-8">
            Upload CV atau pilih skill dari daftar.
          </EmptyState>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {draft
              .map((s) => ({ ...s, nama: skillsById.get(s.skillId)?.nama ?? s.skillId }))
              .sort((a, b) => a.nama.localeCompare(b.nama, 'id'))
              .map((s) => (
                <SkillBadge key={s.skillId} tone="owned" action={<RemoveButton label={s.nama} onClick={() => toggle(s.skillId)} />}>
                  {s.nama}
                </SkillBadge>
              ))}
            {customDraft.map((name)=><SkillBadge key={normalizeKey(name)} tone="owned" action={<RemoveButton label={name} onClick={()=>setCustomDraft(customDraft.filter((item)=>normalizeKey(item)!==normalizeKey(name)))} />}>{name}<span className="font-normal opacity-70">(lainnya)</span></SkillBadge>)}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <SkillBrowser selected={selected} onToggle={toggle} customSkills={customDraft} onCustomSkillsChange={setCustomDraft} />
        </div>

        <div
          className={cn(
            'grid transition-[grid-template-rows,opacity] duration-300',
            dirty ? 'mt-5 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
          )}
          inert={!dirty}
        >
          <div className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-primary p-3 text-sm text-white">
              <span className="mr-auto pl-1">Ada perubahan yang belum disimpan.</span>
              <Button size="sm" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={() => {setDraft(initial);setCustomDraft(initialCustom)}} disabled={saving}>
                Batal
              </Button>
              <Button size="sm" className="bg-mint text-primary hover:bg-mint/90" onClick={save} disabled={saving}>
                {saving && <Loader2 className="animate-spin" />}
                Simpan
              </Button>
            </div>
          </div>
        </div>

        {!dirty && draft.length > 0 && (
          <Button asChild variant="link" className="mt-3 h-auto px-0">
            <Link to="/pekerjaan">
              Lihat pekerjaan yang cocok <ArrowRight />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

/** Browse the whole dictionary by category: friendlier than search when you don't know the names. */
function SkillBrowser({ selected, onToggle, customSkills, onCustomSkillsChange }: { selected: Set<string>; onToggle: (id: string) => void; customSkills: string[]; onCustomSkillsChange: (values: string[]) => void }) {
  const [open,setOpen]=useState(false)
  const [offset,setOffset]=useState(0)
  const [otherSkill, setOtherSkill] = useState('')
  const page=useServerPage(loadSkillPage,{offset,limit:100},open)
  const skills=page.data?.items ?? []
  const addOtherSkill = () => {
    const value=otherSkill.trim().replace(/\s+/g,' ')
    if(!value || value.length>80 || customSkills.some((name)=>normalizeKey(name)===normalizeKey(value)))return
    onCustomSkillsChange([...customSkills,value]);setOtherSkill('')
  }
  const groups = useMemo(() => {
    const m = new Map<string, Skill[]>()
    for (const s of skills) m.set(s.kategori, [...(m.get(s.kategori) ?? []), s])
    return [...m].sort(([a], [b]) => a.localeCompare(b, 'id'))
  }, [skills])
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="rounded-full border-dashed">
          <Plus /> Tambah skill
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85svh] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Pilih skill</DialogTitle>
          <DialogDescription>Ketuk skill yang kamu kuasai. {selected.size + customSkills.length} dipilih.</DialogDescription>
        </DialogHeader>
        <div className="-mx-6 overflow-y-auto px-6">
          {page.loading ? <div className="grid gap-3 py-5"><LoadingNote>Memuat daftar skill...</LoadingNote><ChipsSkeleton count={12} /></div> : page.error ? <p role="alert" className="py-5 text-sm">{page.error} <button className="underline" onClick={page.retry}>Coba lagi</button></p> : groups.map(([kategori, list]) => (
            <section key={kategori} className="mb-5">
              <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">{kategori}</h3>
              <div className="flex flex-wrap gap-1.5">
                {list.map((s) => {
                  const on = selected.has(s.id)
                  return (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => onToggle(s.id)}
                      className={cn(
                        'inline-flex h-8 items-center gap-1 rounded-full border px-3 text-[13px] font-medium transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
                        on ? 'border-mint bg-mint-soft text-mint-ink' : 'bg-card hover:bg-secondary',
                      )}
                    >
                      {on && <Check className="size-3.5" />}
                      {s.nama}
                    </button>
                  )
                })}
              </div>
            </section>
          ))}
          <section className="mb-4 rounded-xl border border-dashed p-3">
            <h3 className="text-sm font-medium">Skill lain</h3>
            <p className="mt-1 text-xs text-muted-foreground">Tambahkan skill yang belum ada di daftar. Bisa lebih dari satu; skill lain tersimpan di browser ini.</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {customSkills.map((name)=><SkillBadge key={normalizeKey(name)} tone="owned" action={<RemoveButton label={name} onClick={()=>onCustomSkillsChange(customSkills.filter((item)=>normalizeKey(item)!==normalizeKey(name)))} />}>{name}<span className="font-normal opacity-70">(lainnya)</span></SkillBadge>)}
            </div>
            <form className="mt-3 flex gap-2" onSubmit={(event)=>{event.preventDefault();addOtherSkill()}}>
              <input aria-label="Nama skill lain" value={otherSkill} maxLength={80} onChange={(event)=>setOtherSkill(event.target.value)} placeholder="Tulis nama skill…" className="h-9 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm" />
              <Button type="submit" variant="outline" disabled={!otherSkill.trim() || otherSkill.trim().length>80}>Tambah</Button>
            </form>
          </section>
          {!page.loading && !page.error && <PageControls offset={offset} limit={100} total={page.data?.total ?? 0} onChange={setOffset} disabled={page.loading} />}
        </div>
        <DialogFooter>
          <DialogTrigger asChild>
            <Button>Selesai</Button>
          </DialogTrigger>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DeleteCvButton() {
  const [pending, setPending] = useState(false)
  const [open, setOpen] = useState(false)
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" className="text-destructive hover:bg-danger-soft hover:text-destructive">
          <Trash2 /> Hapus CV
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus CV dari sistem?</AlertDialogTitle>
          <AlertDialogDescription>
            File CV dan hasil bacaannya dihapus permanen. Skill yang sudah kamu simpan tetap ada dan bisa diubah kapan saja.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive hover:bg-destructive/90"
            disabled={pending}
            onClick={async (e) => {
              e.preventDefault()
              setPending(true)
              try { await deleteCv(); setOpen(false); toast.success('CV dihapus') } catch (error) { toast.error(error instanceof Error ? error.message : 'Gagal menghapus CV.') } finally { setPending(false) }
            }}
          >
            {pending && <Loader2 className="animate-spin" />}
            Hapus CV
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
