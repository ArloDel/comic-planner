'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  ListChecks,
  Wallet,
  Download,
  Settings,
  LogOut,
  MoreHorizontal,
  X,
} from 'lucide-react';
import { BackdropDecor } from '@/components/ui/BackdropDecor';
import { logout } from '@/app/auth/actions';

interface AppShellProps {
  children: React.ReactNode;
  userEmail?: string | null;
  pageTitle?: string;
  pageSubtitle?: string;
  headerAction?: React.ReactNode;
}

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/katalog', label: 'Katalog', icon: BookOpen },
  { href: '/plans', label: 'Rencana', icon: ListChecks },
  { href: '/budget', label: 'Budget', icon: Wallet },
  { href: '/import', label: 'Impor', icon: Download },
  { href: '/settings', label: 'Pengaturan', icon: Settings },
];

export function AppShell({
  children,
  userEmail,
  pageTitle,
  pageSubtitle,
  headerAction,
}: AppShellProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="relative min-h-screen">
      <BackdropDecor />

      <div className="flex min-h-screen">
        {/* Desktop Sidebar (>= lg) */}
        <aside className="hidden lg:flex lg:flex-col w-64 sticky top-0 h-screen bg-white/80 backdrop-blur-xl border-r border-white/60 shadow-glass z-40 select-none">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100/60">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-white font-bold text-base shadow-soft">
              CP
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 leading-none">
                ComicPlan
              </h1>
              <p className="text-[11px] text-slate-500 mt-1">Planning Komik</p>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                    active
                      ? 'bg-primary-600/10 text-primary-700 font-semibold shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
                  }`}
                >
                  <Icon
                    className={`h-4.5 w-4.5 ${
                      active ? 'text-primary-600' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                  {active && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary-600" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User mini info & Logout */}
          <div className="p-3 border-t border-slate-100/60 bg-white/40">
            <div className="px-3 py-2 rounded-xl">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Pengguna
              </p>
              <p className="text-xs font-medium text-slate-700 truncate mt-0.5">
                {userEmail || 'Owner Akun'}
              </p>
            </div>
            <form action={logout} className="mt-1">
              <button
                type="submit"
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50/60 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Keluar</span>
              </button>
            </form>
          </div>
        </aside>

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-white/60 px-4 sm:px-6 lg:px-8 py-3.5 shadow-2xs">
            <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 leading-tight">
                  {pageTitle || 'ComicPlan'}
                </h1>
                {pageSubtitle && (
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    {pageSubtitle}
                  </p>
                )}
              </div>

              {headerAction && (
                <div className="flex items-center gap-2">{headerAction}</div>
              )}
            </div>
          </header>

          {/* Main content slot */}
          <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-12">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile Bottom Tab Bar (< lg) */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/85 backdrop-blur-xl border-t border-white/60 shadow-glass-lg pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5 h-16 items-center px-1">
          {[
            { href: '/', label: 'Beranda', icon: LayoutDashboard },
            { href: '/katalog', label: 'Katalog', icon: BookOpen },
            { href: '/plans', label: 'Rencana', icon: ListChecks },
            { href: '/budget', label: 'Budget', icon: Wallet },
          ].map((tab) => {
            const active = isActive(tab.href);
            const Icon = tab.icon;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center justify-center gap-1 py-1 text-center transition-transform ${
                  active ? 'text-primary-600 scale-105' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-semibold">{tab.label}</span>
              </Link>
            );
          })}

          {/* "Lainnya" button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Menu lainnya"
            className="flex flex-col items-center justify-center gap-1 py-1 text-slate-500 hover:text-slate-800 transition-transform"
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px] font-semibold">Lainnya</span>
          </button>
        </div>
      </div>

      {/* Mobile Drawer / BottomSheet for "Lainnya" */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative bg-white/95 backdrop-blur-xl rounded-t-3xl border-t border-white/80 p-5 shadow-glass-lg z-10">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-sm font-bold text-slate-900">Menu Lainnya</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Tutup menu"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="py-3 space-y-1">
              <Link
                href="/import"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                <Download className="h-4.5 w-4.5 text-slate-500" />
                <span>Impor Shopee</span>
              </Link>
              <Link
                href="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                <Settings className="h-4.5 w-4.5 text-slate-500" />
                <span>Pengaturan</span>
              </Link>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <div className="px-3 py-1 mb-2">
                <p className="text-[10px] text-slate-400">Akun Terhubung</p>
                <p className="text-xs font-semibold text-slate-700 truncate">
                  {userEmail || 'Single-User'}
                </p>
              </div>
              <form action={logout}>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Keluar Akun</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
