'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { AlertTriangle } from 'lucide-react';
import { deleteItem } from '@/app/katalog/actions';

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  item: {
    id: string;
    judul: string;
    seri?: string | null;
  } | null;
}

export function DeleteModal({ isOpen, onClose, onSuccess, item }: DeleteModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!item) return null;

  async function handleDelete() {
    if (!item) return;

    setLoading(true);
    setError(null);

    const result = await deleteItem(item.id, item.seri);
    setLoading(false);

    if (!result.success) {
      setError(result.error || 'Gagal menghapus item');
    } else {
      onSuccess?.();
      onClose();
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="sm">
      <div className="text-center pt-2">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 mb-3 shadow-sm">
          <AlertTriangle className="h-6 w-6" />
        </div>

        <h3 className="text-base font-bold text-slate-900 leading-tight">
          Hapus Item Komik?
        </h3>

        <p className="mt-2 text-xs text-slate-500 leading-relaxed">
          Apakah Anda yakin ingin menghapus <strong className="text-slate-800 font-semibold">{item.judul}</strong> dari katalog?
        </p>

        <div className="mt-3 p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-[11px] text-amber-800 text-left">
          <strong>Perhatian:</strong> Menghapus item ini juga akan menghapus data rencana (plan) dan tautan listing toko marketplace yang terhubung.
        </div>

        {error && (
          <div role="alert" className="mt-3 rounded-lg bg-rose-50 p-2 text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        <div className="mt-5 flex items-center justify-center gap-2.5">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading} className="w-1/2">
            Batal
          </Button>
          <Button type="button" variant="danger" onClick={handleDelete} isLoading={loading} className="w-1/2">
            Hapus Item
          </Button>
        </div>
      </div>
    </Modal>
  );
}
