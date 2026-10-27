'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Check,
  Code2,
  Copy,
  Download,
  ExternalLink,
  FileJson,
  KeyRound,
  PackageCheck,
  Store,
  Upload,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListingStatusDot } from '@/components/ui/StatusPill';
import { ToastHost, useToast } from '@/components/ui/Toast';
import { formatRupiah, formatTanggal, formatTanggalJam } from '@/lib/format';
import type { ListingStatus } from '@/types/database';

export interface ImportedListingItem {
  id: string;
  item_id: string;
  judul: string;
  seri: string | null;
  volume: number | null;
  cover_url: string | null;
  shop_id: string;
  item_id_shopee: string;
  nama_toko: string | null;
  url: string | null;
  harga: number;
  status: ListingStatus;
  deadline_po: string | null;
  updated_at: string;
}

interface ImportClientProps {
  importToken: string | null;
  maskedToken: string | null;
  userscriptSource: string | null;
  listings: ImportedListingItem[];
}

const SAMPLE_PAYLOAD = `{
  "items": [
    {
      "itemid": "987654321",
      "shopid": "555000111",
      "nama": "One Piece Vol. 105",
      "harga_raw": 4500000000,
      "label_po": true,
      "deadline_po": "2026-11-15",
      "nama_toko": "Manga Store ID",
      "seri": "One Piece",
      "volume": 105
    }
  ]
}`;

