import { getLegalContent } from "@/lib/utils/markdown";
import MarkdownContent from "@/components/ui/markdown-content";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Điều khoản sử dụng | Vielora",
  description: "Điều khoản và điều kiện sử dụng dịch vụ của Vielora",
};

export default async function TermsPage() {
  const content = await getLegalContent("terms");

  return <MarkdownContent content={content} />;
}
