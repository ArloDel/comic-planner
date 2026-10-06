import React from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { StatCard } from '@/components/ui/StatCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { WarningBanner } from '@/components/ui/WarningBanner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button, buttonClasses } from '@/components/ui/Button';
import { Pencil, Wallet, TrendingUp, ShieldCheck, Plus, Receipt } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { upsertBudget } from './actions';
import { TransactionModal } from './TransactionModal';
import {
  computeBudgetSummary,
  currentPeriode,
  shiftPeriode,
  sortReleaseSuggestions,
} from '@/lib/budget';
import { STATUS_LABELS, summarizePayments, type PaymentRow, type PlanStatus } from '@/lib/plans';
import { formatRupiah, formatTanggal } from '@/lib/format';
import type { TransactionType } from '@/types/database';

export const metadata = {
  title: 'Budget — ComicPlan',
  description: 'Atur budget bulanan, catat transaksi, dan pantau sisa aman',
};

interface TxnRowWithRelations {
  id: string;
  plan_id: string;
  jenis: TransactionType;
  jumlah: number;
  tanggal: string;
  catatan: string | null;
  plans: { id: string; items: { judul: string } | null } | null;
}

interface ActivePlanOption {
  id: string;
  label: string;
  status: PlanStatus;
  prioritas: number;
  estimasi_harga: number;
  sudah_dibayar: number;
}

