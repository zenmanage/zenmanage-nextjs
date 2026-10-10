import { describe, expect, it } from 'vitest';
import { defaultsFromBootstrapDocument, readBootstrapPayloadFromDocument } from '../src/bootstrap';

describe('reading the bootstrap on the server', () => {
  it('finds nothing, because there is no document', () => {
    expect(typeof document).toBe('undefined');
    expect(readBootstrapPayloadFromDocument()).toBeNull();
    expect(defaultsFromBootstrapDocument()).toBeUndefined();
  });
});
