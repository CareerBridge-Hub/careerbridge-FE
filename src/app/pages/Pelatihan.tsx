import { useSearchParams } from 'react-router'
import { CardGridSkeleton, PageHeader, EmptyState, SkillBadge } from '@/app/components/common'
import { TrainingCard } from '@/app/components/cards'
import { PageControls } from '@/app/components/PageControls'
import { Input } from '@/app/components/ui/input'
import { Button } from '@/app/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select'
import { PROVINCES } from '@/app/data/seed'
import { fetchTrainingPage, useTrainingOccupations } from '@/app/lib/api'
import { useCareer, useServerPage, useJob, useUrlSearch } from '@/app/lib/hooks'

// Local fallback while the existing training request supplies current catalog choices.
// Opening the selector never starts a separate request.
const OCCUPATIONS = [
  ['96f251a2-ee07-5722-9da1-5a2e83e3361d', 'Data Analyst'],
  ['a9619ac0-8e03-4ddd-bc4f-b31bfb190ec4', 'Software Engineer'],
  ['a9619ac0-8e03-4ddd-bc4f-b31bfb190ec5', 'DevOps Engineer'],
  ['0d15f37c-81cc-5931-8a81-b11d9aed89d3', 'Web Developer'],
  ['0fb07a11-91c3-5aa0-8634-47cc5c7a1c14', 'IT Support'],
  ['9ad9988a-72e0-5a48-8127-fbea2c367f04', 'UI/UX Designer'],
  ['e3e219c3-a08e-5c71-ad02-171a30f6ce33', 'Staf Administrasi'],
  ['827bb1b7-cc92-584f-b31d-7dad1c782bd0', 'Staf Akuntansi'],
  ['fbba7075-e739-52f2-93f9-c0840ec26b1b', 'Customer Service'],
  ['c3510403-716d-5c72-bffb-c032c3275201', 'Digital Marketing'],
  ['e3987a45-424b-5b72-a762-6d8eb2b17fb8', 'Operator Produksi'],
] as const

