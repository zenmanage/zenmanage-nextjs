# Zenmanage Next.js SDK

[![npm version](https://badge.fury.io/js/@zenmanage%2Fnextjs.svg)](https://www.npmjs.com/package/@zenmanage/nextjs)
[![Build Status](https://github.com/zenmanage/zenmanage-nextjs/actions/workflows/ci.yml/badge.svg)](https://github.com/zenmanage/zenmanage-nextjs)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

Next.js integration helpers for Zenmanage feature flags.

This package extends:

- `@zenmanage/sdk` for server and edge-safe evaluation
- `@zenmanage/react` for client component integration and hydration-safe defaults

## Why This Package

- App Router and Pages Router SSR patterns
- Hydration-safe client bootstrap utilities
- Middleware and edge-compatible request evaluation helpers
- Typed wrappers that keep your Next.js code simple and explicit
- High test coverage with CI-friendly validation scripts

## Installation

```bash
npm install @zenmanage/nextjs @zenmanage/react @zenmanage/sdk next react react-dom
```

## Key Compatibility

- Server runtime (Node.js, route handlers, server components): use `srv_` tokens
- Browser runtime (client components): use `cli_` tokens
- Mobile tokens (`mob_`) are not valid for this package

## Quick Start (App Router Server Component)

```tsx
import { Context } from '@zenmanage/sdk';
import { getServerFlag } from '@zenmanage/nextjs';

export default async function DashboardPage(): Promise<JSX.Element> {
  const context = Context.single('user', 'user-123', 'Jane');

  const flag = await getServerFlag({
    environmentToken: process.env.ZENMANAGE_ENVIRONMENT_TOKEN!,
    key: 'dashboard-v2',
    defaultValue: false,
    context,
  });

  return <main>{flag.asBool() ? <NewDashboard /> : <LegacyDashboard />}</main>;
}
```

## API

### Server Helpers

- `createServerClient(options)`
- `createServerManager(options)`
- `createServerRuntime(options)`
- `getServerFlag(input)`
- `getServerFlags(input)`
- `preloadServerFlags(input)`
- `getFlagValue(input, fallback)`

### Middleware / Edge Helpers

- `buildContextFromRequest(request, options?)`
- `evaluateMiddlewareFlag(input)`

### Hydration Bootstrap Helpers

- `buildBootstrapPayload(flags, options?)`
- `serializeBootstrapPayload(payload)`
- `deserializeBootstrapPayload(serialized)`
- `buildBootstrapScript(payload, options?)`
- `readBootstrapPayloadFromDocument(elementId?)`
- `defaultsFromBootstrapPayload(payload)`
- `defaultsFromBootstrapDocument(elementId?)`
- `contextFromBootstrapPayload(payload)`

### Client Entry Point

Use `@zenmanage/nextjs/client` for client-only primitives:

- `NextFlagsProvider`

`NextFlagsProvider` composes `FlagsProvider` from `@zenmanage/react` and merges server-bootstrapped defaults with explicit defaults, preferring explicit defaults when keys overlap.

```tsx
'use client';

import { NextFlagsProvider } from '@zenmanage/nextjs/client';

export function Providers({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <NextFlagsProvider environmentToken="cli_your_client_key_here">{children}</NextFlagsProvider>
  );
}
```

## App Router Pattern

1. Evaluate flags server-side in layouts/pages/route handlers.
2. Build bootstrap payload and inject it into HTML as JSON.
3. Use `NextFlagsProvider` in client boundaries to consume hydrated defaults.

## Pages Router Pattern

1. Evaluate server flags in `getServerSideProps`.
2. Return a bootstrap payload via props.
3. Pass payload to `NextFlagsProvider` in the page component.

## Middleware Pattern

Evaluate flags using request-derived context in middleware:

```ts
import { NextResponse } from 'next/server';
import { evaluateMiddlewareFlag } from '@zenmanage/nextjs/middleware';

export async function middleware(request: Request) {
  const flag = await evaluateMiddlewareFlag({
    environmentToken: process.env.ZENMANAGE_ENVIRONMENT_TOKEN!,
    key: 'beta-rewrite',
    defaultValue: false,
    request: {
      headers: request.headers,
      url: request.url,
    },
  });

  if (flag.asBool()) {
    return NextResponse.rewrite(new URL('/beta', request.url));
  }

  return NextResponse.next();
}
```

## Examples

See [examples/README.md](examples/README.md).

The examples include:

- Same core sample set as other Zenmanage SDKs
- App Router server component and route handler patterns
- Pages Router SSR pattern
- Client bootstrap and provider pattern
- Middleware and edge-style evaluation

## Development

```bash
npm install
npm run validate
```

Useful commands:

- `npm run lint`
- `npm run type-check`
- `npm run test:coverage`
- `npm run build`

## Publishing

Use [docs/PUBLISHING_NEXT_STEPS.md](docs/PUBLISHING_NEXT_STEPS.md).

## License

MIT
