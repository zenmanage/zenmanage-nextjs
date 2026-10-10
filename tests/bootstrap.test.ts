// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { Attribute, Context, Flag } from '@zenmanage/sdk';
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
import { mergeDefaults } from '../src/defaults';
import { DEFAULT_BOOTSTRAP_ELEMENT_ID } from '../src/types';
import { flag } from './fakeApi';

const generatedAt = new Date('2026-10-10T12:00:00Z');

describe('buildBootstrapPayload', () => {
  it('builds from a record', () => {
    const payload = buildBootstrapPayload({ a: true, b: 'x' }, { generatedAt });

    expect(payload).toEqual({
      version: 1,
      generatedAt: '2026-10-10T12:00:00.000Z',
      flags: { a: true, b: 'x' },
    });
  });

  it('is plain JSON data: nothing in it is undefined, so Next.js can pass it as props', () => {
    const payload = buildBootstrapPayload({ a: true }, { generatedAt });

    expect(payload).not.toHaveProperty('context');
    expect(JSON.parse(JSON.stringify(payload))).toStrictEqual(payload);
  });

  it('builds from evaluated flags, keeping every value type', () => {
    const flags = [
      flag('on', true),
      flag('limit', 7),
      flag('variant', 'b'),
      flag('theme', { color: 'teal' }),
    ].map((data) => Flag.fromObject(data));

    expect(buildBootstrapPayload(flags, { generatedAt }).flags).toEqual({
      on: true,
      limit: 7,
      variant: 'b',
      theme: { color: 'teal' },
    });
  });

  it('includes the context when one is given', () => {
    const context = Context.single('user', 'u-1', 'Jane');
    context.addAttribute(new Attribute('plan', ['pro']));

    expect(buildBootstrapPayload({}, { context }).context).toEqual({
      type: 'user',
      name: 'Jane',
      identifier: 'u-1',
      attributes: [{ key: 'plan', values: [{ value: 'pro' }] }],
    });
  });

  it('stamps the current time by default', () => {
    const before = Date.now();
    const stamp = Date.parse(buildBootstrapPayload({}).generatedAt);

    expect(stamp).toBeGreaterThanOrEqual(before);
    expect(stamp).toBeLessThanOrEqual(Date.now());
  });
});

describe('serialization', () => {
  it('round-trips a payload', () => {
    const payload = buildBootstrapPayload(
      { a: true, n: 3, s: 'x', j: { nested: [1, 2] } },
      { generatedAt, context: Context.single('user', 'u-1') }
    );

    expect(deserializeBootstrapPayload(serializeBootstrapPayload(payload))).toEqual({
      ...payload,
    });
  });

  it('escapes everything that could break out of a script tag', () => {
    const payload = buildBootstrapPayload(
      { evil: '</script><script>alert(1)</script> & \u2028 \u2029' },
      { generatedAt }
    );

    const serialized = serializeBootstrapPayload(payload);

    expect(serialized).not.toMatch(/[<>&\u2028\u2029]/);
    expect(deserializeBootstrapPayload(serialized)?.flags.evil).toBe(payload.flags.evil);
  });

  it.each([
    ['invalid JSON', '{nope'],
    ['a non-object', '42'],
    ['null', 'null'],
    ['an array', '[]'],
    ['a wrong version', '{"version":2,"generatedAt":"x","flags":{}}'],
    ['a missing version', '{"generatedAt":"x","flags":{}}'],
    ['missing flags', '{"version":1,"generatedAt":"x"}'],
    ['array flags', '{"version":1,"generatedAt":"x","flags":[]}'],
    ['null flags', '{"version":1,"generatedAt":"x","flags":null}'],
    ['a non-string timestamp', '{"version":1,"generatedAt":5,"flags":{}}'],
  ])('rejects %s', (_label, text) => {
    expect(deserializeBootstrapPayload(text)).toBeNull();
  });

  it('drops values that are not flag values', () => {
    // 1e999 is valid JSON text that parses to Infinity, which no flag can hold.
    const text =
      '{"version":1,"generatedAt":"x","flags":{"ok":true,"nothing":null,"big":1e999,"obj":{"a":1}}}';

    expect(deserializeBootstrapPayload(text)?.flags).toEqual({ ok: true, obj: { a: 1 } });
  });

  it('ignores a context that is not an object', () => {
    const text = '{"version":1,"generatedAt":"x","flags":{},"context":"nope"}';

    expect(deserializeBootstrapPayload(text)?.context).toBeUndefined();
  });
});

