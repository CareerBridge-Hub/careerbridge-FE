import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router'
import Lowongan from './Lowongan'
const mocks=vi.hoisted(()=>({page:vi.fn(),skills:[{skillId:'s1',sumber:'manual'}] as {skillId:string;sumber:string}[]}))
vi.mock('@/app/lib/api',()=>({fetchVacanciesPage:vi.fn()}))
vi.mock('@/app/lib/hooks',async(importOriginal)=>({...await importOriginal<typeof import('@/app/lib/hooks')>(),useServerPage:mocks.page,useCareer:()=>({user:{skills:mocks.skills,targetJobId:null}})}))
const vacancy=(id:string,extra:object)=>({id,source:'grab',sourceId:id,company:'Fixture',title:`Lowongan ${id}`,occupationId:null,occupationName:null,country:'ID',city:'Jakarta',region:'',workplace:'',employmentType:'',description:'',requirements:'',applyUrl:'https://example.test/apply',sourceUrl:'https://example.test/source',postedAt:null,validUntil:null,lastSeenAt:'2026-11-09T00:00:00Z',...extra})
beforeEach(()=>{
  history.replaceState(null,'','/lowongan')
  mocks.skills=[{skillId:'s1',sumber:'manual'}]
  mocks.page.mockReset().mockReturnValue({loading:false,error:'',retry:vi.fn(),data:{total:2,offset:0,limit:12,items:[
    vacancy('A',{matchScore:60,ownedSkillIds:['s1','s2','s3'],missingSkillIds:['s4','s5']}),
    vacancy('B',{matchScore:null,ownedSkillIds:[],missingSkillIds:[]}),
  ],skills:[{id:'s4',nama:'SQL',kategori:'T',alias:[]},{id:'s5',nama:'Docker',kategori:'T',alias:[]}]}})
})
afterEach(cleanup)
it('shows the backend match score and missing skills, and no score when none detected',()=>{
  render(<BrowserRouter><Lowongan/></BrowserRouter>)
  expect(screen.getByText('Cocok 60%')).toBeTruthy()
  expect(screen.getByText('3/5 skill')).toBeTruthy()
  expect(screen.getByText('Skill kurang: SQL, Docker')).toBeTruthy()
  expect(screen.getAllByText(/Cocok \d+%/)).toHaveLength(1)
})
it('passes the URL sort to the server page request',()=>{
  history.replaceState(null,'','/lowongan?sort=match&offset=12')
  render(<BrowserRouter><Lowongan/></BrowserRouter>)
  expect(mocks.page.mock.calls.at(-1)?.[1]).toMatchObject({sort:'match',offset:12})
  expect(screen.getByRole('combobox',{name:'Urutkan lowongan'})).toBeTruthy()
})
it('disables match sorting and explains why when the user has no skills',()=>{
  mocks.skills=[]
  render(<BrowserRouter><Lowongan/></BrowserRouter>)
  expect(screen.getByText('Tambahkan skill di halaman CV agar kecocokan lowongan bisa dihitung.')).toBeTruthy()
})
