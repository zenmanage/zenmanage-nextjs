import { Attribute, Context, type Flag } from '@zenmanage/sdk';
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

function decodeHeader(value: string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

// Next.js 15 removed `request.ip` and `request.geo`, so read what the platform forwards.
function getIp(request: RequestLike): string | undefined {
  if (request.ip) {
    return request.ip;
  }

  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || request.headers.get('x-real-ip') || undefined;
}

function getGeo(request: RequestLike): { country?: string; region?: string; city?: string } {
  const { headers, geo } = request;

  // Next.js 14 and earlier set `request.geo` even when nothing fills it in (it is `{}` when
  // self-hosted), so each field falls back to the headers on its own.
  return {
    country:
      geo?.country ||
      headers.get('x-vercel-ip-country') ||
      headers.get('cf-ipcountry') ||
      undefined,
    region: geo?.region || headers.get('x-vercel-ip-country-region') || undefined,
    city: geo?.city || decodeHeader(headers.get('x-vercel-ip-city')),
  };
}

/**
 * Builds an evaluation context from a request: an identifier (cookie, then header), the path,
 * the user agent and, when the platform reports it, the visitor's location. Works with
 * `NextRequest` and with a plain `Request`.
 */
export function buildContextFromRequest(
  request: RequestLike,
  options: BuildRequestContextOptions = {}
): Context {
  const identifierCookieName = options.identifierCookieName ?? 'zenmanage_user_id';
  const identifierHeaderName = options.identifierHeaderName ?? 'x-zenmanage-user-id';
  const includeGeo = options.includeGeo ?? true;
  const includeIp = options.includeIp ?? false;

  const identifier =
    getCookieValue(request.cookies, identifierCookieName) ??
    request.headers.get(identifierHeaderName) ??
    undefined;

  const context = new Context(options.contextType ?? 'user', options.contextName, identifier);

  const userAgent = request.headers.get('user-agent');
  if (userAgent) {
    context.addAttribute(new Attribute('user-agent', [userAgent]));
  }

  context.addAttribute(new Attribute('path', [getRequestPath(request)]));

  const ip = includeIp ? getIp(request) : undefined;
  if (ip) {
    context.addAttribute(new Attribute('ip', [ip]));
  }

  if (includeGeo) {
    const geo = getGeo(request);

    if (geo.country) {
      context.addAttribute(new Attribute('country', [geo.country]));
    }

    if (geo.region) {
      context.addAttribute(new Attribute('region', [geo.region]));
    }

    if (geo.city) {
      context.addAttribute(new Attribute('city', [geo.city]));
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

/**
 * Evaluates one flag for the request. Runs on the Edge runtime (`middleware.ts`) and on the
 * Node.js runtime (`proxy.ts` in Next.js 16), and needs a server key in both.
 */
export async function evaluateMiddlewareFlag(input: MiddlewareFlagInput): Promise<Flag> {
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
