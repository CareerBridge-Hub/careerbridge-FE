// Shapes mirror the planned tables (careerbridge-rencana-untuk-tim.md, lampiran) so the fake API in
// api.ts can be swapped for the real backend without touching pages.

export type SkillType = 'wajib' | 'opsional'

export type Skill = { id: string; nama: string; kategori: string; alias: string[] }

export type JobSkill = { skillId: string; tipe: SkillType }

export type JobRole = {
  id: string
  nama: string
  /** Null only for the user's own occupation inferred from their CV. */
  kodeKbji: string | null
  bidang: string
  deskripsi: string
  skills: JobSkill[]
  /** True when inferred from the user's CV; only that user can see it. */
  custom?: boolean
}

/** AI occupation suggestion for one processed CV, validated by the server. */
export type OccupationSuggestion =
  | { kind: 'catalog'; occupationId: string; nama: string; evidence: string[] }
  | { kind: 'custom'; nama: string; bidang: string; deskripsi: string; baseOccupationId: string | null; wajib: string[]; opsional: string[]; evidence: string[] }

export type InstitutionType = 'LPK' | 'BLK' | 'Platform'

export type Institution = {
  id: string
  nama: string
  jenis: InstitutionType
  provinsi: string
  kota: string
  website: string
}

export type Moda = 'daring' | 'luring'

export type Training = {
  sample?: boolean
  id: string
  institutionId: string
  nama: string
  /** Rupiah; 0 means free. */
  biaya: number | null
  moda: Moda | null
  durasi: string
  urlDaftar: string
  skillIds: string[]
}

export type JobPosting = {
  id: string
  jobRoleId: string
  judul: string
  perusahaan: string
  lokasi: string
  url: string
  sumber: string
  status?: 'active' | 'closed'
  validUntil?: string | null
  lastSeenAt?: string
  /** ISO date. */
  tanggal: string
  hidden: boolean
}

export type UserSkill = { skillId: string; sumber: 'cv' | 'cv_alias' | 'cv_semantik' | 'manual' }

export type Experience = { posisi: string; tempat: string; periode: string }

export type CvUpload = {
  id?: string
  fileName: string
  size: number
  uploadedAt: string
  pendidikan: string[]
  pengalaman: Experience[]
}

export type User = {
  id: string
  nama: string
  email: string
  pendidikan: string
  jurusan: string
  provinsi: string
  kota: string
  role: 'user' | 'admin'
  createdAt: string
  skills: UserSkill[]
  customSkills: string[]
  targetJobId: string | null
  cv: CvUpload | null
}

export type Db = {
  users: User[]
  skills: Skill[]
  jobs: JobRole[]
  institutions: Institution[]
  trainings: Training[]
  postings: JobPosting[]
}
