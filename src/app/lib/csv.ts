// RFC 4180-style CSV: quoted fields may hold commas, newlines and "" escapes. Accepts CRLF and a BOM
// (Excel and Google Sheets exports). Blank lines are skipped.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  const src = text.replace(/^﻿/, '')

  const endRow = () => {
    row.push(field)
    if (row.length > 1 || row[0].trim() !== '') rows.push(row)
    row = []
    field = ''
  }

  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n') endRow()
    else if (c !== '\r') field += c
  }
  if (field !== '' || row.length > 0) endRow()
  return rows
}

/** First row is the header; returns one record per data row keyed by lowercase header. */
export function csvRecords(text: string): { headers: string[]; records: Record<string, string>[] } {
  const [head = [], ...body] = parseCsv(text)
  const headers = head.map((h) => h.trim().toLowerCase())
  const records = body.map((cells) => Object.fromEntries(headers.map((h, i) => [h, (cells[i] ?? '').trim()])))
  return { headers, records }
}

export function toCsv(rows: string[][]): string {
  return rows
    .map((r) => r.map((v) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)).join(','))
    .join('\r\n')
}
