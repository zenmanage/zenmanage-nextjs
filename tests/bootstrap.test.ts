import { Context } from '@zenmanage/sdk';
import {
  buildBootstrapPayload,
  buildBootstrapScript,
  contextFromBootstrapPayload,
  defaultsFromBootstrapDocument,
  defaultsFromBootstrapPayload,
  deserializeBootstrapPayload,
  readBootstrapPayloadFromDocument,
  serializeBootstrapPayload,
} from '../src/bootstrap';

describe('bootstrap helpers', () => {
  it('builds a payload with metadata and optional context', () => {
    const context = Context.single('user', 'user-123', 'Jane');
    const payload = buildBootstrapPayload(
      {
        'checkout-v2': true,
        'checkout-variant': 'one-page',
      },
      { context, generatedAt: new Date('2026-05-07T10:00:00.000Z') }
    );

    expect(payload.version).toBe(1);
    expect(payload.generatedAt).toBe('2026-05-07T10:00:00.000Z');
    expect(payload.context?.identifier).toBe('user-123');
  });

  it('serializes safely for inline script tags and round-trips', () => {
    const payload = buildBootstrapPayload({
      dangerous: '</script><img src=x onerror=alert(1)>',
    });

    const serialized = serializeBootstrapPayload(payload);

    expect(serialized).not.toContain('</script>');
    expect(serialized).toContain('\\u003c');

    const restored = deserializeBootstrapPayload(serialized);
    expect(restored).not.toBeNull();
    expect(restored?.flags.dangerous).toBe('</script><img src=x onerror=alert(1)>');
  });

  it('returns null for invalid serialized payloads', () => {
    expect(deserializeBootstrapPayload('not-json')).toBeNull();
    expect(deserializeBootstrapPayload('{"version":2,"flags":{},"generatedAt":"x"}')).toBeNull();
    expect(deserializeBootstrapPayload('{"version":1,"generatedAt":"x"}')).toBeNull();
  });

  it('creates and reads script payloads from the DOM', () => {
    const payload = buildBootstrapPayload({ 'nav-redesign': true });
    const script = buildBootstrapScript(payload, { elementId: 'flags-bootstrap' });
    document.body.innerHTML = script;

    const fromDocument = readBootstrapPayloadFromDocument('flags-bootstrap');

    expect(fromDocument).not.toBeNull();
    expect(fromDocument?.flags['nav-redesign']).toBe(true);
  });

  it('returns null or undefined when bootstrap payload is unavailable', () => {
    document.body.innerHTML = '';

    expect(readBootstrapPayloadFromDocument('missing-bootstrap')).toBeNull();
    expect(defaultsFromBootstrapPayload(undefined)).toBeUndefined();
    expect(defaultsFromBootstrapDocument('missing-bootstrap')).toBeUndefined();
    expect(contextFromBootstrapPayload(undefined)).toBeUndefined();
    expect(contextFromBootstrapPayload(buildBootstrapPayload({}))).toBeUndefined();
  });

  it('creates defaults collections from payload or document', () => {
    const payload = buildBootstrapPayload({ 'new-dashboard': true, variant: 'b' });
    const defaults = defaultsFromBootstrapPayload(payload);

    expect(defaults?.get('new-dashboard')).toBe(true);
    expect(defaults?.get('variant')).toBe('b');

    document.body.innerHTML = buildBootstrapScript(payload, { elementId: 'bootstrap' });
    const fromDocument = defaultsFromBootstrapDocument('bootstrap');
    expect(fromDocument?.get('new-dashboard')).toBe(true);
  });

  it('rebuilds context from payload context data', () => {
    const context = Context.single('organization', 'org-42', 'Zenmanage Inc');
    const payload = buildBootstrapPayload({}, { context });

    const rebuilt = contextFromBootstrapPayload(payload);

    expect(rebuilt?.getType()).toBe('organization');
    expect(rebuilt?.getIdentifier()).toBe('org-42');
  });
});
