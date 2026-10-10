import type { ReactElement } from 'react';
import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import { Context } from '@zenmanage/sdk';
import { getBootstrapPayload, type BootstrapPayload } from '@zenmanage/nextjs';
import { NextFlagsProvider, useFlag } from '@zenmanage/nextjs/client';

interface PageProps {
  bootstrapPayload: BootstrapPayload;
}

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const userId = (ctx.req.headers['x-user-id'] as string | undefined) ?? 'anonymous';

  const bootstrapPayload = await getBootstrapPayload({
    environmentToken: process.env.ZENMANAGE_ENVIRONMENT_TOKEN!,
    context: Context.single('user', userId),
    keys: ['pages-router-checkout-v2'],
    includeContext: true,
  });

  // Props are serialized to JSON, which a payload (plain data) survives unchanged.
  return { props: { bootstrapPayload } };
};

export default function PagesRouterExample({
  bootstrapPayload,
}: InferGetServerSidePropsType<typeof getServerSideProps>): ReactElement {
  return (
    <NextFlagsProvider
      environmentToken={process.env.NEXT_PUBLIC_ZENMANAGE_ENVIRONMENT_TOKEN!}
      bootstrapPayload={bootstrapPayload}
    >
      <Checkout />
    </NextFlagsProvider>
  );
}

function Checkout(): ReactElement {
  const { value: enabled } = useFlag('pages-router-checkout-v2', false);

  return <div>{enabled ? 'Pages Router V2' : 'Pages Router V1'}</div>;
}
