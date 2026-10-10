import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { evaluateMiddlewareFlag } from '@zenmanage/nextjs/middleware';

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const betaFlag = await evaluateMiddlewareFlag({
    environmentToken: process.env.ZENMANAGE_ENVIRONMENT_TOKEN!,
    key: 'middleware-beta-route',
    defaultValue: false,
    request: {
      headers: request.headers,
      cookies: request.cookies,
      nextUrl: request.nextUrl,
      ip: request.ip ?? null,
      geo: request.geo,
      url: request.url,
    },
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
