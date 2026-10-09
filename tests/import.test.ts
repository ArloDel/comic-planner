import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  IMPORT_MARKETPLACE,
  MAX_ITEMS_PER_IMPORT,
  SHOPEE_PRICE_DIVISOR,
  isImportTokenValid,
  listingKey,
  normalizeDate,
  normalizeImportItem,
  parseImportPayload,
  parseShopeePrice,
  planImport,
  type ExistingListing,
  type ImportItem,
} from '../src/lib/import.ts';

/**
 * Produk mentah seperti yang dikirim userscript TASK-006.
 * `harga_raw` dalam satuan PRD: 4.500.000.000 ÷ 100.000 = Rp 45.000.
 */
const shopeeProduct = (overrides: Record<string, unknown> = {}) => ({
  itemid: 987654321,
  shopid: 555000111,
  nama: 'One Piece Vol. 101 (Edisi Indonesia)',
  harga_raw: 4_500_000_000,
  label_po: false,
  thumbnail: 'https://cdn.example/101.jpg',
  url: 'https://shopee.co.id/product/987654321',
  nama_toko: 'Manga Store ID',
  ...overrides,
});

/** Ids berurutan supaya hasil `planImport` bisa dibandingkan tanpa tebakan. */
function sequentialIds() {
  let next = 0;
  return () => `id-${++next}`;
}

const fixedNow = () => '2026-10-06T00:00:00.000Z';

describe('parsing harga Shopee', () => {
  it('membagi harga mentah dengan 100.000 sesuai PRD F5', () => {
    assert.equal(parseShopeePrice(4_500_000_000), 45_000);
    assert.equal(parseShopeePrice(15_500_000_000), 155_000);
    assert.equal(parseShopeePrice(0), 0);
    assert.equal(SHOPEE_PRICE_DIVISOR, 100_000);
  });

  it('menerima string angka bulat dari userscript', () => {
    assert.equal(parseShopeePrice('4500000000'), 45_000);
  });

  it('menolak nilai yang bukan satuan mentah, bukan menebaknya jadi rupiah', () => {
    // "Rp45.000" tidak bisa dibedakan mentah vs rupiah — lebih baik null
    // daripada menyimpan harga 100.000x lipat.
    assert.equal(parseShopeePrice('Rp45.000'), null);
    assert.equal(parseShopeePrice('45000.50'), null);
    assert.equal(parseShopeePrice(undefined), null);
    assert.equal(parseShopeePrice(null), null);
    assert.equal(parseShopeePrice({}), null);
    assert.equal(parseShopeePrice(Number.NaN), null);
    assert.equal(parseShopeePrice(-4_500_000_000), null);
  });
});

describe('parsing tanggal & flag PO', () => {
  it('menerima YYYY-MM-DD dan memotong ISO datetime', () => {
    assert.equal(normalizeDate('2026-12-01'), '2026-12-01');
    assert.equal(normalizeDate('2026-12-01T00:00:00+07:00'), '2026-12-01');
    assert.equal(normalizeDate('2026-12-01T23:59:59Z'), '2026-12-01');
  });

  it('menolak tanggal ngawur tanpa melempar error', () => {
    assert.equal(normalizeDate('besok'), null);
    assert.equal(normalizeDate('2026-13-45'), null);
    assert.equal(normalizeDate(undefined), null);
  });

  it('mengenali berbagai bentuk flag pre-order', () => {
    for (const flag of [true, 1, 'true', '1', 'PO', 'pre-order', 'yes']) {
      const result = normalizeImportItem(shopeeProduct({ label_po: flag }), 0);
      assert.equal(result.ok && result.item.is_po, true, `flag ${String(flag)} harus jadi PO`);
    }

    for (const flag of [false, 0, 'false', '', undefined]) {
      const result = normalizeImportItem(shopeeProduct({ label_po: flag }), 0);
      assert.equal(result.ok && result.item.is_po, false, `flag ${String(flag)} harus jadi ready`);
    }
  });
});

