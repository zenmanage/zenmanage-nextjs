import { DefaultsCollection } from '@zenmanage/sdk';
import { getServerFlag } from '@zenmanage/nextjs';

export default async function DefaultsExample(): Promise<JSX.Element> {
  const defaults = DefaultsCollection.fromObject({
    'new-nav': true,
    'api-version': 'v2',
    'max-items': 25,
  });

  const flag = await getServerFlag({
    environmentToken: process.env.ZENMANAGE_ENVIRONMENT_TOKEN!,
    key: 'new-nav',
    defaultValue: false,
    defaults,
  });

  return <div>{flag.asBool() ? 'Show new nav' : 'Show old nav'}</div>;
}
