export class ApiError extends Error {
  readonly code: string
  readonly status: number
  constructor(message: string, code = 'request_failed', status = 0) {
    super(message); this.code = code; this.status = status
  }
}
export async function request<T>(base: string, path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('X-CSRF-Protection', '1')
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  let response: Response
  try { response = await fetch(`${base}${path}`, { ...init, credentials: 'include', headers, signal: init.signal ?? AbortSignal.timeout(45_000) }) }
  catch { throw new ApiError('Tidak dapat terhubung ke server. Coba lagi.', 'network_error') }
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new ApiError(data?.error?.message ?? 'Permintaan gagal. Coba lagi.', data?.error?.code, response.status)
  return data as T
}
export type UploadStatus<T> = { id: string; status: 'proses' | 'selesai' | 'gagal'; step: number; error: string | null; parsed: T; normalized: { matched: { skillId: string; sumber: string; raw: string }[]; unknown: string[] } }
export async function pollUpload<T>(read: () => Promise<UploadStatus<T>>, onStep: (n: number) => void, delay = 1500): Promise<UploadStatus<T>> {
  const until = Date.now() + 240_000
  while (Date.now() < until) {
    const status = await read(); onStep(Math.min(status.step, 3))
    if (status.status === 'selesai') return status
    if (status.status === 'gagal') throw new ApiError(status.error ?? 'CV gagal dibaca.', 'cv_failed')
    await new Promise((resolve) => setTimeout(resolve, delay))
  }
  throw new ApiError('Pemrosesan masih berjalan. Coba periksa CV lagi nanti.', 'processing_timeout')
}

export type ServerEvent = {event:string;id:string;data:string}
/** Streaming parser handles split UTF-8, CRLF, comments and multiline data. */
export async function* parseEvents(body:ReadableStream<Uint8Array>,onActivity?:()=>void):AsyncGenerator<ServerEvent> {
  const reader=body.getReader();const decoder=new TextDecoder();let buffer=''
  try {
    while(true){
      const {value,done}=await reader.read()
      onActivity?.()
      buffer+=done?decoder.decode():decoder.decode(value,{stream:true})
      buffer=buffer.replace(/\r\n/g,'\n')
      if(buffer.length>512*1024)throw new ApiError('Respons proses terlalu besar.','invalid_stream')
      let split:number
      while((split=buffer.indexOf('\n\n'))>=0){
        const block=buffer.slice(0,split);buffer=buffer.slice(split+2)
        const event:ServerEvent={event:'message',id:'',data:''};const data:string[]=[]
        for(const line of block.split('\n')){
          if(line.startsWith(':'))continue
          const colon=line.indexOf(':');const field=colon<0?line:line.slice(0,colon)
          let text=colon<0?'':line.slice(colon+1);if(text.startsWith(' '))text=text.slice(1)
          if(field==='event')event.event=text
          if(field==='id'&&!text.includes('\0'))event.id=text
          if(field==='data')data.push(text)
        }
        if(data.length){event.data=data.join('\n');yield event}
      }
      if(done)return
    }
  }finally{await reader.cancel().catch(()=>{});reader.releaseLock()}
}
export async function watchJob<T>(base:string,path:string,onProgress:(value:T)=>void,signal?:AbortSignal):Promise<T>{
  const controller=new AbortController()
  const abort=()=>controller.abort(signal?.reason)
  if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true})
  const timeout=setTimeout(()=>controller.abort(new Error('processing_timeout')),10*60*1000)
  let last='';let attempt=0
  try{
    while(!controller.signal.aborted){
      const connection=new AbortController()
      const close=()=>connection.abort()
      controller.signal.addEventListener('abort',close,{once:true})
      let idle:ReturnType<typeof setTimeout>|undefined
      const activity=()=>{clearTimeout(idle);idle=setTimeout(()=>connection.abort(),45000)}
      try{
        activity()
        const headers=new Headers({'Accept':'text/event-stream','X-CSRF-Protection':'1'})
        if(last)headers.set('Last-Event-ID',last)
        const response=await fetch(`${base}${path}`,{credentials:'include',headers,signal:connection.signal})
        if(!response.ok){const data=await response.json().catch(()=>null);throw new ApiError(data?.error?.message ?? 'Tidak dapat membuka proses.',data?.error?.code,response.status)}
        if(!response.body || !response.headers.get('content-type')?.includes('text/event-stream'))throw new ApiError('Respons proses tidak valid.','invalid_stream')
        for await(const event of parseEvents(response.body,activity)){
          if(event.id)last=event.id
          const value=JSON.parse(event.data) as T & {error?:string;code?:number}
          if(event.event==='progress'){attempt=0;onProgress(value)}
          if(event.event==='completed'){onProgress(value);return value}
          if(event.event==='failed')throw new ApiError(value.error ?? 'Proses gagal. Coba lagi.','job_failed',value.code ?? 0)
          if(event.event==='reconnect')break
        }
      }catch(error){
        if(controller.signal.aborted)throw error
        if(error instanceof ApiError && (error.code==='job_failed' || error.code==='invalid_stream' || (error.status>=400 && error.status<500 && error.status!==429)))throw error
      }finally{clearTimeout(idle);controller.signal.removeEventListener('abort',close);connection.abort()}
      if(++attempt>5)throw new ApiError('Koneksi proses terputus. Proses tetap berjalan di server; buka halaman ini lagi.','stream_disconnected')
      await new Promise<void>((resolve)=>{
        const finish=()=>{clearTimeout(timer);controller.signal.removeEventListener('abort',finish);resolve()}
        const timer=setTimeout(finish,Math.min(1000*2**(attempt-1),8000))
        controller.signal.addEventListener('abort',finish,{once:true})
      })
    }
    throw new ApiError('Proses masih berjalan di server. Buka halaman ini lagi.','processing_timeout')
  }finally{clearTimeout(timeout);signal?.removeEventListener('abort',abort);controller.abort()}
}
