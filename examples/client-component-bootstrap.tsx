'use client';

import type { ReactElement, ReactNode } from 'react';
import type { BootstrapPayload } from '@zenmanage/nextjs';
import { NextFlagsProvider, useFlag } from '@zenmanage/nextjs/client';

interface ProvidersProps {
  bootstrapPayload: BootstrapPayload;
  children: ReactNode;
}

export function Providers({ bootstrapPayload, children }: ProvidersProps): ReactElement {
  return (
    <NextFlagsProvider
      // A client key (cli_...). Never put a server key (srv_...) in a NEXT_PUBLIC_ variable.
      environmentToken={process.env.NEXT_PUBLIC_ZENMANAGE_ENVIRONMENT_TOKEN!}
      bootstrapPayload={bootstrapPayload}
    >
      {children}
    </NextFlagsProvider>
  );
}

// Renders the server's value on the first paint (server render and hydration alike), then
// switches to the live value if the browser's evaluation differs.
export function CheckoutButton(): ReactElement {
  const { value: enabled } = useFlag('new-checkout', false);

  return <button>{enabled ? 'Checkout (new)' : 'Checkout'}</button>;
}
