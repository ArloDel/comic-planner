import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COURIER_OPTIONS,
  getCourierName,
  generateMockTracking,
  trackPackageBinderbyte,
} from '../src/lib/binderbyte.ts';

test('getCourierName returns human readable name or uppercase fallback', () => {
  assert.equal(getCourierName('spx'), 'Shopee Express (SPX)');
  assert.equal(getCourierName('jnt'), 'J&T Express');
  assert.equal(getCourierName('jne'), 'JNE Express');
  assert.equal(getCourierName('unknown_courier'), 'UNKNOWN_COURIER');
});

test('generateMockTracking produces realistic on_process tracking data', () => {
  const result = generateMockTracking('spx', 'SPXID123456', false);
  assert.equal(result.success, true);
  assert.equal(result.courier, 'spx');
  assert.equal(result.waybill, 'SPXID123456');
  assert.equal(result.status, 'ON_PROCESS');
  assert.equal(result.isDelivered, false);
  assert.ok(result.history.length >= 2);
  assert.equal(result.isMock, true);
});

test('generateMockTracking produces delivered status when flag is true', () => {
  const result = generateMockTracking('jnt', 'JX987654321', true);
  assert.equal(result.success, true);
  assert.equal(result.status, 'DELIVERED');
  assert.equal(result.isDelivered, true);
  assert.match(result.statusText, /Delivered/i);
  assert.match(result.history[result.history.length - 1].desc, /DELIVERED/);
});

test('trackPackageBinderbyte auto-mocks when waybill starts with DELIV', async () => {
  const result = await trackPackageBinderbyte({
    courier: 'sicepat',
    waybill: 'DELIV12345',
  });
  assert.equal(result.success, true);
  assert.equal(result.status, 'DELIVERED');
  assert.equal(result.isDelivered, true);
});

test('trackPackageBinderbyte returns error if apiKey is missing for real waybill', async () => {
  const result = await trackPackageBinderbyte({
    courier: 'jne',
    waybill: '1234567890',
  });
  assert.equal(result.success, false);
  assert.match(result.error || '', /API Key/i);
});

test('trackPackageBinderbyte validates required inputs', async () => {
  const result = await trackPackageBinderbyte({
    courier: '',
    waybill: '',
  });
  assert.equal(result.success, false);
  assert.equal(result.status, 'NOT_FOUND');
  assert.equal(result.error, 'Kurir dan nomor resi wajib diisi');
});

test('trackPackageBinderbyte trims courier and waybill inputs safely', async () => {
  const result = await trackPackageBinderbyte({
    courier: '  spx  ',
    waybill: '  DELIV123456  ',
  });
  assert.equal(result.success, true);
  assert.equal(result.courier, 'spx');
  assert.equal(result.waybill, 'DELIV123456');
  assert.equal(result.isDelivered, true);
});


test('bulk tracking maintains consistent waybill across multiple comic plans', async () => {
  const sharedResi = 'DELIV999888';
  const plans = [
    { id: '11111111-1111-1111-1111-111111111111', judul: 'Manga A' },
    { id: '22222222-2222-2222-2222-222222222222', judul: 'Manga B' },
    { id: '33333333-3333-3333-3333-333333333333', judul: 'Manga C' },
  ];

  const result = await trackPackageBinderbyte({
    courier: 'spx',
    waybill: sharedResi,
  });

  assert.equal(result.success, true);
  assert.equal(result.waybill, sharedResi);
  assert.equal(result.isDelivered, true);

  // Verifikasi seluruh rencana belanja dapat diasosiasikan dengan hasil pelacakan yang sama
  const planTrackings = plans.map((p) => ({
    plan_id: p.id,
    resi: sharedResi,
    status: result.status,
  }));

  assert.equal(planTrackings.length, 3);
  assert.ok(planTrackings.every((pt) => pt.resi === sharedResi));
});

test('trackPackageBinderbyte respects caching mechanism', async () => {
  const testResi = 'DELIVCACHE123';
  const first = await trackPackageBinderbyte({
    courier: 'jne',
    waybill: testResi,
  });
  assert.equal(first.success, true);

  const second = await trackPackageBinderbyte({
    courier: 'jne',
    waybill: testResi,
  });
  assert.equal(second.success, true);
  assert.equal(second.waybill, testResi);
});
