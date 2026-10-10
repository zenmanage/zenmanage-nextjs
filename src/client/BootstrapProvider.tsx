import { useEffect, useMemo, useState, type ReactElement, type ReactNode } from 'react';
import type { FlagValue } from '@zenmanage/sdk';
import { useFlagsContext } from '@zenmanage/react';
import { BootstrapContext } from './context';

interface BootstrapProviderProps {
  flags: Record<string, FlagValue> | null;
  children: ReactNode;
}

/**
 * Sits inside `FlagsProvider`. Once the browser has tried to load the rules it records which
 * flags they contain, so `useFlag` can tell "the live value" from "the SDK fell back to the
 * default because nothing loaded".
 */
export function BootstrapProvider({ flags, children }: BootstrapProviderProps): ReactElement {
  const { manager, isReady, revision } = useFlagsContext();
  const [live, setLive] = useState<ReadonlySet<string> | null>(null);

  useEffect(() => {
    if (!flags || !isReady) {
      return undefined;
    }

    let isCurrent = true;

    // The SDK serves defaults instead of throwing when rules can't be loaded, so an empty list
    // is what an unreachable API looks like.
    manager.all().then(
      (loaded) => isCurrent && setLive(new Set(loaded.map((flag) => flag.getKey()))),
      () => isCurrent && setLive(new Set())
    );

    return () => {
      isCurrent = false;
    };
  }, [flags, isReady, manager, revision]);

  const value = useMemo(() => (flags ? { flags, live } : null), [flags, live]);

  return <BootstrapContext.Provider value={value}>{children}</BootstrapContext.Provider>;
}
