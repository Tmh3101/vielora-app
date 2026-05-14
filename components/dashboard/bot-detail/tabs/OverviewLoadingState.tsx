import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Render a section-based skeleton placeholder used as the Overview tab's loading state.
 *
 * @returns A JSX element mirroring the real layout: header card, KPI cards, chart blocks, and recent-question rows.
 */
export function OverviewLoadingState() {
  return (
    <div className="space-y-6">
      <Card className="glass">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-3">
            <Skeleton className="h-4 w-80 max-w-full" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-36 rounded-full" />
              <Skeleton className="h-6 w-44 rounded-full" />
            </div>
          </div>
          <Skeleton className="h-10 w-60 max-w-full rounded-xl" />
        </CardHeader>
      </Card>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={`kpi-${index}`} className="space-y-3 rounded-2xl border border-border/60 p-5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-36" />
          </div>
        ))}
      </section>

      <section className="space-y-4 rounded-2xl border border-border/60 p-5">
        <div className="space-y-2">
          <Skeleton className="h-5 w-56" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-[360px] w-full rounded-xl" />
      </section>

      <section className="space-y-4 rounded-2xl border border-border/60 p-5">
        <div className="space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-[320px] w-full rounded-xl" />
      </section>

      <section className="space-y-4 rounded-2xl border border-border/60 p-5">
        <div className="space-y-2">
          <Skeleton className="h-5 w-52" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={`question-${index}`} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </section>
    </div>
  );
}
