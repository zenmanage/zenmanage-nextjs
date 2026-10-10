'use client';

import { useFlag } from '@zenmanage/nextjs/client';

export function ClientValues() {
  const checkout = useFlag('new-checkout', false);
  const limit = useFlag('limit', 0);
  const theme = useFlag('theme', { color: 'plain' });

  return (
    <p id="client">
      {`client:checkout=${checkout.value};limit=${limit.value};theme=${theme.value.color};loading=${checkout.isLoading}`}
    </p>
  );
}
