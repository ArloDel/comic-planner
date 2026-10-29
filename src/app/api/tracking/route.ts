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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_PHOTO_LENGTH = 10 * 1024 * 1024; // 10MB safe ceiling

function isValidPhotoUrl(url: string): boolean {
  if (url.length > MAX_PHOTO_LENGTH) return false;
  return url.startsWith('data:image/') || url.startsWith('https://');
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const planId = searchParams.get('plan_id')?.trim();
  const courier = searchParams.get('courier')?.trim() || 'spx';
  const resi = searchParams.get('resi')?.trim();
  const forceMock = searchParams.get('force_mock') as 'ON_PROCESS' | 'DELIVERED' | null;

  if (!planId && !resi) {
    return NextResponse.json({ error: 'plan_id atau resi diperlukan' }, { status: 400 });
  }

  if (planId && !UUID_REGEX.test(planId)) {
    return NextResponse.json({ error: 'Format plan_id tidak valid' }, { status: 400 });
  }

  // Cek apakah ada data tersimpan sebelumnya untuk plan ini
  let savedCourier = courier;
  let savedResi = resi;
  let savedPhoto: string | null = null;

  if (planId) {
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('order_trackings')
        .select('kurir, resi, foto_bukti_url')
        .eq('plan_id', planId)
        .maybeSingle();

      if (!error && data) {
        savedCourier = data.kurir || courier || savedCourier;
        savedResi = data.resi || resi || savedResi;
        savedPhoto = data.foto_bukti_url || null;
      }
    } catch {
      // Supabase table might not exist yet
    }

    if (!savedResi) {
      const inMem = memoryTrackingStore.get(planId);
      if (inMem) {
        savedCourier = inMem.courier || courier || savedCourier;
        savedResi = inMem.resi || resi || savedResi;
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
    plan_id?: string;
    plan_ids?: string[];
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

  const {
    plan_id,
    plan_ids,
    courier,
    resi,
    foto_bukti_url,
    force_status,
    complete_order,
    custom_api_key,
  } = body;

  let targetPlanIds: string[] = [];
  if (Array.isArray(plan_ids) && plan_ids.length > 0) {
    targetPlanIds = plan_ids.map((id: unknown) => String(id).trim()).filter(Boolean);
  } else if (plan_id && typeof plan_id === 'string' && plan_id.trim()) {
    targetPlanIds = [plan_id.trim()];
  }

  if (targetPlanIds.length === 0 || !resi) {
    return NextResponse.json(
      { error: 'Minimal satu plan_id dan nomor resi wajib diisi' },
      { status: 400 }
    );
  }

  for (const id of targetPlanIds) {
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: `Format plan_id tidak valid: ${id}` }, { status: 400 });
    }
  }

  if (resi.length > 100) {
    return NextResponse.json(
      { error: 'Nomor resi terlalu panjang (maksimal 100 karakter)' },
      { status: 400 }
    );
  }

  if (foto_bukti_url && !isValidPhotoUrl(foto_bukti_url)) {
    return NextResponse.json(
      { error: 'Format foto bukti tidak valid atau ukuran melebihi batas yang diizinkan' },
      { status: 400 }
    );
  }

  const apiKey =
    custom_api_key ||
    request.headers.get('x-binderbyte-key') ||
    process.env.BINDERBYTE_API_KEY ||
    null;
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

  // Simpan ke in-memory store untuk seluruh targetPlanIds
  for (const id of targetPlanIds) {
    memoryTrackingStore.set(id, {
      plan_id: id,
      courier: courier || 'spx',
      resi,
      status_pengiriman: tracking.status,
      foto_bukti_url: foto_bukti_url || null,
      tracking_result: tracking,
      updated_at: nowIso,
    });
  }

  // Coba simpan ke Supabase jika tabel tersedia
  try {
    const supabaseAdmin = createAdminClient();
    const rowsToUpsert = targetPlanIds.map((id) => ({
      plan_id: id,
      kurir: courier || 'spx',
      resi,
      status_pengiriman: tracking.status,
      foto_bukti_url: foto_bukti_url || null,
      delivered_at: tracking.isDelivered ? nowIso : null,
      tracking_payload: tracking as unknown as Json,
      updated_at: nowIso,
    }));

    await supabaseAdmin.from('order_trackings').upsert(rowsToUpsert, { onConflict: 'plan_id' });

    // Jika ada plan yang berstatus wishlist, otomatis naikkan ke 'po' (Sedang Dikirim)
    const { data: currentPlans } = await supabaseAdmin
      .from('plans')
      .select('id, status')
      .in('id', targetPlanIds);

    const wishlistIds = (currentPlans || [])
      .filter((p) => p.status === 'wishlist')
      .map((p) => p.id);

    if (wishlistIds.length > 0) {
      await supabaseAdmin
        .from('plans')
        .update({
          status: 'po',
          updated_at: nowIso,
        })
        .in('id', wishlistIds);
    }

    revalidatePath('/plans');
    revalidatePath('/katalog');
    revalidatePath('/');
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
      const { data: currentPlans } = await supabaseAdmin
        .from('plans')
        .select('id, status')
        .in('id', targetPlanIds);

      const toCompleteIds = (currentPlans || [])
        .filter((p) => p.status !== 'diterima' && p.status !== 'batal')
        .map((p) => p.id);

      if (toCompleteIds.length > 0) {
        const { error: directErr } = await supabaseAdmin
          .from('plans')
          .update({
            status: 'diterima',
            updated_at: nowIso,
          })
          .in('id', toCompleteIds);

        if (directErr) {
          // Fallback legacy Postgres trigger: po -> lunas -> diterima
          await supabaseAdmin.from('plans').update({ status: 'lunas' }).in('id', toCompleteIds);
          await supabaseAdmin
            .from('plans')
            .update({
              status: 'diterima',
              updated_at: nowIso,
            })
            .in('id', toCompleteIds);
        }
      }

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
    planIds: targetPlanIds,
    planId: targetPlanIds[0],
    totalPlans: targetPlanIds.length,
    status: tracking.status,
    isDelivered: tracking.isDelivered,
    tracking,
    photoUrl: foto_bukti_url || null,
    completed: Boolean(complete_order),
  });
}

