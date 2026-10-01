import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router'
import { AppLayout } from './components/AppLayout'
import { Skeleton } from './components/ui/skeleton'
import { useCurrentUser } from './lib/api'
import Daftar from './pages/Daftar'
import Masuk from './pages/Masuk'

// Dashboard pages load on demand so the login page stays small (charts and tables are heavy).
const Beranda = lazy(() => import('./pages/Beranda'))
const Cv = lazy(() => import('./pages/Cv'))
const Pekerjaan = lazy(() => import('./pages/Pekerjaan'))
const PekerjaanDetail = lazy(() => import('./pages/PekerjaanDetail'))
const Pelatihan = lazy(() => import('./pages/Pelatihan'))
const Lowongan = lazy(() => import('./pages/Lowongan'))
const Profil = lazy(() => import('./pages/Profil'))
const AdminSkill = lazy(() => import('./pages/admin/AdminSkill'))
const AdminPekerjaan = lazy(() => import('./pages/admin/AdminPekerjaan'))
const AdminPelatihan = lazy(() => import('./pages/admin/AdminPelatihan'))
const AdminLowongan = lazy(() => import('./pages/admin/AdminLowongan'))
const NotFound = lazy(() => import('./pages/NotFound'))

function PageSkeleton() {
  return (
    <div className="grid gap-4" aria-busy="true" aria-label="Memuat halaman">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-80 max-w-full" />
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )
}

function RequireAuth({ role, children }: { role?: 'user' | 'admin'; children: ReactNode }) {
  const user = useCurrentUser()
  const location = useLocation()
  if (!user) return <Navigate to="/masuk" replace state={{ from: location.pathname + location.search }} />
  if (role && user.role !== role) return <Navigate to={user.role === 'admin' ? '/admin/skill' : '/'} replace />
  return children
}

function GuestOnly({ children }: { children: ReactNode }) {
  const user = useCurrentUser()
  if (user) return <Navigate to={user.role === 'admin' ? '/admin/skill' : '/'} replace />
  return children
}

const page = (el: ReactNode) => <Suspense fallback={<PageSkeleton />}>{el}</Suspense>

export function AppRoutes() {
  return (
    <Routes>
      <Route path="masuk" element={<GuestOnly><Masuk /></GuestOnly>} />
      <Route path="daftar" element={<GuestOnly><Daftar /></GuestOnly>} />

      <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route index element={<RequireAuth role="user">{page(<Beranda />)}</RequireAuth>} />
        <Route path="cv" element={<RequireAuth role="user">{page(<Cv />)}</RequireAuth>} />
        <Route path="pekerjaan" element={<RequireAuth role="user">{page(<Pekerjaan />)}</RequireAuth>} />
        <Route path="pekerjaan/:id" element={<RequireAuth role="user">{page(<PekerjaanDetail />)}</RequireAuth>} />
        <Route path="pelatihan" element={<RequireAuth role="user">{page(<Pelatihan />)}</RequireAuth>} />
        <Route path="lowongan" element={<RequireAuth role="user">{page(<Lowongan />)}</RequireAuth>} />
        <Route path="profil" element={page(<Profil />)} />

        <Route path="admin" element={<Navigate to="/admin/skill" replace />} />
        <Route path="admin/skill" element={<RequireAuth role="admin">{page(<AdminSkill />)}</RequireAuth>} />
        <Route path="admin/pekerjaan" element={<RequireAuth role="admin">{page(<AdminPekerjaan />)}</RequireAuth>} />
        <Route path="admin/pelatihan" element={<RequireAuth role="admin">{page(<AdminPelatihan />)}</RequireAuth>} />
        <Route path="admin/lowongan" element={<RequireAuth role="admin">{page(<AdminLowongan />)}</RequireAuth>} />

        <Route path="*" element={page(<NotFound />)} />
      </Route>
    </Routes>
  )
}
