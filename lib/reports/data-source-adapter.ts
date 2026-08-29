import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_REPORT_TEMPLATE_KEY } from "@/config/report";

export type ReportDataContext = {
  workspaceId: string;
  botId: string;
  scope: Record<string, unknown>; // opaque — engine never reads scope keys
  language: string;
};

export type DataSourceAdapter = (
  client: SupabaseClient,
  ctx: ReportDataContext
) => Promise<Record<string, unknown>>;

const registry = new Map<string, DataSourceAdapter>();

export function registerDataSource(key: string, adapter: DataSourceAdapter): void {
  registry.set(key, adapter);
}

export function getDataSource(key: string): DataSourceAdapter {
  const adapter = registry.get(key);
  if (!adapter) {
    throw new Error(`No DataSourceAdapter registered for template key: "${key}"`);
  }
  return adapter;
}

export const KNOWN_TEMPLATE_KEYS = [
  "student-competency-report",
  DEFAULT_REPORT_TEMPLATE_KEY,
  "logic-hub-report",
] as const;

export function getRegisteredKeys(): string[] {
  const keys = new Set<string>([...KNOWN_TEMPLATE_KEYS, ...Array.from(registry.keys())]);
  return Array.from(keys);
}

export function isRegisteredKey(key: string): boolean {
  return registry.has(key) || (KNOWN_TEMPLATE_KEYS as readonly string[]).includes(key);
}
