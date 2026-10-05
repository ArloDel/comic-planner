import React from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/layout/AppShell';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { BookOpen, Layers, CheckCircle2, ArrowRight } from 'lucide-react';

export default async function HomePage() {
  let userEmail: string | null = null;
  let totalItems = 0;
  let totalSeries = 0;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    userEmail = user?.email || null;

    // Fetch brief summary for home
    const { data: items } = await (supabase as any).from('items').select('id, seri');
    if (items) {
      totalItems = items.length;
      const seriesSet = new Set(items.map((i: any) => i.seri).filter(Boolean));
      totalSeries = seriesSet.size;
    }
  } catch {
    // Ignored in dev without live credentials
  }

  return (
    <AppShell
      userEmail={userEmail}
      pageTitle="Dashboard"
      pageSubtitle="Ringkasan koleksi komik dan status pembelian"
      headerAction={
        <Link href="/katalog">
          <Button variant="primary" size="sm">
            <BookOpen className="h-4 w-4 mr-1.5" />
            <span>Katalog Komik</span>
          </Button>
        </Link>
      }
    >
      <div className="space-y-6">
        {/* Welcome / Quick Banner */}
        <GlassCard className="p-5 sm:p-6" solid>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-primary-600 bg-primary-50 px-2 py-0.5 rounded-md">
                Selamat Datang di ComicPlan
              </span>
              <h2 className="mt-2 text-xl sm:text-2xl font-bold text-slate-900">
                Pusat Perencanaan Koleksi Komik & Manga
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-xl">
                Kelola item komik, lacak volume bolong per seri, pantau rencana pembelian (PO/Wishlist), dan jaga batas anggaran belanja bulanan Anda.
              </p>
            </div>

            <div className="shrink-0">
              <Link href="/katalog">
                <Button variant="primary">
                  <span>Buka Katalog</span>
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
            <div className="p-3 rounded-xl bg-slate-50/80">
              <span className="text-[11px] font-semibold text-slate-400 block uppercase">
                Total Komik
              </span>
              <span className="text-xl font-bold text-slate-900 tabular-nums">
                {totalItems}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50/80">
              <span className="text-[11px] font-semibold text-slate-400 block uppercase">
                Seri Aktif
              </span>
              <span className="text-xl font-bold text-slate-900 tabular-nums">
                {totalSeries}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50/80">
              <span className="text-[11px] font-semibold text-slate-400 block uppercase">
                Sisa Aman
              </span>
              <span className="text-xl font-bold text-emerald-600 tabular-nums">
                Rp 0
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50/80">
              <span className="text-[11px] font-semibold text-slate-400 block uppercase">
                Komitmen PO
              </span>
              <span className="text-xl font-bold text-slate-700 tabular-nums">
                Rp 0
              </span>
            </div>
          </div>
        </GlassCard>

        {/* Feature quick cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <GlassCard className="p-5 flex flex-col justify-between">
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-primary-700 mb-3">
                <BookOpen className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                Katalog Item & Status Plan
              </h3>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                Kelola koleksi komik dengan status perolehan lengkap (Belum Ada, Wishlist, PO, DP, Lunas, Punya), filter real-time, dan estimasi harga.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100">
              <Link
                href="/katalog"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700"
              >
                <span>Kelola Katalog</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </GlassCard>

          <GlassCard className="p-5 flex flex-col justify-between">
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 mb-3">
                <Layers className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                Tracker Volume Per Seri
              </h3>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                Visual grid kotak nomor 1..N untuk setiap seri komik. Memudahkan melihat volume mana yang masih bolong dan quick-add volume berikutnya.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100">
              <Link
                href="/katalog"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700"
              >
                <span>Lihat Seri di Katalog</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </GlassCard>
        </div>

        {/* System Checklist */}
        <GlassCard className="p-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Status Integrasi Fondasi
          </h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Tailwind v4 Glassmorphism Theme Tokens</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>AppShell (Sidebar Desktop + BottomTabBar Mobile)</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>CRUD Server Actions & Real-Time Filter / Search</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Visual Volume Tracker Grid (`/katalog/seri/[seri]`)</span>
            </li>
          </ul>
        </GlassCard>
      </div>
    </AppShell>
  );
}
