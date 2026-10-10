import { getFlagValue, getServerFlag } from '@zenmanage/nextjs';
import { serverOptions } from '../lib';
import { ClientValues } from './client-values';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const checkout = await getServerFlag({ ...serverOptions, key: 'new-checkout', defaultValue: false });
  const limit = await getFlagValue({ ...serverOptions, key: 'limit' }, 0);
  const theme = await getFlagValue({ ...serverOptions, key: 'theme' }, { color: 'plain' });

  return (
    <main>
      <p id="server">{`server:checkout=${checkout.asBool()};limit=${limit};theme=${theme.color}`}</p>
      <ClientValues />
    </main>
  );
}
