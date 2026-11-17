import { beforeAll, afterAll, beforeEach, expect, it } from 'vitest';
import { Miniflare } from 'miniflare';
import { readFile } from 'node:fs/promises';
import app from '../packages/dashboard/src/index';
import redirect from '../packages/redirect/src/index';
import { sqidsEncodeId } from '../packages/shared/src/index';
import type { DashboardEnv } from '../packages/dashboard/src/types';
let mf: Miniflare, env: DashboardEnv;
beforeAll(async () => {
  mf = new Miniflare({ modules: true, script: 'export default { fetch() { return new Response() } }', compatibilityDate: '2026-03-01', d1Databases: ['DB'], kvNamespaces: ['KV'], r2Buckets: ['R2'] });
  const DB = await mf.getD1Database('DB');
  for (const name of ['0001_init.sql', '0002_add_og_enabled.sql', '0003_add_custom_slug.sql', '0004_auth_sessions.sql']) {
    const sql = (await readFile(new URL('../migrations/' + name, import.meta.url), 'utf8')).replace(/--[^\n]*/g, '');
    for (const statement of sql.split(';').filter(x => x.trim())) await DB.prepare(statement).run();
  }
  const routingSql = await readFile(new URL('../migrations/0005_short_codes.sql', import.meta.url), 'utf8');
  for (const statement of routingSql.replace(/--[^\n]*/g, '').match(/\s*CREATE TRIGGER[\s\S]*?END;|[^;]+;/g) ?? []) await DB.prepare(statement).run();
  env = { DB, KV: await mf.getKVNamespace('KV'), R2: await mf.getR2Bucket('R2'), API_KEY: 'test', SHORT_BASE_URL: 'https://short.example', R2_BASE_URL: 'https://images.example', DEFAULT_OG_IMAGE: '' } as unknown as DashboardEnv;
});
afterAll(async () => { await mf.dispose(); });
beforeEach(async () => { await env.DB.prepare('DELETE FROM links').run(); });
async function api(path: string, method = 'GET', body?: unknown) {
  return app.fetch(new Request('https://short.example/api/links' + path, { method, headers: { 'X-API-Key': 'test', 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }), env);
}
async function resolve(slug: string) {
  const tasks: Promise<unknown>[] = [];
  const response = await redirect.fetch(new Request('https://short.example/' + slug), env, { waitUntil: (p: Promise<unknown>) => tasks.push(p), passThroughOnException() {} } as ExecutionContext);
  await Promise.all(tasks); return response;
}
it('resolves a custom code after its 24h KV pointer expires', async () => {
  const created = await api('', 'POST', { url: 'https://destination.example/custom', customSlug: 'cache-expiry-test' });
  expect(created.status).toBe(201);
  await env.KV.delete('custom:cache-expiry-test');
  const response = await resolve('cache-expiry-test');
  expect(response.status).toBe(302);
  expect(response.headers.get('location')).toBe('https://destination.example/custom');
});
it('ignores stale KV content and pointers after rename and deletion', async () => {
  const link = await (await api('', 'POST', { url: 'https://destination.example/old', customSlug: 'rename-old' })).json();
  await env.KV.put('custom:rename-old', JSON.stringify({ id: link.id }));
  await env.KV.put(String(link.id), JSON.stringify({ url: 'https://destination.example/stale' }));
  expect((await api('/' + link.id, 'PUT', { customSlug: 'rename-new', url: 'https://destination.example/new' })).status).toBe(200);
  expect((await resolve('rename-old')).status).toBe(404);
  expect((await resolve('rename-new')).headers.get('location')).toBe('https://destination.example/new');
  expect((await resolve(sqidsEncodeId(link.id))).headers.get('location')).toBe('https://destination.example/new');
  expect((await api('/' + link.id, 'DELETE')).status).toBe(200);
  expect((await resolve('rename-new')).status).toBe(404);
  expect((await resolve(sqidsEncodeId(link.id))).status).toBe(404);
});
it('rejects custom collisions with existing auto and custom codes on create and rename', async () => {
  const a = await (await api('', 'POST', { url: 'https://destination.example/a', customSlug: 'collision-a' })).json();
  const b = await (await api('', 'POST', { url: 'https://destination.example/b' })).json();
  for (const customSlug of [sqidsEncodeId(a.id), 'collision-a']) {
    expect((await api('', 'POST', { url: 'https://destination.example/c', customSlug })).status).toBe(409);
    expect((await api('/' + b.id, 'PUT', { customSlug })).status).toBe(409);
  }
  await expect(env.DB.prepare('UPDATE links SET custom_slug = ? WHERE id = ?').bind(sqidsEncodeId(a.id), b.id).run()).rejects.toThrow('UNIQUE');
  expect((await resolve(sqidsEncodeId(a.id))).headers.get('location')).toBe('https://destination.example/a');
});
it('skips a future auto code reserved by a custom code', async () => {
  const seq = await env.DB.prepare("SELECT seq FROM sqlite_sequence WHERE name = 'links'").first<{ seq: number }>();
  const next = (seq?.seq ?? 0) + 1;
  const customSlug = sqidsEncodeId(next + 1);
  const owner = await (await api('', 'POST', { url: 'https://destination.example/owner', customSlug })).json();
  const generated = await (await api('', 'POST', { url: 'https://destination.example/generated' })).json();
  expect(generated.id).toBe(next + 2);
  expect((await resolve(customSlug)).headers.get('location')).toBe('https://destination.example/owner');
  expect((await api('/' + owner.id, 'PUT', { customSlug: null })).status).toBe(200);
  expect((await resolve(customSlug)).status).toBe(404);
});
it('arbitrates concurrent creates and code reservations in the database', async () => {
  const results = await Promise.all(Array.from({ length: 4 }, () => api('', 'POST', { url: 'https://destination.example/race', customSlug: 'race-test' })));
  expect(results.filter(r => r.status === 201)).toHaveLength(1);
  expect(results.filter(r => r.status === 409)).toHaveLength(3);
});
it('validates JSON field types, IDs and reserved auth route', async () => {
  for (const body of [null, [], { url: 123 }, { url: 'https://example.com', customSlug: 1 }, { url: 'https://example.com', ogTitle: {} }, { url: 'javascript:alert(1)' }, { url: 'https://example.com', customSlug: 'auth' }]) {
    expect((await api('', 'POST', body)).status).toBe(400);
  }
  for (const body of [null, [], { url: 12 }, { customSlug: false }, { ogImage: [] }]) expect((await api('/1', 'PUT', body)).status).toBe(400);
  for (const id of ['1bad', '-1', '9007199254740992', '1.2']) expect((await api('/' + id, 'DELETE')).status).toBe(400);
});
it('searches custom codes', async () => {
  await api('', 'POST', { url: 'https://destination.example/search', customSlug: 'find-this-custom' });
  const response = await (await api('?q=find-this-custom')).json();
  expect(response.total).toBe(1);
});
it('does not resurrect KV pointers when a custom code is reused', async () => {
  const first = await (await api('', 'POST', { url: 'https://destination.example/first', customSlug: 'reuse-code' })).json();
  await env.KV.put('custom:reuse-code', JSON.stringify({ id: first.id }));
  await api('/' + first.id, 'DELETE');
  await api('', 'POST', { url: 'https://destination.example/second', customSlug: 'reuse-code' });
  expect((await resolve('reuse-code')).headers.get('location')).toBe('https://destination.example/second');
});
it('keeps independent concurrent partial edits', async () => {
  const link = await (await api('', 'POST', { url: 'https://destination.example/before' })).json();
  await Promise.all([api('/' + link.id, 'PUT', { ogTitle: 'New title' }), api('/' + link.id, 'PUT', { url: 'https://destination.example/after' })]);
  const updated = await (await api('/' + link.id)).json();
  expect(updated.url).toBe('https://destination.example/after'); expect(updated.ogTitle).toBe('New title');
});
it('keeps a shared OG image until its last referencing link is deleted', async () => {
  const ogImage = env.R2_BASE_URL + '/shared.png';
  await env.R2.put('shared.png', 'fixture');
  const a = await (await api('', 'POST', { url: 'https://destination.example/a', ogImage })).json();
  const b = await (await api('', 'POST', { url: 'https://destination.example/b', ogImage })).json();
  await api('/' + a.id, 'DELETE'); expect(await env.R2.head('shared.png')).not.toBeNull();
  await api('/' + b.id, 'DELETE'); expect(await env.R2.head('shared.png')).toBeNull();
});
it('accepts canonical Logan links and rejects unsafe or noncanonical aliases', async () => {
  const link = await (await api('', 'POST', { url: 'https://destination.example/canonical' })).json();
  const slug = new URL(link.longUrl).pathname.slice(1);
  expect((await resolve(slug)).status).toBe(302);
  expect((await resolve('l' + 'ᴏ'.repeat(40) + 'gan')).status).toBe(404);
  expect((await resolve('lo' + decodeURIComponent(slug).slice(1))).status).toBe(404);
});
it('escapes OG metadata and excludes previews from click analytics', async () => {
  const link = await (await api('', 'POST', { url: 'https://destination.example/og?a=1&b=2', customSlug: 'og-safety', ogEnabled: true, ogTitle: '<script>alert("x")</script>', ogDesc: '" onload="bad' })).json();
  const response = await resolve('og-safety?og=1');
  const html = await response.text();
  expect(response.status).toBe(200); expect(html).toContain('&lt;script&gt;'); expect(html).not.toContain('<script>');
  expect(html).toContain('a=1&amp;b=2');
  const count = await env.DB.prepare('SELECT count(*) AS n FROM clicks WHERE link_id = ?').bind(link.id).first<{ n: number }>();
  expect(count?.n).toBe(0);
});
