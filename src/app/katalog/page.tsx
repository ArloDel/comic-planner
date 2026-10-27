import React from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/layout/AppShell';
import { KatalogClient } from './KatalogClient';
import { mapItemsWithDetails, type ItemRowWithRelations } from '@/lib/catalog';

export const metadata = {
  title: 'Katalog Komik — ComicPlan',
  description: 'Daftar koleksi komik dan manga dengan status perolehan real-time',
};

export default async function KatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; tipe?: string; sort?: string }>;
}) {
  const params = await searchParams;
  let userEmail: string | null = null;
  let formattedItems: ReturnType<typeof mapItemsWithDetails> = [];

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    userEmail = user?.email || null;

    if (user) {
      const { data: items } = await supabase
        .from('items')
        .select(
          'id, judul, seri, volume, penerbit, tipe, cover_url, created_at, updated_at, plans(id, status, estimasi_harga), listings(harga)'
        )
        .order('created_at', { ascending: false })
        .returns<ItemRowWithRelations[]>();

      formattedItems = mapItemsWithDetails(items ?? []);
    } else {
      const admin = createAdminClient();
      const { data: items } = await admin
        .from('items')
        .select(
          'id, judul, seri, volume, penerbit, tipe, cover_url, created_at, updated_at, plans(id, status)'
        )
        .order('created_at', { ascending: false })
        .returns<ItemRowWithRelations[]>();

      formattedItems = mapItemsWithDetails(items ?? []);
    }
  } catch (err) {
    console.error('Error loading katalog items:', err);
  }

  return (
    <AppShell
      userEmail={userEmail}
      pageTitle="Katalog Komik"
      pageSubtitle={
        userEmail
          ? 'Kelola dan cari seluruh judul komik, manga, dan status perolehan Anda'
          : 'Showcase publik koleksi komik, manga, dan status perolehan (hanya baca)'
      }
    >
      <KatalogClient
        initialItems={formattedItems}
        initialFilters={params}
        readOnly={!userEmail}
      />
    </AppShell>
  );
}
