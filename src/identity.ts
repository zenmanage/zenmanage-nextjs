import { version } from '../package.json';

/** The client agent the API registers this package under (see the api's EnsureClientAgentIsValid). */
export const CLIENT_AGENT = 'zenmanage-nextjs';

export const PACKAGE_VERSION: string = version;
