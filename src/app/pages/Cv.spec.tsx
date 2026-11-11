import {beforeEach,afterEach,it,expect,vi} from 'vitest'
import {render,screen,waitFor,cleanup,fireEvent} from '@testing-library/react'
import {BrowserRouter} from 'react-router'
import Cv from './Cv'
<<<<<<< HEAD
const mocks=vi.hoisted(()=>({latest:vi.fn(),watch:vi.fn(),queue:vi.fn(),save:vi.fn(),skills:vi.fn(),signals:[] as AbortSignal[]}))
vi.mock('@/app/lib/api',()=>({ApiError:class extends Error{},CV_STEPS:['Mengunggah file','Mengambil teks dari PDF','AI mengekstrak','Menyamakan skill'],deleteCv:vi.fn(),queueCv:mocks.queue,watchCv:mocks.watch,latestCv:mocks.latest,dismissCv:vi.fn(),fetchSkillsByIds:mocks.skills,saveSkills:mocks.save,validateCv:vi.fn(),cvResult:(job:{id:string;parsed:object})=>({matched:[],unknown:[],...job.parsed,cvId:job.id})}))
vi.mock('@/app/lib/hooks',()=>({useServerPage:()=>({data:{items:[],total:0},loading:false,error:'',retry:vi.fn()}),useCareer:()=>({user:{id:'user-a',skills:[],cv:null},db:{skills:[]},skillsById:new Map()})}))
=======
const mocks=vi.hoisted(()=>({latest:vi.fn(),watch:vi.fn(),queue:vi.fn(),save:vi.fn(),skills:vi.fn(),signals:[] as AbortSignal[],customSkills:[] as string[]}))
vi.mock('@/app/lib/api',()=>({ApiError:class extends Error{},CV_STEPS:['Mengunggah file','Mengambil teks dari PDF','AI mengekstrak','Menyamakan skill'],deleteCv:vi.fn(),queueCv:mocks.queue,watchCv:mocks.watch,latestCv:mocks.latest,dismissCv:vi.fn(),fetchSkillsByIds:mocks.skills,saveSkills:mocks.save,validateCv:vi.fn(),cvResult:(job:{id:string;parsed:object;normalized:object})=>({...job.parsed,...job.normalized,cvId:job.id})}))
vi.mock('@/app/lib/hooks',()=>({useServerPage:()=>({data:{items:[],total:0},loading:false,error:'',retry:vi.fn()}),useCareer:()=>({user:{id:'user-a',skills:[],customSkills:mocks.customSkills,cv:null},db:{skills:[]},skillsById:new Map()})}))
>>>>>>> e3bc606ffe39a6ee8182941a861b781f303d6ea6
vi.mock('@/app/components/SkillPicker',()=>({SkillPicker:()=>null}))
beforeEach(()=>{vi.clearAllMocks();mocks.signals.length=0;mocks.customSkills=[];mocks.skills.mockResolvedValue(undefined)})
afterEach(cleanup)
it('reconnects to an existing upload and restores its finished review after leaving and returning',async()=>{
 const job={id:'persisted-cv',fileName:'restored.pdf',size:123,durationMs:2500,step:2,status:'proses',reviewed:false,error:null,parsed:{pendidikan:['SMK'],pengalaman:[],skills:[]},normalized:{matched:[],unknown:[]}}
 mocks.latest.mockResolvedValueOnce(job).mockResolvedValueOnce({...job,step:4,status:'selesai'})
 mocks.watch.mockImplementation((_id:string,onStep:(n:number)=>void,signal:AbortSignal)=>{
  mocks.signals.push(signal);onStep(2)
  return new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('page left')),{once:true}))
 })
 const first=render(<BrowserRouter><Cv/></BrowserRouter>)
 await screen.findByText('Membaca restored.pdf')
 expect(mocks.watch).toHaveBeenCalledWith('persisted-cv',expect.any(Function),expect.any(AbortSignal))
 first.unmount();expect(mocks.signals[0].aborted).toBe(true)
 render(<BrowserRouter><Cv/></BrowserRouter>)
 await screen.findByText('Periksa hasil bacaan AI')
 await waitFor(()=>expect(mocks.latest).toHaveBeenCalledTimes(2))
 expect(mocks.watch).toHaveBeenCalledTimes(1)
 expect(mocks.queue).not.toHaveBeenCalled()
 expect(mocks.save).not.toHaveBeenCalled()
 expect(screen.getByText(/restored.pdf dibaca/)).toBeTruthy()
})

<<<<<<< HEAD
const finished=(occupation:object)=>({id:'cv-ai',fileName:'cloud.pdf',size:123,durationMs:1000,step:4,status:'selesai',reviewed:false,error:null,normalized:{matched:[],unknown:[]},
 parsed:{pendidikan:[],pengalaman:[{posisi:'Cloud Engineer',tempat:'',periode:'2022'}],skills:['AWS'],matched:[{skillId:'skill-aws',sumber:'cv_alias',raw:'AWS'}],occupation}})
