import { EAndroidBrowser, EIOSBrowser } from "@/types/enums";

export function isStandaloneMode(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true
  );
}

export function isIOS(): boolean {
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function getIOSBrowser(): EIOSBrowser | null {
  if (!isIOS()) {
    return null;
  }

  const ua = navigator.userAgent;

  if (/Brave/i.test(ua)) {
    return EIOSBrowser.Brave;
  }

  if (/CriOS/i.test(ua)) {
    return EIOSBrowser.Chrome;
  }

  if (/FxiOS/i.test(ua)) {
    return EIOSBrowser.Firefox;
  }

  if (/EdgiOS/i.test(ua)) {
    return EIOSBrowser.Edge;
  }

  if (/Safari/i.test(ua)) {
    return EIOSBrowser.Safari;
  }

  return EIOSBrowser.Other;
}

export function isAndroidChromium(): boolean {
  const ua = navigator.userAgent;
  return /Android/i.test(ua) && /Chrome/i.test(ua);
}

export function getAndroidBrowser(): EAndroidBrowser | null {
  const ua = navigator.userAgent;
  if (!/Android/i.test(ua)) return null;

  if (/coc_coc_browser/i.test(ua)) return EAndroidBrowser.CocCoc;
  if (/OPR\//i.test(ua)) return EAndroidBrowser.Opera;
  if (/EdgA\//i.test(ua)) return EAndroidBrowser.Edge;
  if (/SamsungBrowser/i.test(ua)) return EAndroidBrowser.Samsung;
  if ((navigator as { brave?: { isBrave?: boolean } }).brave?.isBrave) return EAndroidBrowser.Brave;
  if (/Chrome\//i.test(ua)) return EAndroidBrowser.Chrome;

  return EAndroidBrowser.Other;
}
