'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StatusPill } from '@/components/ui/StatusPill';
import { transitionPlanStatus } from '@/app/plans/actions';
import {
  STATUS_HINTS,
  STATUS_LABELS,
  TXN_TYPE_LABELS,
  isValidDateInput,
  requiresDeadline,
  transitionTransactionType,
  type PlanStatus,
} from '@/lib/plans';
import { todayISO } from '@/lib/budget';
import { formatRupiah, formatTanggal } from '@/lib/format';

export interface TransitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  planId: string;
  judul: string;
  from: PlanStatus;
  to: PlanStatus;
  /** Deadline bawaan dari listing; bisa dibiarkan kosong untuk diisi manual. */
  defaultDeadline?: string | null;
  /** Hold budget yang sedang aktif untuk plan ini, tampil sebagai konteks. */
  estimasiHarga?: number;
  sudahDibayar?: number;
}

/**
 * Remount komponen ini tiap kali dibuka (pemanggil me-render secara
 * kondisional), jadi state form selalu mulai dari nilai props terbaru tanpa
 * perlu effect untuk mereset.
 */
export function TransitionModal({
  isOpen,
  onClose,
  onSuccess,
  planId,
  judul,
  from,
  to,
  defaultDeadline,
  estimasiHarga,
  sudahDibayar = 0,
}: TransitionModalProps) {
  const sisaTagihan = Math.max((estimasiHarga ?? 0) - sudahDibayar, 0);
  const txnType = transitionTransactionType(from, to);

  const [deadline, setDeadline] = useState(defaultDeadline ?? '');
  const [jumlahBayar, setJumlahBayar] = useState(
    to === 'lunas' && sisaTagihan > 0 ? String(sisaTagihan) : ''
  );
  const [tanggalBayar, setTanggalBayar] = useState(() => todayISO());
  const [catatanBayar, setCatatanBayar] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsDeadline = requiresDeadline(to);
  const isCancel = to === 'batal';
  const halfEstimasi = estimasiHarga && estimasiHarga > 0 ? Math.round(estimasiHarga / 2) : 0;

  async function handleConfirm() {
    if (needsDeadline && !deadline.trim()) {
      setError('Deadline PO wajib diisi.');
      return;
    }

    if (needsDeadline && !isValidDateInput(deadline.trim())) {
      setError('Format deadline tidak valid (harus YYYY-MM-DD).');
      return;
    }

    const parsedBayar = jumlahBayar.trim() ? Number(jumlahBayar) : 0;
    if (txnType && (!Number.isFinite(parsedBayar) || parsedBayar < 0)) {
      setError('Nominal pembayaran tidak valid.');
      return;
    }

    if (txnType && parsedBayar > 0 && !isValidDateInput(tanggalBayar.trim())) {
      setError('Format tanggal bayar tidak valid (harus YYYY-MM-DD).');
      return;
    }

    setLoading(true);
    setError(null);

    const result = await transitionPlanStatus({
      planId,
      to,
      deadline_po: needsDeadline ? deadline.trim() : null,
      jumlah_bayar: txnType && parsedBayar > 0 ? parsedBayar : null,
      tanggal_bayar: txnType && parsedBayar > 0 ? tanggalBayar.trim() : null,
      catatan_bayar: txnType && parsedBayar > 0 ? catatanBayar.trim() || null : null,
    });

    setLoading(false);

    if (!result.success) {
      setError(result.error || 'Gagal mengubah status plan');
      return;
    }

    onSuccess?.();
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isCancel ? 'Batalkan Rencana' : 'Ubah Status Rencana'}
      description={judul}
      maxWidth="sm"
    >
      <div className="space-y-4">
        {error && (
          <div
            role="alert"
            className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200 font-medium"
          >
            {error}
          </div>
        )}

        {/* Transisi dari → ke */}
        <div className="flex items-center justify-center gap-3 rounded-xl bg-slate-50 border border-slate-200/80 p-3.5">
          <StatusPill status={from} size="sm" />
          <span aria-hidden="true" className="text-slate-300">
            &rarr;
          </span>
          <StatusPill status={to} size="sm" />
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          {STATUS_HINTS[to]}
        </p>

        {/* Deadline PO */}
        {needsDeadline && (
          <div className="space-y-1.5 rounded-xl border border-amber-200 bg-amber-50/70 p-3">
            <Input
              label="Deadline PO *"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              hint={
                defaultDeadline
                  ? `Diisi otomatis dari deadline listing (${formatTanggal(defaultDeadline)}), boleh diubah.`
                  : 'Listing tidak punya deadline, isi manual.'
              }
            />
            <p className="text-[11px] text-amber-800/80">
              Hold budget mulai dihitung begitu plan masuk status Pre-Order.
            </p>
          </div>
        )}

        {/* Form Pembayaran 1-Langkah (DP / Pelunasan / Bayar Penuh) */}
        {txnType && (
          <div className="space-y-3 rounded-xl border border-primary-200/80 bg-primary-50/40 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-800">
                Catat Transaksi {TXN_TYPE_LABELS[txnType]}
              </p>
              {sisaTagihan > 0 && (
                <span className="text-[11px] text-slate-500 tabular-nums">
                  Sisa tagihan: <strong>{formatRupiah(sisaTagihan)}</strong>
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              <Input
                label={`Nominal ${TXN_TYPE_LABELS[txnType]} (Rp)`}
                type="number"
                inputMode="numeric"
                min={0}
                step={1000}
                autoComplete="off"
                placeholder={sisaTagihan > 0 ? `${sisaTagihan}…` : 'Contoh: 25000…'}
                value={jumlahBayar}
                onChange={(e) => setJumlahBayar(e.target.value)}
                hint="Kosongkan atau isi 0 bila tidak ingin mencatat transaksi ke Budget."
              />

              {to === 'dp' && halfEstimasi > 0 && Number(jumlahBayar) !== halfEstimasi && (
                <button
                  type="button"
                  onClick={() => setJumlahBayar(String(halfEstimasi))}
                  className="text-[11px] font-semibold text-primary-600 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
                >
                  Isi 50% estimasi ({formatRupiah(halfEstimasi)})
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <Input
                label="Tanggal Bayar"
                type="date"
                value={tanggalBayar}
                onChange={(e) => setTanggalBayar(e.target.value)}
              />
              <Input
                label="Catatan (opsional)"
                type="text"
                autoComplete="off"
                placeholder="Mis. Transfer BCA…"
                value={catatanBayar}
                onChange={(e) => setCatatanBayar(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Dampak budget */}
        {isCancel && (
          <p className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">
            Hold budget untuk plan ini dilepas otomatis karena komitmen hanya menghitung plan
            berstatus PO atau DP.
          </p>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Batal
          </Button>
          <Button
            type="button"
            variant={isCancel ? 'danger' : 'primary'}
            onClick={handleConfirm}
            isLoading={loading}
          >
            {isCancel
              ? 'Ya, Batalkan'
              : `Ya, ${STATUS_LABELS[to]}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}