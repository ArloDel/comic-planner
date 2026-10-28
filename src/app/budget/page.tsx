import React from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { StatCard } from '@/components/ui/StatCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { WarningBanner } from '@/components/ui/WarningBanner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button, buttonClasses } from '@/components/ui/Button';
import { TrendingUp, ShieldCheck, Plus, Receipt } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { BudgetFormCard } from './BudgetFormCard';
import { DeleteTransactionButton } from './DeleteTransactionButton';
import { TransactionModal } from './TransactionModal';
import {
  computeBudgetSummary,
  currentPeriode,
  shiftPeriode,
} from '@/lib/budget';
import {
  TXN_TYPE_LABELS,
  type PlanStatus,
} from '@/lib/plans';
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
}

interface ActivePlanRow {
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
  let activePlans: ActivePlanOption[] = [];
  let summary = computeBudgetSummary(0, []);

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userEmail = user?.email ?? null;

    const [{ data: budgetRow }, { data: txnData }, { data: planRows }] =
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
          .in('status', ['po', 'dp', 'lunas', 'diterima'] as PlanStatus[])
          .returns<ActivePlanRow[]>(),
      ]);

    txnRows = (txnData ?? []).filter((t) => t.tanggal.startsWith(periode));

    activePlans = (planRows ?? []).map((row) => ({
      id: row.id,
      label: row.items?.judul ?? 'Plan tanpa item',
      status: row.status as PlanStatus,
      prioritas: Number(row.prioritas ?? 3),
      estimasi_harga: Number(row.estimasi_harga ?? 0),
    }));

    summary = computeBudgetSummary(
      Number(budgetRow?.total_budget ?? 0),
      txnRows.map((t) => ({ jumlah: Number(t.jumlah), jenis: t.jenis }))
    );
  } catch (err) {
    console.error('Error loading budget:', err);
  }

  const persenTerpakai =
    summary.totalBudget > 0
      ? (summary.realisasi / summary.totalBudget) * 100
      : 0;

  return (
    <AppShell
      userEmail={userEmail}
      pageTitle="Budget & Transaksi"
      pageSubtitle="Realisasi pengeluaran dan sisa aman tiap bulan"
    >
      <div className="space-y-6">
        <PeriodeNav periode={periode} />

        {summary.sisaAman < 0 && (
          <WarningBanner>
            <p>
              Sisa aman minus <strong>{formatRupiah(summary.sisaAman)}</strong>. Realisasi
              pengeluaran sudah melampaui budget {formatRupiah(summary.totalBudget)} untuk periode
              ini.
            </p>
          </WarningBanner>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <BudgetFormCard
            key={periode}
            periode={periode}
            initialBudget={summary.totalBudget}
          />

          <StatCard
            label="Realisasi"
            value={formatRupiah(summary.realisasi)}
            icon={<TrendingUp className="h-4 w-4" />}
            iconTone="amber"
          >
            <p className="text-[11px] text-slate-500">Transaksi non-refund pada {periode}</p>
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
              tone={summary.sisaAman < 0 ? 'rose' : 'emerald'}
              leftLabel={`${Math.round(persenTerpakai)}% terpakai`}
              rightLabel={formatRupiah(summary.realisasi)}
            />
          </StatCard>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-slate-900">Transaksi {periode}</h2>
            {activePlans.length > 0 ? (
              <TransactionModal plans={activePlans} />
            ) : (
              <Button variant="primary" size="sm" disabled title="Belum ada pesanan aktif">
                <Plus className="h-4 w-4 mr-1.5" />
                <span>Catat Transaksi</span>
              </Button>
            )}
          </div>

          {txnRows.length === 0 ? (
            <EmptyState
              icon={<Receipt className="h-8 w-8 text-primary-400" />}
              title="Belum Ada Transaksi"
              description="Catat pembayaran atau refund dari pesanan komik untuk melihat realisasi bulan ini."
            />
          ) : (
            <ul className="space-y-2">
              {txnRows.map((txn) => {
                const judul = txn.plans?.items?.judul ?? 'Plan tanpa item';
                const jenisLabel = TXN_TYPE_LABELS[txn.jenis] ?? txn.jenis;

                return (
                  <li
                    key={txn.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-2xl border border-white/60 bg-white/70 px-4 py-3 backdrop-blur"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{judul}</p>
                      <p className="text-[11px] text-slate-500">
                        {formatTanggal(txn.tanggal)} · {jenisLabel}
                        {txn.catatan ? ` · ${txn.catatan}` : ''}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0">
                      <p
                        className={`text-sm font-bold tabular-nums ${
                          txn.jenis === 'refund' ? 'text-emerald-600' : 'text-slate-900'
                        }`}
                      >
                        {txn.jenis === 'refund' ? '+' : ''}
                        {formatRupiah(txn.jumlah)}
                      </p>
                      <DeleteTransactionButton
                        id={txn.id}
                        label={`${jenisLabel} ${judul}`}
                      />
                    </div>
                  </li>
                );
              })}
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
