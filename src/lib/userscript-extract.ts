/**
 * Modul logika ekstraksi data Shopee untuk Userscript Tampermonkey (PRD F5, TASK-006).
 *
 * Modul ini murni (pure functions) dan bebas dependensi browser DOM berat
 * sehingga dapat diuji secara komprehensif menggunakan `node --test` sebelum
 * dibundel / dimasukkan ke dalam file userscript `userscript/comicplan-import.user.js`.
 */

export interface ExtractedShopeeProduct {
  itemid: string;
  shopid: string;
  nama: string;
  harga_raw: number | null;
  label_po: boolean;
  deadline_po: string | null;
  tanggal_rilis: string | null;
  thumbnail: string | null;
  url: string;
  nama_toko: string | null;
  seri: string | null;
  volume: number | null;
}

export interface UrlMatchResult {
  isProduct: boolean;
  isShop: boolean;
  shopId: string | null;
  itemId: string | null;
}

/**
 * Pola URL API Shopee yang mengembalikan daftar atau detail produk.
 */
export const SHOPEE_API_PATTERN =
  /\/api\/v[24]\/(?:shop\/(?:search_items|rcmd_items|get_shop_base)|(?:search\/)?search_items|pdp\/get_pc|item\/get|recommend\/recommend)/i;

/**
 * Cek apakah URL merupakan endpoint produk/toko Shopee.
 */
export function isShopeeApiUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  return SHOPEE_API_PATTERN.test(url);
}

/**
 * Parsing URL Shopee untuk mengenali halaman produk atau toko.
 * Format produk Shopee:
 * - `/product/<shopid>/<itemid>`
 * - `/<nama-produk>-i.<shopid>.<itemid>`
 * Format toko Shopee:
 * - `/shop/<shopid>`
 * - URL dengan query parameter `shop_id=<shopid>`
 */
export function matchProductOrShopUrl(url: string): UrlMatchResult {
  const result: UrlMatchResult = {
    isProduct: false,
    isShop: false,
    shopId: null,
    itemId: null,
  };

  if (!url || typeof url !== 'string') return result;

  // 1. Cek pola product /product/<shopid>/<itemid>
  const productSlashMatch = url.match(/\/product\/(\d+)\/(\d+)/i);
  if (productSlashMatch) {
    result.isProduct = true;
    result.shopId = productSlashMatch[1];
    result.itemId = productSlashMatch[2];
    return result;
  }

  // 2. Cek pola product slug -i.<shopid>.<itemid>
  const productDashMatch = url.match(/-i\.(\d+)\.(\d+)/i);
  if (productDashMatch) {
    result.isProduct = true;
    result.shopId = productDashMatch[1];
    result.itemId = productDashMatch[2];
    return result;
  }

  // 3. Cek pola toko /shop/<shopid>
  const shopSlashMatch = url.match(/\/shop\/(\d+)/i);
  if (shopSlashMatch) {
    result.isShop = true;
    result.shopId = shopSlashMatch[1];
    return result;
  }

  // 4. Cek query shop_id=...
  const shopQueryMatch = url.match(/[?&]shop_id=(\d+)/i);
  if (shopQueryMatch) {
    result.isShop = true;
    result.shopId = shopQueryMatch[1];
    return result;
  }

  return result;
}

/**
 * Konversi ID hash gambar Shopee ke URL CDN resmi Shopee Indonesia.
 */
export function constructShopeeImageUrl(imageIdOrUrl: unknown): string | null {
  if (!imageIdOrUrl || typeof imageIdOrUrl !== 'string') return null;

  const trimmed = imageIdOrUrl.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Hash ID Shopee (misal id-11134207-7r98o-lx1y2z3a4b atau hash md5)
  return `https://down-id.img.susercontent.com/file/${trimmed}`;
}

/**
 * Normalisasi harga mentah Shopee ke format yang diharapkan server F5.
 *
 * Aturan F5:
 * - Server membagi `harga_raw ÷ 100.000` untuk mendapatkan harga Rupiah.
 * - Bila input sudah berupa angka raw internal Shopee (>= 1.000.000, misal 4.500.000.000 untuk Rp 45.000),
 *   pertahankan nilainya.
 * - Bila input berupa angka Rupiah normal (misal 45.000 dari teks DOM "Rp 45.000"),
 *   kalikan 100.000 sehingga server tetap menghitung 45.000.
 */
