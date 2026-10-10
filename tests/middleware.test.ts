import { describe, expect, it } from 'vitest';
import { version } from '../package.json';
import { buildContextFromRequest, evaluateMiddlewareFlag } from '../src/middleware';
import type { RequestLike } from '../src/types';
import { flag, installFakeApi } from './fakeApi';

function request(
  init: {
    headers?: Record<string, string>;
    url?: string;
    nextUrl?: { pathname: string };
    cookies?: RequestLike['cookies'];
    ip?: string | null;
    geo?: RequestLike['geo'];
  } = {}
): RequestLike {
  const { headers, ...rest } = init;
  return { headers: new Headers(headers), url: 'https://example.com/pricing?x=1', ...rest };
}

const attribute = (context: ReturnType<typeof buildContextFromRequest>, key: string) =>
  context.getAttribute(key)?.getValues();

describe('buildContextFromRequest', () => {
  it('uses a user context with the path and user agent', () => {
    const context = buildContextFromRequest(request({ headers: { 'user-agent': 'jest/1' } }));

    expect(context.getType()).toBe('user');
    expect(context.getIdentifier()).toBeUndefined();
    expect(attribute(context, 'path')).toEqual(['/pricing']);
    expect(attribute(context, 'user-agent')).toEqual(['jest/1']);
  });

  it('prefers nextUrl over the url, and falls back to the root', () => {
    expect(
      attribute(buildContextFromRequest(request({ nextUrl: { pathname: '/from-next' } })), 'path')
    ).toEqual(['/from-next']);

    expect(attribute(buildContextFromRequest({ headers: new Headers() }), 'path')).toEqual(['/']);
  });

  it('omits the user agent when there is none', () => {
    expect(buildContextFromRequest(request()).hasAttribute('user-agent')).toBe(false);
  });

  describe('identifier', () => {
    it('reads the default cookie, as a string or a Next.js cookie object', () => {
      const asObject = request({ cookies: { get: () => ({ value: 'cookie-id' }) } });
      const asString = request({ cookies: { get: () => 'string-id' } });

      expect(buildContextFromRequest(asObject).getIdentifier()).toBe('cookie-id');
      expect(buildContextFromRequest(asString).getIdentifier()).toBe('string-id');
    });

    it('falls back to the header, and the cookie wins when both exist', () => {
      const headers = { 'x-zenmanage-user-id': 'header-id' };

      expect(buildContextFromRequest(request({ headers })).getIdentifier()).toBe('header-id');
      expect(
        buildContextFromRequest(
          request({ headers, cookies: { get: () => ({ value: 'cookie-id' }) } })
        ).getIdentifier()
      ).toBe('cookie-id');
    });

    it('honors custom names and ignores a missing cookie', () => {
      const names: string[] = [];
      const context = buildContextFromRequest(
        request({
          headers: { 'x-visitor': 'v-1' },
          cookies: {
            get: (name) => {
              names.push(name);
              return undefined;
            },
          },
        }),
        { identifierCookieName: 'visitor', identifierHeaderName: 'x-visitor' }
      );

      expect(names).toEqual(['visitor']);
      expect(context.getIdentifier()).toBe('v-1');
    });
  });

  it('names the context and changes its type', () => {
    const context = buildContextFromRequest(request(), {
      contextType: 'visitor',
      contextName: 'Anonymous',
    });

    expect(context.getType()).toBe('visitor');
    expect(context.getName()).toBe('Anonymous');
  });

  describe('IP address', () => {
    it('is not sent by default', () => {
      const context = buildContextFromRequest(
        request({ ip: '203.0.113.9', headers: { 'x-forwarded-for': '203.0.113.9' } })
      );

      expect(context.hasAttribute('ip')).toBe(false);
    });

    it('is sent when opted in, from request.ip', () => {
      const context = buildContextFromRequest(request({ ip: '203.0.113.9' }), { includeIp: true });

      expect(attribute(context, 'ip')).toEqual(['203.0.113.9']);
    });

    it('comes from the forwarding headers on Next.js 15, which removed request.ip', () => {
      const forwarded = buildContextFromRequest(
        request({ headers: { 'x-forwarded-for': ' 203.0.113.9 , 10.0.0.1' } }),
        { includeIp: true }
      );
      const real = buildContextFromRequest(request({ headers: { 'x-real-ip': '198.51.100.4' } }), {
        includeIp: true,
      });

      expect(attribute(forwarded, 'ip')).toEqual(['203.0.113.9']);
      expect(attribute(real, 'ip')).toEqual(['198.51.100.4']);
    });

    it('is left out when the request has none', () => {
      expect(buildContextFromRequest(request(), { includeIp: true }).hasAttribute('ip')).toBe(
        false
      );
    });
  });

  describe('geo', () => {
    it('reads request.geo', () => {
      const context = buildContextFromRequest(
        request({ geo: { country: 'CA', region: 'ON', city: 'Toronto' } })
      );

      expect(attribute(context, 'country')).toEqual(['CA']);
      expect(attribute(context, 'region')).toEqual(['ON']);
      expect(attribute(context, 'city')).toEqual(['Toronto']);
    });

    it('falls back to the headers for whatever request.geo leaves out', () => {
      // Next.js 14 and earlier set `geo` to `{}` when self-hosted.
      const empty = buildContextFromRequest(
        request({ geo: {}, headers: { 'x-vercel-ip-country': 'CA' } })
      );
      const partial = buildContextFromRequest(
        request({
          geo: { country: 'US' },
          headers: { 'x-vercel-ip-country': 'CA', 'x-vercel-ip-country-region': 'ON' },
        })
      );

      expect(attribute(empty, 'country')).toEqual(['CA']);
      expect(attribute(partial, 'country')).toEqual(['US']);
      expect(attribute(partial, 'region')).toEqual(['ON']);
    });

    it('reads the Vercel headers, decoding the city', () => {
      const context = buildContextFromRequest(
        request({
          headers: {
            'x-vercel-ip-country': 'BR',
            'x-vercel-ip-country-region': 'SP',
            'x-vercel-ip-city': 'S%C3%A3o%20Paulo',
          },
        })
      );

      expect(attribute(context, 'country')).toEqual(['BR']);
      expect(attribute(context, 'region')).toEqual(['SP']);
      expect(attribute(context, 'city')).toEqual(['São Paulo']);
    });

    it('keeps a city header it cannot decode as it is', () => {
      const context = buildContextFromRequest(request({ headers: { 'x-vercel-ip-city': '100%' } }));

      expect(attribute(context, 'city')).toEqual(['100%']);
    });

    it('reads the Cloudflare country header', () => {
      const context = buildContextFromRequest(request({ headers: { 'cf-ipcountry': 'DE' } }));

      expect(attribute(context, 'country')).toEqual(['DE']);
    });

    it('can be switched off, and is absent when nothing reports it', () => {
      const headers = { 'x-vercel-ip-country': 'BR' };

      expect(
        buildContextFromRequest(request({ headers }), { includeGeo: false }).hasAttribute('country')
      ).toBe(false);
      expect(buildContextFromRequest(request()).hasAttribute('country')).toBe(false);
    });
  });

  it('adds attributes, wrapping single values and skipping empty ones', () => {
    const context = buildContextFromRequest(request(), {
      additionalAttributes: { plan: 'pro', roles: ['admin', 'dev'], skipped: undefined, blank: '' },
    });

    expect(attribute(context, 'plan')).toEqual(['pro']);
    expect(attribute(context, 'roles')).toEqual(['admin', 'dev']);
    expect(context.hasAttribute('skipped')).toBe(false);
    expect(context.hasAttribute('blank')).toBe(false);
  });
});

