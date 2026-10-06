'use client';

import React, { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { createPlan } from '@/app/plans/actions';
import {
  PRIORITIES,
  formatRupiah,
  priorityLabel,
} from '@/lib/plans';
import type { PlanItemOption } from '@/app/plans/PlansClient';

export interface PlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  items: PlanItemOption[];
  defaultItemId?: string;
}

/**
 * Remount komponen ini tiap kali dibuka (pemanggil me-render secara
 * kondisional), jadi form selalu mulai kosong tanpa perlu effect untuk mereset.
 */
export function PlanModal({ isOpen, onClose, onSuccess, items, defaultItemId }: PlanModalProps) {
  const [itemId, setItemId] = useState(defaultItemId ?? '');
  const [listingId, setListingId] = useState('');
  const [prioritas, setPrioritas] = useState('3');
  const [estimasiHarga, setEstimasiHarga] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedItem = useMemo(
    () => items.find((item) => item.id === itemId) ?? null,
    [items, itemId]
  );

  function handleItemChange(value: string) {
    setItemId(value);
    // Ganti item → listing ikut difilter ke listing milik item tersebut.
    setListingId('');

    const next = items.find((item) => item.id === value);
    const estimasi = next?.estimasi_harga;

    // Pre-fill estimasi dari plan aktif item itu kalau ada, biar tidak ketik ulang.
    if (typeof estimasi === 'number' && estimasi > 0) {
      setEstimasiHarga(String(Math.round(estimasi)));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!itemId) {
      setError('Item wajib dipilih.');
      return;
    }

    setLoading(true);
    setError(null);

    const result = await createPlan({
      item_id: itemId,
      listing_id: listingId || null,
      prioritas: Number(prioritas),
      estimasi_harga: estimasiHarga ? Number(estimasiHarga) : 0,
    });

    setLoading(false);

    if (!result.success) {
      setError(result.error || 'Gagal membuat rencana');
      return;
    }

    onSuccess?.();
    onClose();
  }

  const listingOptions = selectedItem?.listings ?? [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tambah Rencana Belanja"
      description="Rencana baru selalu dimulai dari status Wishlist, lalu dimejutkan lewat status."
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

      {items.length === 0 ? (
        <p className="mb-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 border border-amber-200">
          Belum ada item di katalog. Tambahkan komik dulu di halaman Katalog sebelum membuat
          rencana.
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Item Komik *"
          value={itemId}
          onChange={(e) => handleItemChange(e.target.value)}
          hint={selectedItem ? selectedItem.judul : undefined}
          options={[
            { value: '', label: '— Pilih item —' },
            ...items.map((item) => ({
              value: item.id,
              label: item.seri ? `${item.judul} (${item.seri})` : item.judul,
            })),
          ]}
        />

        <Select
          label="Listing (Opsional)"
          value={listingId}
          onChange={(e) => setListingId(e.target.value)}
          disabled={!itemId}
          hint={
            listingOptions.length === 0
              ? itemId
                ? 'Item ini belum punya listing. Deadline PO nanti diisi manual saat masuk status PO.'
                : 'Pilih item dulu untuk melihat listing yang tersedia.'
              : 'Menautkan listing mengisi deadline PO otomatis saat status jadi PO.'
          }
          options={[
            { value: '', label: '— Tanpa listing —' },
            ...listingOptions.map((listing) => ({
              value: listing.id,
              label: `${listing.nama_toko || listing.marketplace} — ${formatRupiah(listing.harga)}`,
            })),
          ]}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
          <Select
            label="Prioritas"
            value={prioritas}
            onChange={(e) => setPrioritas(e.target.value)}
            hint="1 = paling diutamakan saat budget mepet."
            options={PRIORITIES.map((value) => ({
              value: String(value),
              label: `${value} — ${priorityLabel(value)}`,
            }))}
          />

          <Input
            label="Estimasi Harga (Rp)"
            type="number"
            min="0"
            step="1000"
            placeholder="Contoh: 45000"
            value={estimasiHarga}
            onChange={(e) => setEstimasiHarga(e.target.value)}
            hint="Dipakai rumus komitmen begitu plan masuk PO/DP."
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Batal
          </Button>
          <Button type="submit" variant="primary" isLoading={loading} disabled={items.length === 0}>
            Simpan Rencana
          </Button>
        </div>
      </form>
    </Modal>
  );
}