import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/layout/AppShell';
import { KatalogClient, type KatalogItemWithDetails } from './KatalogClient';
import type { ExtendedStatus } from '@/components/ui/StatusPill';

export const metadata = {
  title: 'Katalog Komik — ComicPlan',
  description: 'Daftar koleksi komik dan manga dengan status perolehan real-time',
};

export default async function KatalogPage() {
  let userEmail: string | null = null;
  let formattedItems: KatalogItemWithDetails[] = [];

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    userEmail = user?.email || null;

    // Fetch items with associated plans and listings
    const { data: items, error } = await (supabase as any)
      .from('items')
      .select('*, plans(id, status, estimasi_harga), listings(harga)')
      .order('created_at', { ascending: false });

    if (!error && items) {
      formattedItems = items.map((item: any) => {
        const plans = Array.isArray(item.plans) ? item.plans : item.plans ? [item.plans] : [];
        const activePlan = plans.find((p: any) => p.status !== 'batal') || plans[0];

        const plan_status: ExtendedStatus = (activePlan?.status as ExtendedStatus) || 'belum ada';
        const estimasi_harga =
          activePlan?.estimasi_harga !== undefined && activePlan?.estimasi_harga !== null
            ? Number(activePlan.estimasi_harga)
            : undefined;

        let listing_harga: number | null = null;
        if (Array.isArray(item.listings) && item.listings.length > 0) {
          const prices = item.listings
            .map((l: any) => Number(l.harga))
            .filter((h: number) => !isNaN(h) && h > 0);
          if (prices.length > 0) {
            listing_harga = Math.min(...prices);
          }
        }

        return {
          id: item.id,
          judul: item.judul,
          seri: item.seri,
          volume: item.volume,
          penerbit: item.penerbit,
          tipe: item.tipe,
          cover_url: item.cover_url,
          created_at: item.created_at,
          updated_at: item.updated_at,
          plan_status,
          estimasi_harga,
          listing_harga,
        };
      });
    }
  } catch (err) {
    console.error('Error loading katalog items:', err);
  }

  return (
    <AppShell
      userEmail={userEmail}
      pageTitle="Katalog Komik"
      pageSubtitle="Kelola dan cari seluruh judul komik, manga, dan status perolehan Anda"
    >
      <KatalogClient initialItems={formattedItems} />
    </AppShell>
  );
}
