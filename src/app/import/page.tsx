import React from 'react';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { redirect } from 'next/navigation';
import { Clock, Download, Package, Store } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { StatCard } from '@/components/ui/StatCard';
import { asArray } from '@/lib/supabase/embed';
import { createClient } from '@/lib/supabase/server';
import { formatTanggalJam } from '@/lib/format';
import { maskSecretToken } from '@/lib/settings';
import type { ListingStatus } from '@/types/database';
import { ImportClient, type ImportedListingItem } from './ImportClient';

export const metadata = {
  title: 'Impor Shopee — ComicPlan',
  description: 'Panduan userscript Tampermonkey, token koneksi, dan riwayat produk Shopee terimpor',
};

interface ListingItemEmbed {
  id: string;
  judul: string;
  seri: string | null;
  volume: number | null;
  cover_url: string | null;
}

interface ListingRowWithItem {
  id: string;
  item_id: string;
  shop_id: string;
  item_id_shopee: string;
  nama_toko: string | null;
  url: string | null;
  harga: number | null;
  status: ListingStatus;
  deadline_po: string | null;
  updated_at: string;
  items: ListingItemEmbed | ListingItemEmbed[] | null;
}

async function readUserscriptFile(): Promise<string | null> {
  try {
    const filePath = path.join(process.cwd(), 'userscript', 'comicplan-import.user.js');
    return await readFile(filePath, 'utf8');
  } catch {
    return null;
  }
}

export default async function ImportPage() {
  let userEmail: string | null = null;
  let listings: ImportedListingItem[] = [];

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    userEmail = user?.email ?? null;

    const { data: rows } = await supabase
      .from('listings')
      .select(
        'id, item_id, shop_id, item_id_shopee, nama_toko, url, harga, status, deadline_po, updated_at, items(id, judul, seri, volume, cover_url)'
      )
      .order('updated_at', { ascending: false })
      .limit(100)
      .returns<ListingRowWithItem[]>();

    listings = (rows ?? []).map((row) => {
      const item = asArray(row.items)[0];
      return {
        id: row.id,
        item_id: row.item_id,
        judul: item?.judul ?? 'Produk tanpa judul',
        seri: item?.seri ?? null,
        volume: item?.volume ?? null,
        cover_url: item?.cover_url ?? null,
        shop_id: row.shop_id,
        item_id_shopee: row.item_id_shopee,
        nama_toko: row.nama_toko,
        url: row.url,
        harga: Number(row.harga ?? 0),
        status: row.status,
        deadline_po: row.deadline_po,
        updated_at: row.updated_at,
      };
    });
  } catch (err) {
    console.error('Error loading import page:', err);
  }

  if (!userEmail) {
    redirect('/login');
  }

  const rawToken = process.env.IMPORT_TOKEN?.trim() || null;
  const maskedToken = maskSecretToken(rawToken);
  const userscriptSource = await readUserscriptFile();

  const poCount = listings.filter((l) => l.status === 'po').length;
  const readyCount = listings.length - poCount;
  const uniqueShops = new Set(listings.map((l) => l.shop_id)).size;
  const lastSync = listings[0]?.updated_at ?? null;

  return (
    <AppShell
      userEmail={userEmail}
      pageTitle="Impor Shopee"
      pageSubtitle="Sinkronisasi katalog & status PO sekali klik lewat userscript Tampermonkey"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard
            label="Total Listing"
            value={listings.length}
            icon={<Download className="h-4 w-4" />}
            iconTone="primary"
          >
            <p className="text-[11px] text-slate-500">Produk Shopee tersinkron</p>
          </StatCard>

          <StatCard
            label="Listing PO"
            value={poCount}
            icon={<Clock className="h-4 w-4" />}
            iconTone="amber"
          >
            <p className="text-[11px] text-slate-500">{readyCount} produk berstatus Ready</p>
          </StatCard>

          <StatCard
            label="Toko Terlacak"
            value={uniqueShops}
            icon={<Store className="h-4 w-4" />}
            iconTone="emerald"
          >
            <p className="text-[11px] text-slate-500">Unik berdasarkan shop_id</p>
          </StatCard>

          <StatCard
            label="Sinkron Terakhir"
            value={lastSync ? formatTanggalJam(lastSync) : 'Belum ada'}
            icon={<Package className="h-4 w-4" />}
            iconTone="sky"
          >
            <p className="text-[11px] text-slate-500">Waktu update listing terbaru</p>
          </StatCard>
        </div>

        <ImportClient
          importToken={rawToken}
          maskedToken={maskedToken}
          userscriptSource={userscriptSource}
          listings={listings}
        />
      </div>
    </AppShell>
  );
}
