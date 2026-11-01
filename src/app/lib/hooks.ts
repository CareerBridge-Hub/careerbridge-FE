import { useSearchParams } from 'react-router'
import { useEffect, useMemo, useState, useRef } from 'react'
import { useCurrentUser, useDb, useMatches, loadAnalysis, loadDashboard, fetchMatchesPage, type Analysis, type BrowseParams, type PageResult } from './api'
import { skillDemand } from './matching'

/** Everything the job-seeker pages derive from the store, computed once per change. */
export function useCareer() {
  const db = useDb()
  const user = useCurrentUser()!
  const ranked = useMatches()
  return useMemo(() => {
    const userSkillIds = user.skills.map((s) => s.skillId)
    const target = ranked.find((m) => m.job.id === user.targetJobId) ?? null
    return {
      db,
      user,
      userSkillIds,
      ranked,
      target,
      /** The job recommendations default to: the chosen target, else the best match. */
      focus: target ?? ranked[0] ?? null,
      skillsById: new Map(db.skills.map((s) => [s.id, s])),
      instById: new Map(db.institutions.map((i) => [i.id, i])),
      demand: skillDemand(db.jobs),
      postings: db.postings.filter((p) => !p.hidden).sort((a, b) => b.tanggal.localeCompare(a.tanggal)),
    }
  }, [db, user, ranked])
}

/**
 * Reveals `text` word by word, like a streamed AI answer. Instant under reduced motion.
 * Runs once per mount: give the caller a `key` of the text to replay for new text.
 */
export function useTypewriter(text: string, start: boolean, msPerWord = 28) {
  const words = useMemo(() => text.split(/(\s+)/), [text])
  const [instant] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!start || instant) return
    let i = 0
    const id = setInterval(() => {
      i++
      setN(i)
      if (i >= words.length) clearInterval(id)
    }, msPerWord)
    return () => clearInterval(id)
  }, [words, start, instant, msPerWord])
  const count = !start ? 0 : instant ? words.length : n
  return { shown: words.slice(0, count).join(''), done: count >= words.length }
}

export function useAnalysis(id?: string) {
  const user = useCurrentUser()
  const key=JSON.stringify([user?.id,id])
  const [state, setState] = useState<{key:string; data: Analysis | null; error: string; loading: boolean; progress:number }>({key:'', data: null, error: '', loading: true,progress:0 })
  const [attempt, retry] = useState(0)
  useEffect(() => {
    let active = true
    const controller = new AbortController()
    setState({key, data: null, error: '', loading: !!id,progress:0 })
    if (id) loadAnalysis(id,controller.signal,(progress)=>{if(active)setState({key,data:null,error:'',loading:true,progress})}).then((data) => { if (active) setState({key, data, error: '', loading: false,progress:2 }) }).catch((error) => { if (active) setState({key, data: null, error: error.message, loading: false,progress:0 }) })
    return () => { active = false; controller.abort() }
  }, [id, user, key, attempt])
  return { ...(state.key===key ? state : {data:null,error:'',loading:!!id,progress:0}), retry: () => retry((n) => n + 1) }
}

/** A page belongs to its exact URL query; cancellation suppresses stale results. */
export function useServerPage<T>(loader: (query: BrowseParams, signal?: AbortSignal) => Promise<PageResult<T>>, query: BrowseParams, enabled = true) {
  const user = useCurrentUser()
  const key = JSON.stringify([user?.id,query])
  const [attempt,retry] = useState(0)
  const [state,setState] = useState<{key: string; data: PageResult<T> | null; error: string; loading: boolean}>({key:'',data:null,error:'',loading:true})
  useEffect(() => {
    const controller = new AbortController()
    if (!enabled) return () => controller.abort()
    setState({key,data:null,error:'',loading:true})
    loader(JSON.parse(key)[1],controller.signal).then((data) => {if (!controller.signal.aborted) setState({key,data,error:'',loading:false})})
      .catch((error) => {if (!controller.signal.aborted) setState({key,data:null,error:error.message,loading:false})})
    return () => controller.abort()
  },[loader,key,user,attempt,enabled])
  return {...(state.key === key ? state : {data:null,error:'',loading:true}),retry:()=>retry((n)=>n+1)}
}
export function useJob(id?: string) {
  return useServerPage(fetchMatchesPage,{ids:id,limit:1},!!id)
}
export function useDashboard() {
  const user = useCurrentUser()
  const [attempt,retry] = useState(0)
  const [state,setState] = useState({owner:user?.id,loading:true,error:''})
  useEffect(() => {
    const controller = new AbortController()
    setState({owner:user?.id,loading:true,error:''})
    loadDashboard(controller.signal).then(()=>{if(!controller.signal.aborted)setState({owner:user?.id,loading:false,error:''})})
      .catch((e)=>{if(!controller.signal.aborted)setState({owner:user?.id,loading:false,error:e.message})})
    return ()=>controller.abort()
  },[user,attempt])
  return {...(state.owner===user?.id ? state : {loading:true,error:''}),retry:()=>retry((n)=>n+1)}
}
export function useDebounced<T>(value:T,delay=300) {
  const [result,setResult]=useState(value)
  useEffect(()=>{const timer=setTimeout(()=>setResult(value),delay);return()=>clearTimeout(timer)},[value,delay])
  return result
}

/** Keep keystrokes local; commit one URL query after typing settles. */
export function useUrlSearch(key='q',offsetKey='offset') {
  const [params,setParams]=useSearchParams()
  const urlValue=params.get(key) ?? ''
  const [input,setInput]=useState(urlValue)
  const pending=useRef(false)
  useEffect(()=>{pending.current=false;setInput(urlValue)},[urlValue])
  useEffect(()=>{
    if(!pending.current)return
    const timer=setTimeout(()=>{
      pending.current=false
      setParams((p)=>{if(input)p.set(key,input);else p.delete(key);p.delete(offsetKey);return p},{replace:true})
    },300)
    return()=>clearTimeout(timer)
  },[input,key,offsetKey,setParams])
  return [input,(value:string)=>{pending.current=true;setInput(value)}] as const
}
