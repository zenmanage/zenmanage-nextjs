import {
  ConfigBuilder,
  DefaultsCollection,
  Zenmanage,
  type Flag,
  type FlagManager,
  type FlagValue,
  type Logger,
} from '@zenmanage/sdk';
import { buildBootstrapPayload } from './bootstrap';
import { CLIENT_AGENT, PACKAGE_VERSION } from './identity';
import {
  DEFAULT_SERVER_CACHE_TTL,
  type BootstrapPayload,
  type NextFlagsRuntime,
  type NextZenmanageClientOptions,
  type ServerBootstrapInput,
  type ServerFlagInput,
  type ServerFlagsInput,
  type WidenFlagValue,
} from './types';

export { mergeDefaults } from './defaults';

function buildClient(options: NextZenmanageClientOptions): Zenmanage {
  const builder = ConfigBuilder.create()
    .withEnvironmentToken(options.environmentToken)
    .withClientAgent(CLIENT_AGENT)
    .withSdkVersion(PACKAGE_VERSION)
    .withCacheTtl(options.cacheTtl ?? DEFAULT_SERVER_CACHE_TTL);

  if (options.apiEndpoint) {
    builder.withApiEndpoint(options.apiEndpoint);
  }

  if (typeof options.enableUsageReporting === 'boolean') {
    builder.withUsageReporting(options.enableUsageReporting);
  }

  if (options.logger) {
    builder.withLogger(options.logger);
  }

  return new Zenmanage(builder.build());
}

// A client owns the rules cache, so building one per call would refetch the rules for every
// flag on every request. Clients are shared per configuration instead, for the life of the
// server process (or edge isolate). Loggers are compared by identity, hence the WeakMap.
const clientsWithoutLogger = new Map<string, Zenmanage>();
let clientsByLogger = new WeakMap<Logger, Map<string, Zenmanage>>();

function configurationKey(options: NextZenmanageClientOptions): string {
  return JSON.stringify([
    options.environmentToken,
    options.apiEndpoint ?? null,
    options.cacheTtl ?? null,
    options.enableUsageReporting ?? null,
  ]);
}

/**
 * Returns the client for this configuration, creating it on first use. Calls with the same
 * token, endpoint, TTL, usage setting and logger share one client and so one rules cache.
 */
export function createServerClient(options: NextZenmanageClientOptions): Zenmanage {
  let clients = clientsWithoutLogger;

  if (options.logger) {
    clients = clientsByLogger.get(options.logger) ?? new Map<string, Zenmanage>();
    clientsByLogger.set(options.logger, clients);
  }

  const key = configurationKey(options);
  let client = clients.get(key);

  if (!client) {
    client = buildClient(options);
    clients.set(key, client);
  }

  return client;
}

/** Forgets every shared client, and with them their cached rules. Mostly useful in tests. */
export function clearServerClients(): void {
  clientsWithoutLogger.clear();
  clientsByLogger = new WeakMap();
}

export function createServerRuntime(options: ServerFlagsInput): NextFlagsRuntime {
  const client = createServerClient(options);

  // A manager loads its rules once and keeps them, whatever the cache TTL. Handing out the
  // client's own manager would pin the first rules it saw for the life of the process, so
  // every call gets a copy that reads the shared cache (and so honors the TTL) instead.
  let manager = client.flags().withDefaults(options.defaults ?? new DefaultsCollection());

  if (options.context) {
    manager = manager.withContext(options.context);
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

/**
 * Evaluates a flag and returns its value as the type of `fallback`: a boolean, number or
 * string, or a JSON object or array. A literal fallback (`'control'`, `false`) gives the
 * widened type (`string`, `boolean`), so the result can be compared with other values.
 *
 * `fallback` is also the default, for a flag that doesn't exist or when the API can't be
 * reached. A `defaultValue` in `input`, or an entry for the key in `input.defaults`, is more
 * specific and wins over it.
 */
export async function getFlagValue<T extends FlagValue>(
  input: ServerFlagInput,
  fallback: T
): Promise<WidenFlagValue<T>> {
  // The SDK prefers an inline default over a defaults collection, so the fallback only goes in
  // when nothing else would supply one. Otherwise it would override the collection's entry.
  const hasOwnDefault = input.defaultValue !== undefined || input.defaults?.has(input.key) === true;
  const flag = await getServerFlag(hasOwnDefault ? input : { ...input, defaultValue: fallback });

  if (typeof fallback === 'boolean') {
    return flag.asBool() as WidenFlagValue<T>;
  }

  if (typeof fallback === 'number') {
    return flag.asNumber() as WidenFlagValue<T>;
  }

  if (typeof fallback === 'string') {
    return flag.asString() as WidenFlagValue<T>;
  }

  return flag.asJson() as WidenFlagValue<T>;
}

/**
 * Evaluates flags on the server and packages them for `NextFlagsProvider`. Pass `keys` to
 * send only the flags client components read.
 */
export async function getBootstrapPayload(input: ServerBootstrapInput): Promise<BootstrapPayload> {
  const flags = await getServerFlags(input);
  const wanted = input.keys ? new Set(input.keys) : null;

  return buildBootstrapPayload(
    flags.filter((flag) => wanted === null || wanted.has(flag.getKey())),
    { context: input.includeContext ? input.context : undefined }
  );
}
