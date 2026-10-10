import { getBootstrapPayload } from '@zenmanage/nextjs';
import { serverOptions } from '../lib';
import { Providers } from './providers';

// The layout evaluates flags on every request, so it can't be prerendered at build time.
export const dynamic = 'force-dynamic';

export default async function RootLayout({ children }) {
  const bootstrapPayload = await getBootstrapPayload({
    ...serverOptions,
    keys: ['new-checkout', 'limit', 'theme'],
  });

  return (
    <html lang="en">
      <body>
        <Providers bootstrapPayload={bootstrapPayload}>{children}</Providers>
      </body>
    </html>
  );
}
