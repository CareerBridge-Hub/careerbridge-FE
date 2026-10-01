import type { ReactNode } from 'react'
import { Logo } from './common'

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-svh bg-card lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <a href="/" className="w-fit rounded-md focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none" aria-label="CareerBridge, kembali ke beranda">
          <Logo />
        </a>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[400px] animate-page-in">{children}</div>
        </div>
        <p className="text-center text-xs text-muted-foreground lg:text-left">
          Mode demo: semua data masih contoh dan tersimpan di browser ini.
        </p>
      </div>

      <aside className="relative m-3 hidden overflow-hidden rounded-[28px] bg-primary lg:flex lg:flex-col lg:justify-between lg:p-12" aria-hidden="true">
        <div className="absolute -top-24 -left-24 size-48 rounded-full bg-mint/90" />
        <div className="absolute top-1/3 -right-10 size-28 rounded-full bg-chart-3" />
        <div className="absolute -bottom-12 left-1/4 size-40 rounded-full bg-chart-4/90" />

        <div className="relative max-w-md pt-14">
          <p className="font-display text-[38px] leading-[1.1] text-white">
            Tahu skill yang kurang, tahu harus belajar di mana.
          </p>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-white/70">
            Upload CV, lihat seberapa cocok kamu dengan pekerjaan incaran, lalu temukan pelatihan untuk menutup kekurangannya.
          </p>
        </div>

        <div className="relative mx-auto mt-24 w-full max-w-[300px]">
          <img src="/assets/careerbridge/kucing-hero.webp" alt="" className="absolute -top-[74px] right-4 w-24 animate-[float_6s_ease-in-out_infinite_0.6s]" />
          <img
            src="/assets/careerbridge/card-skor-kecocokan.webp"
            alt=""
            className="relative w-full rotate-[-3deg] animate-[float_6s_ease-in-out_infinite] drop-shadow-2xl"
          />
        </div>
      </aside>
    </div>
  )
}
