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

export interface NextZenmanageClientOptions {
  environmentToken: string;
  apiEndpoint?: string;
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
  ip?: string | null;
  geo?: RequestGeoLike;
}

export interface BuildRequestContextOptions {
  contextType?: string;
  contextName?: string;
  identifierCookieName?: string;
  identifierHeaderName?: string;
  includeGeo?: boolean;
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
  bootstrapPayload?: BootstrapPayload | null;
  bootstrapElementId?: string;
}

export interface NextFlagsRuntime {
  client: Zenmanage;
  manager: FlagManager;
}
