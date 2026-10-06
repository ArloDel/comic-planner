import { isValidDateInput } from './plans.ts';
import type { ListingStatus } from '@/types/database';

/**
 * Domain logic impor F5 (server) — murni, tanpa I/O.
 *
 * Modul ini sengaja dipisah dari route handler `src/app/api/import/route.ts`
 * supaya aturan dedup/parsing bisa diuji dengan `node --test` tanpa Supabase.
 * Prinsipnya: parsing defensif — satu produk rusak tidak boleh menjatuhkan
 * seluruh batch (PRD F5 "parsing gagal → pesan error jelas, tidak crash").
 */

/** Satu-satunya marketplace yang didukung di v1. */
export const IMPORT_MARKETPLACE = 'shopee';

/**
 * Shopee mengirim harga dalam satuan terkecil dengan 100.000 = Rp 1
 * (PRD F5: "harga (field mentah ÷ 100.000) → rupiah").
 */
export const SHOPEE_PRICE_DIVISOR = 100_000;

/** Batas aman per request — jauh di atas satu halaman toko Shopee. */
export const MAX_ITEMS_PER_IMPORT = 200;

/**
 * Prioritas default untuk plan hasil impor. `3` = "Sedang" sesuai
 * `priorityLabel()` di `lib/plans.ts`, nilai yang sama dipakai katalog.
 */
export const IMPORT_DEFAULT_PRIORITY = 3;

/** Bentuk mentah dari payload userscript — semua field defensif (`unknown`). */
export interface RawImportItem {
  itemid?: unknown;
  shopid?: unknown;
  nama?: unknown;
  harga_raw?: unknown;
  label_po?: unknown;
  deadline_po?: unknown;
  tanggal_rilis?: unknown;
  thumbnail?: unknown;
  url?: unknown;
  nama_toko?: unknown;
  volume?: unknown;
  seri?: unknown;
}

/** Produk yang lolos normalisasi — sudah siap jadi baris DB. */
export interface ImportItem {
  marketplace: typeof IMPORT_MARKETPLACE;
  shop_id: string;
  item_id_shopee: string;
  nama: string;
  seri: string | null;
  volume: number | null;
  /** `null` = harga tidak terbaca dari payload, JANGAN dianggap Rp 0. */
  harga: number | null;
  is_po: boolean;
  deadline_po: string | null;
  tanggal_rilis: string | null;
  thumbnail: string | null;
  url: string | null;
  nama_toko: string | null;
}

/** Produk yang dilewati, beserta alasan dalam bahasa user. */
export interface ImportItemError {
  index: number;
  itemid: string | null;
  nama: string | null;
  message: string;
}

export type NormalizedImportItem =
  | { ok: true; item: ImportItem }
  | { ok: false; error: ImportItemError };

export type PayloadParseResult =
  | { ok: true; items: ImportItem[]; errors: ImportItemError[] }
  | { ok: false; error: string };

/** Snapshot listing yang sudah ada, dipakai untuk dedup + merge nilai lama. */
export interface ExistingListing {
  listing_id: string;
  item_id: string;
  harga: number;
  deadline_po: string | null;
  nama_toko?: string | null;
  url?: string | null;
  tanggal_rilis?: string | null;
}

export interface PlannedItem {
  id: string;
  judul: string;
  seri: string | null;
  volume: number | null;
  cover_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlannedListing {
  id: string;
  item_id: string;
  marketplace: string;
  shop_id: string;
  item_id_shopee: string;
  nama_toko: string | null;
  url: string | null;
  harga: number;
  status: ListingStatus;
  deadline_po: string | null;
  tanggal_rilis: string | null;
  updated_at: string;
}

export interface PlannedPlan {
  id: string;
  item_id: string;
  listing_id: string;
  prioritas: number;
  estimasi_harga: number;
  status: 'wishlist';
  deadline_po: null;
  created_at: string;
  updated_at: string;
}

export interface ImportPlan {
  newItems: PlannedItem[];
  newListings: PlannedListing[];
  updatedListings: PlannedListing[];
  newPlans: PlannedPlan[];
  /** Jumlah listing baru (produk baru masuk katalog). */
  created: number;
  /** Jumlah listing lama yang datanya di-refresh. */
  updated: number;
}

export interface PlanImportOptions {
  existing?: ReadonlyMap<string, ExistingListing>;
  /** Disuntik agar hasil Deterministik di unit test. */
  newId?: () => string;
  now?: () => string;
}

/** Kunci unik listing, sama dengan constraint DB `(marketplace, shop_id, item_id_shopee)`. */
export function listingKey(item: {
  marketplace?: string;
  shop_id: string;
  item_id_shopee: string;
}): string {
  return `${item.marketplace ?? IMPORT_MARKETPLACE}|${item.shop_id}|${item.item_id_shopee}`;
}

function text(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || null;
  }

  // Shopee mengirim `itemid` sebagai number di sebagian endpoint.
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);

  return null;
}

