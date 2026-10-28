import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  PLAN_STATUSES,
  TRANSITIONS,
  canTransition,
  comparePlans,
  isPlanStatus,
  isShippingStatus,
  isValidDateInput,
  isValidPriority,
  nextStatuses,
  summarizePayments,
  transitionError,
  txnAllowedForStatus,
} from '../src/lib/plans.ts';
import { daysUntil, formatRupiah } from '../src/lib/format.ts';
import type { PlanStatus } from '../src/types/database.ts';

/** Jalur utama yang disederhanakan: wishlist → po (Sedang Dikirim) → diterima (Selesai). */
const MAIN_PATH: PlanStatus[] = ['wishlist', 'po', 'diterima'];

describe('state machine plans', () => {
  it('mengizinkan seluruh jalur utama PRD', () => {
    for (let i = 0; i < MAIN_PATH.length - 1; i++) {
      const from = MAIN_PATH[i];
      const to = MAIN_PATH[i + 1];

      assert.equal(canTransition(from, to), true, `${from} → ${to} harus legal`);
      assert.equal(transitionError(from, to), null);
    }
  });

  it('menolak lompatan status (skip tahap)', () => {
    const illegal: [PlanStatus, PlanStatus][] = [
      ['wishlist', 'dp'],
      ['wishlist', 'lunas'],
      ['wishlist', 'diterima'],
      ['lunas', 'dp'],
      ['diterima', 'lunas'],
      ['diterima', 'po'],
      ['batal', 'wishlist'],
      ['batal', 'po'],
    ];

    for (const [from, to] of illegal) {
      assert.equal(canTransition(from, to), false, `${from} → ${to} harus ilegal`);
      assert.notEqual(
        transitionError(from, to),
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

  it('membolehkan transisi langsung po (Sedang Dikirim) → diterima (Selesai)', () => {
    assert.equal(canTransition('po', 'diterima'), true);
  });

  it('peta TRANSITIONS hanya berisi status yang dikenal', () => {
    for (const status of PLAN_STATUSES) {
      for (const target of TRANSITIONS[status]) {
        assert.ok(PLAN_STATUSES.includes(target), `${target} bukan status plan yang valid`);
      }
    }
  });
});

describe('helper', () => {
  it('summarizePayments menjumlahkan dan mengurangi refund', () => {
    const result = summarizePayments([
      { plan_id: 'a', jumlah: 50_000, jenis: 'bayar_penuh' },
      { plan_id: 'a', jumlah: 5_000, jenis: 'refund' },
      { plan_id: 'b', jumlah: 10_000, jenis: 'bayar_penuh' },
    ]);

    assert.equal(result.a, 45_000);
    assert.equal(result.b, 10_000);
  });

  it('txnAllowedForStatus hanya mengizinkan bayar_penuh dan refund', () => {
    assert.equal(txnAllowedForStatus('bayar_penuh', 'po'), true);
    assert.equal(txnAllowedForStatus('bayar_penuh', 'diterima'), true);
    assert.equal(txnAllowedForStatus('refund', 'po'), true);
    assert.equal(txnAllowedForStatus('dp', 'po'), false);
    assert.equal(txnAllowedForStatus('pelunasan', 'dp'), false);
  });

  it('validasi prioritas 1..5', () => {
    assert.equal(isValidPriority(1), true);
    assert.equal(isValidPriority(5), true);
    assert.equal(isValidPriority(0), false);
    assert.equal(isValidPriority(6), false);
    assert.equal(isValidPriority(2.5), false);
    assert.equal(isValidPriority('3'), false);
  });

  it('validasi tanggal', () => {
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

  it('comparePlans mengurutkan berdasarkan prioritas dan terbaru', () => {
    const list = [
      {
        id: 'p1',
        prioritas: 3,
        created_at: '2026-10-01T00:00:00Z',
      },
      {
        id: 'p2',
        prioritas: 1,
        created_at: '2026-10-02T00:00:00Z',
      },
      {
        id: 'p3',
        prioritas: 2,
        created_at: '2026-10-03T00:00:00Z',
      },
    ];

    assert.deepEqual(
      [...list].sort(comparePlans('prioritas')).map((p) => p.id),
      ['p2', 'p3', 'p1']
    );
    assert.deepEqual(
      [...list].sort(comparePlans('terbaru')).map((p) => p.id),
      ['p3', 'p2', 'p1']
    );
  });

  it('isShippingStatus mengidentifikasi status pengiriman po, dp, lunas dengan tepat', () => {
    assert.equal(isShippingStatus('po'), true);
    assert.equal(isShippingStatus('dp'), true);
    assert.equal(isShippingStatus('lunas'), true);
    assert.equal(isShippingStatus('wishlist'), false);
    assert.equal(isShippingStatus('diterima'), false);
    assert.equal(isShippingStatus('batal'), false);
    assert.equal(isShippingStatus(null), false);
    assert.equal(isShippingStatus(undefined), false);
  });
});
