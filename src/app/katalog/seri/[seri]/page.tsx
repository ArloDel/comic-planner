import React from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/layout/AppShell';
import { SeriClient } from './SeriClient';
import { mapItemsWithDetails, type ItemRowWithRelations } from '@/lib/catalog';

interface SeriPageProps {
  params: Promise<{
    seri: string;
  }>;
}

export async function generateMetadata({ params }: SeriPageProps) {
  const { seri } = await params;
  const decodedSeri = decodeURIComponent(seri);
  return {
    title: `Seri: ${decodedSeri} — ComicPlan`,
    description: `Tracker volume dan koleksi komik untuk seri ${decodedSeri}`,
  };
}

export default async function SeriPage({ params }: SeriPageProps) {
  const { seri } = await params;
  const decodedSeri = decodeURIComponent(seri);

  let userEmail: string | null = null;
  let items: ReturnType<typeof mapItemsWithDetails> = [];
  let publisher: string | null = null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    userEmail = user?.email || null;

    if (user) {
      const { data: dbItems } = await supabase
        .from('items')
        .select(
          'id, judul, seri, volume, penerbit, tipe, cover_url, created_at, updated_at, plans(id, status, estimasi_harga)'
        )
        .eq('seri', decodedSeri)
        .order('volume', { ascending: true, nullsFirst: false })
        .returns<ItemRowWithRelations[]>();

      items = mapItemsWithDetails(dbItems ?? []);
    } else {
      const admin = createAdminClient();
      const { data: dbItems } = await admin
        .from('items')
        .select(
          'id, judul, seri, volume, penerbit, tipe, cover_url, created_at, updated_at, plans(id, status)'
        )
        .eq('seri', decodedSeri)
        .order('volume', { ascending: true, nullsFirst: false })
        .returns<ItemRowWithRelations[]>();

      items = mapItemsWithDetails(dbItems ?? []);
    }

    publisher = items.find((item) => item.penerbit)?.penerbit ?? null;
  } catch (err) {
    console.error('Database connection error in SeriPage:', err);
  }

  return (
    <AppShell
      userEmail={userEmail}
      pageTitle={`Seri: ${decodedSeri}`}
      pageSubtitle={`Tracker progres volume seri ${decodedSeri}`}
    >
      <SeriClient
        seriName={decodedSeri}
        penerbit={publisher}
        items={items}
        readOnly={!userEmail}
      />
    </AppShell>
  );
}
