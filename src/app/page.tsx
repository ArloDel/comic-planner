import React from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Heart,
  Layers,
  LogIn,
  ShieldCheck,
  TrendingUp,
  Truck,
  Wallet,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { GlassCard } from '@/components/ui/GlassCard';
import { StatCard } from '@/components/ui/StatCard';
import { StatusPill } from '@/components/ui/StatusPill';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { WarningBanner } from '@/components/ui/WarningBanner';
import { EmptyState } from '@/components/ui/EmptyState';
import { CoverImage } from '@/components/ui/CoverImage';
import { buttonClasses } from '@/components/ui/Button';
import { asArray } from '@/lib/supabase/embed';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import {
  mapItemsWithDetails,
  summarizeCollectionStats,
  summarizeSeries,
  type ItemRowWithRelations,
  type KatalogItemWithDetails,
} from '@/lib/catalog';
import {
  computeBudgetSummary,
  currentPeriode,
  formatPeriode,
  periodeRange,
} from '@/lib/budget';
import { STATUS_LABELS, isPlanStatus } from '@/lib/plans';
import {
  formatRupiah,
  formatTanggalJam,
} from '@/lib/format';
import type { TransactionType } from '@/types/database';

export const metadata = {
  title: 'Dashboard — ComicPlan',
  description: 'Ringkasan budget bulanan, sisa aman, dan aktivitas rencana terbaru',
};

interface PeriodTxnRow {
  id: string;
  plan_id: string;
  jenis: TransactionType;
  jumlah: number;
  tanggal: string;
  catatan: string | null;
}

interface HistoryRow {
  id: string;
  plan_id: string;
  status_lama: string | null;
  status_baru: string;
  changed_at: string;
  plans: { id: string; items: { judul: string } | null } | null;
}

