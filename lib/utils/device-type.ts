export type DeviceType = "mobile" | "tablet" | "desktop";

const TABLET_UA_PATTERN =
  /iPad|Tablet|PlayBook|Silk|Kindle|(Android(?!.*Mobile))|KFAPWI|KFARWI|KFASWI|KFFOWI|KFSOWI|KFTHWI|KFTHWI|KFJWI|KFMEWI|KFOT|KFSAWI|KFSAWA|KFJWA|KFMEWA|KFOT|SM-T|Tab\d/i;

const MOBILE_UA_PATTERN =
  /iPhone|iPod|Windows Phone|IEMobile|BlackBerry|Opera Mini|Mobile|webOS|Palm|Symbian|BB10|CriOS|FxiOS|EdgiOS/i;

export function getDeviceType(userAgent: string): DeviceType {
  const ua = userAgent.trim();
  if (!ua) {
    return "desktop";
  }

  if (TABLET_UA_PATTERN.test(ua)) {
    return "tablet";
  }

  if (MOBILE_UA_PATTERN.test(ua)) {
    return "mobile";
  }

  return "desktop";
}
