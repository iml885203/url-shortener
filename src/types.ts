export interface Env {
  // D1 Database
  DB: D1Database;
  // KV Namespace
  KV: KVNamespace;
  // R2 Bucket
  R2: R2Bucket;
  // Static assets (dashboard SPA)
  ASSETS: Fetcher;
  // Environment variables
  API_KEY: string;
  SHORT_BASE_URL: string;
  R2_BASE_URL: string;
  DEFAULT_OG_IMAGE: string;
}

export interface LinkRecord {
  id: number;
  url: string;
  og_title: string | null;
  og_desc: string | null;
  og_image: string | null;
  og_enabled: number;
  created_at: string;
  updated_at: string;
}

export interface KVLinkData {
  url: string;
  ogTitle: string | null;
  ogDesc: string | null;
  ogImage: string | null;
  ogEnabled: boolean;
}

export interface ClickRecord {
  id: number;
  link_id: number;
  clicked_at: string;
  referrer: string | null;
  country: string | null;
  user_agent: string | null;
  ip_hash: string | null;
}

export interface LinkWithStats extends LinkRecord {
  click_count: number;
}

export interface DayStats {
  date: string;
  count: number;
}

export interface ReferrerStats {
  referrer: string | null;
  count: number;
}

export interface CountryStats {
  country: string | null;
  count: number;
}

export interface OverviewTopLinkRow {
  id: number;
  url: string;
  click_count: number;
}

export interface OverviewStats {
  todayClicks: number;
  weekClicks: number;
  totalLinks: number;
  topLinks: OverviewTopLinkRow[];
  clicksByDay: DayStats[];
}
