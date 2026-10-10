'use client';

import { NextFlagsProvider } from '@zenmanage/nextjs/client';

export function Providers({ bootstrapPayload, children }) {
  return (
    <NextFlagsProvider
      environmentToken={process.env.NEXT_PUBLIC_ZENMANAGE_ENVIRONMENT_TOKEN}
      apiEndpoint={process.env.NEXT_PUBLIC_ZENMANAGE_API_ENDPOINT}
      bootstrapPayload={bootstrapPayload}
    >
      {children}
    </NextFlagsProvider>
  );
}
