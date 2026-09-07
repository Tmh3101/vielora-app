import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";

export interface OverviewErrorStateProps {
  message: string;
}

export function OverviewErrorState({ message }: OverviewErrorStateProps) {
  const t = useTranslations("dashboard.botDetail.overviewError");
  return (
    <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-border/60 bg-card/40 p-8 text-center">
      <div className="max-w-sm space-y-3">
        <AlertCircle className="mx-auto h-8 w-8 text-rose-500" />
        <div>
          <p className="font-medium text-foreground">{t("analyticsLoadFailed")}</p>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
      </div>
    </div>
  );
}
