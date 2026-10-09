export const formatRupiah = (n: number | string | null | undefined): string =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(toNum(n));

/** Tanggal `YYYY-MM-DD` tanpa jam — dipakai untuk deadline PO. */
/** Sama seperti `formatRupiah`, tapi `null` untuk nominal kosong — supaya UI bisa
 *  merender placeholder ("Belum ada harga") alih-alih "Rp 0". */
export const formatRupiahOrNull = (n: number | string | null | undefined): string | null => {
  const value = toNum(n);
  return value > 0 ? formatRupiah(value) : null;
};

export const formatTanggal = (d: string | Date | null | undefined): string => {
  if (!d) return '-';

  // `YYYY-MM-DD` di-parse sebagai UTC midnight oleh spec ES, yang di zona waktu
  // negatif bisa bergeser sehari. Pin ke tengah malam lokal supaya tanggalnya
  // tetap sama dengan yang diinput.
  const date = typeof d === 'string' ? new Date(`${d}T00:00:00`) : d;
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

/** Jumlah hari menuju tanggal; negatif bila sudah lewat. */
export const daysUntil = (d: string | Date | null | undefined): number | null => {
  if (!d) return null;

  const target = typeof d === 'string' ? new Date(`${d}T00:00:00`) : d;
  if (Number.isNaN(target.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
};

export const formatTanggalJam = (d: string | Date | null | undefined): string => {
  if (!d) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(d));
};

/** "H-3" / "Hari ini" / "Terlewat 2 hari" — untuk chip deadline */
export const formatCountdown = (deadline: string | null | undefined): string | null => {
  const hari = daysUntil(deadline);
  if (hari === null) return null;
  if (hari > 0) return `H-${hari}`;
  if (hari === 0) return 'Hari ini';
  return `Terlewat ${-hari} hari`;
};

/** Tone warna countdown per spec §6.2: H-1/lewat → rose · H-2..3 → amber · ≥H-4 → slate */
export const countdownTone = (
  deadline: string | null | undefined
): 'rose' | 'amber' | 'slate' | null => {
  const hari = daysUntil(deadline);
  if (hari === null) return null;
  if (hari <= 1) return 'rose';
  if (hari <= 3) return 'amber';
  return 'slate';
};

export const toNum = (v: number | string | null | undefined): number => {
  if (typeof v === 'number') return isNaN(v) ? 0 : v;
  if (typeof v === 'string') {
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  }
  return 0;
};