export default function Pelatihan() {
  const {user,skillsById,ranked}=useCareer()
  const [params,setParams]=useSearchParams()
  const selectedJob=params.get('job')
  const job=selectedJob==='all'?undefined:selectedJob ?? user.targetJobId ?? undefined
  const detail=useJob(job)
  const m=job ? detail.data?.items[0] : undefined
  const [q,setQ]=useUrlSearch()
  const search=params.get('q') ?? ''
  const offset=Math.max(0,Number(params.get('offset')) || 0)
  const recommended=params.get('recommended')!=='false' && !!job
  const skill=params.get('skillId') ?? ''
  const result=useServerPage(fetchTrainingPage,{offset,limit:12,q:search,occupationId:job,recommended,
    cost:params.get('cost') ?? '', mode:params.get('mode') ?? '',province:params.get('province') ?? '',skillId:skill},q===search)
  const occupations=useTrainingOccupations() ?? OCCUPATIONS.map(([id,nama])=>({id,nama}))
  const change=(key:string,value:string)=>setParams((p)=>{if(value)p.set(key,value);else p.delete(key);p.delete('offset');if(key==='job')p.delete('skillId');if(key==='jobSearch')p.delete('jobOffset');return p})
  const institutions=new Map((result.data?.institutions ?? []).map((i)=>[i.id,i]))
  const wajib=new Set(m?.missingWajib.map((s)=>s.skillId) ?? [])
  const ops=new Set(m?.missingOpsional.map((s)=>s.skillId) ?? [])
  return <>
    <PageHeader title="Pelatihan untukmu" description="Jelajahi program dari katalog asli atau cari topik yang relevan dengan skill yang kurang. Rekomendasi memakai pencarian semantik lokal dan pemetaan skill yang tersedia."/>
    <div className="mb-5 grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-2">
      <label className="grid gap-1 text-sm">Cari pelatihan<Input aria-label="Cari pelatihan" placeholder="Cari nama pelatihan atau skill, misalnya Excel" maxLength={120} value={q} onChange={(e)=>setQ(e.target.value)}/></label>
      <label className="grid gap-1 text-sm">Pekerjaan: {m?.job.nama ?? occupations.find((option)=>option.id===job)?.nama ?? 'Semua pelatihan'}
        <Select value={job ?? 'all'} onValueChange={(value)=>change('job',value)}>
          <SelectTrigger aria-label="Pilih pekerjaan untuk mencari pelatihan"><SelectValue placeholder="Pilih pekerjaan"/></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua pekerjaan</SelectItem>
            {occupations.map(({id,nama})=>{const score=ranked.find((r)=>r.job.id===id)?.score;return <SelectItem key={id} value={id}>{nama}{score===undefined?'':` · ${score}%`}</SelectItem>})}
          </SelectContent>
        </Select>
      </label>
      <Filter label="Biaya" value={params.get('cost') ?? ''} onChange={(v)=>change('cost',v)} options={['gratis','berbayar','unknown']} labels={['Gratis','Berbayar','Belum diketahui']}/>
      <Filter label="Cara belajar" value={params.get('mode') ?? ''} onChange={(v)=>change('mode',v)} options={['daring','luring','unknown']} labels={['Daring','Tatap muka','Belum diketahui']}/>
      <Filter label="Provinsi" value={params.get('province') ?? ''} onChange={(v)=>change('province',v)} options={PROVINCES}/>
      <Filter label="Urutan" value={recommended?'true':'false'} onChange={(v)=>change('recommended',v || 'false')} options={job?['true','false']:['false']} labels={job?['Rekomendasi skill yang kurang','Semua pelatihan']:['Semua pelatihan']}/>
    </div>
    {job && detail.error && <p role="alert">{detail.error} <button onClick={detail.retry}>Coba lagi</button></p>}
    {!!job && <div className="mb-4 flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={()=>change('skillId','')}>Semua skill</Button>{[...(m?.missingWajib ?? []),...(m?.missingOpsional ?? [])].map((s)=><button key={s.skillId} aria-pressed={skill===s.skillId} onClick={()=>change('skillId',s.skillId)}><SkillBadge tone={s.tipe==='wajib'?'wajib':'opsional'}>{skillsById.get(s.skillId)?.nama ?? s.skillId}</SkillBadge></button>)}</div>}
    {params.get('province') && <p className="mb-3 text-sm text-muted-foreground">Pelatihan daring tetap tampil karena bisa diikuti dari mana saja.</p>}
    {result.data?.retrieval?.notice && <p role="status" className="mb-3 text-sm text-muted-foreground">{result.data.retrieval.notice}</p>}
    {result.loading ? <CardGridSkeleton label="Memuat pelatihan..." count={4} cols="md:grid-cols-2" /> : result.error ? <p role="alert">{result.error} <button onClick={result.retry}>Coba lagi</button></p> : !result.data?.items.length ? <EmptyState title="Tidak ada pelatihan yang cocok dengan filter" action={<Button variant="outline" onClick={()=>setParams({})}>Hapus filter</Button>}/> : <div className="grid gap-3 md:grid-cols-2">{result.data.items.map((t)=><TrainingCard key={t.id} training={t} evidence={result.data?.evidence?.[t.id]} inst={institutions.get(t.institutionId)} skillsById={skillsById} wajibGap={wajib} opsionalGap={ops}/>)}</div>}
    <PageControls offset={offset} limit={12} total={result.data?.total ?? 0} disabled={result.loading} onChange={(n)=>setParams((p)=>{p.set('offset',String(n));return p})}/>
  </>
}
function Filter({label,value,onChange,options,labels}:{label:string;value:string;onChange:(value:string)=>void;options:readonly string[];labels?:string[]}) {
  return <label className="grid gap-1 text-sm">{label}<Select value={value || '__all'} onValueChange={(v)=>onChange(v==='__all'?'':v)}><SelectTrigger className="w-full"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="__all">Semua</SelectItem>{options.map((o,i)=><SelectItem key={o} value={o}>{labels?.[i] ?? o}</SelectItem>)}</SelectContent></Select></label>
}
