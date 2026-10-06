'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  Check,
  Edit2,
  Trash2,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { StatusPill, statusStyle } from '@/components/ui/StatusPill';
import { CoverImage } from '@/components/ui/CoverImage';
import { ItemModal } from '@/components/katalog/ItemModal';
import { DeleteModal } from '@/components/katalog/DeleteModal';
import { formatRupiahOrNull } from '@/lib/format';
import type { KatalogItemWithDetails } from '@/lib/catalog';

/** Grid minimal saat seri belum punya volume, supaya ada tempat quick-add. */
const MIN_EMPTY_GRID = 12;

interface SeriClientProps {
  seriName: string;
  penerbit?: string | null;
  items: KatalogItemWithDetails[];
}

export function SeriClient({ seriName, penerbit, items }: SeriClientProps) {
  const router = useRouter();

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<KatalogItemWithDetails | null>(null);
  const [deletingItem, setDeletingItem] = useState<KatalogItemWithDetails | null>(null);
  const [prefilledVolume, setPrefilledVolume] = useState<number | undefined>(undefined);

  // Map existing items by volume number
  const volumeMap = new Map<number, KatalogItemWithDetails>();
  let maxVolumeFound = 0;

  for (const item of items) {
    if (item.volume !== null && item.volume !== undefined) {
      volumeMap.set(item.volume, item);
      maxVolumeFound = Math.max(maxVolumeFound, item.volume);
    }
  }

  const maxRange = items.length > 0 ? maxVolumeFound : MIN_EMPTY_GRID;
  const gridVolumes = Array.from({ length: maxRange }, (_, i) => i + 1);

  // Status stats
  const countByStatus = (statuses: string[]) =>
    items.filter((item) => statuses.includes(item.plan_status)).length;
  const punyaCount = countByStatus(['diterima']);
  const poCount = countByStatus(['po', 'dp']);
  const lunasCount = countByStatus(['lunas']);
  const wishlistCount = countByStatus(['wishlist']);
  const belumPunyaCount = Math.max(0, maxRange - items.length);

  function handleVolumeBoxClick(volNumber: number) {
    const existing = volumeMap.get(volNumber);
    if (existing) {
      setEditingItem(existing);
      setPrefilledVolume(undefined);
    } else {
      setEditingItem(null);
      setPrefilledVolume(volNumber);
      setModalOpen(true);
    }
  }

  function handleAddNewVolume() {
    setEditingItem(null);
    setPrefilledVolume(maxVolumeFound + 1);
    setModalOpen(true);
  }

  function handleRefresh() {
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/katalog"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-primary-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali ke Katalog</span>
        </Link>
      </div>

      {/* Series Hero Card */}
      <GlassCard className="p-5 sm:p-6" solid>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-primary-600 bg-primary-50 px-2 py-0.5 rounded-md">
                Koleksi Seri
              </span>
              {penerbit && (
                <span className="text-xs font-medium text-slate-500">• Penerbit {penerbit}</span>
              )}
            </div>
            <h1 className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              {seriName}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              {items.length} volume tercatat di katalog • Target volume maks: {maxRange}
            </p>
          </div>

          <Button variant="primary" onClick={handleAddNewVolume}>
            <Plus className="h-4 w-4 mr-1.5" />
            <span>Tambah Volume {maxVolumeFound + 1}</span>
          </Button>
        </div>

        {/* Stats summary pills */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 font-semibold">
            <Check className="h-3.5 w-3.5" />
            {punyaCount} Dimiliki
          </span>
          {poCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 font-semibold">
              {poCount} Pre-Order
            </span>
          )}
          {lunasCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200 px-3 py-1 font-semibold">
              {lunasCount} Lunas
            </span>
          )}
          {wishlistCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1 font-semibold">
              {wishlistCount} Wishlist
            </span>
          )}
          {belumPunyaCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 text-slate-500 border border-dashed border-slate-300 px-3 py-1 font-semibold">
              {belumPunyaCount} Belum Ada
            </span>
          )}
        </div>
      </GlassCard>

      {/* Volume Visual Tracker Grid */}
      <div className="space-y-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary-500" />
            Tracker Volume Visual
          </h2>
          <p className="text-xs text-slate-500">
            Klik nomor untuk mengedit atau mengisi volume yang bolong.
          </p>
        </div>

        <GlassCard className="p-4 sm:p-5">
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2 sm:gap-2.5">
            {gridVolumes.map((volNum) => {
              const existingItem = volumeMap.get(volNum);
              const style = existingItem && statusStyle(existingItem.plan_status);

              return existingItem && style ? (
                <button
                  key={volNum}
                  type="button"
                  onClick={() => handleVolumeBoxClick(volNum)}
                  title={`Vol. ${volNum}: ${existingItem.judul} (${style.label})`}
                  className={`relative aspect-square rounded-xl border flex flex-col items-center justify-center font-bold text-sm transition-all duration-150 hover:scale-105 hover:shadow-md cursor-pointer select-none ${style.boxClasses}`}
                >
                  <span>{volNum}</span>
                  {existingItem.plan_status === 'diterima' && (
                    <Check className="h-3 w-3 text-emerald-600 mt-0.5" />
                  )}
                  <span className="text-[9px] uppercase font-semibold tracking-tighter opacity-80 mt-0.5">
                    {style.label}
                  </span>
                </button>
              ) : (
                <button
                  key={volNum}
                  type="button"
                  onClick={() => handleVolumeBoxClick(volNum)}
                  title={`Volume ${volNum} belum ada. Klik untuk menambahkan.`}
                  className="aspect-square rounded-xl border-2 border-dashed border-slate-300 bg-white/40 hover:bg-primary-50/60 hover:border-primary-400 hover:text-primary-700 text-slate-400 flex flex-col items-center justify-center font-semibold text-xs transition-all duration-150 cursor-pointer select-none group"
                >
                  <span className="group-hover:hidden">{volNum}</span>
                  <Plus className="h-4 w-4 hidden group-hover:block text-primary-600" />
                  <span className="text-[8px] text-slate-400 group-hover:text-primary-600">
                    Kosong
                  </span>
                </button>
              );
            })}
          </div>
        </GlassCard>
      </div>

      {/* Detailed Volumes List */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-slate-500" />
          Daftar Volume Terdaftar ({items.length})
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {items.map((item) => (
            <GlassCard
              key={item.id}
              className="p-3.5 flex items-center gap-3.5 hover:shadow-glass transition-all"
            >
              <div className="w-14 shrink-0">
                <CoverImage
                  src={item.cover_url}
                  alt={item.judul}
                  title={item.judul}
                  className="aspect-[2/3]"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="rounded bg-primary-100 text-primary-800 px-1.5 py-0.2 text-[10px] font-bold">
                    Vol {item.volume !== null ? item.volume : '-'}
                  </span>
                  <StatusPill status={item.plan_status} size="sm" />
                </div>

                <h3 className="mt-1 text-xs sm:text-sm font-bold text-slate-900 line-clamp-1">
                  {item.judul}
                </h3>

                <p className="mt-0.5 text-xs font-semibold text-slate-700 tabular-nums">
                  {formatRupiahOrNull(item.estimasi_harga) ?? (
                    <span className="text-[11px] font-normal text-slate-400">
                      Belum ada estimasi
                    </span>
                  )}
                </p>

                <div className="mt-2 flex items-center gap-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setEditingItem(item)}
                    className="h-9 px-2.5 text-[11px]"
                  >
                    <Edit2 className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <button
                    type="button"
                    onClick={() => setDeletingItem(item)}
                    aria-label={`Hapus ${item.judul}`}
                    title={`Hapus ${item.judul}`}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>

      {modalOpen && (
        <ItemModal
          key={`new-${prefilledVolume ?? 'x'}`}
          isOpen
          onClose={() => {
            setModalOpen(false);
            setPrefilledVolume(undefined);
          }}
          onSuccess={handleRefresh}
          defaultSeri={seriName}
          defaultVolume={prefilledVolume}
        />
      )}

      {editingItem && (
        <ItemModal
          key={editingItem.id}
          isOpen
          onClose={() => setEditingItem(null)}
          onSuccess={handleRefresh}
          initialData={{
            id: editingItem.id,
            judul: editingItem.judul,
            seri: editingItem.seri,
            volume: editingItem.volume,
            penerbit: editingItem.penerbit,
            tipe: editingItem.tipe,
            cover_url: editingItem.cover_url,
            status: editingItem.plan_status,
            estimasi_harga: editingItem.estimasi_harga,
          }}
        />
      )}

      {deletingItem && (
        <DeleteModal
          isOpen
          onClose={() => setDeletingItem(null)}
          onSuccess={handleRefresh}
          item={{
            id: deletingItem.id,
            judul: deletingItem.judul,
            seri: deletingItem.seri,
          }}
        />
      )}
    </div>
  );
}
