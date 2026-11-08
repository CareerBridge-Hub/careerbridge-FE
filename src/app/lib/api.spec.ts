import { beforeEach, expect, it, vi } from 'vitest'
const user = { id: 'user-a', nama: 'Rina', email: 'rina@example.test', skills: [], role: 'user' }
beforeEach(() => {
  vi.resetModules()
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url.endsWith('/auth/session')) return Response.json({user: {id: 'user-a', user_metadata: {}}})
    if (url.endsWith('/auth/register')) return Response.json({authenticated: false, confirmationRequired: true})
    if (url.endsWith('/me')) return Response.json(user)
    if (url.includes('/catalog/')) return Response.json({ items: [], total: 0 })
    if (url.endsWith('/me/matches')) return Response.json({ items: [] })
    return Response.json({ ok: true })
  }))
})
it('logs in through the backend and fetches only the current profile', async () => {
  const api = await import('./api'); const result = await api.login('RINA@example.test', 'private-password')
  expect(result.id).toBe('user-a')
  const loginCall = vi.mocked(fetch).mock.calls.find(([url]) => String(url).endsWith('/auth/login'))
  expect(JSON.parse(String(loginCall?.[1]?.body))).toEqual({email: 'rina@example.test', password: 'private-password'})
  expect(loginCall?.[1]?.credentials).toBe('include')
  const urls = vi.mocked(fetch).mock.calls.map(([url]) => String(url))
  expect(urls.some((url) => url.includes('/users'))).toBe(false)
  expect(localStorage.getItem('careerbridge:db:v1')).toBeNull()
})
it('supports confirmation-required registration without a fake session', async () => {
  const api = await import('./api')
  const result = await api.register({ nama: 'Rina', email: 'rina@example.test', password: 'private-password', pendidikan: 'S1', jurusan: 'TI', provinsi: 'Banten', kota: 'Serang', consent: true })
  expect(result).toBeNull()
})
it('persists skill corrections and target changes through the API', async () => {
  const api = await import('./api')
  await api.saveSkills([{ skillId: 'skill-a', sumber: 'cv_semantik' }], { id: 'cv-a', fileName: 'cv.pdf', size: 10, uploadedAt: '', pendidikan: [], pengalaman: [] })
  await api.setTarget('occupation-a')
  const calls = vi.mocked(fetch).mock.calls
  expect(calls.find(([url]) => String(url).endsWith('/me/skills'))?.[1]?.body).toBe(JSON.stringify({ skills: [{ skillId: 'skill-a', sumber: 'cv_semantik' }], customSkills: [], cvId: 'cv-a' }))
  expect(calls.find(([url]) => String(url).endsWith('/me/target'))?.[1]?.body).toBe(JSON.stringify({ occupationId: 'occupation-a' }))
})

it('skips the OTP screen when backend registration creates a session', async () => {
  const api = await import('./api')
  vi.mocked(fetch).mockImplementation(async (url) => {
    const path = String(url)
    if (path.endsWith('/auth/register')) return Response.json({authenticated: true})
    if (path.endsWith('/auth/session')) return Response.json({user: {id: 'user-a', user_metadata: {}}})
    if (path.endsWith('/me')) return Response.json(user)
    if (path.endsWith('/me/matches')) return Response.json({items: []})
    return Response.json({items: [], total: 0})
  })
  const result = await api.register({nama: 'Rina', email: 'rina@example.test', password: 'private-password', pendidikan: 'S1', jurusan: 'TI', provinsi: 'Banten', kota: 'Serang', consent: true})
  expect(result?.id).toBe('user-a')
  expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).endsWith('/auth/verify'))).toBe(false)
})

it('login and refresh fetch no catalogs or matches, including in the background', async () => {
  const api=await import('./api')
  await api.login('rina@example.test','private-password')
  await api.refresh()
  await Promise.resolve()
  const urls=vi.mocked(fetch).mock.calls.map(([url])=>String(url))
  expect(urls.some((url)=>url.includes('/catalog/') || url.includes('/me/matches') || url.includes('/me/trainings'))).toBe(false)
})
it('requests exactly one filtered page without following total into more requests', async () => {
  const api=await import('./api')
  await api.login('rina@example.test','private-password')
  vi.mocked(fetch).mockClear()
  vi.mocked(fetch).mockResolvedValue(Response.json({items:[],total:2123,offset:24,limit:12}))
  await api.fetchTrainingPage({offset:24,limit:12,q:'web',cost:'gratis'})
  expect(fetch).toHaveBeenCalledTimes(1)
  const url=String(vi.mocked(fetch).mock.calls[0][0])
  expect(url).toContain('offset=24');expect(url).toContain('limit=12');expect(url).toContain('q=web');expect(url).toContain('cost=gratis')
})
