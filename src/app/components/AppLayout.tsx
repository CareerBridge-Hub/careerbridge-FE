import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { toast } from 'sonner'
import {
  BriefcaseBusiness,
  ChevronsUpDown,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Newspaper,
  RotateCcw,
  School,
  Tags,
  UserRound,
  Rss,
  type LucideIcon,
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu'
import { Separator } from '@/app/components/ui/separator'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@/app/components/ui/sidebar'
import { logout, resetDemo, useCurrentUser } from '@/app/lib/api'
import { initials } from '@/app/lib/format'
import { Logo } from './common'

type NavItem = { to: string; label: string; icon: LucideIcon; end?: boolean }

const USER_NAV: NavItem[] = [
  { to: '/', label: 'Beranda', icon: LayoutDashboard, end: true },
  { to: '/cv', label: 'CV & Skill', icon: FileText },
  { to: '/pekerjaan', label: 'Pekerjaan', icon: BriefcaseBusiness },
  { to: '/pelatihan', label: 'Pelatihan', icon: GraduationCap },
  { to: '/lowongan', label: 'Lowongan', icon: Newspaper },
]

const ADMIN_NAV: NavItem[] = [
  { to: '/admin/skill', label: 'Kamus skill', icon: Tags },
  { to: '/admin/pekerjaan', label: 'Pekerjaan', icon: BriefcaseBusiness },
  { to: '/admin/pelatihan', label: 'LPK & pelatihan', icon: School },
  { to: '/admin/lowongan', label: 'Lowongan', icon: Rss },
]

const TITLES: [RegExp, string][] = [
  [/^\/$/, 'Beranda'],
  [/^\/cv/, 'CV & Skill'],
  [/^\/pekerjaan\/./, 'Detail pekerjaan'],
  [/^\/pekerjaan/, 'Pekerjaan'],
  [/^\/pelatihan/, 'Pelatihan'],
  [/^\/lowongan/, 'Lowongan'],
  [/^\/profil/, 'Profil'],
  [/^\/admin\/skill/, 'Kamus skill'],
  [/^\/admin\/pekerjaan/, 'Pekerjaan'],
  [/^\/admin\/pelatihan/, 'LPK & pelatihan'],
  [/^\/admin\/lowongan/, 'Lowongan'],
]

function NavGroup({ label, items }: { label: string; items: NavItem[] }) {
  const { pathname } = useLocation()
  const { isMobile, setOpenMobile } = useSidebar()
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const active = item.end ? pathname === item.to : pathname.startsWith(item.to)
            return (
              <SidebarMenuItem key={item.to}>
                <SidebarMenuButton asChild isActive={active} tooltip={item.label} className="h-9 data-[active=true]:bg-primary data-[active=true]:text-white data-[active=true]:hover:bg-primary data-[active=true]:hover:text-white">
                  <NavLink to={item.to} end={item.end} onClick={() => isMobile && setOpenMobile(false)}>
                    <item.icon />
                    <span>{item.label}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

function UserMenu() {
  const user = useCurrentUser()!
  const navigate = useNavigate()
  const { isMobile, setOpenMobile } = useSidebar()
  const go = (to: string) => {
    if (isMobile) setOpenMobile(false)
    navigate(to)
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
          <Avatar className="size-8 rounded-lg">
            <AvatarFallback className="rounded-lg bg-mint-soft text-xs font-semibold text-mint-ink">{initials(user.nama)}</AvatarFallback>
          </Avatar>
          <span className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">{user.nama}</span>
            <span className="truncate text-xs text-muted-foreground">{user.email}</span>
          </span>
          <ChevronsUpDown className="ml-auto size-4" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent side={isMobile ? 'bottom' : 'right'} align="end" sideOffset={6} className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="truncate text-sm font-medium">{user.nama}</div>
          <div className="truncate text-xs text-muted-foreground">{user.role === 'admin' ? 'Admin' : 'Pencari kerja'}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => go('/profil')}>
          <UserRound /> Profil
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            resetDemo()
            toast.success('Data demo dikembalikan ke awal')
          }}
        >
          <RotateCcw /> Reset data demo
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            logout()
            navigate('/masuk', { replace: true })
          }}
        >
          <LogOut /> Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AppLayout() {
  const user = useCurrentUser()!
  const { pathname } = useLocation()
  const title = TITLES.find(([re]) => re.test(pathname))?.[1] ?? 'Halaman tidak ditemukan'

  useEffect(() => {
    window.scrollTo({ top: 0 })
    document.title = `${title} · CareerBridge`
  }, [pathname, title])

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader className="h-14 justify-center px-3">
          <Link to={user.role === 'admin' ? '/admin/skill' : '/'} className="rounded-md group-data-[collapsible=icon]:-ml-0.5" aria-label="CareerBridge">
            <Logo className="[&>img:last-child]:group-data-[collapsible=icon]:hidden" />
          </Link>
        </SidebarHeader>
        <SidebarContent>
          {user.role === 'admin' ? <NavGroup label="Kelola data" items={ADMIN_NAV} /> : <NavGroup label="Menu" items={USER_NAV} />}
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <UserMenu />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:px-6">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4" />
          <span className="truncate text-sm font-medium">{title}</span>
          <span className="ml-auto hidden rounded-full border border-dashed px-2.5 py-0.5 text-xs text-muted-foreground sm:inline">
            Mode demo · data contoh
          </span>
        </header>
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          <div key={pathname} className="animate-page-in">
            <Outlet />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
