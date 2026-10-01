import { useState } from 'react'
import { toCsv } from './csv'
import { normalizeKey } from './matching'

export const PAGE_SIZE = 10

/** Text search + pagination over an in-memory list. Resets to page 1 when the query changes. */
export function useSearchPaged<T>(list: T[], text: (item: T) => string) {
  const [q, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const k = normalizeKey(q)
  const filtered = k ? list.filter((x) => normalizeKey(text(x)).includes(k)) : list
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, pages)
  return {
    q,
    setQ: (v: string) => {
      setQuery(v)
      setPage(1)
    },
    page: current,
    setPage,
    pages,
    total: filtered.length,
    rows: filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE),
  }
}

export function downloadCsv(fileName: string, rows: string[][]) {
  // BOM so Excel opens UTF-8 correctly.
  const url = URL.createObjectURL(new Blob(['﻿' + toCsv(rows)], { type: 'text/csv;charset=utf-8' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: fileName })
  a.click()
  URL.revokeObjectURL(url)
}

/** "a | b | c" → ["a", "b", "c"] */
export const splitList = (v: string | undefined) =>
  (v ?? '')
    .split('|')
    .map((x) => x.trim())
    .filter(Boolean)

export const isUrl = (v: string) => {
  try {
    return ['http:', 'https:'].includes(new URL(v).protocol)
  } catch {
    return false
  }
}
