import { createClient } from '@/lib/supabase/server';
import { logout } from '@/app/auth/actions';

export default async function HomePage() {
  let user = null;
  let supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  if (supabaseConfigured) {
    try {
      const supabase = await createClient();
      const { data } = await supabase.auth.getUser();
      user = data.user;
    } catch {
      // Ignored if local dev without live Supabase credentials
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Top Header / App Bar */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur shadow-sm">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white text-sm">
              CP
            </div>
            <div>
              <h1 className="text-base font-bold leading-none text-slate-900">ComicPlan</h1>
              <span className="text-[10px] text-emerald-600 font-medium">Single-User Active</span>
            </div>
          </div>

          {user ? (
            <form action={logout}>
              <button
                type="submit"
                className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Keluar
              </button>
            </form>
          ) : (
            <a
              href="/login"
              className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
            >
              Masuk
            </a>
          )}
        </div>
      </header>

      {/* Main Content Area (Mobile-First max-w-md) */}
      <main className="mx-auto max-w-md px-4 pt-4 space-y-4">
        {/* User Card */}
        {user && (
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3.5">
            <p className="text-xs text-indigo-700 font-medium">Pengguna Terautentikasi</p>
            <p className="text-sm font-semibold text-slate-900 truncate">{user.email}</p>
          </div>
        )}

        {/* Budget Overview Cards */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Budget Bulan Ini
            </h2>
            <span className="text-xs text-indigo-600 font-medium cursor-pointer">Atur</span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs text-slate-500">Sisa Aman Dibelanjakan</div>
            <div className="mt-1 text-2xl font-extrabold text-emerald-600">Rp 0</div>

            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-xs">
              <div>
                <span className="text-slate-400 block">Komitmen PO</span>
                <span className="font-semibold text-slate-800">Rp 0</span>
              </div>
              <div>
                <span className="text-slate-400 block">Realisasi</span>
                <span className="font-semibold text-slate-800">Rp 0</span>
              </div>
            </div>
          </div>
        </section>

        {/* System & Architecture Status */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-slate-900">Fondasi Sistem Siap</h2>
          <ul className="space-y-2 text-xs text-slate-600">
            <li className="flex items-center space-x-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Next.js App Router (TypeScript + Tailwind CSS)</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Supabase SSR Client & Server-only Admin Client</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Skema 6 Tabel (budgets, items, listings, plans, tx, history)</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Listing Dedup Constraint: (marketplace, shop_id, item_id_shopee)</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>RLS: Read-only untuk user login, mutasi strictly server route</span>
            </li>
          </ul>
        </section>

        {/* Quick Database Checklist */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Skema Database (6 Tabel)
          </h2>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
              <span className="font-semibold text-slate-800">budgets</span>
              <p className="text-[11px] text-slate-500">Periode date unique</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
              <span className="font-semibold text-slate-800">items</span>
              <p className="text-[11px] text-slate-500">Koleksi manga/komik</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
              <span className="font-semibold text-slate-800">listings</span>
              <p className="text-[11px] text-slate-500">Unique (mp, shop, item)</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
              <span className="font-semibold text-slate-800">plans</span>
              <p className="text-[11px] text-slate-500">State: wishlist→diterima</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
              <span className="font-semibold text-slate-800">transactions</span>
              <p className="text-[11px] text-slate-500">dp, pelunasan, refund</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
              <span className="font-semibold text-slate-800">status_history</span>
              <p className="text-[11px] text-slate-500">Audit trail status</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
