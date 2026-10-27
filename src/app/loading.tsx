import React from 'react';

export default function GlobalLoading() {
  return (
    <div
      role="status"
      aria-label="Memuat halaman"
      className="fixed top-0 left-0 right-0 z-[100] h-[3px] overflow-hidden"
    >
      <div className="h-full w-4/5 yt-indeterminate-bar yt-loading-bar-glow transition-all duration-300" />
    </div>
  );
}
