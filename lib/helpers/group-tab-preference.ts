const LAST_TAB_KEY = "vielora:last-chat-tab";

export function getLastTabPreference(botId: string): "chat" | "group" | null {
  if (typeof window === "undefined") return null;
  try {
    const val = localStorage.getItem(`${LAST_TAB_KEY}:${botId}`);
    if (val === "chat" || val === "group") return val;
    return null;
  } catch {
    return null;
  }
}

export function setLastTabPreference(botId: string, tab: "chat" | "group"): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${LAST_TAB_KEY}:${botId}`, tab);
  } catch (err) {
    console.error("Error setting last tab preference:", err);
  }
}
