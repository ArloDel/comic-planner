'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { Database, PlanStatus } from '@/types/database';
import {
  isPlanStatus,
  isValidDateInput,
  isValidPriority,
  requiresDeadline,
  transitionError,
} from '@/lib/plans';

export interface PlanFormData {
  item_id: string;
  listing_id?: string | null;
  prioritas?: number | null;
  estimasi_harga?: number | null;
}

export interface TransitionInput {
  planId: string;
  to: PlanStatus;
  /** Deadline PO `YYYY-MM-DD`. Kosongkan untuk memakai deadline listing. */
  deadline_po?: string | null;
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

  // Mutasi lewat client session user (bukan service role) supaya RLS tetap
  // berlaku — policies `items_crud_policies.sql` sudah mengizinkan insert &
  // update plans untuk user terautentikasi.
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

    // Listing opsional, tapi kalau diisi harus memang milik item tersebut.
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

    // Insert dengan status wishlist; trigger DB mencatat status_history awal.
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
 *
 * Validasi transisi di sini (bukan cuma di UI) memakai `transitionError` dari
 * lib/plans.ts; trigger Postgres `plans_status_transition_guard` menangkap
 * penulisan yang datang dari jalur lain. Setiap perubahan status otomatis
 * tercatat di `status_history` lewat trigger `on_plan_status_changed`.
 */
export async function transitionPlanStatus(
  input: TransitionInput
): Promise<ActionResult<{ status: PlanStatus; deadline_po: string | null }>> {
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
      .select('id, status, listing_id, listings(deadline_po)')
      .eq('id', planId)
      .maybeSingle();

    if (readError) {
      return { success: false, error: `Gagal memuat plan: ${readError.message}` };
    }

    if (!plan) {
      return { success: false, error: 'Plan tidak ditemukan.' };
    }

    const from = plan.status;

    // Deadline: pakai override kalau ada, else deadline listing, else wajib diisi.
    const override = input.deadline_po?.trim() || null;
    if (override && !isValidDateInput(override)) {
      return { success: false, error: 'Format deadline tidak valid (harus YYYY-MM-DD).' };
    }

    const listingDeadline = Array.isArray(plan.listings)
      ? (plan.listings[0]?.deadline_po ?? null)
      : (plan.listings?.deadline_po ?? null);

    const deadline = override || (requiresDeadline(to) ? listingDeadline : null);

    // Gerbang state machine — inilah penolakan illegal di server.
    const invalid = transitionError(from, to, { deadline });
    if (invalid) {
      return { success: false, error: invalid };
    }

    if (from === to) {
      // Sudah di status tujuan: tidak ada perubahan, tidak ada riwayat baru.
      return { success: true, status: to, deadline_po: deadline ?? null };
    }

    const update: Database['public']['Tables']['plans']['Update'] = {
      status: to,
      updated_at: new Date().toISOString(),
    };

    if (requiresDeadline(to)) {
      update.deadline_po = deadline;
    }

    // `.eq('status', from)` menjaga update ini atomik terhadap status yang
    // tervalidasi: kalau ada sesi lain yang sudah memindahkan plan, baris tidak
    // akan tersentuh dan kita laporkan konflik alih-alih menimpa.
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

    return { success: true, status: to, deadline_po: deadline ?? null };
  } catch (err) {
    return {
      success: false,
      error: errorMessage(err, 'Terjadi kesalahan sistem saat mengubah status'),
    };
  }
}