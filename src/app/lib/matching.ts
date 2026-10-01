// Pure scoring logic (F2–F5). No React, no storage: tested directly by matching.test.ts.
// Imports stay relative with .ts extensions so `node --test` can run this file as-is.
import type { Institution, JobRole, JobSkill, Moda, Skill, Training } from './types.ts'

export const POINTS = { wajib: 2, opsional: 1 } as const

/** Lowercase, strip accents and punctuation (keeping + and # for C++/C#), collapse spaces. */
export function normalizeKey(raw: string): string {
  return raw
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9+#]+/g, ' ')
    .trim()
}

/** Map of normalized name/alias → skill id. The first skill to claim a key keeps it. */
export function buildSkillIndex(skills: Skill[]): Map<string, string> {
  const index = new Map<string, string>()
  for (const s of skills) {
    for (const name of [s.nama, ...s.alias]) {
      const key = normalizeKey(name)
      if (key && !index.has(key)) index.set(key, s.id)
    }
  }
  return index
}

export type NormalizedSkills = {
  /** One entry per distinct skill, with the first raw spelling that produced it. */
  matched: { raw: string; skillId: string }[]
  /** Raw terms that are not in the dictionary, deduplicated, in input order. */
  unknown: string[]
}

/** F2 step 4: "JS", "Javascript" and "JavaScript" all resolve to the same skill. */
export function normalizeSkills(raws: string[], skills: Skill[]): NormalizedSkills {
  const index = buildSkillIndex(skills)
  const matched: NormalizedSkills['matched'] = []
  const unknown: string[] = []
  const seenIds = new Set<string>()
  const seenUnknown = new Set<string>()
  for (const raw of raws) {
    const key = normalizeKey(raw)
    if (!key) continue
    const id = index.get(key)
    if (id) {
      if (!seenIds.has(id)) {
        seenIds.add(id)
        matched.push({ raw: raw.trim(), skillId: id })
      }
    } else if (!seenUnknown.has(key)) {
      seenUnknown.add(key)
      unknown.push(raw.trim())
    }
  }
  return { matched, unknown }
}

export type JobMatch = {
  job: JobRole
  /** Whole percent, 0–100. */
  score: number
  earned: number
  total: number
  owned: JobSkill[]
  missingWajib: JobSkill[]
  missingOpsional: JobSkill[]
}

/** F3: score = points of owned skills ÷ points of all job skills × 100 (wajib 2, opsional 1). */
export function matchJob(job: JobRole, userSkillIds: Iterable<string>): JobMatch {
  const have = new Set(userSkillIds)
  const owned: JobSkill[] = []
  const missingWajib: JobSkill[] = []
  const missingOpsional: JobSkill[] = []
  let earned = 0
  let total = 0
  for (const js of job.skills) {
    const pts = POINTS[js.tipe]
    total += pts
    if (have.has(js.skillId)) {
      earned += pts
      owned.push(js)
    } else if (js.tipe === 'wajib') missingWajib.push(js)
    else missingOpsional.push(js)
  }
  const score = total === 0 ? 0 : Math.round((earned / total) * 100)
  return { job, score, earned, total, owned, missingWajib, missingOpsional }
}

/** Highest score first; ties broken by name so the order is stable. */
export function rankJobs(jobs: JobRole[], userSkillIds: Iterable<string>): JobMatch[] {
  const ids = [...userSkillIds]
  return jobs
    .map((j) => matchJob(j, ids))
    .sort((a, b) => b.score - a.score || a.job.nama.localeCompare(b.job.nama, 'id'))
}

export type RankedTraining = {
  training: Training
  coversWajib: string[]
  coversOpsional: string[]
}

/**
 * F5: trainings that teach at least one missing skill. Most missing wajib skills covered first,
 * then most missing skills overall, then free before paid, then name.
 */
export function rankTrainings(
  trainings: Training[],
  missingWajib: string[],
  missingOpsional: string[],
): RankedTraining[] {
  const w = new Set(missingWajib)
  const o = new Set(missingOpsional)
  return trainings
    .map((t) => ({
      training: t,
      coversWajib: t.skillIds.filter((id) => w.has(id)),
      coversOpsional: t.skillIds.filter((id) => o.has(id)),
    }))
    .filter((r) => r.coversWajib.length + r.coversOpsional.length > 0)
    .sort(
      (a, b) =>
        b.coversWajib.length - a.coversWajib.length ||
        b.coversWajib.length + b.coversOpsional.length - (a.coversWajib.length + a.coversOpsional.length) ||
        Number(a.training.biaya > 0) - Number(b.training.biaya > 0) ||
        a.training.nama.localeCompare(b.training.nama, 'id'),
    )
}

