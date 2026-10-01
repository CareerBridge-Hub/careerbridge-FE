// Run with: npm test  (node --test, Node ≥22.18 strips the types itself)
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { csvRecords, parseCsv, toCsv } from './csv.ts'
import { JOBS, SAMPLE_CV, SKILLS, TRAININGS, seed } from '../data/seed.ts'
import { buildSkillIndex, explainGap, matchJob, matchesFilter, normalizeKey, normalizeSkills, rankJobs, rankTrainings, skillDemand, skillNameConflicts } from './matching.ts'
import type { Institution, JobRole, Skill, Training } from './types.ts'

const skill = (id: string, alias: string[] = []): Skill => ({ id, nama: id.toUpperCase(), kategori: 'x', alias })

// The worked example from the plan: 5 wajib + 4 opsional = 14 points; user has 3 wajib + 2 opsional = 8.
const analyst: JobRole = {
  id: 'da',
  nama: 'Data Analyst',
  kodeKbji: '2511',
  bidang: 'TI',
  deskripsi: '',
  skills: [
    ...['w1', 'w2', 'w3', 'w4', 'w5'].map((skillId) => ({ skillId, tipe: 'wajib' as const })),
    ...['o1', 'o2', 'o3', 'o4'].map((skillId) => ({ skillId, tipe: 'opsional' as const })),
  ],
}

test('score matches the documented example (8 / 14 = 57%)', () => {
  const m = matchJob(analyst, ['w1', 'w2', 'w3', 'o1', 'o2', 'not-in-job'])
  assert.equal(m.total, 14)
  assert.equal(m.earned, 8)
  assert.equal(m.score, 57)
  assert.deepEqual(m.missingWajib.map((s) => s.skillId), ['w4', 'w5'])
  assert.deepEqual(m.missingOpsional.map((s) => s.skillId), ['o3', 'o4'])
  assert.equal(m.owned.length, 5)
})

test('score edges: nothing, everything, empty job', () => {
  assert.equal(matchJob(analyst, []).score, 0)
  assert.equal(matchJob(analyst, analyst.skills.map((s) => s.skillId)).score, 100)
  assert.equal(matchJob({ ...analyst, skills: [] }, ['w1']).score, 0)
})

test('rankJobs sorts by score, then name', () => {
  const b = { ...analyst, id: 'b', nama: 'B', skills: [{ skillId: 'w1', tipe: 'wajib' as const }] }
  const a = { ...b, id: 'a', nama: 'A' }
  assert.deepEqual(rankJobs([analyst, b, a], ['w1']).map((m) => m.job.id), ['a', 'b', 'da'])
})

test('aliases normalize to one skill; unknown terms are kept', () => {
  const skills = [skill('javascript', ['JS', 'Javascript']), skill('excel', ['Ms. Excel', 'Microsoft Excel']), skill('c++')]
  const r = normalizeSkills(['JS', 'JavaScript', ' javascript ', 'ms excel', 'MS-EXCEL', 'C++', 'Menjahit', 'menjahit', ''], skills)
  assert.deepEqual(r.matched, [
    { raw: 'JS', skillId: 'javascript' },
    { raw: 'ms excel', skillId: 'excel' },
    { raw: 'C++', skillId: 'c++' },
  ])
  assert.deepEqual(r.unknown, ['Menjahit'])
})

const t = (id: string, skillIds: string[], biaya = 0, moda: Training['moda'] = 'luring'): Training => ({
  id,
  institutionId: 'i',
  nama: id,
  biaya,
  moda,
  durasi: '',
  urlDaftar: '',
  skillIds,
})

test('trainings covering the most wajib skills come first, free before paid', () => {
  const ranked = rankTrainings(
    [t('opsOnly', ['o1', 'o2', 'o3']), t('paid2', ['w1', 'w2'], 500_000), t('free2', ['w1', 'w2']), t('one', ['w1', 'o1']), t('none', ['zz'])],
    ['w1', 'w2'],
    ['o1', 'o2', 'o3'],
  )
  assert.deepEqual(ranked.map((r) => r.training.id), ['free2', 'paid2', 'one', 'opsOnly'])
})

test('filters: price, mode, and province (online ignores province)', () => {
  const jabar: Institution = { id: 'i', nama: 'BLK', jenis: 'BLK', provinsi: 'Jawa Barat', kota: 'Bekasi', website: '' }
  const all = { biaya: 'semua', moda: 'semua', provinsi: '' } as const
  assert.ok(matchesFilter(t('a', [], 0), jabar, { ...all, biaya: 'gratis' }))
  assert.ok(!matchesFilter(t('a', [], 1), jabar, { ...all, biaya: 'gratis' }))
  assert.ok(!matchesFilter(t('a', [], 0), jabar, { ...all, biaya: 'berbayar' }))
  assert.ok(!matchesFilter(t('a', [], 0, 'daring'), jabar, { ...all, moda: 'luring' }))
  assert.ok(!matchesFilter(t('a', [], 0, 'luring'), jabar, { ...all, provinsi: 'Banten' }))
  assert.ok(matchesFilter(t('a', [], 0, 'daring'), jabar, { ...all, provinsi: 'Banten' }))
  assert.ok(matchesFilter(t('a', [], 0, 'luring'), jabar, { ...all, provinsi: 'Jawa Barat' }))
})

