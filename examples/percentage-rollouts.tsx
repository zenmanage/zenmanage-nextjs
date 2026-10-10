import type { ReactElement } from 'react';
import { Context } from '@zenmanage/sdk';
import { getServerFlag } from '@zenmanage/nextjs';

export default async function PercentageRolloutsExample(): Promise<ReactElement> {
  // A rollout buckets users by identifier, so pass a stable one: the same user always lands
  // in the same bucket.
  const context = Context.single('user', 'user-789');

  const rollout = await getServerFlag({
    environmentToken: process.env.ZENMANAGE_ENVIRONMENT_TOKEN!,
    key: 'new-checkout-flow',
    defaultValue: false,
    context,
  });

  return (
    <div>
      {rollout.asBool()
        ? 'User is in rollout bucket: render new checkout'
        : 'User is outside rollout bucket: render legacy checkout'}
    </div>
  );
}
