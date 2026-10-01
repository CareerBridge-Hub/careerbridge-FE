// Shapes mirror the planned tables (careerbridge-rencana-untuk-tim.md, lampiran) so the fake API in
// api.ts can be swapped for the real backend without touching pages.

export type SkillType = 'wajib' | 'opsional'

export type Skill = { id: string; nama: string; kategori: string; alias: string[] }

export type JobSkill = { skillId: string; tipe: SkillType }

export type JobRole = {
  id: string
  nama: string
  kodeKbji: string
  bidang: string
  deskripsi: string
  skills: JobSkill[]
}

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
  id: string
  institutionId: string
  nama: string
  /** Rupiah; 0 means free. */
  biaya: number
  moda: Moda
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
  sumber: 'Jooble' | 'JSearch'
  /** ISO date. */
  tanggal: string
  hidden: boolean
}

export type UserSkill = { skillId: string; sumber: 'cv' | 'manual' }

export type Experience = { posisi: string; tempat: string; periode: string }

export type CvUpload = {
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
  passwordHash: string
  pendidikan: string
  jurusan: string
  provinsi: string
  kota: string
  role: 'user' | 'admin'
  createdAt: string
  skills: UserSkill[]
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
