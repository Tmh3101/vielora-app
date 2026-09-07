import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("SettingsTab i18n keys", () => {
  const viMessages = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "../../messages/vi.json"), "utf8")
  );
  const enMessages = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "../../messages/en.json"), "utf8")
  );

  it("should have all required toast keys for settingsTab in vi.json", () => {
    const settings = viMessages.dashboard.botDetail.settingsTab;
    expect(settings).toBeDefined();
    expect(settings.savedStandaloneDesc).toBe("Đã lưu cài đặt trang chat độc lập.");
    expect(settings.saveAppearanceSuccess).toBe("Cài đặt giao diện đã được lưu.");
    expect(settings.saveRateLimitSuccess).toBe("Cài đặt giới hạn tần suất đã được lưu.");
    expect(settings.saveDomainsSuccess).toBe("Danh sách domain cho phép đã được lưu.");
    expect(settings.stopBotSuccess).toBe("Bot đã được dừng hoạt động.");
    expect(settings.startBotSuccess).toBe("Bot đã được khởi động lại.");
    expect(settings.errorSaveGeneric).toBe("Không thể lưu cài đặt.");
  });

  it("should have all required toast keys for settingsTab in en.json", () => {
    const settings = enMessages.dashboard.botDetail.settingsTab;
    expect(settings).toBeDefined();
    expect(settings.savedStandaloneDesc).toBe("Saved standalone chat page settings.");
    expect(settings.saveAppearanceSuccess).toBe("Appearance settings have been saved.");
    expect(settings.saveRateLimitSuccess).toBe("Rate limit settings have been saved.");
    expect(settings.saveDomainsSuccess).toBe("Allowed domains list has been saved.");
    expect(settings.stopBotSuccess).toBe("Bot has been stopped.");
    expect(settings.startBotSuccess).toBe("Bot has been restarted.");
    expect(settings.errorSaveGeneric).toBe("Unable to save settings.");
  });
});
