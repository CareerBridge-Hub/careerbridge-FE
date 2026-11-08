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
let trainingOccupations: {id:string;nama:string}[] | null = null
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
    if (e instanceof ApiError && e.status === 401 && started === generation) { current = null; db = empty(); ranked = []; clearAdminCatalog(); emit() }
    throw e
  }
}
export type TrainingEvidence = {method: 'mapped' | 'text' | 'semantic' | 'catalog'; confirmedSkillIds: string[]; relatedSkillIds: string[]; similarity: number | null; source: string | null; sourceUrl: string | null; importedAt: string | null}
export type TrainingRetrieval = {mode: 'catalog' | 'text' | 'hybrid'; catalogCount: number; indexedCount: number; notice: string | null; sampleDataIncluded: boolean}
export type PageResult<T> = {evidence?: Record<string, TrainingEvidence>; retrieval?: TrainingRetrieval;items: T[]; total: number; offset: number; limit: number; skills?: Skill[]; institutions?: Institution[]; fields?: string[]; occupationOptions?: {id:string;nama:string}[]}
export type BrowseParams = Record<string, string | number | boolean | undefined>
export function queryString(query: BrowseParams): string {
  const params = new URLSearchParams()
  for (const [key,value] of Object.entries(query)) if (value !== undefined && value !== '') params.set(key,String(value))
  return params.toString()
}
function merge<T extends {id: string}>(old: T[], items: T[]): T[] {
  const values = [...new Map([...old,...items].map((item) => [item.id,item])).values()]
  return current?.role === 'admin' ? values : values.slice(-400)
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
export function useTrainingOccupations() { return useSyncExternalStore(subscribe,()=>trainingOccupations) }
export async function fetchTrainingPage(query: BrowseParams, signal?: AbortSignal): Promise<PageResult<Training>> {
  const page = await api<PageResult<Training>>(`/me/trainings?${queryString(query)}`,{signal})
  if (!signal?.aborted) { trainingOccupations=page.occupationOptions ?? trainingOccupations; metadata(page) }
  return page
}
export type Vacancy = {id:string;source:string;sourceId:string;company:string;title:string;occupationId:string|null;occupationName:string|null;country:string;city:string;region:string;workplace:string;employmentType:string;description:string;requirements:string;applyUrl:string;sourceUrl:string;postedAt:string|null;validUntil:string|null;lastSeenAt:string}
export async function fetchVacanciesPage(query: BrowseParams, signal?: AbortSignal): Promise<PageResult<Vacancy>> {
  return api<PageResult<Vacancy>>(`/me/vacancies?${queryString(query)}`,{signal})
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
        if (mine === generation) { current = null; db = empty(); ranked = []; clearAdminCatalog(); status = {loading: false, error: ''}; emit() }
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
    if (current?.id !== user.id) { db=empty(); ranked=[]; clearAdminCatalog() }
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
  ++generation; inFlight = null; current = null; db = empty(); ranked = []; clearAdminCatalog(); status = { loading: false, error: '' }; emit()
}
export async function updateProfile(patch: Pick<User, 'nama' | 'pendidikan' | 'jurusan' | 'provinsi' | 'kota'>) {
  await api('/me', { method: 'PATCH', body: JSON.stringify(patch) }); await refresh()
}
export async function changePassword(currentPassword: string, password: string) {
  await api('/auth/password', {method: 'POST', body: JSON.stringify({currentPassword, password})})
  ++generation; inFlight = null; current = null; db = empty(); ranked = []; clearAdminCatalog(); status = { loading: false, error: '' }; emit()
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
export async function saveSkills(skills: UserSkill[], cv?: CvUpload, customSkills: string[] = []) {
  await api('/me/skills', { method: 'PUT', body: JSON.stringify({ skills, customSkills, cvId: cv?.id ?? (cv ? reviewCvId : undefined) }) }); await refresh()
}
export async function deleteCv() { await api('/me/cv', { method: 'DELETE' }); await refresh() }
export async function setTarget(occupationId: string | null) { await api('/me/target', { method: 'PUT', body: JSON.stringify({ occupationId }) }); await refresh() }
export type Analysis = { trainingEvidence?: Record<string, TrainingEvidence>; trainingRetrieval?: TrainingRetrieval; skills?: Skill[]; institutions?: Institution[]; relatedOccupations?: JobRole[]; relatedTrainings?: Training[]; match: JobMatch; trainings: RankedTraining[]; relatedOccupationIds: string[]; relatedTrainingIds: string[]; explanation: string; prioritySkillIds: string[]; fallback: boolean; model: string; revision: string }
export async function loadAnalysis(id: string, signal?: AbortSignal,onProgress?:(step:number)=>void): Promise<Analysis> {
  const job=await api<{id:string}>(`/me/analysis/${id}/jobs`,{method:'POST',signal})
  const terminal=await watchAuthenticated<{result:Analysis;step:number}>(`/me/analysis-jobs/${job.id}/events`,(value)=>onProgress?.(value.step),signal)
  const result=terminal.result
  if (!signal?.aborted) { db = {...db,jobs:merge(db.jobs,result.relatedOccupations ?? [])}; metadata(result) }
  return result
}

// The admin catalog is loaded only when entering an admin route.
export type AdminSource = {key:string; lastSuccessAt:string|null; nextRunAt:string|null; lastError:string|null; lastCount:number; running:boolean|null}
type AdminCatalog = Pick<Db,'skills'|'jobs'|'institutions'|'trainings'|'postings'> & {sources:AdminSource[]}
let adminOwner:string|null = null
let adminSources:AdminSource[] = []
let adminPending:Promise<void>|null = null
function clearAdminCatalog() { adminOwner=null; adminSources=[]; adminPending=null }
export function useAdminSources() { return useSyncExternalStore(subscribe,()=>adminSources) }
export async function loadAdminCatalog(force=false):Promise<void> {
  if (current?.role !== 'admin') throw new ApiError('Akses admin diperlukan.','forbidden',403)
  if (!force && adminOwner===current.id) return
  if (adminPending) return adminPending
  const owner=current.id, epoch=generation
  const pending=(async()=>{
    const result=await api<AdminCatalog>('/admin/catalog')
    if (epoch!==generation || current?.id!==owner || current.role!=='admin') return
    db={...db,skills:result.skills,jobs:result.jobs,institutions:result.institutions,trainings:result.trainings,postings:result.postings}
    adminSources=result.sources; adminOwner=owner; emit()
  })().finally(()=>{if(adminPending===pending)adminPending=null})
  adminPending=pending
  return pending
}
async function adminSave(kind:string,input:unknown) {
  await api(`/admin/${kind}`,{method:'POST',body:JSON.stringify(input)})
  await loadAdminCatalog(true)
}
async function adminDelete(kind:string,id:string) {
  await api(`/admin/${kind}/${encodeURIComponent(id)}`,{method:'DELETE'})
  await loadAdminCatalog(true)
}
type Save<T extends {id:string}> = Omit<T,'id'> & {id?:string}
export const saveSkill = (input:Save<Skill>)=>adminSave('skills',input)
export const deleteSkill = (id:string)=>adminDelete('skills',id)
export const saveJob = (input:Save<JobRole>)=>adminSave('jobs',input)
export const deleteJob = (id:string)=>adminDelete('jobs',id)
export const saveInstitution = (input:Save<Institution>)=>adminSave('institutions',input)
export const deleteInstitution = (id:string)=>adminDelete('institutions',id)
export const saveTraining = (input:Save<Training>)=>adminSave('trainings',input)
export const deleteTraining = (id:string)=>adminDelete('trainings',id)
export async function setPostingHidden(id:string,hidden:boolean) {
  await api(`/admin/vacancies/${encodeURIComponent(id)}/visibility`,{method:'PATCH',body:JSON.stringify({hidden})})
  db={...db,postings:db.postings.map((p)=>p.id===id?{...p,hidden}:p)}; emit()
}
export async function importRows(kind:'skills'|'jobs'|'institutions'|'trainings',rows:unknown[]) {
  if (!rows.length || rows.length>500) throw new ApiError('Import dibatasi 1–500 baris per file.')
  await api(`/admin/${kind}/import`,{method:'POST',body:JSON.stringify({rows}),signal:AbortSignal.timeout(300_000)})
  await loadAdminCatalog(true)
}
export const newId = (_prefix:string) => crypto.randomUUID()
