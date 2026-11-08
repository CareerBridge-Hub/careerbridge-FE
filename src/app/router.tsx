import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router'
import { AppLayout } from './components/AppLayout'
import { AppShellSkeleton, LoadingNote, PageSkeleton } from './components/common'
import { useCurrentUser, useApiStatus, refresh, logout, loadAdminCatalog } from './lib/api'
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

/** `shell` marks the outer gate: AppLayout is not mounted yet, so it draws the layout frame itself. */
function RequireAuth({ role, shell, children }: { role?: 'user' | 'admin'; shell?: boolean; children: ReactNode }) {
  const user = useCurrentUser()
  const state = useApiStatus()
  const location = useLocation()
  if (state.loading) return shell ? <AppShellSkeleton /> : <PageSkeleton />
  if (state.error) return <div role="alert" className="p-8">{state.error}<button className="ml-4 underline" onClick={() => void refresh().catch(() => {})}>Coba lagi</button><button className="ml-4 underline" onClick={() => void logout().catch(() => {})}>Masuk ulang</button></div>
  if (!user) return <Navigate to="/masuk" replace state={{ from: location.pathname + location.search }} />
  if (role && user.role !== role) return <Navigate to={user.role === 'admin' ? '/admin/skill' : '/'} replace />
  return children
}

function GuestOnly({ children }: { children: ReactNode }) {
  const user = useCurrentUser()
  const state = useApiStatus()
  if (state.loading) return <div className="grid min-h-dvh place-items-center"><LoadingNote>Memeriksa sesi...</LoadingNote></div>
  if (user) return <Navigate to={user.role === 'admin' ? '/admin/skill' : '/'} replace />
  return children
}

function AdminCatalogGate({children}:{children:ReactNode}) {
  const user=useCurrentUser()
  const [state,setState]=useState({owner:user?.id,loading:true,error:''})
  const [attempt,retry]=useState(0)
  useEffect(()=>{
    let active=true
    loadAdminCatalog(attempt>0).then(()=>{if(active)setState({owner:user?.id,loading:false,error:''})})
      .catch((error)=>{if(active)setState({owner:user?.id,loading:false,error:error.message})})
    return()=>{active=false}
  },[user?.id,attempt])
  if(state.owner!==user?.id || state.loading)return <PageSkeleton />
  if(state.error)return <div role="alert">{state.error} <button className="underline" onClick={()=>{setState({owner:user?.id,loading:true,error:''});retry((n)=>n+1)}}>Coba lagi</button></div>
  return children
}
const adminPage=(el:ReactNode)=><RequireAuth role="admin"><AdminCatalogGate>{page(el)}</AdminCatalogGate></RequireAuth>

const page = (el: ReactNode) => <Suspense fallback={<PageSkeleton />}>{el}</Suspense>

export function AppRoutes() {
  return (
    <Routes>
      <Route path="masuk" element={<GuestOnly><Masuk /></GuestOnly>} />
      <Route path="daftar" element={<GuestOnly><Daftar /></GuestOnly>} />

      <Route element={<RequireAuth shell><AppLayout /></RequireAuth>}>
        <Route index element={<RequireAuth role="user">{page(<Beranda />)}</RequireAuth>} />
        <Route path="cv" element={<RequireAuth role="user">{page(<Cv />)}</RequireAuth>} />
        <Route path="pekerjaan" element={<RequireAuth role="user">{page(<Pekerjaan />)}</RequireAuth>} />
        <Route path="pekerjaan/:id" element={<RequireAuth role="user">{page(<PekerjaanDetail />)}</RequireAuth>} />
        <Route path="pelatihan" element={<RequireAuth role="user">{page(<Pelatihan />)}</RequireAuth>} />
        <Route path="lowongan" element={<RequireAuth role="user">{page(<Lowongan />)}</RequireAuth>} />
        <Route path="profil" element={page(<Profil />)} />


        <Route path="admin" element={<RequireAuth role="admin"><Navigate to="/admin/skill" replace /></RequireAuth>} />
        <Route path="admin/skill" element={adminPage(<AdminSkill />)} />
        <Route path="admin/pekerjaan" element={adminPage(<AdminPekerjaan />)} />
        <Route path="admin/pelatihan" element={adminPage(<AdminPelatihan />)} />
        <Route path="admin/lowongan" element={adminPage(<AdminLowongan />)} />
        <Route path="*" element={page(<NotFound />)} />
      </Route>
    </Routes>
  )
}
