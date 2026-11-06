import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Miniflare } from 'miniflare';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import app from '../packages/dashboard/src/index';
import redirect from '../packages/redirect/src/index';
import type { DashboardEnv } from '../packages/dashboard/src/types';
import { SessionStore } from '../packages/dashboard/src/auth/session-store';

const origin = 'https://short.example', issuer = 'https://identity.example';
const time = () => Math.floor(Date.now() / 1000);
let mf: Miniflare, env: DashboardEnv, stateDirectory: string;
const worker = () => new Miniflare({ modules: true, script: 'export default { fetch() { return new Response("fixture") } }', compatibilityDate: '2026-03-01', d1Persist: stateDirectory, d1Databases: ['DB'], kvNamespaces: ['KV'], r2Buckets: ['R2'] });
let key: Awaited<ReturnType<typeof generateKeyPair>>, jwk: Record<string, unknown>;
let nonce = '', verifierChallenge = '', issued = 0;
let claims: Record<string, unknown> = {}, providerCalls = 0, usedCodes = new Set<string>();
const network = globalThis.fetch;
async function idToken() {
  return new SignJWT({ groups: ['maintainers'], nonce, ...claims }).setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
    .setIssuer(issuer).setAudience('test-client').setSubject('test-user').setIssuedAt(issued).setExpirationTime(time() + 300).sign(key.privateKey);
}
async function request(path: string, init?: RequestInit, values = env) {
  return app.fetch(new Request(origin + path, init), values);
}
function cookie(response: Response, name: string) {
  return response.headers.getSetCookie().find(x => x.startsWith(name + '='))?.split(';')[0] ?? '';
}
async function begin() {
  const response = await request('/auth/oidc?returnTo=/dashboard/links');
  expect(response.status).toBe(302);
  const destination = new URL(response.headers.get('location')!);
  expect(destination.origin).toBe(issuer);
  expect(destination.searchParams.get('code_challenge_method')).toBe('S256');
  expect(destination.searchParams.has('prompt')).toBe(false);
  nonce = destination.searchParams.get('nonce')!;
  verifierChallenge = destination.searchParams.get('code_challenge')!;
  return { state: destination.searchParams.get('state')!, pending: cookie(response, 'short_oidc') };
}
async function login() {
  const { state, pending } = await begin();
  const response = await request(`/auth/callback?code=${crypto.randomUUID()}&state=${state}`, { headers: { Cookie: pending } });
  return { response, session: cookie(response, 'short_session') };
}
async function logoutToken(jti: string, at = time()) {
  return new SignJWT({ events: { 'http://schemas.openid.net/event/backchannel-logout': {} } })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key', typ: 'logout+jwt' }).setIssuer(issuer).setAudience('test-client')
    .setSubject('test-user').setJti(jti).setIssuedAt(at).setExpirationTime(at + 300).sign(key.privateKey);
}
async function notify(token: string) {
  return request('/auth/backchannel-logout', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ logout_token: token }) });
}
beforeAll(async () => {
  key = await generateKeyPair('RS256'); jwk = { ...await exportJWK(key.publicKey), kid: 'test-key', alg: 'RS256', use: 'sig' };
  stateDirectory = await mkdtemp(join(tmpdir(), 'shortener-auth-'));
  mf = worker();
  const DB = await mf.getD1Database('DB');
  for (const name of ['0001_init.sql', '0002_add_og_enabled.sql', '0003_add_custom_slug.sql', '0004_auth_sessions.sql']) {
    const sql = (await readFile(new URL('../migrations/' + name, import.meta.url), 'utf8')).replace(/--[^\n]*/g, '');
    for (const statement of sql.split(';').filter(x => x.trim())) await DB.prepare(statement).run();
  }
  env = { DB: DB as unknown as D1Database, KV: await mf.getKVNamespace('KV') as unknown as KVNamespace, R2: await mf.getR2Bucket('R2') as unknown as R2Bucket,
    ASSETS: { fetch: async () => new Response('<html><head></head><body></body></html>') } as Fetcher,
    API_KEY: 'fixture-api-key', SHORT_BASE_URL: origin, R2_BASE_URL: 'https://images.example', DEFAULT_OG_IMAGE: '',
    OIDC_ISSUER: issuer, OIDC_CLIENT_ID: 'test-client', OIDC_CLIENT_SECRET: 'fixture-client-secret', SESSION_SECRET: 'fixture-session-secret-with-more-than-32-characters', OIDC_REQUIRED_GROUP: 'maintainers' };
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.origin !== issuer) return network(input as Parameters<typeof fetch>[0], init);
    providerCalls++;
    if (url.pathname === '/.well-known/openid-configuration') return Response.json({ issuer, authorization_endpoint: issuer + '/authorize', token_endpoint: issuer + '/token', jwks_uri: issuer + '/jwks', response_types_supported: ['code'], id_token_signing_alg_values_supported: ['RS256'], token_endpoint_auth_methods_supported: ['client_secret_basic'], code_challenge_methods_supported: ['S256'] });
    if (url.pathname === '/jwks') return Response.json({ keys: [jwk] });
    if (url.pathname === '/token') {
      const body = new URLSearchParams(String(init?.body));
      const code = body.get('code')!;
      if (usedCodes.has(code)) return Response.json({ error: 'invalid_grant' }, { status: 400 });
      usedCodes.add(code);
      const verifier = body.get('code_verifier')!;
      const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
      expect(Buffer.from(digest).toString('base64url')).toBe(verifierChallenge);
      return Response.json({ access_token: 'fixture-access-token', token_type: 'Bearer', expires_in: 300, id_token: await idToken() });
    }
    throw new Error('Unexpected fixture route');
  });
});
beforeEach(async () => {
  claims = {}; issued = time() - 5; usedCodes = new Set();
  for (const table of ['auth_sessions', 'auth_revoked', 'auth_replay', 'links', 'clicks']) await env.DB.prepare(`DELETE FROM ${table}`).run();
});
afterAll(async () => { vi.unstubAllGlobals(); await mf?.dispose(); await rm(stateDirectory, { recursive: true, force: true }); });

