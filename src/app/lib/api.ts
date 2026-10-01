// Fake backend. Every exported mutation is async and validates its input the way the real API must,
// so pages already handle latency and errors. State lives in localStorage; swap these functions for
// fetch() calls when the backend exists. Reads go through useDb()/useCurrentUser() (synchronous store).
import { useSyncExternalStore } from 'react'
import { SAMPLE_CV, seed } from '../data/seed.ts'
import type { CvUpload, Db, Experience, Institution, JobPosting, JobRole, Skill, Training, User, UserSkill } from './types.ts'

const DB_KEY = 'careerbridge:db:v1'
const SESSION_KEY = 'careerbridge:session'
export const MAX_CV_BYTES = 2 * 1024 * 1024

export class ApiError extends Error {}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

/**
 * Postings stand in for the daily Jooble/JSearch fetch, so they are regenerated with today's dates on
 * every load; only the admin's "hidden" flags carry over (and postings of deleted jobs stay gone).
 */
function load(): Db {
  const stored = read<Db>(DB_KEY)
  if (!stored) return seed()
  const hidden = new Set(stored.postings.filter((p) => p.hidden).map((p) => p.id))
  const jobs = new Set(stored.jobs.map((j) => j.id))
  const postings = seed().postings.filter((p) => jobs.has(p.jobRoleId)).map((p) => ({ ...p, hidden: hidden.has(p.id) }))
  return { ...stored, postings }
}

let db: Db = load()
let session: string | null = read<string>(SESSION_KEY)
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

function persist() {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db))
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    else localStorage.removeItem(SESSION_KEY)
  } catch {
    // Storage full or blocked: the demo keeps working in memory for this tab.
  }
}

function commit(next: Partial<Db>) {
  db = { ...db, ...next }
  persist()
  emit()
}

// Another tab logged out or edited data: follow it.
if (typeof window !== 'undefined')
  window.addEventListener('storage', (e) => {
    if (e.key !== DB_KEY && e.key !== SESSION_KEY) return
    db = load()
    session = read<string>(SESSION_KEY)
    emit()
  })

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => void listeners.delete(l)
}

export function useDb(): Db {
  return useSyncExternalStore(subscribe, () => db)
}

export function useCurrentUser(): User | null {
  const data = useDb()
  const id = useSyncExternalStore(subscribe, () => session)
  return data.users.find((u) => u.id === id) ?? null
}

/** Network-ish latency so loading states are real. */
const wait = (ms = 350 + Math.random() * 300) => new Promise((r) => setTimeout(r, ms))

