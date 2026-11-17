import { expect, it } from 'vitest'
import { R_IN, R_OUT, captionBox, defaultSelection, insights, layoutOrbit, nodeBox, planCost, planSteps, projectedScore, radiusOf, ringScores } from './careerMap'
import type { JobMatch, RankedTraining } from './matching'
import type { JobSkill, Training } from './types'

const w = (skillId: string): JobSkill => ({ skillId, tipe: 'wajib' })
const o = (skillId: string): JobSkill => ({ skillId, tipe: 'opsional' })
function match(id: string, bidang: string, owned: JobSkill[], missingWajib: JobSkill[], missingOpsional: JobSkill[] = []): JobMatch {
  const pts = (l: JobSkill[]) => l.reduce((n, s) => n + (s.tipe === 'wajib' ? 2 : 1), 0)
  const earned = pts(owned)
  const total = earned + pts(missingWajib) + pts(missingOpsional)
  return { job: { id, nama: `Job ${id}`, kodeKbji: null, bidang, deskripsi: '', skills: [...owned, ...missingWajib, ...missingOpsional] }, score: Math.round((earned / total) * 100), earned, total, owned, missingWajib, missingOpsional }
}
const training = (id: string, biaya: number | null, wajib: string[], ops: string[] = []): RankedTraining => ({
  training: { id, institutionId: 'i', nama: id, biaya, moda: 'daring', durasi: '', urlDaftar: '', skillIds: [...wajib, ...ops] } as Training,
  coversWajib: wajib,
  coversOpsional: ops,
})

const siap = match('a', 'Kesehatan', [w('hplc'), w('resep')], [])
const dekat = match('b', 'Kesehatan', [w('hplc')], [w('mutu'), w('darah')], [o('excel')])
const jauh = match('c', 'Data', [w('excel')], [w('sql'), w('viz'), w('mutu')])

it('places the highest percentage on the inner ring and the lowest on the outer', () => {
  expect(radiusOf(31, 13, 31)).toBe(R_IN)
  expect(radiusOf(13, 13, 31)).toBe(R_OUT)
  expect(radiusOf(25, 13, 31)).toBeGreaterThan(R_IN)
  expect(radiusOf(25, 13, 31)).toBeLessThan(R_OUT)
  expect(radiusOf(40, 40, 40)).toBe((R_IN + R_OUT) / 2)
  expect(ringScores(13, 31)).toEqual([31, 22, 13])
  expect(ringScores(40, 40)).toEqual([40])
})

// The ten jobs from a real low-match profile: mostly far, long names, ten different fields.
const named = (id: string, nama: string, bidang: string, missing: number) =>
  ({ ...match(id, bidang, [w('k3')], Array.from({ length: missing }, (_, i) => w(`${id}${i}`))), job: { ...match(id, bidang, [], []).job, nama } })
const crowdJobs = [
  named('1', 'HSE Officer', 'Manufaktur', 2), named('2', 'Staf PPIC', 'Manufaktur', 3), named('3', 'Staf Akuntansi', 'Administrasi Perkantoran', 3),
  named('4', 'Customer Service', 'Administrasi Perkantoran', 3), named('5', 'Data Analyst', 'Teknologi Informasi', 3), named('6', 'Apoteker', 'Kesehatan', 3),
  named('7', 'Auditor', 'Keuangan dan Perbankan', 3), named('8', 'Housekeeping', 'Perhotelan dan Kuliner', 3), named('9', 'Pramusaji', 'Perhotelan dan Kuliner', 3),
  named('10', 'Kepala Toko', 'Penjualan dan Ritel', 3),
]

// The ten jobs from the reported screenshot: scores 13–31%, several ties at 25%.
const scored = (id: string, nama: string, bidang: string, score: number) => ({ ...named(id, nama, bidang, 3), score })
const screenshot = [
  scored('s1', 'Apoteker', 'Kesehatan', 13), scored('s2', 'Customer Service', 'Administrasi Perkantoran', 31),
  scored('s3', 'Staf Administrasi', 'Administrasi Perkantoran', 20), scored('s4', 'Petugas Kebersihan', 'Layanan Umum', 14),
  scored('s5', 'Data Analyst', 'Teknologi Informasi', 14), scored('s6', 'IT Support', 'Teknologi Informasi', 15),
  scored('s7', 'Kepala Toko', 'Penjualan dan Ritel', 25), scored('s8', 'Telemarketing', 'Penjualan dan Ritel', 25),
  scored('s9', 'Staf Penagihan', 'Keuangan dan Perbankan', 25), scored('s10', 'Resepsionis', 'Perhotelan dan Kuliner', 25),
]

