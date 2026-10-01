import { Link } from 'react-router'
import { EmptyState } from '@/app/components/common'
import { Button } from '@/app/components/ui/button'

export default function NotFound() {
  return (
    <EmptyState
      title="Halaman tidak ditemukan"
      image="kucing-outro-wink"
      className="mx-auto mt-10 max-w-lg py-14"
      action={
        <Button asChild>
          <Link to="/">Kembali ke beranda</Link>
        </Button>
      }
    >
      Mungkin link-nya salah ketik, atau datanya sudah dihapus admin.
    </EmptyState>
  )
}
