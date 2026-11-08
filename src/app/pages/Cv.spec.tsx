import {beforeEach,afterEach,it,expect,vi} from 'vitest'
import {render,screen,waitFor,cleanup} from '@testing-library/react'
import {BrowserRouter} from 'react-router'
import Cv from './Cv'
const mocks=vi.hoisted(()=>({latest:vi.fn(),watch:vi.fn(),queue:vi.fn(),save:vi.fn(),skills:vi.fn(),signals:[] as AbortSignal[]}))
vi.mock('@/app/lib/api',()=>({ApiError:class extends Error{},CV_STEPS:['Mengunggah file','Mengambil teks dari PDF','AI mengekstrak','Menyamakan skill'],deleteCv:vi.fn(),queueCv:mocks.queue,watchCv:mocks.watch,latestCv:mocks.latest,dismissCv:vi.fn(),fetchSkillsByIds:mocks.skills,saveSkills:mocks.save,validateCv:vi.fn(),cvResult:(job:{id:string;parsed:object})=>({...job.parsed,cvId:job.id,matched:[],unknown:[]})}))
vi.mock('@/app/lib/hooks',()=>({useServerPage:()=>({data:{items:[],total:0},loading:false,error:'',retry:vi.fn()}),useCareer:()=>({user:{id:'user-a',skills:[],cv:null},db:{skills:[]},skillsById:new Map()})}))
vi.mock('@/app/components/SkillPicker',()=>({SkillPicker:()=>null}))
beforeEach(()=>{vi.clearAllMocks();mocks.signals.length=0;mocks.skills.mockResolvedValue(undefined)})
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
