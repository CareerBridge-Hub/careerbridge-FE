import { useSearchParams } from 'react-router'
import { PageHeader, EmptyState, SkillBadge } from '@/app/components/common'
import { TrainingCard } from '@/app/components/cards'
import { PageControls } from '@/app/components/PageControls'
import { Input } from '@/app/components/ui/input'
import { Button } from '@/app/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select'
import { PROVINCES } from '@/app/data/seed'
import { fetchTrainingPage, fetchMatchesPage } from '@/app/lib/api'
import { useCareer, useServerPage, useJob, useUrlSearch } from '@/app/lib/hooks'

export default function Pelatihan() {
  const {user,skillsById}=useCareer()
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
  const [jobParams,setJobParams]=useUrlSearch('jobSearch','jobOffset')
  const jobSearch=params.get('jobSearch') ?? ''
  const jobOffset=Math.max(0,Math.trunc(Number(params.get('jobOffset'))) || 0)
  const jobs=useServerPage(fetchMatchesPage,{q:jobSearch,offset:jobOffset,limit:10},params.get('chooseJob')==='true')
  const change=(key:string,value:string)=>setParams((p)=>{if(value)p.set(key,value);else p.delete(key);p.delete('offset');if(key==='job')p.delete('skillId');if(key==='jobSearch')p.delete('jobOffset');return p})
  const institutions=new Map((result.data?.institutions ?? []).map((i)=>[i.id,i]))
  const wajib=new Set(m?.missingWajib.map((s)=>s.skillId) ?? [])
  const ops=new Set(m?.missingOpsional.map((s)=>s.skillId) ?? [])
  return <>
    <PageHeader title="Pelatihan untukmu" description="Cari katalog pelatihan atau pilih rekomendasi berdasarkan skill yang kurang. Filter diterapkan ke seluruh katalog."/>
    <div className="mb-5 grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-2">
      <label className="grid gap-1 text-sm">Cari pelatihan<Input aria-label="Cari pelatihan" maxLength={120} value={q} onChange={(e)=>setQ(e.target.value)}/></label>
      <div className="grid gap-1 text-sm"><span>Pekerjaan: {m?.job.nama ?? 'Semua pelatihan'}</span>
        <Button variant="outline" onClick={()=>change('chooseJob',params.get('chooseJob')==='true'?'':'true')}>Pilih pekerjaan</Button>
        {params.get('chooseJob')==='true' && <><Input aria-label="Cari pekerjaan untuk pelatihan" value={jobParams} onChange={(e)=>setJobParams(e.target.value)}/>
          {jobs.loading ? <p role="status">Memuat pekerjaan...</p> : jobs.error ? <p role="alert">{jobs.error}<button onClick={jobs.retry}>Coba lagi</button></p> : <div className="grid gap-1"><Button variant="ghost" onClick={()=>{change('job','all');change('recommended','false')}}>Semua pekerjaan</Button>{jobs.data?.items.map((r)=><Button variant="ghost" key={r.job.id} onClick={()=>setParams((p)=>{p.set('job',r.job.id);p.delete('chooseJob');p.delete('skillId');p.delete('offset');return p})}>{r.job.nama} · {r.score}%</Button>)}</div>}
          <PageControls offset={jobOffset} limit={10} total={jobs.data?.total ?? 0} disabled={jobs.loading} onChange={(n)=>change('jobOffset',String(n))}/>
        </>}
      </div>
      <Filter label="Biaya" value={params.get('cost') ?? ''} onChange={(v)=>change('cost',v)} options={['gratis','berbayar','unknown']} labels={['Gratis','Berbayar','Belum diketahui']}/>
      <Filter label="Cara belajar" value={params.get('mode') ?? ''} onChange={(v)=>change('mode',v)} options={['daring','luring','unknown']} labels={['Daring','Tatap muka','Belum diketahui']}/>
      <Filter label="Provinsi" value={params.get('province') ?? ''} onChange={(v)=>change('province',v)} options={PROVINCES}/>
      <Filter label="Urutan" value={recommended?'true':'false'} onChange={(v)=>change('recommended',v || 'false')} options={job?['true','false']:['false']} labels={job?['Rekomendasi skill yang kurang','Semua pelatihan']:['Semua pelatihan']}/>
    </div>
    {job && detail.error && <p role="alert">{detail.error} <button onClick={detail.retry}>Coba lagi</button></p>}
    {!!job && <div className="mb-4 flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={()=>change('skillId','')}>Semua skill</Button>{[...(m?.missingWajib ?? []),...(m?.missingOpsional ?? [])].map((s)=><button key={s.skillId} aria-pressed={skill===s.skillId} onClick={()=>change('skillId',s.skillId)}><SkillBadge tone={s.tipe==='wajib'?'wajib':'opsional'}>{skillsById.get(s.skillId)?.nama ?? s.skillId}</SkillBadge></button>)}</div>}
    {params.get('province') && <p className="mb-3 text-sm text-muted-foreground">Pelatihan daring tetap tampil karena bisa diikuti dari mana saja.</p>}
    {result.loading ? <p role="status">Memuat pelatihan...</p> : result.error ? <p role="alert">{result.error} <button onClick={result.retry}>Coba lagi</button></p> : !result.data?.items.length ? <EmptyState title="Tidak ada pelatihan yang cocok dengan filter" action={<Button variant="outline" onClick={()=>setParams({})}>Hapus filter</Button>}/> : <div className="grid gap-3 md:grid-cols-2">{result.data.items.map((t)=><TrainingCard key={t.id} training={t} inst={institutions.get(t.institutionId)} skillsById={skillsById} wajibGap={wajib} opsionalGap={ops}/>)}</div>}
    <PageControls offset={offset} limit={12} total={result.data?.total ?? 0} disabled={result.loading} onChange={(n)=>setParams((p)=>{p.set('offset',String(n));return p})}/>
  </>
}
function Filter({label,value,onChange,options,labels}:{label:string;value:string;onChange:(value:string)=>void;options:readonly string[];labels?:string[]}) {
  return <label className="grid gap-1 text-sm">{label}<Select value={value || '__all'} onValueChange={(v)=>onChange(v==='__all'?'':v)}><SelectTrigger className="w-full"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="__all">Semua</SelectItem>{options.map((o,i)=><SelectItem key={o} value={o}>{labels?.[i] ?? o}</SelectItem>)}</SelectContent></Select></label>
}
