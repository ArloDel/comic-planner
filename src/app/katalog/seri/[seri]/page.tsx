import React from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/layout/AppShell';
import { SeriClient } from './SeriClient';
import type { ExtendedStatus } from '@/components/ui/StatusPill';
import type { KatalogItemWithDetails } from '@/app/katalog/KatalogClient';

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
  let items: KatalogItemWithDetails[] = [];
  let publisher: string | null = null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    userEmail = user?.email || null;

    // Fetch items matching this series
    const { data: dbItems, error } = await (supabase as any)
      .from('items')
      .select('*, plans(id, status, estimasi_harga)')
      .eq('seri', decodedSeri)
      .order('volume', { ascending: true, nullsFirst: false });

    if (error) {
      console.error('Error fetching series items:', error);
    } else if (dbItems) {
      items = dbItems.map((item: any) => {
        const plans = Array.isArray(item.plans) ? item.plans : item.plans ? [item.plans] : [];
        const activePlan = plans.find((p: any) => p.status !== 'batal') || plans[0];

        const plan_status: ExtendedStatus = (activePlan?.status as ExtendedStatus) || 'belum ada';
        const estimasi_harga =
          activePlan?.estimasi_harga !== undefined && activePlan?.estimasi_harga !== null
            ? Number(activePlan.estimasi_harga)
            : undefined;

        if (!publisher && item.penerbit) {
          publisher = item.penerbit;
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
        };
      });
    }
  } catch (err) {
    console.error('Database connection error in SeriPage:', err);
  }

  return (
    <AppShell
      userEmail={userEmail}
      pageTitle={`Seri: ${decodedSeri}`}
      pageSubtitle={`Tracker progres volume seri ${decodedSeri}`}
    >
      <SeriClient seriName={decodedSeri} penerbit={publisher} items={items} />
    </AppShell>
  );
}
