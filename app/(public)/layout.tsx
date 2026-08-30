import { PublicChatWidget } from "@/components/shared/PublicChatWidget";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <PublicChatWidget />
    </>
  );
}
