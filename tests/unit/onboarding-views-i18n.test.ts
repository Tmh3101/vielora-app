import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Onboarding Views i18n keys", () => {
  const viMessages = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "../../messages/vi.json"), "utf8")
  );
  const enMessages = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "../../messages/en.json"), "utf8")
  );

  it("should have all required keys for discovering view in vi.json", () => {
    const discovering = viMessages.onboarding.views.discovering;
    expect(discovering).toBeDefined();
    expect(discovering.title).toBe("Crawl dữ liệu từ website");
    expect(discovering.description).toBe("Đang quét và thu thập dữ liệu từ website");
    expect(discovering.scopePrefix).toBe("Phạm vi");
    expect(discovering.failedTitle).toBe("Discover thất bại");
    expect(discovering.progressTitle).toBe("Đang thu thập dữ liệu...");
    expect(discovering.defaultAction).toBe("Đang kiểm tra các trang để thu thập dữ liệu...");
    expect(discovering.failedPagesCount).toBe("{count} trang lỗi trong quá trình discover");
  });

  it("should have all required keys for discovering view in en.json", () => {
    const discovering = enMessages.onboarding.views.discovering;
    expect(discovering).toBeDefined();
    expect(discovering.title).toBe("Crawl Website Data");
    expect(discovering.description).toBe("Scanning and gathering data from website");
    expect(discovering.scopePrefix).toBe("Scope");
    expect(discovering.failedTitle).toBe("Discovery failed");
    expect(discovering.progressTitle).toBe("Gathering data...");
    expect(discovering.defaultAction).toBe("Checking pages to gather data...");
    expect(discovering.failedPagesCount).toBe("{count} pages failed during discovery");
  });
});
