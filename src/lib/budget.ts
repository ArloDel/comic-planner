import type { PlanStatus, TransactionType } from '@/types/database';
import { calculateCommitment } from './plans.ts';
import { toNum } from './format.ts';

/** Periode disimpan sebagai 'YYYY-MM' (di DB: date 'YYYY-MM-01'). */
export type Periode = string;

export interface BudgetSummary {
  totalBudget: number;
  realisasi: number;
  komitmen: number;
  sisaAman: number;
}

/** Plan minimal yang dibutuhkan untuk hitung komitmen. */
export interface PlanBudgetInput {
  id: string;
  status: PlanStatus;
  estimasi_harga: number | string;
  /** Net dibayar (sudah dikurangi refund) — hasil dari `summarizePayments`. */
  sudah_dibayar: number;
}

/** Transaksi minimal untuk hitung realisasi. */
export interface TxnBudgetInput {
  jumlah: number | string;
  jenis: TransactionType;
}



/**
 * Rumus PRD F4 (satu sumber kebenaran):
 *   Realisasi  = Σ transaksi (kecuali refund) pada bulan berjalan
 *   Komitmen   = Σ (estimasi − sudah dibayar) atas plan berstatus po/dp
 *   Sisa aman  = budget − realisasi − komitmen
 *
 * Komitmen sengaja DIDELegasikan ke `calculateCommitment` dari `lib/plans.ts`
 * (satu-satunya implementasi rumus hold) alih-alih dijumlahkan ulang di sini,
 * supaya halaman budget dan halaman rencana tidak pernah berbeda angka.
 */
export function computeBudgetSummary(
  totalBudget: number | string,
  periodTxns: TxnBudgetInput[],
  holdingPlans: PlanBudgetInput[]
): BudgetSummary {
  const realisasi = periodTxns.reduce(
    (acc, t) => (t.jenis === 'refund' ? acc : acc + toNum(t.jumlah)),
    0
  );

  const dibayarByPlan: Record<string, number> = {};
  for (const plan of holdingPlans) dibayarByPlan[plan.id] = plan.sudah_dibayar;

  const komitmen = calculateCommitment(
    holdingPlans.map((plan) => ({
      id: plan.id,
      status: plan.status,
      estimasi_harga: toNum(plan.estimasi_harga),
    })),
    dibayarByPlan
  );

  const totalBudgetNum = toNum(totalBudget);
  return {
    totalBudget: totalBudgetNum,
    realisasi,
    komitmen,
    sisaAman: totalBudgetNum - realisasi - komitmen,
  };
}

/** Proyeksi sisa aman bila ada perubahan (dipakai warning inline U5). */
export function projectSisaAman(
  summary: BudgetSummary,
  deltaRealisasi: number,
  deltaKomitmen: number
): number {
  return summary.sisaAman - deltaRealisasi - deltaKomitmen;
}

/** Saran lepas hold: prioritas paling rendah (angka terbesar) dulu, lalu estimasi terbesar. */
export function sortReleaseSuggestions<T extends { prioritas: number; estimasi_harga: number | string }>(
  plans: T[]
): T[] {
  return [...plans].sort(
    (a, b) =>
      b.prioritas - a.prioritas ||
      toNum(b.estimasi_harga) - toNum(a.estimasi_harga)
  );
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
