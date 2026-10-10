import { describe, expect, it, beforeEach, vi } from 'vitest';

const manager = {
  withContext: vi.fn(),
  withDefaults: vi.fn(),
  single: vi.fn(),
  all: vi.fn(),
};

const createdConfigs: Array<Record<string, unknown>> = [];

vi.mock('@zenmanage/sdk', () => {
  class MockConfigBuilder {
    private config: Record<string, unknown> = {};

    static create(): MockConfigBuilder {
      return new MockConfigBuilder();
    }

    withEnvironmentToken(token: string): this {
      this.config.environmentToken = token;
      return this;
    }

    withApiEndpoint(endpoint: string): this {
      this.config.apiEndpoint = endpoint;
      return this;
    }

    withCacheTtl(ttl: number): this {
      this.config.cacheTtl = ttl;
      return this;
    }

    withUsageReporting(enabled: boolean): this {
      this.config.enableUsageReporting = enabled;
      return this;
    }

    withLogger(logger: unknown): this {
      this.config.logger = logger;
      return this;
    }

    build(): Record<string, unknown> {
      return this.config;
    }
  }

  class MockDefaultsCollection {
    private values = new Map<string, string | number | boolean>();

    static fromObject(obj: Record<string, string | number | boolean>): MockDefaultsCollection {
      const collection = new MockDefaultsCollection();
      for (const [key, value] of Object.entries(obj)) {
        collection.set(key, value);
      }
      return collection;
    }

    set(key: string, value: string | number | boolean): this {
      this.values.set(key, value);
      return this;
    }

    get(key: string): string | number | boolean | undefined {
      return this.values.get(key);
    }

    keys(): string[] {
      return Array.from(this.values.keys());
    }
  }

  class MockZenmanage {
    constructor(config: Record<string, unknown>) {
      createdConfigs.push(config);
    }

    flags() {
      return manager;
    }
  }

  return {
    ConfigBuilder: MockConfigBuilder,
    DefaultsCollection: MockDefaultsCollection,
    Zenmanage: MockZenmanage,
  };
});

import {
  contextWithDefaults,
  createServerClient,
  createServerManager,
  getFlagValue,
  getServerFlag,
  getServerFlags,
  mergeDefaults,
  preloadServerFlags,
} from '../src/server';

describe('server helpers', () => {
  beforeEach(() => {
    createdConfigs.length = 0;
    manager.withContext.mockReset().mockImplementation(() => manager);
    manager.withDefaults.mockReset().mockImplementation(() => manager);
    manager.single.mockReset();
    manager.all.mockReset();
  });

  it('creates a server client with mapped config values', () => {
    createServerClient({
      environmentToken: 'srv_test_key',
      apiEndpoint: 'https://api.example.com',
      cacheTtl: 120,
      enableUsageReporting: false,
      logger: console,
    });

    expect(createdConfigs[0]).toMatchObject({
      environmentToken: 'srv_test_key',
      apiEndpoint: 'https://api.example.com',
      cacheTtl: 120,
      enableUsageReporting: false,
      logger: console,
    });
  });

  it('creates a manager and applies context/defaults when present', () => {
    const context = { type: 'user', identifier: 'u-1' };
    const defaults = { keys: () => ['f1'], get: () => true };

    createServerManager({
      environmentToken: 'srv_test_key',
      context: context as never,
      defaults: defaults as never,
    });

    expect(manager.withContext).toHaveBeenCalledWith(context);
    expect(manager.withDefaults).toHaveBeenCalledWith(defaults);
  });

  it('loads a single server flag', async () => {
    const resolvedFlag = { asBool: () => true };
    manager.single.mockResolvedValue(resolvedFlag);

    const result = await getServerFlag({
      environmentToken: 'srv_test_key',
      key: 'new-checkout',
      defaultValue: false,
    });

    expect(manager.single).toHaveBeenCalledWith('new-checkout', false);
    expect(result).toBe(resolvedFlag);
  });

  it('loads all server flags and supports preload', async () => {
    manager.all.mockResolvedValue([{ key: 'a' }]);

    const allFlags = await getServerFlags({ environmentToken: 'srv_test_key' });
    const preloadedManager = await preloadServerFlags({ environmentToken: 'srv_test_key' });

    expect(allFlags).toEqual([{ key: 'a' }]);
    expect(preloadedManager).toBe(manager);
    expect(manager.all).toHaveBeenCalledTimes(2);
  });

  it('returns correctly typed values with getFlagValue', async () => {
    manager.single.mockResolvedValue({
      asBool: () => true,
      asNumber: () => 7,
      asString: () => 'variant-b',
    });

    await expect(
      getFlagValue({ environmentToken: 'srv_test_key', key: 'f1', defaultValue: false }, false)
    ).resolves.toBe(true);

    await expect(
      getFlagValue({ environmentToken: 'srv_test_key', key: 'f2', defaultValue: 0 }, 0)
    ).resolves.toBe(7);

    await expect(
      getFlagValue(
        { environmentToken: 'srv_test_key', key: 'f3', defaultValue: 'control' },
        'control'
      )
    ).resolves.toBe('variant-b');
  });

  it('merges defaults with base taking precedence', () => {
    const base = contextWithDefaults(undefined, { a: true, b: 'base' }).defaults;
    const bootstrap = contextWithDefaults(undefined, { b: 'bootstrap', c: 9 }).defaults;

    const merged = mergeDefaults(base, bootstrap);

    expect(merged?.get('a')).toBe(true);
    expect(merged?.get('b')).toBe('base');
    expect(merged?.get('c')).toBe(9);
  });

  it('creates defaults collections with preserved context', () => {
    const context = { type: 'organization', identifier: 'org-1' };
    const result = contextWithDefaults(context as never, { rollout: true });

    expect(result.context).toBe(context);
    expect(result.defaults.get('rollout')).toBe(true);
  });
});
