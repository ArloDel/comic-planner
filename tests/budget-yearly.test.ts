import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { computeYearlySummary } from '../src/lib/budget.ts';
import type { TransactionType } from '../src/types/database.ts';

describe('computeYearlySummary — rekapitulasi pengeluaran tahunan', () => {
  it('menghasilkan 12 bulan kosong yang aman bila belum ada budget maupun transaksi', () => {
    const result = computeYearlySummary(2026, [], []);

    assert.equal(result.year, 2026);
    assert.equal(result.months.length, 12);
    assert.equal(result.months[0].periode, '2026-01');
    assert.equal(result.months[0].label, 'Jan');
    assert.equal(result.months[11].periode, '2026-12');
    assert.equal(result.months[11].label, 'Des');
    assert.equal(result.totalBudget, 0);
    assert.equal(result.totalRealisasi, 0);
    assert.equal(result.activeMonthsCount, 0);
    assert.equal(result.averageMonthlySpending, 0);
    assert.equal(result.peakMonth, null);
    assert.equal(result.maxScaleValue, 0);
  });

  it('mengagregasi budget dan realisasi per bulan, mengabaikan tahun lain, serta memisahkan refund', () => {
    const budgets = [
      { periode: '2026-01-01', total_budget: 300000 },
      { periode: '2026-03-01', total_budget: 200000 },
      { periode: '2025-12-01', total_budget: 999999 }, // tahun lain -> diabaikan
    ];

    const txns = [
      { tanggal: '2026-01-10', jumlah: 120000, jenis: 'bayar_penuh' as TransactionType },
      { tanggal: '2026-01-22', jumlah: 80000, jenis: 'bayar_penuh' as TransactionType },
      { tanggal: '2026-01-25', jumlah: 25000, jenis: 'refund' as TransactionType },
      { tanggal: '2026-03-05', jumlah: 250000, jenis: 'bayar_penuh' as TransactionType }, // over budget!
      { tanggal: '2026-07-14', jumlah: 90000, jenis: 'bayar_penuh' as TransactionType }, // tanpa target budget
      { tanggal: '2025-12-31', jumlah: 500000, jenis: 'bayar_penuh' as TransactionType }, // tahun lain
    ];

    const result = computeYearlySummary(2026, budgets, txns);

    // Januari: budget 300k, realisasi 200k, refund 25k, 3 transaksi
    const jan = result.months[0];
    assert.equal(jan.totalBudget, 300000);
    assert.equal(jan.realisasi, 200000);
    assert.equal(jan.refundTotal, 25000);
    assert.equal(jan.sisaAman, 100000);
    assert.equal(jan.isOverBudget, false);
    assert.equal(jan.txnCount, 3);

    // Maret: budget 200k, realisasi 250k -> over budget
    const mar = result.months[2];
    assert.equal(mar.totalBudget, 200000);
    assert.equal(mar.realisasi, 250000);
    assert.equal(mar.sisaAman, -50000);
    assert.equal(mar.isOverBudget, true);

    // Juli: budget 0, realisasi 90k -> tidak ditandai isOverBudget karena budget belum diset
    const jul = result.months[6];
    assert.equal(jul.totalBudget, 0);
    assert.equal(jul.realisasi, 90000);
    assert.equal(jul.isOverBudget, false);

    // Total tahunan 2026
    assert.equal(result.totalBudget, 500000);
    assert.equal(result.totalRealisasi, 540000);
    assert.equal(result.totalRefund, 25000);
    assert.equal(result.totalSisaAman, -40000);
    assert.equal(result.activeMonthsCount, 3);
    assert.equal(result.averageMonthlySpending, 180000); // 540000 / 3
    assert.deepEqual(result.peakMonth, {
      periode: '2026-03',
      label: 'Mar',
      realisasi: 250000,
    });
    assert.equal(result.maxScaleValue, 300000); // tertinggi adalah budget Jan (300k)
  });
});
