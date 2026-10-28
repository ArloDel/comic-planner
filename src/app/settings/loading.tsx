import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { GlassCard } from '@/components/ui/GlassCard';
import { Skeleton } from '@/components/ui/Skeleton';

export default function SettingsLoading() {
  return (
    <AppShell
      pageTitle="Pengaturan"
      pageSubtitle="Kelola akun pemilik, token impor, budget bulanan, toko Shopee, dan ekspor data"
    >
      <div className="space-y-6" role="status" aria-label="Memuat pengaturan">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <GlassCard key={i} className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-40 rounded-md" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
              <Skeleton className="h-4 w-3/4 rounded-md" />
              <Skeleton className="h-11 w-full rounded-xl" />
              <div className="flex justify-end">
                <Skeleton className="h-9 w-32 rounded-xl" />
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
