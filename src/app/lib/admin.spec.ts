import {beforeEach,expect,it,vi} from 'vitest'
let role='admin'
const skill={id:'3aa019c1-dc1d-4a7d-888a-01e8e41c4bd2',nama:'SQL',kategori:'Data',alias:[]}
const posting={id:'vacancy-a',judul:'Software Engineer',hidden:false}
let catalog={skills:[skill],jobs:[],institutions:[],trainings:[],postings:[posting],sources:[]}
beforeEach(()=>{
  vi.resetModules();role='admin'
  catalog={skills:[skill],jobs:[],institutions:[],trainings:[],postings:[posting],sources:[]}
  vi.stubGlobal('fetch',vi.fn(async (url:string,init?:RequestInit)=>{
    if(url.endsWith('/me'))return Response.json({id:'account-a',role,skills:[]})
    if(url.endsWith('/admin/catalog'))return Response.json(catalog)
    if(url.endsWith('/admin/skills')&&init?.method==='POST')return Response.json({id:skill.id})
    return Response.json({ok:true})
  }))
})
it('loads the admin-only catalog lazily and reuses it across admin pages',async()=>{
  const api=await import('./api');await api.refresh()
  expect(vi.mocked(fetch).mock.calls.some(([u])=>String(u).includes('/admin/'))).toBe(false)
  await api.loadAdminCatalog();await api.loadAdminCatalog()
  expect(vi.mocked(fetch).mock.calls.filter(([u])=>String(u).endsWith('/admin/catalog'))).toHaveLength(1)
})
it('sends real CRUD/import requests and reloads catalog after each successful write',async()=>{
  const api=await import('./api');await api.refresh();await api.loadAdminCatalog()
  await api.saveSkill(skill);await api.deleteSkill(skill.id)
  await api.importRows('skills',[skill])
  const calls=vi.mocked(fetch).mock.calls
  expect(calls.some(([u,i])=>String(u).endsWith('/admin/skills')&&i?.method==='POST')).toBe(true)
  expect(calls.some(([u,i])=>String(u).endsWith(`/admin/skills/${skill.id}`)&&i?.method==='DELETE')).toBe(true)
  const imported=calls.find(([u])=>String(u).endsWith('/admin/skills/import'))
  expect(JSON.parse(String(imported?.[1]?.body))).toEqual({rows:[skill]})
  expect(calls.filter(([u])=>String(u).endsWith('/admin/catalog'))).toHaveLength(4)
  expect(api.newId('sk')).toMatch(/^[a-f0-9-]{36}$/)
})
it('persists vacancy moderation separately from source data',async()=>{
  const api=await import('./api');await api.refresh();await api.loadAdminCatalog()
  await api.setPostingHidden('vacancy-a',true)
  const call=vi.mocked(fetch).mock.calls.find(([u])=>String(u).endsWith('/admin/vacancies/vacancy-a/visibility'))
  expect(call?.[1]?.method).toBe('PATCH');expect(JSON.parse(String(call?.[1]?.body))).toEqual({hidden:true})
})
it('does not load admin catalog for an ordinary account',async()=>{
  role='user';const api=await import('./api');await api.refresh()
  await expect(api.loadAdminCatalog()).rejects.toMatchObject({status:403})
  expect(vi.mocked(fetch).mock.calls.some(([u])=>String(u).includes('/admin/'))).toBe(false)
})
it('does not report a failed write as success or reload stale data',async()=>{
  const api=await import('./api');await api.refresh();await api.loadAdminCatalog()
  vi.mocked(fetch).mockImplementation(async()=>Response.json({error:{code:'invalid_input',message:'Alias sudah dipakai.'}},{status:400}))
  await expect(api.saveSkill(skill)).rejects.toThrow('Alias sudah dipakai.')
})
