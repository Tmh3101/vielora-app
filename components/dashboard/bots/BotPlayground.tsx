import React from "react";
import { DemoChatbotWidget } from "@/components/shared/DemoChatbotWidget";
import { useTranslations } from "next-intl";

interface BotPlaygroundProps {
  botId: string;
  position?: string;
}

export const BotPlayground: React.FC<BotPlaygroundProps> = ({ botId, position }) => {
  const t = useTranslations("dashboard.botDetail.playground");
  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="mb-6">
        <h3 className="mb-2 text-lg font-semibold">{t("title")}</h3>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      {/* Website mockup with chatbot - Using DemoChatbotWidget component */}
      <DemoChatbotWidget botId={botId} position={position} />

      {/* Notice panel */}
      <div
        className="rounded-xl border p-6"
        style={{ backgroundColor: "#F3F5F9", borderColor: "#E2E8F0" }}
      >
        <div className="mb-3 flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-blue-600"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          <h3 className="font-semibold text-slate-700">{t("noteTitle")}</h3>
        </div>
        <p className="text-sm text-slate-600">
          {t.rich("noteDescription", {
            strong: (chunks) => <strong>{chunks}</strong>,
          })}{" "}
          <code className="rounded bg-slate-200/60 px-1 text-xs">
            {t("botIdLabel", { id: botId.slice(0, 8) })}
          </code>
        </p>
      </div>
    </div>
  );
};

export default BotPlayground;
