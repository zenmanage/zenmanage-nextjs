import { NextResponse } from 'next/server';
import { Context } from '@zenmanage/sdk';
import { getServerFlag } from '@zenmanage/nextjs';

export async function GET(request: Request): Promise<NextResponse> {
  const userId = request.headers.get('x-user-id') ?? 'anonymous';
  const context = Context.single('user', userId);

  const flag = await getServerFlag({
    environmentToken: process.env.ZENMANAGE_ENVIRONMENT_TOKEN!,
    key: 'route-handler-v2',
    defaultValue: false,
    context,
  });

  return NextResponse.json({
    enabled: flag.asBool(),
    source: 'app-router-route-handler',
  });
}
