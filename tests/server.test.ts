import { describe, expect, it, vi } from 'vitest';
import { Context, DefaultsCollection, type Logger } from '@zenmanage/sdk';
import { version } from '../package.json';
import {
  clearServerClients,
  createServerClient,
  createServerManager,
  createServerRuntime,
  getBootstrapPayload,
  getFlagValue,
  getServerFlag,
  getServerFlags,
  preloadServerFlags,
} from '../src/server';
import { DEFAULT_SERVER_CACHE_TTL } from '../src/types';
import { flag, installFakeApi } from './fakeApi';

const TOKEN = 'srv_test_key';
const base = { environmentToken: TOKEN, enableUsageReporting: false };

describe('server helpers', () => {
  it('identifies as zenmanage-nextjs on every request, including usage reports', async () => {
    const api = installFakeApi([flag('new-checkout', true)]);

    await getServerFlag({ environmentToken: TOKEN, key: 'new-checkout', defaultValue: false });

    expect(api.rulesLoads()).toHaveLength(1);
    expect(api.usageReports()).toHaveLength(1);
    for (const request of [...api.rulesLoads(), ...api.usageReports()]) {
      expect(request.headers['X-ZEN-CLIENT-AGENT']).toBe(`zenmanage-nextjs/${version}`);
      expect(request.headers['X-ZEN-API-KEY']).toBe(TOKEN);
    }
  });

  it('evaluates a single flag against a context', async () => {
    installFakeApi([
      flag('beta', false, [
        { clauses: [{ attribute: 'country', operator: 'equal', value: 'CA' }], value: true },
      ]),
    ]);

    const canada = Context.single('user', 'u-1');
    canada.addAttribute(new (await import('@zenmanage/sdk')).Attribute('country', ['CA']));

    const inCanada = await getServerFlag({ ...base, key: 'beta', context: canada });
    const anonymous = await getServerFlag({ ...base, key: 'beta' });

    expect(inCanada.asBool()).toBe(true);
    expect(anonymous.asBool()).toBe(false);
  });

  it('falls back to the default for an unknown flag, and throws without one', async () => {
    installFakeApi([]);

    const fallback = await getServerFlag({ ...base, key: 'missing', defaultValue: 'control' });
    expect(fallback.asString()).toBe('control');

    await expect(getServerFlag({ ...base, key: 'missing' })).rejects.toThrow('Flag not found');
  });

  it('uses the defaults collection when no inline default is given', async () => {
    installFakeApi([]);

    const flagFromDefaults = await getServerFlag({
      ...base,
      key: 'missing',
      defaults: DefaultsCollection.fromObject({ missing: true }),
    });

    expect(flagFromDefaults.asBool()).toBe(true);
  });

  it('serves the default when the API is unreachable', async () => {
    installFakeApi([flag('beta', true)]).goOffline();

    const result = await getServerFlag({ ...base, key: 'beta', defaultValue: false });

    expect(result.asBool()).toBe(false);
  });

  it('loads every flag and supports preloading', async () => {
    installFakeApi([flag('a', true), flag('b', 'x')]);

    const all = await getServerFlags(base);
    const manager = await preloadServerFlags(base);

    expect(all.map((f) => f.getKey()).sort()).toEqual(['a', 'b']);
    expect((await manager.single('b')).asString()).toBe('x');
  });

  describe('getFlagValue', () => {
    it('returns the value as the type of the fallback', async () => {
      installFakeApi([
        flag('on', true),
        flag('limit', 7),
        flag('variant', 'b'),
        flag('theme', { color: 'teal' }),
        flag('list', [1, 2]),
      ]);

      await expect(getFlagValue({ ...base, key: 'on' }, false)).resolves.toBe(true);
      await expect(getFlagValue({ ...base, key: 'limit' }, 0)).resolves.toBe(7);
      await expect(getFlagValue({ ...base, key: 'variant' }, 'a')).resolves.toBe('b');
      await expect(getFlagValue({ ...base, key: 'theme' }, { color: 'plain' })).resolves.toEqual({
        color: 'teal',
      });
      await expect(getFlagValue({ ...base, key: 'list' }, [] as number[])).resolves.toEqual([1, 2]);
    });

    it('uses the fallback as the default for a flag that does not exist', async () => {
      installFakeApi([]);

      await expect(getFlagValue({ ...base, key: 'missing' }, true)).resolves.toBe(true);
      await expect(getFlagValue({ ...base, key: 'missing' }, 7)).resolves.toBe(7);
      await expect(getFlagValue({ ...base, key: 'missing' }, 'fallback')).resolves.toBe('fallback');
      await expect(getFlagValue({ ...base, key: 'missing' }, { color: 'plain' })).resolves.toEqual({
        color: 'plain',
      });
      await expect(getFlagValue({ ...base, key: 'missing' }, [1, 2])).resolves.toEqual([1, 2]);
    });

    it('uses the fallback when the API is unreachable', async () => {
      installFakeApi([flag('on', true)]).goOffline();

      await expect(getFlagValue({ ...base, key: 'on' }, false)).resolves.toBe(false);
      await expect(getFlagValue({ ...base, key: 'theme' }, { color: 'plain' })).resolves.toEqual({
        color: 'plain',
      });
    });

    it('prefers an explicit defaultValue over the fallback, including a falsy one', async () => {
      installFakeApi([]);

      await expect(
        getFlagValue({ ...base, key: 'missing', defaultValue: 'chosen' }, 'fallback')
      ).resolves.toBe('chosen');
      await expect(
        getFlagValue({ ...base, key: 'missing', defaultValue: false }, true)
      ).resolves.toBe(false);
      await expect(getFlagValue({ ...base, key: 'missing', defaultValue: 0 }, 9)).resolves.toBe(0);
    });

    it('prefers an entry in the defaults collection over the fallback', async () => {
      installFakeApi([]);
      const defaults = DefaultsCollection.fromObject({ missing: 'from-collection' });

      await expect(getFlagValue({ ...base, key: 'missing', defaults }, 'fallback')).resolves.toBe(
        'from-collection'
      );
      // The collection has nothing for this key, so the fallback applies.
      await expect(getFlagValue({ ...base, key: 'other', defaults }, 'fallback')).resolves.toBe(
        'fallback'
      );
    });

    it('does not let the fallback change a flag that exists', async () => {
      installFakeApi([flag('on', true)]);

      await expect(getFlagValue({ ...base, key: 'on' }, false)).resolves.toBe(true);
    });

    it('reports the fallback as the default value in the usage report', async () => {
      const api = installFakeApi([flag('on', true)]);

      await getFlagValue({ environmentToken: TOKEN, key: 'on' }, false);

      expect(api.usageReports()).toHaveLength(1);
      expect(JSON.parse(api.usageReports()[0].headers['X-ZEN-DEFAULT-VALUE'])).toEqual({
        on: false,
      });
    });
  });

  describe('client sharing', () => {
    it('fetches the rules once for any number of evaluations', async () => {
      const api = installFakeApi([flag('a', true), flag('b', true), flag('c', true)]);

      await getServerFlag({ ...base, key: 'a' });
      await getServerFlag({ ...base, key: 'b' });
      await getServerFlags(base);
      await getFlagValue({ ...base, key: 'c' }, false);

      expect(api.rulesLoads()).toHaveLength(1);
    });

    it('shares a client between equal configurations only', () => {
      installFakeApi();

      const first = createServerClient(base);

      expect(createServerClient({ ...base })).toBe(first);
      expect(createServerClient({ ...base, cacheTtl: 5 })).not.toBe(first);
      expect(createServerClient({ ...base, apiEndpoint: 'https://api.example.com' })).not.toBe(
        first
      );
      expect(createServerClient({ ...base, enableUsageReporting: true })).not.toBe(first);
      expect(createServerClient({ ...base, environmentToken: 'srv_other' })).not.toBe(first);
    });

    it('keeps separate clients per logger instance', () => {
      installFakeApi();
      const loggerA: Logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
      const loggerB: Logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };

      const withA = createServerClient({ ...base, logger: loggerA });

      expect(createServerClient({ ...base, logger: loggerA })).toBe(withA);
      expect(createServerClient({ ...base, logger: loggerB })).not.toBe(withA);
      expect(createServerClient(base)).not.toBe(withA);
    });

    it('forgets every client when cleared', () => {
      installFakeApi();
      const first = createServerClient(base);

      clearServerClients();

      expect(createServerClient(base)).not.toBe(first);
    });

    it('sends the configured logger to the SDK', async () => {
      installFakeApi([flag('a', true)]);
      const logger: Logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };

      await getServerFlag({ ...base, key: 'a', logger });

      expect(logger.info).toHaveBeenCalled();
    });
  });

  describe('cache TTL', () => {
    it('picks up rule changes once the default TTL has passed, and not before', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-10-10T12:00:00Z'));
      const api = installFakeApi([flag('a', 'v1')]);

      const read = async (): Promise<string> =>
        (await getServerFlag({ ...base, key: 'a' })).asString();

      expect(await read()).toBe('v1');

      api.setFlags([flag('a', 'v2')]);
      vi.setSystemTime(new Date(Date.now() + (DEFAULT_SERVER_CACHE_TTL - 1) * 1000));
      expect(await read()).toBe('v1');

      vi.setSystemTime(new Date(Date.now() + 2000));
      expect(await read()).toBe('v2');
      expect(api.rulesLoads()).toHaveLength(2);
    });

    it('honors an explicit cacheTtl', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-10-10T12:00:00Z'));
      const api = installFakeApi([flag('a', 'v1')]);
      const options = { ...base, key: 'a', cacheTtl: 600 };

      await getServerFlag(options);
      api.setFlags([flag('a', 'v2')]);
      vi.setSystemTime(new Date(Date.now() + 300 * 1000));

      expect((await getServerFlag(options)).asString()).toBe('v1');
    });

    it('does not pin the first rules a manager saw when no context is passed', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-10-10T12:00:00Z'));
      const api = installFakeApi([flag('a', 1)]);

      expect((await createServerManager(base).single('a')).asNumber()).toBe(1);
      api.setFlags([flag('a', 2)]);
      vi.setSystemTime(new Date(Date.now() + (DEFAULT_SERVER_CACHE_TTL + 1) * 1000));

      expect((await createServerManager(base).single('a')).asNumber()).toBe(2);
    });
  });

  describe('createServerRuntime', () => {
    it('returns the client and a manager with the context and defaults applied', async () => {
      installFakeApi([]);
      const context = Context.single('user', 'u-1');

      const runtime = createServerRuntime({
        ...base,
        context,
        defaults: DefaultsCollection.fromObject({ x: 'from-defaults' }),
      });

      expect(runtime.client).toBe(createServerClient(base));
      expect((await runtime.manager.single('x')).asString()).toBe('from-defaults');
    });
  });

  describe('getBootstrapPayload', () => {
    it('packages the evaluated flags', async () => {
      installFakeApi([flag('a', true), flag('b', 'x'), flag('theme', { color: 'teal' })]);

      const payload = await getBootstrapPayload(base);

      expect(payload.version).toBe(1);
      expect(payload.flags).toEqual({ a: true, b: 'x', theme: { color: 'teal' } });
      expect(payload.context).toBeUndefined();
    });

    it('sends only the requested keys', async () => {
      installFakeApi([flag('public', true), flag('internal-kill-switch', true)]);

      const payload = await getBootstrapPayload({ ...base, keys: ['public', 'not-a-flag'] });

      expect(payload.flags).toEqual({ public: true });
    });

    it('evaluates for the context, and includes it only when asked', async () => {
      installFakeApi([
        flag('beta', false, [
          {
            clauses: [{ attribute: 'plan', operator: 'equal', value: 'pro' }],
            value: true,
          },
        ]),
      ]);
      const { Attribute } = await import('@zenmanage/sdk');
      const context = Context.single('user', 'u-1');
      context.addAttribute(new Attribute('plan', ['pro']));

      const without = await getBootstrapPayload({ ...base, context });
      const withContext = await getBootstrapPayload({ ...base, context, includeContext: true });

      expect(without.flags).toEqual({ beta: true });
      expect(without.context).toBeUndefined();
      expect(withContext.context).toMatchObject({ type: 'user', identifier: 'u-1' });
    });
  });
});
