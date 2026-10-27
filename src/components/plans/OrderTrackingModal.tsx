'use client';

import React, { useState, useEffect } from 'react';
import {
  Truck,
  CheckCircle2,
  Clock,
  Camera,
  Upload,
  AlertCircle,
  ExternalLink,
  Sparkles,
  X,
  PackageCheck,
  RefreshCw,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { COURIER_OPTIONS, type TrackingResult } from '@/lib/binderbyte';

interface OrderTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: string;
  itemTitle: string;
  volume?: number | null;
  currentStatus: string;
  initialCourier?: string;
  initialResi?: string;
  onOrderCompleted?: () => void;
}

export function OrderTrackingModal({
  isOpen,
  onClose,
  planId,
  itemTitle,
  volume,
  currentStatus,
  initialCourier = 'spx',
  initialResi = '',
  onOrderCompleted,
}: OrderTrackingModalProps) {
  const [courier, setCourier] = useState(initialCourier);
  const [resi, setResi] = useState(initialResi);
  const [loading, setLoading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [tracking, setTracking] = useState<TrackingResult | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Muat status tracking yang ada saat modal dibuka
  useEffect(() => {
    if (isOpen && planId) {
      loadSavedTracking();
    }
  }, [isOpen, planId]);

  async function loadSavedTracking() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/tracking?plan_id=${encodeURIComponent(planId)}`);
      const data = await res.json();
      if (data.hasTracking && data.tracking) {
        setCourier(data.courier || initialCourier);
        setResi(data.resi || '');
        setTracking(data.tracking);
        if (data.photoUrl) setPhotoPreview(data.photoUrl);
      }
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckTracking(forceStatus?: 'ON_PROCESS' | 'DELIVERED') {
    if (!resi.trim()) {
      setErrorMsg('Masukkan nomor resi terlebih dahulu');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: planId,
          courier,
          resi: resi.trim(),
          foto_bukti_url: photoPreview,
          force_status: forceStatus || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setErrorMsg(data.error || 'Gagal melacak resi');
        return;
      }

      setTracking(data.tracking);
      setSuccessMsg('Informasi pelacakan berhasil diperbarui!');
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
          plan_id: planId,
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
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary-100 text-primary-700">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Lacak Pengiriman Pesanan
              </h2>
              <p className="text-xs text-slate-500 line-clamp-1">
                {itemTitle} {volume != null ? `(Vol. ${volume})` : ''}
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
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nomor Resi / Kode Pengiriman
              </label>
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
                  disabled={loading || !resi.trim()}
                  onClick={() => handleCheckTracking()}
                  className="shrink-0 text-xs"
                >
                  {loading ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : (
                    <Truck className="h-3.5 w-3.5 mr-1" />
                  )}
                  <span>Lacak</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Sandbox Simulation Bar untuk Pengujian Cepat */}
          <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-900">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              <span>Mode Uji Coba Cepat (Sandbox):</span>
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

              {tracking.isMock && (
                <span className="rounded-md bg-indigo-100 text-indigo-700 px-2 py-0.5 text-[10px] font-bold">
                  Simulasi Binderbyte
                </span>
              )}
            </div>

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
                <img
                  src={photoPreview}
                  alt="Bukti Unboxing"
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