export function normalizeRawShopeePrice(priceValue: unknown): number | null {
  if (priceValue === null || priceValue === undefined) return null;

  if (typeof priceValue === 'number') {
    if (!Number.isFinite(priceValue) || priceValue < 0) return null;
    // Angka internal Shopee selalu besar karena pembagi 100.000
    // Komik harga Rp 10.000 raw-nya adalah 1.000.000.000
    if (priceValue >= 1_000_000) {
      return Math.round(priceValue);
    }
    // Jika angka kecil (misal 45000), ini adalah nominal Rupiah langsung → ubah ke raw
    return Math.round(priceValue * 100_000);
  }

  if (typeof priceValue === 'string') {
    const cleanStr = priceValue.trim();
    if (!cleanStr) return null;

    // Jika string angka murni
    if (/^\d+$/.test(cleanStr)) {
      const num = Number(cleanStr);
      if (!Number.isFinite(num)) return null;
      if (num >= 1_000_000) {
        return Math.round(num);
      }
      return Math.round(num * 100_000);
    }

    // Jika string bertanda Rupiah, misal "Rp45.000" atau "Rp 45.000"
    const rupiahMatch = cleanStr.match(/Rp\s*([\d.,]+)/i) || cleanStr.match(/^([\d.,]+)$/);
    if (rupiahMatch) {
      // Hilangkan titik pemisah ribuan
      const numPart = rupiahMatch[1].replace(/\./g, '').replace(/,/g, '.');
      const num = parseFloat(numPart);
      if (Number.isFinite(num) && num > 0) {
        return Math.round(num * 100_000);
      }
    }
  }

  return null;
}

/**
 * Heuristik pendeteksian seri dan nomor volume komik dari judul produk.
 *
 * Contoh:
 * - "One Piece Vol. 101 (Edisi Indonesia)" → seri: "One Piece", volume: 101
 * - "Jujutsu Kaisen Volume 20" → seri: "Jujutsu Kaisen", volume: 20
 * - "Chainsaw Man #12" → seri: "Chainsaw Man", volume: 12
 * - "Detektif Conan 100 - Reguler" → seri: "Detektif Conan", volume: 100
 */
