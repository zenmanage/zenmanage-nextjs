import type {
  Context,
  ContextData,
  DefaultsCollection,
  FlagManager,
  FlagValue,
  Logger,
  Zenmanage,
} from '@zenmanage/sdk';
import type { FlagsProviderProps } from '@zenmanage/react';

export const DEFAULT_BOOTSTRAP_ELEMENT_ID = '__ZENMANAGE_BOOTSTRAP__';

/**
 * Rules are cached in memory for this many seconds. The SDK's own default is an hour, which
 * would leave a long-running `next start` server on stale rules; a minute keeps flag changes
 * visible quickly while still sharing one fetch across every request and component.
 */
export const DEFAULT_SERVER_CACHE_TTL = 60;

/**
 * Widens a literal (`false`, `'control'`, `1500`) to its primitive type, so a value read with
 * a literal fallback is `boolean`, `string` or `number` rather than the literal. Object and
 * array values (JSON flags) pass through unchanged.
 */
export type WidenFlagValue<T extends FlagValue> = T extends boolean
  ? boolean
  : T extends number
    ? number
    : T extends string
      ? string
      : T;

export interface NextZenmanageClientOptions {
  /** A server key (`srv_...`). Server and edge runtimes reject client keys. */
  environmentToken: string;
  apiEndpoint?: string;
  /** Seconds to cache rules in memory. Defaults to {@link DEFAULT_SERVER_CACHE_TTL}. */
  cacheTtl?: number;
  enableUsageReporting?: boolean;
  logger?: Logger;
}

export interface ServerFlagInput extends NextZenmanageClientOptions {
  key: string;
  defaultValue?: FlagValue;
  context?: Context;
  defaults?: DefaultsCollection;
}

export interface ServerFlagsInput extends NextZenmanageClientOptions {
  context?: Context;
  defaults?: DefaultsCollection;
}

export interface ServerBootstrapInput extends ServerFlagsInput {
  /**
   * The flags to send to the browser. Bootstrapping every flag puts each flag's key and
   * value in the page source, so list only what client components read.
   */
  keys?: string[];
  /** Include the evaluation context in the payload so the browser evaluates for the same user. */
  includeContext?: boolean;
}

export interface BootstrapPayload {
  version: 1;
  generatedAt: string;
  flags: Record<string, FlagValue>;
  context?: ContextData;
}

export interface BuildBootstrapPayloadOptions {
  context?: Context;
  generatedAt?: Date;
}

export interface BuildBootstrapScriptOptions {
  elementId?: string;
}

export interface RequestCookieValue {
  value: string;
}

export interface RequestCookiesLike {
  get(name: string): RequestCookieValue | string | undefined;
}

export interface RequestGeoLike {
  country?: string;
  region?: string;
  city?: string;
}

export interface RequestLike {
  headers: Headers;
  cookies?: RequestCookiesLike;
  nextUrl?: { pathname: string };
  url?: string;
  /** Removed from `NextRequest` in Next.js 15; the forwarding headers are used instead. */
  ip?: string | null;
  /** Removed from `NextRequest` in Next.js 15; the Vercel and Cloudflare headers are used instead. */
  geo?: RequestGeoLike;
}

export interface BuildRequestContextOptions {
  contextType?: string;
  contextName?: string;
  identifierCookieName?: string;
  identifierHeaderName?: string;
  /** Add `country`, `region` and `city` attributes when the platform reports them. Default `true`. */
  includeGeo?: boolean;
  /** Add the visitor's IP address as an `ip` attribute. Default `false`: an IP is personal data. */
  includeIp?: boolean;
  additionalAttributes?: Record<string, string | string[] | undefined>;
}

export interface MiddlewareFlagInput extends NextZenmanageClientOptions {
  request: RequestLike;
  key: string;
  defaultValue?: FlagValue;
  defaults?: DefaultsCollection;
  requestContext?: BuildRequestContextOptions;
}

export interface NextFlagsProviderProps extends Omit<FlagsProviderProps, 'defaults'> {
  defaults?: DefaultsCollection;
  /**
   * Flags evaluated on the server. Pass it as a prop so the server render and the first
   * client render see the same value, which is what keeps hydration clean.
   */
  bootstrapPayload?: BootstrapPayload | null;
  /** Read the payload from a `<script>` tag with this id when `bootstrapPayload` isn't set. */
  bootstrapElementId?: string;
}

export interface NextFlagsRuntime {
  client: Zenmanage;
  manager: FlagManager;
}
