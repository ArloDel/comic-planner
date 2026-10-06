import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';

/**
 * Server-side Supabase client yang membawa sesi user dari cookie.
 *
 * Catatan tipe: `@supabase/ssr` mengembalikan client dengan generik
 * `SupabaseClient` 3-arg, sementara `@supabase/supabase-js` yang terpasang
 * me-resolve baris tabel lewat generik 4-arg. Akibatnya `Row` tiap tabel
 * collapse jadi `never` dan query typed gagal. Kita assert ulang ke tipe yang
 * dimaksud satu kali di sini, supaya fitur lain cukup memakai
 * `supabase.from(...).select(...)` tanpa cast `any`.
 */
export async function createClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies();

  const client = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Can be ignored if called from a Server Component and middleware is refreshing sessions
          }
        },
      },
    }
  );

  return client as unknown as SupabaseClient<Database>;
}
