'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { login } from '@/app/auth/actions';
import { BackdropDecor } from '@/components/ui/BackdropDecor';
import { Button } from '@/components/ui/Button';

function LoginForm() {
  const searchParams = useSearchParams();
  const urlError = searchParams.get('error');

  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const displayError =
    formError ||
    (urlError === 'unauthorized_email'
      ? 'Akses ditolak: Aplikasi ini dibatasi khusus untuk email pemilik yang terdaftar.'
      : null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const result = await login(formData);

    if (result?.error) {
      setFormError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="relative w-full max-w-sm rounded-glass bg-white/85 backdrop-blur-xl p-7 shadow-glass-lg border border-white/80">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-600 text-white font-bold text-xl shadow-soft">
          CP
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          ComicPlan
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Personal Manga & Comic Purchasing Planner
        </p>
      </div>

      {displayError && (
        <div
          role="alert"
          aria-live="polite"
          className="mb-4 rounded-xl bg-rose-50/90 p-3.5 text-xs text-rose-700 border border-rose-200/80 leading-relaxed font-medium"
        >
          {displayError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-xs font-semibold text-slate-700 mb-1.5"
          >
            Email Akun
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="owner@example.com"
            aria-invalid={Boolean(displayError)}
            className="w-full bg-white/80 backdrop-blur border border-slate-200 text-sm text-slate-900 px-3.5 py-2.5 rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:border-primary-400 focus:ring-primary-500/20"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-xs font-semibold text-slate-700 mb-1.5"
          >
            Kata Sandi
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            aria-invalid={Boolean(displayError)}
            className="w-full bg-white/80 backdrop-blur border border-slate-200 text-sm text-slate-900 px-3.5 py-2.5 rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:border-primary-400 focus:ring-primary-500/20"
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          isLoading={loading}
          className="w-full mt-2"
        >
          Masuk ke Aplikasi
        </Button>
      </form>

      <div className="mt-6 border-t border-slate-100 pt-4 text-center">
        <p className="text-[11px] text-slate-400 leading-normal">
          Mode Single-User: Akses khusus pemilik. Pendaftaran akun baru ditutup di database.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center p-4">
      <BackdropDecor />
      <Suspense fallback={<div className="h-96 w-full max-w-sm rounded-glass bg-white/40 animate-pulse" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
