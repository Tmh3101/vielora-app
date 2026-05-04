import type { DiscoveredPage } from "@/lib/services/page.service";
import { EBotStatus } from "@/types";

export interface CurationRow {
  id: string;
  title: string;
  url: string;
}

export function getPhaseLabel(status: EBotStatus): string {
  switch (status) {
    case EBotStatus.Discovering:
      return "Discovering";
    case EBotStatus.Discovered:
      return "Discovered";
    case EBotStatus.Indexing:
      return "Indexing";
    case EBotStatus.Ready:
      return "Ready";
    case EBotStatus.Failed:
      return "Failed";
    default:
      return "Pending";
  }
}

export function getPhaseBadgeClass(status: EBotStatus): string {
  switch (status) {
    case EBotStatus.Ready:
      return "bg-green-100 text-green-700 hover:bg-green-100 hover:text-green-700";
    case EBotStatus.Failed:
      return "bg-red-100 text-red-700 hover:bg-red-100 hover:text-red-700";
    case EBotStatus.Indexing:
      return "bg-blue-100 text-blue-700 hover:bg-blue-100 hover:text-blue-700";
    case EBotStatus.Discovered:
      return "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-700";
    default:
      return "bg-amber-100 text-amber-700 hover:bg-amber-100 hover:text-amber-700";
  }
}

export function buildCurationRows(pages: DiscoveredPage[]): CurationRow[] {
  return pages.map((page) => ({
    id: page.id,
    title: page.title || page.url,
    url: page.url,
  }));
}
