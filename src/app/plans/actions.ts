'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { Database, PlanStatus } from '@/types/database';
import {
  isPlanStatus,
  isValidPriority,
  transitionError,
} from '@/lib/plans';

export interface PlanFormData {
  item_id: string;
  listing_id?: string | null;
  prioritas?: number | null;
  estimasi_harga?: number | null;
}

export interface UpdatePlanInput {
  id: string;
  prioritas: number;
  estimasi_harga: number;
  listing_id?: string | null;
}

export interface TransitionInput {
  planId: string;
  to: PlanStatus;
}

export type ActionResult<T = Record<string, never>> = {
  success: boolean;
  error?: string;
} & Partial<T>;

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

async function getClients() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user };
}

function revalidatePlanViews() {
  revalidatePath('/plans');
  revalidatePath('/katalog');
  revalidatePath('/budget');
  revalidatePath('/');
}

/**
 * Buat plan baru. Selalu mulai dari `wishlist` — semua status lain harus
 * ditempuh lewat transisi supaya riwayat status utuh.
 */
export async function createPlan(data: PlanFormData): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase, user } = await getClients();

    if (!user) {
      return { success: false, error: 'Sesi tidak valid. Silakan masuk kembali.' };
    }

    const itemId = data.item_id?.trim();
    if (!itemId) {
      return { success: false, error: 'Item wajib dipilih.' };
    }

    const prioritas = data.prioritas ?? 3;
    if (!isValidPriority(prioritas)) {
      return { success: false, error: 'Prioritas harus berupa angka bulat 1 (tertinggi) sampai 5.' };
    }

    const estimasiHarga = Number(data.estimasi_harga ?? 0);
    if (!Number.isFinite(estimasiHarga) || estimasiHarga < 0) {
      return { success: false, error: 'Estimasi harga harus angka nol atau lebih.' };
    }

    const listingId = data.listing_id?.trim() || null;
    if (listingId) {
      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .select('id, item_id')
        .eq('id', listingId)
        .maybeSingle();

      if (listingError) {
        return { success: false, error: `Gagal memvalidasi listing: ${listingError.message}` };
      }

      if (!listing) {
        return { success: false, error: 'Listing tidak ditemukan.' };
      }

      if (listing.item_id !== itemId) {
        return { success: false, error: 'Listing yang dipilih bukan milik item ini.' };
      }
    }

    const { data: created, error } = await supabase
      .from('plans')
      .insert({
        item_id: itemId,
        listing_id: listingId,
        prioritas,
        estimasi_harga: estimasiHarga,
        status: 'wishlist',
        deadline_po: null,
      })
      .select('id')
      .single();

    if (error) {
      return { success: false, error: `Gagal membuat rencana: ${error.message}` };
    }

    revalidatePlanViews();

    return { success: true, id: created.id };
  } catch (err) {
    return {
      success: false,
      error: errorMessage(err, 'Terjadi kesalahan sistem saat membuat rencana'),
    };
  }
}

/**
 * Satu-satunya pintu untuk memindahkan status plan.
 */
export async function transitionPlanStatus(
  input: TransitionInput
): Promise<ActionResult<{ status: PlanStatus }>> {
  try {
    const { supabase, user } = await getClients();

    if (!user) {
      return { success: false, error: 'Sesi tidak valid. Silakan masuk kembali.' };
    }

    const planId = input.planId?.trim();
    if (!planId) {
      return { success: false, error: 'Plan tidak ditemukan.' };
    }

    if (!isPlanStatus(input.to)) {
      return { success: false, error: `Status "${String(input.to)}" tidak dikenal.` };
    }

    const to = input.to;

    const { data: plan, error: readError } = await supabase
      .from('plans')
      .select('id, status')
      .eq('id', planId)
      .maybeSingle();

    if (readError) {
      return { success: false, error: `Gagal memuat plan: ${readError.message}` };
    }

    if (!plan) {
      return { success: false, error: 'Plan tidak ditemukan.' };
    }

    const from = plan.status;

    const invalid = transitionError(from, to);
    if (invalid) {
      return { success: false, error: invalid };
    }

    if (from === to) {
      return { success: true, status: to };
    }

    const update: Database['public']['Tables']['plans']['Update'] = {
      status: to,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedRows, error: updateError } = await supabase
      .from('plans')
      .update(update)
      .eq('id', planId)
      .eq('status', from)
      .select('id');

    if (updateError) {
      return { success: false, error: `Gagal mengubah status: ${updateError.message}` };
    }

    if (!updatedRows || updatedRows.length === 0) {
      return {
        success: false,
        error: 'Status plan sudah berubah di sesi lain. Muat ulang halaman lalu coba lagi.',
      };
    }

    revalidatePlanViews();

    return { success: true, status: to };
  } catch (err) {
    return {
      success: false,
      error: errorMessage(err, 'Terjadi kesalahan sistem saat mengubah status'),
    };
  }
}

/**
 * Perbarui prioritas (#1–#5), estimasi harga, atau listing referensi
 * pada plan yang sudah ada tanpa mengubah statusnya.
 */
export async function updatePlanDetails(
  input: UpdatePlanInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase, user } = await getClients();

    if (!user) {
      return { success: false, error: 'Sesi tidak valid. Silakan masuk kembali.' };
    }

    const planId = input.id?.trim();
    if (!planId) {
      return { success: false, error: 'Plan tidak ditemukan.' };
    }

    const prioritas = Number(input.prioritas);
    if (!isValidPriority(prioritas)) {
      return { success: false, error: 'Prioritas harus berupa angka bulat 1 (tertinggi) sampai 5.' };
    }

    const estimasiHarga = Number(input.estimasi_harga ?? 0);
    if (!Number.isFinite(estimasiHarga) || estimasiHarga < 0) {
      return { success: false, error: 'Estimasi harga harus angka nol atau lebih.' };
    }

    const updatePayload: Database['public']['Tables']['plans']['Update'] = {
      prioritas,
      estimasi_harga: estimasiHarga,
      updated_at: new Date().toISOString(),
    };

    if (input.listing_id !== undefined) {
      updatePayload.listing_id = input.listing_id?.trim() || null;
    }

    const { error } = await supabase
      .from('plans')
      .update(updatePayload)
      .eq('id', planId);

    if (error) {
      return { success: false, error: `Gagal memperbarui rencana: ${error.message}` };
    }

    revalidatePlanViews();

    return { success: true, id: planId };
  } catch (err) {
    return {
      success: false,
      error: errorMessage(err, 'Terjadi kesalahan sistem saat memperbarui rencana'),
    };
  }
}