const newId = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`

export async function hashPassword(password: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password))
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function me(): User {
  const u = db.users.find((x) => x.id === session)
  if (!u) throw new ApiError('Sesi berakhir. Silakan masuk lagi.')
  return u
}

function updateMe(patch: Partial<User>) {
  const id = me().id
  commit({ users: db.users.map((u) => (u.id === id ? { ...u, ...patch } : u)) })
}

function requireAdmin() {
  if (me().role !== 'admin') throw new ApiError('Hanya admin yang bisa mengubah data ini.')
}

// ---------- Auth and profile (F1) ----------

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function login(email: string, password: string): Promise<User> {
  await wait()
  const u = db.users.find((x) => x.email === email.trim().toLowerCase())
  if (!u || u.passwordHash !== (await hashPassword(password))) throw new ApiError('Email atau password salah.')
  session = u.id
  persist()
  emit()
  return u
}

export function logout() {
  session = null
  persist()
  emit()
}

export type RegisterInput = Pick<User, 'nama' | 'email' | 'pendidikan' | 'jurusan' | 'provinsi' | 'kota'> & {
  password: string
  consent: boolean
}

export async function register(input: RegisterInput): Promise<User> {
  await wait()
  const email = input.email.trim().toLowerCase()
  if (!input.nama.trim()) throw new ApiError('Nama wajib diisi.')
  if (!EMAIL_RE.test(email)) throw new ApiError('Format email tidak valid.')
  if (input.password.length < 8) throw new ApiError('Password minimal 8 karakter.')
  if (!input.pendidikan || !input.provinsi || !input.kota.trim()) throw new ApiError('Lengkapi data profil.')
  if (!input.consent) throw new ApiError('Persetujuan pemrosesan CV wajib dicentang.')
  if (db.users.some((u) => u.email === email)) throw new ApiError('Email ini sudah terdaftar. Silakan masuk.')
  const user: User = {
    id: newId('u'),
    nama: input.nama.trim(),
    email,
    passwordHash: await hashPassword(input.password),
    pendidikan: input.pendidikan,
    jurusan: input.jurusan.trim(),
    provinsi: input.provinsi,
    kota: input.kota.trim(),
    role: 'user',
    createdAt: new Date().toISOString(),
    skills: [],
    targetJobId: null,
    cv: null,
  }
  session = user.id
  commit({ users: [...db.users, user] })
  return user
}

export async function updateProfile(patch: Pick<User, 'nama' | 'pendidikan' | 'jurusan' | 'provinsi' | 'kota'>) {
  await wait()
  if (!patch.nama.trim() || !patch.kota.trim()) throw new ApiError('Nama dan kota wajib diisi.')
  updateMe({ ...patch, nama: patch.nama.trim(), jurusan: patch.jurusan.trim(), kota: patch.kota.trim() })
}

export async function changePassword(current: string, next: string) {
  await wait()
  if ((await hashPassword(current)) !== me().passwordHash) throw new ApiError('Password lama salah.')
  if (next.length < 8) throw new ApiError('Password baru minimal 8 karakter.')
  updateMe({ passwordHash: await hashPassword(next) })
}

// ---------- CV and skills (F2) ----------

export type ParsedCv = { pendidikan: string[]; pengalaman: Experience[]; skills: string[] }

export const CV_STEPS = ['Mengunggah file', 'Mengambil teks dari PDF', 'AI memisahkan pendidikan, pengalaman, dan skill', 'Menyamakan nama skill dengan kamus'] as const

/** Checks what the server must check too: PDF by signature (not just extension) and ≤ 2 MB. */
export async function validateCv(file: File): Promise<string | null> {
  if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') return 'File harus berformat PDF.'
  if (file.size > MAX_CV_BYTES) return 'Ukuran file maksimal 2 MB.'
  if (file.size === 0) return 'File kosong.'
  const head = new TextDecoder().decode(await file.slice(0, 5).arrayBuffer())
  if (head !== '%PDF-') return 'Isi file bukan PDF yang valid.'
  return null
}

/** Demo stand-in for text extraction + AI parsing: always returns the sample CV's result. */
export async function parseCv(file: File, onStep: (i: number) => void): Promise<ParsedCv> {
  const problem = await validateCv(file)
  if (problem) throw new ApiError(problem)
  for (let i = 0; i < CV_STEPS.length; i++) {
    onStep(i)
    await wait(600 + Math.random() * 500)
  }
  return { pendidikan: SAMPLE_CV.pendidikan, pengalaman: SAMPLE_CV.pengalaman, skills: SAMPLE_CV.skills }
}

/** Saves the confirmed skill list; pass `cv` to attach the parsed CV, omit to keep the current one. */
export async function saveSkills(skills: UserSkill[], cv?: CvUpload) {
  await wait()
  const known = new Set(db.skills.map((s) => s.id))
  const unique = [...new Map(skills.filter((s) => known.has(s.skillId)).map((s) => [s.skillId, s])).values()]
  updateMe(cv ? { skills: unique, cv } : { skills: unique })
}

export async function deleteCv() {
  await wait()
  updateMe({ cv: null })
}

export async function setTarget(jobId: string | null) {
  if (jobId && !db.jobs.some((j) => j.id === jobId)) throw new ApiError('Pekerjaan tidak ditemukan.')
  updateMe({ targetJobId: jobId })
}

export function resetDemo() {
  db = seed()
  if (!db.users.some((u) => u.id === session)) session = null
  persist()
  emit()
}

// ---------- Admin (F7) ----------

const upsert = <T extends { id: string }>(list: T[], item: T) =>
  list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item]

export async function saveSkill(skill: Omit<Skill, 'id'> & { id?: string }) {
  await wait()
  requireAdmin()
  commit({ skills: upsert(db.skills, { ...skill, id: skill.id ?? newId('sk') }) })
}

/** Removing a skill also removes it from jobs, trainings and users, so no dangling ids remain. */
export async function deleteSkill(id: string) {
  await wait()
  requireAdmin()
  commit({
    skills: db.skills.filter((s) => s.id !== id),
    jobs: db.jobs.map((j) => ({ ...j, skills: j.skills.filter((s) => s.skillId !== id) })),
    trainings: db.trainings.map((t) => ({ ...t, skillIds: t.skillIds.filter((s) => s !== id) })),
    users: db.users.map((u) => ({ ...u, skills: u.skills.filter((s) => s.skillId !== id) })),
  })
}

export async function saveJob(job: Omit<JobRole, 'id'> & { id?: string }) {
  await wait()
  requireAdmin()
  if (!job.skills.some((s) => s.tipe === 'wajib')) throw new ApiError('Pekerjaan butuh minimal satu skill wajib.')
  commit({ jobs: upsert(db.jobs, { ...job, id: job.id ?? newId('job') }) })
}

export async function deleteJob(id: string) {
  await wait()
  requireAdmin()
  commit({
    jobs: db.jobs.filter((j) => j.id !== id),
    postings: db.postings.filter((p) => p.jobRoleId !== id),
    users: db.users.map((u) => (u.targetJobId === id ? { ...u, targetJobId: null } : u)),
  })
}

export async function saveInstitution(inst: Omit<Institution, 'id'> & { id?: string }) {
  await wait()
  requireAdmin()
  commit({ institutions: upsert(db.institutions, { ...inst, id: inst.id ?? newId('lpk') }) })
}

export async function deleteInstitution(id: string) {
  await wait()
  requireAdmin()
  commit({
    institutions: db.institutions.filter((i) => i.id !== id),
    trainings: db.trainings.filter((t) => t.institutionId !== id),
  })
}

export async function saveTraining(t: Omit<Training, 'id'> & { id?: string }) {
  await wait()
  requireAdmin()
  if (t.skillIds.length === 0) throw new ApiError('Pilih minimal satu skill yang diajarkan.')
  commit({ trainings: upsert(db.trainings, { ...t, id: t.id ?? newId('tr') }) })
}

export async function deleteTraining(id: string) {
  await wait()
  requireAdmin()
  commit({ trainings: db.trainings.filter((t) => t.id !== id) })
}

export async function setPostingHidden(id: string, hidden: boolean) {
  requireAdmin()
  commit({ postings: db.postings.map((p: JobPosting) => (p.id === id ? { ...p, hidden } : p)) })
}

/** CSV import: rows already validated and resolved to full records by the admin page. */
export async function importRows<K extends 'skills' | 'jobs' | 'institutions' | 'trainings'>(
  collection: K,
  rows: Db[K],
) {
  await wait()
  requireAdmin()
  let list = db[collection] as { id: string }[]
  for (const r of rows as { id: string }[]) list = upsert(list, r)
  commit({ [collection]: list } as Partial<Db>)
}

export { newId }