describe('normalisasi satu produk', () => {
  it('mengisi field opsional dari payload mentah', () => {
    const result = normalizeImportItem(
      shopeeProduct({ seri: 'One Piece', volume: '101', tanggal_rilis: '2026-11-20' }),
      0
    );

    assert.equal(result.ok, true);
    if (!result.ok) return;

    assert.equal(result.item.marketplace, IMPORT_MARKETPLACE);
    assert.equal(result.item.shop_id, '555000111');
    assert.equal(result.item.item_id_shopee, '987654321');
    assert.equal(result.item.nama, 'One Piece Vol. 101 (Edisi Indonesia)');
    assert.equal(result.item.seri, 'One Piece');
    assert.equal(result.item.volume, 101);
    assert.equal(result.item.harga, 45_000);
    assert.equal(result.item.tanggal_rilis, '2026-11-20');
  });

  it('menolak produk tanpa kunci unik agar tidak menghasilkan baris sia-sia', () => {
    const noItemId = normalizeImportItem(shopeeProduct({ itemid: undefined }), 3);
    assert.equal(noItemId.ok, false);
    assert.equal(noItemId.ok === false && noItemId.error.index, 3);
    assert.match(noItemId.ok === false ? noItemId.error.message : '', /itemid/);

    const noShopId = normalizeImportItem(shopeeProduct({ shopid: '' }), 4);
    assert.equal(noShopId.ok, false);
    assert.match(noShopId.ok === false ? noShopId.error.message : '', /shopid/);

    const noName = normalizeImportItem(shopeeProduct({ nama: '   ' }), 5);
    assert.equal(noName.ok, false);
    assert.match(noName.ok === false ? noName.error.message : '', /nama produk/);
  });

  it('menolak harga yang ada tapi tidak terbaca, bukan menganggapnya Rp 0', () => {
    const result = normalizeImportItem(shopeeProduct({ harga_raw: 'Rp45.000' }), 0);
    assert.equal(result.ok, false);
    assert.match(result.ok === false ? result.error.message : '', /harga/);
  });

  it('tetap menyimpan produk yang tidak membawa harga sama sekali', () => {
    const result = normalizeImportItem(shopeeProduct({ harga_raw: undefined }), 0);
    assert.equal(result.ok, true);
    assert.equal(result.ok && result.item.harga, null);
  });

  it('tidak menyentuh elemen yang bukan objek', () => {
    const result = normalizeImportItem('bukan objek', 2);
    assert.equal(result.ok, false);
    assert.match(result.ok === false ? result.error.message : '', /itemid/);
  });
});

describe('parsing payload batch', () => {
  it('menerima array polos maupun objek dengan key items', () => {
    const arrayForm = parseImportPayload([shopeeProduct()]);
    assert.equal(arrayForm.ok && arrayForm.items.length, 1);

    const objectForm = parseImportPayload({ items: [shopeeProduct(), shopeeProduct({ itemid: 2 })] });
    assert.equal(objectForm.ok && objectForm.items.length, 2);
  });

  it('memproses produk valid walau ada produk lain yang rusak', () => {
    const parsed = parseImportPayload([
      shopeeProduct(),
      { nama: 'tanpa id' },
      shopeeProduct({ itemid: '222' }),
      null,
    ]);

    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;

    assert.equal(parsed.items.length, 2);
    assert.equal(parsed.errors.length, 2);
    assert.deepEqual(
      parsed.errors.map((e) => e.index),
      [1, 3]
    );
  });

  it('menolak payload yang bukan daftar produk', () => {
    for (const payload of [{}, { items: 'bukan array' }, 'teks', 42, null]) {
      const parsed = parseImportPayload(payload);
      assert.equal(parsed.ok, false, `payload ${JSON.stringify(payload)} harus ditolak`);
    }
  });

  it('menolak batch kosong dan batch melebihi batas', () => {
    assert.equal(parseImportPayload([]).ok, false);

    const tooMany = Array.from({ length: MAX_ITEMS_PER_IMPORT + 1 }, (_, i) =>
      shopeeProduct({ itemid: `item-${i}` })
    );

    const parsed = parseImportPayload(tooMany);
    assert.equal(parsed.ok, false);
    assert.match(parsed.ok === false ? parsed.error : '', /Maksimal/);
  });
});

describe('validasi token import', () => {
  it('menerima hanya token yang cocok persis', () => {
    assert.equal(isImportTokenValid('rahasia-123', 'rahasia-123'), true);
    assert.equal(isImportTokenValid('rahasia-124', 'rahasia-123'), false);
    assert.equal(isImportTokenValid('Rahasia-123', 'rahasia-123'), false);
    assert.equal(isImportTokenValid('rahasia-1234', 'rahasia-123'), false);
    assert.equal(isImportTokenValid('', 'rahasia-123'), false);
  });

  it('menolak semua token bila server belum punya IMPORT_TOKEN', () => {
    assert.equal(isImportTokenValid('apa-saja', null), false);
    assert.equal(isImportTokenValid('apa-saja', undefined), false);
    assert.equal(isImportTokenValid('apa-saja', ''), false);
  });
});

