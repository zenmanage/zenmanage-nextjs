import { Context, DefaultsCollection, type FlagValue } from '@zenmanage/sdk';
import type {
  BootstrapPayload,
  BuildBootstrapPayloadOptions,
  BuildBootstrapScriptOptions,
} from './types';
import { DEFAULT_BOOTSTRAP_ELEMENT_ID } from './types';

function escapeForScriptTag(value: string): string {
  return value
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function buildBootstrapPayload(
  flags: Record<string, FlagValue>,
  options: BuildBootstrapPayloadOptions = {}
): BootstrapPayload {
  return {
    version: 1,
    generatedAt: (options.generatedAt ?? new Date()).toISOString(),
    flags,
    context: options.context?.toJSON(),
  };
}

export function serializeBootstrapPayload(payload: BootstrapPayload): string {
  return escapeForScriptTag(JSON.stringify(payload));
}

export function deserializeBootstrapPayload(serializedPayload: string): BootstrapPayload | null {
  try {
    const parsed = JSON.parse(serializedPayload) as Partial<BootstrapPayload>;

    if (parsed.version !== 1 || !parsed.flags || typeof parsed.generatedAt !== 'string') {
      return null;
    }

    return parsed as BootstrapPayload;
  } catch {
    return null;
  }
}

export function buildBootstrapScript(
  payload: BootstrapPayload,
  options: BuildBootstrapScriptOptions = {}
): string {
  const elementId = options.elementId ?? DEFAULT_BOOTSTRAP_ELEMENT_ID;
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

  return Context.fromObject(payload.context);
}
