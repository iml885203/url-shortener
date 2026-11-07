# Optional OpenID Connect sign-in

API token sign-in and both API headers remain supported. The token is stored in
this browser's localStorage, as before. SSO is optional and uses an independent
HttpOnly session cookie; it does not put provider tokens in browser storage.

To enable OIDC (including providers such as Pocket ID), register a confidential
client with PKCE S256 and the exact callback
`https://your-domain.com/auth/callback`. If the provider supports subject-wide
back-channel logout, register
`https://your-domain.com/auth/backchannel-logout` as its notification receiver.
Both `/auth/*` routes and `/api/*` must reach the dashboard Worker; the example
configuration and deployment workflow include them. Public short links and OG
images remain independent of sign-in. Share/QR generation APIs remain private.

Apply migration `0004_auth_sessions.sql` to the dashboard D1 binding before
enabling SSO. It adds separate auth tables without changing links or clicks.
Set these runtime values through Worker secrets or another private deployment
configuration, never in frontend code or committed wrangler configuration:

| Setting | Meaning |
| --- | --- |
| `OIDC_ISSUER` | Exact HTTPS issuer URL matching discovery |
| `OIDC_CLIENT_ID` | Registered confidential client ID |
| `OIDC_CLIENT_SECRET` | Client secret |
| `SESSION_SECRET` | Independently generated random secret of at least 32 characters |
| `OIDC_REQUIRED_GROUP` | Optional group name required in verified ID-token groups |
| `OIDC_PROVIDER_NAME` | Optional display label; defaults to SSO |

Keep all OIDC settings absent for token-only mode. Partial configuration fails
closed. `SHORT_BASE_URL` must be the application's HTTPS origin. Use the token
mode for ordinary HTTP local development; `.dev.vars` files are ignored.

Users explicitly choose SSO; opening a private view never silently starts an
identity-provider redirect. The local session lasts 180 days, survives Worker
restarts, and reads D1's primary for current revocation state. Local logout
revokes the current session and clears local credentials without logging out of
the provider or invalidating independent API keys. Cookie-authenticated writes
and logout require the same Origin. Ordinary provider logout leaves local
sessions intact. Valid signed subject-wide notifications revoke that user's
sessions and reject older pending callbacks; identical notification replays are
idempotent. Providers that do not deliver these notifications cannot revoke
existing local sessions immediately. Providers using session-specific `sid`
notifications are not supported by this receiver. Storage failure rejects
private access rather than accepting a stale cached session.

Changing the issuer/client or recovering from a compromised session secret
requires rotating `SESSION_SECRET` to invalidate existing sessions. Keep D1 auth
state durable; restoring an old auth database can resurrect revoked sessions.
For rollback, first remove the OIDC runtime settings together to return to token
mode, then deploy the preceding Worker version. Leave additive auth tables and
existing link data intact. Before re-enabling SSO after an auth-state restore,
clear restored auth sessions and rotate the session secret.
