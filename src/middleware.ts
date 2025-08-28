import { NextRequest, NextResponse } from 'next/server';
import * as jose from 'jose';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const managerSessionCookie = req.cookies.get('manager_session');

  // Protect all routes under /m/ except the login page itself
  if (pathname.startsWith('/m/') && pathname !== '/m/login') {
    if (!managerSessionCookie) {
      return NextResponse.redirect(new URL('/m/login', req.url));
    }

    try {
      if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not set');
      }
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      await jose.jwtVerify(managerSessionCookie.value, secret);

      // Token is valid, allow the request to proceed
      return NextResponse.next();
    } catch (error) {
      // Token verification failed (e.g., expired, invalid signature)
      console.error('Manager session verification failed:', error);

      // Redirect to login, but first clear the invalid cookie
      const response = NextResponse.redirect(new URL('/m/login', req.url));
      response.cookies.set('manager_session', '', { expires: new Date(0) });
      return response;
    }
  }

  // If user is logged in and tries to access /m/login, redirect to dashboard
  if (pathname === '/m/login' && managerSessionCookie) {
     try {
      if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not set');
      }
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      await jose.jwtVerify(managerSessionCookie.value, secret);
      // If token is valid, they don't need to see the login page
      return NextResponse.redirect(new URL('/m/dashboard', req.url));
    } catch (error) {
      // If token is invalid, let them proceed to the login page
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
