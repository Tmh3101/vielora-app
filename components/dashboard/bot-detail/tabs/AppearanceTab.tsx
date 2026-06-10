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
import { ESubscriptionPlan, EWidgetIconType } from "@/types";

interface AppearanceSaveOverrides {
  primaryColor?: string;
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
  editBotName: string;
  avatarUrl: string | null;
  primaryColor: string;
  textColor: string;
  position: string;
  welcomeMessage: string;
  suggestedQuestions: string[];
  chatBackgroundType: ChatBackgroundType;
  chatBackgroundValue: string;
  chatBackgroundOpacity: number;
  chatIconType: EWidgetIconType;
  chatIconPreset: string;
  chatIconUrl: string | null;
  chatIconColor: string;
  chatIconBgColor: string;
  isSaving: boolean;
  currentPlan?: ESubscriptionPlan;
  setEditBotName: (value: string) => void;
  setAvatarUrl: (value: string | null) => void;
  setPrimaryColor: (value: string) => void;
  setPosition: (value: string) => void;
  setWelcomeMessage: (value: string) => void;
  setSuggestedQuestions: (value: string[]) => void;
  setChatBackgroundType: (value: ChatBackgroundType) => void;
  setChatBackgroundValue: (value: string) => void;
  setChatBackgroundOpacity: (value: number) => void;
  setChatIconType: (value: EWidgetIconType) => void;
  setChatIconPreset: (value: string) => void;
  setChatIconUrl: (value: string | null) => void;
  setChatIconColor: (value: string) => void;
  setChatIconBgColor: (value: string) => void;
  onSaveAppearance: (overrides?: AppearanceSaveOverrides) => Promise<void>;
}

const handleSuggestedQuestionsWheel = (e: WheelEvent<HTMLDivElement>) => {
  if (e.deltaY === 0 && e.deltaX === 0) return;
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.scrollLeft += e.deltaY + e.deltaX;
};

