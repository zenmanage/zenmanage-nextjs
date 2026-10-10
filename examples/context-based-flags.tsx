import type { ReactElement } from 'react';
import { Attribute, Context } from '@zenmanage/sdk';
import { getServerFlag } from '@zenmanage/nextjs';

export default async function ContextBasedFlagsExample(): Promise<ReactElement> {
  const context = new Context('user', 'Jane Doe', 'user-123', [
    new Attribute('country', ['US']),
    new Attribute('plan', ['pro']),
  ]);

  const flag = await getServerFlag({
    environmentToken: process.env.ZENMANAGE_ENVIRONMENT_TOKEN!,
    key: 'premium-upgrade-cta',
    defaultValue: false,
    context,
  });

  return <section>{flag.asBool() ? <p>Show premium CTA</p> : <p>Hide premium CTA</p>}</section>;
}
