import { getServerFlag } from '@zenmanage/nextjs';

export default async function SimpleFlagsExample(): Promise<JSX.Element> {
  const feature = await getServerFlag({
    environmentToken: process.env.ZENMANAGE_ENVIRONMENT_TOKEN!,
    key: 'new-dashboard',
    defaultValue: false,
  });

  return <div>{feature.asBool() ? 'New dashboard enabled' : 'Legacy dashboard'}</div>;
}