interface HoldingPlanRow {
  id: string;
  status: string;
  prioritas: number | null;
  estimasi_harga: number | null;
  items: { judul: string } | null;
}

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string }>;
}) {
  const { periode: periodeParam } = await searchParams;
  const periode = /^\d{4}-\d{2}$/.test(periodeParam ?? '') ? periodeParam! : currentPeriode();

  let userEmail: string | null = null;
  let txnRows: TxnRowWithRelations[] = [];
  let holdingPlans: ActivePlanOption[] = [];
  let activePlans: ActivePlanOption[] = [];
  let summary = computeBudgetSummary(0, [], []);

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userEmail = user?.email ?? null;

    const [{ data: budgetRow }, { data: txnData }, { data: holdingRows }, { data: allTxns }] =
      await Promise.all([
        supabase
          .from('budgets')
          .select('total_budget')
          .eq('periode', `${periode}-01`)
          .maybeSingle(),
        supabase
          .from('transactions')
          .select('id, plan_id, jenis, jumlah, tanggal, catatan, plans(id, items(judul))')
          .order('tanggal', { ascending: false })
          .returns<TxnRowWithRelations[]>(),
        supabase
          .from('plans')
          .select('id, status, prioritas, estimasi_harga, items(judul)')
          .in('status', ['po', 'dp'] as PlanStatus[])
          .returns<HoldingPlanRow[]>(),
        supabase.from('transactions').select('plan_id, jumlah, jenis').returns<PaymentRow[]>(),
      ]);

    // Realisasi hanya menghitung transaksi pada periode terpilih; transaksi
    // bulan lain tetap dipakai untuk menghitung "sudah dibayar" per plan.
    txnRows = (txnData ?? []).filter((t) => t.tanggal.startsWith(periode));

    const dibayar = summarizePayments(allTxns ?? []);
    const mapPlan = (row: HoldingPlanRow): ActivePlanOption => ({
      id: row.id,
      label: row.items?.judul ?? 'Plan tanpa item',
      status: row.status as PlanStatus,
      prioritas: Number(row.prioritas ?? 3),
      estimasi_harga: Number(row.estimasi_harga ?? 0),
      sudah_dibayar: dibayar[row.id] ?? 0,
    });

    holdingPlans = (holdingRows ?? []).map(mapPlan);
    // Plan yang bisa ditransaksi: sudah ada pembayaran (untuk refund) atau
    // masih punya sisa tagihan.
    activePlans = holdingPlans.filter(
      (p) => p.sudah_dibayar > 0 || p.estimasi_harga > p.sudah_dibayar
    );

    summary = computeBudgetSummary(
      Number(budgetRow?.total_budget ?? 0),
      txnRows.map((t) => ({ jumlah: Number(t.jumlah), jenis: t.jenis })),
      holdingPlans
    );
  } catch (err) {
    console.error('Error loading budget:', err);
  }

  const persenTerpakai =
    summary.totalBudget > 0
      ? ((summary.realisasi + summary.komitmen) / summary.totalBudget) * 100
      : 0;

  const saranLepas = sortReleaseSuggestions(holdingPlans).slice(0, 3);

  async function setBudgetAction(formData: FormData) {
    'use server';
    await upsertBudget(periode, Number(formData.get('total_budget') ?? 0));
  }

  return (
    <AppShell
      userEmail={userEmail}
      pageTitle="Budget & Transaksi"
      pageSubtitle="Realisasi, komitmen, dan sisa aman tiap bulan"
    >
      <div className="space-y-6">
        <PeriodeNav periode={periode} />

        {summary.sisaAman < 0 && (
          <WarningBanner>
            <p>
              Sisa aman minus <strong>{formatRupiah(summary.sisaAman)}</strong>. Realisasi +
              komitmen sudah melampaui budget {formatRupiah(summary.totalBudget)} untuk periode
              ini.
            </p>
            {saranLepas.length > 0 && (
              <>
                <p className="font-semibold">Saran lepas hold (prioritas terendah dulu):</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {saranLepas.map((plan) => (
                    <li key={plan.id}>
                      {plan.label} — {STATUS_LABELS[plan.status]}{' '}
                      {formatRupiah(Math.max(plan.estimasi_harga - plan.sudah_dibayar, 0))}
                    </li>
                  ))}
                </ul>
                <p>Batalkan plan tersebut di halaman Rencana untuk melepas hold-nya.</p>
              </>
            )}
          </WarningBanner>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <form action={setBudgetAction}>
            <input type="hidden" name="periode" value={periode} />
            <StatCard
              label="Total Budget"
              value={formatRupiah(summary.totalBudget)}
              icon={<Pencil className="h-4 w-4" />}
              iconTone="primary"
            >
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  name="total_budget"
                  defaultValue={summary.totalBudget}
                  min="0"
                  step="10000"
                  aria-label="Total budget periode ini"
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white/80 px-2.5 py-2 text-xs tabular-nums focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
                <Button type="submit" size="sm" variant="secondary">
                  Simpan
                </Button>
              </div>
            </StatCard>
          </form>

          <StatCard
            label="Realisasi"
            value={formatRupiah(summary.realisasi)}
            icon={<TrendingUp className="h-4 w-4" />}
            iconTone="amber"
          >
            <p className="text-[11px] text-slate-500">Transaksi non-refund pada {periode}</p>
          </StatCard>

          <StatCard
            label="Komitmen"
            value={formatRupiah(summary.komitmen)}
            icon={<Wallet className="h-4 w-4" />}
            iconTone="sky"
          >
            <p className="text-[11px] text-slate-500">Sisa tagihan plan berstatus PO/DP</p>
          </StatCard>

          <StatCard
            label="Sisa Aman"
            value={formatRupiah(summary.sisaAman)}
            icon={<ShieldCheck className="h-4 w-4" />}
            iconTone={summary.sisaAman < 0 ? 'rose' : 'emerald'}
            valueTone={summary.sisaAman < 0 ? 'rose' : 'emerald'}
          >
            <ProgressBar
              percent={persenTerpakai}
              tone={summary.sisaAman < 0 ? 'rose' : summary.komitmen > 0 ? 'amber' : 'emerald'}
              leftLabel={`${Math.round(persenTerpakai)}% terpakai`}
              rightLabel={formatRupiah(summary.realisasi + summary.komitmen)}
            />
          </StatCard>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-slate-900">Transaksi {periode}</h2>
            {activePlans.length > 0 ? (
              <TransactionModal plans={activePlans} />
            ) : (
              <Button variant="primary" size="sm" disabled title="Belum ada plan aktif">
                <Plus className="h-4 w-4 mr-1.5" />
                <span>Catat Transaksi</span>
              </Button>
            )}
          </div>

          {txnRows.length === 0 ? (
            <EmptyState
              icon={<Receipt className="h-8 w-8 text-primary-400" />}
              title="Belum Ada Transaksi"
              description="Catat DP, pelunasan, atau refund dari plan yang sedang berjalan untuk melihat realisasi bulan ini."
            />
          ) : (
            <ul className="space-y-2">
              {txnRows.map((txn) => (
                <li
                  key={txn.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-2xl border border-white/60 bg-white/70 px-4 py-3 backdrop-blur"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {txn.plans?.items?.judul ?? 'Plan tanpa item'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {formatTanggal(txn.tanggal)} · {txn.jenis}
                      {txn.catatan ? ` · ${txn.catatan}` : ''}
                    </p>
                  </div>

                  <p
                    className={`text-sm font-bold tabular-nums ${
                      txn.jenis === 'refund' ? 'text-emerald-600' : 'text-slate-900'
                    }`}
                  >
                    {txn.jenis === 'refund' ? '+' : ''}
                    {formatRupiah(txn.jumlah)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function PeriodeNav({ periode }: { periode: string }) {
  return (
    <nav className="flex items-center justify-between gap-3">
      <Link
        href={`/budget?periode=${shiftPeriode(periode, -1)}`}
        className={buttonClasses('secondary', 'sm')}
      >
        Bulan sebelumnya
      </Link>

      <p className="text-sm font-semibold text-slate-700 tabular-nums">Periode {periode}</p>

      <Link
        href={`/budget?periode=${shiftPeriode(periode, 1)}`}
        className={buttonClasses('secondary', 'sm')}
      >
        Bulan berikutnya
      </Link>
    </nav>
  );
}