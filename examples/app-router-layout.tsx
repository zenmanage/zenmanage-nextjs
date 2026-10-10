import type { ReactElement, ReactNode } from 'react';
import { Context } from '@zenmanage/sdk';
import { getBootstrapPayload } from '@zenmanage/nextjs';
import { Providers } from './client-component-bootstrap';

// A Server Component: evaluate on the server, then hand the result to the client provider.
export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}): Promise<ReactElement> {
  const bootstrapPayload = await getBootstrapPayload({
    environmentToken: process.env.ZENMANAGE_ENVIRONMENT_TOKEN!,
    context: Context.single('user', 'user-123'),
    // Only the flags client components read. Everything listed here is visible in the page source.
    keys: ['new-checkout', 'checkout-flow'],
    // Lets the browser evaluate for the same user when it refreshes the rules.
    includeContext: true,
  });

  return (
    <html lang="en">
      <body>
        <Providers bootstrapPayload={bootstrapPayload}>{children}</Providers>
      </body>
    </html>
  );
}
