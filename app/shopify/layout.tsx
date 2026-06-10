export default function ShopifyLayout({ children }: { children: React.ReactNode }) {
  const apiKey = process.env.NEXT_PUBLIC_SHOPIFY_CLIENT_ID || "";

  return (
    <>
      <meta name="shopify-api-key" content={apiKey} />
      {/* eslint-disable-next-line */}
      <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js" />
      {children}
    </>
  );
}