export type TrainingFilter = {
  biaya: 'semua' | 'gratis' | 'berbayar'
  moda: 'semua' | Moda
  /** '' = all provinces. */
  provinsi: string
}

/** Online (daring) programs pass any province filter: they can be joined from anywhere. */
export function matchesFilter(t: Training, inst: Institution | undefined, f: TrainingFilter): boolean {
  if (f.biaya === 'gratis' && t.biaya > 0) return false
  if (f.biaya === 'berbayar' && t.biaya === 0) return false
  if (f.moda !== 'semua' && t.moda !== f.moda) return false
  if (f.provinsi && t.moda === 'luring' && inst?.provinsi !== f.provinsi) return false
  return true
}

/** How many job roles list each skill (wajib or opsional). Used to decide what to learn first. */
export function skillDemand(jobs: JobRole[]): Map<string, number> {
  const demand = new Map<string, number>()
  for (const j of jobs) for (const s of j.skills) demand.set(s.skillId, (demand.get(s.skillId) ?? 0) + 1)
  return demand
}

/**
 * F4 explanation, the dummy stand-in for the AI call. Built only from the match result and the
 * skill dictionary, so it cannot mention a skill that is not in the data.
 */
export function explainGap(
  m: JobMatch,
  skillsById: Map<string, Skill>,
  demand: Map<string, number>,
  trainings: Training[],
): string {
  const name = (id: string) => skillsById.get(id)?.nama ?? id
  const list = (ids: string[]) =>
    ids.length <= 1 ? ids.map(name).join('') : `${ids.slice(0, -1).map(name).join(', ')} dan ${name(ids.at(-1)!)}`
  const teaching = (id: string) => trainings.filter((t) => t.skillIds.includes(id))
  const others = (id: string) => Math.max(0, (demand.get(id) ?? 1) - 1)

  const wajib = m.missingWajib
    .map((s) => s.skillId)
    .sort((a, b) => others(b) - others(a) || teaching(b).length - teaching(a).length || name(a).localeCompare(name(b), 'id'))
  const opsional = m.missingOpsional.map((s) => s.skillId)
  const parts: string[] = []

  parts.push(
    `Skormu untuk ${m.job.nama} ${m.score}% (${m.earned} dari ${m.total} poin). Kamu sudah punya ${m.owned.length} dari ${m.job.skills.length} skill yang dibutuhkan.`,
  )

  if (wajib.length === 0) {
    parts.push(
      opsional.length === 0
        ? 'Semua skill wajib dan tambahan sudah kamu punya. Saatnya mulai melamar.'
        : `Semua skill wajib sudah lengkap. Untuk menaikkan skor, tambah skill tambahan seperti ${list(opsional.slice(0, 3))}.`,
    )
  } else {
    const [first, ...rest] = wajib
    const n = others(first)
    const t = teaching(first)
    const free = t.filter((x) => x.biaya === 0).length
    // Only give a reason the data actually supports: wider demand, or more trainings than the next one.
    const nextTeaching = rest.length ? teaching(rest[0]).length : 0
    const reason =
      n > 0
        ? `, karena skill ini juga dibutuhkan ${n} pekerjaan lain di sistem.`
        : rest.length > 0 && t.length > nextTeaching
          ? ', karena pilihan pelatihannya paling banyak.'
          : '.'
    parts.push(`Ada ${wajib.length} skill wajib yang belum kamu punya: ${list(wajib)}. Mulai dari ${name(first)}${reason}`)
    if (t.length > 0)
      parts.push(`Ada ${t.length} pelatihan yang mengajarkan ${name(first)}${free > 0 ? `, ${free} di antaranya gratis` : ''}.`)
    if (rest.length > 0) parts.push(`Setelah itu lanjutkan ke ${list(rest)}.`)
    const gain = wajib.length * POINTS.wajib
    parts.push(
      `Kalau semua skill wajib terpenuhi, skormu naik menjadi ${Math.round(((m.earned + gain) / m.total) * 100)}%.`,
    )
  }
  return parts.join(' ')
}

/**
 * Names in `candidate` (its name or aliases) that another skill already claims. A clash would make
 * normalization ambiguous, so the admin forms and CSV import reject it.
 */
export function skillNameConflicts(candidate: { id?: string; nama: string; alias: string[] }, skills: Skill[]): string[] {
  const index = buildSkillIndex(skills.filter((s) => s.id !== candidate.id))
  return [candidate.nama, ...candidate.alias].filter((n) => index.has(normalizeKey(n)))
}
