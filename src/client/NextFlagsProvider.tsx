'use client';

import { useMemo } from 'react';
import { FlagsProvider } from '@zenmanage/react';
import { defaultsFromBootstrapDocument, defaultsFromBootstrapPayload } from '../bootstrap';
import { mergeDefaults } from '../server';
import type { NextFlagsProviderProps } from '../types';

export function NextFlagsProvider({
  defaults,
  bootstrapPayload,
  bootstrapElementId,
  children,
  ...providerProps
}: NextFlagsProviderProps): JSX.Element {
  const hydratedDefaults = useMemo(() => {
    if (bootstrapPayload) {
      return defaultsFromBootstrapPayload(bootstrapPayload);
    }

    return defaultsFromBootstrapDocument(bootstrapElementId);
  }, [bootstrapPayload, bootstrapElementId]);

  const mergedDefaults = useMemo(
    () => mergeDefaults(defaults, hydratedDefaults),
    [defaults, hydratedDefaults]
  );

  return (
    <FlagsProvider {...providerProps} defaults={mergedDefaults}>
      {children}
    </FlagsProvider>
  );
}
