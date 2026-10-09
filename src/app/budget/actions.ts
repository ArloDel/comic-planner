'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { TransactionType } from '@/types/database';
import { STATUS_LABELS, txnAllowedForStatus } from '@/lib/plans';
import { periodeDate, todayISO } from '@/lib/budget';

/**
 * Mutasi lewat client sesi user (bukan service role) supaya RLS tetap berlaku —
 * konsisten dengan `plans/actions.ts` dan `katalog/actions.ts`. Policy
 * INSERT/UPDATE untuk `budgets` & `transactions` dibuat di migrasi
 * `20261007000000_budget_transaction_policies.sql`.
 */
async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase: null, error: 'Sesi tidak valid. Silakan masuk kembali.' };
  }

  return { supabase, error: null };
}

function revalidateBudgetPaths() {
  revalidatePath('/budget');
  revalidatePath('/plans');
  revalidatePath('/');
}

/** Set / ubah budget satu periode (YYYY-MM). Upsert berdasarkan unique periode. */
export async function upsertBudget(
  periode: string,
  totalBudget: number
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!/^\d{4}-\d{2}$/.test(periode)) {
      return { success: false, error: 'Format periode harus YYYY-MM' };
    }

    const total = Math.max(0, Number(totalBudget) || 0);

    const { supabase, error: authError } = await requireUser();
    if (!supabase) {
      return { success: false, error: authError ?? 'Sesi tidak valid.' };
    }

    const { error } = await supabase
      .from('budgets')
      .upsert(
        { periode: periodeDate(periode), total_budget: total },
        { onConflict: 'periode' }
      );

    if (error) {
      return { success: false, error: `Gagal menyimpan budget: ${error.message}` };
    }

    revalidateBudgetPaths();
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Terjadi kesalahan sistem saat menyimpan budget',
    };
  }
}

export interface CreateTransactionInput {
  plan_id: string;
  jenis: TransactionType;
  jumlah: number;
  tanggal?: string;
  catatan?: string | null;
}

/** Validasi jenis transaksi terhadap status plan (F3/F4). */
export async function createTransaction(
  input: CreateTransactionInput
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const jumlah = Number(input.jumlah);
    if (!input.plan_id) {
      return { success: false, error: 'Plan wajib dipilih' };
    }
    if (!jumlah || jumlah <= 0) {
      return { success: false, error: 'Jumlah transaksi harus lebih dari 0' };
    }

    const tanggal = input.tanggal || todayISO();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
      return { success: false, error: 'Format tanggal tidak valid' };
    }

    const { supabase, error: authError } = await requireUser();
    if (!supabase) {
      return { success: false, error: authError ?? 'Sesi tidak valid.' };
    }

    const { data: plan } = await supabase
      .from('plans')
      .select('id, status')
      .eq('id', input.plan_id)
      .maybeSingle();

    if (!plan) {
      return { success: false, error: 'Plan tidak ditemukan' };
    }

    if (!txnAllowedForStatus(input.jenis, plan.status)) {
      return {
        success: false,
        error: `Transaksi "${input.jenis}" tidak sah untuk plan berstatus ${STATUS_LABELS[plan.status as keyof typeof STATUS_LABELS] ?? plan.status}.`,
      };
    }

    const { data: created, error } = await supabase
      .from('transactions')
      .insert({
        plan_id: input.plan_id,
        jenis: input.jenis,
        jumlah,
        tanggal,
        catatan: input.catatan?.trim() || null,
      })
      .select('id')
      .single();

    if (error) {
      return { success: false, error: `Gagal mencatat transaksi: ${error.message}` };
    }

    revalidateBudgetPaths();
    return { success: true, id: created.id };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Terjadi kesalahan sistem saat mencatat transaksi',
    };
  }
}
