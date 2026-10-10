# Zenmanage Next.js SDK Examples

Next.js examples for Server Components, route handlers, `getServerSideProps`, the client provider and middleware, plus the core sample set the other Zenmanage SDKs have.

## Setup

```bash
npm install
export ZENMANAGE_ENVIRONMENT_TOKEN="srv_your_server_key_here"
export NEXT_PUBLIC_ZENMANAGE_ENVIRONMENT_TOKEN="cli_your_client_key_here"
```

Use the server key only in server code. Anything with a `NEXT_PUBLIC_` prefix is sent to the browser, so it takes the client key.

## Core Sample Set

- `simple-flags.tsx`: Basic server flag check
- `context-based-flags.tsx`: Context-targeted evaluation
- `ab-testing.tsx`: Variant selection
- `defaults.tsx`: Defaults collection as a fallback
- `caching.tsx`: Cache TTL and usage reporting
- `percentage-rollouts.tsx`: Deterministic rollout behavior

## Next.js Patterns

- `app-router-server-component.tsx`: Server Component evaluation
- `app-router-route-handler.ts`: Route handler
- `app-router-layout.tsx`: Evaluate in the root layout and pass the payload to the client provider
- `client-component-bootstrap.tsx`: `NextFlagsProvider` and `useFlag` in Client Components
- `pages-router-get-server-side-props.tsx`: Pages Router with `getServerSideProps`
- `middleware.ts`: Middleware (and `proxy.ts` on Next.js 16)

## Smoke app

`smoke-app/` is a complete Next.js app (App Router, Pages Router and middleware) that `npm run test:smoke` builds from the packed package and runs against a mock API. It's the best reference for how the pieces fit together in a working project.
