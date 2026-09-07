import * as fs from "fs";
import * as path from "path";
import { WIDGET_TRANSLATIONS } from "../lib/i18n/widget-translations";
import { ESystemLanguage } from "../types/enums";

const WIDGET_JS_PATH = path.resolve(__dirname, "../widget/widget.src.js");
const BEGIN_MARKER = "/* BEGIN_WIDGET_STRINGS */";
const END_MARKER = "/* END_WIDGET_STRINGS */";

// Keys that are strictly used in public/widget.js runtime
const REQUIRED_WIDGET_KEYS = [
  "welcome",
  "typeMessage",
  "send",
  "sendVoice",
  "error",
  "loading",
  "connected",
  "leadFormTitle",
  "leadFormPrompt",
  "leadFormName",
  "leadFormEmail",
  "leadFormPhone",
  "leadFormMessage",
  "leadFormNotePlaceholder",
  "leadFormSubmit",
  "leadFormSubmitting",
  "leadFormSuccess",
  "creditsExceeded",
  "unavailable",
  "dailyLimitBot",
  "dailyLimitUser",
  "dailyLimitFallback",
  "botNotReady",
  "botNotReadyDesc",
  "botNotReadyWait",
  "alwaysAvailable",
  "alwaysReady",
  "creditsPaused",
  "assistantDefaultName",
  "micDisconnected",
  "micDeviceError",
  "micPermissionRequired",
  "micInUse",
  "micStartFailed",
  "stopRecording",
  "micNoAudioData",
  "micNoAudioStream",
  "sttFailed",
  "sttRateLimit",
  "sttPlanRequired",
  "networkError",
  "messageTooLong",
  "maintenance",
  "domainAuthError",
  "redirecting",
  "cancel",
  "cancelRedirect",
  "close",
  "leadNameMin",
  "leadEmailInvalid",
  "chatHistory",
  "botUnavailableFallback",
] as const;

const KEY_ALIASES: Record<string, string[]> = {
  alwaysAvailable: ["alwaysReady"],
  alwaysReady: ["alwaysAvailable"],
  botNotReady: ["notReady"],
  notReady: ["botNotReady"],
  botNotReadyDesc: ["notReady", "botNotReady"],
  creditsPaused: ["outOfCredits"],
  outOfCredits: ["creditsPaused"],
  creditsExceeded: ["botOutOfCredits"],
  botOutOfCredits: ["creditsExceeded"],
  assistantDefaultName: ["aiAssistant"],
};

function resolveTranslation(
  dict: Record<string, string>,
  key: string,
  fallbackDict?: Record<string, string>
): string | undefined {
  if (dict[key] !== undefined && dict[key] !== "") return dict[key];
  const aliases = KEY_ALIASES[key] || [];
  for (const alias of aliases) {
    if (dict[alias] !== undefined && dict[alias] !== "") return dict[alias];
  }
  if (fallbackDict) {
    if (fallbackDict[key] !== undefined && fallbackDict[key] !== "") return fallbackDict[key];
    for (const alias of aliases) {
      if (fallbackDict[alias] !== undefined && fallbackDict[alias] !== "")
        return fallbackDict[alias];
    }
  }
  return undefined;
}

export function generateWidgetStringsCode(): string {
  const systemLanguages = Object.values(ESystemLanguage);
  const translationsMap = WIDGET_TRANSLATIONS as unknown as Record<string, Record<string, string>>;

  // 1. Extract unique default welcome greetings from system languages only (vi, en)
  const defaultGreetings = Array.from(
    new Set(
      systemLanguages
        .map((lang) => translationsMap[lang]?.welcome?.trim())
        .filter((welcome): welcome is string => Boolean(welcome))
    )
  );

  // 2. Build trimmed dictionary objects for system languages only (vi, en)
  const dictionaries: Record<string, Record<string, string>> = {};

  for (const lang of systemLanguages) {
    const rawDict = translationsMap[lang] || {};
    const fallbackDict = translationsMap.vi || {};
    dictionaries[lang] = {};

    for (const key of REQUIRED_WIDGET_KEYS) {
      const resolved = resolveTranslation(rawDict, key, fallbackDict);
      if (resolved !== undefined) {
        dictionaries[lang][key] = resolved;
      }
    }
  }

  // 3. Format JavaScript block with clean indentation
  const greetingsJson = JSON.stringify(defaultGreetings, null, 4)
    .split("\n")
    .map((line, idx) => (idx === 0 ? line : `  ${line}`))
    .join("\n");

  const stringsJson = JSON.stringify(dictionaries, null, 4)
    .split("\n")
    .map((line, idx) => (idx === 0 ? line : `  ${line}`))
    .join("\n");

  return [
    `  ${BEGIN_MARKER}`,
    `  var DEFAULT_WELCOME_MESSAGES = ${greetingsJson};`,
    ``,
    `  var WIDGET_STRINGS = ${stringsJson};`,
    `  ${END_MARKER}`,
  ].join("\n");
}

export function syncWidgetI18n(): void {
  if (!fs.existsSync(WIDGET_JS_PATH)) {
    throw new Error(`Widget file not found at: ${WIDGET_JS_PATH}`);
  }

  const content = fs.readFileSync(WIDGET_JS_PATH, "utf8");
  const startIndex = content.indexOf(BEGIN_MARKER);
  const endIndex = content.indexOf(END_MARKER);

  if (startIndex === -1 || endIndex === -1) {
    throw new Error(`Markers ${BEGIN_MARKER} and/or ${END_MARKER} not found in ${WIDGET_JS_PATH}`);
  }

  const generatedBlock = generateWidgetStringsCode();
  const pre = content.slice(0, startIndex).trimEnd();
  const post = content.slice(endIndex + END_MARKER.length).trimStart();

  const updatedContent = `${pre}\n\n${generatedBlock}\n\n  ${post}`;

  fs.writeFileSync(WIDGET_JS_PATH, updatedContent, "utf8");
  console.log(
    `✅ [Widget i18n Sync] Successfully synchronized ${
      Object.values(ESystemLanguage).length
    } system languages (${Object.values(ESystemLanguage).join(", ")}) into widget/widget.src.js`
  );
}

if (require.main === module) {
  try {
    syncWidgetI18n();
  } catch (err) {
    console.error("❌ [Widget i18n Sync Error]:", err);
    process.exit(1);
  }
}
