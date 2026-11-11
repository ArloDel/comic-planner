import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fitWithin,
  nextFacing,
  describeCameraError,
  isCameraSupported,
  CAPTURE_MAX_SIDE,
} from '../src/lib/camera.ts';

test('fitWithin', async (t) => {
  await t.test('mengecilkan foto landscape dengan rasio tetap', () => {
    assert.deepEqual(fitWithin(3200, 2400, 1600), { width: 1600, height: 1200 });
  });

  await t.test('mengecilkan foto portrait berdasarkan sisi terpanjang', () => {
    assert.deepEqual(fitWithin(3024, 4032, 1600), { width: 1200, height: 1600 });
  });

  await t.test('tidak memperbesar foto yang sudah kecil', () => {
    assert.deepEqual(fitWithin(640, 480, 1600), { width: 640, height: 480 });
  });

  await t.test('memakai batas default bila tidak diberikan', () => {
    const out = fitWithin(4000, 1000);
    assert.equal(out.width, CAPTURE_MAX_SIDE);
    assert.equal(out.height, 400);
  });

  await t.test('mengembalikan nol untuk ukuran tidak valid (video belum siap)', () => {
    assert.deepEqual(fitWithin(0, 0), { width: 0, height: 0 });
    assert.deepEqual(fitWithin(Number.NaN, 100), { width: 0, height: 0 });
  });
});

test('nextFacing menukar kamera depan dan belakang', () => {
  assert.equal(nextFacing('environment'), 'user');
  assert.equal(nextFacing('user'), 'environment');
});

test('describeCameraError', async (t) => {
  await t.test('izin ditolak', () => {
    assert.match(describeCameraError({ name: 'NotAllowedError' }), /ditolak/);
  });

  await t.test('kamera tidak ada', () => {
    assert.match(describeCameraError({ name: 'NotFoundError' }), /tidak ditemukan/);
  });

  await t.test('kamera sedang dipakai', () => {
    assert.match(describeCameraError({ name: 'NotReadableError' }), /dipakai aplikasi lain/);
  });

  await t.test('error tak dikenal tetap memberi arahan', () => {
    assert.match(describeCameraError(new Error('x')), /galeri/);
    assert.match(describeCameraError(null), /galeri/);
  });
});

test('isCameraSupported bernilai false di luar browser', () => {
  assert.equal(isCameraSupported(), false);
});
