import { EPageStatus } from "@/types";

export const CrawlScope = {
  FULL_WEBSITE: "full_website",
  SUBDOMAIN_ONLY: "subdomain_only",
} as const;

export const DISCOVER_PENDING_KEY_PREFIX = "discover:pending";
export const DISCOVER_SEEN_KEY_PREFIX = "discover:seen";
export const DISCOVERED_PAGE_STATUSES: EPageStatus[] = [
  EPageStatus.Pending,
  EPageStatus.Processing,
  EPageStatus.PendingIndex,
  EPageStatus.Ignored,
  EPageStatus.Completed,
  EPageStatus.Failed,
];
