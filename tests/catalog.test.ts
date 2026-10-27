import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeCollectionStats, summarizeSeries } from '../src/lib/catalog.ts';

test('summarizeSeries groups items by trimmed series name and sorts by volume count then title', () => {
  const items = [
    { seri: 'One Piece', plan_status: 'diterima' as const },
    { seri: 'One Piece ', plan_status: 'wishlist' as const },
    { seri: 'One Piece', plan_status: 'po' as const },
    { seri: 'One Piece', plan_status: 'diterima' as const },
    { seri: 'Naruto', plan_status: 'diterima' as const },
    { seri: 'Bleach', plan_status: 'belum ada' as const },
    { seri: null, plan_status: 'diterima' as const },
    { seri: '   ', plan_status: 'wishlist' as const },
  ];

  const summaries = summarizeSeries(items);

  assert.deepEqual(summaries, [
    { seri: 'One Piece', totalVolumes: 4, ownedVolumes: 2 },
    { seri: 'Bleach', totalVolumes: 1, ownedVolumes: 0 },
    { seri: 'Naruto', totalVolumes: 1, ownedVolumes: 1 },
  ]);

  const stats = summarizeCollectionStats(items);
  assert.deepEqual(stats, {
    totalItems: 8,
    ownedCount: 4,
    poCount: 1,
    wishlistCount: 2,
    seriesCount: 3,
  });
});
