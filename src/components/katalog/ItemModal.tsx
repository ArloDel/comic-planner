'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { CoverImage } from '@/components/ui/CoverImage';
import { StatusPill } from '@/components/ui/StatusPill';
import type { ItemType, PlanStatus } from '@/types/database';
import { createItem, updateItem, type ItemFormData } from '@/app/katalog/actions';

export interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: {
    id: string;
    judul: string;
    seri?: string | null;
    volume?: number | null;
    penerbit?: string | null;
    tipe?: ItemType | null;
    cover_url?: string | null;
    status?: PlanStatus | 'belum ada';
    estimasi_harga?: number | null;
  } | null;
  defaultSeri?: string;
  defaultVolume?: number;
}

/**
 * State form diinisialisasi sekali dari props — pemanggil wajib meng-remount
 * lewat `key` kalau target yang diedit berubah, jadi tidak perlu effect yang
 * menyalin props ke state (dan memicu render berlapis).
 */
export function ItemModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
  defaultSeri,
  defaultVolume,
}: ItemModalProps) {
  const isEditing = Boolean(initialData?.id);
  const currentStatus = initialData?.status ?? 'belum ada';
  const hasAdvancedPlan =
    currentStatus !== 'belum ada' &&
    currentStatus !== 'batal' &&
    currentStatus !== 'wishlist';

  const seed = {
    judul:
      initialData?.judul ??
      (defaultSeri && defaultVolume ? `${defaultSeri} Vol. ${defaultVolume}` : ''),
    seri: initialData?.seri ?? defaultSeri ?? null,
    volume: initialData?.volume ?? defaultVolume ?? null,
    penerbit: initialData?.penerbit ?? null,
    tipe: initialData?.tipe ?? null,
    cover_url: initialData?.cover_url ?? null,
    masuk_wishlist: isEditing
      ? currentStatus !== 'belum ada' && currentStatus !== 'batal'
      : true,
    estimasi_harga: initialData?.estimasi_harga ?? null,
  };

  const [judul, setJudul] = useState(seed.judul);
  const [seri, setSeri] = useState(seed.seri ?? '');
  const [volume, setVolume] = useState(seed.volume != null ? String(seed.volume) : '');
  const [penerbit, setPenerbit] = useState(seed.penerbit ?? '');
  const [tipe, setTipe] = useState<ItemType>(seed.tipe ?? 'manga');
  const [coverUrl, setCoverUrl] = useState(seed.cover_url ?? '');
  const [masukWishlist, setMasukWishlist] = useState(seed.masuk_wishlist);
  const [estimasiHarga, setEstimasiHarga] = useState(
    seed.estimasi_harga ? String(seed.estimasi_harga) : ''
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!judul.trim()) {
      setError('Judul komik wajib diisi');
      return;
    }

    setLoading(true);
    setError(null);

    const payload: ItemFormData = {
      judul: judul.trim(),
      seri: seri.trim() || null,
      volume: volume ? parseInt(volume, 10) : null,
      penerbit: penerbit.trim() || null,
      tipe: tipe || null,
      cover_url: coverUrl.trim() || null,
      masuk_wishlist: hasAdvancedPlan ? true : masukWishlist,
      estimasi_harga: estimasiHarga ? parseFloat(estimasiHarga) : null,
    };

    let result;
    if (isEditing && initialData) {
      result = await updateItem(initialData.id, payload);
    } else {
      result = await createItem(payload);
    }

    setLoading(false);

    if (!result.success) {
      setError(result.error || 'Gagal menyimpan item');
    } else {
      onSuccess?.();
      onClose();
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Item Komik' : 'Tambah Item Baru'}
      description="Lengkapi informasi detail buku komik/manga untuk katalog Anda."
      maxWidth="lg"
    >
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200 font-medium"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Cover Preview & URL */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-start">
          <div className="sm:col-span-1">
            <span className="block text-xs font-semibold text-slate-700 mb-1.5">
              Pratinjau Cover
            </span>
            <div className="w-24 sm:w-full max-w-[120px] mx-auto">
              <CoverImage src={coverUrl} alt="Cover Preview" title={judul || 'Cover'} />
            </div>
          </div>

          <div className="sm:col-span-3 space-y-3">
            <Input
              label="URL Gambar Cover (Opsional)"
              placeholder="https://… (link gambar Shopee / web)"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              hint="Masukkan link gambar langsung. Otomatis tampil di pratinjau."
            />

            <Input
              label="Judul Item *"
              placeholder="Contoh: Chainsaw Man Vol. 12…"
              value={judul}
              onChange={(e) => setJudul(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Seri & Volume */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <Input
              label="Nama Seri (Opsional)"
              placeholder="Contoh: Chainsaw Man, One Piece…"
              value={seri}
              onChange={(e) => setSeri(e.target.value)}
              hint="Dikelompokkan bersama dalam view per seri."
            />
          </div>
          <div>
            <Input
              label="Nomor Volume"
              type="number"
              min="0"
              placeholder="12…"
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
            />
          </div>
        </div>

        {/* Penerbit & Tipe */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Penerbit (Opsional)"
            placeholder="Contoh: Elex Media, m&c!, Akasha…"
            value={penerbit}
            onChange={(e) => setPenerbit(e.target.value)}
          />

          <Select
            label="Tipe Komik"
            value={tipe}
            onChange={(e) => setTipe(e.target.value as ItemType)}
            options={[
              { value: 'manga', label: 'Manga (Jepang)' },
              { value: 'manhua', label: 'Manhua (China)' },
              { value: 'manhwa', label: 'Manhwa (Korea)' },
              { value: 'komik lokal', label: 'Komik Lokal' },
            ]}
          />
        </div>

        {/* Wishlist Toggle & Estimasi Harga (Progres Status Satu Pintu di /plans) */}
        <div className="space-y-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
          {hasAdvancedPlan ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-700">Status Rencana:</span>
                <StatusPill status={currentStatus} size="sm" />
              </div>
              <Link
                href="/plans"
                onClick={onClose}
                className="text-xs font-semibold text-primary-600 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
              >
                Ubah progres status di Rencana →
              </Link>
            </div>
          ) : (
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={masukWishlist}
                onChange={(e) => setMasukWishlist(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-xs text-slate-700">
                <strong className="font-semibold text-slate-900">
                  Masukkan ke Wishlist Rencana Belanja
                </strong>
                <span className="block text-[11px] text-slate-500 mt-0.5">
                  Progres ke Pre-Order, DP, Lunas, dan Diterima dilanjutkan satu pintu di menu
                  Rencana.
                </span>
              </span>
            </label>
          )}

          {(masukWishlist || hasAdvancedPlan) && (
            <Input
              label="Estimasi Harga (Rp)"
              type="number"
              inputMode="numeric"
              min="0"
              step="1000"
              placeholder="Contoh: 45000…"
              value={estimasiHarga}
              onChange={(e) => setEstimasiHarga(e.target.value)}
              hint="Digunakan untuk estimasi dan kalkulasi komitmen anggaran."
            />
          )}
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Batal
          </Button>
          <Button type="submit" variant="primary" isLoading={loading}>
            {isEditing ? 'Simpan Perubahan' : 'Tambah ke Katalog'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
