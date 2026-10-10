// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { Attribute, Context, DefaultsCollection, Zenmanage } from '@zenmanage/sdk';
import { version } from '../package.json';
import { NextFlagsProvider, useFlag, useFlagsContext } from '../src/client';
import { buildBootstrapPayload, buildBootstrapScript } from '../src/bootstrap';
import { FlagOutput, VariantOutput } from './components';
import { flag, installFakeApi } from './fakeApi';

const CLIENT_KEY = 'cli_test_client_key';

const out = (id = 'out'): string => document.getElementById(id)?.textContent ?? '';

describe('NextFlagsProvider in the browser', () => {
  it('serves the bootstrapped value straight away, then the live one', async () => {
    installFakeApi([flag('new-checkout', false)]);

    render(
      <NextFlagsProvider
        environmentToken={CLIENT_KEY}
        bootstrapPayload={buildBootstrapPayload({ 'new-checkout': true })}
      >
        <FlagOutput flagKey="new-checkout" fallback={true} />
      </NextFlagsProvider>
    );

    expect(out()).toBe('true|ready');
    await waitFor(() => expect(out()).toBe('false|ready'));
  });

  it('shows the default as loading without a bootstrap, then the live value', async () => {
    installFakeApi([flag('limit', 9)]);

    render(
      <NextFlagsProvider environmentToken={CLIENT_KEY}>
        <FlagOutput flagKey="limit" fallback={1} />
      </NextFlagsProvider>
    );

    expect(out()).toBe('1|loading');
    await waitFor(() => expect(out()).toBe('9|ready'));
  });

  it('keeps the server value when the browser cannot load the rules', async () => {
    // A blocked CDN or no network must not make the page switch from what the server rendered
    // to the code default, which would flip an A/B variant under the visitor.
    const api = installFakeApi([flag('beta', true)]);
    api.goOffline();

    render(
      <NextFlagsProvider
        environmentToken={CLIENT_KEY}
        bootstrapPayload={buildBootstrapPayload({ beta: true })}
      >
        <FlagOutput flagKey="beta" fallback={false} />
      </NextFlagsProvider>
    );

    expect(out()).toBe('true|ready');
    await waitFor(() => expect(api.rulesLoads().length).toBeGreaterThanOrEqual(2));
    await act(async () => undefined);
    expect(out()).toBe('true|ready');
  });

  it('shows the hook default when nothing loads and there is no server value', async () => {
    const api = installFakeApi([flag('beta', true)]);
    api.goOffline();

    render(
      <NextFlagsProvider environmentToken={CLIENT_KEY}>
        <FlagOutput flagKey="beta" fallback={false} />
      </NextFlagsProvider>
    );

    await waitFor(() => expect(out()).toBe('false|ready'));
  });

  it('keeps the server value for a flag the browser rules do not contain', async () => {
    installFakeApi([flag('other', 1)]);

    render(
      <NextFlagsProvider
        environmentToken={CLIENT_KEY}
        bootstrapPayload={buildBootstrapPayload({ beta: true })}
      >
        <FlagOutput flagKey="beta" fallback={false} id="beta" />
        <FlagOutput flagKey="other" fallback={0} id="other" />
      </NextFlagsProvider>
    );

    await waitFor(() => expect(out('other')).toBe('1|ready'));
    expect(out('beta')).toBe('true|ready');
  });

  it('reports the hook default, not the bootstrapped value, as the flag default', async () => {
    const api = installFakeApi([flag('beta', true)]);

    render(
      <NextFlagsProvider
        environmentToken={CLIENT_KEY}
        bootstrapPayload={buildBootstrapPayload({ beta: 'server-value' })}
      >
        <FlagOutput flagKey="beta" fallback={false} />
      </NextFlagsProvider>
    );

    await waitFor(() => expect(api.usageReports().length).toBeGreaterThan(0));
    for (const report of api.usageReports()) {
      expect(JSON.parse(report.headers['X-ZEN-DEFAULT-VALUE'])).toEqual({ beta: false });
    }
  });

  it('identifies as zenmanage-nextjs and sends the client key', async () => {
    const api = installFakeApi([flag('a', true)]);

    render(
      <NextFlagsProvider environmentToken={CLIENT_KEY}>
        <FlagOutput flagKey="a" fallback={false} />
      </NextFlagsProvider>
    );

    await waitFor(() => expect(out()).toBe('true|ready'));
    expect(api.rulesLoads()).toHaveLength(1);
    expect(api.rulesLoads()[0].headers).toMatchObject({
      'X-ZEN-CLIENT-AGENT': `zenmanage-nextjs/${version}`,
      'X-ZEN-API-KEY': CLIENT_KEY,
    });
  });

  it('passes the endpoint, cache TTL and usage reporting setting to the client', async () => {
    const api = installFakeApi([flag('a', true)]);

    render(
      <NextFlagsProvider
        environmentToken={CLIENT_KEY}
        apiEndpoint="https://api.example.test"
        cacheTtl={30}
        enableUsageReporting={false}
      >
        <FlagOutput flagKey="a" fallback={false} />
      </NextFlagsProvider>
    );

    await waitFor(() => expect(out()).toBe('true|ready'));
    expect(api.rulesLoads()[0].url).toBe('https://api.example.test/v1/flag-json');
    expect(api.usageReports()).toHaveLength(0);
  });

  it('refuses a server key', () => {
    installFakeApi();

    expect(() =>
      render(
        <NextFlagsProvider environmentToken="srv_secret">
          <FlagOutput flagKey="a" fallback={false} />
        </NextFlagsProvider>
      )
    ).toThrow('server key (srv_...)');
  });

  it('uses a client it is given', async () => {
    const api = installFakeApi([flag('a', 'live')]);
    const client = new Zenmanage({ environmentToken: CLIENT_KEY, clientAgent: 'my-agent' });

    render(
      <NextFlagsProvider client={client}>
        <FlagOutput flagKey="a" fallback="none" />
      </NextFlagsProvider>
    );

    await waitFor(() => expect(out()).toBe('live|ready'));
    expect(api.rulesLoads()[0].headers['X-ZEN-CLIENT-AGENT']).toMatch(/^my-agent\//);
  });

  describe('context', () => {
    const beta = flag('beta', false, [
      { clauses: [{ attribute: 'plan', operator: 'equal', value: 'pro' }], value: true },
    ]);

    const proContext = (): Context =>
      Context.single('user', 'u-1').addAttribute(new Attribute('plan', ['pro']));

    it('evaluates for the user the server evaluated for', async () => {
      installFakeApi([beta]);

      render(
        <NextFlagsProvider
          environmentToken={CLIENT_KEY}
          bootstrapPayload={buildBootstrapPayload({ beta: true }, { context: proContext() })}
        >
          <FlagOutput flagKey="beta" fallback={false} />
        </NextFlagsProvider>
      );

      await waitFor(() => expect(out()).toBe('true|ready'));
    });

    it('lets an explicit context win over the bootstrapped one', async () => {
      installFakeApi([beta]);

      render(
        <NextFlagsProvider
          environmentToken={CLIENT_KEY}
          context={Context.single('user', 'u-2')}
          bootstrapPayload={buildBootstrapPayload({ beta: true }, { context: proContext() })}
        >
          <FlagOutput flagKey="beta" fallback={false} />
        </NextFlagsProvider>
      );

      await waitFor(() => expect(out()).toBe('false|ready'));
    });
  });

  describe('bootstrap from a script tag', () => {
    it('reads the payload from the default element', async () => {
      installFakeApi([flag('limit', 2)]);
      document.body.insertAdjacentHTML(
        'beforeend',
        buildBootstrapScript(buildBootstrapPayload({ limit: 5 }))
      );

      render(
        <NextFlagsProvider environmentToken={CLIENT_KEY}>
          <FlagOutput flagKey="limit" fallback={0} />
        </NextFlagsProvider>
      );

      expect(out()).toBe('5|ready');
      await waitFor(() => expect(out()).toBe('2|ready'));
    });

    it('reads a custom element id', () => {
      installFakeApi();
      document.body.insertAdjacentHTML(
        'beforeend',
        buildBootstrapScript(buildBootstrapPayload({ limit: 5 }), { elementId: 'my-flags' })
      );

      render(
        <NextFlagsProvider environmentToken={CLIENT_KEY} bootstrapElementId="my-flags">
          <FlagOutput flagKey="limit" fallback={0} />
        </NextFlagsProvider>
      );

      expect(out()).toBe('5|ready');
    });

    it('prefers the bootstrapPayload prop over the element', () => {
      installFakeApi();
      document.body.insertAdjacentHTML(
        'beforeend',
        buildBootstrapScript(buildBootstrapPayload({ limit: 5 }))
      );

      render(
        <NextFlagsProvider
          environmentToken={CLIENT_KEY}
          bootstrapPayload={buildBootstrapPayload({ limit: 8 })}
        >
          <FlagOutput flagKey="limit" fallback={0} />
        </NextFlagsProvider>
      );

      expect(out()).toBe('8|ready');
    });

    it('falls back to the default when the element is absent or unreadable', () => {
      installFakeApi();
      document.body.insertAdjacentHTML(
        'beforeend',
        '<script id="__ZENMANAGE_BOOTSTRAP__" type="application/json">{oops</script>'
      );

      render(
        <NextFlagsProvider environmentToken={CLIENT_KEY}>
          <FlagOutput flagKey="limit" fallback={3} />
        </NextFlagsProvider>
      );

      expect(out()).toBe('3|loading');
    });
  });

  describe('defaults', () => {
    it('passes explicit defaults to the manager, winning over the bootstrap', async () => {
      installFakeApi([]);
      let manager: ReturnType<typeof useFlagsContext>['manager'] | undefined;

      function Probe(): null {
        manager = useFlagsContext().manager;
        return null;
      }

      render(
        <NextFlagsProvider
          environmentToken={CLIENT_KEY}
          defaults={DefaultsCollection.fromObject({ shared: 'explicit' })}
          bootstrapPayload={buildBootstrapPayload({ shared: 'bootstrap', only: 'boot' })}
        >
          <Probe />
        </NextFlagsProvider>
      );

      await act(async () => undefined);
      expect((await manager!.single('shared')).asString()).toBe('explicit');
      expect((await manager!.single('only')).asString()).toBe('boot');
    });
  });

  describe('hooks', () => {
    it('useVariant reads the bootstrapped variant', () => {
      installFakeApi();

      render(
        <NextFlagsProvider
          environmentToken={CLIENT_KEY}
          bootstrapPayload={buildBootstrapPayload({ experiment: 'b' })}
        >
          <VariantOutput flagKey="experiment" />
        </NextFlagsProvider>
      );

      expect(out('variant')).toBe('b|ready');
    });

    it('useVariant defaults to control', () => {
      installFakeApi();

      render(
        <NextFlagsProvider environmentToken={CLIENT_KEY}>
          <VariantOutput flagKey="experiment" />
        </NextFlagsProvider>
      );

      expect(out('variant')).toBe('control|loading');
    });

    it('follows a changed key', async () => {
      installFakeApi([flag('a', 'live-a'), flag('b', 'live-b')]);
      const tree = (flagKey: string) => (
        <NextFlagsProvider
          environmentToken={CLIENT_KEY}
          bootstrapPayload={buildBootstrapPayload({ a: 'boot-a' })}
        >
          <FlagOutput flagKey={flagKey} fallback="none" />
        </NextFlagsProvider>
      );

      const { rerender } = render(tree('a'));
      await waitFor(() => expect(out()).toBe('live-a|ready'));

      rerender(tree('b'));
      await waitFor(() => expect(out()).toBe('live-b|ready'));
    });

    it('throws outside a provider', () => {
      function Orphan(): null {
        useFlag('a', false);
        return null;
      }

      expect(() => render(<Orphan />)).toThrow();
      expect(screen.queryByText('a')).toBeNull();
    });
  });
});
