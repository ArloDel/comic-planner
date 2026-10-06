import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  PLAN_STATUSES,
  TRANSITIONS,
  calculateCommitment,
  canTransition,
  daysUntil,
  formatRupiah,
  isPlanStatus,
  isValidDateInput,
  isValidPriority,
  nextStatuses,
  requiresDeadline,
  summarizePayments,
  transitionError,
} from '../src/lib/plans.ts';
import type { PlanStatus } from '../src/types/database.ts';

/** Jalur utama PRD: wishlist → po → dp → lunas → diterima. */
const MAIN_PATH: PlanStatus[] = ['wishlist', 'po', 'dp', 'lunas', 'diterima'];

describe('state machine plans', () => {
  it('mengizinkan seluruh jalur utama PRD', () => {
    for (let i = 0; i < MAIN_PATH.length - 1; i++) {
      const from = MAIN_PATH[i];
      const to = MAIN_PATH[i + 1];

      assert.equal(canTransition(from, to), true, `${from} → ${to} harus legal`);
      assert.equal(transitionError(from, to, { deadline: '2026-12-31' }), null);
    }
  });

  it('menolak lompatan status (skip tahap)', () => {
    const illegal: [PlanStatus, PlanStatus][] = [
      ['wishlist', 'dp'],
      ['wishlist', 'lunas'],
      ['wishlist', 'diterima'],
      ['po', 'diterima'],
      ['dp', 'diterima'],
      ['lunas', 'dp'],
      ['diterima', 'lunas'],
      ['batal', 'wishlist'],
      ['batal', 'po'],
    ];

    for (const [from, to] of illegal) {
      assert.equal(canTransition(from, to), false, `${from} → ${to} harus ilegal`);
      assert.notEqual(
        transitionError(from, to, { deadline: '2026-12-31' }),
        null,
        `${from} → ${to} harus ditolak dengan pesan`
      );
    }
  });

  it('menolak transisi ke status yang sama', () => {
    for (const status of PLAN_STATUSES) {
      assert.equal(canTransition(status, status), false);
      assert.match(transitionError(status, status) ?? '', /sudah berstatus/);
    }
  });

  it('menolak status di luar daftar', () => {
    assert.equal(isPlanStatus('nope'), false);
    assert.equal(isPlanStatus(undefined), false);
    assert.match(transitionError('wishlist', 'nope') ?? '', /tidak dikenal/);
  });

  it('membatalkan dari setiap status aktif', () => {
    for (const status of ['wishlist', 'po', 'dp', 'lunas'] as PlanStatus[]) {
      assert.ok(
        nextStatuses(status).includes('batal'),
        `${status} harus bisa dibatalkan`
      );
      assert.equal(transitionError(status, 'batal'), null);
    }
  });

  it('membuat diterima dan batal terminal', () => {
    for (const status of ['diterima', 'batal'] as PlanStatus[]) {
      assert.deepEqual([...nextStatuses(status)], [], `${status} harus terminal`);
    }

    assert.match(transitionError('diterima', 'batal') ?? '', /tidak bisa dibatalkan/);
  });

  it('membolehkan po → lunas untuk pembelian tanpa DP', () => {
    assert.equal(canTransition('po', 'lunas'), true);
  });

  it('peta TRANSITIONS hanya berisi status yang dikenal', () => {
    for (const status of PLAN_STATUSES) {
      for (const target of TRANSITIONS[status]) {
        assert.ok(PLAN_STATUSES.includes(target), `${target} bukan status plan yang valid`);
      }
    }
  });

  it('hanya status po yang wajib punya deadline', () => {
    assert.equal(requiresDeadline('po'), true);
    assert.equal(requiresDeadline('dp'), false);
    assert.equal(requiresDeadline('batal'), false);
  });

  it('menolak masuk po tanpa deadline', () => {
    const message = transitionError('wishlist', 'po', { deadline: null });
    assert.match(message ?? '', /Deadline PO wajib diisi/);
  });

  it('menerima transisi po dengan deadline override maupun bawaan listing', () => {
    assert.equal(transitionError('wishlist', 'po', { deadline: '2026-11-30' }), null);
  });
});

