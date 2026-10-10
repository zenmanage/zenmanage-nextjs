import { getBootstrapPayload } from '@zenmanage/nextjs';
import { NextFlagsProvider, useFlag } from '@zenmanage/nextjs/client';
import { serverOptions } from '../lib';

export async function getServerSideProps() {
  const bootstrapPayload = await getBootstrapPayload({ ...serverOptions, keys: ['new-checkout'] });

  return { props: { bootstrapPayload } };
}

function Checkout() {
  const { value, isLoading } = useFlag('new-checkout', false);

  return <p id="pages">{`Pages Router: checkout=${value};loading=${isLoading}`}</p>;
}

export default function Legacy({ bootstrapPayload }) {
  return (
    <NextFlagsProvider
      environmentToken={process.env.NEXT_PUBLIC_ZENMANAGE_ENVIRONMENT_TOKEN}
      apiEndpoint={process.env.NEXT_PUBLIC_ZENMANAGE_API_ENDPOINT}
      bootstrapPayload={bootstrapPayload}
    >
      <Checkout />
    </NextFlagsProvider>
  );
}
