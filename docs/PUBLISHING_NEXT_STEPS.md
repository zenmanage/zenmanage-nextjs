# Publishing Next Steps

This guide covers publishing `@zenmanage/nextjs` to public package registries.

## 1. Pre-Release Checklist

Run from the package directory:

```bash
npm install
npm run validate
```

Before publishing, confirm:

- `README.md` matches the shipped API surface
- examples reflect App Router and Pages Router usage
- `CHANGELOG.md` includes release notes
- `package.json` version is correct
- CI passes on the release commit

## 2. Publish to npm (Primary Public Registry)

Authenticate:

```bash
npm whoami || npm login
```

Optional dry-run:

```bash
npm pack --dry-run
```

Publish:

```bash
npm publish --access public
```

Verify:

- package appears at `https://www.npmjs.com/package/@zenmanage/nextjs`
- clean install succeeds in a minimal Next.js app

## 3. Publish to GitHub Packages (Public Mirror)

Set registry auth in CI or local `.npmrc`:

```ini
@zenmanage:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

Publish mirror package:

```bash
npm publish --registry https://npm.pkg.github.com
```

Notes:

- keep npm as the canonical public source
- use GitHub Packages as a secondary mirror for enterprise/internal distribution

## 4. Optional Additional Public Registries

If your release process requires additional registry mirrors, validate first that all peer dependency semantics (`next`, `react`, `react-dom`) are preserved and consumers can install from that registry without lockfile conflicts.

## 5. Recommended Release Automation

Use Changesets or semantic-release to:

- version and tag automatically
- publish only after CI passes
- generate changelog entries from merged PR metadata

## 6. Post-Release Validation

Run smoke checks in real apps:

- App Router server component flag evaluation
- App Router route handler evaluation
- Pages Router `getServerSideProps` flow
- Middleware/edge-style request context evaluation
- Hydration-safe client bootstrap via `NextFlagsProvider`

## 7. Security and Supply Chain

- require 2FA for publisher accounts
- use least-privilege automation tokens
- enable npm provenance where available
- protect release branches and tags
