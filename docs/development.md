# Development

Use Node.js 22 or newer.

```bash
npm ci
npm --prefix packages/dashboard/frontend ci
```

## UI snapshot maintenance

The dashboard owns its copied neutral UI files and builds without access to an
upstream repository. `ui-source.json` records content snapshots and file hashes;
it deliberately contains no private source location or history. Verify it with
`npm run check:ui-source`. Put application-specific changes outside
`src/ui/foundation`; review changes and update files and receipt together only
after verification. A snapshot hash checks content, not provenance authenticity.
The current stylesheet and Tailwind mapping support the app's system/light/dark
preference. Components and task layouts remain local to this application.

## Verification

```bash
npm test
npm run check:types
npm run check:ui-source
npm --prefix packages/dashboard/frontend run build
# Once per machine, install the browser used by the UI suite:
npm --prefix packages/dashboard/frontend exec -- playwright install chromium
npm run test:browser
```

Protocol tests use a synthetic OIDC provider with signed tokens and a local D1
Worker. Browser tests use synthetic links and credentials. Verify a real provider
login, local logout and administrative revocation separately for each deployment;
the synthetic checks do not exercise a real passkey.

## README screenshots

Run `npm --prefix packages/dashboard/frontend run screenshots` to refresh the README images. The capture uses local mocked API responses with example domains and synthetic data; it never signs into a live deployment.

