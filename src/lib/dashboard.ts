import type { PlanStatus } from '@/types/database';
import { toNum } from './format.ts';

/**
 * Helper dashboard (F6) — murni tanpa I/O supaya bisa diuji unit.
 *
 * Angka ringkasan budget TIDAK dihitung di sini: rumus F4 tetap satu sumber
 * kebenaran di `computeBudgetSummary` (lib/budget.ts, delegasi komitmennya ke
 * `calculateCommitment` di lib/plans.ts). Helper ini hanya memilih & mengurutkan
 * plan PO yang mendekati deadline untuk daftar "PO mendekati deadline".
 */

/** Jendela "PO mendekati deadline" (PRD F6 / U7): dari terlewat 7 hari sampai H-7. */
export const PO_DEADLINE_WINDOW_DAYS = 7;

export interface PoDeadlineInput {
  id: string;
  status: PlanStatus;
  estimasi_harga: number | string | null;
  /** Net dibayar (refund mengurangi) — hasil `summarizePayments`. */
  sudah_dibayar: number;
  /** Kolom `plans.deadline_po` (terisi dari listing saat masuk status `po`). */
  deadline_po: string | null;
  /** Field display opsional — tidak dipakai oleh logika, hanya ikut diteruskan. */
  judul?: string | null;
  volume?: number | null;
  cover_url?: string | null;
}

export interface PoDeadlinePlan extends PoDeadlinePlanData {
  /** Hari menuju deadline, dihitung dari tengah malam lokal; negatif = terlewat. */
  hariTersisa: number;
  /** estimasi − sudah dibayar, minimal 0. */
  sisaBayar: number;
}

interface PoDeadlinePlanData {
  id: string;
  status: PlanStatus;
  estimasi_harga: number;
  sudah_dibayar: number;
  deadline_po: string | null;
  judul?: string | null;
  volume?: number | null;
  cover_url?: string | null;
}

export function pickUrgentPoPlans(
  plans: readonly PoDeadlineInput[],
  today: Date = new Date()
): PoDeadlinePlan[] {
  const base = new Date(today);
  base.setHours(0, 0, 0, 0);

  const candidates: PoDeadlinePlan[] = [];

  for (const plan of plans) {
    if (plan.status !== 'po' || !plan.deadline_po) continue;

    const target = new Date(`${plan.deadline_po}T00:00:00`);
    if (Number.isNaN(target.getTime())) continue;

    const estimasi = toNum(plan.estimasi_harga);
    const dibayar = toNum(plan.sudah_dibayar);

    candidates.push({
      id: plan.id,
      status: plan.status,
      estimasi_harga: estimasi,
      sudah_dibayar: dibayar,
      deadline_po: plan.deadline_po,
      judul: plan.judul ?? null,
      volume: plan.volume ?? null,
      cover_url: plan.cover_url ?? null,
      hariTersisa: Math.round((target.getTime() - base.getTime()) / 86_400_000),
      sisaBayar: Math.max(estimasi - dibayar, 0),
    });
  }

  return candidates
    .filter(
      (plan) =>
        plan.hariTersisa <= PO_DEADLINE_WINDOW_DAYS &&
        plan.hariTersisa >= -PO_DEADLINE_WINDOW_DAYS
    )
    .sort((a, b) => a.hariTersisa - b.hariTersisa);
}
