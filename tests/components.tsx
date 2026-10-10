import type { ReactElement } from 'react';
import type { FlagValue } from '@zenmanage/sdk';
import { useFlag, useVariant } from '../src/client';

function show(value: unknown): string {
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

/** Renders `<p>value|loading</p>` or `<p>value|ready</p>`, so a test can read both at once. */
export function FlagOutput({
  flagKey,
  fallback,
  id = 'out',
}: {
  flagKey: string;
  fallback: FlagValue;
  id?: string;
}): ReactElement {
  const { value, isLoading } = useFlag(flagKey, fallback);
  return <p id={id}>{`${show(value)}|${isLoading ? 'loading' : 'ready'}`}</p>;
}

export function VariantOutput({
  flagKey,
  fallback,
}: {
  flagKey: string;
  fallback?: string;
}): ReactElement {
  const { variant, isLoading } = useVariant(flagKey, fallback);
  return <p id="variant">{`${variant}|${isLoading ? 'loading' : 'ready'}`}</p>;
}
