import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Return early if Supabase env vars are not configured yet (e.g. initial dev before setup)
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAuthPage = pathname.startsWith('/login');
  const isApiRoute = pathname.startsWith('/api');

  // Single-user allowlist check if configured
  const allowedEmail = process.env.ALLOWED_USER_EMAIL;
  if (user && allowedEmail && user.email?.toLowerCase() !== allowedEmail.toLowerCase()) {
    await supabase.auth.signOut();
    return redirectTo(request, '/login', { error: 'unauthorized_email' });
  }

  // Redirect unauthenticated requests to /login (allow API routes to handle their own tokens/auth)
  if (!user && !isAuthPage && !isApiRoute) {
    return redirectTo(request, '/login');
  }

  // Redirect authenticated user away from /login
  if (user && isAuthPage) {
    return redirectTo(request, '/');
  }

  return supabaseResponse;
}

function redirectTo(request: NextRequest, pathname: string, params?: Record<string, string>) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;

  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, value);
  }

  return NextResponse.redirect(url);
}
