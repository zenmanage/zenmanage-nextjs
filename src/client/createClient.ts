import { ConfigBuilder, Zenmanage } from '@zenmanage/sdk';
import { CLIENT_AGENT, PACKAGE_VERSION } from '../identity';

interface ClientOptions {
  environmentToken?: string;
  apiEndpoint?: string;
  cacheTtl?: number;
  enableUsageReporting?: boolean;
}

// Mirrors how @zenmanage/sdk tells the runtimes apart.
function isServerRender(): boolean {
  return typeof window === 'undefined' && typeof document === 'undefined';
}

/**
 * Builds the client a provider hands to its hooks.
 *
 * Next.js renders Client Components on the server as well as in the browser, and the SDK
 * refuses a client key in Node.js. Nothing is fetched while rendering (effects don't run), so
 * the server render gets a client assembled without that check, which is only ever asked for
 * its defaults. The browser gets a fully validated one.
 */
export function createProviderClient(options: ClientOptions): Zenmanage {
  const { environmentToken, apiEndpoint, cacheTtl, enableUsageReporting } = options;

  if (!environmentToken) {
    throw new Error('NextFlagsProvider requires either a client or an environmentToken.');
  }

  // A prop on a Client Component is written into the page, so a server key here would leak.
  if (environmentToken.startsWith('srv_')) {
    throw new Error(
      'NextFlagsProvider received a server key (srv_...). Server keys must never reach the browser; use a client key (cli_...).'
    );
  }

  if (isServerRender()) {
    if (!environmentToken.startsWith('cli_')) {
      throw new Error('NextFlagsProvider needs a client key (cli_...).');
    }

    return new Zenmanage({
      environmentToken,
      apiEndpoint,
      cacheTtl,
      enableUsageReporting,
      clientAgent: CLIENT_AGENT,
      sdkVersion: PACKAGE_VERSION,
    });
  }

  const builder = ConfigBuilder.create()
    .withEnvironmentToken(environmentToken)
    .withClientAgent(CLIENT_AGENT)
    .withSdkVersion(PACKAGE_VERSION);

  if (apiEndpoint) {
    builder.withApiEndpoint(apiEndpoint);
  }

  if (typeof cacheTtl === 'number') {
    builder.withCacheTtl(cacheTtl);
  }

  if (typeof enableUsageReporting === 'boolean') {
    builder.withUsageReporting(enableUsageReporting);
  }

  return new Zenmanage(builder.build());
}
