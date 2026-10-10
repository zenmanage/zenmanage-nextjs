import type { ReactElement } from 'react';
import { DefaultsCollection } from '@zenmanage/sdk';
import { getServerFlag } from '@zenmanage/nextjs';

export default async function DefaultsExample(): Promise<ReactElement> {
  const defaults = DefaultsCollection.fromObject({
    'new-nav': true,
    'api-version': 'v2',
    'max-items': 25,
  });

  // No inline default: the value comes from the collection when Zenmanage can't be reached.
  const flag = await getServerFlag({
    environmentToken: process.env.ZENMANAGE_ENVIRONMENT_TOKEN!,
    key: 'new-nav',
    defaults,
  });

  return <div>{flag.asBool() ? 'Show new nav' : 'Show old nav'}</div>;
}
