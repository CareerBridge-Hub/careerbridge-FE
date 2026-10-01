import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { ArrowLeft, Check, Eye, EyeOff, Loader2 } from 'lucide-react'
import { AuthLayout } from '@/app/components/AuthLayout'
import { Field, FormError } from '@/app/components/common'
import { Button } from '@/app/components/ui/button'
import { Checkbox } from '@/app/components/ui/checkbox'
import { Input } from '@/app/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select'
import { EDUCATION, PROVINCES } from '@/app/data/seed'
import { ApiError, EMAIL_RE, register } from '@/app/lib/api'
import { cn, invalid } from '@/app/lib/utils'

type Errors = Partial<Record<'nama' | 'email' | 'password' | 'pendidikan' | 'jurusan' | 'provinsi' | 'kota' | 'consent' | 'form', string>>

/** 0–3: length ≥ 8, mixes letters and digits, has a symbol or both cases. */
function strength(pw: string) {
  if (pw.length < 8) return 0
  return 1 + Number(/[a-z]/i.test(pw) && /\d/.test(pw)) + Number(/[^a-z0-9]/i.test(pw) || (/[a-z]/.test(pw) && /[A-Z]/.test(pw)))
}
const STRENGTH = ['Terlalu pendek', 'Cukup', 'Bagus', 'Kuat']

