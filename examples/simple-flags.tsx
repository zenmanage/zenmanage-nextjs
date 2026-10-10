import type { ReactElement } from 'react';
import { getServerFlag } from '@zenmanage/nextjs';

export default async function SimpleFlagsExample(): Promise<ReactElement> {
  const feature = await getServerFlag({
    environmentToken: process.env.ZENMANAGE_ENVIRONMENT_TOKEN!,
    key: 'new-dashboard',
    defaultValue: false,
  });

  return <div>{feature.asBool() ? 'New dashboard enabled' : 'Legacy dashboard'}</div>;
}
