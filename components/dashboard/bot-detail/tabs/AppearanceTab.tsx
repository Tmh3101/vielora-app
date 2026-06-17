"use client";

import { useRef, useEffect, useState, type ChangeEvent, type WheelEvent } from "react";
import { PositionModal } from "@/components/dashboard/bot-detail/modals/PositionModal";
import {
  uploadWidgetBackground,
  uploadWidgetIcon,
  deleteWidgetBackground,
  deleteWidgetIcon,
} from "@/lib/supabase/upload";
import { getUserMessageTextColor as getTextColor } from "@/lib/helpers";
import { AppearanceSettingsCard } from "./appearance/AppearanceSettingsCard";
import { WidgetPreviewCard } from "./appearance/WidgetPreviewCard";
import { BackgroundType, type ChatBackgroundType } from "@/lib/constants/widget-appearance";
import { ESubscriptionPlan, EWidgetBackgroundType, EWidgetIconType } from "@/types";
import { useAppearanceStore } from "@/store/useAppearanceStore";

interface AppearanceSaveOverrides {
  chatBackgroundType?: ChatBackgroundType;
  chatBackgroundValue?: string;
  chatIconType?: EWidgetIconType;
  chatIconPreset?: string;
  chatIconUrl?: string | null;
  chatIconColor?: string;
  chatIconBgColor?: string;
}

export interface AppearanceTabProps {
  botId: string;
  currentPlan?: ESubscriptionPlan;
  onSaveAppearance: (overrides?: AppearanceSaveOverrides) => Promise<void>;
}

const handleSuggestedQuestionsWheel = (e: WheelEvent<HTMLDivElement>) => {
  if (e.deltaY === 0 && e.deltaX === 0) return;
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.scrollLeft += e.deltaY + e.deltaX;
};

