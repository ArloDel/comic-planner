import type { PlanStatus, TransactionType } from '@/types/database';

export type { PlanStatus, TransactionType };

/**
 * Domain rules untuk Plans (F3).
 *
 * Modul ini murni (tanpa React / tanpa I/O) supaya state machine yang sama
 * dipakai oleh tiga pihak: server action (enforcement), UI (tombol transisi),
 * dan unit test. Postgres punya salinan aturan yang sama di
 * `supabase/migrations/20261006000000_plan_status_machine.sql` sebagai jaring
 * pengaman terakhir bila ada penulisan yang lolos dari server action.
 */

export const PLAN_STATUSES: readonly PlanStatus[] = [
  'wishlist',
  'po',
  'dp',
  'lunas',
  'diterima',
  'batal',
];

export const STATUS_LABELS: Record<PlanStatus, string> = {
  wishlist: 'Wishlist',
  po: 'Pre-Order',
  dp: 'DP',
  lunas: 'Lunas',
  diterima: 'Diterima',
  batal: 'Batal',
};

export const STATUS_HINTS: Record<PlanStatus, string> = {
  wishlist: 'Masih di niatan, belum ada outflow.',
  po: 'Sudah order ke toko — budget di-hold penuh.',
  dp: 'DP sudah dibayar — sisanya masih di-hold.',
  lunas: 'Sudah lunas, tinggal nunggu barang datang.',
  diterima: 'Barang sudah di tangan dan masuk koleksi.',
  batal: 'Dibatalkan — hold budget dilepas otomatis.',
};

/**
 * Status yang Hold budget. Rumus komitmen F4 hanya menghitung plan pada status
 * ini, sehingga begitu status plan jadi `batal` komitmennya langsung turun
 * tanpa ada job/event terpisah.
 */
export const HOLDS_BUDGET: readonly PlanStatus[] = ['po', 'dp'];

/** Status yang tidak punya jalan keluar lagi. */
export const TERMINAL_STATUSES: readonly PlanStatus[] = ['diterima', 'batal'];

/**
 * Peta transisi legal.
 *
 * Jalur utama: wishlist → po → dp → lunas → diterima
 * Jalur samping: `batal` tersedia dari setiap status aktif.
 *
 * `po → lunas` diizinkan supaya plan yang dibayar penuh tanpa DP tidak terjebak.
 * `diterima` dan `batal` terminal: membatalkan plan yang sudah diterima akan
 * membuat komik milik sendiri hilang dari koleksi.
 */
export const TRANSITIONS: Record<PlanStatus, readonly PlanStatus[]> = {
  wishlist: ['po', 'batal'],
  po: ['dp', 'lunas', 'batal'],
  dp: ['lunas', 'batal'],
  lunas: ['diterima', 'batal'],
  diterima: [],
  batal: [],
};

/** Status yang wajib punya deadline PO saat plan masuk ke status tersebut. */
export const STATUS_REQUIRES_DEADLINE: readonly PlanStatus[] = ['po'];

export interface PlanHistoryEntry {
  status_lama: string | null;
  status_baru: string;
  changed_at: string;
}

export interface CommitmentPlan {
  id: string;
  status: PlanStatus;
  estimasi_harga: number | null;
}

export interface PaymentRow {
  plan_id: string;
  jumlah: number | null;
  jenis: TransactionType | string;
}

export function isPlanStatus(value: unknown): value is PlanStatus {
  return typeof value === 'string' && (PLAN_STATUSES as readonly string[]).includes(value);
}

export function isHoldingBudget(status: PlanStatus): boolean {
  return HOLDS_BUDGET.includes(status);
}

