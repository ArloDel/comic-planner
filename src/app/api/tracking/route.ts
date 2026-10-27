import { NextResponse } from 'next/server';
import { trackPackageBinderbyte, type TrackingResult } from '@/lib/binderbyte';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import type { Json } from '@/types/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// In-memory fallback tracking store for zero-downtime prototype testing
// when order_trackings table is not yet migrated to the remote Supabase.
const memoryTrackingStore = new Map<
  string,
  {
    plan_id: string;
    courier: string;
    resi: string;
    status_pengiriman: string;
    foto_bukti_url?: string | null;
    tracking_result?: TrackingResult | null;
    updated_at: string;
  }
>();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const planId = searchParams.get('plan_id')?.trim();
  const courier = searchParams.get('courier')?.trim() || 'spx';
  const resi = searchParams.get('resi')?.trim();
  const forceMock = searchParams.get('force_mock') as 'ON_PROCESS' | 'DELIVERED' | null;

  if (!planId && !resi) {
    return NextResponse.json({ error: 'plan_id atau resi diperlukan' }, { status: 400 });
  }

  // Cek apakah ada data tersimpan sebelumnya untuk plan ini
  let savedCourier = courier;
  let savedResi = resi;
  let savedPhoto: string | null = null;

  if (planId) {
    try {
      const supabase = createAdminClient();
      const { data } = await supabase
        .from('order_trackings')
        .select('*')
        .eq('plan_id', planId)
        .maybeSingle();

      if (data) {
        savedCourier = data.kurir || courier;
        savedResi = data.resi || resi;
        savedPhoto = data.foto_bukti_url || null;
      }
    } catch {
      const inMem = memoryTrackingStore.get(planId);
      if (inMem) {
        savedCourier = inMem.courier || courier;
        savedResi = inMem.resi || resi;
        savedPhoto = inMem.foto_bukti_url || null;
      }
    }
  }

  const apiKey =
    request.headers.get('x-binderbyte-key') || process.env.BINDERBYTE_API_KEY || null;
  const apiKeyConfigured = Boolean(process.env.BINDERBYTE_API_KEY);

  if (!savedResi) {
    return NextResponse.json({
      hasTracking: false,
      courier: savedCourier,
      resi: '',
      photoUrl: savedPhoto,
      apiKeyConfigured,
    });
  }

  const tracking = await trackPackageBinderbyte({
    courier: savedCourier,
    waybill: savedResi,
    apiKey,
    forceMockStatus: forceMock,
  });

  // Simpan / perbarui status ke database atau memory
  if (planId) {
    const payloadToSave = {
      plan_id: planId,
      courier: savedCourier,
      resi: savedResi,
      status_pengiriman: tracking.status,
      foto_bukti_url: savedPhoto,
      tracking_result: tracking,
      updated_at: new Date().toISOString(),
    };

    memoryTrackingStore.set(planId, payloadToSave);

    try {
      const supabase = createAdminClient();
      await supabase.from('order_trackings').upsert(
        {
          plan_id: planId,
          kurir: savedCourier,
          resi: savedResi,
          status_pengiriman: tracking.status,
          foto_bukti_url: savedPhoto,
          delivered_at: tracking.isDelivered ? new Date().toISOString() : null,
          tracking_payload: tracking as unknown as Json,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'plan_id' }
      );
    } catch {
      // Ignored for prototype fallback
    }
  }

  return NextResponse.json({
    hasTracking: true,
    planId,
    courier: savedCourier,
    resi: savedResi,
    photoUrl: savedPhoto,
    apiKeyConfigured,
    tracking,
  });
}

export async function POST(request: Request) {
  let body: {
    plan_id: string;
    courier: string;
    resi: string;
    foto_bukti_url?: string | null;
    force_status?: 'ON_PROCESS' | 'DELIVERED' | null;
    complete_order?: boolean;
    custom_api_key?: string | null;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON tidak valid' }, { status: 400 });
  }

  const { plan_id, courier, resi, foto_bukti_url, force_status, complete_order, custom_api_key } = body;

  if (!plan_id || !resi) {
    return NextResponse.json({ error: 'plan_id dan nomor resi wajib diisi' }, { status: 400 });
  }

  const apiKey =
    custom_api_key ||
    request.headers.get('x-binderbyte-key') ||
    process.env.BINDERBYTE_API_KEY ||
    null;
  const apiKeyConfigured = Boolean(process.env.BINDERBYTE_API_KEY || custom_api_key);
  const tracking = await trackPackageBinderbyte({
    courier: courier || 'spx',
    waybill: resi,
    apiKey,
    forceMockStatus: force_status,
  });

  if (!tracking.success && !tracking.isMock) {
    return NextResponse.json(
      {
        error:
          tracking.error ||
          'Nomor resi tidak ditemukan pada sistem kurir. Pastikan kurir dan nomor resi sesuai.',
        tracking,
      },
      { status: 400 }
    );
  }

  const nowIso = new Date().toISOString();

  // Simpan ke in-memory store
  memoryTrackingStore.set(plan_id, {
    plan_id,
    courier: courier || 'spx',
    resi,
    status_pengiriman: tracking.status,
    foto_bukti_url: foto_bukti_url || null,
    tracking_result: tracking,
    updated_at: nowIso,
  });

  // Coba simpan ke Supabase jika tabel tersedia
  try {
    const supabaseAdmin = createAdminClient();
    await supabaseAdmin.from('order_trackings').upsert(
      {
        plan_id,
        kurir: courier || 'spx',
        resi,
        status_pengiriman: tracking.status,
        foto_bukti_url: foto_bukti_url || null,
        delivered_at: tracking.isDelivered ? nowIso : null,
        tracking_payload: tracking as unknown as Json,
        updated_at: nowIso,
      },
      { onConflict: 'plan_id' }
    );
  } catch {
    // Fallback handled via memoryTrackingStore
  }

  // Jika diperintahkan untuk menyelesaikan pesanan (sudah delivered + upload foto bukti)
  if (complete_order) {
    if (!foto_bukti_url) {
      return NextResponse.json(
        { error: 'Bukti foto penerimaan wajib diunggah sebelum pesanan diselesaikan' },
        { status: 400 }
      );
    }

    try {
      const supabaseAdmin = createAdminClient();
      // Update plan status to 'diterima'
      await supabaseAdmin
        .from('plans')
        .update({
          status: 'diterima',
          updated_at: nowIso,
        })
        .eq('id', plan_id);

      revalidatePath('/plans');
      revalidatePath('/katalog');
      revalidatePath('/');
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Gagal menyelesaikan pesanan' },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    success: true,
    planId: plan_id,
    status: tracking.status,
    isDelivered: tracking.isDelivered,
    tracking,
    photoUrl: foto_bukti_url || null,
    completed: Boolean(complete_order),
  });
}
