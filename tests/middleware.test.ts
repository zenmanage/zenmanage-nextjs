import { describe, expect, it, vi } from 'vitest';
import { buildContextFromRequest, evaluateMiddlewareFlag } from '../src/middleware';

const { getServerFlag } = vi.hoisted(() => ({
  getServerFlag: vi.fn(),
}));

vi.mock('../src/server', () => ({
  getServerFlag,
}));

describe('middleware helpers', () => {
  it('builds context from request cookies, headers, and geo data', () => {
    const request = {
      headers: new Headers({
        'user-agent': 'vitest-agent',
        'x-zenmanage-user-id': 'header-user',
      }),
      cookies: {
        get: (name: string) =>
          name === 'zenmanage_user_id' ? { value: 'cookie-user' } : undefined,
      },
      nextUrl: { pathname: '/pricing' },
      ip: '10.0.0.1',
      geo: { country: 'US', region: 'CA', city: 'San Francisco' },
    };

    const context = buildContextFromRequest(request);

    expect(context.getIdentifier()).toBe('cookie-user');
    expect(context.getAttribute('path')?.getValues()).toEqual(['/pricing']);
    expect(context.getAttribute('country')?.getValues()).toEqual(['US']);
    expect(context.getAttribute('city')?.getValues()).toEqual(['San Francisco']);
    expect(context.getAttribute('ip')?.getValues()).toEqual(['10.0.0.1']);
  });

  it('supports fallback identifier from custom header and url parsing', () => {
    const request = {
      headers: new Headers({
        'x-user-id': 'user-42',
      }),
      url: 'https://example.com/account?tab=usage',
    };

    const context = buildContextFromRequest(request, {
      identifierHeaderName: 'x-user-id',
      includeGeo: false,
      includeIp: false,
      additionalAttributes: {
        plan: 'pro',
        segment: ['beta', 'team-a'],
      },
    });

    expect(context.getIdentifier()).toBe('user-42');
    expect(context.getAttribute('path')?.getValues()).toEqual(['/account']);
    expect(context.getAttribute('plan')?.getValues()).toEqual(['pro']);
    expect(context.getAttribute('segment')?.getValues()).toEqual(['beta', 'team-a']);
  });

  it('uses root path fallback and ignores empty additional attributes', () => {
    const request = {
      headers: new Headers(),
      cookies: {
        get: (name: string) => (name === 'zenmanage_user_id' ? 'cookie-id' : undefined),
      },
    };

    const context = buildContextFromRequest(request, {
      additionalAttributes: {
        empty: '',
        unknown: undefined,
      },
    });

    expect(context.getIdentifier()).toBe('cookie-id');
    expect(context.getAttribute('path')?.getValues()).toEqual(['/']);
    expect(context.getAttribute('empty')).toBeUndefined();
    expect(context.getAttribute('unknown')).toBeUndefined();
  });

  it('evaluates middleware flags using server helper with derived context', async () => {
    getServerFlag.mockResolvedValue({ isEnabled: () => true });

    const request = {
      headers: new Headers({ 'user-agent': 'nextjs-test' }),
      nextUrl: { pathname: '/checkout' },
    };

    const result = await evaluateMiddlewareFlag({
      environmentToken: 'srv_test_key',
      key: 'checkout-v2',
      request,
      defaultValue: false,
      requestContext: {
        additionalAttributes: {
          channel: 'organic',
        },
      },
    });

    expect(getServerFlag).toHaveBeenCalledTimes(1);
    expect(getServerFlag.mock.calls[0][0]).toMatchObject({
      environmentToken: 'srv_test_key',
      key: 'checkout-v2',
      defaultValue: false,
    });

    const passedContext = getServerFlag.mock.calls[0][0].context;
    expect(passedContext.getAttribute('path')?.getValues()).toEqual(['/checkout']);
    expect(passedContext.getAttribute('channel')?.getValues()).toEqual(['organic']);

    expect(result.isEnabled()).toBe(true);
  });
});
