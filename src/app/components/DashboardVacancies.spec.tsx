import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { DashboardVacancies } from './DashboardVacancies'
import { fetchVacanciesPage, type Vacancy } from '@/app/lib/api'

const state = vi.hoisted(() => ({ user: { id: 'user-a' } }))
vi.mock('@/app/lib/api', () => ({
  useCurrentUser: () => state.user,
  fetchVacanciesPage: vi.fn(),
}))
afterEach(() => { cleanup(); vi.resetAllMocks() })

function show() {
  return render(<MemoryRouter><DashboardVacancies occupationId="it-support" occupationName="IT Support" /></MemoryRouter>)
}

it('loads live vacancies for the focus occupation and keeps that filter in the list link', async () => {
  vi.mocked(fetchVacanciesPage).mockResolvedValue({
    items: [{ id: 'vacancy-a', title: 'Application Support', company: 'Example', city: 'Jakarta', region: '', country: 'ID', applyUrl: 'https://example.com/apply' } as Vacancy],
    total: 46, offset: 0, limit: 3,
  })
  show()
  await screen.findByText('Application Support')
  expect(fetchVacanciesPage).toHaveBeenCalledWith({ occupation: 'it-support', limit: 3 }, expect.any(AbortSignal))
  expect(screen.getByRole('link', { name: 'Lihat semua' }).getAttribute('href')).toBe('/lowongan?occupation=it-support')
  expect(screen.getByRole('link', { name: /Lihat lowongan/ }).getAttribute('href')).toBe('https://example.com/apply')
  expect(screen.queryByText('Belum ada lowongan untuk pekerjaan ini.')).toBeNull()
})

it('shows an empty state only after a successful empty response', async () => {
  vi.mocked(fetchVacanciesPage).mockResolvedValue({ items: [], total: 0, offset: 0, limit: 3 })
  show()
  expect(screen.getByRole('status').textContent).toBe('Memuat lowongan...')
  await screen.findByText('Belum ada lowongan untuk pekerjaan ini.')
})

it('shows request failures and lets the user retry instead of claiming there are no vacancies', async () => {
  vi.mocked(fetchVacanciesPage).mockRejectedValueOnce(new Error('Koneksi gagal')).mockResolvedValueOnce({ items: [], total: 0, offset: 0, limit: 3 })
  show()
  await screen.findByRole('alert')
  expect(screen.queryByText('Belum ada lowongan untuk pekerjaan ini.')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Coba lagi' }))
  await screen.findByText('Belum ada lowongan untuk pekerjaan ini.')
  expect(fetchVacanciesPage).toHaveBeenCalledTimes(2)
})
