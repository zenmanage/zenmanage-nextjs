import { Context } from '@zenmanage/sdk';
import { getServerFlag } from '@zenmanage/nextjs';

interface PageProps {
  params: { userId: string };
}

export default async function AppRouterServerComponentExample({
  params,
}: PageProps): Promise<JSX.Element> {
  const context = Context.single('user', params.userId);

  const flag = await getServerFlag({
    environmentToken: process.env.ZENMANAGE_ENVIRONMENT_TOKEN!,
    key: 'app-router-dashboard-v2',
    defaultValue: false,
    context,
  });

  return flag.asBool() ? <NewDashboard /> : <LegacyDashboard />;
}

function NewDashboard(): JSX.Element {
  return <div>App Router: New dashboard</div>;
}

function LegacyDashboard(): JSX.Element {
  return <div>App Router: Legacy dashboard</div>;
}
