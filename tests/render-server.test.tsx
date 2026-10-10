import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { Zenmanage, ConfigBuilder } from '@zenmanage/sdk';
import { NextFlagsProvider } from '../src/client';
import { buildBootstrapPayload } from '../src/bootstrap';
import { FlagOutput, VariantOutput } from './components';
import { installFakeApi } from './fakeApi';

const CLIENT_KEY = 'cli_test_client_key';
const payload = buildBootstrapPayload({
  'new-checkout': true,
  limit: 7,
  theme: { color: 'teal' },
  variant: 'b',
});

describe('rendering NextFlagsProvider on the server', () => {
  it('renders with a client key, which @zenmanage/sdk itself refuses in Node.js', () => {
    expect(() => ConfigBuilder.create().withEnvironmentToken(CLIENT_KEY).build()).toThrow(
      'Invalid environment token for Node.js runtime'
    );

    expect(() =>
      renderToString(
        <NextFlagsProvider environmentToken={CLIENT_KEY}>
          <FlagOutput flagKey="new-checkout" fallback={false} />
        </NextFlagsProvider>
      )
    ).not.toThrow();
  });

  it('renders the values the server evaluated, as ready, for every value type', () => {
    const html = renderToString(
      <NextFlagsProvider environmentToken={CLIENT_KEY} bootstrapPayload={payload}>
        <FlagOutput flagKey="new-checkout" fallback={false} id="bool" />
        <FlagOutput flagKey="limit" fallback={0} id="num" />
        <FlagOutput flagKey="theme" fallback={{ color: 'plain' }} id="json" />
        <VariantOutput flagKey="variant" fallback="control" />
      </NextFlagsProvider>
    );

    expect(html).toContain('<p id="bool">true|ready</p>');
    expect(html).toContain('<p id="num">7|ready</p>');
    expect(html).toContain('<p id="json">{&quot;color&quot;:&quot;teal&quot;}|ready</p>');
    expect(html).toContain('<p id="variant">b|ready</p>');
  });

  it('renders the default as loading when there is nothing to bootstrap from', () => {
    const html = renderToString(
      <NextFlagsProvider environmentToken={CLIENT_KEY}>
        <FlagOutput flagKey="new-checkout" fallback={false} />
      </NextFlagsProvider>
    );

    expect(html).toContain('<p id="out">false|loading</p>');
  });

  it('ignores a bootstrapped value of a different type than the hook asks for', () => {
    const html = renderToString(
      <NextFlagsProvider environmentToken={CLIENT_KEY} bootstrapPayload={payload}>
        <FlagOutput flagKey="new-checkout" fallback="off" id="a" />
        <FlagOutput flagKey="theme" fallback={['x']} id="b" />
        <FlagOutput flagKey="limit" fallback={{ n: 1 }} id="c" />
        <FlagOutput flagKey="absent" fallback={true} id="d" />
      </NextFlagsProvider>
    );

    expect(html).toContain('<p id="a">off|loading</p>');
    expect(html).toContain('<p id="b">[&quot;x&quot;]|loading</p>');
    expect(html).toContain('<p id="c">{&quot;n&quot;:1}|loading</p>');
    expect(html).toContain('<p id="d">true|loading</p>');
  });

  it('makes no requests while rendering', () => {
    const api = installFakeApi();

    renderToString(
      <NextFlagsProvider environmentToken={CLIENT_KEY} bootstrapPayload={payload}>
        <FlagOutput flagKey="new-checkout" fallback={false} />
      </NextFlagsProvider>
    );

    expect(api.requests).toHaveLength(0);
  });

  it('refuses a server key, which would be written into the page', () => {
    expect(() =>
      renderToString(
        <NextFlagsProvider environmentToken="srv_secret">
          <FlagOutput flagKey="a" fallback={false} />
        </NextFlagsProvider>
      )
    ).toThrow('server key (srv_...)');
  });

  it.each(['mob_mobile_key', 'garbage'])('refuses the key %s', (token) => {
    expect(() =>
      renderToString(
        <NextFlagsProvider environmentToken={token}>
          <FlagOutput flagKey="a" fallback={false} />
        </NextFlagsProvider>
      )
    ).toThrow('needs a client key (cli_...)');
  });

  it('needs a token or a client', () => {
    expect(() =>
      renderToString(
        <NextFlagsProvider>
          <FlagOutput flagKey="a" fallback={false} />
        </NextFlagsProvider>
      )
    ).toThrow('requires either a client or an environmentToken');
  });

  it('accepts a ready-made client in place of a token', () => {
    const client = new Zenmanage({ environmentToken: CLIENT_KEY });

    const html = renderToString(
      <NextFlagsProvider client={client} bootstrapPayload={payload}>
        <FlagOutput flagKey="limit" fallback={0} />
      </NextFlagsProvider>
    );

    expect(html).toContain('<p id="out">7|ready</p>');
  });
});
