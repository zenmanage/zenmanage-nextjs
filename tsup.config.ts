import { defineConfig } from 'tsup';

const shared = {
  format: ['esm', 'cjs'] as const,
  dts: true,
  sourcemap: true,
  // `npm run build` empties dist first. Cleaning here would let one config delete the other's output.
  clean: false,
  external: ['react', 'react-dom', 'next', '@zenmanage/sdk', '@zenmanage/react'],
  treeshake: false,
  minify: false,
};

export default defineConfig([
  {
    ...shared,
    entry: ['src/index.ts', 'src/server.ts', 'src/middleware.ts'],
  },
  {
    ...shared,
    entry: ['src/client.ts'],
    // The provider and hooks only work in Client Components. Without this, importing the
    // package from a Server Component (App Router) fails at build time.
    banner: { js: "'use client';" },
  },
]);