export function AppearanceTab({
  botId,
  editBotName,
  avatarUrl,
  primaryColor,
  textColor,
  position,
  welcomeMessage,
  suggestedQuestions = [],
  chatBackgroundType,
  chatBackgroundValue,
  chatBackgroundOpacity,
  isSaving,
  currentPlan,
  setEditBotName,
  setAvatarUrl,
  setPrimaryColor,
  setPosition,
  setWelcomeMessage,
  setSuggestedQuestions,
  setChatBackgroundType,
  setChatBackgroundValue,
  setChatBackgroundOpacity,
  chatIconType,
  chatIconPreset,
  chatIconUrl,
  chatIconBgColor,
  setChatIconType,
  setChatIconPreset,
  setChatIconUrl,
  setChatIconColor,
  setChatIconBgColor,
  onSaveAppearance,
}: AppearanceTabProps) {
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
  const [previewPrimaryColor, setPreviewPrimaryColor] = useState(primaryColor);
  const [previewChatIconBgColor, setPreviewChatIconBgColor] = useState(chatIconBgColor);

  const previewPrimaryTextColor = getTextColor(previewPrimaryColor);
  const previewChatIconTextColor = getTextColor(previewChatIconBgColor);
  const getUserMessageTextColor = () => previewPrimaryTextColor;
  const generateGradientCSS = (color1: string, color2: string, angle: number) =>
    `linear-gradient(${angle}deg, ${color1} 0%, ${color2} 100%)`;

  const handlePrimaryColorChange = (color: string) => {
    const textColorForNewColor = getTextColor(color);
    setPreviewPrimaryColor(color);
    setPreviewChatIconBgColor(color);
    setPrimaryColor(color);
    setChatIconBgColor(color);
    setChatIconColor(textColorForNewColor);
  };

  const saveAppearanceWithPreviewColors = (overrides?: AppearanceSaveOverrides) => {
    const nextChatIconBgColor = overrides?.chatIconBgColor ?? previewChatIconBgColor;

    return onSaveAppearance({
      ...overrides,
      primaryColor: overrides?.primaryColor ?? previewPrimaryColor,
      chatIconBgColor: nextChatIconBgColor,
      chatIconColor: getTextColor(nextChatIconBgColor),
    });
  };

  useEffect(() => {
    setChatIconColor(previewChatIconTextColor);
  }, [previewChatIconTextColor, setChatIconColor]);

  useEffect(() => {
    setPreviewPrimaryColor(primaryColor);
  }, [primaryColor]);

  useEffect(() => {
    setPreviewChatIconBgColor(chatIconBgColor);
  }, [chatIconBgColor]);

  const handleSolidColorChange = (color: string) => {
    setSolidColor(color);
    setChatBackgroundValue(color);
  };

  const handleGradientChange = (c1?: string, c2?: string, angle?: number) => {
    const newC1 = c1 ?? gradientColor1;
    const newC2 = c2 ?? gradientColor2;
    const newAngle = angle ?? gradientAngle;

    if (c1 !== undefined) setGradientColor1(c1);
    if (c2 !== undefined) setGradientColor2(c2);
    if (angle !== undefined) setGradientAngle(angle);

    setChatBackgroundValue(generateGradientCSS(newC1, newC2, newAngle));
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
    if (
      chatBackgroundType === BackgroundType.SOLID &&
      chatBackgroundValue &&
      chatBackgroundValue.startsWith("#")
    ) {
      setSolidColor(chatBackgroundValue);
    } else if (
      chatBackgroundType === BackgroundType.GRADIENT &&
      chatBackgroundValue &&
      chatBackgroundValue.includes("linear-gradient")
    ) {
      const match = chatBackgroundValue.match(
        /linear-gradient\((\d+)deg,\s*([^,\s]+)\s*0%,\s*([^)]+)\s*100%\)/
      );
      if (match) {
        setGradientAngle(parseInt(match[1]));
        setGradientColor1(match[2]);
        setGradientColor2(match[3].trim());
      }
    }
  }, [chatBackgroundType, chatBackgroundValue]);

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
        if (chatBackgroundType !== BackgroundType.IMAGE) {
          setChatBackgroundType(BackgroundType.IMAGE);
        }
        setChatBackgroundValue(result.url);
        setBgPreviewFile(null);
        await saveAppearanceWithPreviewColors({
          chatBackgroundType: BackgroundType.IMAGE,
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
        // Ensure uploaded icon is immediately active in preview and persisted as custom mode.
        setChatIconType(EWidgetIconType.Custom);
        setChatIconUrl(result.url);
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
      setChatBackgroundType(BackgroundType.SOLID);
      setChatBackgroundValue(solidColor);
      setBgPreviewFile(null);
      await saveAppearanceWithPreviewColors({
        chatBackgroundType: BackgroundType.SOLID,
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
      // Fallback to preset mode when custom icon is removed.
      setChatIconType(EWidgetIconType.Preset);
      setChatIconUrl(null);
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
    console.log("[AppearanceTab] Position saved", {
      x: newPos.x,
      y: newPos.y,
      position: positionJson,
    });
    setPosition(positionJson);
    void saveAppearanceWithPreviewColors();
  };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <AppearanceSettingsCard
          botId={botId}
          editBotName={editBotName}
          avatarUrl={avatarUrl}
          primaryColor={previewPrimaryColor}
          position={position}
          welcomeMessage={welcomeMessage}
          suggestedQuestions={suggestedQuestions}
          chatBackgroundType={chatBackgroundType}
          chatBackgroundValue={chatBackgroundValue}
          chatBackgroundOpacity={chatBackgroundOpacity}
          chatIconType={chatIconType}
          chatIconPreset={chatIconPreset}
          chatIconUrl={chatIconUrl}
          isSaving={isSaving}
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
          setEditBotName={setEditBotName}
          setAvatarUrl={setAvatarUrl}
          setPrimaryColor={handlePrimaryColorChange}
          setWelcomeMessage={setWelcomeMessage}
          setSuggestedQuestions={setSuggestedQuestions}
          setChatBackgroundType={setChatBackgroundType}
          setChatBackgroundOpacity={setChatBackgroundOpacity}
          setChatIconType={setChatIconType}
          openPositionModal={() => setPositionModalOpen(true)}
          handleSolidColorChange={handleSolidColorChange}
          handleGradientChange={handleGradientChange}
          generateGradientCSS={generateGradientCSS}
          handleBgFileSelect={handleBgFileSelect}
          handleDeleteBackground={handleDeleteBackground}
          setChatIconPreset={setChatIconPreset}
          setChatIconBgColor={(color) => {
            const iconColorForNewBg = getTextColor(color);
            setPreviewChatIconBgColor(color);
            setChatIconBgColor(color);
            setChatIconColor(iconColorForNewBg);
          }}
          setChatIconColor={setChatIconColor}
          handleIconInputChange={handleIconInputChange}
          handleIconFileSelect={handleIconFileSelect}
          handleDeleteIcon={handleDeleteIcon}
          onSaveAppearance={saveAppearanceWithPreviewColors}
        />
      </div>

      <div className="space-y-6 lg:sticky lg:top-8">
        <WidgetPreviewCard
          editBotName={editBotName}
          avatarUrl={avatarUrl}
          primaryColor={previewPrimaryColor}
          textColor={textColor}
          welcomeMessage={welcomeMessage}
          suggestedQuestions={suggestedQuestions}
          chatBackgroundType={chatBackgroundType}
          chatBackgroundValue={chatBackgroundValue}
          chatBackgroundOpacity={chatBackgroundOpacity}
          chatIconType={chatIconType}
          chatIconPreset={chatIconPreset}
          chatIconUrl={chatIconUrl}
          chatIconColor={previewChatIconTextColor}
          chatIconBgColor={previewChatIconBgColor}
          solidColor={solidColor}
          getUserMessageTextColor={getUserMessageTextColor}
          previewMessagesRef={previewMessagesRef}
          handleSuggestedQuestionsWheel={handleSuggestedQuestionsWheel}
        />
      </div>

      <PositionModal
        open={positionModalOpen}
        botName={editBotName}
        avatarUrl={avatarUrl}
        primaryColor={previewPrimaryColor}
        chatIconType={chatIconType}
        chatIconUrl={chatIconUrl}
        chatIconBgColor={previewChatIconBgColor}
        chatIconPreset={chatIconPreset}
        chatIconColor={previewChatIconTextColor}
        currentPosition={position}
        onPositionChange={handlePositionChange}
        onClose={() => setPositionModalOpen(false)}
      />
    </div>
  );
}
