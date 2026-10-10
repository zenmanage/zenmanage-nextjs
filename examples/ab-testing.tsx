import type { ReactElement } from 'react';
import { Context } from '@zenmanage/sdk';
import { getFlagValue } from '@zenmanage/nextjs';

export default async function AbTestingExample(): Promise<ReactElement> {
  const context = Context.single('user', 'user-123');

  const variant = await getFlagValue(
    {
      environmentToken: process.env.ZENMANAGE_ENVIRONMENT_TOKEN!,
      key: 'checkout-flow',
      defaultValue: 'control',
      context,
    },
    'control'
  );

  return variant === 'one-page' ? <OnePageCheckout /> : <MultiPageCheckout />;
}

function OnePageCheckout(): ReactElement {
  return <div>One-page checkout</div>;
}

function MultiPageCheckout(): ReactElement {
  return <div>Multi-page checkout</div>;
}
