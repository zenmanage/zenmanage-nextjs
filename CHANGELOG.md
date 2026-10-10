# @zenmanage/nextjs

## 1.0.1

### Fixed

- `getFlagValue(input, fallback)` now uses `fallback` as the default. Before, it only chose the return type, so a flag that doesn't exist, or an API that can't be reached, threw `Flag not found` unless you also passed `defaultValue`. A `defaultValue` in the input, or an entry for the key in `defaults`, still wins over `fallback`. The usage report for the flag now carries the fallback as its default value too.

## 1.0.0

First public release. The API below is the 1.0 surface, and semantic versioning applies from here. The Changed, Removed, and Fixed entries are relative to the internal 0.1.0 snapshot.

### Added

- Server helpers for the App Router and the Pages Router: `getServerFlag`, `getFlagValue`, `getServerFlags`, `getBootstrapPayload`, `createServerManager`, `createServerRuntime`, `preloadServerFlags`, `createServerClient` and `clearServerClients`. `getFlagValue` reads JSON flags too.
- `getBootstrapPayload` evaluates flags for a client provider. `keys` limits which flags go into the page, and `includeContext` sends the context so the browser evaluates for the same user.
- `NextFlagsProvider`, `useFlag` and `useVariant` from `@zenmanage/nextjs/client`. The server render and the first client render show the server-evaluated value with `isLoading: false`, so hydration is clean and the default doesn't flash. The live value replaces it once the browser's rules load, and the server value stays if they never do.
- `buildContextFromRequest` and `evaluateMiddlewareFlag` for `middleware.ts` (Edge) and `proxy.ts` (Node.js, Next.js 16). Location comes from `request.geo` or the Vercel and Cloudflare headers, so it works on Next.js 15 and later, which removed `request.geo` and `request.ip`.
- Every request identifies itself to the API as `zenmanage-nextjs/<version>`, in the browser and on the server, instead of the base SDK's `zenmanage-javascript`. This relies on `ConfigBuilder.withClientAgent()` from `@zenmanage/sdk` 3.5.0.
- The client entry point starts with `'use client'`, so it can be imported from a Server Component file.
- Separate type declarations for ESM and CJS, and `sideEffects: false`.
- `examples/smoke-app`, a real Next.js app that `npm run test:smoke` builds from the packed package and runs against a mock API. CI runs it on Next.js 13.4, 14, 15 and 16, and on `proxy.ts`.

### Changed

- `@zenmanage/react` 1.0.0 and `@zenmanage/sdk` 3.5.0 or newer are now required. Next.js 16 is supported.
- Server helpers share one client per configuration and cache rules for 60 seconds (`DEFAULT_SERVER_CACHE_TTL`) unless you set `cacheTtl`. Before, every call built a new client and fetched the rules again.
- `getFlagValue('control')` is typed `string`, not the literal `'control'`, and accepts JSON fallbacks.
- `buildBootstrapPayload` accepts the `Flag[]` from `getServerFlags` as well as a record, and leaves `context` out instead of setting it to `undefined`, which `getServerSideProps` refuses to serialize.
- `deserializeBootstrapPayload` drops flag values that aren't booleans, strings, finite numbers, objects or arrays. `buildBootstrapScript` rejects an element id that isn't a plain HTML id.
- `includeIp` in `buildContextFromRequest` is off by default. An IP address is personal data.
- `contextFromBootstrapPayload` returns `undefined` for a context it can't read instead of throwing.
- Declarations no longer use the global `JSX` namespace, which `@types/react` 19 removed.

### Removed

- `contextWithDefaults`. It only wrapped `DefaultsCollection.fromObject`.

### Fixed

- Rendering `NextFlagsProvider` with a client key threw on the server, because `@zenmanage/sdk` refuses client keys in Node.js and Next.js renders Client Components there too.
- The bootstrapped defaults never reached the first paint: `useFlag` returns the default you pass it while loading, never the provider's `defaults`.
- Reading the payload from a `<script>` tag during render made the first client render differ from the server's. The tag is now read after hydration.
- A server key passed to `NextFlagsProvider` was written into the page. The provider now refuses it.
- A `FlagManager` loads its rules once and keeps them, so a shared client would have served the first rules it saw until the process restarted. Every helper call now works on its own copy of the manager.
- `buildContextFromRequest` ignored the geo headers when `request.geo` was present but empty, which is what Next.js 14 and earlier set when self-hosted.
- Documentation and examples no longer use `request.ip` and `request.geo`, which Next.js 15 removed.
