import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  children?: ReactNode;
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border/50 bg-card/40 p-6 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h1>
        {description ? (
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
