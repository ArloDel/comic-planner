import type { ItemType, PlanStatus } from '@/types/database';
import { asArray } from '@/lib/supabase/embed';

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

function cheapestListingPrice(listings: ItemRowWithRelations['listings']): number | null {
  const prices = (listings ?? [])
    .map((listing) => Number(listing.harga))
    .filter((harga) => Number.isFinite(harga) && harga > 0);

  return prices.length > 0 ? Math.min(...prices) : null;
}