export default function Daftar() {
  const navigate = useNavigate()
  const [step, setStep] = useState<1 | 2>(1)
  const [f, setF] = useState({ nama: '', email: '', password: '', pendidikan: '', jurusan: '', provinsi: '', kota: '', consent: false })
  const [show, setShow] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [pending, setPending] = useState(false)
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => {
    setF((p) => ({ ...p, [k]: v }))
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }))
  }
  const level = strength(f.password)

  function nextStep(e: FormEvent) {
    e.preventDefault()
    const next: Errors = {}
    if (!f.nama.trim()) next.nama = 'Nama wajib diisi.'
    if (!EMAIL_RE.test(f.email.trim())) next.email = 'Masukkan email yang valid.'
    if (f.password.length < 8) next.password = 'Password minimal 8 karakter.'
    setErrors(next)
    if (Object.keys(next).length === 0) setStep(2)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    const next: Errors = {}
    if (!f.pendidikan) next.pendidikan = 'Pilih pendidikan terakhir.'
    if (!f.jurusan.trim()) next.jurusan = 'Jurusan wajib diisi.'
    if (!f.provinsi) next.provinsi = 'Pilih provinsi.'
    if (!f.kota.trim()) next.kota = 'Kota wajib diisi.'
    if (!f.consent) next.consent = 'Centang persetujuan ini untuk melanjutkan.'
    setErrors(next)
    if (Object.keys(next).length > 0) return
    setPending(true)
    try {
      await register(f)
      toast.success('Akun berhasil dibuat', { description: 'Langkah pertama: upload CV atau pilih skill-mu.' })
      navigate('/cv', { replace: true })
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Terjadi kesalahan. Coba lagi.'
      // A taken email belongs to step 1; send the user back there with the message on the field.
      if (/email/i.test(message)) {
        setStep(1)
        setErrors({ email: message })
      } else setErrors({ form: message })
      setPending(false)
    }
  }

  return (
    <AuthLayout>
      <ol className="mb-8 flex items-center gap-3 text-[13px]" aria-label="Langkah pendaftaran">
        {['Akun', 'Profil'].map((label, i) => {
          const n = i + 1
          const done = step > n
          return (
            <li key={label} className="flex items-center gap-3" aria-current={step === n ? 'step' : undefined}>
              {i > 0 && <span className={cn('h-px w-8 transition-colors', step > 1 ? 'bg-primary' : 'bg-border')} />}
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    'grid size-6 place-items-center rounded-full border text-xs font-semibold transition-colors',
                    step >= n ? 'border-primary bg-primary text-white' : 'border-border text-muted-foreground',
                  )}
                >
                  {done ? <Check className="size-3.5" /> : n}
                </span>
                <span className={step >= n ? 'font-medium' : 'text-muted-foreground'}>{label}</span>
              </span>
            </li>
          )
        })}
      </ol>

      {step === 1 ? (
        <div key="s1" className="animate-in fade-in slide-in-from-left-3 duration-300">
          <h1 className="font-display text-[32px] leading-tight tracking-tight">Buat akun gratis</h1>
          <p className="mt-2 text-[15px] text-muted-foreground">Cuma butuh satu menit. Setelah itu kita petakan skill-mu.</p>
          <form onSubmit={nextStep} noValidate className="mt-8 grid gap-4">
            <Field label="Nama lengkap" htmlFor="nama" error={errors.nama}>
              <Input id="nama" autoComplete="name" className="h-11" value={f.nama} onChange={(e) => set('nama', e.target.value)} {...invalid('nama', errors.nama)} />
            </Field>
            <Field label="Email" htmlFor="email" error={errors.email}>
              <Input id="email" type="email" autoComplete="email" placeholder="nama@email.com" className="h-11" value={f.email} onChange={(e) => set('email', e.target.value)} {...invalid('email', errors.email)} />
            </Field>
            <Field label="Password" htmlFor="password" error={errors.password}>
              <div className="relative">
                <Input
                  id="password"
                  type={show ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="h-11 pr-11"
                  value={f.password}
                  onChange={(e) => set('password', e.target.value)}
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
              {f.password && (
                <div className="flex items-center gap-2" aria-live="polite">
                  <div className="flex flex-1 gap-1">
                    {[1, 2, 3].map((i) => (
                      <span
                        key={i}
                        className={cn(
                          'h-1 flex-1 rounded-full transition-colors duration-300',
                          level >= i ? (level === 1 ? 'bg-chart-5' : 'bg-mint') : 'bg-secondary',
                        )}
                      />
                    ))}
                  </div>
                  <span className="w-24 text-right text-xs text-muted-foreground">{STRENGTH[level]}</span>
                </div>
              )}
            </Field>
            <Button type="submit" size="lg" className="mt-2 h-11 text-[15px]">
              Lanjut
            </Button>
          </form>
        </div>
      ) : (
        <div key="s2" className="animate-in fade-in slide-in-from-right-3 duration-300">
          <h1 className="font-display text-[32px] leading-tight tracking-tight">Sedikit tentang kamu</h1>
          <p className="mt-2 text-[15px] text-muted-foreground">Dipakai untuk menyaring pelatihan di dekatmu.</p>
          <form onSubmit={submit} noValidate className="mt-8 grid gap-4">
            <FormError>{errors.form}</FormError>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Pendidikan terakhir" htmlFor="pendidikan" error={errors.pendidikan}>
                <Select value={f.pendidikan} onValueChange={(v) => set('pendidikan', v)}>
                  <SelectTrigger id="pendidikan" className="h-11 w-full data-[size=default]:h-11" {...invalid('pendidikan', errors.pendidikan)}>
                    <SelectValue placeholder="Pilih" />
                  </SelectTrigger>
                  <SelectContent>
                    {EDUCATION.map((x) => (
                      <SelectItem key={x} value={x}>
                        {x}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Jurusan" htmlFor="jurusan" error={errors.jurusan}>
                <Input id="jurusan" placeholder="Teknik Pemesinan" className="h-11" value={f.jurusan} onChange={(e) => set('jurusan', e.target.value)} {...invalid('jurusan', errors.jurusan)} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Provinsi" htmlFor="provinsi" error={errors.provinsi}>
                <Select value={f.provinsi} onValueChange={(v) => set('provinsi', v)}>
                  <SelectTrigger id="provinsi" className="h-11 w-full data-[size=default]:h-11" {...invalid('provinsi', errors.provinsi)}>
                    <SelectValue placeholder="Pilih" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {PROVINCES.map((x) => (
                      <SelectItem key={x} value={x}>
                        {x}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Kota/kabupaten" htmlFor="kota" error={errors.kota}>
                <Input id="kota" autoComplete="address-level2" placeholder="Bekasi" className="h-11" value={f.kota} onChange={(e) => set('kota', e.target.value)} {...invalid('kota', errors.kota)} />
              </Field>
            </div>

            <div className="grid gap-1.5">
              <label
                htmlFor="consent"
                className={cn(
                  'flex cursor-pointer gap-3 rounded-xl border p-3.5 text-[13px] leading-relaxed transition-colors has-[[data-state=checked]]:border-mint has-[[data-state=checked]]:bg-mint-soft/60',
                  errors.consent && 'border-destructive/50',
                )}
              >
                <Checkbox
                  id="consent"
                  checked={f.consent}
                  onCheckedChange={(v) => set('consent', v === true)}
                  className="mt-0.5"
                  {...invalid('consent', errors.consent)}
                />
                <span>
                  Saya setuju CV saya diproses sistem (dibaca AI) untuk mencocokkan skill. CV hanya bisa dilihat oleh saya dan bisa
                  dihapus kapan saja.
                </span>
              </label>
              {errors.consent && (
                <p id="consent-error" className="animate-in fade-in text-[13px] text-destructive">
                  {errors.consent}
                </p>
              )}
            </div>

            <div className="mt-2 flex gap-2">
              <Button type="button" variant="outline" size="lg" className="h-11" onClick={() => setStep(1)} disabled={pending}>
                <ArrowLeft /> Kembali
              </Button>
              <Button type="submit" size="lg" className="h-11 flex-1 text-[15px]" disabled={pending}>
                {pending && <Loader2 className="animate-spin" />}
                {pending ? 'Membuat akun…' : 'Buat akun'}
              </Button>
            </div>
          </form>
        </div>
      )}

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Sudah punya akun?{' '}
        <Link to="/masuk" className="font-medium text-foreground underline-offset-4 hover:underline">
          Masuk
        </Link>
      </p>
    </AuthLayout>
  )
}
