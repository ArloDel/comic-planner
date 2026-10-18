export interface TrackedShopSummary {
  shop_id: string;
  nama_toko: string | null;
  total_listings: number;
  po_count: number;
  last_synced_at: string;
}

export interface ShopListingInput {
  shop_id: string;
  nama_toko: string | null;
  status: string;
  updated_at: string;
}

export function maskSecretToken(token: string | null | undefined): string | null {
  const trimmed = token?.trim();
  if (!trimmed) return null;
  if (trimmed.length <= 4) return '••••';
  return `••••••••${trimmed.slice(-4)}`;
}

export function summarizeTrackedShops(rows: readonly ShopListingInput[]): TrackedShopSummary[] {
  const shopMap = new Map<string, TrackedShopSummary>();

  for (const row of rows) {
    const existing = shopMap.get(row.shop_id);
    if (!existing) {
      shopMap.set(row.shop_id, {
        shop_id: row.shop_id,
        nama_toko: row.nama_toko,
        total_listings: 1,
        po_count: row.status === 'po' ? 1 : 0,
        last_synced_at: row.updated_at,
      });
    } else {
      existing.total_listings += 1;
      if (row.status === 'po') existing.po_count += 1;
      if (!existing.nama_toko && row.nama_toko) existing.nama_toko = row.nama_toko;
      if (row.updated_at > existing.last_synced_at) {
        existing.last_synced_at = row.updated_at;
      }
    }
  }

  return Array.from(shopMap.values());
}

export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv(rows: readonly Record<string, unknown>[], columns: readonly string[]): string {
  const header = columns.join(',');
  const lines = rows.map((row) => columns.map((col) => escapeCsvCell(row[col])).join(','));
  return [header, ...lines].join('\r\n');
}
