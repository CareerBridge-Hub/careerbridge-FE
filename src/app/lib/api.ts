import { useSyncExternalStore } from 'react'
import type { CvUpload, Db, Experience, Institution, JobRole, Skill, Training, User, UserSkill } from './types.ts'
import type { JobMatch, RankedTraining } from './matching.ts'
import { ApiError, request, watchJob, type UploadStatus } from './http.ts'
export { ApiError } from './http.ts'
export const MAX_CV_BYTES = 2 * 1024 * 1024
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const CV_STEPS = ['Mengunggah file', 'Mengambil teks dari PDF', 'AI memisahkan pendidikan, pengalaman, dan skill', 'Menyamakan nama skill dengan kamus'] as const
// Remove tokens left by the previous browser SDK during migration to HttpOnly sessions.
try {
  for (const key of Object.keys(localStorage)) {
    if (/^sb-[a-z0-9]+-auth-token(?:-.*)?$/.test(key)) localStorage.removeItem(key)
  }
} catch { /* Browser storage can be unavailable; cookie authentication still works. */ }
const base = (import.meta.env.VITE_API_URL ?? '/api/v1').replace(/\/$/, '')
const empty = (): Db => ({ users: [], skills: [], jobs: [], institutions: [], trainings: [], postings: [] })
let db = empty()
let current: User | null = null
let ranked: JobMatch[] = []
let status = { loading: true, error: '' }
let generation = 0
let inFlight: Promise<void> | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }
export function useDb(): Db { return useSyncExternalStore(subscribe, () => db) }
export function useCurrentUser(): User | null { return useSyncExternalStore(subscribe, () => current) }
export function useApiStatus() { return useSyncExternalStore(subscribe, () => status) }
export function useMatches() { return useSyncExternalStore(subscribe, () => ranked) }
async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const started = generation
  try { return await request<T>(base, path, init) }
  catch (e) {
    if (e instanceof ApiError && e.status === 401 && started === generation) { current = null; db = empty(); ranked = [];  emit() }
    throw e
  }
}
export type PageResult<T> = {items: T[]; total: number; offset: number; limit: number; skills?: Skill[]; institutions?: Institution[]; fields?: string[]}
export type BrowseParams = Record<string, string | number | boolean | undefined>
export function queryString(query: BrowseParams): string {
  const params = new URLSearchParams()
  for (const [key,value] of Object.entries(query)) if (value !== undefined && value !== '') params.set(key,String(value))
  return params.toString()
}
function merge<T extends {id: string}>(old: T[], items: T[]): T[] {
  return [...new Map([...old,...items].map((item) => [item.id,item])).values()].slice(-400)
}
function metadata(value: {skills?: Skill[]; institutions?: Institution[]}) {
  db = {...db, skills: merge(db.skills,value.skills ?? []), institutions: merge(db.institutions,value.institutions ?? [])}; emit()
}
export async function fetchCatalog<T>(kind: string, query: BrowseParams, signal?: AbortSignal): Promise<PageResult<T>> {
  const page = await api<PageResult<T>>(`/catalog/${kind}?${queryString(query)}`, {signal})
  if (!signal?.aborted) {
    metadata(page)
    if (kind === 'skills') metadata({skills: page.items as Skill[]})
  }
  return page
}
export async function fetchMatchesPage(query: BrowseParams, signal?: AbortSignal): Promise<PageResult<JobMatch>> {
  const page = await api<PageResult<JobMatch>>(`/me/matches?${queryString(query)}`,{signal})
  if (!signal?.aborted) metadata(page)
  return page
}
export async function fetchTrainingPage(query: BrowseParams, signal?: AbortSignal): Promise<PageResult<Training>> {
  const page = await api<PageResult<Training>>(`/me/trainings?${queryString(query)}`,{signal})
  if (!signal?.aborted) metadata(page)
  return page
}
export async function fetchSkillsByIds(ids: string[], signal?: AbortSignal) {
  if (ids.length) await fetchCatalog<Skill>('skills',{ids:[...new Set(ids)].slice(0,100).join(','),limit:100},signal)
}
let freeTrainingCount = 0
export function useFreeTrainingCount() { return useSyncExternalStore(subscribe, () => freeTrainingCount) }
export async function loadDashboard(signal?: AbortSignal) {
  const epoch = generation
  const result = await api<PageResult<JobMatch> & {freeTrainingCount: number}>('/me/summary',{signal})
  if (signal?.aborted || epoch !== generation || !current) return
  ranked = result.items; freeTrainingCount = result.freeTrainingCount
  db = {...db,jobs:result.items.map((m) => m.job)}; metadata(result)
  return result
}
async function fetchState() {
  const mine = ++generation
  try {
    let user: User
    try { user = await api<User>('/me') }
    catch (e) {
      if (!(e instanceof ApiError)) throw e
      if (e.status === 401) {
        if (mine === generation) { current = null; db = empty(); ranked = []; status = {loading: false, error: ''}; emit() }
        return
      }
      if (e.status !== 404) throw e
      // Existing profiles need no extra provider /user roundtrip on each login.
      const active = await api<{user: {user_metadata: Record<string, unknown>}}>('/auth/session')
      const { nama, pendidikan, jurusan, provinsi, kota, consent } = active.user.user_metadata
      if (!consent || !nama || !pendidikan || !provinsi || !kota) throw new ApiError('Data pendaftaran belum lengkap. Hubungi pengelola.')
      user = await api<User>('/me', {method: 'POST', body: JSON.stringify({nama, pendidikan, jurusan: jurusan ?? '', provinsi, kota, consent: true})})
    }
    if (mine !== generation) return
    current = user; db = {...db, users: [user]}
    status = {loading: false, error: ''}; emit()
  } catch (e) {
    if (mine === generation) { status = { loading: false, error: e instanceof Error ? e.message : 'Data gagal dimuat.' }; emit() }
    throw e
  }
}
export function refresh(): Promise<void> {
  if (inFlight) return inFlight
  const pending = fetchState().finally(() => { if (inFlight === pending) inFlight = null })
  inFlight = pending
  return pending
}
void refresh().catch(() => {})

