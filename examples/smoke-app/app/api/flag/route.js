import { NextResponse } from 'next/server';
import { getFlagValue, getServerFlag } from '@zenmanage/nextjs';
import { serverOptions } from '../../../lib';

export const dynamic = 'force-dynamic';

export async function GET() {
  const flag = await getServerFlag({ ...serverOptions, key: 'new-checkout', defaultValue: false });
  const limit = await getFlagValue({ ...serverOptions, key: 'limit' }, 0);

  return NextResponse.json({ enabled: flag.asBool(), limit });
}
