// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { act, waitFor } from '@testing-library/react';
import { NextFlagsProvider } from '../src/client';
import { buildBootstrapPayload, buildBootstrapScript } from '../src/bootstrap';
import { FlagOutput } from './components';
import { flag, installFakeApi } from './fakeApi';

const CLIENT_KEY = 'cli_test_client_key';

/** Hydrates server markup and returns every console.error call React made while doing so. */
async function hydrate(html: string, tree: React.ReactElement): Promise<unknown[][]> {
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);

  const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  await act(async () => {
    hydrateRoot(container, tree, { onRecoverableError: (error) => console.error(error) });
  });
  const calls = [...errors.mock.calls];
  errors.mockRestore();
  return calls;
}

describe('hydration', () => {
  const payload = buildBootstrapPayload({ 'new-checkout': true, limit: 7 });
  const tree = (
    <NextFlagsProvider environmentToken={CLIENT_KEY} bootstrapPayload={payload}>
      <FlagOutput flagKey="new-checkout" fallback={false} id="a" />
      <FlagOutput flagKey="limit" fallback={0} id="b" />
    </NextFlagsProvider>
  );

  it('matches the server markup when the payload is a prop', async () => {
    installFakeApi([flag('new-checkout', true), flag('limit', 7)]);
    const html = renderToString(tree);
    expect(html).toContain('true|ready');

    const errors = await hydrate(html, tree);

    expect(errors).toEqual([]);
    expect(document.getElementById('a')?.textContent).toBe('true|ready');
    await waitFor(() => expect(document.getElementById('b')?.textContent).toBe('7|ready'));
  });

  it('hydrates cleanly, then takes the live value when it differs from the server one', async () => {
    installFakeApi([flag('new-checkout', false), flag('limit', 7)]);
    const html = renderToString(tree);
    expect(html).toContain('<p id="a">true|ready</p>');

    const errors = await hydrate(html, tree);

    expect(errors).toEqual([]);
    await waitFor(() => expect(document.getElementById('a')?.textContent).toBe('false|ready'));
  });

  it('matches the server markup when the payload comes from a script tag', async () => {
    installFakeApi([flag('limit', 7)]);
    const scriptTree = (
      <NextFlagsProvider environmentToken={CLIENT_KEY}>
        <FlagOutput flagKey="limit" fallback={0} id="b" />
      </NextFlagsProvider>
    );
    // The server has no document, so it renders the default. The browser hydrates against
    // that markup first and only then picks the script tag up, instead of mismatching.
    const html = renderToString(scriptTree);
    expect(html).toContain('0|loading');
    document.body.insertAdjacentHTML(
      'beforeend',
      buildBootstrapScript(buildBootstrapPayload({ limit: 5 }))
    );

    const errors = await hydrate(html, scriptTree);

    expect(errors).toEqual([]);
    await waitFor(() => expect(document.getElementById('b')?.textContent).toBe('7|ready'));
  });
});