export type RegisterInput = Pick<User, 'nama' | 'email' | 'pendidikan' | 'jurusan' | 'provinsi' | 'kota'> & { password: string; consent: boolean }
export async function register(input: RegisterInput): Promise<User | null> {
  if (!input.consent) throw new ApiError('Persetujuan pemrosesan CV wajib dicentang.')
  const { email, password, ...profile } = input
  const result = await api<{authenticated: boolean}>('/auth/register', {method: 'POST', body: JSON.stringify({email: email.trim().toLowerCase(), password, profile})})
  if (!result.authenticated) return null
  inFlight = null; await refresh(); return current
}
export async function login(email: string, password: string): Promise<User> {
  await api('/auth/login', {method: 'POST', body: JSON.stringify({email: email.trim().toLowerCase(), password})})
  inFlight = null; await refresh()
  if (!current) throw new ApiError('Profil gagal dimuat. Coba lagi.')
  return current
}
export async function verifyEmail(email: string, token: string) {
  await api('/auth/verify', {method: 'POST', body: JSON.stringify({email, token})})
  inFlight = null; await refresh()
}
export async function logout() {
  await api('/auth/logout', {method: 'POST'})
  ++generation; inFlight = null; current = null; db = empty(); ranked = []; status = { loading: false, error: '' }; emit()
}
export async function updateProfile(patch: Pick<User, 'nama' | 'pendidikan' | 'jurusan' | 'provinsi' | 'kota'>) {
  await api('/me', { method: 'PATCH', body: JSON.stringify(patch) }); await refresh()
}
export async function changePassword(currentPassword: string, password: string) {
  await api('/auth/password', {method: 'POST', body: JSON.stringify({currentPassword, password})})
  ++generation; inFlight = null; current = null; db = empty(); ranked = []; status = { loading: false, error: '' }; emit()
}
export type ParsedCv = { pendidikan: string[]; pengalaman: Experience[]; skills: string[]; cvId?: string; matched?: {skillId: string; sumber: UserSkill['sumber']; raw: string}[]; unknown?: string[] }
export async function validateCv(file: File): Promise<string | null> {
  if (file.size > MAX_CV_BYTES) return 'Ukuran file maksimal 2 MB.'
  if (file.size === 0) return 'File kosong.'
  if (new TextDecoder().decode(await file.slice(0, 5).arrayBuffer()) !== '%PDF-') return 'Isi file bukan PDF yang valid.'
  return null
}
let reviewCvId: string | undefined
export type CvJob = UploadStatus<ParsedCv | null> & {fileName:string;size:number;durationMs:number|null;reviewed:boolean}
export async function latestCv(signal?:AbortSignal):Promise<CvJob|null>{return api('/me/cv/latest',{signal})}
export async function dismissCv(id:string){await api(`/me/cv/${id}/dismiss`,{method:'POST'})}
export async function queueCv(file:File):Promise<{id:string}>{
  const problem=await validateCv(file);if(problem)throw new ApiError(problem)
  const form=new FormData();form.append('file',file)
  return api('/me/cv',{method:'POST',body:form})
}
async function watchAuthenticated<T>(path:string,onProgress:(value:T)=>void,signal?:AbortSignal):Promise<T>{
  const started=generation
  try{return await watchJob<T>(base,path,onProgress,signal)}
  catch(error){
    if(error instanceof ApiError && error.status===401 && started===generation){current=null;db=empty();ranked=[];emit()}
    throw error
  }
}
export async function watchCv(id:string,onStep:(step:number)=>void,signal?:AbortSignal):Promise<CvJob>{
  return watchAuthenticated<CvJob>(`/me/cv/${id}/events`,(job)=>onStep(Math.min(job.step,3)),signal)
}
export function cvResult(job:CvJob):ParsedCv {
  if(!job.parsed)throw new ApiError('Hasil CV belum tersedia.')
  reviewCvId=job.id
  return {...job.parsed,cvId:job.id,matched:(job.normalized?.matched ?? []) as ParsedCv['matched'],unknown:job.normalized?.unknown ?? []}
}
export async function parseCv(file:File,onStep:(step:number)=>void,signal?:AbortSignal):Promise<ParsedCv>{
  onStep(0);const uploaded=await queueCv(file)
  return cvResult(await watchCv(uploaded.id,onStep,signal))
}
export async function saveSkills(skills: UserSkill[], cv?: CvUpload) {
  await api('/me/skills', { method: 'PUT', body: JSON.stringify({ skills, cvId: cv?.id ?? (cv ? reviewCvId : undefined) }) }); await refresh()
}
export async function deleteCv() { await api('/me/cv', { method: 'DELETE' }); await refresh() }
export async function setTarget(occupationId: string | null) { await api('/me/target', { method: 'PUT', body: JSON.stringify({ occupationId }) }); await refresh() }
export type Analysis = { skills?: Skill[]; institutions?: Institution[]; relatedOccupations?: JobRole[]; relatedTrainings?: Training[]; match: JobMatch; trainings: RankedTraining[]; relatedOccupationIds: string[]; relatedTrainingIds: string[]; explanation: string; prioritySkillIds: string[]; fallback: boolean; model: string; revision: string }
export async function loadAnalysis(id: string, signal?: AbortSignal,onProgress?:(step:number)=>void): Promise<Analysis> {
  const job=await api<{id:string}>(`/me/analysis/${id}/jobs`,{method:'POST',signal})
  const terminal=await watchAuthenticated<{result:Analysis;step:number}>(`/me/analysis-jobs/${job.id}/events`,(value)=>onProgress?.(value.step),signal)
  const result=terminal.result
  if (!signal?.aborted) { db = {...db,jobs:merge(db.jobs,result.relatedOccupations ?? [])}; metadata(result) }
  return result
}

// Admin UI sources remain for the later milestone, but are not routed or enabled.
const unavailable = async (..._args: unknown[]): Promise<never> => { throw new ApiError('Fitur admin belum tersedia.') }
export const saveSkill = unavailable, deleteSkill = unavailable, saveJob = unavailable, deleteJob = unavailable
export const saveInstitution = unavailable, deleteInstitution = unavailable, saveTraining = unavailable, deleteTraining = unavailable, setPostingHidden = unavailable, importRows = unavailable
export const newId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`
