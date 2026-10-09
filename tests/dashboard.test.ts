import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PO_DEADLINE_WINDOW_DAYS, pickUrgentPoPlans } from '../src/lib/dashboard.ts';
import { computeBudgetSummary } from '../src/lib/budget.ts';
import { summarizePayments } from '../src/lib/plans.ts';
import type { PlanStatus, TransactionType } from '../src/types/database.ts';

/** Hari ini pukul 00:00 lokal, sebagai baseline penghitungan hari. */
function baseToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function offsetDate(base: Date, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

describe('pickUrgentPoPlans', () => {
  const today = baseToday();

  it('hanya mengambil plan status po dengan deadline', () => {
    const got = pickUrgentPoPlans(
      [
        { id: 'a', status: 'po', estimasi_harga: 100, sudah_dibayar: 0, deadline_po: offsetDate(today, 3) },
        { id: 'b', status: 'dp', estimasi_harga: 100, sudah_dibayar: 20, deadline_po: offsetDate(today, 1) },
        { id: 'c', status: 'po', estimasi_harga: 100, sudah_dibayar: 0, deadline_po: null },
        { id: 'd', status: 'wishlist', estimasi_harga: 100, sudah_dibayar: 0, deadline_po: offsetDate(today, 2) },
      ],
      today
    );

    assert.deepEqual(
      got.map((p) => p.id),
      ['a']
    );
  });

  it('menyertakan terlewat hingga 7 hari dan H-7; menyaring yang lebih jauh', () => {
    const got = pickUrgentPoPlans(
      [
        { id: 'past9', status: 'po', estimasi_harga: 10, sudah_dibayar: 0, deadline_po: offsetDate(today, -9) },
        { id: 'past7', status: 'po', estimasi_harga: 10, sudah_dibayar: 0, deadline_po: offsetDate(today, -7) },
        { id: 'future7', status: 'po', estimasi_harga: 10, sudah_dibayar: 0, deadline_po: offsetDate(today, 7) },
        { id: 'future8', status: 'po', estimasi_harga: 10, sudah_dibayar: 0, deadline_po: offsetDate(today, 8) },
      ],
      today
    );

    assert.deepEqual(
      got.map((p) => p.id),
      ['past7', 'future7']
    );
  });

  it('diurutkan paling dekat (termasuk yang paling terlewat) lebih dulu', () => {
    const got = pickUrgentPoPlans(
      [
        { id: 'far', status: 'po', estimasi_harga: 10, sudah_dibayar: 0, deadline_po: offsetDate(today, 6) },
        { id: 'overdue', status: 'po', estimasi_harga: 10, sudah_dibayar: 0, deadline_po: offsetDate(today, -2) },
        { id: 'near', status: 'po', estimasi_harga: 10, sudah_dibayar: 0, deadline_po: offsetDate(today, 1) },
      ],
      today
    );

    assert.deepEqual(
      got.map((p) => p.id),
      ['overdue', 'near', 'far']
    );
    assert.equal(got[0].hariTersisa, -2);
  });

  it('sisaBayar = max(estimasi − sudah dibayar, 0)', () => {
    const got = pickUrgentPoPlans(
      [
        { id: 'a', status: 'po', estimasi_harga: 45000, sudah_dibayar: 20000, deadline_po: offsetDate(today, 2) },
        { id: 'b', status: 'po', estimasi_harga: 45000, sudah_dibayar: 60000, deadline_po: offsetDate(today, 2) },
      ],
      today
    );

    assert.equal(got[0].sisaBayar, 25000);
    assert.equal(got[1].sisaBayar, 0);
  });

  it('deadline tidak valid dilewati tanpa error', () => {
    const got = pickUrgentPoPlans(
      [{ id: 'bad', status: 'po', estimasi_harga: 10, sudah_dibayar: 0, deadline_po: 'not-a-date' }],
      today
    );

    assert.equal(got.length, 0);
  });

  it('konstanta jendela sesuai PRD F6 (≤ 7 hari)', () => {
    assert.equal(PO_DEADLINE_WINDOW_DAYS, 7);
  });
});

describe('dashboard angka ringkasan — reuse rumus F4', () => {
  it('sisa aman = budget − realisasi − komitmen lewat computeBudgetSummary', () => {
    const dibayar = summarizePayments([
      { plan_id: 'p1', jumlah: 20000, jenis: 'dp' as TransactionType },
    ]);

    const summary = computeBudgetSummary(
      500000,
      [
        { jumlah: 30000, jenis: 'bayar_penuh' as TransactionType },
        { jumlah: 5000, jenis: 'refund' as TransactionType },
      ],
      [
        { id: 'p1', status: 'po' as PlanStatus, estimasi_harga: 45000, sudah_dibayar: dibayar['p1'] ?? 0 },
      ]
    );

    // realisasi = 30000 (refund dikecualikan), komitmen = 45000 − 20000 = 25000
    assert.equal(summary.realisasi, 30000);
    assert.equal(summary.komitmen, 25000);
    assert.equal(summary.sisaAman, 500000 - 30000 - 25000);
  });
});
