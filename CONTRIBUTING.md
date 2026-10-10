# Contributing

Thanks for your interest in contributing to the Zenmanage Next.js SDK.

## Development Setup

```bash
npm install
npm run validate
```

## Branching

- Create feature branches from `main`
- Keep pull requests focused and small
- Include tests for behavior changes

## Quality Requirements

Before opening a pull request:

```bash
npm run format
npm run lint
npm run type-check
npm run test:coverage
npm run build
npm run test:smoke
```

`npm run test:smoke` builds the package, packs it, installs it into a real Next.js app and runs that app against a mock API. It needs `openssl` and downloads Next.js, so it takes a minute. Set `SMOKE_NEXT_VERSION` (for example `14`) to try another Next.js version, or `SMOKE_PROXY=1` with Next.js 16 to use `proxy.ts`. CI runs the whole matrix.

## Testing Guidelines

- Add tests for all public API changes
- Add regression tests for bug fixes
- Keep coverage above configured thresholds
- Server and middleware tests run in Node.js, and component tests opt into jsdom with `// @vitest-environment jsdom`. `@zenmanage/sdk` treats a `window` as a browser and refuses server keys there.

## Pull Request Checklist

- [ ] Code is formatted and lint-clean
- [ ] Type-check passes
- [ ] Tests pass with coverage
- [ ] The smoke test passes
- [ ] README/docs are updated
- [ ] Changelog updated (if needed)

## Release Notes with Changesets

When your PR changes package behavior, add a changeset:

```bash
npm run changeset
```

This creates a file under `.changeset/` used by the automated release workflow.

If you write a `CHANGELOG.md` entry by hand instead, title the heading exactly `## X.Y.Z` with the real version in place of the placeholder (for example `## 1.0.0`): no brackets and no date. The release workflow copies the section with that heading into the GitHub Release, and falls back to the whole file when none matches.
