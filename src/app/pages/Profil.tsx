import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Field, FormError, PageHeader } from '@/app/components/common'
import { invalid } from '@/app/lib/utils'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Input } from '@/app/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select'
import { EDUCATION, PROVINCES } from '@/app/data/seed'
import { ApiError, changePassword, updateProfile, useCurrentUser } from '@/app/lib/api'
import { fileSize, formatDate } from '@/app/lib/format'

export default function Profil() {
  const user = useCurrentUser()!
  return (
    <>
      <PageHeader title="Profil" description={`Bergabung sejak ${formatDate(user.createdAt)}.`} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start">
        <ProfileForm key={user.id} />
        <div className="grid gap-4">
          <PasswordForm />
          {user.role === 'user' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Privasi CV</CardTitle>
                <CardDescription>CV hanya bisa dilihat olehmu dan bisa dihapus kapan saja.</CardDescription>
              </CardHeader>
              <CardContent className="text-sm">
                {user.cv ? (
                  <p>
                    <span className="font-medium">{user.cv.fileName}</span>{' '}
                    <span className="text-muted-foreground">({fileSize(user.cv.size)})</span>
                  </p>
                ) : (
                  <p className="text-muted-foreground">Belum ada CV tersimpan.</p>
                )}
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <Link to="/cv">Kelola CV</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}

function ProfileForm() {
  const user = useCurrentUser()!
  const [f, setF] = useState({ nama: user.nama, pendidikan: user.pendidikan, jurusan: user.jurusan, provinsi: user.provinsi, kota: user.kota })
  const [errors, setErrors] = useState<{ nama?: string; kota?: string; form?: string }>({})
  const [pending, setPending] = useState(false)
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }))
  const dirty = (Object.keys(f) as (keyof typeof f)[]).some((k) => f[k] !== user[k])

  async function submit(e: FormEvent) {
    e.preventDefault()
    const next: typeof errors = {}
    if (!f.nama.trim()) next.nama = 'Nama wajib diisi.'
    if (!f.kota.trim()) next.kota = 'Kota wajib diisi.'
    setErrors(next)
    if (next.nama || next.kota) return
    setPending(true)
    try {
      await updateProfile(f)
      setF((p) => ({ ...p, nama: p.nama.trim(), jurusan: p.jurusan.trim(), kota: p.kota.trim() }))
      toast.success('Profil disimpan')
    } catch (err) {
      setErrors({ form: err instanceof ApiError ? err.message : 'Gagal menyimpan. Coba lagi.' })
    } finally {
      setPending(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Data diri</CardTitle>
        <CardDescription>Provinsi dan kota dipakai untuk menyaring pelatihan di dekatmu.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} noValidate className="grid gap-4">
          <FormError>{errors.form}</FormError>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nama lengkap" htmlFor="p-nama" error={errors.nama}>
              <Input id="p-nama" autoComplete="name" value={f.nama} onChange={(e) => set('nama', e.target.value)} {...invalid('p-nama', errors.nama)} />
            </Field>
            <Field label="Email" htmlFor="p-email" hint="Email tidak bisa diubah.">
              <Input id="p-email" value={user.email} readOnly disabled />
            </Field>
            <Field label="Pendidikan terakhir" htmlFor="p-pendidikan">
              <Select value={f.pendidikan} onValueChange={(v) => set('pendidikan', v)}>
                <SelectTrigger id="p-pendidikan" className="w-full">
                  <SelectValue />
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
            <Field label="Jurusan" htmlFor="p-jurusan">
              <Input id="p-jurusan" value={f.jurusan} onChange={(e) => set('jurusan', e.target.value)} />
            </Field>
            <Field label="Provinsi" htmlFor="p-provinsi">
              <Select value={f.provinsi} onValueChange={(v) => set('provinsi', v)}>
                <SelectTrigger id="p-provinsi" className="w-full">
                  <SelectValue />
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
            <Field label="Kota/kabupaten" htmlFor="p-kota" error={errors.kota}>
              <Input id="p-kota" autoComplete="address-level2" value={f.kota} onChange={(e) => set('kota', e.target.value)} {...invalid('p-kota', errors.kota)} />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={!dirty || pending}>
              {pending && <Loader2 className="animate-spin" />}
              Simpan perubahan
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function PasswordForm() {
  const [f, setF] = useState({ lama: '', baru: '', ulang: '' })
  const [errors, setErrors] = useState<{ lama?: string; baru?: string; ulang?: string }>({})
  const [pending, setPending] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const next: typeof errors = {}
    if (!f.lama) next.lama = 'Isi password lama.'
    if (f.baru.length < 8) next.baru = 'Minimal 8 karakter.'
    else if (f.baru === f.lama) next.baru = 'Password baru harus berbeda.'
    if (f.ulang !== f.baru) next.ulang = 'Tidak sama dengan password baru.'
    setErrors(next)
    if (Object.keys(next).length) return
    setPending(true)
    try {
      await changePassword(f.lama, f.baru)
      setF({ lama: '', baru: '', ulang: '' })
      toast.success('Password diganti')
    } catch (err) {
      setErrors({ lama: err instanceof ApiError ? err.message : 'Gagal mengganti password.' })
    } finally {
      setPending(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ganti password</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} noValidate className="grid gap-3">
          <Field label="Password lama" htmlFor="pw-lama" error={errors.lama}>
            <Input id="pw-lama" type="password" autoComplete="current-password" value={f.lama} onChange={(e) => setF({ ...f, lama: e.target.value })} {...invalid('pw-lama', errors.lama)} />
          </Field>
          <Field label="Password baru" htmlFor="pw-baru" error={errors.baru}>
            <Input id="pw-baru" type="password" autoComplete="new-password" value={f.baru} onChange={(e) => setF({ ...f, baru: e.target.value })} {...invalid('pw-baru', errors.baru)} />
          </Field>
          <Field label="Ulangi password baru" htmlFor="pw-ulang" error={errors.ulang}>
            <Input id="pw-ulang" type="password" autoComplete="new-password" value={f.ulang} onChange={(e) => setF({ ...f, ulang: e.target.value })} {...invalid('pw-ulang', errors.ulang)} />
          </Field>
          <Button type="submit" variant="outline" className="mt-1 w-fit" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            Ganti password
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
