'use client';

import React, { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { createPlan, updatePlanDetails } from '@/app/plans/actions';
import { PRIORITIES, priorityLabel } from '@/lib/plans';
import { formatRupiah } from '@/lib/format';
import type { PlanItemOption, PlanWithDetails } from '@/app/plans/PlansClient';

export interface PlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  items: PlanItemOption[];
  defaultItemId?: string;
  /** Bila diisi, modal beralih ke mode Edit Prioritas & Estimasi untuk plan tersebut. */
  initialPlan?: PlanWithDetails | null;
}

export function PlanModal({
  isOpen,
  onClose,
  onSuccess,
  items,
  defaultItemId,
  initialPlan,
}: PlanModalProps) {
  const isEditing = Boolean(initialPlan?.id);

  const [itemId, setItemId] = useState(initialPlan?.item_id ?? defaultItemId ?? '');
  const [listingId, setListingId] = useState(initialPlan?.listing_id ?? '');
  const [prioritas, setPrioritas] = useState(String(initialPlan?.prioritas ?? 3));
  const [estimasiHarga, setEstimasiHarga] = useState(
    initialPlan && initialPlan.estimasi_harga > 0 ? String(initialPlan.estimasi_harga) : ''
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedItem = useMemo(
    () => items.find((item) => item.id === itemId) ?? null,
    [items, itemId]
  );

  function handleItemChange(value: string) {
    setItemId(value);
    setListingId('');

    const next = items.find((item) => item.id === value);
    const estimasi = next?.estimasi_harga;

    if (typeof estimasi === 'number' && estimasi > 0) {
      setEstimasiHarga(String(Math.round(estimasi)));
    }
  }

  function handleListingChange(value: string) {
    setListingId(value);
    if (!value) return;

    const chosen = selectedItem?.listings.find((l) => l.id === value);
    if (chosen && chosen.harga > 0 && (!estimasiHarga || Number(estimasiHarga) === 0)) {
      setEstimasiHarga(String(Math.round(chosen.harga)));
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

    const result =
      isEditing && initialPlan
        ? await updatePlanDetails({
            id: initialPlan.id,
            prioritas: Number(prioritas),
            estimasi_harga: estimasiHarga ? Number(estimasiHarga) : 0,
            listing_id: listingId || null,
          })
        : await createPlan({
            item_id: itemId,
            listing_id: listingId || null,
            prioritas: Number(prioritas),
            estimasi_harga: estimasiHarga ? Number(estimasiHarga) : 0,
          });

    setLoading(false);

    if (!result.success) {
      setError(
        result.error || (isEditing ? 'Gagal memperbarui rencana' : 'Gagal membuat rencana')
      );
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
      title={isEditing ? 'Edit Prioritas & Estimasi Rencana' : 'Tambah Rencana Belanja'}
      description={
        isEditing
          ? initialPlan?.item?.judul ?? 'Atur ulang prioritas dan estimasi harga plan ini.'
          : 'Rencana baru selalu dimulai dari status Wishlist, lalu dilanjutkan ke pengiriman dan penerimaan.'
      }
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

      {!isEditing && items.length === 0 ? (
        <p className="mb-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 border border-amber-200">
          Belum ada item di katalog. Tambahkan komik dulu di halaman Katalog sebelum membuat
          rencana.
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        {!isEditing && (
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
        )}

        <Select
          label="Listing Referensi (Opsional)"
          value={listingId}
          onChange={(e) => handleListingChange(e.target.value)}
          disabled={!itemId}
          hint={
            listingOptions.length === 0
              ? itemId
                ? 'Item ini belum punya listing toko referensi.'
                : 'Pilih item dulu untuk melihat listing yang tersedia.'
              : 'Menautkan listing mengisi estimasi harga otomatis.'
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
            label="Prioritas (#1–#5)"
            value={prioritas}
            onChange={(e) => setPrioritas(e.target.value)}
            hint="1 = paling diutamakan saat budget mepet."
            options={PRIORITIES.map((value) => ({
              value: String(value),
              label: `#${value} — ${priorityLabel(value)}`,
            }))}
          />

          <Input
            label="Estimasi Harga (Rp)"
            type="number"
            inputMode="numeric"
            min="0"
            step="1000"
            placeholder="Contoh: 45000…"
            value={estimasiHarga}
            onChange={(e) => setEstimasiHarga(e.target.value)}
            hint="Perkiraan harga beli untuk referensi anggaran."
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Batal
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={loading}
            disabled={!isEditing && items.length === 0}
          >
            {isEditing ? 'Simpan Perubahan' : 'Simpan Rencana'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
