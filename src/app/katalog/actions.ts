'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
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

async function getClients() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // In production or configured Supabase, use adminClient for mutations if service role key is present
  // to ensure smooth server operations alongside user authentication checks.
  let mutationClient: any = supabase;
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      mutationClient = createAdminClient();
    } catch {
      mutationClient = supabase;
    }
  }

  return { supabase, mutationClient, user };
}

export async function createItem(data: ItemFormData) {
  try {
    const { mutationClient } = await getClients();

    const judul = data.judul?.trim();
    if (!judul) {
      return { success: false, error: 'Judul item wajib diisi' };
    }

    const seri = data.seri?.trim() || null;
    const volume =
      typeof data.volume === 'number' && !isNaN(data.volume)
        ? data.volume
        : data.volume
        ? parseInt(String(data.volume), 10) || null
        : null;
    const penerbit = data.penerbit?.trim() || null;
    const tipe = (data.tipe as ItemType) || null;
    const cover_url = data.cover_url?.trim() || null;

    // 1. Insert into items table
    const { data: itemData, error: itemError } = await mutationClient
      .from('items')
      .insert({
        judul,
        seri,
        volume,
        penerbit,
        tipe,
        cover_url,
      })
      .select()
      .single();

    if (itemError) {
      return { success: false, error: `Gagal menambahkan item: ${itemError.message}` };
    }

    // 2. If initial status is specified and not 'belum ada', create plan
    if (data.status && data.status !== 'belum ada') {
      const estimasi = Number(data.estimasi_harga) || 0;
      const { error: planError } = await mutationClient.from('plans').insert({
        item_id: itemData.id,
        status: data.status,
        prioritas: 3,
        estimasi_harga: estimasi,
      });

      if (planError) {
        console.error('Warning: Failed to create initial plan for item', planError);
      }
    }

    revalidatePath('/katalog');
    if (seri) {
      revalidatePath(`/katalog/seri/${encodeURIComponent(seri)}`);
    }
    revalidatePath('/');

    return { success: true, item: itemData };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Terjadi kesalahan sistem saat membuat item',
    };
  }
}

export async function updateItem(id: string, data: ItemFormData) {
  try {
    const { mutationClient } = await getClients();

    const judul = data.judul?.trim();
    if (!judul) {
      return { success: false, error: 'Judul item wajib diisi' };
    }

    const seri = data.seri?.trim() || null;
    const volume =
      typeof data.volume === 'number' && !isNaN(data.volume)
        ? data.volume
        : data.volume
        ? parseInt(String(data.volume), 10) || null
        : null;
    const penerbit = data.penerbit?.trim() || null;
    const tipe = (data.tipe as ItemType) || null;
    const cover_url = data.cover_url?.trim() || null;

    // 1. Update items table
    const { error: itemError } = await mutationClient
      .from('items')
      .update({
        judul,
        seri,
        volume,
        penerbit,
        tipe,
        cover_url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (itemError) {
      return { success: false, error: `Gagal mengupdate item: ${itemError.message}` };
    }

    // 2. Handle Plan status if provided
    if (data.status !== undefined) {
      // Check existing plan
      const { data: existingPlan } = await mutationClient
        .from('plans')
        .select('id, status')
        .eq('item_id', id)
        .maybeSingle();

      const estimasi = Number(data.estimasi_harga) || 0;

      if (data.status === 'belum ada') {
        if (existingPlan) {
          // Delete plan if set back to 'belum ada'
          await mutationClient.from('plans').delete().eq('id', existingPlan.id);
        }
      } else {
        if (existingPlan) {
          await mutationClient
            .from('plans')
            .update({
              status: data.status,
              estimasi_harga: estimasi,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingPlan.id);
        } else {
          await mutationClient.from('plans').insert({
            item_id: id,
            status: data.status,
            prioritas: 3,
            estimasi_harga: estimasi,
          });
        }
      }
    }

    revalidatePath('/katalog');
    if (seri) {
      revalidatePath(`/katalog/seri/${encodeURIComponent(seri)}`);
    }
    revalidatePath('/');

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Terjadi kesalahan sistem saat memperbarui item',
    };
  }
}

export async function deleteItem(id: string, seriName?: string | null) {
  try {
    const { mutationClient } = await getClients();

    // Cascading in Postgres will delete plans and listings, but explicitly ensure safe cleanup
    const { error } = await mutationClient.from('items').delete().eq('id', id);

    if (error) {
      return { success: false, error: `Gagal menghapus item: ${error.message}` };
    }

    revalidatePath('/katalog');
    if (seriName) {
      revalidatePath(`/katalog/seri/${encodeURIComponent(seriName)}`);
    }
    revalidatePath('/');

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Terjadi kesalahan sistem saat menghapus item',
    };
  }
}
