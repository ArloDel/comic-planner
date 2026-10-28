'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { createTransaction } from './actions';
import { STATUS_LABELS, TXN_TYPE_LABELS, txnAllowedForStatus, type PlanStatus } from '@/lib/plans';
import { formatRupiah, formatNumberInput, parseNumberInput } from '@/lib/format';
import type { TransactionType } from '@/types/database';

export interface TransactionPlanOption {
  id: string;
  label: string;
  status: PlanStatus;
  estimasi_harga: number;
}

const TXN_TYPES: TransactionType[] = ['bayar_penuh', 'refund'];

export function TransactionModal({
  plans,
}: {
  plans: TransactionPlanOption[];
}) {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [planId, setPlanId] = useState('');
  const [jenis, setJenis] = useState<TransactionType>('bayar_penuh');
  const [jumlah, setJumlah] = useState('');
  const [tanggal, setTanggal] = useState(() => new Date().toISOString().slice(0, 10));
  const [catatan, setCatatan] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = plans.find((plan) => plan.id === planId) ?? null;

  const allowedTypes = selected ? TXN_TYPES.filter((t) => txnAllowedForStatus(t, selected.status)) : [];

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!planId) {
      setError('Plan wajib dipilih.');
      return;
    }

    const numericJumlah = parseNumberInput(jumlah);
    if (!numericJumlah || numericJumlah <= 0) {
      setError('Jumlah transaksi harus lebih dari 0.');
      return;
    }

    setLoading(true);
    setError(null);

    const result = await createTransaction({
      plan_id: planId,
      jenis,
      jumlah: numericJumlah,
      tanggal,
      catatan: catatan.trim() || null,
    });

    setLoading(false);

    if (!result.success) {
      setError(result.error || 'Gagal mencatat transaksi');
      return;
    }

    router.refresh();
    setIsOpen(false);
  }

  return (
    <>
      <Button variant="primary" size="sm" onClick={() => setIsOpen(true)}>
        <Plus className="h-4 w-4 mr-1.5" />
        <span>Catat Transaksi</span>
      </Button>

      {isOpen && (
        <Modal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="Catat Transaksi"
          description="Pembayaran dan refund untuk pesanan komik."
          maxWidth="md"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                role="alert"
                className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700"
              >
                {error}
              </div>
            )}

            <Select
              label="Plan *"
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              hint={selected ? `Status saat ini: ${STATUS_LABELS[selected.status]}` : undefined}
              options={[
                { value: '', label: '— Pilih plan —' },
                ...plans.map((plan) => ({
                  value: plan.id,
                  label: `${plan.label} (${STATUS_LABELS[plan.status]})`,
                })),
              ]}
            />

            {selected && (
              <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                Estimasi harga: <strong>{formatRupiah(selected.estimasi_harga)}</strong>
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="Jenis"
                value={jenis}
                onChange={(e) => setJenis(e.target.value as TransactionType)}
                disabled={!planId || allowedTypes.length === 0}
                options={(allowedTypes.length ? allowedTypes : TXN_TYPES).map((type) => ({
                  value: type,
                  label: TXN_TYPE_LABELS[type],
                }))}
              />

              <Input
                label="Jumlah (Rp) *"
                type="text"
                inputMode="numeric"
                placeholder="Contoh: 45.000"
                value={jumlah}
                onChange={(e) => setJumlah(formatNumberInput(e.target.value))}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Tanggal"
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
              />

              <Input
                label="Catatan (opsional)"
                type="text"
                placeholder="mis. Beli di Shopee"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
              />
            </div>

            {selected && (
              <p className="text-[11px] text-slate-500">
                {allowedTypes.length > 0
                  ? `Jenis yang sah untuk status ${STATUS_LABELS[selected.status]}: ${allowedTypes
                      .map((t) => TXN_TYPE_LABELS[t])
                      .join(', ')}.`
                  : `Status ${STATUS_LABELS[selected.status]} tidak menerima transaksi baru.`}
              </p>
            )}

            <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-3">
              <Button type="button" variant="secondary" onClick={() => setIsOpen(false)} disabled={loading}>
                Batal
              </Button>
              <Button type="submit" variant="primary" isLoading={loading} disabled={!planId}>
                Simpan Transaksi
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
