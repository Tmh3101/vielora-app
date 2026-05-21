import Script from "next/script";

export default function ShopifyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script
        src="https://cdn.shopify.com/shopifycloud/app-bridge.js"
        strategy="beforeInteractive"
      />
      {children}
    </>
  );
}
