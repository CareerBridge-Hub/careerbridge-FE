import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router'
import Pekerjaan from './Pekerjaan'
const mocks=vi.hoisted(()=>({page:vi.fn()}))
vi.mock('@/app/lib/api',()=>({setTarget:vi.fn(),fetchMatchesPage:vi.fn()}))
vi.mock('@/app/lib/hooks',async(importOriginal)=>({...await importOriginal<typeof import('@/app/lib/hooks')>(),useServerPage:mocks.page,useCareer:()=>({user:{skills:[{skillId:'one',sumber:'manual'}],targetJobId:null}})}))
beforeEach(()=>{
  history.replaceState(null,'','/pekerjaan')
  mocks.page.mockReset().mockReturnValue({loading:false,error:'',retry:vi.fn(),data:{total:9,fields:['Administrasi'],items:[{job:{id:'occupation-a',nama:'Pekerjaan dari server',bidang:'Administrasi',kodeKbji:'4110',skills:[]},score:73,earned:8,total:11,owned:[],missingWajib:[],missingOpsional:[]}]}})
})
afterEach(cleanup)
it('renders only the returned page and preserves backend scores',()=>{
  render(<BrowserRouter><Pekerjaan/></BrowserRouter>)
  expect(screen.getByText('73%')).toBeTruthy()
  expect(screen.getByText('8/11 poin')).toBeTruthy()
  expect(screen.getByRole('link',{name:'Pekerjaan dari server'}).getAttribute('href')).toBe('/pekerjaan/occupation-a')
  expect(screen.getByText('1–6 dari 9')).toBeTruthy()
})
it('requests the URL page and resets offset when searching or filtering',async()=>{
  history.replaceState(null,'','/pekerjaan?offset=6')
  render(<BrowserRouter><Pekerjaan/></BrowserRouter>)
  expect(mocks.page.mock.calls.at(-1)?.[1]).toMatchObject({offset:6,limit:6})
  fireEvent.change(screen.getByRole('textbox',{name:'Cari pekerjaan'}),{target:{value:'SQL'}})
  await waitFor(()=>expect(mocks.page.mock.calls.at(-1)?.[1]).toMatchObject({offset:0,limit:6,q:'SQL'}))
  fireEvent.click(screen.getByRole('button',{name:'Berikutnya'}))
  expect(mocks.page.mock.calls.at(-1)?.[1]).toMatchObject({offset:6,limit:6,q:'SQL'})
  fireEvent.click(screen.getByRole('radio',{name:'Administrasi'}))
  expect(mocks.page.mock.calls.at(-1)?.[1]).toMatchObject({offset:0,category:'Administrasi'})
})
