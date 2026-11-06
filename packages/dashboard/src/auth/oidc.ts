import { Hono, type Context, type MiddlewareHandler } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import * as oidc from 'openid-client';
import { createRemoteJWKSet, jwtVerify, SignJWT, type JWTPayload } from 'jose';
import type { DashboardEnv } from '../types.js';
import { SessionStore, SESSION_SECONDS } from './session-store.js';
import { hasApiKey } from '../utils/auth.js';

declare module 'hono' { interface ContextVariableMap { browserAuthenticated: boolean } }
type Env = { Bindings: DashboardEnv };
type Config = { issuer: string; clientId: string; clientSecret: string; secret: string; origin: string; group: string; label: string };
const SESSION = 'short_session', TRANSACTION = 'short_oidc';
const now = () => Math.floor(Date.now() / 1000);
const algorithms = ['RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'EdDSA', 'PS256', 'PS384', 'PS512'];
const secretBytes = (config: Config) => new TextEncoder().encode(config.secret);
export function configuration(env: DashboardEnv): Config | null {
  const values = [env.OIDC_ISSUER, env.OIDC_CLIENT_ID, env.OIDC_CLIENT_SECRET, env.SESSION_SECRET, env.OIDC_REQUIRED_GROUP];
  if (!values.some(Boolean)) return null;
  if (![env.OIDC_ISSUER, env.OIDC_CLIENT_ID, env.OIDC_CLIENT_SECRET, env.SESSION_SECRET].every(Boolean) || env.SESSION_SECRET!.length < 32) throw new Error('Incomplete OIDC configuration');
  const issuer = new URL(env.OIDC_ISSUER!);
  const origin = new URL(env.SHORT_BASE_URL);
  for (const url of [issuer, origin]) {
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('OIDC requires HTTPS URLs');
  }
  if (origin.pathname !== '/') throw new Error('Application origin must not contain a path');
  return { issuer: env.OIDC_ISSUER!, clientId: env.OIDC_CLIENT_ID!, clientSecret: env.OIDC_CLIENT_SECRET!, secret: env.SESSION_SECRET!, origin: origin.origin, group: env.OIDC_REQUIRED_GROUP ?? '', label: env.OIDC_PROVIDER_NAME?.trim().slice(0, 64) || 'SSO' };
}
export interface Provider {
  authorization(config: Config, parameters: Record<string, string>): Promise<URL>;
  exchange(config: Config, url: URL, checks: { state: string; nonce: string; verifier: string }): Promise<JWTPayload>;
  logout(config: Config, token: string): Promise<JWTPayload>;
}
const configurations = new Map<string, Promise<oidc.Configuration>>();
async function providerConfig(config: Config) {
  const key = JSON.stringify([config.issuer, config.clientId, config.clientSecret]);
  let promise = configurations.get(key);
  if (!promise) {
    promise = oidc.discovery(new URL(config.issuer), config.clientId, config.clientSecret, undefined,
      { timeout: 10, execute: [oidc.enableNonRepudiationChecks] });
    configurations.set(key, promise);
    promise.catch(() => configurations.delete(key));
  }
  return promise;
}
const keys = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
const defaultProvider: Provider = {
  async authorization(config, parameters) { return oidc.buildAuthorizationUrl(await providerConfig(config), parameters); },
  async exchange(config, url, checks) {
    const tokens = await oidc.authorizationCodeGrant(await providerConfig(config), url, {
      pkceCodeVerifier: checks.verifier, expectedState: checks.state, expectedNonce: checks.nonce, idTokenExpected: true,
    });
    const claims = tokens.claims();
    if (!claims) throw new Error('Missing ID token');
    return claims;
  },
  async logout(config, token) {
    const metadata = (await providerConfig(config)).serverMetadata();
    const uri = new URL(metadata.jwks_uri!);
    if (uri.protocol !== 'https:' || uri.username || uri.password || uri.hash) throw new Error('Invalid JWKS URI');
    let jwks = keys.get(uri.href);
    if (!jwks) { jwks = createRemoteJWKSet(uri, { timeoutDuration: 10000, cacheMaxAge: 300000 }); keys.set(uri.href, jwks); }
    const { payload, protectedHeader } = await jwtVerify(token, jwks, { issuer: config.issuer, audience: config.clientId, algorithms, typ: 'logout+jwt', maxTokenAge: '5m', requiredClaims: ['sub', 'iat', 'exp', 'jti'] });
    if (protectedHeader.crit) throw new Error('Invalid logout header');
    return payload;
  },
};
function options(maxAge: number) { return { path: '/', secure: true, httpOnly: true, sameSite: 'Lax' as const, maxAge }; }
function clear(c: Context<Env>, name: string) { setCookie(c, name, '', options(0)); }
function safeReturn(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/dashboard/') || /[\\\x00-\x20\x7f]/.test(value)) return '/dashboard/';
  const url = new URL(value, 'https://app.invalid');
  return url.origin === 'https://app.invalid' ? url.pathname + url.search : '/dashboard/';
}
function store(c: Context<Env>, config: Config) { return new SessionStore(c.env.DB, config.secret); }
function noStore(c: Context<Env>) { c.header('Cache-Control', 'no-store'); c.header('Referrer-Policy', 'same-origin'); }
function loginFailure(c: Context<Env>) { clear(c, TRANSACTION); return c.redirect('/dashboard/login?error=oidc', 303); }
function validSubject(value: unknown): value is string { return typeof value === 'string' && value.length > 0 && value.length <= 256; }
export function validateLogout(claims: JWTPayload) {
  const event = (claims.events as Record<string, unknown> | undefined)?.['http://schemas.openid.net/event/backchannel-logout'];
  if (!validSubject(claims.sub) || !validSubject(claims.jti) || !Number.isSafeInteger(claims.iat) || claims.iat! <= 0 || claims.iat! > now() + 30 || !Number.isSafeInteger(claims.exp) || claims.exp! <= now() || claims.exp! > claims.iat! + 300 || 'nonce' in claims || 'sid' in claims || !event || typeof event !== 'object' || Array.isArray(event) || Object.keys(event).length) throw new Error('Invalid logout event');
}
function transient(error: unknown): boolean {
  const value = error as { name?: string; code?: string };
  return ['TypeError', 'AbortError', 'TimeoutError'].includes(value.name ?? '') || ['ERR_JWKS_TIMEOUT', 'ERR_JOSE_GENERIC', 'OAUTH_RESPONSE_IS_NOT_CONFORM'].includes(value.code ?? '');
}
export function authentication(provider: Provider = defaultProvider): { router: Hono<Env>; middleware: MiddlewareHandler<Env> } {
  const router = new Hono<Env>();
  let logoutInFlight = 0;
  router.use('/auth/backchannel-logout', async (c, next) => {
    if (logoutInFlight >= 4) return c.json({ error: 'Please retry the notification' }, 503);
    logoutInFlight++;
    try { await next(); } finally { logoutInFlight--; }
    return undefined;
  });
  router.use('*', async (c, next) => { noStore(c); await next(); });
  router.get('/api/auth/session', async c => {
    try {
      const config = configuration(c.env);
      const session = config ? await store(c, config).read(getCookie(c, SESSION)) : null;
      return c.json({ authenticated: Boolean(session) || hasApiKey(c), sessionAuthenticated: Boolean(session), oidc: { enabled: Boolean(config), label: config?.label ?? 'SSO' } });
    } catch { return c.json({ error: 'Sign-in is temporarily unavailable. Please try again.' }, 503); }
  });
  router.get('/auth/oidc', async c => {
    try {
      const config = configuration(c.env);
      if (!config) return c.json({ error: 'SSO is not configured' }, 404);
      if (new URL(c.req.url).origin !== config.origin) return c.json({ error: 'Invalid request origin' }, 400);
      const verifier = oidc.randomPKCECodeVerifier(), state = oidc.randomState(), nonce = oidc.randomNonce();
      const transaction = await new SignJWT({ verifier, state, nonce, returnTo: safeReturn(c.req.query('returnTo')) })
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' }).setAudience(config.clientId).setIssuer(config.origin).setIssuedAt().setExpirationTime('10m').sign(secretBytes(config));
      const destination = await provider.authorization(config, {
        redirect_uri: config.origin + '/auth/callback', response_type: 'code', scope: config.group ? 'openid profile groups' : 'openid profile',
        code_challenge: await oidc.calculatePKCECodeChallenge(verifier), code_challenge_method: 'S256', state, nonce,
      });
      setCookie(c, TRANSACTION, transaction, options(600));
      return c.redirect(destination.href);
    } catch { return loginFailure(c); }
  });
  router.get('/auth/callback', async c => {
    try {
      const config = configuration(c.env);
      if (!config || new URL(c.req.url).origin !== config.origin) throw new Error('Invalid callback');
      const pending = getCookie(c, TRANSACTION);
      if (!pending || pending.length > 4096) throw new Error('Missing transaction');
      const { payload } = await jwtVerify(pending, secretBytes(config), { algorithms: ['HS256'], typ: 'JWT', audience: config.clientId, issuer: config.origin, maxTokenAge: '10m', requiredClaims: ['exp', 'iat'] });
      if (![payload.state, payload.nonce, payload.verifier].every(x => typeof x === 'string' && x.length >= 32)) throw new Error('Invalid transaction');
      const claims = await provider.exchange(config, new URL(c.req.url), { state: payload.state as string, nonce: payload.nonce as string, verifier: payload.verifier as string });
      if (!validSubject(claims.sub) || !Number.isSafeInteger(claims.iat) || claims.iat! <= 0 || claims.iat! > now() + 30 || !Number.isSafeInteger(claims.exp) || claims.exp! <= now() || (config.group && (!Array.isArray(claims.groups) || !claims.groups.includes(config.group)))) throw new Error('Access denied');
      const token = await store(c, config).create(claims.sub, claims.iat!);
      // Revoke the session replaced by a new successful login in this browser.
      await store(c, config).logout(getCookie(c, SESSION));
      clear(c, TRANSACTION);
      setCookie(c, SESSION, token, options(SESSION_SECONDS));
      return c.redirect(safeReturn(payload.returnTo), 303);
    } catch { return loginFailure(c); }
  });
  router.post('/auth/logout', async c => {
    try {
      const config = configuration(c.env);
      const origin = config?.origin ?? new URL(c.env.SHORT_BASE_URL).origin;
      if (c.req.header('Origin') !== origin || new URL(c.req.url).origin !== origin) return c.json({ error: 'Invalid request origin' }, 403);
      if (config) await store(c, config).logout(getCookie(c, SESSION));
      clear(c, SESSION); clear(c, TRANSACTION);
      return c.json({ success: true });
    } catch { return c.json({ error: 'Sign-out failed. Please try again.' }, 503); }
  });
  router.post('/auth/backchannel-logout', async c => {
    let config: Config | null;
    try { config = configuration(c.env); } catch { return c.json({ error: 'Authentication unavailable' }, 503); }
    if (!config) return c.json({ error: 'SSO is not configured' }, 404);
    let claims: JWTPayload;
    try {
      if (c.req.header('Content-Type')?.split(';')[0].trim() !== 'application/x-www-form-urlencoded') throw new Error('Invalid content type');
      // Bound streamed bodies too, rather than trusting Content-Length.
      const reader = c.req.raw.body?.getReader();
      if (!reader) throw new Error('Missing body');
      const chunks: Uint8Array[] = []; let size = 0;
      let timedOut = false;
      const timer = setTimeout(() => { timedOut = true; void reader.cancel(); }, 10000);
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 16384) throw new Error('Oversized body');
          chunks.push(value);
        }
      } finally { clearTimeout(timer); await reader.cancel(); }
      if (timedOut) throw new Error('Notification deadline exceeded');
      const bytes = new Uint8Array(size); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      const form = new URLSearchParams(new TextDecoder().decode(bytes));
      const token = form.get('logout_token');
      if (form.getAll('logout_token').length !== 1 || !token || token.length > 8192) throw new Error('Invalid notification');
      claims = await provider.logout(config, token);
      validateLogout(claims);
    } catch (error) { return c.json({ error: 'Invalid or unavailable logout notification' }, transient(error) ? 503 : 400); }
    try { await store(c, config).revoke(claims.sub!, claims.iat!, claims.jti!, claims.exp!); }
    catch { return c.json({ error: 'Session storage unavailable' }, 503); }
    return c.json({ success: true });
  });
  const middleware: MiddlewareHandler<Env> = async (c, next) => {
    noStore(c);
    try {
      const config = configuration(c.env);
      // Keys remain independent machine credentials and continue to work without OIDC.
      if (hasApiKey(c)) { await next(); return; }
      const session = config ? await store(c, config).read(getCookie(c, SESSION)) : null;
      if (!session) return c.json({ error: 'Unauthorized' }, 401);
      if (!['GET', 'HEAD', 'OPTIONS'].includes(c.req.method) && c.req.header('Origin') !== config!.origin) return c.json({ error: 'Invalid request origin' }, 403);
      c.set('browserAuthenticated', true);
    } catch { return c.json({ error: 'Authentication unavailable' }, 503); }
    await next();
    return undefined;
  };
  return { router, middleware };
}
