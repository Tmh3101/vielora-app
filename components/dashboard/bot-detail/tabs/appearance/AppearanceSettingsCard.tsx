import type { ChangeEvent, RefObject } from "react";
import Image from "next/image";
import Link from "next/link";
import { AvatarUpload } from "@/components/AvatarUpload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WIDGET_LIMITS } from "@/config";
import {
  Crown,
  ImageIcon,
  Loader2,
  MapPin,
  Plus,
  Upload,
  X,
  Palette,
  MessageSquare,
  Sparkles,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { BackgroundType } from "@/lib/constants/widget-appearance";
import { ESubscriptionPlan, EWidgetBackgroundType, EWidgetIconType } from "@/types";
import { isHexColor, getIconSVGWithSize } from "@/lib/helpers";
import { useAppearanceStore } from "@/store/useAppearanceStore";

interface AppearanceSettingsCardProps {
  botId: string;
  currentPlan?: ESubscriptionPlan;
  isUploadingBg: boolean;
  bgPreviewFile: File | null;
  bgUploadError: string | null;
  isUploadingIcon: boolean;
  iconUploadError: string | null;
  solidColor: string;
  gradientColor1?: string;
  gradientColor2?: string;
  gradientAngle?: number;
  bgFileInputRef: RefObject<HTMLInputElement | null>;
  setPrimaryColor: (value: string) => void;
  openPositionModal: () => void;
  handleSolidColorChange: (color: string) => void;
  handleGradientChange?: (c1?: string, c2?: string, angle?: number) => void;
  generateGradientCSS?: (c1: string, c2: string, angle: number) => string;
  handleBgFileSelect: (file: File) => Promise<void>;
  handleDeleteBackground: () => Promise<void>;
  setChatIconBgColor: (value: string) => void;
  handleIconInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleIconFileSelect: (file: File) => Promise<void>;
  handleDeleteIcon: () => Promise<void>;
  onSaveAppearance: (overrides?: {
    chatIconType?: EWidgetIconType;
    chatIconPreset?: string;
    chatIconUrl?: string | null;
    chatIconColor?: string;
    chatIconBgColor?: string;
  }) => Promise<void>;
}

export function AppearanceSettingsCard({
  botId,
  currentPlan,
  isUploadingBg,
  bgPreviewFile,
  bgUploadError,
  isUploadingIcon,
  iconUploadError,
  solidColor,
  bgFileInputRef,
  setPrimaryColor,
  openPositionModal,
  handleSolidColorChange,
  handleBgFileSelect,
  handleDeleteBackground,
  setChatIconBgColor,
  handleIconInputChange,
  handleIconFileSelect: _handleIconFileSelect,
  handleDeleteIcon,
  onSaveAppearance,
}: AppearanceSettingsCardProps) {
  const editBotName = useAppearanceStore((s) => s.editBotName);
  const avatarUrl = useAppearanceStore((s) => s.avatarUrl);
  const primaryColor = useAppearanceStore((s) => s.primaryColor);
  const welcomeMessage = useAppearanceStore((s) => s.welcomeMessage);
  const suggestedQuestions = useAppearanceStore((s) => s.suggestedQuestions);
  const chatBackgroundType = useAppearanceStore((s) => s.chatBackgroundType);
  const chatBackgroundValue = useAppearanceStore((s) => s.chatBackgroundValue);
  const chatBackgroundOpacity = useAppearanceStore((s) => s.chatBackgroundOpacity);
  const chatIconType = useAppearanceStore((s) => s.chatIconType);
  const chatIconPreset = useAppearanceStore((s) => s.chatIconPreset);
  const chatIconUrl = useAppearanceStore((s) => s.chatIconUrl);
  const isSaving = useAppearanceStore((s) => s.isSaving);
  const setEditBotName = useAppearanceStore((s) => s.setEditBotName);
  const setAvatarUrl = useAppearanceStore((s) => s.setAvatarUrl);
  const setWelcomeMessage = useAppearanceStore((s) => s.setWelcomeMessage);
  const setSuggestedQuestions = useAppearanceStore((s) => s.setSuggestedQuestions);
  const setChatBackgroundType = useAppearanceStore((s) => s.setChatBackgroundType);
  const setChatBackgroundOpacity = useAppearanceStore((s) => s.setChatBackgroundOpacity);
  const setChatIconType = useAppearanceStore((s) => s.setChatIconType);
  const setChatIconPreset = useAppearanceStore((s) => s.setChatIconPreset);
  const setChatIconColor = useAppearanceStore((s) => s.setChatIconColor);

  const canUseSuggestedQuestions =
    !!currentPlan && [ESubscriptionPlan.Standard, ESubscriptionPlan.Pro].includes(currentPlan);
  const botNameError = editBotName.trim().length === 0 ? "Tên Bot không được để trống" : null;
  const primaryColorError = isHexColor(primaryColor.trim()) ? null : "Mã Hex hợp lệ dạng #RRGGBB";
  const solidColorError =
    chatBackgroundType === BackgroundType.SOLID && !isHexColor(solidColor.trim())
      ? "Mã Hex hợp lệ dạng #RRGGBB"
      : null;
  const welcomeMessageError =
    welcomeMessage.trim().length === 0 ? "Tin nhắn không được để trống" : null;

  return (
    <Card className="shadow-xs overflow-hidden rounded-2xl border border-border/50 bg-card transition-all">
      <CardHeader className="border-b border-border/40 bg-muted/10 p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Palette className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold text-foreground">
              Giao diện Widget
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Tùy chỉnh thông tin và màu sắc hiển thị của Bot
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 p-5 sm:p-6">
        {/* Section 1: Thông tin cơ bản */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>Thông tin cơ bản</span>
          </div>

          <div className="flex flex-col gap-4 rounded-xl border border-border/40 bg-muted/10 p-4 sm:flex-row sm:items-center">
            <AvatarUpload
              botId={botId}
              botName={editBotName}
              currentAvatarUrl={avatarUrl}
              onAvatarChange={(url) => setAvatarUrl(url)}
              size="md"
            />

            <div className="w-full flex-1 space-y-1.5">
              <Label htmlFor="editBotName" className="text-xs font-medium text-foreground">
                Tên Bot <span className="text-destructive">*</span>
              </Label>
              <Input
                id="editBotName"
                type="text"
                value={editBotName}
                onChange={(e) => setEditBotName(e.target.value)}
                placeholder="Tên chatbot"
                className="h-9 rounded-lg border-border/60 bg-background text-xs transition-colors focus-visible:ring-1 focus-visible:ring-primary"
                aria-invalid={!!botNameError}
              />
              {botNameError && <p className="text-[11px] text-destructive">{botNameError}</p>}
            </div>
          </div>
        </div>

        {/* Section 2: Màu sắc & Vị trí */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
            <span>Màu sắc & Vị trí</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Màu chủ đạo */}
            <div className="space-y-1.5 rounded-xl border border-border/40 bg-muted/10 p-3.5">
              <Label htmlFor="primaryColor" className="text-xs font-medium text-foreground">
                Màu chủ đạo
              </Label>
              <div className="flex gap-2">
                <div className="relative h-9 w-10 shrink-0 overflow-hidden rounded-lg border border-border/60">
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
                  onChange={(e) => setPrimaryColor(e.target.value.slice(0, 7))}
                  className="h-9 flex-1 rounded-lg border-border/60 bg-background font-mono text-xs uppercase transition-colors focus-visible:ring-1 focus-visible:ring-primary"
                  maxLength={7}
                  spellCheck={false}
                  aria-invalid={!!primaryColorError}
                />
              </div>
              {primaryColorError && (
                <p className="text-[11px] text-destructive">{primaryColorError}</p>
              )}
            </div>

            {/* Vị trí hiển thị */}
            <div className="space-y-1.5 rounded-xl border border-border/40 bg-muted/10 p-3.5">
              <Label className="text-xs font-medium text-foreground">Vị trí hiển thị</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openPositionModal}
                className="h-9 w-full justify-center gap-2 rounded-lg border-border/60 bg-background text-xs font-medium text-foreground transition-all hover:bg-muted active:scale-[0.99]"
              >
                <MapPin className="h-3.5 w-3.5 text-primary" />
                Chỉnh vị trí Widget
              </Button>
            </div>
          </div>
        </div>

        {/* Section 3: Nền & Biểu tượng chat */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Nền chat */}
          <div className="space-y-3 rounded-xl border border-border/40 bg-muted/10 p-3.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-foreground">Nền chat</Label>
              <div className="inline-flex rounded-lg border border-border/40 bg-background p-0.5">
                <button
                  type="button"
                  title="Màu đơn"
                  onClick={() => setChatBackgroundType(EWidgetBackgroundType.Solid)}
                  className={`flex h-7 w-7 items-center justify-center rounded-md transition-all ${
                    chatBackgroundType === BackgroundType.SOLID
                      ? "shadow-xs bg-primary/10 font-semibold text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Palette className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  title="Hình ảnh"
                  onClick={() => setChatBackgroundType(EWidgetBackgroundType.Image)}
                  className={`flex h-7 w-7 items-center justify-center rounded-md transition-all ${
                    chatBackgroundType === BackgroundType.IMAGE
                      ? "shadow-xs bg-primary/10 font-semibold text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {chatBackgroundType === BackgroundType.SOLID && (
              <div className="space-y-1.5">
                <div className="flex gap-2">
                  <div className="relative h-9 w-10 shrink-0 overflow-hidden rounded-lg border border-border/60">
                    <Input
                      id="solidColor"
                      type="color"
                      value={isHexColor(solidColor.trim()) ? solidColor.trim() : "#ffffff"}
                      onChange={(e) => handleSolidColorChange(e.target.value)}
                      className="absolute inset-0 -left-[25%] -top-[25%] h-[150%] w-[150%] cursor-pointer border-0 p-0"
                    />
                  </div>
                  <Input
                    type="text"
                    value={solidColor}
                    onChange={(e) => handleSolidColorChange(e.target.value.slice(0, 7))}
                    className="h-9 flex-1 rounded-lg border-border/60 bg-background font-mono text-xs uppercase transition-colors focus-visible:ring-1 focus-visible:ring-primary"
                    maxLength={7}
                    spellCheck={false}
                    aria-invalid={!!solidColorError}
                  />
                </div>
                {solidColorError && (
                  <p className="text-[11px] text-destructive">{solidColorError}</p>
                )}
              </div>
            )}

            {chatBackgroundType === BackgroundType.IMAGE && (
              <div className="space-y-2">
                <div
                  className="rounded-lg border border-dashed border-border/60 bg-background p-3 text-center transition-colors hover:border-primary/50"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
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
                    type="button"
                    onClick={() => bgFileInputRef.current?.click()}
                    disabled={isUploadingBg}
                    className="flex w-full flex-col items-center gap-1.5 disabled:opacity-50"
                  >
                    {bgPreviewFile && isUploadingBg ? (
                      <div className="flex items-center gap-2 text-xs text-primary">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Đang tải lên...</span>
                      </div>
                    ) : chatBackgroundValue && chatBackgroundValue.startsWith("http") ? (
                      <div className="group relative h-28 w-full overflow-hidden rounded-lg">
                        <Image
                          src={chatBackgroundValue}
                          alt="background"
                          fill
                          className="object-cover"
                          unoptimized
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                          <Upload className="h-4 w-4 text-white" />
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDeleteBackground();
                          }}
                          className="shadow-xs absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-white hover:bg-destructive/90"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs font-medium text-foreground">Tải ảnh nền</span>
                        <span className="text-[10px] text-muted-foreground">
                          JPG, PNG (Tối đa 5MB)
                        </span>
                      </>
                    )}
                  </button>
                </div>
                {bgUploadError && <p className="text-[11px] text-destructive">{bgUploadError}</p>}
              </div>
            )}

            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">Độ mờ nền</span>
                <span className="shadow-xs inline-flex items-center rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-primary">
                  {chatBackgroundOpacity}%
                </span>
              </div>
              <div className="relative flex items-center">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={chatBackgroundOpacity}
                  onChange={(e) => setChatBackgroundOpacity(parseInt(e.target.value))}
                  style={{
                    background: `linear-gradient(to right, hsl(var(--primary)) ${chatBackgroundOpacity}%, hsl(var(--muted)) ${chatBackgroundOpacity}%)`,
                  }}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full accent-primary transition-all [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-primary [&::-moz-range-thumb]:bg-background [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:transition-transform [&::-moz-range-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:bg-background [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"
                />
              </div>
            </div>
          </div>

          {/* Icon nút chat */}
          <div className="space-y-3 rounded-xl border border-border/40 bg-muted/10 p-3.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-foreground">Icon nút chat</Label>
              <div className="inline-flex rounded-lg border border-border/40 bg-background p-0.5">
                <button
                  type="button"
                  title="Có sẵn"
                  onClick={() => setChatIconType(EWidgetIconType.Preset)}
                  className={`flex h-7 w-7 items-center justify-center rounded-md transition-all ${
                    chatIconType === EWidgetIconType.Preset
                      ? "shadow-xs bg-primary/10 font-semibold text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  title="Tải lên"
                  onClick={() => setChatIconType(EWidgetIconType.Custom)}
                  className={`flex h-7 w-7 items-center justify-center rounded-md transition-all ${
                    chatIconType === EWidgetIconType.Custom
                      ? "shadow-xs bg-primary/10 font-semibold text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Upload className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {chatIconType === EWidgetIconType.Preset && (
              <div className="max-h-52 overflow-y-auto rounded-xl border border-border/40 bg-background p-3">
                <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
                  {WIDGET_LIMITS.CHAT_ICON_PRESETS.map((icon) => (
                    <button
                      key={icon.id}
                      type="button"
                      onClick={async () => {
                        setChatIconType(EWidgetIconType.Preset);
                        setChatIconPreset(icon.id);
                        setChatIconBgColor(primaryColor);
                        setChatIconColor("#ffffff");
                        await onSaveAppearance({
                          chatIconType: EWidgetIconType.Preset,
                          chatIconPreset: icon.id,
                          chatIconBgColor: primaryColor,
                          chatIconColor: "#ffffff",
                        });
                      }}
                      className={`flex h-10 w-full items-center justify-center rounded-xl border transition-all hover:bg-muted active:scale-[0.96] [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0 ${
                        chatIconPreset === icon.id
                          ? "shadow-xs border-primary bg-primary/10 font-semibold text-primary"
                          : "border-border/40 bg-background text-muted-foreground hover:border-border"
                      }`}
                      title={icon.name}
                    >
                      <div
                        dangerouslySetInnerHTML={{
                          __html: getIconSVGWithSize(icon.id, "16", "16"),
                        }}
                        className="flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden [&_svg]:h-4 [&_svg]:w-4"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {chatIconType === EWidgetIconType.Custom && (
              <div className="space-y-2">
                <div className="relative mx-auto h-24 w-24">
                  <div className="flex h-full w-full items-center justify-center rounded-full border border-dashed border-border/60 bg-background transition-colors hover:border-primary/50">
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
                      className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-1 p-2"
                    >
                      {isUploadingIcon ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      ) : chatIconUrl && !iconUploadError ? (
                        <>
                          <Image
                            src={chatIconUrl}
                            alt="icon"
                            fill
                            className="rounded-full object-cover"
                            unoptimized
                          />
                          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity hover:opacity-100">
                            <Upload className="h-4 w-4 text-white" />
                          </div>
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">Tải ảnh</span>
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
                      className="shadow-xs absolute right-0 top-0 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white hover:bg-destructive/90"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                {iconUploadError && (
                  <p className="text-center text-[11px] text-destructive">{iconUploadError}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Section 4: Lời chào & Gợi ý */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <MessageSquare className="h-3.5 w-3.5 text-primary" />
            <span>Lời chào & Gợi ý</span>
          </div>

          <div className="space-y-4 rounded-xl border border-border/40 bg-muted/10 p-4">
            <div className="space-y-1.5">
              <Label htmlFor="welcomeMessage" className="text-xs font-medium text-foreground">
                Tin nhắn chào mừng <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="welcomeMessage"
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                placeholder="Xin chào! Tôi có thể giúp gì cho bạn?"
                rows={2}
                className="resize-none rounded-lg border-border/60 bg-background text-xs transition-colors focus-visible:ring-1 focus-visible:ring-primary"
                aria-invalid={!!welcomeMessageError}
              />
              {welcomeMessageError && (
                <p className="text-[11px] text-destructive">{welcomeMessageError}</p>
              )}
            </div>

            {canUseSuggestedQuestions ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-foreground">Câu hỏi gợi ý</Label>
                  <span className="text-[10px] text-muted-foreground">
                    Tối đa {WIDGET_LIMITS.SUGGESTED_QUESTIONS_MAX_COUNT} câu
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
                        placeholder={`Câu hỏi gợi ý ${index + 1}...`}
                        maxLength={WIDGET_LIMITS.SUGGESTED_QUESTIONS_MAX_LENGTH}
                        className="h-8 flex-1 rounded-lg border-border/60 bg-background text-[11px] transition-colors focus-visible:ring-1 focus-visible:ring-primary"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newQuestions = suggestedQuestions.filter((_, i) => i !== index);
                          setSuggestedQuestions(newQuestions);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-background text-muted-foreground transition-all hover:border-destructive/60 hover:bg-destructive/10 hover:text-destructive active:scale-[0.98]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
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
                    className="h-8 w-full rounded-lg border-border/60 bg-background text-xs font-medium text-foreground transition-all hover:bg-muted active:scale-[0.99]"
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Thêm câu hỏi
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">Câu hỏi gợi ý</Label>
                <div className="relative overflow-hidden rounded-lg border border-border/60 bg-gradient-to-br from-background via-muted/10 to-muted/20 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                      <Crown className="h-4 w-4 text-amber-500" />
                      <span>Tính năng gói Standard / Pro</span>
                    </div>
                    <Link
                      href="/dashboard/upgrade"
                      className="text-xs font-semibold text-primary transition-opacity hover:opacity-80"
                    >
                      Nâng cấp →
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer save */}
        <div className="flex justify-end border-t border-border/40 pt-4">
          <Button
            onClick={() => void onSaveAppearance()}
            disabled={
              isSaving ||
              !!botNameError ||
              !!primaryColorError ||
              !!solidColorError ||
              !!welcomeMessageError
            }
            className="shadow-xs h-10 rounded-xl px-6 text-xs font-semibold transition-all active:scale-[0.98]"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang lưu...
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
