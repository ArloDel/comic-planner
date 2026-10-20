import type { ItemType, PlanStatus } from '@/types/database';
import { asArray } from './supabase/embed.ts';

/**
 * Normalisasi baris `items` + embed `plans`/`listings` dari PostgREST menjadi
 * bentuk yang dipakai kartu katalog. Satu-satunya tempat pemetaan ini, dipakai
 * `/katalog` dan `/katalog/seri/[seri]` supaya keduanya tidak bisa melenceng.
 */
export interface ItemRowWithRelations {
  id: string;
  judul: string;
  seri: string | null;
  volume: number | null;
  penerbit: string | null;
  tipe: ItemType | null;
  cover_url: string | null;
  created_at: string;
  updated_at: string;
  plans: PlanEmbed[] | PlanEmbed | null;
  listings?: { harga: number | null }[] | null;
}

interface PlanEmbed {
  id: string;
  status: string;
  estimasi_harga: number | null;
}

/** Status item di UI: status plan aktif, atau `belum ada` bila item belum punya plan. */
export type ExtendedStatus = PlanStatus | 'belum ada';

export interface KatalogItemWithDetails {
  id: string;
  judul: string;
  seri: string | null;
  volume: number | null;
  penerbit: string | null;
  tipe: ItemType | null;
  cover_url: string | null;
  created_at: string;
  updated_at: string;
  plan_status: ExtendedStatus;
  estimasi_harga?: number;
  listing_harga?: number | null;
}

export function mapItemWithDetails(row: ItemRowWithRelations): KatalogItemWithDetails {
  const plans = asArray(row.plans);
  // Plan `batal` tidak mewakili kondisi sebenarnya item, jadi diabaikan bila
  // ada plan lain yang masih aktif.
  const activePlan = plans?.find((plan) => plan.status !== 'batal') ?? plans?.[0];

  return {
    id: row.id,
    judul: row.judul,
    seri: row.seri,
    volume: row.volume,
    penerbit: row.penerbit,
    tipe: row.tipe,
    cover_url: row.cover_url,
    created_at: row.created_at,
    updated_at: row.updated_at,
    plan_status: (activePlan?.status as ExtendedStatus) || 'belum ada',
    estimasi_harga:
      activePlan?.estimasi_harga != null ? Number(activePlan.estimasi_harga) : undefined,
    listing_harga: cheapestListingPrice(row.listings),
  };
}

export function mapItemsWithDetails(rows: ItemRowWithRelations[]): KatalogItemWithDetails[] {
  return rows.map(mapItemWithDetails);
}

export interface SeriesSummary {
  seri: string;
  totalVolumes: number;
  ownedVolumes: number;
}

/**
 * Ringkas daftar seri unik dari item katalog, diurutkan dari jumlah volume
 * terbanyak lalu alfabetis (id).
 */
export function summarizeSeries(
  items: Pick<KatalogItemWithDetails, 'seri' | 'plan_status'>[]
): SeriesSummary[] {
  const bySeries = new Map<string, SeriesSummary>();

  for (const item of items) {
    const seri = item.seri?.trim();
    if (!seri) continue;

    const existing = bySeries.get(seri) ?? { seri, totalVolumes: 0, ownedVolumes: 0 };
    existing.totalVolumes += 1;
    if (item.plan_status === 'diterima') {
      existing.ownedVolumes += 1;
    }
    bySeries.set(seri, existing);
  }

  return Array.from(bySeries.values()).sort(
    (a, b) => b.totalVolumes - a.totalVolumes || a.seri.localeCompare(b.seri, 'id')
  );
}

function cheapestListingPrice(listings: ItemRowWithRelations['listings']): number | null {
  const prices = (listings ?? [])
    .map((listing) => Number(listing.harga))
    .filter((harga) => Number.isFinite(harga) && harga > 0);

  return prices.length > 0 ? Math.min(...prices) : null;
}
