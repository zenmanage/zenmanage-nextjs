import {
  ConfigBuilder,
  DefaultsCollection,
  Zenmanage,
  type Context,
  type Flag,
  type FlagManager,
  type FlagValue,
} from '@zenmanage/sdk';
import type {
  NextZenmanageClientOptions,
  NextFlagsRuntime,
  ServerFlagInput,
  ServerFlagsInput,
} from './types';

function applyCommonConfig(
  options: NextZenmanageClientOptions,
  builder: ConfigBuilder
): ConfigBuilder {
  builder.withEnvironmentToken(options.environmentToken);

  if (options.apiEndpoint) {
    builder.withApiEndpoint(options.apiEndpoint);
  }

  if (typeof options.cacheTtl === 'number') {
    builder.withCacheTtl(options.cacheTtl);
  }

  if (typeof options.enableUsageReporting === 'boolean') {
    builder.withUsageReporting(options.enableUsageReporting);
  }

  if (options.logger) {
    builder.withLogger(options.logger);
  }

  return builder;
}

export function createServerClient(options: NextZenmanageClientOptions): Zenmanage {
  const builder = applyCommonConfig(options, ConfigBuilder.create());
  return new Zenmanage(builder.build());
}

export function createServerRuntime(options: ServerFlagsInput): NextFlagsRuntime {
  const client = createServerClient(options);
  let manager = client.flags();

  if (options.context) {
    manager = manager.withContext(options.context);
  }

  if (options.defaults) {
    manager = manager.withDefaults(options.defaults);
  }

  return { client, manager };
}

export function createServerManager(options: ServerFlagsInput): FlagManager {
  return createServerRuntime(options).manager;
}

export async function getServerFlag(input: ServerFlagInput): Promise<Flag> {
  const manager = createServerManager(input);
  return manager.single(input.key, input.defaultValue);
}

export async function getServerFlags(input: ServerFlagsInput): Promise<Flag[]> {
  const manager = createServerManager(input);
  return manager.all();
}

export async function preloadServerFlags(input: ServerFlagsInput): Promise<FlagManager> {
  const manager = createServerManager(input);
  await manager.all();
  return manager;
}

export async function getFlagValue<T extends FlagValue>(
  input: ServerFlagInput,
  fallback: T
): Promise<T> {
  const flag = await getServerFlag(input);

  if (typeof fallback === 'boolean') {
    return flag.asBool() as T;
  }

  if (typeof fallback === 'number') {
    return flag.asNumber() as T;
  }

  return flag.asString() as T;
}

export function mergeDefaults(
  base?: DefaultsCollection,
  bootstrap?: DefaultsCollection
): DefaultsCollection | undefined {
  if (!base && !bootstrap) {
    return undefined;
  }

  const merged = new DefaultsCollection();

  if (bootstrap) {
    for (const key of bootstrap.keys()) {
      const value = bootstrap.get(key);
      if (value !== undefined) {
        merged.set(key, value);
      }
    }
  }

  if (base) {
    for (const key of base.keys()) {
      const value = base.get(key);
      if (value !== undefined) {
        merged.set(key, value);
      }
    }
  }

  return merged;
}

export function contextWithDefaults(
  context: Context | undefined,
  defaults: Record<string, FlagValue>
): { context?: Context; defaults: DefaultsCollection } {
  const collection = DefaultsCollection.fromObject(defaults);
  return { context, defaults: collection };
}
