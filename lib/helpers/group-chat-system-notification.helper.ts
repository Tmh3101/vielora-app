import { ESystemLanguage } from "@/types/enums";
import { SYSTEM_ACTION_KEYS, type SystemActionKey } from "@/lib/constants/group-chat-messages";
import viMessages from "@/messages/vi.json";
import enMessages from "@/messages/en.json";

export interface RegisteredMatcher {
  actionKey: SystemActionKey;
  regex: RegExp;
}

export interface ParsedSystemNotification {
  actorName: string;
  actionText: string;
  titlePart?: string;
}

/**
 * Xây dựng RegExp matcher từ chuỗi template JSON
 */
export function buildMatcher(template: string, actionKey: SystemActionKey): RegisteredMatcher {
  const escaped = template
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace("\\{userName\\}", "(.+?)")
    .replace(/\\\{title\\\}|\\\{question\\\}/g, "(.*?)")
    .replace(/\\"[“"”\\]*/g, '["“\\]*');

  return {
    actionKey,
    regex: new RegExp(`^${escaped}$`, "i"),
  };
}

/**
 * Bảng matchers đăng ký toàn cục nạp từ vi.json và en.json
 */
export const REGISTERED_SYSTEM_MATCHERS: RegisteredMatcher[] = [];

for (const key of SYSTEM_ACTION_KEYS) {
  const viTemplate = (viMessages.groupChat?.system as Record<string, string> | undefined)?.[key];
  if (viTemplate) {
    REGISTERED_SYSTEM_MATCHERS.push(buildMatcher(viTemplate, key));
  }
  const enTemplate = (enMessages.groupChat?.system as Record<string, string> | undefined)?.[key];
  if (enTemplate) {
    REGISTERED_SYSTEM_MATCHERS.push(buildMatcher(enTemplate, key));
  }
}

/**
 * Trích xuất nhãn hành động tương ứng theo ngôn ngữ đích (ESystemLanguage.Vi hoặc ESystemLanguage.En)
 */
export function getLocalizedActionText(
  actionKey: SystemActionKey,
  targetLocale: ESystemLanguage | string = ESystemLanguage.Vi
): string {
  const isEn =
    targetLocale === ESystemLanguage.En || targetLocale === "en" || targetLocale === "en-US";
  const dict = isEn
    ? (enMessages.groupChat?.system as Record<string, string> | undefined)
    : (viMessages.groupChat?.system as Record<string, string> | undefined);
  const template =
    dict?.[actionKey] ||
    (enMessages.groupChat?.system as Record<string, string> | undefined)?.[actionKey] ||
    "";

  if (!template) return "";
  const match = template.match(/\{userName\}\s+(.+?)(?::\s*["“\\]*\{|\s*\{|$)/);
  return match ? match[1].trim() : "";
}

/**
 * Chuẩn hóa tên vai trò mặc định (Quản trị viên ⇄ Administrator, Thành viên ⇄ Member)
 */
export function localizeActorName(
  rawName: string,
  targetLocale: ESystemLanguage | string = ESystemLanguage.Vi
): string {
  const isEn =
    targetLocale === ESystemLanguage.En || targetLocale === "en" || targetLocale === "en-US";
  const trimmed = rawName.trim();
  if (isEn) {
    if (trimmed === "Quản trị viên") return "Administrator";
    if (trimmed === "Thành viên") return "Member";
  } else {
    if (trimmed === "Administrator" || trimmed === "Admin") return "Quản trị viên";
    if (trimmed === "Member") return "Thành viên";
  }
  return trimmed;
}

/**
 * Phân tích và dịch động thông báo hệ thống theo ngôn ngữ đích
 */
export function parseSystemNotification(
  content: string,
  targetLocale: ESystemLanguage | string = ESystemLanguage.Vi
): ParsedSystemNotification | null {
  const trimmed = content.trim();

  // 1. Đối soát với các matchers đăng ký
  for (const { actionKey, regex } of REGISTERED_SYSTEM_MATCHERS) {
    try {
      const match = trimmed.match(regex);
      if (match && match[1]) {
        const rawActor = match[1].trim();
        const actorName = localizeActorName(rawActor, targetLocale);
        let titlePart = match[2] ? match[2].trim() : undefined;
        if (titlePart) {
          titlePart = titlePart.replace(/^["“\\]+|["”\\]+$/g, "").trim();
        }
        const actionText = getLocalizedActionText(actionKey, targetLocale);

        return {
          actorName,
          actionText,
          titlePart: titlePart || undefined,
        };
      }
    } catch {
      // Tiếp tục matcher tiếp theo
    }
  }

  // 2. Dự phòng cho mẫu tùy biến chứa dấu hai chấm
  const colonIdx = trimmed.indexOf(":");
  if (colonIdx !== -1) {
    const beforeColon = trimmed.slice(0, colonIdx).trim();
    const titlePart = trimmed
      .slice(colonIdx + 1)
      .trim()
      .replace(/^["“\\]+|["”\\]+$/g, "")
      .trim();

    const firstSpace = beforeColon.indexOf(" ");
    if (firstSpace !== -1) {
      const rawActor = beforeColon.slice(0, firstSpace).trim();
      return {
        actorName: localizeActorName(rawActor, targetLocale),
        actionText: beforeColon.slice(firstSpace + 1).trim(),
        titlePart: titlePart || undefined,
      };
    }

    return {
      actorName: "",
      actionText: beforeColon,
      titlePart: titlePart || undefined,
    };
  }

  return null;
}