const TRUE_FLAGS = new Set(['true', '1', 'yes', 'y', 'po', 'pre-order', 'preorder', 'pre order']);

/** Flag boolean yang ditulis userscript dengan beberapa kemungkinan bentuk. */
export function isTruthyFlag(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;

  const raw = text(value);
  return raw !== null && TRUE_FLAGS.has(raw.toLowerCase());
}

/**
 * Harga mentah → rupiah.
 *
 * Menerima number, atau string angka bulat (`"4500000"`). String yang
 * sudah berformat ("Rp45.000") sengaja ditolak: dari situ tidak bisa dibedakan
 * apakah angkanya satuan mentah atau rupiah, dan menebak di sini bisa berarti
 * harga tersimpan 100.000× lipat. `null` = tidak terbaca (bukan Rp 0).
 */
export function parseShopeePrice(raw: unknown): number | null {
  let value: number;

  if (typeof raw === 'number') {
    value = raw;
  } else if (typeof raw === 'string' && /^-?\d+$/.test(raw.trim())) {
    value = Number(raw.trim());
  } else {
    return null;
  }

  if (!Number.isFinite(value)) return null;

  const rupiah = Math.round(value / SHOPEE_PRICE_DIVISOR);
  return rupiah >= 0 ? rupiah : null;
}

/** Terima `YYYY-MM-DD` maupun ISO datetime (`2026-12-01T00:00:00+07:00`). */
export function normalizeDate(raw: unknown): string | null {
  const raw_text = text(raw);
  if (!raw_text) return null;

  // Panjang > 10 dengan separator '-' di posisi 4 & 7 → potong jadi tanggal saja.
  const candidate =
    raw_text.length > 10 && raw_text[4] === '-' && raw_text[7] === '-' ? raw_text.slice(0, 10) : raw_text;

  return isValidDateInput(candidate) ? candidate : null;
}

function normalizeVolume(raw: unknown): number | null {
  const raw_text = text(raw);
  if (!raw_text || !/^\d{1,4}$/.test(raw_text)) return null;

  const volume = Number(raw_text);
  return volume >= 1 ? volume : null;
}

/**
 * Normalisasi satu produk mentah. Kembalikan `ok: false` hanya untuk field
 * yang membuat baris tidak bisa disimpan sama sekali (kunci unik atau judul
 * kosong) — sisanya dibiarkan null agar bisa disimpan apa adanya.
 */
export function normalizeImportItem(raw: unknown, index: number): NormalizedImportItem {
  const source = (typeof raw === 'object' && raw !== null ? raw : {}) as RawImportItem;

  const itemid = text(source.itemid);
  const shopid = text(source.shopid);
  const nama = text(source.nama);

  const fail = (message: string): NormalizedImportItem => ({
    ok: false,
    error: { index, itemid, nama, message },
  });

  if (!itemid) return fail('itemid tidak terbaca dari respons Shopee');
  if (!shopid) return fail('shopid tidak terbaca dari respons Shopee');
  if (!nama) return fail('nama produk kosong');

  const harga = parseShopeePrice(source.harga_raw);
  // Ada nilainya tapi tidak bisa dibaca = parsing gagal; tidak ada nilainya
  // sama sekali = info saja, produk tetap disimpan dengan harga 0.
  if (source.harga_raw !== undefined && source.harga_raw !== null && harga === null) {
    return fail('harga tidak bisa dibaca (harga_raw bukan angka)');
  }

  const is_po = isTruthyFlag(source.label_po);

  return {
    ok: true,
    item: {
      marketplace: IMPORT_MARKETPLACE,
      shop_id: shopid,
      item_id_shopee: itemid,
      nama,
      seri: text(source.seri),
      volume: normalizeVolume(source.volume),
      harga,
      is_po,
      // Deadline hanya relevan untuk listing PO (lihat `listings.status`).
      deadline_po: is_po ? normalizeDate(source.deadline_po) : null,
      tanggal_rilis: normalizeDate(source.tanggal_rilis),
      thumbnail: text(source.thumbnail),
      url: text(source.url),
      nama_toko: text(source.nama_toko),
    },
  };
}

/**
 * Terima `{ items: [...] }` maupun array polos, lalu proses tiap elemen
 * sendiri-sendiri. Produk yang gagal dilaporkan, bukan propagated.
 */