describe('independent API-key and OIDC authentication', () => {
  it('preserves token-only installations and never starts SSO on page entry', async () => {
    const plain = { ...env, OIDC_ISSUER: undefined, OIDC_CLIENT_ID: undefined, OIDC_CLIENT_SECRET: undefined, SESSION_SECRET: undefined, OIDC_REQUIRED_GROUP: undefined };
    const before = providerCalls;
    expect((await request('/api/links', undefined, plain)).status).toBe(401);
    expect((await request('/api/me', { headers: { 'X-API-Key': 'fixture-api-key' } }, plain)).status).toBe(200);
    expect((await (await request('/api/auth/session', undefined, plain)).json()).oidc.enabled).toBe(false);
    expect((await request('/dashboard/login')).headers.get('cache-control')).toBe('no-store');
    expect(providerCalls).toBe(before);
    expect((await request('/api/me', { headers: { 'X-API-Key': 'fixture-api-key' } }, { ...plain, OIDC_CLIENT_ID: 'partial' })).status).toBe(503);
  });
  it('verifies real signed ID tokens, PKCE, state, nonce and group before a durable session', async () => {
    const { response, session } = await login();
    expect(response.status).toBe(303); expect(response.headers.get('location')).toBe('/dashboard/links');
    expect(session).toMatch(/^short_session=[a-f0-9]{64}$/);
    expect(response.headers.getSetCookie().join(';')).toContain('Max-Age=15552000');
    expect(response.headers.getSetCookie().join(';')).toContain('HttpOnly');
    expect(response.headers.getSetCookie().join(';')).toContain('Secure');
    expect(response.headers.getSetCookie().join(';')).not.toContain('Domain=');
    expect((await request('/api/me', { headers: { Cookie: session } })).status).toBe(200);
    const persisted = await new SessionStore(env.DB, env.SESSION_SECRET!).read(session.split('=')[1]);
    expect(persisted?.subject).toBe('test-user');
    expect(await new SessionStore(env.DB, 'rotated-secret').read(session.split('=')[1])).toBeNull();
    const stored = await env.DB.prepare('SELECT id_hash FROM auth_sessions').first<{ id_hash: string }>();
    expect(stored?.id_hash).not.toBe(session.split('=')[1]);
  });
  it('rejects cancelled, wrong-state, wrong-nonce and unauthorized callbacks without sessions', async () => {
    const start = await begin();
    const mismatch = await request('/auth/callback?code=bad&state=wrong', { headers: { Cookie: start.pending } });
    expect(mismatch.headers.get('location')).toContain('error=oidc');
    claims = { nonce: 'wrong' }; expect((await login()).session).toBe('');
    claims = { groups: ['unrelated'] }; expect((await login()).session).toBe('');
    claims = {};
    const cancelled = await request(`/auth/callback?error=access_denied&state=${start.state}`, { headers: { Cookie: start.pending } });
    expect(cancelled.headers.get('location')).toContain('error=oidc');
    expect((await env.DB.prepare('SELECT count(*) AS count FROM auth_sessions').first<{ count: number }>())?.count).toBe(0);
  });
  it('blocks cross-origin cookie writes and revokes copied cookies on local logout while keys survive', async () => {
    const { session } = await login();
    expect((await request('/api/links', { method: 'POST', headers: { Cookie: session, Origin: 'https://other.example' }, body: '{}' })).status).toBe(403);
    expect((await request('/auth/logout', { method: 'POST', headers: { Cookie: session } })).status).toBe(403);
    expect((await request('/auth/logout', { method: 'POST', headers: { Cookie: session, Origin: origin } })).status).toBe(200);
    expect((await request('/api/me', { headers: { Cookie: session } })).status).toBe(401);
    expect((await request('/api/me', { headers: { Authorization: 'Bearer fixture-api-key' } })).status).toBe(200);
    expect((await (await request('/api/auth/session')).json()).authenticated).toBe(false);
  });
  it('validates central revocation, preserves later logins on identical replay and blocks old callbacks', async () => {
    const { session } = await login();
    const token = await logoutToken('event-one');
    expect((await notify(token)).status).toBe(200);
    expect((await request('/api/me', { headers: { Cookie: session } })).status).toBe(401);
    expect((await login()).session).toBe('');
    issued = time() + 1;
    const later = await login(); expect(later.session).not.toBe('');
    expect((await notify(token)).status).toBe(200);
    expect((await request('/api/me', { headers: { Cookie: later.session } })).status).toBe(200);
    const laterTime = (time() + 2) * 1000;
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(laterTime);
    try { expect((await notify(await logoutToken('event-two'))).status).toBe(200); } finally { vi.useRealTimers(); }
    expect((await request('/api/me', { headers: { Cookie: later.session } })).status).toBe(401);
    expect((await notify('forged')).status).toBe(400);
  });
  it('persists sessions across a real Worker storage restart', async () => {
    const { session } = await login();
    await mf.dispose(); mf = worker();
    env.DB = await mf.getD1Database('DB') as unknown as D1Database;
    env.KV = await mf.getKVNamespace('KV') as unknown as KVNamespace;
    env.R2 = await mf.getR2Bucket('R2') as unknown as R2Bucket;
    expect((await request('/api/me', { headers: { Cookie: session } })).status).toBe(200);
    await notify(await logoutToken('persisted-revocation'));
    await mf.dispose(); mf = worker();
    env.DB = await mf.getD1Database('DB') as unknown as D1Database;
    env.KV = await mf.getKVNamespace('KV') as unknown as KVNamespace;
    env.R2 = await mf.getR2Bucket('R2') as unknown as R2Bucket;
    expect((await request('/api/me', { headers: { Cookie: session } })).status).toBe(401);
  });
  it('rejects invalid signed logout claims and bounded bodies', async () => {
    const valid = { sub: 'test-user', iss: issuer, aud: 'test-client', iat: time(), exp: time() + 100, jti: 'invalid-fixture', events: { 'http://schemas.openid.net/event/backchannel-logout': {} } };
    for (const change of [{ aud: 'wrong-client' }, { iss: 'https://other.example' }, { exp: time() - 1 }, { nonce: 'forbidden' }, { sid: 'unsupported' }, { events: {} }, { exp: time() + 600 }]) {
      const token = await new SignJWT({ ...valid, ...change }).setProtectedHeader({ alg: 'RS256', kid: 'test-key', typ: 'logout+jwt' }).sign(key.privateKey);
      expect((await notify(token)).status).toBe(400);
    }
    const forged = await new SignJWT(valid).setProtectedHeader({ alg: 'RS256', kid: 'test-key', typ: 'logout+jwt' }).sign((await generateKeyPair('RS256')).privateKey);
    expect((await notify(forged)).status).toBe(400);
    expect((await notify('x'.repeat(17000))).status).toBe(400);
  });
  it('keeps public short-code redirects independent from identity availability', async () => {
    const created = await request('/api/links', { method: 'POST', headers: { 'X-API-Key': 'fixture-api-key', 'Content-Type': 'application/json' }, body: JSON.stringify({ url: 'https://destination.example/article', customSlug: 'public-test' }) });
    expect(created.status).toBe(201);
    const tasks: Promise<unknown>[] = [];
    const result = await redirect.fetch(new Request(origin + '/public-test'), env, { waitUntil: (task: Promise<unknown>) => tasks.push(task), passThroughOnException() {} } as unknown as ExecutionContext);
    await Promise.all(tasks);
    expect(result.status).toBe(302); expect(result.headers.get('location')).toBe('https://destination.example/article');
  });
});
