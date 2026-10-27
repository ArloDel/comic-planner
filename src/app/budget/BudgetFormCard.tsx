'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { ToastHost, useToast } from '@/components/ui/Toast';
import { formatPeriode } from '@/lib/budget';
import { formatRupiah } from '@/lib/format';
import { upsertBudget } from './actions';

interface BudgetFormCardProps {
  periode: string;
  initialBudget: number;
}

/**
 * Dirender dengan `key={periode}` di `budget/page.tsx` supaya input otomatis
 * ter-reset saat berpindah bulan tanpa perlu `useEffect`.
 */
export function BudgetFormCard({ periode, initialBudget }: BudgetFormCardProps) {
  const router = useRouter();
  const { toast, showToast, dismissToast } = useToast();
  const [amount, setAmount] = useState(String(initialBudget));
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    try {
      const numeric = Math.max(0, Number(amount) || 0);
      const res = await upsertBudget(periode, numeric);
      if (!res.success) {
        showToast({
          title: 'Gagal menyimpan budget',
          description: res.error,
          tone: 'error',
        });
        return;
      }

      showToast({
        title: `Budget ${formatPeriode(periode)} disimpan`,
        description: formatRupiah(numeric),
        tone: 'success',
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <ToastHost toast={toast} onClose={dismissToast} />
      <form onSubmit={handleSubmit}>
        <StatCard
          label="Total Budget"
          value={formatRupiah(initialBudget)}
          icon={<Pencil className="h-4 w-4" />}
          iconTone="primary"
        >
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              name="total_budget"
              inputMode="numeric"
              autoComplete="off"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              step="10000"
              aria-label={`Total budget periode ${formatPeriode(periode)}`}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white/80 px-2.5 py-2 text-xs tabular-nums text-slate-900 focus-visible:border-primary-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/20"
            />
            <Button type="submit" size="sm" variant="secondary" isLoading={saving} disabled={saving}>
              <span>{saving ? 'Menyimpan…' : 'Simpan'}</span>
            </Button>
          </div>
        </StatCard>
      </form>
    </>
  );
}
