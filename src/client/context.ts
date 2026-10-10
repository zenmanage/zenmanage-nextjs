import { createContext } from 'react';
import type { FlagValue } from '@zenmanage/sdk';

export interface BootstrapState {
  /** The flag values the server evaluated. */
  flags: Record<string, FlagValue>;
  /**
   * The keys the browser's own rules contain, or `null` until it has asked. A flag that is
   * bootstrapped but absent here has no live evaluation behind it (the rules didn't load, or
   * the flag doesn't exist), so the server's value is the best answer there is.
   */
  live: ReadonlySet<string> | null;
}

/** `null` when the provider wasn't given a bootstrap payload. */
export const BootstrapContext = createContext<BootstrapState | null>(null);
