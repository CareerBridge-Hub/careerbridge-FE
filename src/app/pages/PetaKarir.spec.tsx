import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router'
import PetaKarir from './PetaKarir'

const mocks = vi.hoisted(() => ({ page: vi.fn(), analysis: vi.fn(), career: vi.fn() }))
vi.mock('@/app/lib/api', () => ({ setTarget: vi.fn(), fetchMatchesPage: vi.fn(), fetchVacanciesPage: vi.fn() }))
vi.mock('@/app/lib/hooks', () => ({ useServerPage: mocks.page, useAnalysis: mocks.analysis, useCareer: mocks.career }))

const skill = (id: string, nama: string) => [id, { id, nama, kategori: 'Lab', alias: [] }] as const
const job = (id: string, nama: string, bidang: string, missingWajib: string[], score: number) => ({
  job: { id, nama, bidang, kodeKbji: '1', deskripsi: `Deskripsi ${nama}`, skills: [] },
  score, earned: 4, total: 4 + missingWajib.length * 2,
  owned: [{ skillId: 'hplc', tipe: 'wajib' }, { skillId: 'excel', tipe: 'wajib' }],
  missingWajib: missingWajib.map((skillId) => ({ skillId, tipe: 'wajib' })), missingOpsional: [],
})
const matches = [job('aa', 'Asisten Apoteker', 'Kesehatan', [], 92), job('alm', 'Analis Laboratorium Medis', 'Kesehatan', ['mutu'], 74), job('qc', 'Staf Quality Control', 'Manufaktur', ['mutu', 'iso', 'gmp'], 50)]

beforeEach(() => {
  // jsdom has no matchMedia; Score asks it for reduced motion.
  window.matchMedia = ((query: string) => ({ matches: true, media: query, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia
  mocks.career.mockReturnValue({
    user: { skills: [{ skillId: 'hplc', sumber: 'cv' }], targetJobId: null },
    skillsById: new Map([skill('hplc', 'HPLC'), skill('excel', 'Microsoft Excel'), skill('mutu', 'Pemantapan Mutu Laboratorium'), skill('iso', 'ISO 17025'), skill('gmp', 'CPOB')]),
    instById: new Map([['inst', { id: 'inst', nama: 'BLK Depok', kota: 'Depok' }]]),
  })
  mocks.page.mockImplementation((_loader: unknown, query: Record<string, unknown>) =>
    'occupation' in query
      ? { loading: false, error: '', retry: vi.fn(), data: { total: 7, items: [{ id: 'v1', title: 'Analis Lab', company: 'Klinik', city: 'Bogor', applyUrl: 'https://example.test/v1' }] } }
      : { loading: false, error: '', retry: vi.fn(), data: { total: 3, items: matches } })
  mocks.analysis.mockReturnValue({
    loading: false, error: '', progress: 2, retry: vi.fn(),
    data: { explanation: 'Paragraf alasan.\n\nParagraf gap.', fallback: false, prioritySkillIds: ['mutu'],
      trainings: [{ training: { id: 't1', institutionId: 'inst', nama: 'QC Laboratorium Klinik', biaya: 0, moda: 'daring', durasi: '2 minggu', urlDaftar: '', skillIds: ['mutu'] }, coversWajib: ['mutu'], coversOpsional: [] }] },
  })
})
afterEach(cleanup)

it('maps every match, opens the nearest job and shows its AI-ordered route', () => {
  render(<BrowserRouter><PetaKarir /></BrowserRouter>)
  expect(screen.getAllByRole('button', { pressed: false }).some((b) => b.getAttribute('aria-label')?.startsWith('Asisten Apoteker, Kesehatan, 92% cocok, Siap sekarang'))).toBe(true)
  expect(screen.getByRole('heading', { level: 2, name: 'Analis Laboratorium Medis' })).toBeTruthy()
  expect(screen.getByText('Paragraf alasan.')).toBeTruthy()
  expect(screen.getByText('QC Laboratorium Klinik')).toBeTruthy()
  expect(screen.getByText('BLK Depok, daring, Gratis, 2 minggu')).toBeTruthy()
  expect(screen.getByText('7 lowongan aktif untuk pekerjaan ini.')).toBeTruthy()
  // shared gap across two jobs is surfaced in the summary
  expect(screen.getByText('Satu skill, beberapa pintu')).toBeTruthy()
})

it('switches the detail when another job is picked', () => {
  render(<BrowserRouter><PetaKarir /></BrowserRouter>)
  fireEvent.click(screen.getAllByRole('button', { name: /^Staf Quality Control/ })[0])
  expect(screen.getByRole('heading', { level: 2, name: 'Staf Quality Control' })).toBeTruthy()
  expect(mocks.analysis).toHaveBeenLastCalledWith('qc')
})

it('asks for skills before drawing a map', () => {
  mocks.career.mockReturnValue({ user: { skills: [], targetJobId: null }, skillsById: new Map(), instById: new Map() })
  render(<BrowserRouter><PetaKarir /></BrowserRouter>)
  expect(screen.getByText('Peta karir butuh skill-mu dulu')).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Upload CV' }).getAttribute('href')).toBe('/cv')
})
