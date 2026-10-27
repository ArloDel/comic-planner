-- Migration: Sederhanakan Workflow Pesanan (Wishlist -> Sedang Dikirim -> Selesai)
-- Branch: feature/order-tracking
--
-- Alur baru yang disederhanakan:
-- 1. wishlist (Keranjang incaran)
-- 2. po (Sedang Dikirim / Lacak Resi Ekspedisi)
-- 3. diterima (Selesai / Barang Diterima & Verifikasi Foto)

create or replace function public.plan_status_transition_allowed(p_from text, p_to text)
returns boolean as $$
begin
  -- Status tidak berubah: selalu boleh (update kolom lain).
  if p_from is not distinct from p_to then
    return true;
  end if;

  -- Batal tersedia dari setiap status aktif; `diterima` dan `batal` terminal.
  if p_to = 'batal' then
    return p_from in ('wishlist', 'po', 'dp', 'lunas');
  end if;

  -- Jalur utama yang disederhanakan:
  -- wishlist -> po (Sedang Dikirim) -> diterima (Selesai)
  -- Tetap mendukung transisi legacy (dp, lunas) agar kompatibel penuh dengan data lama.
  return case p_from
    when 'wishlist' then p_to in ('po', 'lunas')
    when 'po' then p_to in ('diterima', 'lunas', 'dp')
    when 'dp' then p_to in ('diterima', 'lunas')
    when 'lunas' then p_to = 'diterima'
    else false
  end;
end;
$$ language plpgsql immutable;