it.each([
  ['crowd', 520, false], ['crowd', 460, false], ['crowd', 300, true],
  ['screenshot', 520, false], ['screenshot', 460, false], ['screenshot', 300, true],
] as const)('places %s nodes on a %ipx orbit without overlap and inside the box', (set, size, compact) => {
  const crowd = set === 'crowd' ? crowdJobs : screenshot
  const { nodes, captions } = layoutOrbit(crowd, size, compact)
  const box = (i: number) => {
    const b = nodeBox(nodes[i].match, compact)
    return { ...b, x: (nodes[i].x / 100) * size, y: (nodes[i].y / 100) * size }
  }
  expect(captions.map((c) => c.score)).toEqual(ringScores(Math.min(...crowd.map((m) => m.score)), Math.max(...crowd.map((m) => m.score))))
  for (let i = 0; i < nodes.length; i++) {
    const a = box(i)
    for (const c of captions) {
      const b = { ...captionBox(c.score), x: (c.x / 100) * size, y: (c.y / 100) * size }
      const apart = Math.abs(a.x - b.x) >= (a.w + b.w) / 2 || Math.abs(a.y - b.y) >= (a.h + b.h) / 2
      expect(apart, `${nodes[i].match.job.nama} covers the ${c.score}% caption`).toBe(true)
    }
    expect(a.x - a.w / 2).toBeGreaterThanOrEqual(-0.01)
    expect(a.x + a.w / 2).toBeLessThanOrEqual(size + 0.01)
    expect(a.y - a.h / 2).toBeGreaterThanOrEqual(-0.01)
    expect(a.y + a.h / 2).toBeLessThanOrEqual(size + 0.01)
    for (let j = i + 1; j < nodes.length; j++) {
      const b = box(j)
      const apart = Math.abs(a.x - b.x) >= (a.w + b.w) / 2 || Math.abs(a.y - b.y) >= (a.h + b.h) / 2
      expect(apart, `${nodes[i].match.job.nama} overlaps ${nodes[j].match.job.nama}`).toBe(true)
    }
  }
})

it('groups a field side by side and puts higher percentages nearer the centre', () => {
  const { nodes } = layoutOrbit([siap, jauh, dekat])
  expect(nodes.map((n) => n.match.job.id)).toEqual(['a', 'b', 'c']) // Kesehatan pair first, then Data
  const dist = (id: string) => { const n = nodes.find((x) => x.match.job.id === id)!; return Math.hypot(n.x - 50, n.y - 50) }
  expect(dist('a')).toBeLessThan(dist('b'))
  expect(dist('b')).toBeLessThan(dist('c'))
  expect(layoutOrbit([]).nodes).toEqual([])
})

it('orders distance by percentage, not by missing required skills', () => {
  // Reported case: Kepala Toko has no required gap but 25%; Customer Service has gaps but 31%.
  const kepalaToko = { ...match('kt', 'Penjualan dan Ritel', [w('a')], []), score: 25 }
  const cs = { ...match('cs', 'Administrasi Perkantoran', [w('a')], [w('b'), w('c')]), score: 31 }
  const apoteker = { ...match('ap', 'Kesehatan', [w('a')], [w('d'), w('e'), w('f')]), score: 13 }
  const { nodes } = layoutOrbit([kepalaToko, cs, apoteker])
  const dist = (id: string) => { const n = nodes.find((x) => x.match.job.id === id)!; return Math.hypot(n.x - 50, n.y - 50) }
  expect(dist('cs')).toBeLessThan(dist('kt'))
  expect(dist('kt')).toBeLessThan(dist('ap'))
  expect(defaultSelection([kepalaToko, cs, apoteker], null)).toBe('cs')
})

it('selects target first, then the highest percentage', () => {
  expect(defaultSelection([siap, dekat, jauh], 'c')).toBe('c')
  expect(defaultSelection([jauh, dekat, siap], null)).toBe('a')
  expect(defaultSelection([siap, jauh], 'gone')).toBe('a')
  expect(defaultSelection([], null)).toBeNull()
})

it('finds the strongest owned skill and a gap shared by two jobs', () => {
  const r = insights([siap, dekat, jauh])
  expect(r.ready).toBe(1)
  expect(r.strongest).toEqual({ skillId: 'hplc', jobs: 2 })
  expect(r.sharedGap).toEqual({ skillId: 'mutu', jobNames: ['Job b', 'Job c'] })
  expect(insights([siap]).sharedGap).toBeNull()
})

it('orders steps by AI priority, appends forgotten required skills, ignores unknown ids', () => {
  const trainings = [training('t1', 0, ['mutu']), training('t2', 350000, ['darah'], ['excel'])]
  const steps = planSteps(dekat, ['excel', 'ghost', 'mutu'], trainings)
  expect(steps.map((s) => [s.skillId, s.required, s.training?.training.id ?? null])).toEqual([
    ['excel', false, 't2'],
    ['mutu', true, 't1'],
    ['darah', true, 't2'],
  ])
  expect(planCost(steps)).toBe(350000) // t2 counted once
  expect(planCost(planSteps(dekat, [], [training('t3', null, ['mutu'])]))).toBeNull()
  expect(planSteps(siap, [], trainings)).toEqual([])
})

it('projects the score once required skills are learned', () => {
  expect(projectedScore(dekat)).toBe(Math.round((6 / 7) * 100))
})
