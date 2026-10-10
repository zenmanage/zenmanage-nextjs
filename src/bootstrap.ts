import {
  Context,
  DefaultsCollection,
  type ContextData,
  type Flag,
  type FlagValue,
} from '@zenmanage/sdk';
import type {
  BootstrapPayload,
  BuildBootstrapPayloadOptions,
  BuildBootstrapScriptOptions,
} from './types';
import { DEFAULT_BOOTSTRAP_ELEMENT_ID } from './types';

const ELEMENT_ID_PATTERN = /^[A-Za-z_][\w:.-]*$/;

function escapeForScriptTag(value: string): string {
  return value
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFlagValue(value: unknown): value is FlagValue {
  return (
    typeof value === 'boolean' ||
    typeof value === 'string' ||
    (typeof value === 'number' && Number.isFinite(value)) ||
    (typeof value === 'object' && value !== null)
  );
}

/**
 * Builds the payload `NextFlagsProvider` reads. Accepts the flags straight from
 * `getServerFlags`, or a plain `{ key: value }` record.
 */
export function buildBootstrapPayload(
  flags: Flag[] | Record<string, FlagValue>,
  options: BuildBootstrapPayloadOptions = {}
): BootstrapPayload {
  const values = Array.isArray(flags)
    ? Object.fromEntries(flags.map((flag) => [flag.getKey(), flag.getValue()]))
    : flags;

  // `context` is left out rather than set to undefined: Next.js refuses undefined in the props
  // `getServerSideProps` returns, and this payload is meant to be passed there.
  return {
    version: 1,
    generatedAt: (options.generatedAt ?? new Date()).toISOString(),
    flags: values,
    ...(options.context ? { context: options.context.toJSON() } : {}),
  };
}

export function serializeBootstrapPayload(payload: BootstrapPayload): string {
  return escapeForScriptTag(JSON.stringify(payload));
}

export function deserializeBootstrapPayload(serializedPayload: string): BootstrapPayload | null {
  try {
    const parsed: unknown = JSON.parse(serializedPayload);

    if (
      !isPlainObject(parsed) ||
      parsed.version !== 1 ||
      !isPlainObject(parsed.flags) ||
      typeof parsed.generatedAt !== 'string'
    ) {
      return null;
    }

    const flags = Object.fromEntries(
      Object.entries(parsed.flags).filter(([, value]) => isFlagValue(value))
    ) as Record<string, FlagValue>;

    return {
      version: 1,
      generatedAt: parsed.generatedAt,
      flags,
      ...(isPlainObject(parsed.context)
        ? { context: parsed.context as unknown as ContextData }
        : {}),
    };
  } catch {
    return null;
  }
}

/**
 * Renders the payload as a JSON `<script>` tag for pages that can't pass props to the provider.
 * Prefer the `bootstrapPayload` prop: only a prop is identical on the server and in the browser.
 */
export function buildBootstrapScript(
  payload: BootstrapPayload,
  options: BuildBootstrapScriptOptions = {}
): string {
  const elementId = options.elementId ?? DEFAULT_BOOTSTRAP_ELEMENT_ID;

  if (!ELEMENT_ID_PATTERN.test(elementId)) {
    throw new Error(`Invalid bootstrap element id "${elementId}".`);
  }

  const serialized = serializeBootstrapPayload(payload);
  return `<script id="${elementId}" type="application/json">${serialized}</script>`;
}

export function readBootstrapPayloadFromDocument(
  elementId = DEFAULT_BOOTSTRAP_ELEMENT_ID
): BootstrapPayload | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const element = document.getElementById(elementId);
  if (!element) {
    return null;
  }

  const text = element.textContent ?? '';
  return deserializeBootstrapPayload(text);
}

export function defaultsFromBootstrapPayload(
  payload: BootstrapPayload | null | undefined
): DefaultsCollection | undefined {
  if (!payload) {
    return undefined;
  }

  return DefaultsCollection.fromObject(payload.flags);
}

export function defaultsFromBootstrapDocument(
  elementId = DEFAULT_BOOTSTRAP_ELEMENT_ID
): DefaultsCollection | undefined {
  return defaultsFromBootstrapPayload(readBootstrapPayloadFromDocument(elementId));
}

export function contextFromBootstrapPayload(
  payload: BootstrapPayload | null | undefined
): Context | undefined {
  if (!payload?.context) {
    return undefined;
  }

  try {
    return Context.fromObject(payload.context);
  } catch {
    return undefined;
  }
}