describe('evaluateMiddlewareFlag', () => {
  const base = { environmentToken: 'srv_test_key', enableUsageReporting: false };

  it('evaluates against the request, as zenmanage-nextjs', async () => {
    const api = installFakeApi([
      flag('beta-rewrite', false, [
        { clauses: [{ attribute: 'country', operator: 'equal', value: 'CA' }], value: true },
        { clauses: [{ attribute: 'path', operator: 'startswith', value: '/beta' }], value: true },
      ]),
    ]);

    const canadian = await evaluateMiddlewareFlag({
      ...base,
      key: 'beta-rewrite',
      defaultValue: false,
      request: request({ headers: { 'x-vercel-ip-country': 'CA' } }),
    });
    const onBetaPath = await evaluateMiddlewareFlag({
      ...base,
      key: 'beta-rewrite',
      request: request({ nextUrl: { pathname: '/beta/start' } }),
    });
    const elsewhere = await evaluateMiddlewareFlag({
      ...base,
      key: 'beta-rewrite',
      request: request({ headers: { 'x-vercel-ip-country': 'US' } }),
    });

    expect(canadian.asBool()).toBe(true);
    expect(onBetaPath.asBool()).toBe(true);
    expect(elsewhere.asBool()).toBe(false);
    expect(api.rulesLoads()).toHaveLength(1);
    expect(api.rulesLoads()[0].headers['X-ZEN-CLIENT-AGENT']).toBe(`zenmanage-nextjs/${version}`);
  });

  it('passes the request context options and the defaults through', async () => {
    installFakeApi([
      flag('vip', false, [
        { clauses: [{ attribute: 'tier', operator: 'equal', value: 'gold' }], value: true },
      ]),
    ]);

    const result = await evaluateMiddlewareFlag({
      ...base,
      key: 'vip',
      request: request(),
      requestContext: { additionalAttributes: { tier: 'gold' } },
    });

    expect(result.asBool()).toBe(true);
  });
});
