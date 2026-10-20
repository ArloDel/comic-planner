'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { deleteTransaction } from './actions';

interface DeleteTransactionButtonProps {
  id: string;
  label: string;
}

export function DeleteTransactionButton({ id, label }: DeleteTransactionButtonProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const res = await deleteTransaction(id);
      if (!res.success) {
        setError(res.error || 'Gagal menghapus');
        setConfirming(false);
        return;
      }
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  if (confirming) {
    return (
      <div className="inline-flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="inline-flex h-8 items-center rounded-lg bg-rose-600 px-2.5 text-[11px] font-semibold text-white hover:bg-rose-700 disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
        >
          {deleting ? 'Menghapus…' : 'Hapus'}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={deleting}
          className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          Batal
        </button>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      {error && (
        <span role="alert" className="text-[11px] font-medium text-rose-600">
          {error}
        </span>
      )}
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label={`Hapus transaksi ${label}`}
        title={`Hapus transaksi ${label}`}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
