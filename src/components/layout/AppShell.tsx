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
  LogIn,
  LogOut,
  MoreHorizontal,
  X,
} from 'lucide-react';
import { BackdropDecor } from '@/components/ui/BackdropDecor';
import { BrandMark } from '@/components/ui/BrandMark';
import { logout } from '@/app/auth/actions';

interface AppShellProps {
  children: React.ReactNode;
  userEmail?: string | null;
  pageTitle?: string;
  pageSubtitle?: string;
  headerAction?: React.ReactNode;
}

const ownerNavItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/katalog', label: 'Katalog', icon: BookOpen },
  { href: '/plans', label: 'Rencana', icon: ListChecks },
  { href: '/budget', label: 'Budget', icon: Wallet },
  { href: '/import', label: 'Impor', icon: Download },
  { href: '/settings', label: 'Pengaturan', icon: Settings },
];

const guestNavItems = [
  { href: '/', label: 'Ringkasan', icon: LayoutDashboard },
  { href: '/katalog', label: 'Katalog', icon: BookOpen },
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
  const isOwner = Boolean(userEmail);
  const navItems = isOwner ? ownerNavItems : guestNavItems;

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
        <aside className="hidden lg:flex lg:flex-col w-60 sticky top-0 h-screen bg-white border-r border-neutral-200 z-40 select-none">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5 px-5 h-16">
            <BrandMark size="md" />
            <div>
              <h1 className="text-[15px] font-bold text-neutral-900 leading-none">
                ComicPlan
              </h1>
              <p className="text-xs text-neutral-400 mt-1">Planning Komik</p>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
            {navItems.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-3 px-3 py-2 rounded-card text-sm transition-colors duration-150 ${
                    active
                      ? 'bg-neutral-100 text-neutral-900 font-medium'
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  <Icon
                    className={`h-4.5 w-4.5 ${
                      active ? 'text-primary-600' : 'text-neutral-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User mini info & Logout / Login */}
          <div className="p-3 border-t border-neutral-200">
            <div className="px-3 py-2">
              <p className="text-xs text-neutral-400">
                {isOwner ? 'Pengguna' : 'Mode Akses'}
              </p>
              <p className="text-sm text-neutral-800 truncate mt-0.5">
                {userEmail || 'Tamu · Hanya Baca'}
              </p>
            </div>
            {isOwner ? (
              <form action={logout} className="mt-1">
                <button
                  type="submit"
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-card text-sm text-neutral-500 hover:text-rose-600 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Keluar</span>
                </button>
              </form>
            ) : (
              <Link
                href="/login"
                className="mt-1 w-full flex items-center gap-2.5 px-3 py-2 rounded-card text-sm font-medium text-neutral-900 border border-neutral-300 hover:border-neutral-900 transition-colors"
              >
                <LogIn className="h-4 w-4" />
                <span>Masuk Pemilik</span>
              </Link>
            )}
          </div>
        </aside>

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="sticky top-0 z-30 bg-white border-b border-neutral-200 px-4 sm:px-6 lg:px-10 py-4 lg:py-5">
            <div className="max-w-6xl mx-auto flex items-end justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-[1.75rem] font-bold text-neutral-900 leading-tight">
                  {pageTitle || 'ComicPlan'}
                </h1>
                {pageSubtitle && (
                  <p className="text-sm text-neutral-500 mt-1">
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
          <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-10 py-6 lg:py-8 pb-24 lg:pb-16">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile Bottom Tab Bar (< lg) */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-neutral-200 pb-[env(safe-area-inset-bottom)]">
        <div
          className={`grid ${
            isOwner ? 'grid-cols-5' : 'grid-cols-3'
          } h-16 items-center px-1`}
        >
          {(isOwner
            ? [
                { href: '/', label: 'Beranda', icon: LayoutDashboard },
                { href: '/katalog', label: 'Katalog', icon: BookOpen },
                { href: '/plans', label: 'Rencana', icon: ListChecks },
                { href: '/budget', label: 'Budget', icon: Wallet },
              ]
            : [
                { href: '/', label: 'Ringkasan', icon: LayoutDashboard },
                { href: '/katalog', label: 'Katalog', icon: BookOpen },
                { href: '/login', label: 'Masuk', icon: LogIn },
              ]
          ).map((tab) => {
            const active = isActive(tab.href);
            const Icon = tab.icon;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                prefetch={true}
                className={`flex flex-col items-center justify-center gap-1 py-1 text-center transition-colors ${
                  active ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-800'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </Link>
            );
          })}

          {/* "Lainnya" button (khusus pemilik) */}
          {isOwner && (
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Menu lainnya"
              className="flex flex-col items-center justify-center gap-1 py-1 text-neutral-400 hover:text-neutral-800 transition-colors"
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-[10px] font-medium">Lainnya</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Drawer / BottomSheet for "Lainnya" */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="fixed inset-0 bg-neutral-900/25"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative bg-white rounded-t-glass border-t border-neutral-200 p-5 z-10">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <span className="text-sm font-medium text-neutral-900">Menu lainnya</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Tutup menu"
                className="inline-flex h-9 w-9 items-center justify-center rounded-card text-neutral-400 hover:text-neutral-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="py-3 space-y-1">
              <Link
                href="/import"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-card text-sm text-neutral-700 hover:bg-neutral-100"
              >
                <Download className="h-4.5 w-4.5 text-neutral-400" />
                <span>Impor Shopee</span>
              </Link>
              <Link
                href="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-card text-sm text-neutral-700 hover:bg-neutral-100"
              >
                <Settings className="h-4.5 w-4.5 text-neutral-400" />
                <span>Pengaturan</span>
              </Link>
            </div>

            <div className="pt-3 border-t border-neutral-200">
              <div className="px-3 py-1 mb-2">
                <p className="text-xs text-neutral-400">Akun terhubung</p>
                <p className="text-sm text-neutral-800 truncate">
                  {userEmail || 'Single-User'}
                </p>
              </div>
              <form action={logout}>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-card text-sm font-medium text-rose-600 border border-rose-200 hover:border-rose-600 transition-colors"
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
