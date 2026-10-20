/**
 * Sinkronkan state filter ke query string URL via `history.replaceState`
 * supaya refresh dan navigasi Back mempertahankan filter tanpa memicu
 * network request baru di tiap ketikan.
 */
export function replaceQueryParams(params: Record<string, string | null | undefined>): void {
  if (typeof window === 'undefined') return;

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const trimmed = value?.trim();
    if (trimmed && trimmed !== 'semua' && trimmed !== 'terbaru') {
      searchParams.set(key, trimmed);
    }
  }

  const qs = searchParams.toString();
  const nextUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
  window.history.replaceState(null, '', nextUrl);
}
