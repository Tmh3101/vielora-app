"use client";

import { AvatarUpload } from "@/components/AvatarUpload";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Loader2, MessageSquare, MinusCircle, Palette } from "lucide-react";

export interface AppearanceTabProps {
  botId: string;
  editBotName: string;
  avatarUrl: string | null;
  primaryColor: string;
  textColor: string;
  position: string;
  welcomeMessage: string;
  isSaving: boolean;
  setEditBotName: (value: string) => void;
  setAvatarUrl: (value: string | null) => void;
  setPrimaryColor: (value: string) => void;
  setTextColor: (value: string) => void;
  setPosition: (value: string) => void;
  setWelcomeMessage: (value: string) => void;
  onSaveAppearance: () => Promise<void>;
}

export function AppearanceTab({
  botId,
  editBotName,
  avatarUrl,
  primaryColor,
  textColor,
  position,
  welcomeMessage,
  isSaving,
  setEditBotName,
  setAvatarUrl,
  setPrimaryColor,
  setTextColor,
  setPosition,
  setWelcomeMessage,
  onSaveAppearance,
}: AppearanceTabProps) {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <Card className="glass">
          <CardHeader>
            <CardTitle>Cài đặt Giao diện</CardTitle>
            <CardDescription>Tùy chỉnh thông tin và hiển thị của bot</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b border-border/50 pb-2">
                <Bot className="h-4 w-4 text-primary" />
                <h3 className="font-medium">Thông tin cơ bản</h3>
              </div>

              <div className="flex flex-col items-start gap-6 sm:flex-row">
                <AvatarUpload
                  botId={botId}
                  botName={editBotName}
                  currentAvatarUrl={avatarUrl}
                  onAvatarChange={(url) => setAvatarUrl(url)}
                  size="md"
                />

                <div className="w-full flex-1 space-y-2">
                  <Label htmlFor="editBotName">Tên Bot</Label>
                  <Input
                    id="editBotName"
                    type="text"
                    value={editBotName}
                    onChange={(e) => setEditBotName(e.target.value)}
                    placeholder="Tên chatbot"
                  />
                  <p className="text-xs text-muted-foreground">
                    Tên này sẽ hiển thị trong header của widget
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b border-border/50 pb-2">
                <Palette className="h-4 w-4 text-primary" />
                <h3 className="font-medium">Tùy chỉnh Style</h3>
              </div>

              <div className="grid gap-6">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Màu thương hiệu</Label>
                  <div className="flex gap-2">
                    <div className="relative h-10 w-12 overflow-hidden rounded-md border border-input">
                      <Input
                        id="primaryColor"
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="absolute inset-0 -left-[25%] -top-[25%] h-[150%] w-[150%] cursor-pointer border-0 p-0"
                      />
                    </div>
                    <Input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="textColor">Màu chữ tin nhắn</Label>
                  <div className="flex gap-2">
                    <div className="relative h-10 w-12 overflow-hidden rounded-md border border-input">
                      <Input
                        id="textColor"
                        type="color"
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        className="absolute inset-0 -left-[25%] -top-[25%] h-[150%] w-[150%] cursor-pointer border-0 p-0"
                      />
                    </div>
                    <Input
                      type="text"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="flex-1 font-mono"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Màu chữ cho tin nhắn của bot (thường là màu trắng hoặc đen)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="position">Vị trí hiển thị trên website của bạn</Label>
                  <select
                    id="position"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3"
                  >
                    <option value="bottom-right">Góc phải dưới (Mặc định)</option>
                    <option value="bottom-left">Góc trái dưới</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="welcomeMessage">Tin nhắn chào mừng</Label>
                  <Textarea
                    id="welcomeMessage"
                    value={welcomeMessage}
                    onChange={(e) => setWelcomeMessage(e.target.value)}
                    placeholder="Xin chào! Tôi có thể giúp gì cho bạn?"
                    rows={3}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Tin nhắn đầu tiên hiện ra khi khách mở chatbot
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-border/50 pt-4">
              <Button
                onClick={() => void onSaveAppearance()}
                disabled={isSaving}
                className="w-full sm:w-auto"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang lưu thay đổi...
                  </>
                ) : (
                  "Lưu cấu hình"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6 lg:sticky lg:top-8">
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
              ></div>

              <div
                className="relative z-10 w-[320px] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
                style={{ transformOrigin: "bottom right" }}
              >
                <div
                  className="flex items-center gap-3 p-4 transition-colors duration-300"
                  style={{ backgroundColor: primaryColor, color: "white" }}
                >
                  <Avatar className="h-9 w-9 border-2 border-white/20">
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

                <div className="max-h-[300px] min-h-[300px] space-y-4 overflow-y-auto bg-background p-4">
                  <div className="my-4 text-center text-xs text-muted-foreground">Hôm nay</div>

                  <div
                    className="max-w-[85%] rounded-2xl rounded-tl-none bg-muted/50 p-3 text-sm duration-500 animate-in fade-in slide-in-from-bottom-2"
                    style={{ color: textColor }}
                  >
                    {welcomeMessage || "Xin chào! Tôi có thể giúp gì cho bạn?"}
                  </div>

                  <div
                    className="ml-auto max-w-[85%] rounded-2xl rounded-tr-none p-3 text-sm delay-150 duration-500 animate-in fade-in slide-in-from-bottom-2"
                    style={{ backgroundColor: primaryColor, color: "white" }}
                  >
                    Xin chào! Tôi muốn tìm hiểu về sản phẩm.
                  </div>

                  <div
                    className="max-w-[85%] rounded-2xl rounded-tl-none bg-muted/50 p-3 text-sm delay-300 duration-500 animate-in fade-in slide-in-from-bottom-2"
                    style={{ color: textColor }}
                  >
                    Rất vui được hỗ trợ bạn! Chúng tôi có nhiều sản phẩm tuyệt vời...
                  </div>

                  <div className="flex h-8 w-12 items-center gap-1 rounded-2xl rounded-tl-none bg-muted/30 p-2 delay-500 duration-700 animate-in fade-in">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/40"></span>
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/40 delay-150"></span>
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/40 delay-300"></span>
                  </div>
                </div>

                <div className="flex gap-2 border-t border-border bg-background p-3">
                  <div className="flex-1 cursor-not-allowed rounded-full border border-input bg-muted/10 px-4 py-2.5 text-sm text-foreground opacity-70">
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

              <div
                className="absolute bottom-8 right-8 z-0 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full opacity-50 shadow-lg blur-[1px] transition-transform duration-300 hover:scale-105"
                style={{
                  backgroundColor: primaryColor,
                  color: "white",
                }}
              >
                <MessageSquare className="h-7 w-7 text-current" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
