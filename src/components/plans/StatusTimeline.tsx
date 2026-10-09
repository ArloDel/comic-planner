'use client';

import React from 'react';
import { History, CornerDownRight } from 'lucide-react';
import { STATUS_LABELS, isPlanStatus, type PlanHistoryEntry } from '@/lib/plans';
import { formatTanggalJam } from '@/lib/format';

interface StatusTimelineProps {
  entries: PlanHistoryEntry[];
}

/**
 * Riwayat perubahan status sebuah plan, newest first.
 *
 * Baris-baris ini ditulis trigger Postgres `on_plan_status_changed`, jadi
 * komponen ini read-only: satu-satunya cara menambah entri adalah mengubah
 * status lewat server action.
 */
export function StatusTimeline({ entries }: StatusTimelineProps) {
  if (entries.length === 0) {
    return (
      <p className="text-xs text-slate-400 italic">Belum ada riwayat perubahan status.</p>
    );
  }

  const label = (value: string | null) =>
    isPlanStatus(value) ? STATUS_LABELS[value] : (value ?? '—');

  return (
    <ol className="relative space-y-2.5 pl-4">
      {/* Garis waktu vertikal */}
      <span
        aria-hidden="true"
        className="absolute left-[3px] top-1.5 bottom-1.5 w-px bg-slate-200"
      />

      {entries.map((entry, index) => (
        <li key={`${entry.changed_at}-${index}`} className="relative">
          <span
            aria-hidden="true"
            className={`absolute -left-4 top-1.5 h-[7px] w-[7px] rounded-full ring-2 ring-white ${
              index === 0 ? 'bg-primary-600' : 'bg-slate-300'
            }`}
          />

          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            {entry.status_lama ? (
              <span className="inline-flex items-center gap-1 text-xs">
                <span className="text-slate-500">{label(entry.status_lama)}</span>
                <CornerDownRight className="h-3 w-3 text-slate-300" aria-hidden="true" />
                <span className="font-semibold text-slate-900">{label(entry.status_baru)}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs">
                <History className="h-3 w-3 text-primary-500" aria-hidden="true" />
                <span className="font-semibold text-slate-900">
                  Plan dibuat dengan status {label(entry.status_baru)}
                </span>
              </span>
            )}

            <time
              dateTime={entry.changed_at}
              className="text-[10px] font-medium text-slate-400 tabular-nums"
            >
              {formatTanggalJam(entry.changed_at)}
            </time>
          </div>
        </li>
      ))}
    </ol>
  );
}