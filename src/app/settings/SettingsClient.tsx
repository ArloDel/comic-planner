'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Check,
  Copy,
  DatabaseBackup,
  Download,
  ExternalLink,
  KeyRound,
  LogOut,
  ShieldCheck,
  Store,
  Wallet,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { ToastHost, useToast } from '@/components/ui/Toast';
import { formatPeriode } from '@/lib/budget';
import { formatRupiah, formatTanggalJam } from '@/lib/format';
import { toCsv, type TrackedShopSummary } from '@/lib/settings';
import { upsertBudget } from '@/app/budget/actions';
import { logout } from '@/app/auth/actions';

export type { TrackedShopSummary } from '@/lib/settings';

export interface BackupDataPayload {
  exported_at: string;
  items: Record<string, unknown>[];
  listings: Record<string, unknown>[];
  plans: Record<string, unknown>[];
  transactions: Record<string, unknown>[];
}

interface SettingsClientProps {
  userEmail: string | null;
  allowedEmailConfigured: boolean;
  importToken: string | null;
  maskedToken: string | null;
  periode: string;
  currentBudget: number;
  prevBudget: number;
  shops: TrackedShopSummary[];
  backupData: BackupDataPayload;
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function SettingsClient({
  userEmail,
  allowedEmailConfigured,
  importToken,
  maskedToken,
  periode,
  currentBudget,
  prevBudget,
  shops,
  backupData,
}: SettingsClientProps) {
  const router = useRouter();
  const { toast, showToast, dismissToast } = useToast();
  const [copiedToken, setCopiedToken] = useState(false);
  const [budgetInput, setBudgetInput] = useState(String(currentBudget));
  const [savingBudget, setSavingBudget] = useState(false);

  async function handleCopyToken() {
    if (!importToken) return;
    try {
      await navigator.clipboard.writeText(importToken);
      setCopiedToken(true);
      showToast({ title: 'Import token tersalin', tone: 'success' });
      setTimeout(() => setCopiedToken(false), 2000);
    } catch {
      showToast({ title: 'Gagal menyalin token', tone: 'error' });
    }
  }

  async function handleSaveBudget(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingBudget(true);
    try {
      const amount = Math.max(0, Number(budgetInput) || 0);
      const res = await upsertBudget(periode, amount);
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
        description: formatRupiah(amount),
        tone: 'success',
      });
      router.refresh();
    } finally {
      setSavingBudget(false);
    }
  }

  function handleExportCsv(table: 'items' | 'plans' | 'transactions') {
    const dateStamp = new Date().toISOString().slice(0, 10);
    if (table === 'items') {
      const csv = toCsv(backupData.items, [
        'id',
        'judul',
        'seri',
        'volume',
        'penerbit',
        'tipe',
        'cover_url',
        'created_at',
      ]);
      downloadBlob(csv, `comicplan-items-${dateStamp}.csv`, 'text/csv;charset=utf-8');
    } else if (table === 'plans') {
      const csv = toCsv(backupData.plans, [
        'id',
        'item_id',
        'listing_id',
        'prioritas',
        'estimasi_harga',
        'status',
        'deadline_po',
        'created_at',
      ]);
      downloadBlob(csv, `comicplan-plans-${dateStamp}.csv`, 'text/csv;charset=utf-8');
    } else {
      const csv = toCsv(backupData.transactions, [
        'id',
        'plan_id',
        'jenis',
        'jumlah',
        'tanggal',
        'catatan',
        'created_at',
      ]);
      downloadBlob(csv, `comicplan-transactions-${dateStamp}.csv`, 'text/csv;charset=utf-8');
    }

    showToast({ title: `CSV ${table} diunduh`, tone: 'success' });
  }

  function handleExportJson() {
    const dateStamp = new Date().toISOString().slice(0, 10);
    downloadBlob(
      JSON.stringify(backupData, null, 2),
      `comicplan-backup-${dateStamp}.json`,
      'application/json;charset=utf-8'
    );
    showToast({ title: 'Backup JSON lengkap diunduh', tone: 'success' });
  }

  return (
    <div className="space-y-5">
      <ToastHost toast={toast} onClose={dismissToast} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 1. Akun & Keamanan Single-User (§6.10) */}
        <GlassCard className="p-5 flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary-600 shrink-0" aria-hidden="true" />
                <h2 className="text-base font-semibold text-slate-900">Akun &amp; Single-User</h2>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                  allowedEmailConfigured
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-amber-200 bg-amber-50 text-amber-800'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    allowedEmailConfigured ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                  aria-hidden="true"
                />
                <span>{allowedEmailConfigured ? 'Email Guard Aktif' : 'Guard Env Opsional'}</span>
              </span>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white/70 px-3.5 py-2.5">
              <p className="text-[11px] font-medium text-slate-500">Email Pemilik Aktif</p>
              <p className="text-sm font-semibold text-slate-900 truncate mt-0.5">
                {userEmail || 'Owner Akun'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Mode personal 1 pengguna dilindungi trigger DB &amp; sesi Supabase.
            </p>
            <form action={logout}>
              <Button type="submit" variant="danger" size="sm">
                <LogOut className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                <span>Keluar</span>
              </Button>
            </form>
          </div>
        </GlassCard>

        {/* 2. Import Token (§6.10) */}
        <GlassCard className="p-5 flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-primary-600 shrink-0" aria-hidden="true" />
                <h2 className="text-base font-semibold text-slate-900">Import Token Userscript</h2>
              </div>
              <Link
                href="/import"
                className="text-xs font-semibold text-primary-600 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
              >
                Halaman Impor →
              </Link>
            </div>

            <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white/80 px-3.5 py-2.5">
              <code className="text-xs font-mono text-slate-800 truncate">
                {maskedToken ?? 'IMPORT_TOKEN belum diatur di .env.local'}
              </code>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={!importToken}
                onClick={handleCopyToken}
              >
                {copiedToken ? (
                  <Check className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                ) : (
                  <Copy className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                )}
                <span>Copy</span>
              </Button>
            </div>
          </div>

          <p className="text-xs text-slate-500 border-t border-slate-100 pt-3">
            Untuk merotasi token, ubah nilai <code>IMPORT_TOKEN</code> di <code>.env.local</code>{' '}
            lalu perbarui di pengaturan panel Tampermonkey.
          </p>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 3. Budget Periode Berjalan (§6.10) */}
        <GlassCard className="p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary-600 shrink-0" aria-hidden="true" />
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Budget Bulan Ini ({formatPeriode(periode)})
                </h2>
                <p className="text-xs text-slate-500">
                  Atur cepat alokasi budget periode berjalan
                </p>
              </div>
            </div>
            <Link
              href="/budget"
              className="text-xs font-semibold text-primary-600 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
            >
              Detail Budget →
            </Link>
          </div>

          <form onSubmit={handleSaveBudget} className="space-y-3">
            <div>
              <label htmlFor="settings-budget-input" className="block text-xs font-semibold text-slate-700 mb-1">
                Nominal Budget (Rp)
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="settings-budget-input"
                  name="total_budget"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={10000}
                  autoComplete="off"
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm tabular-nums text-slate-900 focus-visible:border-primary-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/20"
                />
                <Button type="submit" variant="primary" size="sm" isLoading={savingBudget} disabled={savingBudget}>
                  <span>{savingBudget ? 'Menyimpan…' : 'Simpan'}</span>
                </Button>
              </div>
            </div>

            {prevBudget > 0 && Number(budgetInput) !== prevBudget && (
              <button
                type="button"
                onClick={() => setBudgetInput(String(prevBudget))}
                className="text-xs font-semibold text-primary-600 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
              >
                Gunakan nominal bulan lalu ({formatRupiah(prevBudget)})
              </button>
            )}
          </form>
        </GlassCard>

        {/* 4. Backup & Ekspor Data CSV / JSON (PRD §7 Keandalan) */}
        <GlassCard className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <DatabaseBackup className="h-4 w-4 text-primary-600 shrink-0" aria-hidden="true" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">Backup &amp; Ekspor Data</h2>
              <p className="text-xs text-slate-500">
                Unduh salinan lokal CSV atau JSON seluruh koleksi &amp; transaksi
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => handleExportCsv('items')}
            >
              <Download className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
              <span>CSV Katalog ({backupData.items.length})</span>
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => handleExportCsv('plans')}
            >
              <Download className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
              <span>CSV Rencana ({backupData.plans.length})</span>
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => handleExportCsv('transactions')}
            >
              <Download className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
              <span>CSV Transaksi ({backupData.transactions.length})</span>
            </Button>

            <Button type="button" variant="primary" size="sm" onClick={handleExportJson}>
              <Download className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
              <span>Backup JSON Lengkap</span>
            </Button>
          </div>
        </GlassCard>
      </div>

      {/* 5. Toko Shopee Terlacak (§6.10) */}
      <GlassCard className="p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-primary-600 shrink-0" aria-hidden="true" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Toko Shopee Terlacak ({shops.length})
              </h2>
              <p className="text-xs text-slate-500">
                Dikelompokkan otomatis dari riwayat listing yang pernah diimpor
              </p>
            </div>
          </div>
        </div>

        {shops.length === 0 ? (
          <p className="text-xs text-slate-500 py-2">
            Belum ada toko yang terlacak. Toko akan muncul otomatis setelah Anda mengimpor produk
            dari Shopee.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-white/60">
            {shops.map((shop) => (
              <div
                key={shop.shop_id}
                className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-xs"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 truncate">
                    {shop.nama_toko || `Toko #${shop.shop_id}`}
                  </p>
                  <p className="text-[11px] text-slate-500 tabular-nums">
                    ID: {shop.shop_id} · {shop.total_listings} produk ({shop.po_count} PO) · sinkron{' '}
                    {formatTanggalJam(shop.last_synced_at)}
                  </p>
                </div>

                <a
                  href={`https://shopee.co.id/shop/${shop.shop_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Buka ${shop.nama_toko || shop.shop_id} di Shopee`}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:border-primary-300 hover:text-primary-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 shrink-0"
                >
                  <span>Buka Toko</span>
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