export function AppearanceTab({ botId, currentPlan, onSaveAppearance }: AppearanceTabProps) {
  const previewMessagesRef = useRef<HTMLDivElement>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingBg, setIsUploadingBg] = useState(false);
  const [bgPreviewFile, setBgPreviewFile] = useState<File | null>(null);
  const [bgUploadError, setBgUploadError] = useState<string | null>(null);
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const [iconUploadError, setIconUploadError] = useState<string | null>(null);
  const [solidColor, setSolidColor] = useState("#ffffff");
  const [gradientColor1, setGradientColor1] = useState("#667eea");
  const [gradientColor2, setGradientColor2] = useState("#764ba2");
  const [gradientAngle, setGradientAngle] = useState(135);
  const [positionModalOpen, setPositionModalOpen] = useState(false);
  const [previewPrimaryColor, setPreviewPrimaryColor] = useState(
    useAppearanceStore.getState().primaryColor
  );
  const [previewChatIconBgColor, setPreviewChatIconBgColor] = useState(
    useAppearanceStore.getState().chatIconBgColor
  );

  const primaryColor = useAppearanceStore((s) => s.primaryColor);
  const chatIconBgColor = useAppearanceStore((s) => s.chatIconBgColor);
  const welcomeMessage = useAppearanceStore((s) => s.welcomeMessage);
  const suggestedQuestions = useAppearanceStore((s) => s.suggestedQuestions);
  const textColor = useAppearanceStore((s) => s.textColor);
  const chatBackgroundValue = useAppearanceStore((s) => s.chatBackgroundValue);
  const chatBackgroundOpacity = useAppearanceStore((s) => s.chatBackgroundOpacity);
  const chatIconType = useAppearanceStore((s) => s.chatIconType);
  const chatIconPreset = useAppearanceStore((s) => s.chatIconPreset);
  const chatBackgroundType = useAppearanceStore((s) => s.chatBackgroundType);
  const chatIconUrl = useAppearanceStore((s) => s.chatIconUrl);

  const previewChatIconTextColor = getTextColor(previewChatIconBgColor);
  const generateGradientCSS = (color1: string, color2: string, angle: number) =>
    `linear-gradient(${angle}deg, ${color1} 0%, ${color2} 100%)`;

  const handlePrimaryColorChange = (color: string) => {
    const textColorForNewColor = getTextColor(color);
    setPreviewPrimaryColor(color);
    setPreviewChatIconBgColor(color);
    useAppearanceStore.getState().setPrimaryColor(color);
    useAppearanceStore.getState().setChatIconBgColor(color);
    useAppearanceStore.getState().setChatIconColor(textColorForNewColor);
  };

  const saveAppearanceWithPreviewColors = (overrides?: AppearanceSaveOverrides) => {
    const nextChatIconBgColor = overrides?.chatIconBgColor ?? previewChatIconBgColor;

    return onSaveAppearance({
      ...overrides,
      chatIconBgColor: nextChatIconBgColor,
      chatIconColor: getTextColor(nextChatIconBgColor),
    });
  };

  useEffect(() => {
    useAppearanceStore.getState().setChatIconColor(previewChatIconTextColor);
  }, [previewChatIconTextColor]);

  useEffect(() => {
    setPreviewPrimaryColor(primaryColor);
  }, [primaryColor]);

  useEffect(() => {
    setPreviewChatIconBgColor(chatIconBgColor);
  }, [chatIconBgColor]);

  const handleSolidColorChange = (color: string) => {
    setSolidColor(color);
    useAppearanceStore.getState().setChatBackgroundValue(color);
  };

  const handleGradientChange = (c1?: string, c2?: string, angle?: number) => {
    const newC1 = c1 ?? gradientColor1;
    const newC2 = c2 ?? gradientColor2;
    const newAngle = angle ?? gradientAngle;

    if (c1 !== undefined) setGradientColor1(c1);
    if (c2 !== undefined) setGradientColor2(c2);
    if (angle !== undefined) setGradientAngle(angle);

    useAppearanceStore
      .getState()
      .setChatBackgroundValue(generateGradientCSS(newC1, newC2, newAngle));
  };

  useEffect(() => {
    if (previewMessagesRef.current) {
      previewMessagesRef.current.scrollTop = previewMessagesRef.current.scrollHeight;
    }
  }, [
    welcomeMessage,
    suggestedQuestions,
    previewPrimaryColor,
    textColor,
    chatBackgroundType,
    chatBackgroundValue,
    chatBackgroundOpacity,
    chatIconType,
    chatIconPreset,
    chatIconUrl,
    previewChatIconBgColor,
  ]);

  useEffect(() => {
    const store = useAppearanceStore.getState();
    if (
      store.chatBackgroundType === BackgroundType.SOLID &&
      store.chatBackgroundValue &&
      store.chatBackgroundValue.startsWith("#")
    ) {
      setSolidColor(store.chatBackgroundValue);
    } else if (
      store.chatBackgroundType === BackgroundType.GRADIENT &&
      store.chatBackgroundValue &&
      store.chatBackgroundValue.includes("linear-gradient")
    ) {
      const match = store.chatBackgroundValue.match(
        /linear-gradient\((\d+)deg,\s*([^,\s]+)\s*0%,\s*([^)]+)\s*100%\)/
      );
      if (match) {
        setGradientAngle(parseInt(match[1]));
        setGradientColor1(match[2]);
        setGradientColor2(match[3].trim());
      }
    }
  }, []);

  const handleBgFileSelect = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setBgUploadError("Vui lòng chọn file ảnh");
      return;
    }
    if (file.type === "image/webp") {
      setBgUploadError("Định dạng WEBP có vấn đề tương thích. Vui lòng dùng JPG hoặc PNG.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setBgUploadError("File quá lớn (tối đa 5MB)");
      return;
    }

    setBgUploadError(null);
    setBgPreviewFile(file);
    setIsUploadingBg(true);

    try {
      const result = await uploadWidgetBackground(file, botId);
      if (result.success && result.url) {
        const store = useAppearanceStore.getState();
        if (store.chatBackgroundType !== EWidgetBackgroundType.Image) {
          store.setChatBackgroundType(EWidgetBackgroundType.Image);
        }
        store.setChatBackgroundValue(result.url);
        setBgPreviewFile(null);
        await saveAppearanceWithPreviewColors({
          chatBackgroundType: EWidgetBackgroundType.Image,
          chatBackgroundValue: result.url,
        });
      } else {
        setBgUploadError(result.error || "Upload thất bại");
        setBgPreviewFile(null);
      }
    } catch (error) {
      setBgUploadError(
        "Lỗi upload: " + (error instanceof Error ? error.message : "Không xác định")
      );
      setBgPreviewFile(null);
    } finally {
      setIsUploadingBg(false);
    }
  };

  const handleIconFileSelect = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setIconUploadError("Vui lòng chọn file ảnh");
      return;
    }
    if (file.type === "image/webp") {
      setIconUploadError("Định dạng WEBP có vấn đề tương thích. Vui lòng dùng JPG hoặc PNG.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setIconUploadError("File quá lớn (tối đa 2MB)");
      return;
    }

    setIconUploadError(null);
    setIsUploadingIcon(true);

    try {
      const result = await uploadWidgetIcon(file, botId);
      if (result.success && result.url) {
        const store = useAppearanceStore.getState();
        store.setChatIconType(EWidgetIconType.Custom);
        store.setChatIconUrl(result.url);
        setIconUploadError(null);
        await onSaveAppearance({
          chatIconType: EWidgetIconType.Custom,
          chatIconUrl: result.url,
        });
      } else {
        setIconUploadError(result.error || "Upload thất bại");
      }
    } catch (error) {
      setIconUploadError(
        "Lỗi upload: " + (error instanceof Error ? error.message : "Không xác định")
      );
    } finally {
      setIsUploadingIcon(false);
    }
  };

  const handleDeleteBackground = async () => {
    setIsUploadingBg(true);
    try {
      await deleteWidgetBackground(botId);
      const store = useAppearanceStore.getState();
      store.setChatBackgroundType(EWidgetBackgroundType.Solid);
      store.setChatBackgroundValue(solidColor);
      setBgPreviewFile(null);
      await saveAppearanceWithPreviewColors({
        chatBackgroundType: EWidgetBackgroundType.Solid,
        chatBackgroundValue: solidColor,
      });
    } catch (error) {
      setBgUploadError("Lỗi xóa: " + (error instanceof Error ? error.message : "Không xác định"));
    } finally {
      setIsUploadingBg(false);
    }
  };

  const handleDeleteIcon = async () => {
    setIsUploadingIcon(true);
    try {
      await deleteWidgetIcon(botId);
      const store = useAppearanceStore.getState();
      store.setChatIconType(EWidgetIconType.Preset);
      store.setChatIconUrl(null);
      setIconUploadError(null);
      await onSaveAppearance({
        chatIconType: EWidgetIconType.Preset,
        chatIconUrl: null,
      });
    } catch (error) {
      setIconUploadError("Lỗi xóa: " + (error instanceof Error ? error.message : "Không xác định"));
    } finally {
      setIsUploadingIcon(false);
    }
  };

  const handleIconInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleIconFileSelect(file);
  };

  const handlePositionChange = (newPos: { x: number; y: number }) => {
    const positionJson = JSON.stringify({ x: newPos.x, y: newPos.y });
    useAppearanceStore.getState().setPosition(positionJson);
    void saveAppearanceWithPreviewColors();
  };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <AppearanceSettingsCard
          botId={botId}
          currentPlan={currentPlan}
          isUploadingBg={isUploadingBg}
          bgPreviewFile={bgPreviewFile}
          bgUploadError={bgUploadError}
          isUploadingIcon={isUploadingIcon}
          iconUploadError={iconUploadError}
          solidColor={solidColor}
          gradientColor1={gradientColor1}
          gradientColor2={gradientColor2}
          gradientAngle={gradientAngle}
          bgFileInputRef={bgFileInputRef}
          setPrimaryColor={handlePrimaryColorChange}
          openPositionModal={() => setPositionModalOpen(true)}
          handleSolidColorChange={handleSolidColorChange}
          handleGradientChange={handleGradientChange}
          generateGradientCSS={generateGradientCSS}
          handleBgFileSelect={handleBgFileSelect}
          handleDeleteBackground={handleDeleteBackground}
          setChatIconBgColor={(color) => {
            const iconColorForNewBg = getTextColor(color);
            setPreviewChatIconBgColor(color);
            useAppearanceStore.getState().setChatIconBgColor(color);
            useAppearanceStore.getState().setChatIconColor(iconColorForNewBg);
          }}
          handleIconInputChange={handleIconInputChange}
          handleIconFileSelect={handleIconFileSelect}
          handleDeleteIcon={handleDeleteIcon}
          onSaveAppearance={saveAppearanceWithPreviewColors}
        />
      </div>

      <div className="space-y-6 lg:sticky lg:top-8">
        <WidgetPreviewCard
          previewMessagesRef={previewMessagesRef}
          handleSuggestedQuestionsWheel={handleSuggestedQuestionsWheel}
        />
      </div>

      <PositionModal
        open={positionModalOpen}
        botName={useAppearanceStore.getState().editBotName}
        avatarUrl={useAppearanceStore.getState().avatarUrl}
        primaryColor={previewPrimaryColor}
        chatIconType={useAppearanceStore.getState().chatIconType}
        chatIconUrl={useAppearanceStore.getState().chatIconUrl}
        chatIconBgColor={previewChatIconBgColor}
        chatIconPreset={useAppearanceStore.getState().chatIconPreset}
        chatIconColor={previewChatIconTextColor}
        currentPosition={useAppearanceStore.getState().position}
        onPositionChange={handlePositionChange}
        onClose={() => setPositionModalOpen(false)}
      />
    </div>
  );
}
