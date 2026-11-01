import { useEffect, useMemo, useState, useRef, type DragEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { ArrowRight, Check, FileText, Loader2, RefreshCw, Sparkles, Trash2, Upload, X } from 'lucide-react'
import { EmptyState, PageHeader, SkillBadge } from '@/app/components/common'
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog'
import { ApiError, CV_STEPS, fetchSkillsByIds, deleteCv, queueCv, watchCv, latestCv, dismissCv, cvResult, type CvJob, saveSkills, validateCv, type ParsedCv } from '@/app/lib/api'
import { fileSize, formatDate } from '@/app/lib/format'
import { useCareer } from '@/app/lib/hooks'
import { normalizeKey } from '@/app/lib/matching'
import type { Skill, UserSkill } from '@/app/lib/types'
import { cn } from '@/app/lib/utils'

type Review = {
  file: {name:string;size:number}
  parsed: ParsedCv
  seconds: number
  /** skill id → raw text the AI produced for it */
  skills: Map<string, string>
  unknown: string[]
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
      skills:new Map((parsed.matched ?? []).map((m)=>[m.skillId,m.raw])),unknown:parsed.unknown ?? []})
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
      {checking ? <p role="status">Memeriksa proses CV sebelumnya...</p> : processing ? (
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
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:items-start">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">CV kamu</CardTitle>
              <CardDescription>PDF, maksimal 2 MB. Hanya kamu yang bisa melihat CV ini.</CardDescription>
            </CardHeader>
            <CardContent>
              {user.cv && !replacing ? (
                <div className="grid gap-4">
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

          <SkillEditor key={user.skills.map((s) => s.skillId).join()} initial={user.skills} skills={db.skills} skillsById={skillsById} hasCv={!!user.cv} />
        </div>
      )}
    </>
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
      })
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
            <h3 className="text-sm font-medium">Skill terdeteksi ({review.skills.size})</h3>
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
              <SkillPicker skills={skills} selected={new Set(review.skills.keys())} onToggle={(id) => toggle(id)} />
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

          <div className="flex flex-wrap gap-2 border-t pt-5">
            <Button size="lg" onClick={save} disabled={saving || review.skills.size === 0}>
              {saving && <Loader2 className="animate-spin" />}
              Simpan {review.skills.size} skill
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
  skills,
  skillsById,
  hasCv,
}: {
  initial: UserSkill[]
  skills: Skill[]
  skillsById: Map<string, Skill>
  hasCv: boolean
}) {
  const [draft, setDraft] = useState(initial)
  const [saving, setSaving] = useState(false)
  const selected = useMemo(() => new Set(draft.map((s) => s.skillId)), [draft])
  const dirty = draft.length !== initial.length || initial.some((s) => !selected.has(s.skillId))
  const toggle = (id: string) =>
    setDraft((d) => (d.some((s) => s.skillId === id) ? d.filter((s) => s.skillId !== id) : [...d, { skillId: id, sumber: 'manual' }]))

  async function save() {
    setSaving(true)
    try {
      await saveSkills(draft)
      toast.success('Skill diperbarui', { description: 'Skor kecocokan sudah dihitung ulang.' })
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal menyimpan. Coba lagi.')
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Skill kamu ({draft.length})</CardTitle>
        <CardDescription>
          {hasCv ? 'Dari CV dan yang kamu tambahkan sendiri.' : 'Belum punya CV? Pilih skill-mu sendiri dari daftar.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {draft.length === 0 ? (
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
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <SkillPicker skills={skills} selected={selected} onToggle={toggle} />
          <SkillBrowser skills={skills} selected={selected} onToggle={toggle} />
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
              <Button size="sm" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={() => setDraft(initial)} disabled={saving}>
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
function SkillBrowser({ skills, selected, onToggle }: { skills: Skill[]; selected: Set<string>; onToggle: (id: string) => void }) {
  const groups = useMemo(() => {
    const m = new Map<string, Skill[]>()
    for (const s of skills) m.set(s.kategori, [...(m.get(s.kategori) ?? []), s])
    return [...m].sort(([a], [b]) => a.localeCompare(b, 'id'))
  }, [skills])
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="rounded-full">
          Pilih dari daftar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85svh] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Pilih skill</DialogTitle>
          <DialogDescription>Ketuk skill yang kamu kuasai. {selected.size} dipilih.</DialogDescription>
        </DialogHeader>
        <div className="-mx-6 overflow-y-auto px-6">
          {groups.map(([kategori, list]) => (
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
