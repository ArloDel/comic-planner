/**
 * Integrasi API Pelacakan Resi Ekspedisi via Binderbyte API (v1).
 *
 * Mendukung kurir populer di Indonesia: J&T, Shopee Express (SPX),
 * JNE, SiCepat, Anteraja, Pos Indonesia, TIKI, Wahana, Ninja, Lion Parcel, ID Express.
 *
 * Menyediakan mode Mock/Sandbox otomatis untuk pengujian tanpa perlu API key.
 * Dilengkapi in-memory cache TTL untuk mencegah pemanggilan berulang ke Binderbyte API.
 */

export interface CourierOption {
  code: string;
  name: string;
}

export const COURIER_OPTIONS: CourierOption[] = [
  { code: 'spx', name: 'Shopee Express (SPX)' },
  { code: 'jnt', name: 'J&T Express' },
  { code: 'jne', name: 'JNE Express' },
  { code: 'sicepat', name: 'SiCepat Ekspres' },
  { code: 'anteraja', name: 'Anteraja' },
  { code: 'pos', name: 'Pos Indonesia' },
  { code: 'tiki', name: 'TIKI' },
  { code: 'ninja', name: 'Ninja Xpress' },
  { code: 'lion', name: 'Lion Parcel' },
  { code: 'ide', name: 'ID Express' },
  { code: 'wahana', name: 'Wahana Prestasi Logistik' },
  { code: 'jnt_cargo', name: 'J&T Cargo' },
];

export interface TrackingCheckpoint {
  date: string;
  desc: string;
  location?: string | null;
}

export interface TrackingResult {
  success: boolean;
  courier: string;
  courierName: string;
  waybill: string;
  status: 'ON_PROCESS' | 'DELIVERED' | 'NOT_FOUND' | 'PENDING';
  statusText: string;
  origin?: string | null;
  destination?: string | null;
  shipper?: string | null;
  receiver?: string | null;
  history: TrackingCheckpoint[];
  isDelivered: boolean;
  isMock?: boolean;
  error?: string | null;
}

export interface TrackPackageOptions {
  courier: string;
  waybill: string;
  apiKey?: string | null;
  forceMockStatus?: 'ON_PROCESS' | 'DELIVERED' | null;
  bypassCache?: boolean;
}

// In-memory cache untuk hasil pelacakan resi real (TTL 10 menit untuk on_process, 24 jam untuk delivered)
interface CacheEntry {
  data: TrackingResult;
  expiresAt: number;
}
const trackingCache = new Map<string, CacheEntry>();

export function clearTrackingCache() {
  trackingCache.clear();
}

export function getCourierName(code: string): string {
  const found = COURIER_OPTIONS.find((c) => c.code.toLowerCase() === code.toLowerCase());
  return found ? found.name : code.toUpperCase();
}

/**
 * Buat data simulasi pengiriman yang realistis untuk kebutuhan prototipe/testing.
 */
export function generateMockTracking(
  courier: string,
  waybill: string,
  delivered = false
): TrackingResult {
  const courierName = getCourierName(courier);
  const now = new Date();
  const dateStr = now.toISOString().replace('T', ' ').slice(0, 19);
  const yesterdayStr = new Date(now.getTime() - 86400000).toISOString().replace('T', ' ').slice(0, 19);

  const history: TrackingCheckpoint[] = [
    {
      date: yesterdayStr,
      desc: `Pesanan telah diserahkan ke drop point kurir [${courierName} Hub Jakarta]`,
      location: 'Jakarta',
    },
    {
      date: new Date(now.getTime() - 43200000).toISOString().replace('T', ' ').slice(0, 19),
      desc: 'Paket sedang diberangkatkan ke kota tujuan [Sorting Center]',
      location: 'Transit Center',
    },
    {
      date: dateStr,
      desc: delivered
        ? 'Paket telah berhasil diterima oleh yang bersangkutan / di alamat tujuan [DELIVERED]'
        : 'Paket sedang dibawa oleh kurir menuju alamat pengantaran [WITH DELIVERY COURIER]',
      location: 'Kota Tujuan',
    },
  ];

  return {
    success: true,
    courier,
    courierName,
    waybill,
    status: delivered ? 'DELIVERED' : 'ON_PROCESS',
    statusText: delivered ? 'Telah Diterima (Delivered)' : 'Sedang Dikirim (On Process)',
    origin: 'Jakarta',
    destination: 'Kota Tujuan',
    shipper: 'Toko Komik Shopee',
    receiver: 'Pemilik (ComicPlan)',
    history,
    isDelivered: delivered,
    isMock: true,
  };
}

/**
 * Lacak paket resi via API Binderbyte (atau mock sandbox bila API key belum diset).
 */