describe('komitmen / hold budget', () => {
  const plans = [
    { id: 'a', status: 'po' as PlanStatus, estimasi_harga: 100_000 },
    { id: 'b', status: 'dp' as PlanStatus, estimasi_harga: 50_000 },
    { id: 'c', status: 'wishlist' as PlanStatus, estimasi_harga: 999_000 },
    { id: 'd', status: 'diterima' as PlanStatus, estimasi_harga: 70_000 },
    { id: 'e', status: 'batal' as PlanStatus, estimasi_harga: 80_000 },
  ];

  it('hanya menghitung plan po/dp', () => {
    assert.equal(calculateCommitment(plans), 150_000);
  });

  it('mengurangi yang sudah dibayar', () => {
    assert.equal(calculateCommitment(plans, { a: 40_000 }), 110_000);
    assert.equal(calculateCommitment(plans, { a: 40_000, b: 50_000 }), 60_000);
  });

  it('tidak menghasilkan komitmen negatif', () => {
    assert.equal(calculateCommitment(plans, { a: 500_000 }), 50_000);
  });

  it('hold dilepas begitu plan jadi batal', () => {
    const dibayar = { a: 40_000 };

    const sebelum = calculateCommitment(plans, dibayar);
    const sesudah = calculateCommitment(
      plans.map((plan) =>
        plan.id === 'a' ? { ...plan, status: 'batal' as PlanStatus } : plan
      ),
      dibayar
    );

    // Kontribusi plan 'a' (po, 100rb estimasi − 40rb dibayar = 60rb) hilang
    // utuh, jadi komitmen turun tepat sebesar itu.
    assert.equal(sebelum, 110_000);
    assert.equal(sesudah, 50_000);
    assert.equal(sebelum - sesudah, 60_000);
  });

  it('dp dan lunas melepas hold penuh setelah pembayaran', () => {
    const plan = [{ id: 'x', status: 'dp' as PlanStatus, estimasi_harga: 80_000 }];

    assert.equal(calculateCommitment(plan, { x: 20_000 }), 60_000);
    assert.equal(
      calculateCommitment(
        [{ ...plan[0], status: 'lunas' }],
        { x: 80_000 }
      ),
      0
    );
  });
});

describe('helper', () => {
  it('summarizePayments menjumlahkan dan mengurangi refund', () => {
    const result = summarizePayments([
      { plan_id: 'a', jumlah: 20_000, jenis: 'dp' },
      { plan_id: 'a', jumlah: 30_000, jenis: 'pelunasan' },
      { plan_id: 'a', jumlah: 5_000, jenis: 'refund' },
      { plan_id: 'b', jumlah: 10_000, jenis: 'bayar_penuh' },
    ]);

    assert.equal(result.a, 45_000);
    assert.equal(result.b, 10_000);
  });

  it('validasi prioritas 1..5', () => {
    assert.equal(isValidPriority(1), true);
    assert.equal(isValidPriority(5), true);
    assert.equal(isValidPriority(0), false);
    assert.equal(isValidPriority(6), false);
    assert.equal(isValidPriority(2.5), false);
    assert.equal(isValidPriority('3'), false);
  });

  it('validasi tanggal deadline', () => {
    assert.equal(isValidDateInput('2026-12-31'), true);
    assert.equal(isValidDateInput('31-12-2026'), false);
    assert.equal(isValidDateInput(''), false);
  });

  it('formatRupiah aman untuk input rusak', () => {
    // Format currency id-ID memakai non-breaking space setelah "Rp".
    const plain = (value: string) => value.replace(/\u00a0/g, ' ');

    assert.equal(plain(formatRupiah(45_000)), 'Rp 45.000');
    assert.equal(plain(formatRupiah(null)), 'Rp 0');
    assert.equal(plain(formatRupiah(NaN)), 'Rp 0');
    assert.equal(plain(formatRupiah(undefined)), 'Rp 0');
  });

  it('daysUntil menghitung selisih hari', () => {
    const besok = new Date();
    besok.setDate(besok.getDate() + 3);
    const iso = `${besok.getFullYear()}-${String(besok.getMonth() + 1).padStart(2, '0')}-${String(
      besok.getDate()
    ).padStart(2, '0')}`;

    assert.equal(daysUntil(iso), 3);
    assert.equal(daysUntil(null), null);
  });
});