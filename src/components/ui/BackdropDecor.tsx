import React from 'react';

/** Latar halaman: kertas putih polos, tanpa ornamen. */
export function BackdropDecor() {
  return <div className="fixed inset-0 -z-10 pointer-events-none bg-white" aria-hidden="true" />;
}
