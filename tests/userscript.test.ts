import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  constructShopeeImageUrl,
  detectShopeePreOrder,
  extractShopeePayload,
  isShopeeApiUrl,
  matchProductOrShopUrl,
  normalizeRawShopeePrice,
  parseVolumeAndSeries,
} from '../src/lib/userscript-extract.ts';
import { parseImportPayload, planImport } from '../src/lib/import.ts';

describe('pendeteksian URL Shopee', () => {
  it('mengenali endpoint API Shopee yang relevan', () => {
    assert.equal(
      isShopeeApiUrl('https://shopee.co.id/api/v4/shop/search_items?shopid=12345'),
      true
    );
    assert.equal(
      isShopeeApiUrl('/api/v4/shop/rcmd_items?bundle=shop_page_category_tab_main&limit=30'),
      true
    );
    assert.equal(
      isShopeeApiUrl('https://shopee.co.id/api/v4/pdp/get_pc?item_id=111&shop_id=222'),
      true
    );
    assert.equal(
      isShopeeApiUrl('https://shopee.co.id/api/v4/item/get?itemid=111&shopid=222'),
      true
    );
    assert.equal(
      isShopeeApiUrl('https://shopee.co.id/api/v2/search_items/?by=pop&limit=30'),
      true
    );
  });

  it('menolak URL yang bukan API produk Shopee', () => {
    assert.equal(isShopeeApiUrl('https://shopee.co.id/'), false);
    assert.equal(isShopeeApiUrl('https://shopee.co.id/api/v4/cart/get'), false);
    assert.equal(isShopeeApiUrl('https://google.com'), false);
    assert.equal(isShopeeApiUrl(''), false);
  });

  it('mendeteksi halaman produk dan toko dari berbagai format URL', () => {
    // Format /product/<shopid>/<itemid>
    const p1 = matchProductOrShopUrl('https://shopee.co.id/product/555000111/987654321');
    assert.equal(p1.isProduct, true);
    assert.equal(p1.shopId, '555000111');
    assert.equal(p1.itemId, '987654321');

    // Format slug-i.<shopid>.<itemid>
    const p2 = matchProductOrShopUrl('https://shopee.co.id/One-Piece-Vol-101-i.555000111.987654321');
    assert.equal(p2.isProduct, true);
    assert.equal(p2.shopId, '555000111');
    assert.equal(p2.itemId, '987654321');

    // Format toko /shop/<shopid>
    const s1 = matchProductOrShopUrl('https://shopee.co.id/shop/555000111');
    assert.equal(s1.isShop, true);
    assert.equal(s1.shopId, '555000111');

    // Query shop_id
    const s2 = matchProductOrShopUrl('https://shopee.co.id/search?shop_id=555000111');
    assert.equal(s2.isShop, true);
    assert.equal(s2.shopId, '555000111');
  });
});

describe('normalisasi harga dan gambar Shopee', () => {
  it('merekonstruksi URL gambar Shopee dari hash ID', () => {
    assert.equal(
      constructShopeeImageUrl('id-11134207-7r98o-lx1y2z3a4b'),
      'https://down-id.img.susercontent.com/file/id-11134207-7r98o-lx1y2z3a4b'
    );
    assert.equal(
      constructShopeeImageUrl('https://cf.shopee.co.id/file/test.jpg'),
      'https://cf.shopee.co.id/file/test.jpg'
    );
    assert.equal(constructShopeeImageUrl(null), null);
    assert.equal(constructShopeeImageUrl(''), null);
  });

  it('menormalisasi harga mentah Shopee dan harga dari DOM', () => {
    // Nilai raw internal Shopee tetap dipertahankan
    assert.equal(normalizeRawShopeePrice(4_500_000_000), 4_500_000_000);
    assert.equal(normalizeRawShopeePrice('4500000000'), 4_500_000_000);

    // Nilai Rupiah dari teks DOM dikonversi ke unit raw (dikalikan 100.000)
    assert.equal(normalizeRawShopeePrice(45_000), 4_500_000_000);
    assert.equal(normalizeRawShopeePrice('45000'), 4_500_000_000);
    assert.equal(normalizeRawShopeePrice('Rp 45.000'), 4_500_000_000);
    assert.equal(normalizeRawShopeePrice('Rp45.000'), 4_500_000_000);
    assert.equal(normalizeRawShopeePrice('45.000'), 4_500_000_000);

    // Nilai tidak valid menghasilkan null
    assert.equal(normalizeRawShopeePrice(null), null);
    assert.equal(normalizeRawShopeePrice('habis'), null);
    assert.equal(normalizeRawShopeePrice(-1000), null);
  });
});

describe('heuristik parsing seri dan volume', () => {
  it('mengekstrak seri dan nomor volume dari berbagai format judul komik', () => {
    const r1 = parseVolumeAndSeries('One Piece Vol. 101 (Edisi Indonesia)');
    assert.equal(r1.series, 'One Piece');
    assert.equal(r1.volume, 101);

    const r2 = parseVolumeAndSeries('Jujutsu Kaisen Volume 20');
    assert.equal(r2.series, 'Jujutsu Kaisen');
    assert.equal(r2.volume, 20);

    const r3 = parseVolumeAndSeries('Komik Chainsaw Man #12');
    assert.equal(r3.series, 'Chainsaw Man');
    assert.equal(r3.volume, 12);

    const r4 = parseVolumeAndSeries('Manga Spy x Family 9');
    assert.equal(r4.series, 'Spy x Family');
    assert.equal(r4.volume, 9);

    const r5 = parseVolumeAndSeries('Detektif Conan 100 - Reguler');
    assert.equal(r5.series, 'Detektif Conan');
    assert.equal(r5.volume, 100);

    const r6 = parseVolumeAndSeries('Poster Anime One Piece');
    assert.equal(r6.series, null);
    assert.equal(r6.volume, null);
  });
});