test('explanation only names skills from the job and quotes the real numbers', () => {
  const skills = [...analyst.skills.map((s) => skill(s.skillId)), skill('unrelated')]
  const m = matchJob(analyst, ['w1', 'w2', 'w3', 'o1', 'o2'])
  const text = explainGap(m, new Map(skills.map((s) => [s.id, s])), skillDemand([analyst]), [t('x', ['w4'])])
  assert.match(text, /57% \(8 dari 14 poin\)/)
  assert.match(text, /W4 dan W5/)
  assert.match(text, /naik menjadi 86%/) // (8 + 4) / 14
  assert.doesNotMatch(text, /UNRELATED/)
  // W4 has a training and W5 has none, and neither is needed elsewhere: the reason must be the trainings.
  assert.match(text, /Mulai dari W4, karena pilihan pelatihannya paling banyak\./)
})

test('csv: quotes, escaped quotes, newlines in fields, CRLF, BOM, blank lines', () => {
  const text = '﻿nama,alias\r\n"Excel, lanjutan","a ""b""|c"\r\n\r\nGit,"x\ny"\n'
  assert.deepEqual(parseCsv(text), [
    ['nama', 'alias'],
    ['Excel, lanjutan', 'a "b"|c'],
    ['Git', 'x\ny'],
  ])
  const { headers, records } = csvRecords('Nama , Jenis\nBLK Bekasi,BLK\nKosong')
  assert.deepEqual(headers, ['nama', 'jenis'])
  assert.deepEqual(records, [
    { nama: 'BLK Bekasi', jenis: 'BLK' },
    { nama: 'Kosong', jenis: '' },
  ])
  const rows = [['a,b', 'say "hi"', 'plain']]
  assert.deepEqual(parseCsv(toCsv(rows)), rows)
})

// Seed integrity: the demo must be internally consistent before anyone looks at a screen.

test('seed: every referenced skill exists, ids are unique, no alias claimed twice', () => {
  const ids = new Set(SKILLS.map((s) => s.id))
  assert.equal(ids.size, SKILLS.length)
  for (const j of JOBS) for (const s of j.skills) assert.ok(ids.has(s.skillId), `${j.id}: ${s.skillId}`)
  for (const t of TRAININGS) for (const s of t.skillIds) assert.ok(ids.has(s), `${t.nama}: ${s}`)
  const owner = new Map<string, string>()
  for (const s of SKILLS)
    for (const name of [s.nama, ...s.alias]) {
      const k = normalizeKey(name)
      assert.ok(!owner.has(k) || owner.get(k) === s.id, `"${name}" used by ${owner.get(k)} and ${s.id}`)
      owner.set(k, s.id)
    }
  assert.equal(buildSkillIndex(SKILLS).size, owner.size)
})

test('seed: every wajib skill has at least one training', () => {
  for (const j of JOBS)
    for (const s of j.skills.filter((x) => x.tipe === 'wajib'))
      assert.ok(TRAININGS.some((t) => t.skillIds.includes(s.skillId)), `${j.nama}: ${s.skillId}`)
})

test('seed: demo CV normalizes to the demo user skills; Operator Produksi = 78% like the landing card', () => {
  const db = seed()
  const rina = db.users.find((u) => u.id === 'u-demo')!
  const parsed = normalizeSkills(SAMPLE_CV.skills, SKILLS)
  assert.deepEqual(parsed.matched.map((m) => m.skillId).sort(), rina.skills.map((s) => s.skillId).sort())
  assert.deepEqual(parsed.unknown, ['Mengemudi motor'])
  const op = matchJob(db.jobs.find((j) => j.id === 'operator-produksi')!, rina.skills.map((s) => s.skillId))
  assert.equal(op.score, 78)
  assert.deepEqual(op.missingWajib.map((s) => s.skillId), ['k3-dasar', 'operasi-forklift'])
  assert.ok(rina.cv!.size <= 2 * 1024 * 1024)
})

test('admin: a skill may not reuse another skill name or alias, but may keep its own', () => {
  const skills = [skill('javascript', ['JS']), skill('excel', ['Ms Excel'])]
  assert.deepEqual(skillNameConflicts({ nama: 'TypeScript', alias: ['ts', 'js'] }, skills), ['js'])
  assert.deepEqual(skillNameConflicts({ nama: 'ms-excel', alias: [] }, skills), ['ms-excel'])
  assert.deepEqual(skillNameConflicts({ id: 'javascript', nama: 'JavaScript', alias: ['JS', 'ECMAScript'] }, skills), [])
})
