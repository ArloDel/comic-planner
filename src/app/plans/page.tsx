import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/layout/AppShell';
import {
  PlansClient,
  type PlanItemOption,
  type PlanItemRef,
  type PlanListingRef,
  type PlanWithDetails,
} from './PlansClient';
import {
  isPlanStatus,
  type PlanSortBy,
  type PlanStatus,
} from '@/lib/plans';
import { asArray } from '@/lib/supabase/embed';

export const metadata = {
  title: 'Rencana Belanja — ComicPlan',
  description:
    'Kelola rencana pembelian komik: alur status Wishlist, Sedang Dikirim, Selesai, sampai Batal',
};

interface PlanItemEmbed {
  id: string;
  judul: string;
  seri: string | null;
  volume: number | null;
  cover_url: string | null;
  tipe: string | null;
}

interface PlanListingEmbed {
  id: string;
  marketplace: string;
  nama_toko: string | null;
  url: string | null;
  harga: number | null;
  status: string;
}

/** Bentuk baris hasil select relasional; embed ditulis `T | T[] | null` (lihat `asArray`). */
interface PlanRowWithRelations {
  id: string;
  item_id: string;
  listing_id: string | null;
  prioritas: number | null;
  estimasi_harga: number | null;
  status: string;
  created_at: string;
  updated_at: string;
  items: PlanItemEmbed | PlanItemEmbed[] | null;
  listings: PlanListingEmbed | PlanListingEmbed[] | null;
}

interface ItemRowWithListings {
  id: string;
  judul: string;
  seri: string | null;
  volume: number | null;
  listings: PlanListingEmbed[] | null;
}

interface HistoryRow {
  plan_id: string;
  status_lama: string | null;
  status_baru: string;
  changed_at: string;
}

function parsePlanStatusFilter(raw?: string): PlanStatus | 'semua' {
  if (raw === 'dikirim') return 'po';
  if (raw && isPlanStatus(raw)) return raw;
  return 'semua';
}

function parsePlanSortBy(raw?: string): PlanSortBy {
  if (raw === 'terbaru' || raw === 'prioritas') {
    return raw;
  }
  return 'prioritas';
}

export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; sort?: string }>;
}) {
  const { q: rawQ, status: rawStatus, sort: rawSort } = await searchParams;
  const initialSearch = rawQ ?? '';
  const initialStatus = parsePlanStatusFilter(rawStatus);
  const initialSort = parsePlanSortBy(rawSort);

  let userEmail: string | null = null;
  let plans: PlanWithDetails[] = [];
  let items: PlanItemOption[] = [];

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    userEmail = user?.email ?? null;

    const { data: planRows } = await supabase
      .from('plans')
      .select(
        'id, item_id, listing_id, prioritas, estimasi_harga, status, created_at, updated_at, items(id, judul, seri, volume, cover_url, tipe), listings(id, marketplace, nama_toko, url, harga, status)'
      )
      .order('prioritas', { ascending: true })
      .order('created_at', { ascending: false })
      .returns<PlanRowWithRelations[]>();

    const planIds = (planRows ?? []).map((plan) => plan.id);

    const { data: historyRows } = planIds.length
      ? await supabase
          .from('status_history')
          .select('plan_id, status_lama, status_baru, changed_at')
          .in('plan_id', planIds)
          .order('changed_at', { ascending: false })
          .returns<HistoryRow[]>()
      : { data: [] as HistoryRow[] };

    const { data: itemRows } = await supabase
      .from('items')
      .select('id, judul, seri, volume, listings(id, marketplace, nama_toko, url, harga, status)')
      .order('judul', { ascending: true })
      .returns<ItemRowWithListings[]>();

    const historyByPlan = new Map<string, PlanWithDetails['history']>();
    for (const row of historyRows ?? []) {
      const list = historyByPlan.get(row.plan_id) ?? [];
      list.push({
        status_lama: row.status_lama,
        status_baru: row.status_baru,
        changed_at: row.changed_at,
      });
      historyByPlan.set(row.plan_id, list);
    }

    plans = (planRows ?? []).map((row) => {
      const item = asArray(row.items)[0];
      const listing = asArray(row.listings)[0];

      return {
        id: row.id,
        item_id: row.item_id,
        listing_id: row.listing_id,
        prioritas: Number(row.prioritas ?? 3),
        estimasi_harga: Number(row.estimasi_harga ?? 0),
        status: row.status as PlanWithDetails['status'],
        created_at: row.created_at,
        updated_at: row.updated_at,
        item: item
          ? {
              id: item.id,
              judul: item.judul,
              seri: item.seri,
              volume: item.volume,
              cover_url: item.cover_url,
              tipe: item.tipe as PlanItemRef['tipe'],
            }
          : null,
        listing: listing
          ? ({
              id: listing.id,
              marketplace: listing.marketplace,
              nama_toko: listing.nama_toko,
              url: listing.url,
              harga: Number(listing.harga ?? 0),
              status: listing.status as PlanListingRef['status'],
            } satisfies PlanListingRef)
          : null,
        history: historyByPlan.get(row.id) ?? [],
      } satisfies PlanWithDetails;
    });

    const activePlanByItem = new Map<string, PlanWithDetails>();
    for (const plan of plans) {
      if (plan.status === 'batal') continue;

      const current = activePlanByItem.get(plan.item_id);
      if (!current || plan.prioritas < current.prioritas) {
        activePlanByItem.set(plan.item_id, plan);
      }
    }

    items = (itemRows ?? []).map((row) => {
      const listings: PlanListingRef[] = (row.listings ?? []).map((listing) => ({
        id: listing.id,
        marketplace: listing.marketplace,
        nama_toko: listing.nama_toko,
        url: listing.url,
        harga: Number(listing.harga ?? 0),
        status: listing.status as PlanListingRef['status'],
      }));

      return {
        id: row.id,
        judul: row.judul,
        seri: row.seri,
        volume: row.volume,
        listings,
        estimasi_harga: activePlanByItem.get(row.id)?.estimasi_harga,
      } satisfies PlanItemOption;
    });
  } catch (err) {
    console.error('Error loading plans:', err);
  }

  return (
    <AppShell
      userEmail={userEmail}
      pageTitle="Rencana Belanja"
      pageSubtitle="Alur status Wishlist → Sedang Dikirim → Selesai, dengan riwayat tiap perubahan"
    >
      <PlansClient
        initialPlans={plans}
        items={items}
        initialSearch={initialSearch}
        initialStatus={initialStatus}
        initialSort={initialSort}
      />
    </AppShell>
  );
}
