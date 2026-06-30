import LenisProvider from "@/components/shared/LenisProvider";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <LenisProvider>{children}</LenisProvider>;
}
