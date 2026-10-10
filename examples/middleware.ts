import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { evaluateMiddlewareFlag } from '@zenmanage/nextjs/middleware';

// In Next.js 16 this file may be named `proxy.ts` (export `proxy`) and runs on Node.js.
// `middleware.ts` still works there and on every earlier version, on the Edge runtime.
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const betaFlag = await evaluateMiddlewareFlag({
    // A server key (srv_...): middleware runs on the server, never in the browser.
    environmentToken: process.env.ZENMANAGE_ENVIRONMENT_TOKEN!,
    key: 'middleware-beta-route',
    defaultValue: false,
    request,
    requestContext: {
      additionalAttributes: {
        method: request.method,
      },
    },
  });

  if (betaFlag.asBool() && request.nextUrl.pathname === '/dashboard') {
    return NextResponse.rewrite(new URL('/beta/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
