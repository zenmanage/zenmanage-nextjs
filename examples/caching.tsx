import { createServerClient } from '@zenmanage/nextjs';

export default async function CachingExample(): Promise<JSX.Element> {
  const client = createServerClient({
    environmentToken: process.env.ZENMANAGE_ENVIRONMENT_TOKEN!,
    cacheTtl: 300,
    enableUsageReporting: true,
  });

  const manager = client.flags();
  const flag = await manager.single('header-redesign', false);

  return <div>{flag.asBool() ? 'Header redesign ON' : 'Header redesign OFF'}</div>;
}
