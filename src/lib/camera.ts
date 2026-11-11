/**
 * Helper murni untuk fitur ambil foto via kamera (getUserMedia).
 * Dipisah dari komponen agar bisa diuji tanpa browser.
 */

export type CameraFacing = 'environment' | 'user';

/** Sisi terpanjang foto hasil jepretan, cukup jelas untuk bukti penerimaan. */
export const CAPTURE_MAX_SIDE = 1600;

/** Kualitas JPEG hasil jepretan (0..1). */
export const CAPTURE_JPEG_QUALITY = 0.85;

/**
 * Skala ukuran (lebar, tinggi) agar sisi terpanjang tidak melebihi `maxSide`,
 * dengan rasio aspek tetap. Ukuran yang sudah kecil tidak diperbesar.
 */
export function fitWithin(
  width: number,
  height: number,
  maxSide: number = CAPTURE_MAX_SIDE
): { width: number; height: number } {
  if (!(width > 0) || !(height > 0)) return { width: 0, height: 0 };
  const longest = Math.max(width, height);
  if (longest <= maxSide) return { width: Math.round(width), height: Math.round(height) };
  const scale = maxSide / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** Kamera depan ↔ belakang. */
export function nextFacing(current: CameraFacing): CameraFacing {
  return current === 'environment' ? 'user' : 'environment';
}

/**
 * Terjemahkan error getUserMedia menjadi pesan yang menjelaskan apa yang
 * terjadi dan apa yang bisa dilakukan pengguna.
 */
export function describeCameraError(error: unknown): string {
  const name =
    typeof error === 'object' && error !== null && 'name' in error
      ? String((error as { name: unknown }).name)
      : '';

  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return 'Akses kamera ditolak. Izinkan kamera untuk situs ini di pengaturan browser, atau pilih foto dari galeri.';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
      return 'Kamera tidak ditemukan di perangkat ini. Pilih foto dari galeri sebagai gantinya.';
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return 'Kamera sedang dipakai aplikasi lain. Tutup aplikasi tersebut lalu coba lagi.';
    case 'NotSupportedError':
    case 'TypeError':
      return 'Browser ini tidak mendukung akses kamera. Pilih foto dari galeri sebagai gantinya.';
    default:
      return 'Kamera tidak bisa dibuka. Coba lagi, atau pilih foto dari galeri.';
  }
}

/**
 * Cek apakah browser bisa membuka kamera langsung. getUserMedia hanya tersedia
 * di konteks aman (HTTPS atau localhost).
 */
export function isCameraSupported(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return Boolean(window.isSecureContext && navigator.mediaDevices?.getUserMedia);
}
