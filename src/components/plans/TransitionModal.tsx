'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { StatusPill } from '@/components/ui/StatusPill';
import { transitionPlanStatus } from '@/app/plans/actions';
import {
  STATUS_HINTS,
  STATUS_LABELS,
  type PlanStatus,
} from '@/lib/plans';

export interface TransitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  planId: string;
  judul: string;
  from: PlanStatus;
  to: PlanStatus;
}

export function TransitionModal({
  isOpen,
  onClose,
  onSuccess,
  planId,
  judul,
  from,
  to,
}: TransitionModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCancel = to === 'batal';

  async function handleConfirm() {
    setLoading(true);
    setError(null);

    const result = await transitionPlanStatus({
      planId,
      to,
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
