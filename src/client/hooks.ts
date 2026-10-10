import { useContext } from 'react';
import type { FlagValue } from '@zenmanage/sdk';
import {
  useFlag as useReactFlag,
  type UseFlagResult,
  type UseVariantResult,
  type WidenFlagValue,
} from '@zenmanage/react';
import { BootstrapContext } from './context';

function sameKind(candidate: FlagValue, fallback: FlagValue): boolean {
  if (typeof fallback === 'object') {
    return (
      typeof candidate === 'object' &&
      candidate !== null &&
      Array.isArray(candidate) === Array.isArray(fallback)
    );
  }

  return typeof candidate === typeof fallback;
}

/**
 * Like `useFlag` from `@zenmanage/react`, but it serves the value the server evaluated until
 * the browser has a live evaluation to replace it. Both the server render and the first client
 * render use that value, with `isLoading` false, so the page hydrates without a mismatch or a
 * flash of the default. Once the browser's rules load, the live value takes over. If they
 * never load (a blocked CDN, no network), the server's value stays rather than the page
 * switching to the code default.
 *
 * Without a bootstrap value for the key it behaves exactly like the React hook.
 */
export function useFlag<T extends FlagValue>(
  key: string,
  defaultValue: T
): UseFlagResult<WidenFlagValue<T>> {
  const bootstrap = useContext(BootstrapContext);
  // The hook's own default stays the fallback for the live evaluation: reporting the server's
  // value as the code default would corrupt the default-value usage the API records.
  const result = useReactFlag(key, defaultValue);

  const seed = bootstrap?.flags[key];
  if (seed === undefined || !sameKind(seed, defaultValue)) {
    return result;
  }

  const hasLiveValue = bootstrap?.live?.has(key) === true;
  if (hasLiveValue && !result.isLoading) {
    return result;
  }

  return { ...result, value: seed as WidenFlagValue<T>, isLoading: false };
}

export function useVariant(key: string, defaultVariant = 'control'): UseVariantResult {
  const result = useFlag<string>(key, defaultVariant);

  return {
    key,
    variant: result.value,
    flag: result.flag,
    isLoading: result.isLoading,
    error: result.error,
    refresh: result.refresh,
  };
}
