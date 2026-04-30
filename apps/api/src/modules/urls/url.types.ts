import type { UrlAdMode, UrlStatus } from "../../types/common";

export type CreateShortUrlInput = {
  originalUrl: string;
  customAlias?: string;
  adMode?: UrlAdMode;
  title?: string;
  description?: string;
  expiresAt?: string;
};

export type BulkCreateShortUrlInput = {
  urls: string[]; // List of URLs, one per line
  adMode?: UrlAdMode;
};

export type UpdateShortUrlInput = {
  originalUrl?: string;
  adMode?: UrlAdMode;
  title?: string;
  description?: string;
  expiresAt?: string | null;
};

export type ListUserUrlsQuery = {
  page: number;
  limit: number;
  status?: UrlStatus;
  search?: string;
};

export type UrlListItem = {
  id: string;
  shortCode: string;
  shortUrl: string;
  originalUrl: string;
  normalizedUrl: string;
  adMode: UrlAdMode;
  isCustomAlias: boolean;
  status: UrlStatus;
  clickCount: number;
  title?: string;
  description?: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};
