import { AlertCircle } from "lucide-react";

export interface OverviewErrorStateProps {
  message: string;
}

export function OverviewErrorState({ message }: OverviewErrorStateProps) {
  return (
    <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-border/60 bg-card/40 p-8 text-center">
      <div className="max-w-sm space-y-3">
        <AlertCircle className="mx-auto h-8 w-8 text-rose-500" />
        <div>
          <p className="font-medium text-foreground">Không thể tải analytics</p>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
      </div>
    </div>
  );
}
