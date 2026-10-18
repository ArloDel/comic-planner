import test from 'node:test';
import assert from 'node:assert/strict';
import {
  escapeCsvCell,
  maskSecretToken,
  summarizeTrackedShops,
  toCsv,
} from '../src/lib/settings.ts';

test('maskSecretToken masks tokens and handles empty values', () => {
  assert.equal(maskSecretToken(null), null);
  assert.equal(maskSecretToken('   '), null);
  assert.equal(maskSecretToken('abc'), '••••');
  assert.equal(maskSecretToken('rahasia_1234'), '••••••••1234');
});

test('summarizeTrackedShops groups by shop_id and counts PO listings', () => {
  const shops = summarizeTrackedShops([
    { shop_id: '10', nama_toko: null, status: 'ready', updated_at: '2026-10-01T10:00:00Z' },
    { shop_id: '10', nama_toko: 'Manga ID', status: 'po', updated_at: '2026-10-05T12:00:00Z' },
    { shop_id: '20', nama_toko: 'Komik Kita', status: 'po', updated_at: '2026-10-03T08:00:00Z' },
  ]);

  assert.equal(shops.length, 2);
  assert.deepEqual(shops[0], {
    shop_id: '10',
    nama_toko: 'Manga ID',
    total_listings: 2,
    po_count: 1,
    last_synced_at: '2026-10-05T12:00:00Z',
  });
});

test('toCsv escapes quotes, commas, and newlines', () => {
  assert.equal(escapeCsvCell('One, "Two"'), '"One, ""Two"""');
  const csv = toCsv(
    [{ id: '1', judul: 'A, B', catatan: null }],
    ['id', 'judul', 'catatan']
  );
  assert.equal(csv, 'id,judul,catatan\r\n1,"A, B",');
});