export function ImportClient({
  importToken,
  maskedToken,
  userscriptSource,
  listings,
}: ImportClientProps) {
  const router = useRouter();
  const { toast, showToast, dismissToast } = useToast();
  const [copiedField, setCopiedField] = useState<'token' | 'endpoint' | 'script' | null>(null);
  const [jsonInput, setJsonInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const todayPrefix = new Date().toISOString().slice(0, 10);

  async function copyText(value: string, field: 'token' | 'endpoint' | 'script', label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      showToast({ title: `${label} tersalin`, tone: 'success' });
      setTimeout(() => setCopiedField((prev) => (prev === field ? null : prev)), 2000);
    } catch {
      showToast({
        title: `Gagal menyalin ${label.toLowerCase()}`,
        description: 'Pastikan izin clipboard aktif di browser Anda.',
        tone: 'error',
      });
    }
  }

  function getResolvedUserscript(): string | null {
    if (!userscriptSource) return null;
    if (typeof window === 'undefined') return userscriptSource;
    return userscriptSource.replace(
      /const DEFAULT_API_URL = '[^']+';/,
      `const DEFAULT_API_URL = '${window.location.origin}/api/import';`
    );
  }

  function handleDownloadUserscript() {
    const resolved = getResolvedUserscript();
    if (!resolved) return;
    const blob = new Blob([resolved], { type: 'text/javascript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'comicplan-import.user.js';
    a.click();
    URL.revokeObjectURL(url);
    showToast({ title: 'File userscript diunduh', tone: 'success' });
  }

  async function handleManualImport(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!importToken) {
      showToast({
        title: 'IMPORT_TOKEN belum diatur',
        description: 'Isi IMPORT_TOKEN di .env.local lalu restart server.',
        tone: 'error',
      });
      return;
    }

    const trimmed = jsonInput.trim();
    if (!trimmed) {
      showToast({ title: 'Payload JSON masih kosong', tone: 'error' });
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      showToast({
        title: 'Format JSON tidak valid',
        description: 'Periksa tanda kutip dan kurung kurawal pada JSON Anda.',
        tone: 'error',
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Import-Token': importToken,
        },
        body: JSON.stringify(parsed),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast({
          title: 'Impor gagal',
          description: data.error || `HTTP ${res.status}`,
          tone: 'error',
        });
        return;
      }

      showToast({
        title: `${data.created ?? 0} dibuat · ${data.updated ?? 0} diperbarui`,
        description:
          data.skipped > 0 ? `${data.skipped} produk dilewati karena data tidak lengkap.` : undefined,
        tone: 'success',
      });
      setJsonInput('');
      router.refresh();
    } catch {
      showToast({
        title: 'Gagal menghubungi endpoint /api/import',
        tone: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <ToastHost toast={toast} onClose={dismissToast} />

      {/* Panduan & Kredensial Userscript (§6.8) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <GlassCard className="p-5 lg:col-span-7 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-slate-900 text-balance">
                Cara Pakai Userscript Shopee
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Impor katalog &amp; status PO langsung saat scroll halaman toko Shopee
              </p>
            </div>

            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                importToken
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-rose-200 bg-rose-50 text-rose-700'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  importToken ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
                aria-hidden="true"
              />
              <span>{importToken ? 'Token Aktif' : 'Token Belum Diatur'}</span>
            </span>
          </div>

          <ol className="space-y-2.5 text-sm text-slate-600 list-decimal list-inside">
            <li>
              Pasang ekstensi <strong>Tampermonkey</strong> di browser desktop atau Kiwi Browser (HP).
            </li>
            <li>
              Klik tombol <strong>Salin Script</strong> atau <strong>Unduh .user.js</strong> di
              bawah, lalu tambahkan ke Tampermonkey.
            </li>
            <li>
              Buka halaman toko/produk Shopee, klik ikon <strong>⚙️</strong> di panel mengambang{' '}
              <strong>ComicPlan Sync</strong>, lalu tempel Endpoint &amp; Import Token.
            </li>
          </ol>

          {userscriptSource && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => {
                  const resolved = getResolvedUserscript();
                  if (resolved) copyText(resolved, 'script', 'Userscript');
                }}
              >
                {copiedField === 'script' ? (
                  <Check className="h-4 w-4 mr-1.5" aria-hidden="true" />
                ) : (
                  <Code2 className="h-4 w-4 mr-1.5" aria-hidden="true" />
                )}
                <span>Salin Script Tampermonkey</span>
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleDownloadUserscript}
              >
                <Download className="h-4 w-4 mr-1.5" aria-hidden="true" />
                <span>Unduh .user.js</span>
              </Button>
            </div>
          )}
        </GlassCard>

        <GlassCard className="p-5 lg:col-span-5 space-y-4">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary-600 shrink-0" aria-hidden="true" />
            <h2 className="text-base font-semibold text-slate-900">Kredensial Koneksi</h2>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-slate-700 mb-1">Import Token</p>
              <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white/80 px-3 py-2">
                <code className="text-xs font-mono text-slate-800 truncate">
                  {maskedToken ?? 'Belum diatur di .env.local'}
                </code>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={!importToken}
                  onClick={() => importToken && copyText(importToken, 'token', 'Import token')}
                >
                  {copiedField === 'token' ? (
                    <Check className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                  )}
                  <span>Copy Token</span>
                </Button>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-700 mb-1">Endpoint Impor</p>
              <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white/80 px-3 py-2">
                <code className="text-xs font-mono text-slate-800 truncate">/api/import</code>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    copyText(`${window.location.origin}/api/import`, 'endpoint', 'URL Endpoint')
                  }
                >
                  {copiedField === 'endpoint' ? (
                    <Check className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                  )}
                  <span>Copy URL</span>
                </Button>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Impor JSON Manual / Uji Coba Cepat */}
      <GlassCard className="p-4 sm:p-5">
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-lg">
            <span className="inline-flex items-center gap-2">
              <FileJson className="h-4 w-4 text-primary-600" aria-hidden="true" />
              <span>Impor JSON Manual / Uji Coba Endpoint</span>
            </span>
            <span className="text-xs font-medium text-primary-600 group-open:hidden">
              Buka form ▾
            </span>
            <span className="hidden text-xs font-medium text-slate-500 group-open:inline">
              Tutup ▴
            </span>
          </summary>

          <form onSubmit={handleManualImport} className="mt-4 space-y-3 border-t border-slate-100 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="manual-json-input" className="text-xs font-semibold text-slate-700">
                Payload JSON (format array atau objek <code>{`{ "items": [...] }`}</code>)
              </label>
              <button
                type="button"
                onClick={() => setJsonInput(SAMPLE_PAYLOAD)}
                className="text-xs font-semibold text-primary-600 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
              >
                Isi contoh payload
              </button>
            </div>

            <textarea
              id="manual-json-input"
              name="payload"
              rows={6}
              spellCheck={false}
              autoComplete="off"
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder={`{\n  "items": [\n    { "itemid": "123", "shopid": "456", "nama": "Judul Komik", "harga_raw": 4500000000 }\n  ]\n}…`}
              className="w-full rounded-xl border border-slate-200 bg-white/80 p-3 font-mono text-xs text-slate-900 focus-visible:border-primary-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/20"
            />

            <div className="flex justify-end">
              <Button type="submit" variant="primary" size="sm" isLoading={submitting} disabled={submitting}>
                <Upload className="h-4 w-4 mr-1.5" aria-hidden="true" />
                <span>{submitting ? 'Mengimpor…' : 'Proses Impor'}</span>
              </Button>
            </div>
          </form>
        </details>
      </GlassCard>

      {/* Daftar Listing Hasil Impor (§6.8 — ringkas tanpa gambar besar) */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900">
            Riwayat Listing Terimpor ({listings.length})
          </h2>
          <Link
            href="/katalog"
            className="text-xs font-semibold text-primary-600 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
          >
            Buka Katalog →
          </Link>
        </div>

        {listings.length === 0 ? (
          <EmptyState
            icon={<PackageCheck className="h-7 w-7" />}
            title="Belum ada produk yang diimpor"
            description="Gunakan userscript Tampermonkey di halaman toko Shopee atau form JSON manual di atas untuk mengimpor komik pertama Anda."
          />
        ) : (
          <GlassCard className="divide-y divide-slate-100 overflow-hidden p-0">
            {listings.map((item) => {
              const isToday = item.updated_at.startsWith(todayPrefix);

              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between gap-3 px-4 py-2.5 text-xs transition-colors hover:bg-slate-50/70 ${
                    isToday ? 'bg-primary-50/30' : ''
                  }`}
                >
                  <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                    <div className="min-w-0 flex items-center gap-2">
                      <ListingStatusDot status={item.status} />
                      <span className="truncate font-semibold text-slate-900">
                        {item.judul}
                        {item.volume != null ? ` vol ${item.volume}` : ''}
                      </span>
                      {isToday && (
                        <span className="shrink-0 rounded-full bg-primary-600/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary-700">
                          Baru
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500 sm:ml-auto">
                      <span className="inline-flex items-center gap-1 truncate max-w-40">
                        <Store className="h-3 w-3 shrink-0 text-slate-400" aria-hidden="true" />
                        <span className="truncate">{item.nama_toko || `Shop #${item.shop_id}`}</span>
                      </span>
                      {item.deadline_po && (
                        <>
                          <span>·</span>
                          <span className="tabular-nums text-amber-700">
                            PO s/d {formatTanggal(item.deadline_po)}
                          </span>
                        </>
                      )}
                      <span>·</span>
                      <span className="font-semibold tabular-nums text-slate-800">
                        {formatRupiah(item.harga)}
                      </span>
                      <span>·</span>
                      <time dateTime={item.updated_at} className="tabular-nums text-slate-400">
                        {formatTanggalJam(item.updated_at)}
                      </time>
                    </div>
                  </div>

                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Buka ${item.judul} di Shopee`}
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-primary-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                    >
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  )}
                </div>
              );
            })}
          </GlassCard>
        )}
      </section>
    </div>
  );
}
