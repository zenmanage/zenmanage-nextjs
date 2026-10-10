import type { ReactElement } from 'react';
import { Context } from '@zenmanage/sdk';
import { getServerFlag } from '@zenmanage/nextjs';

interface PageProps {
  // In Next.js 15 and later `params` is a promise. In 13 and 14 it is a plain object.
  params: Promise<{ userId: string }>;
}

export default async function AppRouterServerComponentExample({
  params,
}: PageProps): Promise<ReactElement> {
  const { userId } = await params;
  const context = Context.single('user', userId);

  const flag = await getServerFlag({
    environmentToken: process.env.ZENMANAGE_ENVIRONMENT_TOKEN!,
    key: 'app-router-dashboard-v2',
    defaultValue: false,
    context,
  });

  return flag.asBool() ? <NewDashboard /> : <LegacyDashboard />;
}

function NewDashboard(): ReactElement {
  return <div>App Router: New dashboard</div>;
}

function LegacyDashboard(): ReactElement {
  return <div>App Router: Legacy dashboard</div>;
}
