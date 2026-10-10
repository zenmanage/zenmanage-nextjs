'use client';

import type { ReactNode } from 'react';
import type { BootstrapPayload } from '@zenmanage/nextjs';
import { NextFlagsProvider } from '@zenmanage/nextjs/client';

interface ClientBootstrapProps {
  bootstrapPayload: BootstrapPayload;
  children: ReactNode;
}

export function ClientBootstrap({ bootstrapPayload, children }: ClientBootstrapProps): JSX.Element {
  return (
    <NextFlagsProvider
      environmentToken={process.env.NEXT_PUBLIC_ZENMANAGE_ENVIRONMENT_TOKEN!}
      bootstrapPayload={bootstrapPayload}
    >
      {children}
    </NextFlagsProvider>
  );
}
