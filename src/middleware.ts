import { Attribute, Context } from '@zenmanage/sdk';
import { getServerFlag } from './server';
import type {
  BuildRequestContextOptions,
  MiddlewareFlagInput,
  RequestCookiesLike,
  RequestLike,
} from './types';

function getCookieValue(cookies: RequestCookiesLike | undefined, name: string): string | undefined {
  if (!cookies) {
    return undefined;
  }

  const value = cookies.get(name);
  if (typeof value === 'string') {
    return value;
  }

  return value?.value;
}

function getRequestPath(request: RequestLike): string {
  if (request.nextUrl?.pathname) {
    return request.nextUrl.pathname;
  }

  if (request.url) {
    return new URL(request.url).pathname;
  }

  return '/';
}

export function buildContextFromRequest(
  request: RequestLike,
  options: BuildRequestContextOptions = {}
): Context {
  const identifierCookieName = options.identifierCookieName ?? 'zenmanage_user_id';
  const identifierHeaderName = options.identifierHeaderName ?? 'x-zenmanage-user-id';
  const includeGeo = options.includeGeo ?? true;
  const includeIp = options.includeIp ?? true;

  const identifier =
    getCookieValue(request.cookies, identifierCookieName) ??
    request.headers.get(identifierHeaderName) ??
    undefined;

  const context = new Context(options.contextType ?? 'user', options.contextName, identifier);

  const userAgent = request.headers.get('user-agent');
  if (userAgent) {
    context.addAttribute(new Attribute('user-agent', [userAgent]));
  }

  const path = getRequestPath(request);
  context.addAttribute(new Attribute('path', [path]));

  if (includeIp && request.ip) {
    context.addAttribute(new Attribute('ip', [request.ip]));
  }

  if (includeGeo && request.geo) {
    if (request.geo.country) {
      context.addAttribute(new Attribute('country', [request.geo.country]));
    }

    if (request.geo.region) {
      context.addAttribute(new Attribute('region', [request.geo.region]));
    }

    if (request.geo.city) {
      context.addAttribute(new Attribute('city', [request.geo.city]));
    }
  }

  if (options.additionalAttributes) {
    for (const [key, value] of Object.entries(options.additionalAttributes)) {
      if (!value) {
        continue;
      }

      const values = Array.isArray(value) ? value : [value];
      context.addAttribute(new Attribute(key, values));
    }
  }

  return context;
}

export async function evaluateMiddlewareFlag(input: MiddlewareFlagInput) {
  const context = buildContextFromRequest(input.request, input.requestContext);

  return getServerFlag({
    environmentToken: input.environmentToken,
    apiEndpoint: input.apiEndpoint,
    cacheTtl: input.cacheTtl,
    enableUsageReporting: input.enableUsageReporting,
    logger: input.logger,
    key: input.key,
    defaultValue: input.defaultValue,
    defaults: input.defaults,
    context,
  });
}
