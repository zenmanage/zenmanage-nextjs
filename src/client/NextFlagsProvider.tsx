import { useCallback, useMemo, useRef, useSyncExternalStore, type ReactElement } from 'react';
import { FlagsProvider } from '@zenmanage/react';
import {
  contextFromBootstrapPayload,
  defaultsFromBootstrapPayload,
  deserializeBootstrapPayload,
} from '../bootstrap';
import { mergeDefaults } from '../defaults';
import {
  DEFAULT_BOOTSTRAP_ELEMENT_ID,
  type BootstrapPayload,
  type NextFlagsProviderProps,
} from '../types';
import { BootstrapProvider } from './BootstrapProvider';
import { createProviderClient } from './createClient';

const subscribeToNothing = (): (() => void) => () => undefined;

/**
 * Reads the payload from a `<script>` tag. `useSyncExternalStore` serves `null` while
 * hydrating and the real payload right after, so the first client render matches the server
 * render instead of reading the DOM mid-render.
 */
function useDocumentPayload(elementId: string, enabled: boolean): BootstrapPayload | null {
  const cache = useRef<{ text: string | null; payload: BootstrapPayload | null }>({
    text: null,
    payload: null,
  });

  const getSnapshot = useCallback((): BootstrapPayload | null => {
    if (!enabled || typeof document === 'undefined') {
      return null;
    }

    const text = document.getElementById(elementId)?.textContent ?? null;
    if (text !== cache.current.text) {
      cache.current = { text, payload: text === null ? null : deserializeBootstrapPayload(text) };
    }

    return cache.current.payload;
  }, [elementId, enabled]);

  return useSyncExternalStore(subscribeToNothing, getSnapshot, () => null);
}

export function NextFlagsProvider({
  client,
  environmentToken,
  apiEndpoint,
  cacheTtl,
  enableUsageReporting,
  context,
  defaults,
  bootstrapPayload,
  bootstrapElementId = DEFAULT_BOOTSTRAP_ELEMENT_ID,
  children,
  ...providerProps
}: NextFlagsProviderProps): ReactElement {
  const documentPayload = useDocumentPayload(bootstrapElementId, !bootstrapPayload);
  const payload = bootstrapPayload ?? documentPayload;

  const resolvedClient = useMemo(
    () =>
      client ??
      createProviderClient({ environmentToken, apiEndpoint, cacheTtl, enableUsageReporting }),
    [client, environmentToken, apiEndpoint, cacheTtl, enableUsageReporting]
  );

  const mergedDefaults = useMemo(
    () => mergeDefaults(defaults, defaultsFromBootstrapPayload(payload)),
    [defaults, payload]
  );

  // Without an explicit context the browser evaluates for the user the server evaluated for.
  const resolvedContext = useMemo(
    () => context ?? contextFromBootstrapPayload(payload),
    [context, payload]
  );

  return (
    <FlagsProvider
      {...providerProps}
      client={resolvedClient}
      context={resolvedContext}
      defaults={mergedDefaults}
    >
      <BootstrapProvider flags={payload?.flags ?? null}>{children}</BootstrapProvider>
    </FlagsProvider>
  );
}
