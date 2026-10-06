import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

import {
  IMPORT_MARKETPLACE,
  isImportTokenValid,
  listingKey,
  parseImportPayload,
  planImport,
  type ExistingListing,
} from '@/lib/import';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/import — endpoint impor produk Shopee (PRD F5).
 *
 * Dipanggil userscript Tampermonkey (TASK-006) dengan header `X-Import-Token`.
 * Autentikasi memakai token yang sama dengan env `IMPORT_TOKEN`, bukan sesi
 * Supabase, karena userscript berjalan di origin Shopee dan tidak punya cookie
 * aplikasi. Token hanya memberi hak MENULIS lewat upsert — tidak ada endpoint
 * baca yang memakainya, jadi kebocoran token tidak membuka isi koleksi.
 *
 * Semua aturan parsing & dedup ada di `src/lib/import.ts` (murni, teruji);
 * file ini hanya menangani I/O.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type AdminClient = ReturnType<typeof createAdminClient>;

interface ExistingListingRow {
  id: string;
  item_id: string;
  shop_id: string;
  item_id_shopee: string;
  harga: number | null;
  deadline_po: string | null;
  nama_toko: string | null;
  url: string | null;
  tanggal_rilis: string | null;
}

/** Potongan id agar query `.in()` tidak melewati batas URL PostgREST. */
const LOOKUP_CHUNK_SIZE = 100;

/**
 * Satu roundtrip per 100 id — bukan satu per item. Peta hasil dipakai
 * `planImport` untuk membedakan produk baru dari produk yang sudah ada.
 */
async function findExistingListings(
  supabase: AdminClient,
  itemIds: readonly string[]
): Promise<Map<string, ExistingListing>> {
  const existing = new Map<string, ExistingListing>();
  const uniqueIds = Array.from(new Set(itemIds));

  for (let i = 0; i < uniqueIds.length; i += LOOKUP_CHUNK_SIZE) {
    const chunk = uniqueIds.slice(i, i + LOOKUP_CHUNK_SIZE);

    const { data, error } = await supabase
      .from('listings')
      .select('id, item_id, shop_id, item_id_shopee, harga, deadline_po, nama_toko, url, tanggal_rilis')
      .eq('marketplace', IMPORT_MARKETPLACE)
      .in('item_id_shopee', chunk)
      .returns<ExistingListingRow[]>();

    if (error) {
      throw new Error(`Gagal membaca listing yang sudah ada: ${error.message}`);
    }

    for (const row of data ?? []) {
      existing.set(
        listingKey({
          marketplace: IMPORT_MARKETPLACE,
          shop_id: row.shop_id,
          item_id_shopee: row.item_id_shopee,
        }),
        {
          listing_id: row.id,
          item_id: row.item_id,
          harga: Number(row.harga ?? 0),
          deadline_po: row.deadline_po,
          nama_toko: row.nama_toko,
          url: row.url,
          tanggal_rilis: row.tanggal_rilis,
        }
      );
    }
  }

  return existing;
}

export async function POST(request: Request) {
  const expectedToken = process.env.IMPORT_TOKEN;

  if (!expectedToken) {
    return NextResponse.json(
      { error: 'IMPORT_TOKEN belum dikonfigurasi di server.' },
      { status: 500 }
    );
  }

  if (!isImportTokenValid(request.headers.get('x-import-token'), expectedToken)) {
    return NextResponse.json({ error: 'Token import tidak valid.' }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body harus berupa JSON yang valid.' }, { status: 400 });
  }

  const parsed = parseImportPayload(payload);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();

    const existing = await findExistingListings(
      supabase,
      parsed.items.map((item) => item.item_id_shopee)
    );

    const plan = planImport(parsed.items, { existing });

    // Empat statement, bukan satu per item — 50 produk tetap di bawah 3 detik.
    if (plan.newItems.length) {
      const { error } = await supabase.from('items').insert(plan.newItems);
      if (error) throw new Error(`Gagal menyimpan item baru: ${error.message}`);
    }

    if (plan.newListings.length) {
      const { error } = await supabase.from('listings').insert(plan.newListings);
      if (error) throw new Error(`Gagal menyimpan listing baru: ${error.message}`);
    }

    if (plan.updatedListings.length) {
      // `onConflict` memakai unique key yang sama dengan migrasi awal, jadi
      // re-import pasti mendarat di baris yang sama — tidak pernah duplikat.
      const { error } = await supabase
        .from('listings')
        .upsert(plan.updatedListings, { onConflict: 'marketplace,shop_id,item_id_shopee' });

      if (error) throw new Error(`Gagal memperbarui listing: ${error.message}`);
    }

    if (plan.newPlans.length) {
      const { error } = await supabase.from('plans').insert(plan.newPlans);
      if (error) throw new Error(`Gagal membuat rencana pembelian: ${error.message}`);
    }

    revalidatePath('/');
    revalidatePath('/katalog');
    revalidatePath('/plans');

    return NextResponse.json({
      created: plan.created,
      updated: plan.updated,
      skipped: parsed.errors.length,
      errors: parsed.errors,
    });
  } catch (err) {
    const message =
      err instanceof Error && err.message
        ? err.message
        : 'Terjadi kesalahan sistem saat menyimpan hasil impor.';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
