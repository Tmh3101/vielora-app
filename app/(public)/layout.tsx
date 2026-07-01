import LenisProvider from "@/providers/LenisProvider";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <LenisProvider>{children}</LenisProvider>;
}