export function parseImportPayload(payload: unknown): PayloadParseResult {
  const list = Array.isArray(payload)
    ? payload
    : typeof payload === 'object' &&
        payload !== null &&
        Array.isArray((payload as { items?: unknown }).items)
      ? ((payload as { items: unknown[] }).items)
      : null;

  if (!list) {
    return { ok: false, error: 'Payload harus berupa array produk atau objek dengan key "items".' };
  }

  if (list.length === 0) {
    return { ok: false, error: 'Payload tidak berisi produk untuk diimpor.' };
  }

  if (list.length > MAX_ITEMS_PER_IMPORT) {
    return {
      ok: false,
      error: `Maksimal ${MAX_ITEMS_PER_IMPORT} produk per request (terkirim ${list.length}).`,
    };
  }

  const items: ImportItem[] = [];
  const errors: ImportItemError[] = [];

  list.forEach((raw, index) => {
    try {
      const result = normalizeImportItem(raw, index);

      if (result.ok) {
        items.push(result.item);
      } else {
        errors.push(result.error);
      }
    } catch {
      // Jaring pengaman terakhir: satu elemen dengan struktur aneh tidak boleh
      // menjatuhkan seluruh batch.
      errors.push({
        index,
        itemid: null,
        nama: null,
        message: 'Item tidak bisa diproses (struktur data tidak dikenali).',
      });
    }
  });

  return { ok: true, items, errors };
}

/**
 * Perbandingan token constant-time (tanpa dependency Node supaya modul ini
 * tetap portabel). Panjang berbeda langsung ditolak — itu memang membocorkan
 * panjang token, yang tidak relevan untuk token acak.
 */
export function isImportTokenValid(
  provided: string | null | undefined,
  expected: string | null | undefined
): boolean {
  if (!expected || !provided) return false;
  if (provided.length !== expected.length) return false;

  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }

  return diff === 0;
}

/** Duplikat dalam satu payload: nilai baru menang, kecuali field kosong. */
function mergeImportItem(base: ImportItem, next: ImportItem): ImportItem {
  return {
    ...next,
    harga: next.harga ?? base.harga,
    seri: next.seri ?? base.seri,
    volume: next.volume ?? base.volume,
    deadline_po: next.deadline_po ?? base.deadline_po,
    tanggal_rilis: next.tanggal_rilis ?? base.tanggal_rilis,
    thumbnail: next.thumbnail ?? base.thumbnail,
    url: next.url ?? base.url,
    nama_toko: next.nama_toko ?? base.nama_toko,
  };
}

/**
 * Rencanakan penulisan batch dari produk yang sudah ternormalisasi.
 *
 * Dedup Berlapis:
 * 1. duplikat di dalam payload yang sama digabung jadi satu (dihitung `updated`),
 * 2. kunci yang sudah ada di DB → hanya listing-nya yang di-refresh,
 * 3. kunci baru → item + listing + plan `wishlist` (PRD F5).
 *
 * Semua id dibuat di sini supaya pemetaan `plan.listing_id` tidak bergantung
 * pada urutan baris yang dikembalikan PostgREST.
 */
export function planImport(
  items: readonly ImportItem[],
  options: PlanImportOptions = {}
): ImportPlan {
  const existing = options.existing ?? new Map<string, ExistingListing>();
  const newId = options.newId ?? (() => crypto.randomUUID());
  const now = options.now ?? (() => new Date().toISOString());

  const merged = new Map<string, ImportItem>();
  let duplicatesInBatch = 0;

  for (const item of items) {
    const key = listingKey(item);
    const previous = merged.get(key);

    if (previous) {
      duplicatesInBatch++;
      merged.set(key, mergeImportItem(previous, item));
      continue;
    }

    merged.set(key, item);
  }

  const plan: ImportPlan = {
    newItems: [],
    newListings: [],
    updatedListings: [],
    newPlans: [],
    created: 0,
    updated: duplicatesInBatch,
  };

  for (const [key, item] of merged) {
    const known = existing.get(key);
    const timestamp = now();
    const status: ListingStatus = item.is_po ? 'po' : 'ready';

    const listing: PlannedListing = {
      id: known?.listing_id ?? newId(),
      item_id: known?.item_id ?? newId(),
      marketplace: item.marketplace,
      shop_id: item.shop_id,
      item_id_shopee: item.item_id_shopee,
      nama_toko: item.nama_toko ?? known?.nama_toko ?? null,
      url: item.url ?? known?.url ?? null,
      // Harga/deadline lama dipertahankan bila payload tidak membawanya —
      // re-import tidak boleh menghapus data yang sudah benar.
      harga: item.harga ?? known?.harga ?? 0,
      status,
      deadline_po: item.is_po ? (item.deadline_po ?? known?.deadline_po ?? null) : null,
      tanggal_rilis: item.tanggal_rilis ?? known?.tanggal_rilis ?? null,
      updated_at: timestamp,
    };

    if (known) {
      plan.updatedListings.push(listing);
      plan.updated++;
      continue;
    }

    plan.newItems.push({
      id: listing.item_id,
      judul: item.nama,
      seri: item.seri,
      volume: item.volume,
      cover_url: item.thumbnail,
      created_at: timestamp,
      updated_at: timestamp,
    });
    plan.newListings.push(listing);
    plan.newPlans.push({
      id: newId(),
      item_id: listing.item_id,
      listing_id: listing.id,
      prioritas: IMPORT_DEFAULT_PRIORITY,
      estimasi_harga: item.harga ?? 0,
      status: 'wishlist',
      deadline_po: null,
      created_at: timestamp,
      updated_at: timestamp,
    });
    plan.created++;
  }

  return plan;
}
