export interface LinkRecord {
  id: number;
  url: string;
  og_title: string | null;
  og_desc: string | null;
  og_image: string | null;
  og_enabled: number;
  custom_slug: string | null;
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

export interface KVCustomSlugPointer {
  id: number;
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