export async function trackPackageBinderbyte({
  courier,
  waybill,
  apiKey,
  forceMockStatus,
  bypassCache = false,
}: TrackPackageOptions): Promise<TrackingResult> {
  const cleanCourier = courier.trim().toLowerCase();
  const cleanWaybill = waybill.trim();

  if (!cleanCourier || !cleanWaybill) {
    return {
      success: false,
      courier: cleanCourier,
      courierName: getCourierName(cleanCourier),
      waybill: cleanWaybill,
      status: 'NOT_FOUND',
      statusText: 'Kurir atau nomor resi kosong',
      history: [],
      isDelivered: false,
      error: 'Kurir dan nomor resi wajib diisi',
    };
  }

  // Jika dipaksa simulasi atau nomor waybill diawali "DELIV", "MOCK", atau "SANDBOX"
  if (
    forceMockStatus ||
    cleanWaybill.toUpperCase().startsWith('DELIV') ||
    cleanWaybill.toUpperCase().startsWith('MOCK') ||
    cleanWaybill.toUpperCase().startsWith('SANDBOX')
  ) {
    const isDeliv = forceMockStatus ? forceMockStatus === 'DELIVERED' : cleanWaybill.toUpperCase().startsWith('DELIV');
    return generateMockTracking(cleanCourier, cleanWaybill, isDeliv);
  }

  // Cek cache terlebih dahulu jika tidak dipaksa bypass
  const cacheKey = `${cleanCourier}:${cleanWaybill}`;
  if (!bypassCache) {
    const cached = trackingCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }
  }

  // Jika API key belum dikonfigurasi, beri tahu user secara eksplisit
  if (!apiKey) {
    return {
      success: false,
      courier: cleanCourier,
      courierName: getCourierName(cleanCourier),
      waybill: cleanWaybill,
      status: 'NOT_FOUND',
      statusText: 'API Key Binderbyte Belum Dikonfigurasi',
      history: [],
      isDelivered: false,
      error:
        'API Key Binderbyte belum aktif di server. Tambahkan BINDERBYTE_API_KEY di .env.local / Vercel Environment Variables, atau masukkan API Key pada modal pelacakan.',
    };
  }

  try {
    const binderCourier = cleanCourier === 'id' ? 'ide' : cleanCourier;
    const url = `https://api.binderbyte.com/v1/track?api_key=${encodeURIComponent(
      apiKey
    )}&courier=${encodeURIComponent(binderCourier)}&awb=${encodeURIComponent(cleanWaybill)}`;

    const response = await fetch(url, { method: 'GET', cache: 'no-store' });
    const data = await response.json();

    if (!response.ok || data.status !== 200) {
      return {
        success: false,
        courier: cleanCourier,
        courierName: getCourierName(cleanCourier),
        waybill: cleanWaybill,
        status: 'NOT_FOUND',
        statusText: data.message || 'Resi tidak ditemukan pada sistem kurir',
        history: [],
        isDelivered: false,
        error: data.message || `Error API HTTP ${response.status}`,
      };
    }

    const summary = data.data?.summary ?? {};
    const detail = data.data?.detail ?? {};
    const historyList = (data.data?.history ?? []) as Array<{ date?: string; desc?: string; location?: string }>;

    const rawStatus = String(summary.status ?? '').toUpperCase();
    const isDelivered = rawStatus === 'DELIVERED';

    const result: TrackingResult = {
      success: true,
      courier: cleanCourier,
      courierName: summary.courier || getCourierName(cleanCourier),
      waybill: summary.awb || summary.waybill_number || cleanWaybill,
      status: isDelivered ? 'DELIVERED' : 'ON_PROCESS',
      statusText: isDelivered ? 'Telah Diterima (Delivered)' : 'Sedang Dikirim (On Process)',
      origin: detail.origin || null,
      destination: detail.destination || null,
      shipper: detail.shipper || null,
      receiver: detail.receiver || null,
      history: historyList.map((h) => ({
        date: h.date ?? '',
        desc: h.desc ?? '',
        location: h.location ?? null,
      })),
      isDelivered,
      isMock: false,
    };

    // Simpan ke cache: paket yang sudah sampai (delivered) disimpan selama 24 jam, yang sedang jalan 10 menit
    const ttlMs = isDelivered ? 24 * 60 * 60 * 1000 : 10 * 60 * 1000;
    trackingCache.set(cacheKey, {
      data: result,
      expiresAt: Date.now() + ttlMs,
    });

    return result;
  } catch (err) {
    return {
      success: false,
      courier: cleanCourier,
      courierName: getCourierName(cleanCourier),
      waybill: cleanWaybill,
      status: 'NOT_FOUND',
      statusText: 'Gagal menghubungi server Binderbyte',
      history: [],
      isDelivered: false,
      error: err instanceof Error ? err.message : 'Kesalahan jaringan',
    };
  }
}
