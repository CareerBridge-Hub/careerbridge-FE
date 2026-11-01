import { afterEach, describe, expect, it, vi } from 'vitest'
import { pollUpload, request } from './http'
afterEach(() => vi.unstubAllGlobals())
describe('authenticated transport', () => {
  it('sends cookies and the CSRF header without exposing tokens', async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ ok: true }))
    vi.stubGlobal('fetch', fetcher)
    await request('https://api.test', '/me/target', { method: 'PUT', body: JSON.stringify({ occupationId: 'a' }) })
    const [url, options] = fetcher.mock.calls[0]
    expect(url).toBe('https://api.test/me/target')
    expect(options.headers.has('Authorization')).toBe(false)
    expect(options.headers.get('X-CSRF-Protection')).toBe('1')
    expect(options.credentials).toBe('include')
    expect(options.headers.get('Content-Type')).toBe('application/json')
  })
  it('keeps multipart boundaries browser-generated', async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ id: 'upload' })); vi.stubGlobal('fetch', fetcher)
    await request('', '/me/cv', { method: 'POST', body: new FormData() })
    expect(fetcher.mock.calls[0][1].headers.has('Content-Type')).toBe(false)
  })
  it('preserves expired-session codes and handles network failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ error: { code: 'unauthorized', message: 'Masuk lagi' } }, { status: 401 })))
    await expect(request('', '/me')).rejects.toMatchObject({ status: 401, code: 'unauthorized' })
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    await expect(request('', '/me')).rejects.toMatchObject({ code: 'network_error' })
  })
})
describe('CV polling', () => {
  it('follows actual server progress and preserves semantic matches', async () => {
    const read = vi.fn().mockResolvedValueOnce({ status: 'proses', step: 2 }).mockResolvedValueOnce({ status: 'selesai', step: 4, parsed: { skills: ['spreadsheet'] }, normalized: { matched: [{ skillId: 'excel', sumber: 'cv_semantik' }], unknown: [] } })
    const onStep = vi.fn(); const result = await pollUpload(read, onStep, 0)
    expect(onStep.mock.calls).toEqual([[2], [3]])
    expect(result.normalized.matched[0].sumber).toBe('cv_semantik')
  })
  it('reports server parsing failures', async () => {
    await expect(pollUpload(async () => ({ id: 'a', status: 'gagal', step: 1, error: 'PDF hasil scan', parsed: null, normalized: { matched: [], unknown: [] } }), () => {}, 0)).rejects.toThrow('PDF hasil scan')
  })
})

describe('SSE transport',()=>{
  const body=(chunks:Uint8Array[])=>new ReadableStream<Uint8Array>({start(c){for(const chunk of chunks)c.enqueue(chunk);c.close()}})
  it('decodes split UTF-8, split CRLF, comments and multiline event data',async()=>{
    const {parseEvents}=await import('./http')
    const bytes=new TextEncoder().encode(': heartbeat\r\nid: 8\r\nevent: progress\r\ndata: satu\r\ndata: café\r\n\r\n')
    const events=[]
    for await(const event of parseEvents(body([...bytes].map((b)=>new Uint8Array([b])))))events.push(event)
    expect(events).toEqual([{id:'8',event:'progress',data:'satu\ncafé'}])
  })
  it('sends cookies and Last-Event-ID when reconnecting and stops after completion',async()=>{
    const {watchJob}=await import('./http')
    const encoder=new TextEncoder()
    const fetcher=vi.fn().mockResolvedValueOnce(new Response(body([encoder.encode('id: 1\nevent: progress\ndata: {"step":1}\n\n')]),{headers:{'Content-Type':'text/event-stream'}}))
      .mockResolvedValueOnce(new Response(body([encoder.encode('id: 2\nevent: completed\ndata: {"step":4}\n\n')]),{headers:{'Content-Type':'text/event-stream'}}))
    vi.stubGlobal('fetch',fetcher)
    const progress=vi.fn();const result=await watchJob('/api/v1','/me/cv/cv-a/events',progress)
    expect(result).toEqual({step:4});expect(fetcher).toHaveBeenCalledTimes(2)
    expect(fetcher.mock.calls[1][1].headers.get('Last-Event-ID')).toBe('1')
    expect(fetcher.mock.calls[0][1].credentials).toBe('include')
    expect(progress.mock.calls.map(([value])=>value.step)).toEqual([1,4])
  })
  it('does not reconnect after authorization rejection or a terminal job failure',async()=>{
    const {watchJob}=await import('./http')
    const fetcher=vi.fn().mockResolvedValue(Response.json({error:{code:'unauthorized',message:'Masuk lagi'}},{status:401}))
    vi.stubGlobal('fetch',fetcher)
    await expect(watchJob('','/events',()=>{})).rejects.toMatchObject({status:401})
    expect(fetcher).toHaveBeenCalledTimes(1)
    fetcher.mockReset().mockResolvedValue(new Response(body([new TextEncoder().encode('event: failed\ndata: {"error":"PDF tidak terbaca"}\n\n')]),{headers:{'Content-Type':'text/event-stream'}}))
    await expect(watchJob('','/events',()=>{})).rejects.toMatchObject({code:'job_failed'})
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it('does not open a connection when the page already unmounted',async()=>{
    const {watchJob}=await import('./http');const controller=new AbortController();controller.abort()
    const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher)
    await expect(watchJob('','/events',()=>{},controller.signal)).rejects.toBeInstanceOf(Error)
    expect(fetcher).not.toHaveBeenCalled()
  })
})