it('shows the AI occupation suggestion and lets the user decline saving it',async()=>{
 mocks.latest.mockResolvedValueOnce(finished({kind:'custom',nama:'Cloud Engineer',bidang:'Teknologi Informasi',deskripsi:'Mengelola infrastruktur cloud.',baseOccupationId:null,wajib:['skill-aws'],opsional:[],evidence:['Cloud Engineer','AWS']}))
 mocks.save.mockResolvedValue(undefined)
 render(<BrowserRouter><Cv/></BrowserRouter>)
 await screen.findByText('Saran pekerjaan dari AI')
 expect(screen.getByText('Cloud Engineer',{selector:'p'})).toBeTruthy()
 expect(screen.getByText(/Berdasarkan: “Cloud Engineer”, “AWS”/)).toBeTruthy()
 const box=screen.getByRole('checkbox',{name:/Simpan sebagai pekerjaan pribadimu/})
 expect(box.getAttribute('data-state')).toBe('checked')
 fireEvent.click(box)
 fireEvent.click(screen.getByRole('button',{name:/Simpan 1 skill/}))
 await waitFor(()=>expect(mocks.save).toHaveBeenCalledTimes(1))
 expect(mocks.save.mock.calls[0][3]).toBe(false)
})
it('labels a catalog match without offering to create a personal occupation',async()=>{
 mocks.latest.mockResolvedValueOnce(finished({kind:'catalog',occupationId:'job-web',nama:'Web Developer',evidence:['Cloud Engineer']}))
 render(<BrowserRouter><Cv/></BrowserRouter>)
 await screen.findByText('Web Developer')
 expect(screen.getByText('Sudah ada di daftar pekerjaan.')).toBeTruthy()
 expect(screen.queryByRole('checkbox')).toBeNull()
=======
function finishedReview(unknown: string[]) {
 mocks.latest.mockResolvedValue({id:'cv-personal',fileName:'skills.pdf',size:123,durationMs:1000,step:4,status:'selesai',reviewed:false,parsed:{pendidikan:[],pengalaman:[]},normalized:{matched:[],unknown}})
 render(<BrowserRouter><Cv/></BrowserRouter>)
}
it('keeps an unmatched skill in the review and persists it only on confirmation',async()=>{
 finishedReview(['Press Release Writing'])
 fireEvent.click(await screen.findByRole('button',{name:'Tambah skill pribadi: Press Release Writing'}))
 expect(screen.queryByText('“Press Release Writing”')).toBeNull()
 expect(screen.getByText('Press Release Writing')).toBeTruthy()
 expect(mocks.save).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole('button',{name:'Simpan 1 skill'}))
 await waitFor(()=>expect(mocks.save).toHaveBeenCalledWith([],expect.objectContaining({id:'cv-personal'}),['Press Release Writing']))
})
it('deduplicates personal skills across CV reviews without losing existing skills',async()=>{
 mocks.customSkills=['Public Speaking','Research']
 finishedReview(['  PUBLIC   SPEAKING  '])
 fireEvent.click(await screen.findByRole('button',{name:/Tambah skill pribadi:/}))
 fireEvent.click(screen.getByRole('button',{name:'Simpan 2 skill'}))
 await waitFor(()=>expect(mocks.save).toHaveBeenCalledWith([],expect.anything(),['Public Speaking','Research']))
})
it('allows removing a personal skill before confirmation',async()=>{
 finishedReview(['Media Relations'])
 fireEvent.click(await screen.findByRole('button',{name:'Tambah skill pribadi: Media Relations'}))
 fireEvent.click(screen.getByRole('button',{name:'Hapus Media Relations'}))
 expect(screen.getByRole('button',{name:'Simpan 0 skill'}).hasAttribute('disabled')).toBe(true)
 expect(mocks.save).not.toHaveBeenCalled()
})
it('keeps invalid or over-limit skills unresolved rather than sending an invalid save',async()=>{
 mocks.customSkills=Array.from({length:100},(_,i)=>`Skill ${i}`)
 finishedReview(['Extra skill','x'.repeat(81)])
 fireEvent.click(await screen.findByRole('button',{name:'Tambah skill pribadi: Extra skill'}))
 fireEvent.click(screen.getByRole('button',{name:`Tambah skill pribadi: ${'x'.repeat(81)}`}))
 expect(screen.getByText('“Extra skill”')).toBeTruthy()
 expect(screen.getByText(`“${'x'.repeat(81)}”`)).toBeTruthy()
 expect(screen.getByRole('button',{name:'Simpan 100 skill'})).toBeTruthy()
 expect(mocks.save).not.toHaveBeenCalled()
>>>>>>> e3bc606ffe39a6ee8182941a861b781f303d6ea6
})
