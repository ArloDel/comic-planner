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
import { calculateCommitment, summarizePayments, type PaymentRow } from '@/lib/plans';

export const metadata = {
  title: 'Rencana Belanja — ComicPlan',
  description:
    'Kelola rencana pembelian komik: alur status Wishlist, PO, DP, Lunas, Diterima, sampai Batal',
};

/** Bentuk baris hasil select relasional (PostgREST selalu balikin array). */
interface PlanRowWithRelations {
  id: string;
  item_id: string;
  listing_id: string | null;
  prioritas: number | null;
  estimasi_harga: number | null;
  status: string;
  deadline_po: string | null;
  created_at: string;
  updated_at: string;
  items: {
    id: string;
    judul: string;
    seri: string | null;
    volume: number | null;
    cover_url: string | null;
    tipe: string | null;
  }[] | null;
  listings: {
    id: string;
    marketplace: string;
    nama_toko: string | null;
    url: string | null;
    harga: number | null;
    deadline_po: string | null;
    status: string;
  }[] | null;
}

interface ItemRowWithListings {
  id: string;
  judul: string;
  seri: string | null;
  volume: number | null;
  listings: {
    id: string;
    marketplace: string;
    nama_toko: string | null;
    url: string | null;
    harga: number | null;
    deadline_po: string | null;
    status: string;
  }[] | null;
}

interface HistoryRow {
  plan_id: string;
  status_lama: string | null;
  status_baru: string;
  changed_at: string;
}

/** Relasi dari select PostgREST selalu berupa array; ambil elemen pertama. */
function firstOrNull<T>(value: T[] | null | undefined): T | null {
  return value?.[0] ?? null;
}

export default async function PlansPage() {
  let userEmail: string | null = null;
  let plans: PlanWithDetails[] = [];
  let items: PlanItemOption[] = [];
  let commitment = 0;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    userEmail = user?.email ?? null;

    const { data: planRows } = await supabase
      .from('plans')
      .select(
        'id, item_id, listing_id, prioritas, estimasi_harga, status, deadline_po, created_at, updated_at, items(id, judul, seri, volume, cover_url, tipe), listings(id, marketplace, nama_toko, url, harga, deadline_po, status)'
      )
      .order('prioritas', { ascending: true })
      .order('created_at', { ascending: false })
      .returns<PlanRowWithRelations[]>();

    const planIds = (planRows ?? []).map((plan) => plan.id);

    // Riwayat & transaksi diambil sekali untuk semua plan, lalu dikelompokkan,
    // supaya tidak ada query per plan (N+1).
    const [{ data: historyRows }, { data: transactionRows }] = await Promise.all([
      planIds.length
        ? supabase
            .from('status_history')
            .select('plan_id, status_lama, status_baru, changed_at')
            .in('plan_id', planIds)
            .order('changed_at', { ascending: false })
            .returns<HistoryRow[]>()
        : Promise.resolve({ data: [] as HistoryRow[] }),
      planIds.length
        ? supabase
            .from('transactions')
            .select('plan_id, jumlah, jenis')
            .in('plan_id', planIds)
            .returns<PaymentRow[]>()
        : Promise.resolve({ data: [] as PaymentRow[] }),
    ]);

    const { data: itemRows } = await supabase
      .from('items')
      .select('id, judul, seri, volume, listings(id, marketplace, nama_toko, url, harga, deadline_po, status)')
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

    const dibayar = summarizePayments(transactionRows ?? []);

    plans = (planRows ?? []).map((row) => {
      const item = firstOrNull(row.items);
      const listing = firstOrNull(row.listings);

      return {
        id: row.id,
        item_id: row.item_id,
        listing_id: row.listing_id,
        prioritas: Number(row.prioritas ?? 3),
        estimasi_harga: Number(row.estimasi_harga ?? 0),
        status: row.status as PlanWithDetails['status'],
        deadline_po: row.deadline_po ?? null,
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
              deadline_po: listing.deadline_po,
              status: listing.status as PlanListingRef['status'],
            } satisfies PlanListingRef)
          : null,
        history: historyByPlan.get(row.id) ?? [],
        sudah_dibayar: dibayar[row.id] ?? 0,
      } satisfies PlanWithDetails;
    });

    // Rumus komitmen (dipakai juga F4): Σ (estimasi − sudah dibayar) atas
    // plan po/dp. Plan batal tidak termasuk, jadi hold-nya lepas reaktif.
    commitment = calculateCommitment(
      plans.map((plan) => ({
        id: plan.id,
        status: plan.status,
        estimasi_harga: plan.estimasi_harga,
      })),
      dibayar
    );

    // Opsi item untuk form "Tambah Rencana". Estimasi diambil dari plan aktif
    // item tersebut supaya form bisa pre-fill harga.
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
        deadline_po: listing.deadline_po,
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
      pageSubtitle="Alur status Wishlist → PO → DP → Lunas → Diterima, dengan riwayat tiap perubahan"
    >
      <PlansClient initialPlans={plans} items={items} commitment={commitment} />
    </AppShell>
  );
}