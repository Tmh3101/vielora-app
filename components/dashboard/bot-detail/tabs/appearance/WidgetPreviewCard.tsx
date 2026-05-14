import type { WheelEvent } from "react";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getIconSVG } from "@/lib/icons";
import { Bot, MinusCircle } from "lucide-react";
import { BackgroundType, type ChatBackgroundType } from "@/lib/constants/widget-appearance";

interface WidgetPreviewCardProps {
  editBotName: string;
  avatarUrl: string | null;
  primaryColor: string;
  textColor: string;
  welcomeMessage: string;
  suggestedQuestions: string[];
  chatBackgroundType: ChatBackgroundType;
  chatBackgroundValue: string;
  chatBackgroundOpacity: number;
  chatIconType: "preset" | "custom";
  chatIconPreset: string;
  chatIconUrl: string | null;
  chatIconColor: string;
  chatIconBgColor: string;
  solidColor: string;
  getUserMessageTextColor: () => string;
  previewMessagesRef: React.RefObject<HTMLDivElement | null>;
  handleSuggestedQuestionsWheel: (e: WheelEvent<HTMLDivElement>) => void;
}

export function WidgetPreviewCard({
  editBotName,
  avatarUrl,
  primaryColor,
  textColor,
  welcomeMessage,
  suggestedQuestions,
  chatBackgroundType,
  chatBackgroundValue,
  chatBackgroundOpacity,
  chatIconType,
  chatIconPreset,
  chatIconUrl,
  chatIconColor,
  chatIconBgColor,
  solidColor,
  getUserMessageTextColor,
  previewMessagesRef,
  handleSuggestedQuestionsWheel,
}: WidgetPreviewCardProps) {
  const previewSuggestedQuestions = suggestedQuestions.filter((q) => q.trim());
  const showSuggestedOverlay = previewSuggestedQuestions.length > 0;
  const isValidImageBackgroundValue =
    typeof chatBackgroundValue === "string" && /^https?:\/\//.test(chatBackgroundValue);

  return (
    <Card className="glass flex h-full flex-col">
      <CardHeader>
        <CardTitle>Xem trước Widget</CardTitle>
        <CardDescription>Hiển thị thay đổi theo thời gian thực</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="relative flex min-h-[500px] items-end justify-center overflow-hidden rounded-xl border border-border/50 bg-muted/40 p-8 lg:justify-end">
          <div
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage:
                "radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)",
              backgroundSize: "20px 20px",
            }}
          />

          <div className="relative z-10 flex flex-col items-end gap-4">
            <div
              className="w-[320px] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
              style={{ transformOrigin: "bottom right" }}
            >
              <div
                className="flex items-center gap-3 p-4 transition-colors duration-300"
                style={{ backgroundColor: primaryColor, color: "white" }}
              >
                <Avatar className="h-9 w-9 border border-white/20">
                  <AvatarImage src={avatarUrl || undefined} alt={editBotName} />
                  <AvatarFallback className="bg-white/20 text-white">
                    <Bot className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="text-current">
                  <div className="text-sm font-semibold leading-tight">
                    {editBotName || "AI Assistant"}
                  </div>
                  <div className="mt-0.5 text-xs leading-tight opacity-80">
                    Luôn sẵn sàng hỗ trợ
                  </div>
                </div>
                <div className="ml-auto cursor-not-allowed opacity-80">
                  <MinusCircle className="h-5 w-5" />
                </div>
              </div>

              <div
                ref={previewMessagesRef}
                className={`max-h-[300px] min-h-[300px] space-y-4 overflow-y-auto p-4 ${showSuggestedOverlay ? "pb-14" : ""}`}
                style={{
                  ...(chatBackgroundType === BackgroundType.SOLID
                    ? {
                        background: `rgba(${parseInt(solidColor.slice(1, 3), 16)}, ${parseInt(solidColor.slice(3, 5), 16)}, ${parseInt(solidColor.slice(5, 7), 16)}, ${chatBackgroundOpacity / 100})`,
                      }
                    : chatBackgroundType === BackgroundType.GRADIENT
                      ? {
                          background: chatBackgroundValue,
                          backgroundColor: `rgba(255, 255, 255, ${1 - chatBackgroundOpacity / 100})`,
                          backgroundBlendMode: "lighten",
                        }
                      : chatBackgroundType === BackgroundType.IMAGE && isValidImageBackgroundValue
                        ? {
                            backgroundImage: `url("${chatBackgroundValue}")`,
                            backgroundColor: `rgba(255, 255, 255, ${1 - chatBackgroundOpacity / 100})`,
                            backgroundBlendMode: "lighten",
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            backgroundRepeat: "no-repeat",
                          }
                        : {
                            background: `rgba(255, 255, 255, ${chatBackgroundOpacity / 100})`,
                          }),
                }}
              >
                <div className="my-4 text-center text-xs text-muted-foreground">Hôm nay</div>
                <div
                  className="max-w-[85%] rounded-2xl rounded-tl-none bg-muted p-3 text-sm duration-500 animate-in fade-in slide-in-from-bottom-2"
                  style={{ color: textColor }}
                >
                  {welcomeMessage || "Xin chào! Tôi có thể giúp gì cho bạn?"}
                </div>
                <div
                  className="ml-auto max-w-[85%] rounded-2xl rounded-tr-none p-3 text-sm delay-150 duration-500 animate-in fade-in slide-in-from-bottom-2"
                  style={{ backgroundColor: primaryColor, color: getUserMessageTextColor() }}
                >
                  Xin chào! Tôi muốn tìm hiểu về sản phẩm.
                </div>
                <div
                  className="max-w-[85%] rounded-2xl rounded-tl-none bg-muted p-3 text-sm delay-300 duration-500 animate-in fade-in slide-in-from-bottom-2"
                  style={{ color: textColor }}
                >
                  Rất vui được hỗ trợ bạn! Chúng tôi có nhiều sản phẩm tuyệt vời...
                </div>
                <div className="flex h-8 w-12 items-center gap-1 rounded-2xl rounded-tl-none bg-muted p-2 delay-500 duration-700 animate-in fade-in">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/40" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/40 delay-150" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/40 delay-300" />
                </div>
              </div>

              <div className="relative border-t border-border bg-transparent">
                {showSuggestedOverlay && (
                  <>
                    <style jsx>{`
                      .preview-suggested-scroll {
                        -ms-overflow-style: none;
                        scrollbar-width: none;
                        overscroll-behavior-x: contain;
                        overscroll-behavior-y: contain;
                      }
                      .preview-suggested-scroll::-webkit-scrollbar {
                        display: none;
                        width: 0;
                        height: 0;
                      }
                    `}</style>
                    <div className="pointer-events-none absolute inset-x-0 bottom-16 z-10 px-3 py-3">
                      <div
                        className="preview-suggested-scroll pointer-events-auto flex gap-3 overflow-x-auto pb-1 pr-2"
                        onWheel={handleSuggestedQuestionsWheel}
                      >
                        {previewSuggestedQuestions.map((question, idx) => (
                          <button
                            key={idx}
                            disabled
                            className="flex-shrink-0 cursor-not-allowed whitespace-nowrap rounded-full border border-input bg-background px-3 py-1.5 text-xs font-medium shadow-sm transition-colors"
                          >
                            {question}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <div className="rounded-b-2xl bg-background p-3">
                  <div className="flex gap-2">
                    <div className="flex-1 cursor-not-allowed rounded-full border border-input bg-muted/10 px-4 py-2.5 text-sm text-foreground">
                      Nhập câu hỏi...
                    </div>
                    <button
                      className="flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-300"
                      style={{ backgroundColor: primaryColor, color: "white" }}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform duration-300 hover:scale-105"
              style={{ backgroundColor: chatIconBgColor, cursor: "pointer" }}
              title="Click để mở chat"
            >
              {chatIconType === "preset" ? (
                <div
                  dangerouslySetInnerHTML={{ __html: getIconSVG(chatIconPreset) }}
                  style={{
                    color: chatIconColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                />
              ) : chatIconUrl ? (
                <Image
                  src={chatIconUrl}
                  alt="Custom icon"
                  width={56}
                  height={56}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <div
                  dangerouslySetInnerHTML={{ __html: getIconSVG("messagecircle") }}
                  style={{
                    color: chatIconColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
