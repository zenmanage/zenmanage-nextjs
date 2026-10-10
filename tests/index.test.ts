import * as pkg from '../src/index';

describe('package exports', () => {
  it('exports core next helpers', () => {
    expect(pkg.createServerClient).toBeTypeOf('function');
    expect(pkg.getServerFlag).toBeTypeOf('function');
    expect(pkg.buildContextFromRequest).toBeTypeOf('function');
    expect(pkg.buildBootstrapPayload).toBeTypeOf('function');
    expect(pkg.serializeBootstrapPayload).toBeTypeOf('function');
  });
});