export default async function DashboardPage() {
  const periode = currentPeriode();
  const { start, endExclusive } = periodeRange(periode);

  let userEmail: string | null = null;
  let summary = computeBudgetSummary(0, []);
  let budgetTerset = false;
  let periodTxns: PeriodTxnRow[] = [];
  let recentActivity: HistoryRow[] = [];
  let publicItems: KatalogItemWithDetails[] = [];

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userEmail = user?.email ?? null;

    if (!user) {
      const admin = createAdminClient();
      const { data: items } = await admin
        .from('items')
        .select(
          'id, judul, seri, volume, penerbit, tipe, cover_url, created_at, updated_at, plans(id, status)'
        )
        .order('created_at', { ascending: false })
        .returns<ItemRowWithRelations[]>();

      publicItems = mapItemsWithDetails(items ?? []);
    } else {
      const [{ data: budgetRow }, { data: periodTxnRows }, { data: historyRows }] =
        await Promise.all([
          supabase
            .from('budgets')
            .select('total_budget')
            .eq('periode', `${periode}-01`)
            .maybeSingle(),
          supabase
            .from('transactions')
            .select('id, plan_id, jenis, jumlah, tanggal, catatan')
            .gte('tanggal', start)
            .lt('tanggal', endExclusive)
            .order('tanggal', { ascending: false })
            .returns<PeriodTxnRow[]>(),
          supabase
            .from('status_history')
            .select('id, plan_id, status_lama, status_baru, changed_at, plans(id, items(judul))')
            .order('changed_at', { ascending: false })
            .limit(5)
            .returns<HistoryRow[]>(),
        ]);

      budgetTerset = Number(budgetRow?.total_budget ?? 0) > 0;

      periodTxns = (periodTxnRows ?? []).filter((t) => t.tanggal.startsWith(periode));

      summary = computeBudgetSummary(
        Number(budgetRow?.total_budget ?? 0),
        periodTxns.map((t) => ({ jumlah: Number(t.jumlah), jenis: t.jenis }))
      );

      recentActivity = (historyRows ?? []).slice(0, 5);
    }
  } catch (err) {
    console.error('Error loading dashboard:', err);
  }

  if (!userEmail) {
    const stats = summarizeCollectionStats(publicItems);
    const seriesList = summarizeSeries(publicItems);
    const recentItems = publicItems.slice(0, 10);

    return (
      <AppShell
        userEmail={null}
        pageTitle="Ringkasan Koleksi"
        pageSubtitle="Showcase publik koleksi komik, progres volume per seri, dan status perolehan"
        headerAction={
          <div className="flex items-center gap-2">
            <Link href="/katalog" className={buttonClasses('secondary', 'sm')}>
              <BookOpen className="h-4 w-4 mr-1.5" />
              <span>Buka Katalog</span>
            </Link>
            <Link href="/login" className={buttonClasses('primary', 'sm')}>
              <LogIn className="h-4 w-4 mr-1.5" />
              <span>Masuk Pemilik</span>
            </Link>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Statistik Koleksi Publik */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard
              label="Total Katalog"
              value={stats.totalItems}
              icon={<BookOpen className="h-4 w-4" />}
              iconTone="primary"
            >
              <p className="text-[11px] text-slate-500">
                Terbagi dalam {stats.seriesCount} seri koleksi
              </p>
            </StatCard>

            <StatCard
              label="Dimiliki"
              value={stats.ownedCount}
              icon={<CheckCircle2 className="h-4 w-4" />}
              iconTone="emerald"
            >
              <p className="text-[11px] text-slate-500">Komik sudah diterima</p>
            </StatCard>

            <StatCard
              label="Sedang Dikirim"
              value={stats.poCount}
              icon={<Truck className="h-4 w-4" />}
              iconTone="amber"
            >
              <p className="text-[11px] text-slate-500">Dalam proses pengiriman</p>
            </StatCard>

            <StatCard
              label="Wishlist"
              value={stats.wishlistCount}
              icon={<Heart className="h-4 w-4" />}
              iconTone="sky"
            >
              <p className="text-[11px] text-slate-500">Target koleksi berikutnya</p>
            </StatCard>
          </div>

          {/* Seri yang Dikoleksi */}
          {seriesList.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary-500" aria-hidden="true" />
                  <span>Seri Koleksi ({seriesList.length})</span>
                </h2>
                <Link
                  href="/katalog"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700"
                >
                  <span>Filter di Katalog</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>

              <div className="flex flex-wrap gap-2">
                {seriesList.map(({ seri, totalVolumes, ownedVolumes }) => (
                  <Link
                    key={seri}
                    href={`/katalog/seri/${encodeURIComponent(seri)}`}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 hover:bg-primary-50 hover:border-primary-300 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-primary-700 transition-colors"
                  >
                    <span>{seri}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 tabular-nums">
                      {ownedVolumes}/{totalVolumes} vol
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Koleksi Terbaru */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-slate-900">
                Koleksi &amp; Daftar Komik Terbaru
              </h2>
              <Link
                href="/katalog"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700"
              >
                <span>Lihat semua ({stats.totalItems})</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>

            {recentItems.length === 0 ? (
              <EmptyState
                icon={<BookOpen className="h-7 w-7" />}
                title="Katalog belum memiliki komik"
                description="Pemilik belum menambahkan komik ke dalam katalog."
              />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                {recentItems.map((item, idx) => (
                  <GlassCard
                    key={item.id}
                    className="flex flex-col p-2.5 sm:p-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-glass"
                  >
                    <div className="relative w-full">
                      <CoverImage
                        src={item.cover_url}
                        alt={item.judul}
                        title={item.judul}
                        priority={idx < 5}
                      />
                      <div className="absolute top-2 left-2 z-10">
                        <StatusPill
                          status={item.plan_status}
                          size="sm"
                          className="backdrop-blur-md bg-white/90 shadow-2xs"
                        />
                      </div>
                    </div>

                    <div className="mt-2.5">
                      <h3
                        className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 leading-snug"
                        title={item.judul}
                      >
                        {item.judul}
                      </h3>
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap text-[11px] text-slate-500 font-medium">
                        {item.seri ? (
                          <Link
                            href={`/katalog/seri/${encodeURIComponent(item.seri)}`}
                            className="hover:text-primary-600 hover:underline truncate max-w-[120px] font-semibold text-slate-600"
                          >
                            {item.seri}
                          </Link>
                        ) : (
                          <span>Non-seri</span>
                        )}
                        {item.volume !== null && (
                          <span className="rounded bg-slate-100 px-1 py-0.2 text-[10px] font-bold text-slate-700">
                            Vol {item.volume}
                          </span>
                        )}
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}
          </section>
        </div>
      </AppShell>
    );
  }

  const persenTerpakai =
    summary.totalBudget > 0
      ? (summary.realisasi / summary.totalBudget) * 100
      : 0;

  return (
    <AppShell
      userEmail={userEmail}
      pageTitle="Dashboard"
      pageSubtitle={`Periode ${formatPeriode(periode)} — ringkasan anggaran & aktivitas terbaru`}
      headerAction={
        <Link href="/budget" className={buttonClasses('secondary', 'sm')}>
          <Wallet className="h-4 w-4 mr-1.5" />
          <span>Kelola Budget</span>
        </Link>
      }
    >
      <div className="space-y-6">
        {/* Kartu ringkasan budget */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <StatCard
            label="Budget Bulan Ini"
            value={budgetTerset ? formatRupiah(summary.totalBudget) : 'Belum diatur'}
            icon={<Wallet className="h-4 w-4" />}
            iconTone="primary"
            valueTone={budgetTerset ? 'default' : 'amber'}
          >
            {budgetTerset ? (
              <p className="text-[11px] text-slate-500">Periode {periode}</p>
            ) : (
              <Link
                href="/budget"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-600 hover:text-primary-700"
              >
                <span>Atur budget</span>
                <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </Link>
            )}
          </StatCard>

          <StatCard
            label="Realisasi"
            value={formatRupiah(summary.realisasi)}
            icon={<TrendingUp className="h-4 w-4" />}
            iconTone="amber"
          >
            <p className="text-[11px] text-slate-500">
              Transaksi {formatPeriode(periode)}, non-refund
            </p>
          </StatCard>

          <StatCard
            label="Sisa Aman"
            value={formatRupiah(summary.sisaAman)}
            icon={
              summary.sisaAman < 0 ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )
            }
            iconTone={summary.sisaAman < 0 ? 'rose' : 'emerald'}
            valueTone={summary.sisaAman < 0 ? 'rose' : 'emerald'}
          >
            <ProgressBar
              percent={persenTerpakai}
              tone={summary.sisaAman < 0 ? 'rose' : 'emerald'}
              leftLabel={`${Math.round(persenTerpakai)}% terpakai`}
              rightLabel={formatRupiah(summary.realisasi)}
            />
          </StatCard>
        </div>

        {/* Warning overspend: sisa aman minus */}
        {summary.sisaAman < 0 && (
          <WarningBanner>
            <p>
              Realisasi pengeluaran sudah melampaui budget{' '}
              {formatRupiah(summary.totalBudget)}; sisa aman{' '}
              <strong>{formatRupiah(summary.sisaAman)}</strong>.
            </p>
          </WarningBanner>
        )}

        {/* Aktivitas Terbaru — status_history terakhir (maks 5) */}
        {recentActivity.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-slate-900">Aktivitas Terbaru</h2>
            <ul className="space-y-2">
              {recentActivity.map((row) => {
                const judul = asArray(row.plans)[0]?.items?.judul;
                const statusBaru = isPlanStatus(row.status_baru)
                  ? STATUS_LABELS[row.status_baru]
                  : row.status_baru;

                return (
                  <li
                    key={row.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3 rounded-2xl border border-white/60 bg-white/70 px-4 py-2.5 backdrop-blur"
                  >
                    <p className="min-w-0 text-xs text-slate-600">
                      <span className="font-semibold text-slate-900">
                        {judul ?? 'Plan'}
                      </span>{' '}
                      → {statusBaru}
                    </p>
                    <time
                      dateTime={row.changed_at}
                      className="text-[10px] text-slate-400 tabular-nums sm:shrink-0"
                    >
                      {formatTanggalJam(row.changed_at)}
                    </time>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </AppShell>
  );
}
