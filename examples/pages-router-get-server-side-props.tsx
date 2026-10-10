import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import { Context } from '@zenmanage/sdk';
import { buildBootstrapPayload, getServerFlag } from '@zenmanage/nextjs';

interface PageProps {
  enabled: boolean;
  bootstrapPayload: ReturnType<typeof buildBootstrapPayload>;
}

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const userId = (ctx.req.headers['x-user-id'] as string | undefined) ?? 'anonymous';
  const context = Context.single('user', userId);

  const flag = await getServerFlag({
    environmentToken: process.env.ZENMANAGE_ENVIRONMENT_TOKEN!,
    key: 'pages-router-checkout-v2',
    defaultValue: false,
    context,
  });

  return {
    props: {
      enabled: flag.asBool(),
      bootstrapPayload: buildBootstrapPayload({
        'pages-router-checkout-v2': flag.asBool(),
      }),
    },
  };
};

export default function PagesRouterExample({
  enabled,
}: InferGetServerSidePropsType<typeof getServerSideProps>): JSX.Element {
  return <div>{enabled ? 'Pages Router V2' : 'Pages Router V1'}</div>;
}
