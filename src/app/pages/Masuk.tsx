import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { AuthLayout } from '@/app/components/AuthLayout'
import { Field, FormError } from '@/app/components/common'
import { invalid } from '@/app/lib/utils'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { ApiError, EMAIL_RE, login } from '@/app/lib/api'

const DEMO = [
  { label: 'Pencari kerja', email: 'demo@careerbridge.id' },
  { label: 'Admin', email: 'admin@careerbridge.id' },
]

export default function Masuk() {
  const navigate = useNavigate()
  const from = (useLocation().state as { from?: string } | null)?.from
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({})
  const [pending, setPending] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const next: typeof errors = {}
    if (!EMAIL_RE.test(email.trim())) next.email = 'Masukkan email yang valid.'
    if (!password) next.password = 'Password wajib diisi.'
    setErrors(next)
    if (next.email || next.password) return
    setPending(true)
    try {
      const user = await login(email, password)
      navigate(from ?? (user.role === 'admin' ? '/admin/skill' : '/'), { replace: true })
    } catch (err) {
      setErrors({ form: err instanceof ApiError ? err.message : 'Terjadi kesalahan. Coba lagi.' })
      setPending(false)
    }
  }

  return (
    <AuthLayout>
      <h1 className="font-display text-[32px] leading-tight tracking-tight">Selamat datang kembali</h1>
      <p className="mt-2 text-[15px] text-muted-foreground">Masuk untuk melihat skor kecocokan dan pelatihan yang cocok untukmu.</p>

      <form onSubmit={submit} noValidate className="mt-8 grid gap-4">
        <FormError>{errors.form}</FormError>
        <Field label="Email" htmlFor="email" error={errors.email}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="nama@email.com"
            className="h-11"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            {...invalid('email', errors.email)}
          />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password}>
          <div className="relative">
            <Input
              id="password"
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
              className="h-11 pr-11"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              {...invalid('password', errors.password)}
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-md text-muted-foreground hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'}
              aria-pressed={show}
            >
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>
        <Button type="submit" size="lg" className="mt-2 h-11 text-[15px]" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          {pending ? 'Memeriksa…' : 'Masuk'}
        </Button>
      </form>

      <div className="mt-6 rounded-xl border border-dashed bg-muted/60 p-4">
        <p className="text-[13px] text-muted-foreground">
          Akun demo, password <span className="font-medium text-foreground">demo1234</span>
        </p>
        <div className="mt-2.5 flex gap-2">
          {DEMO.map((d) => (
            <Button
              key={d.email}
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 bg-card"
              onClick={() => {
                setEmail(d.email)
                setPassword('demo1234')
                setErrors({})
              }}
            >
              {d.label}
            </Button>
          ))}
        </div>
      </div>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Belum punya akun?{' '}
        <Link to="/daftar" className="font-medium text-foreground underline-offset-4 hover:underline">
          Daftar gratis
        </Link>
      </p>
    </AuthLayout>
  )
}
