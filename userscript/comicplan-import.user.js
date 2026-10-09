// ==UserScript==
// @name         ComicPlan Shopee Importer
// @namespace    https://github.com/comicplan
// @version      1.0.1
// @description  Ekstrak dan sinkronisasi produk komik/manga dari toko Shopee ke ComicPlan (/api/import)
// @author       ComicPlan
// @match        *://shopee.co.id/*
// @match        *://*.shopee.co.id/*
// @icon         https://shopee.co.id/favicon.ico
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @connect      localhost
// @connect      127.0.0.1
// @connect      *
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  // =========================================================================
  // 1. KONFIGURASI & STORAGE
  // =========================================================================
  const DEFAULT_API_URL = 'http://localhost:3000/api/import';
  const STORAGE_KEY_URL = 'comicplan_api_url';
  const STORAGE_KEY_TOKEN = 'comicplan_import_token';
  const STORAGE_KEY_MINIMIZED = 'comicplan_is_minimized';

  function getStorage(key, defaultVal = '') {
    if (typeof GM_getValue === 'function') {
      return GM_getValue(key, defaultVal);
    }
    try {
      const val = localStorage.getItem(key);
      return val !== null ? val : defaultVal;
    } catch {
      return defaultVal;
    }
  }

  function setStorage(key, val) {
    if (typeof GM_setValue === 'function') {
      GM_setValue(key, val);
    }
    try {
      localStorage.setItem(key, String(val));
    } catch {}
  }

  let config = {
    apiUrl: getStorage(STORAGE_KEY_URL, DEFAULT_API_URL) || DEFAULT_API_URL,
    importToken: getStorage(STORAGE_KEY_TOKEN, '') || '',
    isMinimized: getStorage(STORAGE_KEY_MINIMIZED, 'false') === 'true',
  };

  // =========================================================================
  // 2. PARSING & EKSTRAKSI LOGIC (PURE & DEFENSIF)
  // =========================================================================
  const SHOPEE_API_REGEX =
    /\/api\/v[24]\/(?:shop\/(?:search_items|rcmd_items|get_shop_base)|(?:search\/)?search_items|pdp\/get_pc|item\/get|recommend\/recommend)/i;

  function isShopeeApiUrl(url) {
    if (!url || typeof url !== 'string') return false;
    return SHOPEE_API_REGEX.test(url);
  }

  function constructShopeeImageUrl(imgId) {
    if (!imgId || typeof imgId !== 'string') return null;
    const trimmed = imgId.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    return `https://down-id.img.susercontent.com/file/${trimmed}`;
  }

  function normalizeRawPrice(rawVal) {
    if (rawVal === null || rawVal === undefined) return null;
    if (typeof rawVal === 'number') {
      if (!Number.isFinite(rawVal) || rawVal < 0) return null;
      if (rawVal >= 1000000) return Math.round(rawVal);
      return Math.round(rawVal * 100000);
    }
    if (typeof rawVal === 'string') {
      const clean = rawVal.trim();
      if (/^\d+$/.test(clean)) {
        const n = Number(clean);
        if (Number.isFinite(n)) {
          return n >= 1000000 ? Math.round(n) : Math.round(n * 100000);
        }
      }
      const match = clean.match(/Rp\s*([\d.,]+)/i) || clean.match(/^([\d.,]+)$/);
      if (match) {
        const numPart = match[1].replace(/\./g, '').replace(/,/g, '.');
        const n = parseFloat(numPart);
        if (Number.isFinite(n) && n > 0) return Math.round(n * 100000);
      }
    }
    return null;
  }

  function parseVolumeAndSeries(title) {
    if (!title || typeof title !== 'string') return { series: null, volume: null };
    const clean = title.trim();
    const volMatch = clean.match(
      /(?:^|\s|[(\[])(?:vol(?:ume|\.|\s)?|buku|book|no\.?|#)\s*([0-9]{1,4})(?:$|\s|[)\]\-,:])/i
    );
    if (volMatch) {
      const volNum = parseInt(volMatch[1], 10);
      const beforeIndex = volMatch.index ?? 0;
      let seriesPart = clean.slice(0, beforeIndex).trim();
      seriesPart = seriesPart.replace(/^(?:komik|manga|novel|manhwa)\s+/i, '').trim();
      return {
        series: seriesPart.length > 0 ? seriesPart : null,
        volume: Number.isFinite(volNum) ? volNum : null,
      };
    }
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

  function detectPreOrder(raw, textHint = '') {
    if (!raw || typeof raw !== 'object') return false;
    if (raw.is_pre_order === true || raw.pre_order === true || raw.label_po === true) return true;
    const days = Number(raw.estimated_days ?? raw.shipping_days ?? 0);
    if (Number.isFinite(days) && days > 7) return true;
    const txt = `${String(raw.name ?? raw.title ?? '')} ${textHint}`.toLowerCase();
    return /\b(?:pre[\s-]?order|p\.?o\.?)\b/i.test(txt);
  }

  function extractProductItem(raw, fallbackShopId = null) {
    if (!raw || typeof raw !== 'object') return null;
    try {
      const item = (raw.item_basic && typeof raw.item_basic === 'object' ? raw.item_basic : raw);
      const rawItemId = item.itemid ?? item.item_id ?? raw.itemid ?? raw.item_id;
      const rawShopId = item.shopid ?? item.shop_id ?? raw.shopid ?? raw.shop_id ?? fallbackShopId;
      if (!rawItemId || !rawShopId) return null;

      const itemid = String(rawItemId).trim();
      const shopid = String(rawShopId).trim();
      if (!itemid || !shopid) return null;

      const rawName = item.name ?? item.title ?? item.item_name ?? raw.name ?? raw.title;
      const nama = rawName ? String(rawName).trim() : '';
      if (!nama) return null;

      const rawPrice = item.price ?? item.price_min ?? item.price_before_discount ?? raw.price ?? raw.harga_raw;
      const harga_raw = normalizeRawPrice(rawPrice);
      const label_po = detectPreOrder(item);

      const imgId = item.image ?? (Array.isArray(item.images) ? item.images[0] : null) ?? raw.image;
      const thumbnail = constructShopeeImageUrl(imgId);
      const url = `https://shopee.co.id/product/${shopid}/${itemid}`;

      let nama_toko = null;
      if (item.shop_name) nama_toko = String(item.shop_name).trim();
      else if (item.shop_info && item.shop_info.shop_name) nama_toko = String(item.shop_info.shop_name).trim();

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
      return null;
    }
  }

  function extractProductsFromPayload(payload, currentUrl = '') {
    if (!payload || typeof payload !== 'object') return [];
    const results = [];
    let fallbackShopId = null;

    const shopMatch = currentUrl.match(/\/shop\/(\d+)/i) || currentUrl.match(/[?&]shop_id=(\d+)/i);
    if (shopMatch) fallbackShopId = shopMatch[1];

    function add(prod) {
      if (prod && !results.some((r) => r.shopid === prod.shopid && r.itemid === prod.itemid)) {
        results.push(prod);
      }
    }

    try {
      const dataObj = payload.data && typeof payload.data === 'object' ? payload.data : null;

      if (dataObj && Array.isArray(dataObj.items)) {
        for (const it of dataObj.items) add(extractProductItem(it, fallbackShopId));
      }
      if (dataObj && dataObj.item && typeof dataObj.item === 'object') {
        add(extractProductItem(dataObj.item, fallbackShopId));
      }
      if (dataObj && Array.isArray(dataObj.sections)) {
        for (const sec of dataObj.sections) {
          if (sec && sec.data && Array.isArray(sec.data.item)) {
            for (const it of sec.data.item) add(extractProductItem(it, fallbackShopId));
          }
        }
      }
      if (Array.isArray(payload.items)) {
        for (const it of payload.items) add(extractProductItem(it, fallbackShopId));
      }
      if (payload.item && typeof payload.item === 'object') {
        add(extractProductItem(payload.item, fallbackShopId));
      }
      if (Array.isArray(payload)) {
        for (const it of payload) add(extractProductItem(it, fallbackShopId));
      }
    } catch {}

    return results;
  }

  // =========================================================================
  // 3. INTERSEPSI JARINGAN (FETCH & XHR)
  // =========================================================================
  const detectedProducts = new Map(); // key: `${shopid}:${itemid}` -> product

  function registerProducts(products) {
    if (!products || !products.length) return;
    let addedCount = 0;
    for (const p of products) {
      const key = `${p.shopid}:${p.itemid}`;
      if (!detectedProducts.has(key)) {
        detectedProducts.set(key, p);
        selectedKeys.add(key);
        addedCount++;
      } else {
        // Update data jika ada penambahan informasi baru
        const existing = detectedProducts.get(key);
        detectedProducts.set(key, { ...existing, ...p });
      }
    }
    if (addedCount > 0) {
      renderPanel();
    }
  }

  function handleNetworkResponse(url, data) {
    try {
      if (isShopeeApiUrl(url)) {
        const items = extractProductsFromPayload(data, url);
        if (items && items.length > 0) {
          registerProducts(items);
        }
      }
    } catch {
      // Defensive: jangan sampai logging memecah halaman
    }
  }

  // Hook unsafeWindow (Tampermonkey context)
  const targetWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

  if (targetWindow) {
    // 1. Hook Fetch
    const origFetch = targetWindow.fetch;
    if (typeof origFetch === 'function') {
      targetWindow.fetch = async function (...args) {
        const response = await origFetch.apply(this, args);
        try {
          const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');
          if (isShopeeApiUrl(url)) {
            const clone = response.clone();
            clone.json().then((json) => handleNetworkResponse(url, json)).catch(() => {});
          }
        } catch {}
        return response;
      };
    }

    // 2. Hook XMLHttpRequest
    const origOpen = targetWindow.XMLHttpRequest?.prototype?.open;
    const origSend = targetWindow.XMLHttpRequest?.prototype?.send;
    if (origOpen && origSend) {
      targetWindow.XMLHttpRequest.prototype.open = function (method, url, ...rest) {
        this._cp_url = typeof url === 'string' ? url : String(url || '');
        return origOpen.call(this, method, url, ...rest);
      };
      targetWindow.XMLHttpRequest.prototype.send = function (...args) {
        this.addEventListener('load', function () {
          try {
            if (this._cp_url && isShopeeApiUrl(this._cp_url)) {
              const parsed = JSON.parse(this.responseText);
              handleNetworkResponse(this._cp_url, parsed);
            }
          } catch {}
        });
        return origSend.apply(this, args);
      };
    }
  }

  // Listener untuk event antar-konteks (bila script injeksi berjalan)
  window.addEventListener('comicplan:shopee-data', (ev) => {
    try {
      const detail = ev.detail;
      if (detail && detail.url && detail.data) {
        handleNetworkResponse(detail.url, detail.data);
      }
    } catch {}
  });

  // =========================================================================
  // 4. FALLBACK EKSTRAKSI DARI HALAMAN PRODUK (DOM)
  // =========================================================================
  function extractCurrentProductPageDom() {
    try {
      const url = window.location.href;
      const prodSlash = url.match(/\/product\/(\d+)\/(\d+)/i);
      const prodDash = url.match(/-i\.(\d+)\.(\d+)/i);
      const shopid = prodSlash ? prodSlash[1] : (prodDash ? prodDash[1] : null);
      const itemid = prodSlash ? prodSlash[2] : (prodDash ? prodDash[2] : null);

      if (!shopid || !itemid) return null;

      // Ambil nama dari title atau DOM
      let nama = '';
      const titleMeta = document.querySelector('meta[property="og:title"]');
      if (titleMeta && titleMeta.content) {
        nama = titleMeta.content.replace(/\s*\|\s*Shopee Indonesia$/i, '').trim();
      }
      if (!nama) {
        const h1 = document.querySelector('h1') || document.querySelector('.qaNIZv');
        if (h1 && h1.innerText) nama = h1.innerText.trim();
      }
      if (!nama) {
        nama = document.title.replace(/\s*\|\s*Shopee Indonesia$/i, '').trim();
      }

      // Ambil harga dari meta / DOM
      let rawPrice = null;
      const priceMeta = document.querySelector('meta[property="product:price:amount"]');
      if (priceMeta && priceMeta.content) {
        rawPrice = normalizeRawPrice(priceMeta.content);
      }
      if (!rawPrice) {
        // Cari elemen dengan teks "Rp..."
        const priceEls = document.querySelectorAll('div, span');
        for (const el of priceEls) {
          if (el.children.length === 0 && /^Rp\s*[\d.,]+/i.test(el.innerText || '')) {
            rawPrice = normalizeRawPrice(el.innerText);
            if (rawPrice) break;
          }
        }
      }

      // Thumbnail
      let thumbnail = null;
      const imgMeta = document.querySelector('meta[property="og:image"]');
      if (imgMeta && imgMeta.content) thumbnail = imgMeta.content;

      // Status PO
      const isPo = /\b(?:pre[\s-]?order|dikirim dalam \d+ hari)\b/i.test(document.body.innerText || '');

      const { series, volume } = parseVolumeAndSeries(nama);

      return {
        itemid,
        shopid,
        nama,
        harga_raw: rawPrice,
        label_po: isPo,
        deadline_po: null,
        tanggal_rilis: null,
        thumbnail,
        url: `https://shopee.co.id/product/${shopid}/${itemid}`,
        nama_toko: null,
        seri: series,
        volume,
      };
    } catch {
      return null;
    }
  }

  // =========================================================================
  // 5. UI PANEL: FLOATING GLASS PANEL & FAB (PRD F5 & UI DESIGN §6.9)
  // =========================================================================
  let rootContainer = null;
  const selectedKeys = new Set();
  let filterOnlyPo = false;
  let isViewSettings = false;
  let statusNotice = { type: 'info', text: 'Menunggu produk terdeteksi...' };
  let isSyncing = false;

  function formatDisplayRupiah(hargaRaw) {
    if (!hargaRaw) return 'Rp 0';
    const idr = Math.round(hargaRaw / 100000);
    return 'Rp ' + idr.toLocaleString('id-ID');
  }

  function createStyleSheet() {
    if (document.getElementById('comicplan-styles')) return;
    const style = document.createElement('style');
    style.id = 'comicplan-styles';
    style.textContent = `
      #cp-panel-root {
        position: fixed;
        bottom: 16px;
        right: 16px;
        z-index: 2147483647;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        font-size: 13px;
        line-height: 1.4;
        color: #0f172a;
        box-sizing: border-box;
      }
      #cp-panel-root * {
        box-sizing: border-box;
      }
      /* FAB Bulat 56px saat minimize */
      .cp-fab {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 16px;
        cursor: pointer;
        box-shadow: 0 10px 25px -5px rgba(79, 70, 229, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        border: 2px solid rgba(255, 255, 255, 0.8);
        transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s;
        position: relative;
        user-select: none;
      }
      .cp-fab:hover {
        transform: scale(1.06);
        box-shadow: 0 14px 28px -4px rgba(79, 70, 229, 0.6);
      }
      .cp-fab-badge {
        position: absolute;
        top: -4px;
        right: -4px;
        background: #ef4444;
        color: #ffffff;
        font-size: 11px;
        font-weight: 700;
        padding: 2px 6px;
        border-radius: 10px;
        border: 2px solid #ffffff;
      }
      /* Glass Container */
      .cp-card {
        width: 330px;
        max-width: calc(100vw - 32px);
        background: rgba(255, 255, 255, 0.88);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.65);
        border-radius: 16px;
        box-shadow: 0 20px 30px -10px rgba(0, 0, 0, 0.12), 0 8px 12px -4px rgba(0, 0, 0, 0.06);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        animation: cp-slide-up 0.2s ease-out;
      }
      @keyframes cp-slide-up {
        from { opacity: 0; transform: translateY(12px) scale(0.98); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      /* Header */
      .cp-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 14px;
        background: rgba(255, 255, 255, 0.5);
        border-bottom: 1px solid rgba(226, 232, 240, 0.8);
      }
      .cp-header-title {
        display: flex;
        align-items: center;
        gap: 6px;
        font-weight: 700;
        font-size: 14px;
        color: #1e1b4b;
      }
      .cp-header-badge {
        background: #e0e7ff;
        color: #4338ca;
        font-size: 11px;
        font-weight: 600;
        padding: 2px 7px;
        border-radius: 12px;
      }
      .cp-header-actions {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .cp-btn-icon {
        background: none;
        border: none;
        padding: 4px 6px;
        border-radius: 6px;
        cursor: pointer;
        color: #64748b;
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.15s, color 0.15s;
      }
      .cp-btn-icon:hover {
        background: rgba(241, 245, 249, 0.8);
        color: #0f172a;
      }
      /* Toolbar */
      .cp-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 14px;
        background: rgba(248, 250, 252, 0.7);
        border-bottom: 1px solid rgba(226, 232, 240, 0.6);
        font-size: 12px;
      }
      .cp-checkbox-label {
        display: flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        user-select: none;
        color: #475569;
      }
      /* Product List */
      .cp-list {
        max-height: 250px;
        overflow-y: auto;
        padding: 6px 10px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .cp-list::-webkit-scrollbar {
        width: 5px;
      }
      .cp-list::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 4px;
      }
      .cp-empty {
        padding: 24px 12px;
        text-align: center;
        color: #94a3b8;
        font-size: 12px;
      }
      .cp-item-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 8px;
        background: rgba(255, 255, 255, 0.75);
        border: 1px solid rgba(241, 245, 249, 0.9);
        border-radius: 10px;
        transition: background 0.15s;
      }
      .cp-item-row:hover {
        background: #ffffff;
      }
      .cp-item-thumb {
        width: 34px;
        height: 34px;
        border-radius: 6px;
        object-fit: cover;
        background: #e2e8f0;
        flex-shrink: 0;
      }
      .cp-item-info {
        flex: 1;
        min-width: 0;
      }
      .cp-item-title {
        font-size: 12px;
        font-weight: 500;
        color: #1e293b;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .cp-item-meta {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 2px;
        font-size: 11px;
      }
      .cp-item-price {
        font-weight: 600;
        color: #047857;
        font-variant-numeric: tabular-nums;
      }
      .cp-pill-po {
        background: #fef3c7;
        color: #b45309;
        font-size: 10px;
        font-weight: 700;
        padding: 1px 5px;
        border-radius: 4px;
      }
      .cp-pill-vol {
        background: #f1f5f9;
        color: #475569;
        font-size: 10px;
        padding: 1px 4px;
        border-radius: 4px;
      }
      /* Quick single PDP banner */
      .cp-pdp-banner {
        margin: 6px 10px 0;
        padding: 8px 10px;
        background: #eef2ff;
        border: 1px dashed #a5b4fc;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .cp-pdp-btn {
        background: #4f46e5;
        color: #ffffff;
        border: none;
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
      }
      /* Status Toast / Bar */
      .cp-status {
        padding: 6px 12px;
        font-size: 11px;
        text-align: center;
        border-top: 1px solid rgba(226, 232, 240, 0.6);
        background: rgba(248, 250, 252, 0.6);
      }
      .cp-status-success {
        color: #059669;
        font-weight: 600;
      }
      .cp-status-error {
        color: #dc2626;
        font-weight: 600;
      }
      .cp-status-info {
        color: #64748b;
      }
      /* Footer */
      .cp-footer {
        padding: 10px 14px 14px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .cp-btn-sync {
        width: 100%;
        background: #4f46e5;
        color: #ffffff;
        border: none;
        padding: 9px 12px;
        border-radius: 10px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.15s, transform 0.1s;
        box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);
      }
      .cp-btn-sync:hover:not(:disabled) {
        background: #4338ca;
      }
      .cp-btn-sync:active:not(:disabled) {
        transform: scale(0.98);
      }
      .cp-btn-sync:disabled {
        background: #94a3b8;
        cursor: not-allowed;
        box-shadow: none;
      }
      /* Settings View */
      .cp-settings {
        padding: 14px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .cp-field {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .cp-label {
        font-size: 11px;
        font-weight: 600;
        color: #475569;
      }
      .cp-input {
        width: 100%;
        padding: 8px 10px;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        font-size: 12px;
        outline: none;
        background: #ffffff;
      }
      .cp-input:focus {
        border-color: #4f46e5;
        box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.15);
      }
    `;
    const target = document.head || document.documentElement;
    if (target) {
      target.appendChild(style);
    }
  }

  function getVisibleProducts() {
    let list = Array.from(detectedProducts.values());
    if (filterOnlyPo) {
      list = list.filter((p) => p.label_po);
    }
    return list;
  }

  function renderPanel() {
    if (!document.body) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => renderPanel(), { once: true });
      }
      return;
    }

    createStyleSheet();

    if (!rootContainer) {
      rootContainer = document.createElement('div');
      rootContainer.id = 'cp-panel-root';
    }

    if (!document.body.contains(rootContainer)) {
      document.body.appendChild(rootContainer);
    }

    const totalCount = detectedProducts.size;
    const currentPdp = extractCurrentProductPageDom();

    // Mode Minimized: Tampilkan FAB Bulat 56px
    if (config.isMinimized) {
      rootContainer.innerHTML = `
        <div class="cp-fab" id="cp-fab-btn" title="ComicPlan Sync">
          CP
          ${totalCount > 0 ? `<div class="cp-fab-badge">${totalCount}</div>` : ''}
        </div>
      `;
      document.getElementById('cp-fab-btn')?.addEventListener('click', () => {
        config.isMinimized = false;
        setStorage(STORAGE_KEY_MINIMIZED, 'false');
        renderPanel();
      });
      return;
    }

    // Mode Settings View
    if (isViewSettings) {
      rootContainer.innerHTML = `
        <div class="cp-card">
          <div class="cp-header">
            <div class="cp-header-title">⚙️ Pengaturan ComicPlan</div>
            <button class="cp-btn-icon" id="cp-close-settings" title="Tutup">✕</button>
          </div>
          <div class="cp-settings">
            <div class="cp-field">
              <label class="cp-label">Endpoint URL (/api/import)</label>
              <input class="cp-input" id="cp-input-url" type="text" value="${config.apiUrl}" placeholder="http://localhost:3000/api/import" />
            </div>
            <div class="cp-field">
              <label class="cp-label">Import Token (X-Import-Token)</label>
              <input class="cp-input" id="cp-input-token" type="password" value="${config.importToken}" placeholder="Token rahasia server" />
            </div>
            <p style="font-size:11px;color:#64748b;margin:0;">
              Token harus sama persis dengan variabel <code>IMPORT_TOKEN</code> di konfigurasi server ComicPlan Anda.
            </p>
            <button class="cp-btn-sync" id="cp-save-settings">Simpan Pengaturan</button>
          </div>
        </div>
      `;

      document.getElementById('cp-close-settings')?.addEventListener('click', () => {
        isViewSettings = false;
        renderPanel();
      });

      document.getElementById('cp-save-settings')?.addEventListener('click', () => {
        const urlInput = document.getElementById('cp-input-url');
        const tokenInput = document.getElementById('cp-input-token');
        config.apiUrl = (urlInput?.value || DEFAULT_API_URL).trim();
        config.importToken = (tokenInput?.value || '').trim();
        setStorage(STORAGE_KEY_URL, config.apiUrl);
        setStorage(STORAGE_KEY_TOKEN, config.importToken);
        isViewSettings = false;
        statusNotice = { type: 'success', text: 'Pengaturan tersimpan.' };
        renderPanel();
      });
      return;
    }

    // Mode Normal List View
    const visibleProducts = getVisibleProducts();
    const selectedCount = visibleProducts.filter((p) =>
      selectedKeys.has(`${p.shopid}:${p.itemid}`)
    ).length;
    const isAllSelected = visibleProducts.length > 0 && selectedCount === visibleProducts.length;

    let itemsHtml = '';
    if (visibleProducts.length === 0) {
      itemsHtml = `
        <div class="cp-empty">
          Belum ada produk terdeteksi.<br/>
          Jelajahi etalase toko Shopee untuk mendeteksi komik secara otomatis.
        </div>
      `;
    } else {
      itemsHtml = visibleProducts
        .map((p) => {
          const key = `${p.shopid}:${p.itemid}`;
          const isChecked = selectedKeys.has(key) ? 'checked' : '';
          const thumbSrc =
            p.thumbnail ||
            'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" fill="%23cbd5e1"><rect width="24" height="24" rx="4"/></svg>';
          return `
            <div class="cp-item-row">
              <input type="checkbox" class="cp-item-check" data-key="${key}" ${isChecked} />
              <img class="cp-item-thumb" src="${thumbSrc}" alt="" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'34\\' height=\\'34\\' fill=\\'%23cbd5e1\\'><rect width=\\'24\\' height=\\'24\\'/></svg>'" />
              <div class="cp-item-info">
                <div class="cp-item-title" title="${p.nama}">${p.nama}</div>
                <div class="cp-item-meta">
                  <span class="cp-item-price">${formatDisplayRupiah(p.harga_raw)}</span>
                  ${p.label_po ? '<span class="cp-pill-po">PO</span>' : ''}
                  ${p.volume ? `<span class="cp-pill-vol">Vol ${p.volume}</span>` : ''}
                </div>
              </div>
            </div>
          `;
        })
        .join('');
    }

    // Single PDP banner bila di halaman detail
    let pdpBannerHtml = '';
    if (currentPdp) {
      pdpBannerHtml = `
        <div class="cp-pdp-banner">
          <span style="font-size:11px;font-weight:600;color:#3730a3;">⚡ Produk Halaman Ini</span>
          <button class="cp-pdp-btn" id="cp-single-sync-btn">Impor Satuan</button>
        </div>
      `;
    }

    rootContainer.innerHTML = `
      <div class="cp-card">
        <div class="cp-header">
          <div class="cp-header-title">
            <span>ComicPlan Sync</span>
            <span class="cp-header-badge">${totalCount} item</span>
          </div>
          <div class="cp-header-actions">
            <button class="cp-btn-icon" id="cp-btn-settings" title="Pengaturan">⚙️</button>
            <button class="cp-btn-icon" id="cp-btn-minimize" title="Perkecil">─</button>
          </div>
        </div>

        <div class="cp-toolbar">
          <label class="cp-checkbox-label">
            <input type="checkbox" id="cp-select-all" ${isAllSelected ? 'checked' : ''} />
            <span>Pilih Semua</span>
          </label>
          <label class="cp-checkbox-label">
            <input type="checkbox" id="cp-filter-po" ${filterOnlyPo ? 'checked' : ''} />
            <span>Hanya PO</span>
          </label>
          <button class="cp-btn-icon" id="cp-clear-all" title="Hapus Daftar">🗑️</button>
        </div>

        ${pdpBannerHtml}

        <div class="cp-list" id="cp-items-container">
          ${itemsHtml}
        </div>

        <div class="cp-status ${
          statusNotice.type === 'success'
            ? 'cp-status-success'
            : statusNotice.type === 'error'
            ? 'cp-status-error'
            : 'cp-status-info'
        }">
          ${statusNotice.text}
        </div>

        <div class="cp-footer">
          <button class="cp-btn-sync" id="cp-btn-sync" ${selectedCount === 0 || isSyncing ? 'disabled' : ''}>
            ${isSyncing ? 'Menyinkronkan...' : `Sync ke ComicPlan (${selectedCount} item)`}
          </button>
        </div>
      </div>
    `;

    // Pasang Event Listeners
    document.getElementById('cp-btn-minimize')?.addEventListener('click', () => {
      config.isMinimized = true;
      setStorage(STORAGE_KEY_MINIMIZED, 'true');
      renderPanel();
    });

    document.getElementById('cp-btn-settings')?.addEventListener('click', () => {
      isViewSettings = true;
      renderPanel();
    });

    document.getElementById('cp-select-all')?.addEventListener('change', (e) => {
      const checked = e.target.checked;
      for (const p of visibleProducts) {
        const key = `${p.shopid}:${p.itemid}`;
        if (checked) selectedKeys.add(key);
        else selectedKeys.delete(key);
      }
      renderPanel();
    });

    document.getElementById('cp-filter-po')?.addEventListener('change', (e) => {
      filterOnlyPo = e.target.checked;
      renderPanel();
    });

    document.getElementById('cp-clear-all')?.addEventListener('click', () => {
      detectedProducts.clear();
      selectedKeys.clear();
      statusNotice = { type: 'info', text: 'Daftar produk dibersihkan.' };
      renderPanel();
    });

    // Checkbox per item
    const checkInputs = rootContainer.querySelectorAll('.cp-item-check');
    checkInputs.forEach((chk) => {
      chk.addEventListener('change', (e) => {
        const key = e.target.getAttribute('data-key');
        if (e.target.checked) selectedKeys.add(key);
        else selectedKeys.delete(key);
        renderPanel();
      });
    });

    // Single PDP sync
    document.getElementById('cp-single-sync-btn')?.addEventListener('click', () => {
      if (currentPdp) {
        doSync([currentPdp]);
      }
    });

    // Sync button
    document.getElementById('cp-btn-sync')?.addEventListener('click', () => {
      const toSend = [];
      for (const p of visibleProducts) {
        if (selectedKeys.has(`${p.shopid}:${p.itemid}`)) {
          toSend.push(p);
        }
      }
      if (toSend.length > 0) {
        doSync(toSend);
      }
    });
  }

  // =========================================================================
  // 6. SYNC KE COMICPLAN (/api/import DENGAN X-Import-Token)
  // =========================================================================
  async function doSync(itemsToSync) {
    if (!config.importToken) {
      statusNotice = {
        type: 'error',
        text: 'Import token belum diisi! Buka pengaturan ⚙️ untuk memasukkan token.',
      };
      isViewSettings = true;
      renderPanel();
      return;
    }

    isSyncing = true;
    statusNotice = { type: 'info', text: `Mengirim ${itemsToSync.length} produk ke server...` };
    renderPanel();

    const payload = JSON.stringify({ items: itemsToSync });

    const handleSuccess = (resText) => {
      isSyncing = false;
      try {
        const res = JSON.parse(resText);
        const created = res.created ?? 0;
        const updated = res.updated ?? 0;
        statusNotice = {
          type: 'success',
          text: `✅ ${created} dibuat · ${updated} diperbarui`,
        };
      } catch {
        statusNotice = {
          type: 'success',
          text: '✅ Berhasil disinkronisasi ke server!',
        };
      }
      renderPanel();
    };

    const handleError = (errMsg) => {
      isSyncing = false;
      statusNotice = {
        type: 'error',
        text: `❌ ${errMsg}`,
      };
      renderPanel();
    };

    // Gunakan GM_xmlhttpRequest bila tersedia (bypass CORS browser)
    if (typeof GM_xmlhttpRequest === 'function') {
      GM_xmlhttpRequest({
        method: 'POST',
        url: config.apiUrl,
        headers: {
          'Content-Type': 'application/json',
          'X-Import-Token': config.importToken,
        },
        data: payload,
        onload: function (resp) {
          if (resp.status >= 200 && resp.status < 300) {
            handleSuccess(resp.responseText);
          } else if (resp.status === 403) {
            handleError('Token salah / ditolak oleh server (403)');
          } else {
            let msg = `Gagal (${resp.status})`;
            try {
              const body = JSON.parse(resp.responseText);
              if (body.error) msg = body.error;
            } catch {}
            handleError(msg);
          }
        },
        onerror: function () {
          handleError(`Gagal terhubung ke ComicPlan server (${config.apiUrl})`);
        },
      });
      return;
    }

    // Fallback: Fetch biasa
    try {
      const resp = await fetch(config.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Import-Token': config.importToken,
        },
        body: payload,
      });

      if (resp.ok) {
        const text = await resp.text();
        handleSuccess(text);
      } else if (resp.status === 403) {
        handleError('Token salah / ditolak oleh server (403)');
      } else {
        const errJson = await resp.json().catch(() => null);
        handleError(errJson?.error || `Gagal (${resp.status})`);
      }
    } catch {
      handleError(`Koneksi error: pastikan server ComicPlan aktif di ${config.apiUrl}`);
    }
  }

  // =========================================================================
  // 7. INISIALISASI & OBSERVER
  // =========================================================================
  function init() {
    console.log('[ComicPlan] Userscript diinisialisasi pada:', window.location.href);

    const safeMount = () => {
      renderPanel();
      checkPdpOnLoad();
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', safeMount);
    } else {
      safeMount();
    }

    window.addEventListener('load', safeMount);

    // Pastikan panel tetap terpasang bila SPA Shopee melakukan hydrate / re-render
    setInterval(() => {
      if (document.body && rootContainer && !document.body.contains(rootContainer)) {
        document.body.appendChild(rootContainer);
      }
    }, 2000);

    // Pantau perubahan URL pada Single Page Application (SPA)
    let lastUrl = window.location.href;
    const urlObserver = new MutationObserver(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        checkPdpOnLoad();
        renderPanel();
      }
    });
    urlObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  function checkPdpOnLoad() {
    // Beri jeda sejenak agar DOM Shopee terhidrasi
    setTimeout(() => {
      const pdpItem = extractCurrentProductPageDom();
      if (pdpItem) {
        registerProducts([pdpItem]);
      }
    }, 1500);
  }

  // Daftarkan menu Tampermonkey
  if (typeof GM_registerMenuCommand === 'function') {
    GM_registerMenuCommand('⚙️ Konfigurasi ComicPlan Token', () => {
      isViewSettings = true;
      config.isMinimized = false;
      renderPanel();
    });
    GM_registerMenuCommand('🔄 Buka Panel ComicPlan', () => {
      config.isMinimized = false;
      renderPanel();
    });
  }

  init();
})();
