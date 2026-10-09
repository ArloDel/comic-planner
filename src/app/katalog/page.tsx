import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/layout/AppShell';
import { KatalogClient } from './KatalogClient';
import { mapItemsWithDetails, type ItemRowWithRelations } from '@/lib/catalog';

export const metadata = {
  title: 'Katalog Komik — ComicPlan',
  description: 'Daftar koleksi komik dan manga dengan status perolehan real-time',
};

export default async function KatalogPage() {
  let userEmail: string | null = null;
  let formattedItems: ReturnType<typeof mapItemsWithDetails> = [];

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    userEmail = user?.email || null;

    const { data: items, error } = await supabase
      .from('items')
      .select(
        'id, judul, seri, volume, penerbit, tipe, cover_url, created_at, updated_at, plans(id, status, estimasi_harga), listings(harga)'
      )
      .order('created_at', { ascending: false })
      .returns<ItemRowWithRelations[]>();

    if (error) {
      console.error('Error loading katalog items:', error);
    } else if (items) {
      formattedItems = mapItemsWithDetails(items);
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
