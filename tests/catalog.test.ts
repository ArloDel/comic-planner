import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeSeries } from '../src/lib/catalog.ts';

test('summarizeSeries groups items by trimmed series name and sorts by volume count then title', () => {
  const summaries = summarizeSeries([
    { seri: 'One Piece', plan_status: 'diterima' },
    { seri: 'One Piece ', plan_status: 'wishlist' },
    { seri: 'One Piece', plan_status: 'po' },
    { seri: 'One Piece', plan_status: 'diterima' },
    { seri: 'Naruto', plan_status: 'diterima' },
    { seri: 'Bleach', plan_status: 'belum ada' },
    { seri: null, plan_status: 'diterima' },
    { seri: '   ', plan_status: 'wishlist' },
  ]);

  assert.deepEqual(summaries, [
    { seri: 'One Piece', totalVolumes: 4, ownedVolumes: 2 },
    { seri: 'Bleach', totalVolumes: 1, ownedVolumes: 0 },
    { seri: 'Naruto', totalVolumes: 1, ownedVolumes: 1 },
  ]);
});
