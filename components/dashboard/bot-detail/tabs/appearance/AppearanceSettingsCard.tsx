import type { ChangeEvent, RefObject } from "react";
import Image from "next/image";
import Link from "next/link";
import { AvatarUpload } from "@/components/AvatarUpload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WIDGET_LIMITS } from "@/config";
import { getIconSVG } from "@/lib/icons";
import { Crown, Image as ImageIcon, Loader2, MapPin, Plus, Upload, X } from "lucide-react";
import { BackgroundType, type ChatBackgroundType } from "@/lib/constants/widget-appearance";
import { ESubscriptionPlan } from "@/types";

interface AppearanceSettingsCardProps {
  botId: string;
  editBotName: string;
  avatarUrl: string | null;
  primaryColor: string;
  position: string;
  welcomeMessage: string;
  suggestedQuestions: string[];
  chatBackgroundType: ChatBackgroundType;
  chatBackgroundValue: string;
  chatBackgroundOpacity: number;
  chatIconType: "preset" | "custom";
  chatIconPreset: string;
  chatIconUrl: string | null;
  isSaving: boolean;
  currentPlan?: ESubscriptionPlan;
  isUploadingBg: boolean;
  bgPreviewFile: File | null;
  bgUploadError: string | null;
  isUploadingIcon: boolean;
  iconUploadError: string | null;
  solidColor: string;
  gradientColor1: string;
  gradientColor2: string;
  gradientAngle: number;
  bgFileInputRef: RefObject<HTMLInputElement | null>;
  setEditBotName: (value: string) => void;
  setAvatarUrl: (value: string | null) => void;
  setPrimaryColor: (value: string) => void;
  setWelcomeMessage: (value: string) => void;
  setSuggestedQuestions: (value: string[]) => void;
  setChatBackgroundType: (value: ChatBackgroundType) => void;
  setChatBackgroundOpacity: (value: number) => void;
  setChatIconType: (value: "preset" | "custom") => void;
  openPositionModal: () => void;
  handleSolidColorChange: (color: string) => void;
  handleGradientChange: (c1?: string, c2?: string, angle?: number) => void;
  generateGradientCSS: (color1: string, color2: string, angle: number) => string;
  handleBgFileSelect: (file: File) => Promise<void>;
  handleDeleteBackground: () => Promise<void>;
  setChatIconPreset: (value: string) => void;
  setChatIconBgColor: (value: string) => void;
  setChatIconColor: (value: string) => void;
  handleIconInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleIconFileSelect: (file: File) => Promise<void>;
  handleDeleteIcon: () => Promise<void>;
  onSaveAppearance: (overrides?: {
    chatIconType?: "preset" | "custom";
    chatIconPreset?: string;
    chatIconUrl?: string | null;
    chatIconColor?: string;
    chatIconBgColor?: string;
  }) => Promise<void>;
}

