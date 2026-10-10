import { NextResponse } from 'next/server';
import { evaluateMiddlewareFlag } from '@zenmanage/nextjs/middleware';

export async function middleware(request) {
  const beta = await evaluateMiddlewareFlag({
    environmentToken: process.env.ZENMANAGE_ENVIRONMENT_TOKEN,
    apiEndpoint: process.env.ZENMANAGE_API_ENDPOINT,
    key: 'beta-dashboard',
    defaultValue: false,
    request,
  });

  if (beta.asBool()) {
    return NextResponse.rewrite(new URL('/beta', request.url));
  }

  return NextResponse.next();
}

export const config = { matcher: ['/dashboard'] };
