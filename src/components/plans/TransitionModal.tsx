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
  isValidDateInput,
  requiresDeadline,
  type PlanStatus,
} from '@/lib/plans';
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
  const [deadline, setDeadline] = useState(defaultDeadline ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsDeadline = requiresDeadline(to);
  const isCancel = to === 'batal';

  async function handleConfirm() {
    if (needsDeadline && !deadline.trim()) {
      setError('Deadline PO wajib diisi.');
      return;
    }

    if (needsDeadline && !isValidDateInput(deadline.trim())) {
      setError('Format deadline tidak valid (harus YYYY-MM-DD).');
      return;
    }

    setLoading(true);
    setError(null);

    const result = await transitionPlanStatus({
      planId,
      to,
      deadline_po: needsDeadline ? deadline.trim() : null,
    });

    setLoading(false);

    if (!result.success) {
      setError(result.error || 'Gagal mengubah status plan');
      return;
    }

    onSuccess?.();
    onClose();
  }

  const sisaKomitmen =
    requiresDeadline(from) || requiresDeadline(to)
      ? Math.max((estimasiHarga ?? 0) - sudahDibayar, 0)
      : 0;

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

        {/* Dampak budget */}
        {isCancel && (
          <p className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">
            Hold budget untuk plan ini dilepas otomatis karena komitmen hanya menghitung plan
            berstatus PO atau DP.
          </p>
        )}

        {!isCancel && (from === 'po' || from === 'dp') && to !== 'diterima' && (
          <p className="text-[11px] text-slate-500">
            Sisa komitmen plan ini: {formatRupiah(sisaKomitmen)} (estimasi dikurangi yang sudah
            dibayar).
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