export function AppearanceSettingsCard({
  botId,
  editBotName,
  avatarUrl,
  primaryColor,
  welcomeMessage,
  suggestedQuestions,
  chatBackgroundType,
  chatBackgroundValue,
  chatBackgroundOpacity,
  chatIconType,
  chatIconPreset,
  chatIconUrl,
  isSaving,
  currentPlan,
  isUploadingBg,
  bgPreviewFile,
  bgUploadError,
  isUploadingIcon,
  iconUploadError,
  solidColor,
  gradientColor1,
  gradientColor2,
  gradientAngle,
  bgFileInputRef,
  setEditBotName,
  setAvatarUrl,
  setPrimaryColor,
  setWelcomeMessage,
  setSuggestedQuestions,
  setChatBackgroundType,
  setChatBackgroundOpacity,
  setChatIconType,
  openPositionModal,
  handleSolidColorChange,
  handleGradientChange,
  generateGradientCSS,
  handleBgFileSelect,
  handleDeleteBackground,
  setChatIconPreset,
  setChatIconBgColor,
  setChatIconColor,
  handleIconInputChange,
  handleIconFileSelect,
  handleDeleteIcon,
  onSaveAppearance,
}: AppearanceSettingsCardProps) {
  const canUseSuggestedQuestions =
    !!currentPlan && [ESubscriptionPlan.Standard, ESubscriptionPlan.Pro].includes(currentPlan);

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle>Cài đặt Giao diện</CardTitle>
        <CardDescription>Tùy chỉnh thông tin và hiển thị của bot</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="space-y-6">
          <div className="flex items-center gap-2 border-b border-border/50 pb-2">
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
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-2 border-b border-border/50 pb-2">
            <h3 className="font-medium">Tùy chỉnh Style</h3>
          </div>

          <div className="space-y-6">
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
              <Label>Vị trí hiển thị trên website</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openPositionModal}
                className="w-full justify-center gap-2 border hover:border-primary hover:bg-white hover:text-primary"
              >
                <MapPin className="h-4 w-4" />
                Chỉnh sửa vị trí
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Nền hội thoại</Label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => setChatBackgroundType(BackgroundType.SOLID)}
                    className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${chatBackgroundType === BackgroundType.SOLID ? "border-primary bg-primary/10 text-primary" : "border-input text-muted-foreground hover:border-primary hover:text-primary"}`}
                  >
                    Màu sắc
                  </button>
                  {/* <button
                    onClick={() => setChatBackgroundType(BackgroundType.GRADIENT)}
                    className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${chatBackgroundType === BackgroundType.GRADIENT ? "border-primary bg-primary/10 text-primary" : "border-input text-muted-foreground hover:border-primary hover:text-primary"}`}
                  >
                    Gradient
                  </button> */}
                  <button
                    onClick={() => setChatBackgroundType(BackgroundType.IMAGE)}
                    className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${chatBackgroundType === BackgroundType.IMAGE ? "border-primary bg-primary/10 text-primary" : "border-input text-muted-foreground hover:border-primary hover:text-primary"}`}
                  >
                    Hình ảnh
                  </button>
                </div>

                {chatBackgroundType === BackgroundType.SOLID && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <div className="relative h-10 w-12 overflow-hidden rounded-md border border-input">
                        <Input
                          type="color"
                          value={solidColor}
                          onChange={(e) => handleSolidColorChange(e.target.value)}
                          className="absolute inset-0 -left-[25%] -top-[25%] h-[150%] w-[150%] cursor-pointer border-0 p-0"
                        />
                      </div>
                      <Input
                        type="text"
                        value={solidColor}
                        onChange={(e) => handleSolidColorChange(e.target.value)}
                        className="flex-1 font-mono"
                      />
                    </div>
                  </div>
                )}

                {chatBackgroundType === BackgroundType.GRADIENT && (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs">Màu bắt đầu</Label>
                          <div className="flex gap-2">
                            <div className="relative h-10 w-12 overflow-hidden rounded-md border border-input">
                              <Input
                                type="color"
                                value={gradientColor1}
                                onChange={(e) => handleGradientChange(e.target.value)}
                                className="absolute inset-0 -left-[25%] -top-[25%] h-[150%] w-[150%] cursor-pointer border-0 p-0"
                              />
                            </div>
                            <Input
                              type="text"
                              value={gradientColor1}
                              onChange={(e) => handleGradientChange(e.target.value)}
                              className="flex-1 font-mono text-sm"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs">Màu kết thúc</Label>
                          <div className="flex gap-2">
                            <div className="relative h-10 w-12 overflow-hidden rounded-md border border-input">
                              <Input
                                type="color"
                                value={gradientColor2}
                                onChange={(e) => handleGradientChange(undefined, e.target.value)}
                                className="absolute inset-0 -left-[25%] -top-[25%] h-[150%] w-[150%] cursor-pointer border-0 p-0"
                              />
                            </div>
                            <Input
                              type="text"
                              value={gradientColor2}
                              onChange={(e) => handleGradientChange(undefined, e.target.value)}
                              className="flex-1 font-mono text-sm"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="gradientAngle" className="text-xs">
                          Hướng gradient: {gradientAngle}°
                        </Label>
                        <input
                          id="gradientAngle"
                          type="range"
                          min="0"
                          max="360"
                          value={gradientAngle}
                          onChange={(e) =>
                            handleGradientChange(undefined, undefined, parseInt(e.target.value))
                          }
                          className="h-2 w-full cursor-pointer rounded-lg bg-muted"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>0° (Trên)</span>
                          <span>90° (Phải)</span>
                          <span>180° (Dưới)</span>
                          <span>270° (Trái)</span>
                        </div>
                      </div>

                      <div
                        className="h-20 w-full rounded-md border border-input"
                        style={{
                          background: generateGradientCSS(
                            gradientColor1,
                            gradientColor2,
                            gradientAngle
                          ),
                        }}
                      />
                    </div>
                  </div>
                )}

                {chatBackgroundType === BackgroundType.IMAGE && (
                  <div className="space-y-3">
                    <div
                      className="rounded-lg border-2 border-dashed border-border/50 p-6 text-center transition-colors hover:border-primary/50"
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.add("border-primary", "bg-primary/5");
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove("border-primary", "bg-primary/5");
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove("border-primary", "bg-primary/5");
                        const files = e.dataTransfer.files;
                        if (files?.[0]) void handleBgFileSelect(files[0]);
                      }}
                    >
                      <input
                        ref={bgFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          e.target.files?.[0] && void handleBgFileSelect(e.target.files[0])
                        }
                        className="hidden"
                      />
                      <button
                        onClick={() => bgFileInputRef.current?.click()}
                        disabled={isUploadingBg}
                        className="flex w-full flex-col items-center gap-2 disabled:opacity-50"
                      >
                        {bgPreviewFile && bgUploadError ? (
                          <>
                            <ImageIcon className="h-6 w-6 text-destructive" />
                            <p className="text-sm font-medium text-destructive">{bgUploadError}</p>
                          </>
                        ) : bgPreviewFile && isUploadingBg ? (
                          <>
                            <div className="group relative -m-6 h-56 w-[calc(100%+48px)] overflow-hidden rounded-md border-b border-border/50">
                              <Image
                                src={URL.createObjectURL(bgPreviewFile)}
                                alt="preview"
                                fill
                                className="object-cover"
                                unoptimized
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                <Loader2 className="h-6 w-6 animate-spin text-white" />
                              </div>
                            </div>
                            <p className="text-sm font-medium text-primary">Đang upload...</p>
                          </>
                        ) : chatBackgroundValue && chatBackgroundValue.startsWith("http") ? (
                          <>
                            <div className="group relative -m-6 h-56 w-[calc(100%+48px)]">
                              <div className="h-56 w-full overflow-hidden rounded-md border-b border-border/50">
                                <Image
                                  src={chatBackgroundValue}
                                  alt="background"
                                  fill
                                  className="object-cover transition-opacity group-hover:opacity-75"
                                  unoptimized
                                />
                                <button
                                  type="button"
                                  onClick={() => bgFileInputRef.current?.click()}
                                  className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/50 opacity-0 transition-opacity disabled:opacity-50 group-hover:opacity-100"
                                  disabled={isUploadingBg}
                                >
                                  <Upload className="h-6 w-6 text-white" />
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleDeleteBackground();
                                }}
                                disabled={isUploadingBg}
                                className="absolute -right-1 -top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-destructive shadow-md transition-colors hover:bg-destructive/90 disabled:opacity-50"
                              >
                                {isUploadingBg ? (
                                  <Loader2 className="h-3 w-3 animate-spin text-destructive-foreground" />
                                ) : (
                                  <X className="h-4 w-4 text-destructive-foreground" />
                                )}
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <Upload className="h-6 w-6 text-muted-foreground" />
                            <p className="text-sm font-medium">Kéo thả hoặc bấm để upload</p>
                            <p className="text-xs text-muted-foreground">
                              JPG, PNG, GIF (tối đa 5MB) - Không khuyến khích dùng WEBP
                            </p>
                          </>
                        )}
                      </button>
                    </div>

                    {bgUploadError && <p className="text-xs text-destructive">{bgUploadError}</p>}
                  </div>
                )}

                <div className="space-y-1">
                  <Label htmlFor="bgOpacity" className="text-xs">
                    Độ mờ nền: {chatBackgroundOpacity}%
                  </Label>
                  <input
                    id="bgOpacity"
                    type="range"
                    min="0"
                    max="100"
                    value={chatBackgroundOpacity}
                    onChange={(e) => setChatBackgroundOpacity(parseInt(e.target.value))}
                    className="h-2 w-full cursor-pointer rounded-lg bg-muted"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Biểu tượng trò chuyện</Label>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => setChatIconType("preset")}
                    className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${chatIconType === "preset" ? "border-primary bg-primary/10 text-primary" : "border-input text-muted-foreground hover:border-primary hover:text-primary"}`}
                  >
                    Có sẵn
                  </button>
                  <button
                    onClick={() => setChatIconType("custom")}
                    className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${chatIconType === "custom" ? "border-primary bg-primary/10 text-primary" : "border-input text-muted-foreground hover:border-primary hover:text-primary"}`}
                  >
                    Tải lên
                  </button>
                </div>

                {chatIconType === "preset" && (
                  <div className="space-y-3">
                    <div className="max-h-56 overflow-y-auto rounded-lg border border-border/50 bg-gradient-to-br from-background/50 to-muted/20 p-3 shadow-sm">
                      <div className="grid grid-cols-4 gap-2">
                        {WIDGET_LIMITS.CHAT_ICON_PRESETS.map((icon) => (
                          <button
                            key={icon.id}
                            onClick={async () => {
                              setChatIconType("preset");
                              setChatIconPreset(icon.id);
                              setChatIconBgColor(primaryColor);
                              setChatIconColor("#ffffff");
                              await onSaveAppearance({
                                chatIconType: "preset",
                                chatIconPreset: icon.id,
                                chatIconBgColor: primaryColor,
                                chatIconColor: "#ffffff",
                              });
                            }}
                            className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border px-2 py-3 transition-all ${chatIconPreset === icon.id ? "border-primary bg-primary/10 shadow-md" : "border-input hover:border-primary/50 hover:shadow-sm"}`}
                            title={icon.name}
                          >
                            <div
                              dangerouslySetInnerHTML={{ __html: getIconSVG(icon.id) }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#000000",
                              }}
                              className="h-6 w-6"
                            />
                            <div className="text-xs font-medium text-muted-foreground">
                              {icon.name}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {chatIconType === "custom" && (
                  <div className="space-y-3">
                    <div className="group relative mx-auto h-48 w-48">
                      <div
                        className="flex h-full w-full items-center justify-center rounded-full border-2 border-dashed border-border/50 transition-colors hover:border-primary/50"
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.add("border-primary", "bg-primary/5");
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.remove("border-primary", "bg-primary/5");
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.remove("border-primary", "bg-primary/5");
                          const files = e.dataTransfer.files;
                          if (files?.[0]) void handleIconFileSelect(files[0]);
                        }}
                      >
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleIconInputChange}
                          disabled={isUploadingIcon}
                          className="hidden"
                          id="iconUpload"
                        />
                        <label
                          htmlFor="iconUpload"
                          className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2"
                        >
                          {isUploadingIcon ? (
                            <>
                              <Loader2 className="h-6 w-6 animate-spin text-primary" />
                              <p className="text-sm font-medium text-primary">Đang upload...</p>
                            </>
                          ) : chatIconUrl && !iconUploadError ? (
                            <>
                              <Image
                                src={chatIconUrl}
                                alt="icon"
                                fill
                                className="rounded-full object-cover transition-opacity group-hover:opacity-75"
                                unoptimized
                              />
                              <button
                                type="button"
                                onClick={() => document.getElementById("iconUpload")?.click()}
                                className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
                                disabled={isUploadingIcon}
                              >
                                <Upload className="h-6 w-6 text-white" />
                              </button>
                            </>
                          ) : (
                            <>
                              <Upload className="h-6 w-6 text-muted-foreground" />
                              <p className="text-center text-xs font-medium text-muted-foreground">
                                Kéo thả hoặc bấm
                              </p>
                            </>
                          )}
                        </label>
                      </div>

                      {chatIconUrl && !iconUploadError && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDeleteIcon();
                          }}
                          disabled={isUploadingIcon}
                          className="absolute -right-1 -top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-destructive shadow-md transition-colors hover:bg-destructive/90 disabled:opacity-50"
                        >
                          {isUploadingIcon ? (
                            <Loader2 className="h-3 w-3 animate-spin text-destructive-foreground" />
                          ) : (
                            <X className="h-4 w-4 text-destructive-foreground" />
                          )}
                        </button>
                      )}
                    </div>

                    {iconUploadError && (
                      <p className="text-center text-xs text-destructive">{iconUploadError}</p>
                    )}
                  </div>
                )}
              </div>
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
            </div>

            {canUseSuggestedQuestions ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Câu hỏi gợi ý</Label>
                  <span className="text-xs text-muted-foreground">
                    (Tối đa {WIDGET_LIMITS.SUGGESTED_QUESTIONS_MAX_COUNT}, mỗi câu tối đa{" "}
                    {WIDGET_LIMITS.SUGGESTED_QUESTIONS_MAX_LENGTH} ký tự)
                  </span>
                </div>

                <div className="space-y-2">
                  {suggestedQuestions.map((question, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={question}
                        onChange={(e) => {
                          const newQuestions = [...suggestedQuestions];
                          newQuestions[index] = e.target.value;
                          setSuggestedQuestions(newQuestions);
                        }}
                        placeholder={`Nhập câu hỏi gợi ý ${index + 1}...`}
                        maxLength={WIDGET_LIMITS.SUGGESTED_QUESTIONS_MAX_LENGTH}
                        className="flex-1"
                      />
                      <button
                        onClick={() => {
                          const newQuestions = suggestedQuestions.filter((_, i) => i !== index);
                          setSuggestedQuestions(newQuestions);
                        }}
                        className="flex h-10 w-10 items-center justify-center rounded-md border border-input text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {suggestedQuestions.length < WIDGET_LIMITS.SUGGESTED_QUESTIONS_MAX_COUNT && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSuggestedQuestions([...suggestedQuestions, ""])}
                    className="w-full hover:border-primary hover:bg-white hover:text-primary data-[state=open]:bg-transparent"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Thêm câu hỏi
                  </Button>
                )}

                <p className="text-xs text-muted-foreground">
                  Các câu hỏi này sẽ hiển thị khi khách mở chat
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Câu hỏi gợi ý</Label>
                  <span className="text-xs text-muted-foreground">
                    Tính năng này khả dụng trên gói Standard/Pro
                  </span>
                </div>

                <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-background via-muted/20 to-muted/40 shadow-sm">
                  <div className="pointer-events-none space-y-3 p-4 opacity-55 blur-[2px]">
                    <div className="flex gap-2">
                      <div className="h-10 flex-1 rounded-md border border-border/60 bg-background/80 px-3 py-2 text-sm text-muted-foreground">
                        Ví dụ: Chính sách bảo hành như thế nào?
                      </div>
                      <div className="h-10 w-10 rounded-md border border-border/60 bg-background/70" />
                    </div>
                    <div className="flex gap-2">
                      <div className="h-10 flex-1 rounded-md border border-border/60 bg-background/80 px-3 py-2 text-sm text-muted-foreground">
                        Ví dụ: Có hỗ trợ dùng thử không?
                      </div>
                      <div className="h-10 w-10 rounded-md border border-border/60 bg-background/70" />
                    </div>
                    <div className="h-9 rounded-md border border-dashed border-border/60 bg-background/60" />
                  </div>

                  <div className="absolute inset-0 flex items-center justify-center bg-background/65 backdrop-blur-[2px]">
                    <div className="mx-4 max-w-sm text-center">
                      <div className="bg-gradient-primary mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full shadow-lg">
                        <Crown className="h-6 w-6 text-white" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">
                        Nâng cấp gói để sử dụng tính năng này
                      </p>
                      <Link
                        href="/dashboard/upgrade"
                        className="inline-block text-xs font-medium text-primary underline decoration-dotted underline-offset-4 transition-colors hover:text-primary/80"
                      >
                        Xem gói nâng cấp
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
  );
}
