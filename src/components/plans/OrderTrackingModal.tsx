'use client';

import React, { useState, useEffect } from 'react';
import {
  Truck,
  CheckCircle2,
  Clock,
  Camera,
  Upload,
  AlertCircle,
  Sparkles,
  X,
  PackageCheck,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { InlineLoadingBar } from '@/components/ui/TopLoadingBar';
import { TrackingTimelineSkeleton } from '@/components/ui/Skeleton';
import { COURIER_OPTIONS, type TrackingResult } from '@/lib/binderbyte';

export interface BulkPlanItem {
  id: string;
  judul: string;
  volume?: number | null;
  estimasi_harga?: number;
  nama_toko?: string | null;
  cover_url?: string | null;
  currentStatus?: string;
}

interface OrderTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId?: string;
  itemTitle?: string;
  volume?: number | null;
  currentStatus?: string;
  initialCourier?: string;
  initialResi?: string;
  onOrderCompleted?: () => void;
  bulkPlans?: BulkPlanItem[];
}

export function OrderTrackingModal({
  isOpen,
  onClose,
  planId: singlePlanId,
  itemTitle: singleItemTitle,
  volume: singleVolume,
  currentStatus: singleCurrentStatus = 'wishlist',
  initialCourier = 'spx',
  initialResi = '',
  onOrderCompleted,
  bulkPlans,
}: OrderTrackingModalProps) {
  const isBulk = Boolean(bulkPlans && bulkPlans.length > 0);
  const effectivePlans = bulkPlans || (singlePlanId ? [{
    id: singlePlanId,
    judul: singleItemTitle || 'Komik',
    volume: singleVolume,
    currentStatus: singleCurrentStatus,
  }] : []);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(effectivePlans.map((p) => p.id))
  );

  const planId = singlePlanId || (effectivePlans[0]?.id ?? '');
  const itemTitle = isBulk ? `${selectedIds.size} Komik Terpilih` : (singleItemTitle || effectivePlans[0]?.judul || 'Komik');
  const volume = isBulk ? null : (singleVolume ?? effectivePlans[0]?.volume);
  const currentStatus = isBulk ? 'wishlist' : (singleCurrentStatus || effectivePlans[0]?.currentStatus || 'wishlist');

  useEffect(() => {
    if (bulkPlans && bulkPlans.length > 0) {
      setSelectedIds(new Set(bulkPlans.map((p) => p.id)));
    }
  }, [bulkPlans]);
  const [courier, setCourier] = useState(initialCourier);
  const [resi, setResi] = useState(initialResi);
  const [loading, setLoading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [tracking, setTracking] = useState<TrackingResult | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [apiKeyConfigured, setApiKeyConfigured] = useState<boolean>(true);
  const [customApiKey, setCustomApiKey] = useState<string>('');
  const [showApiKeyInput, setShowApiKeyInput] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedKey = localStorage.getItem('comicplan_binderbyte_key');
      if (savedKey) setCustomApiKey(savedKey);
    }
  }, []);

  // Muat status tracking yang ada saat modal dibuka
  useEffect(() => {
    if (isOpen && planId) {
      loadSavedTracking();
    }
  }, [isOpen, planId]);

  async function loadSavedTracking() {
    setLoading(true);
    setErrorMsg(null);

    // 1. Ambil data tersimpan dari LocalStorage terlebih dahulu agar instan (1x input)
    let localCourier = initialCourier;
    let localResi = initialResi;
    let hasLocalData = false;

    if (typeof window !== 'undefined') {
      try {
        const rawLocal = localStorage.getItem(`comicplan_tracking_${planId}`);
        if (rawLocal) {
          const parsed = JSON.parse(rawLocal);
          if (parsed.courier) {
            localCourier = parsed.courier;
            setCourier(parsed.courier);
          }
          if (parsed.resi) {
            localResi = parsed.resi;
            setResi(parsed.resi);
            hasLocalData = true;
          }
          if (parsed.tracking) setTracking(parsed.tracking);
          if (parsed.photoUrl) setPhotoPreview(parsed.photoUrl);
        }
      } catch {
        // Ignored
      }
    }

    try {
      const savedKey = typeof window !== 'undefined' ? localStorage.getItem('comicplan_binderbyte_key') : null;
      const queryParams = new URLSearchParams({ plan_id: planId });
      if (localResi) queryParams.set('resi', localResi);
      if (localCourier) queryParams.set('courier', localCourier);

      const res = await fetch(`/api/tracking?${queryParams.toString()}`, {
        headers: savedKey ? { 'x-binderbyte-key': savedKey } : {},
      });
      const data = await res.json();
      if (data.apiKeyConfigured !== undefined) {
        setApiKeyConfigured(Boolean(data.apiKeyConfigured || savedKey));
      }

      if (data.hasTracking && data.tracking) {
        const activeCourier = data.courier || localCourier;
        const activeResi = data.resi || localResi;
        const activePhoto = data.photoUrl || null;

        setCourier(activeCourier);
        setResi(activeResi);
        setTracking(data.tracking);
        if (activePhoto) setPhotoPreview(activePhoto);

        // Sinkronkan ke cache lokal
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(
              `comicplan_tracking_${planId}`,
              JSON.stringify({
                courier: activeCourier,
                resi: activeResi,
                photoUrl: activePhoto,
                tracking: data.tracking,
                savedAt: new Date().toISOString(),
              })
            );
          } catch {
            // Ignored
          }
        }
      } else if (hasLocalData && localResi) {
        // Jika ada resi tersimpan di local tapi server belum auto-fetch, picu auto-cek live
        handleCheckTracking(undefined, localCourier, localResi);
      }
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  }

  function handleSaveCustomKey(key: string) {
    setCustomApiKey(key);
    if (typeof window !== 'undefined') {
      if (key.trim()) {
        localStorage.setItem('comicplan_binderbyte_key', key.trim());
      } else {
        localStorage.removeItem('comicplan_binderbyte_key');
      }
    }
    setApiKeyConfigured(Boolean(key.trim()));
  }

  function handleClearSavedResi() {
    setResi('');
    setTracking(null);
    setPhotoPreview(null);
    setErrorMsg(null);
    setSuccessMsg('Nomor resi berhasil dihapus.');
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`comicplan_tracking_${planId}`);
    }
  }

  async function handleCheckTracking(
    forceStatus?: 'ON_PROCESS' | 'DELIVERED',
    overrideCourier?: string,
    overrideResi?: string
  ) {
    const targetCourier = overrideCourier || courier;
    const targetResi = (overrideResi || resi).trim();

    if (!targetResi) {
      setErrorMsg('Masukkan nomor resi terlebih dahulu');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const keyToSend = customApiKey.trim() || undefined;
      const res = await fetch('/api/tracking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(keyToSend ? { 'x-binderbyte-key': keyToSend } : {}),
        },
        body: JSON.stringify({
          plan_id: isBulk ? undefined : planId,
          plan_ids: isBulk ? Array.from(selectedIds) : [planId],
          courier: targetCourier,
          resi: targetResi,
          foto_bukti_url: photoPreview,
          force_status: forceStatus || null,
          custom_api_key: keyToSend,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setErrorMsg(data.error || 'Gagal melacak resi');
        return;
      }

      setTracking(data.tracking);
      const countUpdated = isBulk ? selectedIds.size : 1;
      setSuccessMsg(
        isBulk
          ? `Pesanan berhasil dicatat untuk ${countUpdated} komik sekaligus! Status kini Sedang Dikirim.`
          : currentStatus === 'wishlist'
          ? 'Pesanan berhasil dicatat! Status komik kini Sedang Dikirim.'
          : 'Informasi pelacakan berhasil diperbarui!'
      );

      // Jika berpindah dari wishlist ke sedang dikirim, perbarui view di halaman induk
      onOrderCompleted?.();

      // Simpan nomor resi & kurir ke LocalStorage untuk semua plan yang dipilih
      if (typeof window !== 'undefined') {
        const idsToSave = isBulk ? Array.from(selectedIds) : [planId];
        for (const pId of idsToSave) {
          try {
            localStorage.setItem(
              `comicplan_tracking_${pId}`,
              JSON.stringify({
                courier: targetCourier,
                resi: targetResi,
                photoUrl: photoPreview,
                tracking: data.tracking,
                savedAt: new Date().toISOString(),
              })
            );
          } catch {
            // Ignored
          }
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan jaringan');
    } finally {
      setLoading(false);
    }
  }

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('File harus berupa gambar (JPG, PNG, atau WEBP)');
      return;
    }

    // Maksimal 5MB
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Ukuran file maksimal 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64Url = uploadEvent.target?.result as string;
      setPhotoPreview(base64Url);
      setErrorMsg(null);
    };
    reader.readAsDataURL(file);
  }

  async function handleConfirmDeliveredAndComplete() {
    if (!photoPreview) {
      setErrorMsg('Harap unggah bukti foto unboxing/penerimaan komik terlebih dahulu!');
      return;
    }

    setCompleting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: isBulk ? undefined : planId,
          plan_ids: isBulk ? Array.from(selectedIds) : [planId],
          courier,
          resi: resi.trim(),
          foto_bukti_url: photoPreview,
          complete_order: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setErrorMsg(data.error || 'Gagal menyelesaikan pesanan');
        return;
      }

      if (typeof window !== 'undefined') {
        const idsToRemove = isBulk ? Array.from(selectedIds) : [planId];
        for (const pId of idsToRemove) {
          localStorage.removeItem(`comicplan_tracking_${pId}`);
        }
      }

      onOrderCompleted?.();
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menyelesaikan pesanan');
    } finally {
      setCompleting(false);
    }
  }

  if (!isOpen) return null;

  const isDelivered = tracking?.isDelivered ?? false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white/95 backdrop-blur-xl border border-white/80 p-5 sm:p-6 shadow-glass-lg">
        <InlineLoadingBar isLoading={loading || completing} />
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary-100 text-primary-700">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {currentStatus === 'wishlist'
                  ? 'Pesan & Lacak Pengiriman'
                  : 'Lacak Pengiriman Pesanan'}
              </h2>
              <p className="text-xs text-slate-500 line-clamp-1">
                {itemTitle} {volume != null ? `(Vol. ${volume})` : ''}
                {currentStatus === 'wishlist' ? ' · Memindahkan komik ke status Sedang Dikirim' : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Daftar Komik Terpilih untuk Bulk Tracking */}
        {isBulk && bulkPlans && (
          <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800">
                Komik dalam Pesanan Ini ({selectedIds.size} dari {bulkPlans.length} dipilih)
              </span>
              <button
                type="button"
                onClick={() => {
                  if (selectedIds.size === bulkPlans.length) {
                    setSelectedIds(new Set());
                  } else {
                    setSelectedIds(new Set(bulkPlans.map((p) => p.id)));
                  }
                }}
                className="text-[11px] font-semibold text-primary-600 hover:text-primary-700"
              >
                {selectedIds.size === bulkPlans.length ? 'Batal Semua' : 'Pilih Semua'}
              </button>
            </div>

            <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
              {bulkPlans.map((item) => {
                const checked = selectedIds.has(item.id);
                return (
                  <label
                    key={item.id}
                    className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                      checked
                        ? 'border-primary-200 bg-white shadow-2xs'
                        : 'border-slate-200/60 bg-slate-100/60 opacity-60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(item.id);
                          else next.delete(item.id);
                          return next;
                        });
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />

                    {item.cover_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.cover_url}
                        alt={item.judul}
                        loading="lazy"
                        decoding="async"
                        className="h-9 w-6.5 object-cover rounded border border-slate-200 shrink-0"
                      />
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 truncate">{item.judul}</p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        {item.volume != null && <span>Vol {item.volume}</span>}
                        {item.nama_toko && <span className="truncate">· Toko: {item.nama_toko}</span>}
                      </div>
                    </div>

                    {item.estimasi_harga ? (
                      <span className="font-semibold text-slate-700 tabular-nums shrink-0">
                        Rp {item.estimasi_harga.toLocaleString('id-ID')}
                      </span>
                    ) : null}
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Kurir & Resi */}
        <div className="mt-4 space-y-3">
          {/* Status API Key & Opsi Input */}
          <div className="flex items-center justify-between text-[11px] px-1">
            <div className="flex items-center gap-1.5">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  apiKeyConfigured || customApiKey ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'
                }`}
              />
              <span className="text-slate-600 font-medium">
                {apiKeyConfigured || customApiKey
                  ? 'Koneksi Binderbyte: Aktif'
                  : 'API Key Server Belum Terdeteksi'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowApiKeyInput((prev) => !prev)}
              className="text-primary-600 hover:text-primary-700 font-medium hover:underline text-[11px]"
            >
              {showApiKeyInput ? 'Tutup Input Key' : 'Atur API Key'}
            </button>
          </div>

          {showApiKeyInput && (
            <div className="p-3 rounded-xl bg-slate-100/90 border border-slate-200 text-xs space-y-2">
              <label className="block text-[11px] font-bold text-slate-700">
                Binderbyte API Key (Tersimpan aman di browser Anda)
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={customApiKey}
                  onChange={(e) => handleSaveCustomKey(e.target.value)}
                  placeholder="sk_..."
                  className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKeyInput(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
                >
                  Simpan
                </button>
              </div>
              <p className="text-[10px] text-slate-500">
                Gunakan ini jika di dashboard Vercel belum diset environment variable <code>BINDERBYTE_API_KEY</code>.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Jasa Kurir
              </label>
              <select
                value={courier}
                onChange={(e) => setCourier(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              >
                {COURIER_OPTIONS.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Nomor Resi / Kode Pengiriman
                </label>
                {resi && (
                  <button
                    type="button"
                    onClick={handleClearSavedResi}
                    className="text-[10px] text-slate-400 hover:text-rose-600 font-medium transition-colors"
                  >
                    Ganti Resi
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={resi}
                  onChange={(e) => setResi(e.target.value)}
                  placeholder="Contoh: SPXID0482910... atau JP98721..."
                  className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
                <Button
                  variant="primary"
                  size="sm"
                  isLoading={loading}
                  disabled={loading || !resi.trim()}
                  onClick={() => handleCheckTracking()}
                  className="shrink-0 text-xs"
                >
                  {loading ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : (
                    <Truck className="h-3.5 w-3.5 mr-1" />
                  )}
                  <span>Lacak Real</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Sandbox Simulation Bar untuk Pengujian Cepat */}
          <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-900">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              <span>Simulasi Uji Coba Cepat (Sandbox):</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!resi.trim()) setResi('SPXID' + Math.floor(100000 + Math.random() * 900000));
                  handleCheckTracking('ON_PROCESS');
                }}
                className="px-2.5 py-1 rounded-lg bg-white border border-indigo-200 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100/70 transition-colors"
              >
                🚚 Uji Sedang Dikirim
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!resi.trim()) setResi('DELIV' + Math.floor(100000 + Math.random() * 900000));
                  handleCheckTracking('DELIVERED');
                }}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 transition-colors shadow-2xs"
              >
                🎉 Uji Paket Tiba (Delivered)
              </button>
            </div>
          </div>
        </div>

        {/* Skeleton loading saat mengambil data kurir */}
        {loading && !tracking && <TrackingTimelineSkeleton />}

        {/* Hasil Timeline Tracking */}
        {tracking && (
          <div className="mt-5 space-y-3.5">
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Status Ekspedisi ({tracking.courierName})
                </span>
                <p className="text-sm font-bold text-slate-900 mt-0.5 flex items-center gap-1.5">
                  {tracking.isDelivered ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{tracking.statusText}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-700">
                      <Clock className="h-4 w-4" />
                      <span>{tracking.statusText}</span>
                    </span>
                  )}
                </p>
              </div>

              {tracking.isMock ? (
                <span className="rounded-md bg-indigo-100 text-indigo-700 px-2.5 py-1 text-[11px] font-bold border border-indigo-200 flex items-center gap-1">
                  🧪 Mode Simulasi / Sandbox
                </span>
              ) : (
                <span className="rounded-md bg-emerald-100 text-emerald-800 px-2.5 py-1 text-[11px] font-bold border border-emerald-200 flex items-center gap-1">
                  🟢 Real Tracking Live (Binderbyte)
                </span>
              )}
            </div>

            {/* Informasi Pengirim & Penerima jika ada */}
            {(tracking.shipper || tracking.receiver || tracking.origin || tracking.destination) && (
              <div className="grid grid-cols-2 gap-2 text-xs p-3 rounded-xl bg-white border border-slate-200">
                <div>
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">
                    Pengirim (Shipper)
                  </span>
                  <p className="font-semibold text-slate-800 mt-0.5">{tracking.shipper || '-'}</p>
                  {tracking.origin && (
                    <p className="text-[11px] text-slate-500 mt-0.5">Asal: {tracking.origin}</p>
                  )}
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">
                    Penerima (Receiver)
                  </span>
                  <p className="font-semibold text-slate-800 mt-0.5">{tracking.receiver || '-'}</p>
                  {tracking.destination && (
                    <p className="text-[11px] text-slate-500 mt-0.5">Tujuan: {tracking.destination}</p>
                  )}
                </div>
              </div>
            )}

            {/* Riwayat Timeline */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Riwayat Perjalanan Paket
              </span>
              <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden bg-white max-h-48 overflow-y-auto">
                {tracking.history.map((h, idx) => (
                  <div key={idx} className="p-2.5 text-xs space-y-0.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{h.date}</span>
                      {h.location && (
                        <span className="font-medium text-slate-500">{h.location}</span>
                      )}
                    </div>
                    <p className="font-medium text-slate-800">{h.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Bagian Bukti Foto & Konfirmasi Penyelesaian Pesanan */}
        <div
          className={`mt-5 p-4 rounded-xl border transition-all ${
            isDelivered
              ? 'bg-emerald-50/60 border-emerald-200'
              : 'bg-slate-50/70 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Camera className="h-4 w-4 text-slate-700" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Bukti Foto Unboxing / Penerimaan Komik
            </h3>
          </div>

          <p className="text-xs text-slate-600 mb-3">
            {isDelivered
              ? 'Paket telah tiba! Unggah foto komik fisik yang telah Anda terima untuk menyelesaikan pesanan dan menandainya sebagai "Dimiliki" di Katalog.'
              : 'Foto dapat diunggah saat paket tiba di tangan Anda sebagai syarat penyelesaian pesanan.'}
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <label className="w-full sm:w-auto cursor-pointer inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs">
              <Upload className="h-4 w-4 text-slate-500" />
              <span>{photoPreview ? 'Ganti Foto Bukti' : 'Pilih / Ambil Foto'}</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </label>

            {photoPreview && (
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoPreview}
                  alt="Bukti Unboxing"
                  loading="lazy"
                  decoding="async"
                  className="h-12 w-12 object-cover rounded-lg border border-slate-200 shadow-2xs"
                />
                <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Foto siap diverifikasi
                </span>
              </div>
            )}
          </div>

          {/* Tombol Konfirmasi Selesai */}
          <div className="mt-4 pt-3 border-t border-slate-200/60 flex justify-end">
            <Button
              variant="primary"
              isLoading={completing}
              disabled={completing || !photoPreview}
              onClick={handleConfirmDeliveredAndComplete}
              className="text-xs font-bold shadow-glass bg-emerald-600 hover:bg-emerald-700"
            >
              {completing ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <PackageCheck className="h-4 w-4 mr-1.5" />
              )}
              <span>Konfirmasi Diterima &amp; Selesaikan Pesanan</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