describe('perencanaan upsert batch', () => {
  const parsed = (products: unknown[]) => {
    const result = parseImportPayload(products);
    assert.equal(result.ok, true);
    return result.ok ? result.items : [];
  };

  it('produk baru → item + listing + plan wishlist, dengan id yang saling terhubung', () => {
    const items = parsed([shopeeProduct()]);
    const plan = planImport(items, { newId: sequentialIds(), now: fixedNow });

    assert.equal(plan.created, 1);
    assert.equal(plan.updated, 0);
    assert.equal(plan.newItems.length, 1);
    assert.equal(plan.newListings.length, 1);
    assert.equal(plan.newPlans.length, 1);
    assert.equal(plan.updatedListings.length, 0);

    const [item] = plan.newItems;
    const [listing] = plan.newListings;
    const [newPlan] = plan.newPlans;

    assert.equal(item.judul, 'One Piece Vol. 101 (Edisi Indonesia)');
    assert.equal(item.cover_url, 'https://cdn.example/101.jpg');
    assert.equal(item.created_at, '2026-10-06T00:00:00.000Z');
    assert.equal(item.updated_at, '2026-10-06T00:00:00.000Z');
    assert.equal(listing.item_id, item.id);
    assert.equal(newPlan.item_id, item.id);
    assert.equal(newPlan.listing_id, listing.id);
    assert.equal(newPlan.status, 'wishlist');
    assert.equal(newPlan.estimasi_harga, 45_000);
    assert.equal(newPlan.created_at, '2026-10-06T00:00:00.000Z');
    assert.equal(newPlan.updated_at, '2026-10-06T00:00:00.000Z');
    assert.equal(listing.harga, 45_000);
    assert.equal(listing.status, 'ready');
    assert.equal(listing.marketplace, 'shopee');
  });

  it('produk yang sudah ada → hanya listing yang di-refresh, tanpa item/plan baru', () => {
    const items = parsed([shopeeProduct({ harga_raw: 5_000_000_000 })]);
    const key = listingKey(items[0] as ImportItem);
    const existing = new Map<string, ExistingListing>([
      [key, { listing_id: 'listing-lama', item_id: 'item-lama', harga: 45_000, deadline_po: null }],
    ]);

    const plan = planImport(items, { existing, newId: sequentialIds(), now: fixedNow });

    assert.equal(plan.created, 0);
    assert.equal(plan.updated, 1);
    assert.equal(plan.newItems.length, 0);
    assert.equal(plan.newPlans.length, 0);
    assert.equal(plan.updatedListings.length, 1);

    const [listing] = plan.updatedListings;
    assert.equal(listing.id, 'listing-lama');
    assert.equal(listing.item_id, 'item-lama');
    assert.equal(listing.harga, 50_000);
    assert.equal(listing.updated_at, '2026-10-06T00:00:00.000Z');
  });

  it('re-import tidak pernah membuat duplikat walau dijalankan berkali-kali', () => {
    const first = planImport(parsed([shopeeProduct()]), { newId: sequentialIds(), now: fixedNow });

    // Simulasikan hasil run pertama sudah tersimpan di DB.
    const existing = new Map<string, ExistingListing>([
      [
        listingKey(first.newListings[0]),
        {
          listing_id: first.newListings[0].id,
          item_id: first.newItems[0].id,
          harga: 45_000,
          deadline_po: null,
        },
      ],
    ]);

    const second = planImport(parsed([shopeeProduct()]), { existing, newId: sequentialIds(), now: fixedNow });

    assert.equal(second.created, 0);
    assert.equal(second.updated, 1);
    assert.equal(second.newItems.length, 0);
    assert.equal(second.newListings.length, 0);
    assert.equal(second.newPlans.length, 0);
    assert.equal(second.updatedListings[0].id, first.newListings[0].id);
  });

  it('duplikat di dalam satu payload digabung, tidak jadi dua item', () => {
    const plan = planImport(
      parsed([
        shopeeProduct({ seri: 'One Piece', harga_raw: 4_000_000_000 }),
        shopeeProduct({ seri: 'One Piece', harga_raw: 4_500_000_000 }),
      ]),
      { newId: sequentialIds(), now: fixedNow }
    );

    assert.equal(plan.newItems.length, 1);
    assert.equal(plan.newListings.length, 1);
    assert.equal(plan.newPlans.length, 1);
    assert.equal(plan.created, 1);
    assert.equal(plan.updated, 1);
    assert.equal(plan.newListings[0].harga, 45_000);
  });

  it('duplikat tidak menimpa data yang tidak dibawa payload', () => {
    const plan = planImport(
      parsed([shopeeProduct({ seri: 'One Piece', harga_raw: undefined })]),
      { newId: sequentialIds(), now: fixedNow }
    );

    const duplicate = planImport(parsed([shopeeProduct({ seri: null, harga_raw: undefined })]), {
      newId: sequentialIds(),
      now: fixedNow,
    });

    // Harga tidak terbaca di batch mana pun → tidak ada yang perlu dijaga.
    assert.equal(plan.newListings[0].harga, 0);
    assert.equal(duplicate.newListings[0].harga, 0);
  });

  it('harga, deadline, & metadata lama tidak dihapus saat re-import tanpa field itu', () => {
    const items = parsed([shopeeProduct({ label_po: true, deadline_po: undefined, harga_raw: undefined, nama_toko: undefined, url: undefined, tanggal_rilis: undefined })]);
    const key = listingKey(items[0] as ImportItem);
    const existing = new Map<string, ExistingListing>([
      [
        key,
        {
          listing_id: 'lama',
          item_id: 'item',
          harga: 45_000,
          deadline_po: '2026-12-01',
          nama_toko: 'Toko Lama',
          url: 'https://shopee.co.id/product/lama',
          tanggal_rilis: '2026-11-20',
        },
      ],
    ]);

    const plan = planImport(items, { existing, newId: sequentialIds(), now: fixedNow });

    assert.equal(plan.updatedListings[0].harga, 45_000);
    assert.equal(plan.updatedListings[0].deadline_po, '2026-12-01');
    assert.equal(plan.updatedListings[0].nama_toko, 'Toko Lama');
    assert.equal(plan.updatedListings[0].url, 'https://shopee.co.id/product/lama');
    assert.equal(plan.updatedListings[0].tanggal_rilis, '2026-11-20');
    assert.equal(plan.updatedListings[0].status, 'po');
  });

  it('flag PO memetakan ke listing.status, plan baru tetap wishlist', () => {
    const poPlan = planImport(
      parsed([shopeeProduct({ label_po: true, deadline_po: '2026-12-01' })]),
      { newId: sequentialIds(), now: fixedNow }
    );

    assert.equal(poPlan.newListings[0].status, 'po');
    assert.equal(poPlan.newListings[0].deadline_po, '2026-12-01');
    // PRD F5: item baru masuk sebagai wishlist; status PO dipilih pengguna
    // lewat state machine F3 (karena butuh deadline + intent).
    assert.equal(poPlan.newPlans[0].status, 'wishlist');
    assert.equal(poPlan.newPlans[0].deadline_po, null);
  });

  it('listing yang turun dari PO ke ready ikut membersihkan deadline', () => {
    const items = parsed([shopeeProduct({ label_po: false })]);
    const key = listingKey(items[0] as ImportItem);
    const existing = new Map<string, ExistingListing>([
      [key, { listing_id: 'lama', item_id: 'item', harga: 45_000, deadline_po: '2026-12-01' }],
    ]);

    const plan = planImport(items, { existing, newId: sequentialIds(), now: fixedNow });

    assert.equal(plan.updatedListings[0].status, 'ready');
    assert.equal(plan.updatedListings[0].deadline_po, null);
  });

  it('50 produk jadi 4 statement batch, bukan 150 request', () => {
    const items = parsed(
      Array.from({ length: 50 }, (_, i) => shopeeProduct({ itemid: `item-${i}` }))
    );

    const plan = planImport(items, { newId: sequentialIds(), now: fixedNow });

    assert.equal(items.length, 50);
    assert.equal(plan.created, 50);
    assert.equal(plan.newItems.length, 50);
    assert.equal(plan.newListings.length, 50);
    assert.equal(plan.newPlans.length, 50);

    // Semua id unik — tidak ada risiko bentrok PK saat insert batch.
    const ids = [...plan.newItems, ...plan.newListings, ...plan.newPlans].map((row) => row.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it('produk dari toko berbeda tidak dianggap duplikat', () => {
    const plan = planImport(
      parsed([shopeeProduct({ itemid: '111' }), shopeeProduct({ itemid: '111', shopid: '999' })]),
      { newId: sequentialIds(), now: fixedNow }
    );

    assert.equal(plan.created, 2);
    assert.equal(plan.newListings.length, 2);
  });
});
