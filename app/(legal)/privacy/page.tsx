import { getLegalContent } from "@/lib/utils/markdown";
import MarkdownContent from "@/components/ui/markdown-content";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chính sách bảo mật | Vielora",
  description:
    "Chính sách bảo mật và thông tin về việc thu thập, sử dụng và bảo vệ dữ liệu cá nhân của Vielora",
};

export default async function PrivacyPage() {
  const content = await getLegalContent("privacy");

  return <MarkdownContent content={content} />;
}
