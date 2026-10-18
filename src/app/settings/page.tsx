import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { createClient } from '@/lib/supabase/server';
import { currentPeriode, shiftPeriode } from '@/lib/budget';
import {
  maskSecretToken,
  summarizeTrackedShops,
  type TrackedShopSummary,
} from '@/lib/settings';
import { SettingsClient, type BackupDataPayload } from './SettingsClient';

export const metadata = {
  title: 'Pengaturan — ComicPlan',
  description: 'Pengaturan akun single-user, token impor, budget bulanan, toko Shopee, dan backup CSV/JSON',
};

interface ListingSummaryRow {
  id: string;
  item_id: string;
  marketplace: string;
  shop_id: string;
  item_id_shopee: string;
  nama_toko: string | null;
  url: string | null;
  harga: number;
  status: string;
  deadline_po: string | null;
  tanggal_rilis: string | null;
  updated_at: string;
}

export default async function SettingsPage() {
  const periode = currentPeriode();
  const prevPeriode = shiftPeriode(periode, -1);

  const rawToken = process.env.IMPORT_TOKEN?.trim() || null;
  const maskedToken = maskSecretToken(rawToken);
  const allowedEmailConfigured = Boolean(process.env.ALLOWED_USER_EMAIL?.trim());

  let userEmail: string | null = null;
  let currentBudget = 0;
  let prevBudget = 0;
  let shops: TrackedShopSummary[] = [];
  let backupData: BackupDataPayload = {
    exported_at: new Date().toISOString(),
    items: [],
    listings: [],
    plans: [],
    transactions: [],
  };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    userEmail = user?.email ?? null;

    const [
      { data: curBudgetRow },
      { data: prevBudgetRow },
      { data: itemRows },
      { data: listingRows },
      { data: planRows },
      { data: txnRows },
    ] = await Promise.all([
      supabase
        .from('budgets')
        .select('total_budget')
        .eq('periode', `${periode}-01`)
        .maybeSingle(),
      supabase
        .from('budgets')
        .select('total_budget')
        .eq('periode', `${prevPeriode}-01`)
        .maybeSingle(),
      supabase
        .from('items')
        .select('id, judul, seri, volume, penerbit, tipe, cover_url, created_at')
        .order('created_at', { ascending: false }),
      supabase
        .from('listings')
        .select(
          'id, item_id, marketplace, shop_id, item_id_shopee, nama_toko, url, harga, status, deadline_po, tanggal_rilis, updated_at'
        )
        .order('updated_at', { ascending: false })
        .returns<ListingSummaryRow[]>(),
      supabase
        .from('plans')
        .select('id, item_id, listing_id, prioritas, estimasi_harga, status, deadline_po, created_at')
        .order('created_at', { ascending: false }),
      supabase
        .from('transactions')
        .select('id, plan_id, jenis, jumlah, tanggal, catatan, created_at')
        .order('tanggal', { ascending: false }),
    ]);

    currentBudget = Number(curBudgetRow?.total_budget ?? 0);
    prevBudget = Number(prevBudgetRow?.total_budget ?? 0);
    shops = summarizeTrackedShops(listingRows ?? []);

    backupData = {
      exported_at: new Date().toISOString(),
      items: (itemRows ?? []) as Record<string, unknown>[],
      listings: (listingRows ?? []) as unknown as Record<string, unknown>[],
      plans: (planRows ?? []) as Record<string, unknown>[],
      transactions: (txnRows ?? []) as Record<string, unknown>[],
    };
  } catch (err) {
    console.error('Error loading settings page:', err);
  }

  return (
    <AppShell
      userEmail={userEmail}
      pageTitle="Pengaturan"
      pageSubtitle="Kelola akun pemilik, token impor, budget bulanan, toko Shopee, dan ekspor data"
    >
      <SettingsClient
        userEmail={userEmail}
        allowedEmailConfigured={allowedEmailConfigured}
        importToken={rawToken}
        maskedToken={maskedToken}
        periode={periode}
        currentBudget={currentBudget}
        prevBudget={prevBudget}
        shops={shops}
        backupData={backupData}
      />
    </AppShell>
  );
}
