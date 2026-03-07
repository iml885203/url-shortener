import { optimizeOgImage } from '@/utils/image';

const BASE = '/api';

function getKey(): string {
  return localStorage.getItem('api_key') ?? '';
}

function headers(extra: Record<string, string> = {}): Record<string, string> {
  return {
    'X-API-Key': getKey(),
    ...extra,
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error: string }).error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

export interface Link {
  id: number;
  url: string;
  shortUrl: string;
  longUrl: string;
  ogTitle: string | null;
  ogDesc: string | null;
  ogImage: string | null;
  ogEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  clickCount?: number;
}

export interface ListLinksParams {
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedLinks {
  items: Link[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface LinkSharePayload {
  shortUrl: string;
  longUrl: string;
  targetUrl: string;
  shortShareText: string;
  longShareText: string;
}

export interface Stats {
  byDay: { date: string; count: number }[];
  byReferrer: { referrer: string | null; count: number }[];
  byCountry: { country: string | null; count: number }[];
}

export interface DestinationOgPreview {
  title: string | null;
  description: string | null;
  image: string | null;
  domain: string;
}

export interface OverviewTopLink {
  id: number;
  url: string;
  shortUrl: string;
  longUrl: string;
  clickCount: number;
}

export interface OverviewStats {
  todayClicks: number;
  weekClicks: number;
  totalLinks: number;
  topLinks: OverviewTopLink[];
  clicksByDay: { date: string; count: number }[];
}

export async function verifyKey(key: string): Promise<boolean> {
  const res = await fetch(`${BASE}/me`, {
    headers: { 'X-API-Key': key },
  });
  return res.ok;
}

export async function listLinks(params: ListLinksParams = {}): Promise<PaginatedLinks> {
  const query = new URLSearchParams();
  if (params.q?.trim()) query.set('q', params.q.trim());
  if (params.page && params.page > 0) query.set('page', String(params.page));
  if (params.pageSize && params.pageSize > 0) query.set('pageSize', String(params.pageSize));
  const suffix = query.size > 0 ? `?${query.toString()}` : '';

  return handleResponse<PaginatedLinks>(await fetch(`${BASE}/links${suffix}`, { headers: headers() }));
}

export async function getLink(id: number): Promise<Link> {
  return handleResponse<Link>(await fetch(`${BASE}/links/${id}`, { headers: headers() }));
}

export async function getLinkShare(id: number): Promise<LinkSharePayload> {
  return handleResponse<LinkSharePayload>(
    await fetch(`${BASE}/links/${id}/share`, { headers: headers() })
  );
}

export async function getLinkQrBlob(id: number): Promise<Blob> {
  const res = await fetch(`${BASE}/links/${id}/qr`, { headers: headers() });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error: string }).error ?? res.statusText);
  }
  return res.blob();
}

export async function createLink(data: {
  url: string;
  ogTitle?: string;
  ogDesc?: string;
  ogImage?: string;
  ogEnabled?: boolean;
}): Promise<Link> {
  return handleResponse<Link>(
    await fetch(`${BASE}/links`, {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    })
  );
}

export async function updateLink(
  id: number,
  data: {
    url?: string;
    ogTitle?: string | null;
    ogDesc?: string | null;
    ogImage?: string | null;
    ogEnabled?: boolean;
  }
): Promise<Link> {
  return handleResponse<Link>(
    await fetch(`${BASE}/links/${id}`, {
      method: 'PUT',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    })
  );
}

export async function deleteLink(id: number): Promise<void> {
  await handleResponse<{ success: boolean }>(
    await fetch(`${BASE}/links/${id}`, {
      method: 'DELETE',
      headers: headers(),
    })
  );
}

export async function getLinkStats(id: number): Promise<Stats> {
  return handleResponse<Stats>(await fetch(`${BASE}/links/${id}/stats`, { headers: headers() }));
}

export async function getOverviewStats(): Promise<OverviewStats> {
  return handleResponse<OverviewStats>(
    await fetch(`${BASE}/stats/overview`, { headers: headers() })
  );
}

export async function uploadImage(linkId: number, file: File): Promise<string> {
  const optimized = await optimizeOgImage(file);

  const form = new FormData();
  form.append('image', optimized);
  form.append('linkId', String(linkId));

  const res = await fetch(`${BASE}/upload`, {
    method: 'POST',
    headers: { 'X-API-Key': getKey() },
    body: form,
  });
  const data = await handleResponse<{ url: string }>(res);
  return data.url;
}

export async function fetchDestinationOgPreview(url: string): Promise<DestinationOgPreview> {
  return handleResponse<DestinationOgPreview>(
    await fetch(`${BASE}/preview/fetch-og`, {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ url }),
    })
  );
}
