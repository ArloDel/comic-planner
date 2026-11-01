import type { TransactionType } from '@/types/database';
import { toNum } from './format.ts';

/** Periode disimpan sebagai 'YYYY-MM' (di DB: date 'YYYY-MM-01'). */
export type Periode = string;

export interface BudgetSummary {
  totalBudget: number;
  realisasi: number;
  sisaAman: number;
}

/** Transaksi minimal untuk hitung realisasi. */
export interface TxnBudgetInput {
  jumlah: number | string;
  jenis: TransactionType;
}

export interface YearlyBudgetRowInput {
  periode: string;
  total_budget: number | string;
}

export interface YearlyTxnRowInput {
  tanggal: string;
  jumlah: number | string;
  jenis: TransactionType;
}

export interface MonthlyBudgetPoint {
  month: number;
  periode: Periode;
  label: string;
  totalBudget: number;
  realisasi: number;
  refundTotal: number;
  sisaAman: number;
  persenTerpakai: number;
  isOverBudget: boolean;
  txnCount: number;
}

export interface YearlyBudgetSummary {
  year: number;
  months: MonthlyBudgetPoint[];
  totalBudget: number;
  totalRealisasi: number;
  totalRefund: number;
  totalSisaAman: number;
  activeMonthsCount: number;
  averageMonthlySpending: number;
  peakMonth: {
    periode: Periode;
    label: string;
    realisasi: number;
  } | null;
  maxScaleValue: number;
}

const SHORT_MONTH_LABELS_ID = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
] as const;

/**
 * Rumus Budget:
 *   Realisasi  = Σ transaksi (kecuali refund) pada bulan berjalan
 *   Sisa aman  = budget − realisasi
 */
export function computeBudgetSummary(
  totalBudget: number | string,
  periodTxns: TxnBudgetInput[]
): BudgetSummary {
  const realisasi = periodTxns.reduce(
    (acc, t) => (t.jenis === 'refund' ? acc : acc + toNum(t.jumlah)),
    0
  );

  const totalBudgetNum = toNum(totalBudget);
  return {
    totalBudget: totalBudgetNum,
    realisasi,
    sisaAman: totalBudgetNum - realisasi,
  };
}

/** Proyeksi sisa aman bila ada perubahan. */
export function projectSisaAman(
  summary: BudgetSummary,
  deltaRealisasi: number
): number {
  return summary.sisaAman - deltaRealisasi;
}

/**
 * Rekapitulasi anggaran & realisasi pengeluaran selama 1 tahun penuh (Jan–Des).
 */
export function computeYearlySummary(
  year: number,
  budgetRows: YearlyBudgetRowInput[],
  txnRows: YearlyTxnRowInput[]
): YearlyBudgetSummary {
  const yearPrefix = `${year}-`;
  const budgetByPeriode = new Map<Periode, number>();

  for (const row of budgetRows) {
    const key = row.periode.slice(0, 7);
    if (key.startsWith(yearPrefix)) {
      budgetByPeriode.set(key, toNum(row.total_budget));
    }
  }

  const txnsByPeriode = new Map<
    Periode,
    { realisasi: number; refundTotal: number; count: number }
  >();

  for (const txn of txnRows) {
    const key = txn.tanggal.slice(0, 7);
    if (!key.startsWith(yearPrefix)) continue;

    const current = txnsByPeriode.get(key) ?? {
      realisasi: 0,
      refundTotal: 0,
      count: 0,
    };

    const amount = toNum(txn.jumlah);
    if (txn.jenis === 'refund') {
      current.refundTotal += amount;
    } else {
      current.realisasi += amount;
    }
    current.count += 1;
    txnsByPeriode.set(key, current);
  }

  const months: MonthlyBudgetPoint[] = Array.from({ length: 12 }, (_, idx) => {
    const month = idx + 1;
    const periode = `${year}-${String(month).padStart(2, '0')}`;
    const label = SHORT_MONTH_LABELS_ID[idx];
    const totalBudget = budgetByPeriode.get(periode) ?? 0;
    const txnStats = txnsByPeriode.get(periode) ?? {
      realisasi: 0,
      refundTotal: 0,
      count: 0,
    };

    const realisasi = txnStats.realisasi;
    const sisaAman = totalBudget - realisasi;
    const persenTerpakai = totalBudget > 0 ? (realisasi / totalBudget) * 100 : 0;
    const isOverBudget = totalBudget > 0 && realisasi > totalBudget;

    return {
      month,
      periode,
      label,
      totalBudget,
      realisasi,
      refundTotal: txnStats.refundTotal,
      sisaAman,
      persenTerpakai,
      isOverBudget,
      txnCount: txnStats.count,
    };
  });

  const totalBudget = months.reduce((sum, m) => sum + m.totalBudget, 0);
  const totalRealisasi = months.reduce((sum, m) => sum + m.realisasi, 0);
  const totalRefund = months.reduce((sum, m) => sum + m.refundTotal, 0);
  const totalSisaAman = totalBudget - totalRealisasi;

  const activeMonths = months.filter((m) => m.realisasi > 0);
  const activeMonthsCount = activeMonths.length;
  const averageMonthlySpending =
    activeMonthsCount > 0 ? Math.round(totalRealisasi / activeMonthsCount) : 0;

  let peakMonth: YearlyBudgetSummary['peakMonth'] = null;
  for (const m of activeMonths) {
    if (!peakMonth || m.realisasi > peakMonth.realisasi) {
      peakMonth = {
        periode: m.periode,
        label: m.label,
        realisasi: m.realisasi,
      };
    }
  }

  const maxScaleValue = months.reduce(
    (max, m) => Math.max(max, m.totalBudget, m.realisasi),
    0
  );

  return {
    year,
    months,
    totalBudget,
    totalRealisasi,
    totalRefund,
    totalSisaAman,
    activeMonthsCount,
    averageMonthlySpending,
    peakMonth,
    maxScaleValue,
  };
}

// ── Periode helpers ──────────────────────────────────────────────

export function currentPeriode(): Periode {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function normalizePeriode(raw: string | null | undefined): Periode {
  if (raw && /^\d{4}-\d{2}$/.test(raw)) return raw;
  return currentPeriode();
}

export function periodeDate(periode: Periode): string {
  return `${periode}-01`;
}

export function periodeRange(periode: Periode): { start: string; endExclusive: string } {
  return { start: periodeDate(periode), endExclusive: periodeDate(shiftPeriode(periode, 1)) };
}

export function shiftPeriode(periode: Periode, delta: number): Periode {
  const [y, m] = periode.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function formatPeriode(periode: Periode): string {
  const [y, m] = periode.split('-').map(Number);
  return new Intl.DateTimeFormat('id-ID', { month: 'short', year: 'numeric' }).format(
    new Date(Date.UTC(y, m - 1, 1))
  );
}

export function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
}
