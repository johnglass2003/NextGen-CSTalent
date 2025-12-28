/**
 * Proxy
 * Handles authentication redirects for logged-in users
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that should redirect logged-in users to their dashboard
const PUBLIC_ROUTES = ['/', '/login', '/for-students', '/for-companies', '/about'];
const REGISTER_ROUTES = ['/students/register', '/companies/register'];

// Role-based dashboard redirects
const DASHBOARD_ROUTES: Record<string, string> = {
  student: '/students/dashboard',
  company: '/companies/dashboard',
  internal: '/internal/dashboard',
};

export async function proxy(req: NextRequest) {
  let res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  try {
    // Get the current session
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const pathname = req.nextUrl.pathname;

    // If user is logged in and on a public route, redirect to their dashboard
    if (user) {
      const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
      const isRegisterRoute = REGISTER_ROUTES.includes(pathname);

      if (isPublicRoute || isRegisterRoute) {
        // Get user role from database
        const { data: userData, error } = await supabase
          .from('users')
          .select('role')
          .eq('auth_user_id', user.id)
          .single();

        if (!error && userData?.role) {
          const redirectUrl = DASHBOARD_ROUTES[userData.role];
          if (redirectUrl) {
            return NextResponse.redirect(new URL(redirectUrl, req.url));
          }
        }
      }
    }

    return res;
  } catch (error) {
    console.error('Middleware error:', error);
    return res;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes
     */
    '/((?!_next/static|_next/image|favicon.ico|public|api).*)',
  ],
};
