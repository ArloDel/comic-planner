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
