# Zenmanage Next.js SDK Examples

This directory provides Next.js-oriented examples, including the same core sample set used across Zenmanage SDKs.

## Setup

```bash
npm install
export ZENMANAGE_ENVIRONMENT_TOKEN="srv_your_server_key_here"
export NEXT_PUBLIC_ZENMANAGE_ENVIRONMENT_TOKEN="cli_your_client_key_here"
```

## Core Sample Set

- `simple-flags.tsx`: Basic SSR flag check
- `context-based-flags.tsx`: Context-targeted SSR evaluation
- `ab-testing.tsx`: Variant selection in SSR
- `defaults.tsx`: Inline and collection defaults
- `caching.tsx`: Cache TTL and usage reporting tuning
- `percentage-rollouts.tsx`: Deterministic rollout behavior

## Next.js-Specific Patterns (ZEN-579)

- `app-router-server-component.tsx`: App Router server component evaluation
- `app-router-route-handler.ts`: Route handler pattern
- `pages-router-get-server-side-props.tsx`: Pages Router SSR integration
- `client-component-bootstrap.tsx`: Hydration-safe client bootstrap with `NextFlagsProvider`
- `middleware.ts`: Middleware/edge-compatible request evaluation
