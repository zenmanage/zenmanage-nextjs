import { describe, expect, it } from 'vitest';
import * as root from '../src/index';
import * as server from '../src/server';
import * as middleware from '../src/middleware';

describe('package entry points', () => {
  it('exports the public API from the root', () => {
    expect(Object.keys(root).sort()).toEqual(
      [
        'DEFAULT_BOOTSTRAP_ELEMENT_ID',
        'DEFAULT_SERVER_CACHE_TTL',
        'buildBootstrapPayload',
        'buildBootstrapScript',
        'buildContextFromRequest',
        'clearServerClients',
        'contextFromBootstrapPayload',
        'createServerClient',
        'createServerManager',
        'createServerRuntime',
        'defaultsFromBootstrapDocument',
        'defaultsFromBootstrapPayload',
        'deserializeBootstrapPayload',
        'evaluateMiddlewareFlag',
        'getBootstrapPayload',
        'getFlagValue',
        'getServerFlag',
        'getServerFlags',
        'mergeDefaults',
        'preloadServerFlags',
        'readBootstrapPayloadFromDocument',
        'serializeBootstrapPayload',
      ].sort()
    );
  });

  it('exposes the same functions from the sub-path entry points', () => {
    expect(server.getServerFlag).toBe(root.getServerFlag);
    expect(server.getBootstrapPayload).toBe(root.getBootstrapPayload);
    expect(middleware.evaluateMiddlewareFlag).toBe(root.evaluateMiddlewareFlag);
    expect(middleware.buildContextFromRequest).toBe(root.buildContextFromRequest);
  });

  it('keeps client-only code out of the server and root entry points', () => {
    for (const name of ['NextFlagsProvider', 'useFlag', 'useVariant']) {
      expect(root).not.toHaveProperty(name);
      expect(server).not.toHaveProperty(name);
    }
  });
});
