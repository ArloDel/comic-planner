import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { computeBudgetSummary } from '../src/lib/budget.ts';
import type { TransactionType } from '../src/types/database.ts';

describe('dashboard angka ringkasan — rumus budget', () => {
  it('sisa aman = budget − realisasi lewat computeBudgetSummary', () => {
    const summary = computeBudgetSummary(500000, [
      { jumlah: 30000, jenis: 'bayar_penuh' as TransactionType },
      { jumlah: 5000, jenis: 'refund' as TransactionType },
    ]);

    // realisasi = 30000 (refund dikecualikan)
    assert.equal(summary.realisasi, 30000);
    assert.equal(summary.sisaAman, 500000 - 30000);
  });
});
