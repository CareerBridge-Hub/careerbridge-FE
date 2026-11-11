import { Link } from 'react-router'
import { ExternalLink } from 'lucide-react'
import { Button } from './ui/button'
import { fetchVacanciesPage } from '@/app/lib/api'
import { useServerPage } from '@/app/lib/hooks'

export function DashboardVacancies({ occupationId, occupationName }: { occupationId: string; occupationName: string }) {
  const result = useServerPage(fetchVacanciesPage, { occupation: occupationId, limit: 3 }, !!occupationId)
  return <section className="mt-8">
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="font-display text-lg">Lowongan terbaru · {occupationName}</h2>
      <Button asChild variant="link" className="h-auto shrink-0 px-0">
        <Link to={`/lowongan?occupation=${encodeURIComponent(occupationId)}`}>Lihat semua</Link>
      </Button>
    </div>
    {result.loading ? (
      <p role="status" className="text-sm text-muted-foreground">Memuat lowongan...</p>
    ) : result.error ? (
      <p role="alert" className="text-sm text-muted-foreground">{result.error} <button className="underline" onClick={result.retry}>Coba lagi</button></p>
    ) : result.data?.items.length ? (
      <div className="grid gap-2.5">
        {result.data.items.map((vacancy) => <article key={vacancy.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
          <div className="min-w-0">
            <h3 className="font-medium">{vacancy.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{vacancy.company} · {[vacancy.city, vacancy.region].filter(Boolean).join(', ') || vacancy.country}</p>
          </div>
          <Button asChild size="sm" variant="outline">
            <a href={vacancy.applyUrl} target="_blank" rel="noopener noreferrer">Lihat lowongan <ExternalLink /><span className="sr-only"> (buka di tab baru)</span></a>
          </Button>
        </article>)}
      </div>
    ) : (
      <p className="rounded-xl border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">Belum ada lowongan untuk pekerjaan ini.</p>
    )}
  </section>
}