export function isTerminal(status: PlanStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function requiresDeadline(status: PlanStatus): boolean {
  return STATUS_REQUIRES_DEADLINE.includes(status);
}

/** Semua status yang boleh dituju dari `from`. */
export function nextStatuses(from: PlanStatus): readonly PlanStatus[] {
  return TRANSITIONS[from] ?? [];
}

/** Satu-satunya sumber kebenaran untuk validasi transisi di server. */
export function canTransition(from: PlanStatus, to: PlanStatus): boolean {
  return nextStatuses(from).includes(to);
}

/**
 * Alasan penolakan dalam bahasa user, atau `null` bila transisi legal.
 * `deadline` hanya relevan untuk status yang mewajibkannya (lihat
 * `requiresDeadline`) dan dipakai untuk pesan error yang informatif.
 */
export function transitionError(
  from: PlanStatus,
  to: unknown,
  opts: { deadline?: string | null } = {}
): string | null {
  if (!isPlanStatus(to)) {
    return `Status "${String(to)}" tidak dikenal.`;
  }

  if (!isPlanStatus(from)) {
    return `Status plan saat ini "${String(from)}" tidak dikenal, tidak bisa dipindahkan.`;
  }

  if (from === to) {
    return `Plan sudah berstatus ${STATUS_LABELS[from]}.`;
  }

  if (!canTransition(from, to)) {
    if (to === 'batal' && isTerminal(from)) {
      return `Plan yang sudah ${STATUS_LABELS[from]} tidak bisa dibatalkan lagi.`;
    }

    const next = nextStatuses(from);
    const opsi = next.length
      ? next.map((s) => STATUS_LABELS[s]).join(' atau ')
      : 'tidak ada';

    return `Transisi ${STATUS_LABELS[from]} → ${STATUS_LABELS[to]} tidak diperbolehkan. Dari status ini hanya bisa ke: ${opsi}.`;
  }

  if (requiresDeadline(to) && !opts.deadline) {
    return 'Deadline PO wajib diisi saat masuk status Pre-Order.';
  }

  return null;
}

/** Nominal yang sudah ditransaksikan per plan, refund mengurangi. */
export function summarizePayments(rows: readonly PaymentRow[]): Record<string, number> {
  const result: Record<string, number> = {};

  for (const row of rows) {
    const jumlah = Number(row.jumlah ?? 0);
    if (!Number.isFinite(jumlah)) continue;

    result[row.plan_id] = (result[row.plan_id] ?? 0) + (row.jenis === 'refund' ? -jumlah : jumlah);
  }

  return result;
}

/**
 * Komitmen = Σ (estimasi − sudah dibayar) atas plan berstatus po/dp.
 *
 * F4 memakai fungsi ini untuk budget. Karena `batal` tidak termasuk
 * HOLDS_BUDGET, hold budget langsung hilang begitu status berubah — itulah yang
 * membuat pembatalan plan bersifat reaktif tanpa side effect tambahan.
 */
export function calculateCommitment(
  plans: readonly CommitmentPlan[],
  dibayarByPlan: Readonly<Record<string, number>> = {}
): number {
  let total = 0;

  for (const plan of plans) {
    if (!isHoldingBudget(plan.status)) continue;

    const estimasi = Number(plan.estimasi_harga ?? 0);
    const dibayar = Number(dibayarByPlan[plan.id] ?? 0);
    const sisa = Math.max(estimasi - dibayar, 0);

    if (Number.isFinite(sisa)) total += sisa;
  }

  return total;
}

/** Label jenis transaksi untuk UI. */
export const TXN_TYPE_LABELS: Record<TransactionType, string> = {
  dp: 'DP',
  pelunasan: 'Pelunasan',
  bayar_penuh: 'Bayar Penuh',
  refund: 'Refund',
};

/**
 * Jenis transaksi yang sah untuk status plan tertentu.
 *
 * DP hanya bisa dicatat saat plan sudah PO atau DP; pelunasan hanya dari DP;
 * bayar penuh hanya dari PO (pembelian tanpa DP). Refund selalu boleh karena
 * bisa terjadi kapan saja setelah ada pembayaran.
 */
export function txnAllowedForStatus(jenis: TransactionType, status: PlanStatus): boolean {
  switch (jenis) {
    case 'dp':
      return status === 'po' || status === 'dp';
    case 'pelunasan':
      return status === 'dp';
    case 'bayar_penuh':
      return status === 'po';
    case 'refund':
      return true;
  }
}

/** Label prioritas 1..5, 1 = paling tinggi. */
export function priorityLabel(prioritas: number): string {
  const map: Record<number, string> = {
    1: 'Sangat Tinggi',
    2: 'Tinggi',
    3: 'Sedang',
    4: 'Rendah',
    5: 'Nanti Saja',
  };

  return map[prioritas] ?? 'Sedang';
}

export const PRIORITIES: readonly number[] = [1, 2, 3, 4, 5];

export function isValidPriority(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5;
}

/** Validasi tanggal `YYYY-MM-DD` yang dipakai untuk deadline PO. */
export function isValidDateInput(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime());
}