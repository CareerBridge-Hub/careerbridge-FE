const rupiahFmt = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })
const relFmt = new Intl.RelativeTimeFormat('id', { numeric: 'auto' })
const dateFmt = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })

export const rupiah = (n: number) => (n === 0 ? 'Gratis' : rupiahFmt.format(n))

export const fileSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toLocaleString('id-ID', { maximumFractionDigits: 1 })} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`

/** Date-only strings ("2026-10-01") are local calendar days; `new Date()` would read them as UTC. */
const toDate = (iso: string) => new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00` : iso)

export const formatDate = (iso: string) => dateFmt.format(toDate(iso))

/** "hari ini", "kemarin", "3 hari yang lalu" — by calendar day, not 24h windows. */
export function relativeDay(isoDate: string, now = new Date()) {
  const d = toDate(isoDate)
  const days = Math.round(
    (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) /
      86_400_000,
  )
  return relFmt.format(days, 'day')
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')