export function parseVolumeAndSeries(title: string): { series: string | null; volume: number | null } {
  if (!title || typeof title !== 'string') {
    return { series: null, volume: null };
  }

  const clean = title.trim();

  // Pola 1: Vol. / Vol / Volume / Buku / Book / # / No. diikuti angka
  const volMatch = clean.match(
    /(?:^|\s|[(\[])(?:vol(?:ume|\.|\s)?|buku|book|no\.?|#)\s*([0-9]{1,4})(?:$|\s|[)\]\-,:])/i
  );

  if (volMatch) {
    const volNum = parseInt(volMatch[1], 10);
    const beforeIndex = volMatch.index ?? 0;
    let seriesPart = clean.slice(0, beforeIndex).trim();

    // Bersihkan prefix umum seperti "Komik", "Manga", "Novel"
    seriesPart = seriesPart.replace(/^(?:komik|manga|novel|manhwa)\s+/i, '').trim();

    return {
      series: seriesPart.length > 0 ? seriesPart : null,
      volume: Number.isFinite(volNum) ? volNum : null,
    };
  }

  // Pola 2: Angka di akhir atau sebelum tanda kurung/strip (misal "Detektif Conan 100")
  const trailingNumMatch = clean.match(
    /^(?:(?:komik|manga)\s+)?(.+?)\s+([0-9]{1,3})(?:\s*[-–(].*|\s+edisi.*)?$/i
  );

  if (trailingNumMatch) {
    const series = trailingNumMatch[1].trim();
    const vol = parseInt(trailingNumMatch[2], 10);
    if (series.length > 1 && Number.isFinite(vol)) {
      return { series, volume: vol };
    }
  }

  return { series: null, volume: null };
}

/**
 * Deteksi apakah produk memiliki status Pre-Order.
 */
export function detectShopeePreOrder(
  raw: Record<string, unknown>,
  pageOrBadgeText?: string
): boolean {
  if (!raw || typeof raw !== 'object') return false;

  if (raw.is_pre_order === true || raw.pre_order === true || raw.label_po === true) {
    return true;
  }

  // Shopee estimated_days > 7 hari biasanya adalah tanda Pre-Order
  const estimatedDays = Number(raw.estimated_days ?? raw.shipping_days ?? 0);
  if (Number.isFinite(estimatedDays) && estimatedDays > 7) {
    return true;
  }

  // Cek pada teks badge atau nama produk
  const textToCheck = `${String(raw.name ?? raw.title ?? '')} ${pageOrBadgeText ?? ''}`.toLowerCase();
  if (/\b(?:pre[\s-]?order|p\.?o\.?)\b/i.test(textToCheck)) {
    return true;
  }

  return false;
}

/**
 * Ekstraksi satu item produk dari raw object Shopee secara defensif (try/catch).
 */
export function extractSingleProduct(
  raw: unknown,
  fallbackShopId?: string | null
): ExtractedShopeeProduct | null {
  if (!raw || typeof raw !== 'object') return null;

  try {
    const obj = raw as Record<string, unknown>;

    // Bila bersarang dalam `item_basic` (format umum API v4 search / shop)
    const item = (obj.item_basic && typeof obj.item_basic === 'object'
      ? (obj.item_basic as Record<string, unknown>)
      : obj) as Record<string, unknown>;

    const rawItemId = item.itemid ?? item.item_id ?? obj.itemid ?? obj.item_id;
    const rawShopId =
      item.shopid ?? item.shop_id ?? obj.shopid ?? obj.shop_id ?? fallbackShopId;

    if (!rawItemId || !rawShopId) {
      return null;
    }

    const itemid = String(rawItemId).trim();
    const shopid = String(rawShopId).trim();

    if (!itemid || !shopid) return null;

    const rawName = item.name ?? item.title ?? item.item_name ?? obj.name ?? obj.title;
    const nama = rawName ? String(rawName).trim() : '';
    if (!nama) return null;

    const rawPrice =
      item.price ??
      item.price_min ??
      item.price_before_discount ??
      obj.price ??
      obj.price_min ??
      obj.harga_raw;
    const harga_raw = normalizeRawShopeePrice(rawPrice);

    const label_po = detectShopeePreOrder(item);

    const imageIdentifier =
      item.image ??
      (Array.isArray(item.images) ? item.images[0] : null) ??
      obj.image ??
      (Array.isArray(obj.images) ? obj.images[0] : null) ??
      item.thumbnail ??
      obj.thumbnail;
    const thumbnail = constructShopeeImageUrl(imageIdentifier);

    const url = `https://shopee.co.id/product/${shopid}/${itemid}`;

    // Ekstraksi nama toko
    let nama_toko: string | null = null;
    if (item.shop_name && typeof item.shop_name === 'string') {
      nama_toko = item.shop_name.trim();
    } else if (
      item.shop_info &&
      typeof item.shop_info === 'object' &&
      'shop_name' in item.shop_info
    ) {
      nama_toko = String((item.shop_info as { shop_name?: unknown }).shop_name ?? '').trim() || null;
    }

    // Heuristik seri & volume
    const { series, volume } = parseVolumeAndSeries(nama);

    return {
      itemid,
      shopid,
      nama,
      harga_raw,
      label_po,
      deadline_po: null,
      tanggal_rilis: null,
      thumbnail,
      url,
      nama_toko,
      seri: series,
      volume,
    };
  } catch {
    // Parsing defensif: kesalahan pada satu item tidak boleh menggagalkan batch
    return null;
  }
}

/**
 * Ekstraksi seluruh item produk dari payload JSON Shopee (berbagai format respons).
 *
 * Menerima respons dari:
 * - `v4/shop/search_items` (`data.items[].item_basic` atau `data.items[]`)
 * - `v4/shop/rcmd_items` (`data.sections[].data.item[]`)
 * - `v4/pdp/get_pc` (`data.item`)
 * - `v4/item/get` (`data.item`)
 * - `v2/search_items` (`items[]`)
 * - Array langsung
 */
export function extractShopeePayload(
  payload: unknown,
  contextUrl?: string
): ExtractedShopeeProduct[] {
  if (!payload || typeof payload !== 'object') return [];

  const results: ExtractedShopeeProduct[] = [];
  const seenKeys = new Set<string>();

  // Ekstrak fallback shopId dari contextUrl bila ada
  const urlInfo = contextUrl ? matchProductOrShopUrl(contextUrl) : null;
  const fallbackShopId = urlInfo?.shopId ?? null;

  function pushItem(item: ExtractedShopeeProduct | null) {
    if (!item) return;
    const key = `${item.shopid}:${item.itemid}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      results.push(item);
    }
  }

  try {
    const root = payload as Record<string, unknown>;

    // Format 1: data.items (array)
    const dataObj = root.data && typeof root.data === 'object' ? (root.data as Record<string, unknown>) : null;

    if (dataObj && Array.isArray(dataObj.items)) {
      for (const rawItem of dataObj.items) {
        pushItem(extractSingleProduct(rawItem, fallbackShopId));
      }
    }

    // Format 2: data.item (objek single product detail / PDP)
    if (dataObj && dataObj.item && typeof dataObj.item === 'object') {
      pushItem(extractSingleProduct(dataObj.item, fallbackShopId));
    }

    // Format 3: data.sections (kategori / rekomendasi)
    if (dataObj && Array.isArray(dataObj.sections)) {
      for (const section of dataObj.sections) {
        if (section && typeof section === 'object') {
          const secData = (section as { data?: { item?: unknown[] } }).data;
          if (secData && Array.isArray(secData.item)) {
            for (const rawItem of secData.item) {
              pushItem(extractSingleProduct(rawItem, fallbackShopId));
            }
          }
        }
      }
    }

    // Format 4: root.items (array)
    if (Array.isArray(root.items)) {
      for (const rawItem of root.items) {
        pushItem(extractSingleProduct(rawItem, fallbackShopId));
      }
    }

    // Format 5: root.item (objek tunggal)
    if (root.item && typeof root.item === 'object') {
      pushItem(extractSingleProduct(root.item, fallbackShopId));
    }

    // Format 6: payload adalah Array langsung
    if (Array.isArray(payload)) {
      for (const rawItem of payload) {
        pushItem(extractSingleProduct(rawItem, fallbackShopId));
      }
    }
  } catch {
    // Parsing defensif: abaikan jika payload sama sekali tidak berstruktur
  }

  return results;
}
