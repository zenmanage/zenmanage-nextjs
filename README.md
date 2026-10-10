# Zenmanage Next.js SDK

[![npm version](https://badge.fury.io/js/@zenmanage%2Fnextjs.svg)](https://www.npmjs.com/package/@zenmanage/nextjs)
[![Build Status](https://github.com/zenmanage/zenmanage-nextjs/actions/workflows/ci.yml/badge.svg)](https://github.com/zenmanage/zenmanage-nextjs/actions/workflows/ci.yml)
[![Codacy Badge](https://app.codacy.com/project/badge/Grade/b810a0a8c29f4af2a4013e29192b861e)](https://app.codacy.com/gh/zenmanage/zenmanage-nextjs/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

Feature flags for Next.js. Evaluate flags in Server Components, route handlers, `getServerSideProps` and middleware, and hand the results to Client Components so the first paint is already right.

It builds on two packages you install alongside it:

- [`@zenmanage/sdk`](https://www.npmjs.com/package/@zenmanage/sdk) evaluates flags on the server and at the edge.
- [`@zenmanage/react`](https://www.npmjs.com/package/@zenmanage/react) provides the provider and hooks for Client Components.

## What you get

- Server helpers for the App Router and the Pages Router.
- A bootstrap payload that carries server-evaluated flags to the browser. The server render and the first client render match, so there is no hydration mismatch and no flash of the default.
- Middleware helpers that build an evaluation context from the request. They run on the Edge runtime and on Node.js.
- Rules cached in memory and shared across calls, so a page with ten flags makes one fetch, not ten.

## Installation

```bash
npm install @zenmanage/nextjs @zenmanage/react @zenmanage/sdk
```

Requires Next.js 13.4 or newer (up to 16), React 18.2 or 19, `@zenmanage/react` 1.0 or newer and `@zenmanage/sdk` 3.5 or newer. Tested against Next.js 13.4, 14, 15 and 16, on both routers.

## Keys

Two keys, and they never swap places:

- **Server key (`srv_...`)** for Server Components, route handlers, `getServerSideProps` and middleware. Keep it in a server-only environment variable such as `ZENMANAGE_ENVIRONMENT_TOKEN`.
- **Client key (`cli_...`)** for `NextFlagsProvider` in the browser. It is safe to expose, for example as `NEXT_PUBLIC_ZENMANAGE_ENVIRONMENT_TOKEN`.

Mobile keys (`mob_...`) are not valid here. `NextFlagsProvider` throws if you give it a server key, because anything you pass to a Client Component ends up in the page.

## Quick start

A Server Component that reads a flag:

```tsx
import { Context } from '@zenmanage/sdk';
import { getServerFlag } from '@zenmanage/nextjs';

export default async function DashboardPage() {
  const flag = await getServerFlag({
    environmentToken: process.env.ZENMANAGE_ENVIRONMENT_TOKEN!,
    key: 'dashboard-v2',
    defaultValue: false,
    context: Context.single('user', 'user-123', 'Jane'),
  });

  return <main>{flag.asBool() ? <NewDashboard /> : <LegacyDashboard />}</main>;
}
```

If Zenmanage can't be reached, you get `defaultValue`, not an error.

## Entry points

| Import                         | Runs in           | Contains                                            |
| ------------------------------ | ----------------- | --------------------------------------------------- |
| `@zenmanage/nextjs`            | Server, Edge      | Everything below except the client entry point      |
| `@zenmanage/nextjs/server`     | Server, Edge      | Server helpers                                      |
| `@zenmanage/nextjs/middleware` | Edge, Node.js     | `buildContextFromRequest`, `evaluateMiddlewareFlag` |
| `@zenmanage/nextjs/client`     | Client Components | `NextFlagsProvider`, `useFlag`, `useVariant`        |

`@zenmanage/nextjs/client` starts with `'use client'`, so you can import it from a Server Component file without adding the directive yourself.

## Server helpers

All of them take your server key as `environmentToken`, plus the optional `apiEndpoint`, `cacheTtl`, `enableUsageReporting` and `logger`.

| Function                        | Returns            | Use it to                                                                                |
| ------------------------------- | ------------------ | ---------------------------------------------------------------------------------------- |
| `getServerFlag(input)`          | `Flag`             | Read one flag. Pass `key`, `defaultValue`, `context`, `defaults`.                        |
| `getFlagValue(input, fallback)` | the flag's value   | Read one flag as a `boolean`, `number`, `string` or JSON value, typed after `fallback`.  |
| `getServerFlags(input)`         | `Flag[]`           | Read every flag.                                                                         |
| `getBootstrapPayload(input)`    | `BootstrapPayload` | Evaluate flags for a client provider. See [Bootstrap](#bootstrapping-client-components). |
| `createServerManager(input)`    | `FlagManager`      | Evaluate several flags against one context.                                              |
| `preloadServerFlags(input)`     | `FlagManager`      | Load the rules up front and keep working with the manager.                               |
| `createServerClient(options)`   | `Zenmanage`        | Get the shared SDK client. See the note below.                                           |
| `clearServerClients()`          | `void`             | Drop every shared client and its cache. Useful in tests.                                 |

### Caching

Clients are shared per configuration (token, endpoint, TTL, usage setting and logger) for the life of the server process or Edge isolate. Rules are cached for 60 seconds unless you set `cacheTtl`. After that the next call fetches them again, so a flag change reaches your server within a minute.

Prefer the helpers above to calling `createServerClient(...).flags()` yourself. A `FlagManager` loads its rules once and keeps them, whatever the TTL. The helpers hand you a fresh manager on every call, so the TTL applies.

### Context

Pass a `Context` from `@zenmanage/sdk` to target by user or attribute:

```ts
import { Attribute, Context } from '@zenmanage/sdk';

const context = new Context('user', 'Jane Doe', 'user-123', [
  new Attribute('country', ['US']),
  new Attribute('plan', ['pro']),
]);
```

A percentage rollout buckets by the context's identifier, so use a stable one.

## Bootstrapping Client Components

Client Components render on the server too, and they can't read the server key. So the server evaluates the flags, and the provider shows those values until the browser has its own.

The pieces:

1. `getBootstrapPayload` evaluates flags on the server and returns plain JSON.
2. You pass that payload to `NextFlagsProvider` as a prop.
3. `useFlag` from `@zenmanage/nextjs/client` returns the server's value on the server render and on the first client render. Because both see the same value, React hydrates cleanly.
4. The browser loads its own rules. When they arrive, the live value replaces the server's. If they never arrive (a blocked CDN, no network), the server's value stays. The page doesn't switch to the code default.

### App Router

Evaluate in a Server Component and pass the payload down:

```tsx
// app/layout.tsx
import { Context } from '@zenmanage/sdk';
import { getBootstrapPayload } from '@zenmanage/nextjs';
import { Providers } from './providers';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const bootstrapPayload = await getBootstrapPayload({
    environmentToken: process.env.ZENMANAGE_ENVIRONMENT_TOKEN!,
    context: Context.single('user', 'user-123'),
    keys: ['new-checkout'],
    includeContext: true,
  });

  return (
    <html lang="en">
      <body>
        <Providers bootstrapPayload={bootstrapPayload}>{children}</Providers>
      </body>
    </html>
  );
}
```

```tsx
// app/providers.tsx
'use client';

import type { BootstrapPayload } from '@zenmanage/nextjs';
import { NextFlagsProvider } from '@zenmanage/nextjs/client';

export function Providers({
  bootstrapPayload,
  children,
}: {
  bootstrapPayload: BootstrapPayload;
  children: React.ReactNode;
}) {
  return (
    <NextFlagsProvider
      environmentToken={process.env.NEXT_PUBLIC_ZENMANAGE_ENVIRONMENT_TOKEN!}
      bootstrapPayload={bootstrapPayload}
    >
      {children}
    </NextFlagsProvider>
  );
}
```

```tsx
// app/checkout-button.tsx
'use client';

import { useFlag } from '@zenmanage/nextjs/client';

export function CheckoutButton() {
  const { value: enabled } = useFlag('new-checkout', false);

  return <button>{enabled ? 'Checkout (new)' : 'Checkout'}</button>;
}
```

### Pages Router

Evaluate in `getServerSideProps` and pass the payload through props. It is plain JSON, so Next.js serializes it as is:

```tsx
// pages/checkout.tsx
import type { GetServerSideProps } from 'next';
import { Context } from '@zenmanage/sdk';
import { getBootstrapPayload, type BootstrapPayload } from '@zenmanage/nextjs';
import { NextFlagsProvider, useFlag } from '@zenmanage/nextjs/client';

export const getServerSideProps: GetServerSideProps<{
  bootstrapPayload: BootstrapPayload;
}> = async () => ({
  props: {
    bootstrapPayload: await getBootstrapPayload({
      environmentToken: process.env.ZENMANAGE_ENVIRONMENT_TOKEN!,
      context: Context.single('user', 'user-123'),
      keys: ['new-checkout'],
      includeContext: true,
    }),
  },
});

function Checkout() {
  const { value: enabled } = useFlag('new-checkout', false);
  return <button>{enabled ? 'Checkout (new)' : 'Checkout'}</button>;
}

export default function CheckoutPage({ bootstrapPayload }: { bootstrapPayload: BootstrapPayload }) {
  return (
    <NextFlagsProvider
      environmentToken={process.env.NEXT_PUBLIC_ZENMANAGE_ENVIRONMENT_TOKEN!}
      bootstrapPayload={bootstrapPayload}
    >
      <Checkout />
    </NextFlagsProvider>
  );
}
```

### What goes to the browser

The payload is written into the page, so anyone can read it.

- **`keys`** limits it to the flags your Client Components read. Leave it out and every flag in the environment is sent, names and values included.
- **`includeContext: true`** adds the context to the payload, so the browser evaluates for the same user the server did. Leave it out if the context holds anything you don't want in the page source. Without it, the browser evaluates with no context unless you pass `context` to the provider.

### `NextFlagsProvider`

Takes everything `FlagsProvider` from `@zenmanage/react` takes (`environmentToken`, `apiEndpoint`, `cacheTtl`, `enableUsageReporting`, `context`, `defaults`, `preload`, `onError`, `client`), plus:

| Prop                 | Use                                                                                             |
| -------------------- | ----------------------------------------------------------------------------------------------- |
| `bootstrapPayload`   | The payload from `getBootstrapPayload`. Pass it as a prop.                                      |
| `bootstrapElementId` | Read the payload from a `<script id="...">` tag instead. Defaults to `__ZENMANAGE_BOOTSTRAP__`. |

The browser reports itself to the API as `zenmanage-nextjs/<version>`.

`useFlag` and `useVariant` from `@zenmanage/nextjs/client` take the same arguments as the ones in `@zenmanage/react`. With a bootstrap value for the key they return it, with `isLoading: false`, until the live value arrives. Without one they behave the same as the React hooks.

`FlagGate` and `withFlag` come from `@zenmanage/react` and work inside `NextFlagsProvider`, but they don't use the bootstrap. They wait for the browser's own value.

### Script tag

If you can't pass props to the provider, render the payload as a JSON `<script>` tag and the provider picks it up:

```tsx
import { buildBootstrapPayload, buildBootstrapScript } from '@zenmanage/nextjs';

const payload = buildBootstrapPayload(await getServerFlags({ environmentToken, context }));
const html = buildBootstrapScript(payload); // <script id="__ZENMANAGE_BOOTSTRAP__" type="application/json">…</script>
```

The server renders without the payload, and the browser applies it right after hydration, so the first paint shows the default. Use the `bootstrapPayload` prop when you can.

The other bootstrap helpers: `buildBootstrapPayload`, `serializeBootstrapPayload`, `deserializeBootstrapPayload`, `readBootstrapPayloadFromDocument`, `defaultsFromBootstrapPayload`, `defaultsFromBootstrapDocument` and `contextFromBootstrapPayload`.

## Middleware

`evaluateMiddlewareFlag` builds a context from the request and evaluates one flag:

```ts
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { evaluateMiddlewareFlag } from '@zenmanage/nextjs/middleware';

export async function middleware(request: NextRequest) {
  const beta = await evaluateMiddlewareFlag({
    environmentToken: process.env.ZENMANAGE_ENVIRONMENT_TOKEN!,
    key: 'beta-rewrite',
    defaultValue: false,
    request,
  });

  return beta.asBool() ? NextResponse.rewrite(new URL('/beta', request.url)) : NextResponse.next();
}

export const config = { matcher: ['/dashboard/:path*'] };
```

It works in `middleware.ts` on the Edge runtime (Next.js 13.4 and up) and in `proxy.ts` on Node.js (Next.js 16). Use a server key in both.

`buildContextFromRequest(request, options)` is what builds the context. It sets:

| Attribute                   | From                                                                                |
| --------------------------- | ----------------------------------------------------------------------------------- |
| identifier                  | the `zenmanage_user_id` cookie, then the `x-zenmanage-user-id` header               |
| `path`                      | the request path                                                                    |
| `user-agent`                | the `user-agent` header                                                             |
| `country`, `region`, `city` | `request.geo`, then the `x-vercel-ip-*` headers (country also from `cf-ipcountry`)  |
| `ip`                        | only with `includeIp: true`: `request.ip`, then `x-forwarded-for`, then `x-real-ip` |

Set a different context type or name, change the cookie or header names, turn geo off, or add attributes with `contextType`, `contextName`, `identifierCookieName`, `identifierHeaderName`, `includeGeo` and `additionalAttributes`. Next.js 15 removed `request.ip` and `request.geo`, so the headers are what you get there.

An IP address is personal data, which is why it's off by default.

Next.js may print a build warning that `@zenmanage/sdk` uses `process.versions`, which the Edge runtime doesn't support. The SDK checks it exists before reading it, so it works. The warning is cosmetic.

## Examples

See [examples/README.md](examples/README.md). They cover Server Components, route handlers, `getServerSideProps`, the client provider and middleware, plus the usual targeting, defaults and rollout cases.

`examples/smoke-app` is a real Next.js app that `npm run test:smoke` builds from the packed package and runs against a mock Zenmanage API.

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
- `npm run test:smoke` builds the package and checks it in a real Next.js app. Set `SMOKE_NEXT_VERSION` (for example `14`) to try another Next.js version, or `SMOKE_SERVE=1` to keep the app running so you can open it in a browser. Needs `openssl`.

## License

MIT
