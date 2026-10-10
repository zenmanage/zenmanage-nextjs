import { render } from '@testing-library/react';
import { DefaultsCollection } from '@zenmanage/sdk';
import { NextFlagsProvider } from '../src/client/NextFlagsProvider';
import { buildBootstrapPayload, buildBootstrapScript } from '../src/bootstrap';

const providerSpy = vi.fn();

vi.mock('@zenmanage/react', () => ({
  FlagsProvider: (props: Record<string, unknown>) => {
    providerSpy(props);
    return <>{props.children as React.ReactNode}</>;
  },
}));

describe('NextFlagsProvider', () => {
  beforeEach(() => {
    providerSpy.mockReset();
  });

  it('passes through props and merges explicit defaults over bootstrap defaults', () => {
    const explicitDefaults = DefaultsCollection.fromObject({
      'checkout-flow': 'control',
      'new-nav': false,
    });

    const bootstrapPayload = buildBootstrapPayload({
      'new-nav': true,
      'beta-payments': true,
    });

    render(
      <NextFlagsProvider
        environmentToken="cli_test_key"
        defaults={explicitDefaults}
        bootstrapPayload={bootstrapPayload}
      >
        <div>Child</div>
      </NextFlagsProvider>
    );

    const props = providerSpy.mock.calls[0][0];
    const defaults = props.defaults as DefaultsCollection;

    expect(defaults.get('new-nav')).toBe(false);
    expect(defaults.get('checkout-flow')).toBe('control');
    expect(defaults.get('beta-payments')).toBe(true);
    expect(props.environmentToken).toBe('cli_test_key');
  });

  it('hydrates defaults from bootstrap script element when payload is not passed', () => {
    const payload = buildBootstrapPayload({ 'header-v2': true });
    document.body.innerHTML = buildBootstrapScript(payload, { elementId: 'flags-payload' });

    render(
      <NextFlagsProvider environmentToken="cli_test_key" bootstrapElementId="flags-payload">
        <div>Child</div>
      </NextFlagsProvider>
    );

    const props = providerSpy.mock.calls[0][0];
    const defaults = props.defaults as DefaultsCollection;

    expect(defaults.get('header-v2')).toBe(true);
  });
});
