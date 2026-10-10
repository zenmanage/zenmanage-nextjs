import { Context } from '@zenmanage/sdk';
import { getServerFlag } from '@zenmanage/nextjs';

export default async function PercentageRolloutsExample(): Promise<JSX.Element> {
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
