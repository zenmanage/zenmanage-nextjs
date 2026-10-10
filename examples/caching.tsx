import type { ReactElement } from 'react';
import { createServerManager } from '@zenmanage/nextjs';

export default async function CachingExample(): Promise<ReactElement> {
  // Rules are cached in memory for `cacheTtl` seconds (60 unless you set it) and shared by
  // every helper call that uses the same configuration, so this does not refetch per request.
  const manager = createServerManager({
    environmentToken: process.env.ZENMANAGE_ENVIRONMENT_TOKEN!,
    cacheTtl: 300,
    enableUsageReporting: true,
  });

  const flag = await manager.single('header-redesign', false);

  return <div>{flag.asBool() ? 'Header redesign ON' : 'Header redesign OFF'}</div>;
}