describe('buildBootstrapScript', () => {
  it('renders a JSON script tag with the default id', () => {
    const payload = buildBootstrapPayload({ a: true }, { generatedAt });

    const html = buildBootstrapScript(payload);

    expect(
      html.startsWith(`<script id="${DEFAULT_BOOTSTRAP_ELEMENT_ID}" type="application/json">`)
    ).toBe(true);
    expect(html.endsWith('</script>')).toBe(true);
    expect(html.match(/<\/script>/g)).toHaveLength(1);
  });

  it('uses a custom id', () => {
    expect(
      buildBootstrapScript(buildBootstrapPayload({}), { elementId: 'flags:boot.1' })
    ).toContain('id="flags:boot.1"');
  });

  it.each(['', '1abc', 'a b', 'a"onload="x', '<x>'])('rejects the element id %j', (elementId) => {
    expect(() => buildBootstrapScript(buildBootstrapPayload({}), { elementId })).toThrow(
      'Invalid bootstrap element id'
    );
  });
});

describe('reading from the document', () => {
  const mount = (html: string): void => {
    document.body.innerHTML = html;
  };

  it('reads the payload a script tag carries', () => {
    const payload = buildBootstrapPayload({ a: true }, { generatedAt });
    mount(buildBootstrapScript(payload));

    expect(readBootstrapPayloadFromDocument()).toEqual(payload);
    expect(defaultsFromBootstrapDocument()?.get('a')).toBe(true);
  });

  it('reads a custom id', () => {
    mount(buildBootstrapScript(buildBootstrapPayload({ b: 1 }), { elementId: 'custom' }));

    expect(readBootstrapPayloadFromDocument('custom')?.flags).toEqual({ b: 1 });
    expect(readBootstrapPayloadFromDocument()).toBeNull();
  });

  it('returns nothing when the tag is missing or malformed', () => {
    expect(readBootstrapPayloadFromDocument()).toBeNull();
    expect(defaultsFromBootstrapDocument()).toBeUndefined();

    mount(`<script id="${DEFAULT_BOOTSTRAP_ELEMENT_ID}" type="application/json">{oops</script>`);
    expect(readBootstrapPayloadFromDocument()).toBeNull();

    mount(`<script id="${DEFAULT_BOOTSTRAP_ELEMENT_ID}" type="application/json"></script>`);
    expect(readBootstrapPayloadFromDocument()).toBeNull();
  });
});

describe('defaults and context from a payload', () => {
  it('turns flags into defaults', () => {
    const defaults = defaultsFromBootstrapPayload(buildBootstrapPayload({ a: true, b: 'x' }));

    expect(defaults?.get('a')).toBe(true);
    expect(defaults?.get('b')).toBe('x');
  });

  it.each([null, undefined])('has no defaults or context for %s', (payload) => {
    expect(defaultsFromBootstrapPayload(payload)).toBeUndefined();
    expect(contextFromBootstrapPayload(payload)).toBeUndefined();
  });

  it('rebuilds the context', () => {
    const context = Context.single('user', 'u-1', 'Jane');
    context.addAttribute(new Attribute('plan', ['pro']));

    const rebuilt = contextFromBootstrapPayload(buildBootstrapPayload({}, { context }));

    expect(rebuilt?.getIdentifier()).toBe('u-1');
    expect(rebuilt?.getAttribute('plan')?.getValues()).toEqual(['pro']);
  });

  it('has no context when the payload has none, or it is unusable', () => {
    expect(contextFromBootstrapPayload(buildBootstrapPayload({}))).toBeUndefined();

    const broken = {
      ...buildBootstrapPayload({}),
      context: { type: 'user', attributes: [{ key: 'x', values: null }] },
    };
    expect(contextFromBootstrapPayload(broken as never)).toBeUndefined();
  });
});

describe('mergeDefaults', () => {
  it('prefers the base over the bootstrap where both define a key', () => {
    const base = defaultsFromBootstrapPayload(buildBootstrapPayload({ a: true, b: 'base' }));
    const bootstrap = defaultsFromBootstrapPayload(buildBootstrapPayload({ b: 'boot', c: 9 }));

    const merged = mergeDefaults(base, bootstrap);

    expect(merged?.get('a')).toBe(true);
    expect(merged?.get('b')).toBe('base');
    expect(merged?.get('c')).toBe(9);
  });

  it('works with one side, or neither', () => {
    const only = defaultsFromBootstrapPayload(buildBootstrapPayload({ a: 1 }));

    expect(mergeDefaults(only, undefined)?.get('a')).toBe(1);
    expect(mergeDefaults(undefined, only)?.get('a')).toBe(1);
    expect(mergeDefaults(undefined, undefined)).toBeUndefined();
  });
});