describe('pendeteksian pre-order Shopee', () => {
  it('mengenali flag is_pre_order, estimasi hari, dan teks', () => {
    assert.equal(detectShopeePreOrder({ is_pre_order: true }), true);
    assert.equal(detectShopeePreOrder({ estimated_days: 14 }), true);
    assert.equal(detectShopeePreOrder({ name: '[PRE-ORDER] Frieren Vol 10' }), true);
    assert.equal(detectShopeePreOrder({ name: 'One Piece Vol 100' }, 'Badge: Pre-Order'), true);

    // Barang ready
    assert.equal(
      detectShopeePreOrder({ is_pre_order: false, estimated_days: 2, name: 'Ready Stock Manga' }),
      false
    );
  });
});

describe('ekstraksi payload respons Shopee defensif', () => {
  it('mengekstrak daftar produk dari respons API v4 shop/search_items', () => {
    const mockApiResponse = {
      data: {
        items: [
          {
            item_basic: {
              itemid: 1001,
              shopid: 555001,
              name: 'One Piece Vol. 101',
              price: 4_500_000_000,
              image: 'img-op-101',
              is_pre_order: false,
              shop_name: 'Gramedia Shopee',
            },
          },
          {
            item_basic: {
              itemid: 1002,
              shopid: 555001,
              name: 'Jujutsu Kaisen Vol 22 (Pre-Order)',
              price: 4_000_000_000,
              image: 'img-jjk-22',
              is_pre_order: true,
              shop_name: 'Gramedia Shopee',
            },
          },
        ],
      },
    };

    const extracted = extractShopeePayload(mockApiResponse);
    assert.equal(extracted.length, 2);

    assert.equal(extracted[0].itemid, '1001');
    assert.equal(extracted[0].shopid, '555001');
    assert.equal(extracted[0].nama, 'One Piece Vol. 101');
    assert.equal(extracted[0].harga_raw, 4_500_000_000);
    assert.equal(extracted[0].label_po, false);
    assert.equal(extracted[0].thumbnail, 'https://down-id.img.susercontent.com/file/img-op-101');
    assert.equal(extracted[0].url, 'https://shopee.co.id/product/555001/1001');
    assert.equal(extracted[0].seri, 'One Piece');
    assert.equal(extracted[0].volume, 101);

    assert.equal(extracted[1].itemid, '1002');
    assert.equal(extracted[1].label_po, true);
    assert.equal(extracted[1].seri, 'Jujutsu Kaisen');
    assert.equal(extracted[1].volume, 22);
  });

  it('mengekstrak produk tunggal dari halaman detail PDP v4/pdp/get_pc', () => {
    const mockPdpResponse = {
      data: {
        item: {
          item_id: 9999,
          shop_id: 8888,
          title: 'Chainsaw Man Vol. 12',
          price: 4_500_000_000,
          images: ['csm-12-cover'],
          is_pre_order: true,
          shop_info: {
            shop_name: 'Manga Official Store',
          },
        },
      },
    };

    const extracted = extractShopeePayload(mockPdpResponse);
    assert.equal(extracted.length, 1);
    assert.equal(extracted[0].itemid, '9999');
    assert.equal(extracted[0].shopid, '8888');
    assert.equal(extracted[0].nama, 'Chainsaw Man Vol. 12');
    assert.equal(extracted[0].nama_toko, 'Manga Official Store');
    assert.equal(extracted[0].seri, 'Chainsaw Man');
    assert.equal(extracted[0].volume, 12);
  });

  it('tetap berjalan aman ketika ada elemen rusak/malformed (parsing defensif)', () => {
    const mockCorruptPayload = {
      data: {
        items: [
          null,
          { item_basic: null },
          { item_basic: { itemid: null, name: 'Tanpa ID' } },
          {
            item_basic: {
              itemid: 777,
              shopid: 888,
              name: 'Komik Valid',
              price: 3_500_000_000,
            },
          },
          'string acak bukan objek',
        ],
      },
    };

    const extracted = extractShopeePayload(mockCorruptPayload);
    assert.equal(extracted.length, 1);
    assert.equal(extracted[0].itemid, '777');
    assert.equal(extracted[0].nama, 'Komik Valid');
  });

  it('menghasilkan payload yang kompatibel penuh dengan endpoint F5 /api/import', () => {
    const mockApiResponse = {
      data: {
        items: [
          {
            item_basic: {
              itemid: 12345,
              shopid: 67890,
              name: 'Frieren Vol. 1',
              price: 4_500_000_000,
              image: 'frieren-1',
              is_pre_order: true,
            },
          },
        ],
      },
    };

    const extracted = extractShopeePayload(mockApiResponse);
    // Masukkan langsung ke validator server F5 (parseImportPayload)
    const serverParsed = parseImportPayload({ items: extracted });

    assert.equal(serverParsed.ok, true);
    if (serverParsed.ok) {
      assert.equal(serverParsed.items.length, 1);
      assert.equal(serverParsed.items[0].item_id_shopee, '12345');
      assert.equal(serverParsed.items[0].shop_id, '67890');
      // Server membagi dengan 100.000 menjadi Rp 45.000
      assert.equal(serverParsed.items[0].harga, 45_000);
      assert.equal(serverParsed.items[0].is_po, true);
      assert.equal(serverParsed.items[0].seri, 'Frieren');
      assert.equal(serverParsed.items[0].volume, 1);

      // Rencanakan import
      const plan = planImport(serverParsed.items);
      assert.equal(plan.created, 1);
      assert.equal(plan.newPlans[0].status, 'wishlist');
    }
  });
});
