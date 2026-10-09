'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { ItemType, PlanStatus } from '@/types/database';

export interface ItemFormData {
  judul: string;
  seri?: string | null;
  volume?: number | null;
  penerbit?: string | null;
  tipe?: ItemType | null;
  cover_url?: string | null;
  status?: PlanStatus | 'belum ada';
  estimasi_harga?: number | null;
}

export type ItemActionResult = { success: boolean; error?: string; id?: string };

/**
 * Mutasi lewat client sesi user (bukan service role) supaya RLS tetap berlaku —
 * konsisten dengan `plans/actions.ts` dan `budget/actions.ts`. Policy
 * INSERT/UPDATE/DELETE untuk `items` & `plans` ada di
 * `20261005000000_items_crud_policies.sql`.
 */
async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user
    ? { supabase, error: null }
    : { supabase: null, error: 'Sesi tidak valid. Silakan masuk kembali.' };
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

interface SanitizedItem {
  judul: string;
  seri: string | null;
  volume: number | null;
  penerbit: string | null;
  tipe: ItemType | null;
  cover_url: string | null;
}

/** Normalisasi input form: trim string kosong jadi `null`, volume jadi integer. */
function sanitizeItemInput(data: ItemFormData): SanitizedItem {
  const volume =
    typeof data.volume === 'number'
      ? data.volume
      : data.volume
        ? parseInt(String(data.volume), 10) || null
        : null;

  return {
    judul: data.judul?.trim() ?? '',
    seri: data.seri?.trim() || null,
    volume: Number.isFinite(volume) ? volume : null,
    penerbit: data.penerbit?.trim() || null,
    tipe: data.tipe ?? null,
    cover_url: data.cover_url?.trim() || null,
  };
}

function revalidateCatalogViews(seri: string | null) {
  revalidatePath('/katalog');
  if (seri) {
    revalidatePath(`/katalog/seri/${encodeURIComponent(seri)}`);
  }
  revalidatePath('/');
}

export async function createItem(data: ItemFormData): Promise<ItemActionResult> {
  try {
    const { supabase, error: authError } = await requireUser();
    if (!supabase) {
      return { success: false, error: authError };
    }

    const item = sanitizeItemInput(data);
    if (!item.judul) {
      return { success: false, error: 'Judul item wajib diisi' };
    }

    const { data: itemData, error: itemError } = await supabase
      .from('items')
      .insert(item)
      .select('id')
      .single();

    if (itemError) {
      return { success: false, error: `Gagal menambahkan item: ${itemError.message}` };
    }

    // Status selain "belum ada" berarti item langsung punya plan.
    if (data.status && data.status !== 'belum ada') {
      const { error: planError } = await supabase.from('plans').insert({
        item_id: itemData.id,
        status: data.status,
        prioritas: 3,
        estimasi_harga: Number(data.estimasi_harga) || 0,
      });

      if (planError) {
        console.error('Warning: Failed to create initial plan for item', planError);
      }
    }

    revalidateCatalogViews(item.seri);

    return { success: true, id: itemData.id };
  } catch (err) {
    return {
      success: false,
      error: errorMessage(err, 'Terjadi kesalahan sistem saat membuat item'),
    };
  }
}

export async function updateItem(id: string, data: ItemFormData): Promise<ItemActionResult> {
  try {
    const { supabase, error: authError } = await requireUser();
    if (!supabase) {
      return { success: false, error: authError };
    }

    const item = sanitizeItemInput(data);
    if (!item.judul) {
      return { success: false, error: 'Judul item wajib diisi' };
    }

    const { error: itemError } = await supabase
      .from('items')
      .update({ ...item, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (itemError) {
      return { success: false, error: `Gagal mengupdate item: ${itemError.message}` };
    }

    if (data.status !== undefined) {
      await syncPlanStatus(supabase, id, data.status, Number(data.estimasi_harga) || 0);
    }

    revalidateCatalogViews(item.seri);

    return { success: true, id };
  } catch (err) {
    return {
      success: false,
      error: errorMessage(err, 'Terjadi kesalahan sistem saat memperbarui item'),
    };
  }
}

/** `belum ada` berarti tanpa plan; status lain di-create / di-update sesuai apa adanya. */
async function syncPlanStatus(
  supabase: Awaited<ReturnType<typeof createClient>>,
  itemId: string,
  status: PlanStatus | 'belum ada',
  estimasi_harga: number
) {
  const { data: existingPlan } = await supabase
    .from('plans')
    .select('id')
    .eq('item_id', itemId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (status === 'belum ada') {
    if (existingPlan) {
      await supabase.from('plans').delete().eq('id', existingPlan.id);
    }
    return;
  }

  if (existingPlan) {
    await supabase
      .from('plans')
      .update({ status, estimasi_harga, updated_at: new Date().toISOString() })
      .eq('id', existingPlan.id);
    return;
  }

  await supabase.from('plans').insert({
    item_id: itemId,
    status,
    prioritas: 3,
    estimasi_harga,
  });
}

export async function deleteItem(id: string, seriName?: string | null): Promise<ItemActionResult> {
  try {
    const { supabase, error: authError } = await requireUser();
    if (!supabase) {
      return { success: false, error: authError };
    }

    // Relasi plans & listings ikut terhapus lewat cascade FK di Postgres.
    const { error } = await supabase.from('items').delete().eq('id', id);

    if (error) {
      return { success: false, error: `Gagal menghapus item: ${error.message}` };
    }

    revalidateCatalogViews(seriName ?? null);

    return { success: true, id };
  } catch (err) {
    return {
      success: false,
      error: errorMessage(err, 'Terjadi kesalahan sistem saat menghapus item'),
    };
  }
}
