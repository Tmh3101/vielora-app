/**
 * SEO Schema.org JSON-LD Structured Data Builders
 *
 * Provides typed, localized Schema.org definitions for:
 * - SoftwareApplication & Organization (Home/Landing Page)
 * - AboutPage & Organization (About Us Page)
 * - BlogPosting / Article (Blog Detail Page for Google Rich Snippets)
 * - CollectionPage (Blog Listing Page)
 */

export const DEFAULT_SITE_URL = "https://vielora.vn";
export const DEFAULT_LOGO_URL = "https://vielora.vn/images/logo-footer.png";
export const DEFAULT_DX4U_LOGO_URL = "https://vielora.vn/images/logo-dx4u.png";

export function getBaseSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : DEFAULT_SITE_URL)
  );
}

export function getLanguageCode(locale: string = "vi"): string {
  return locale === "en" ? "en-US" : "vi-VN";
}

/**
 * 1. Home / Landing Page Schema: SoftwareApplication & Organization
 */
export function buildHomeSchema(options: {
  locale: string;
  appDescription: string;
  orgDescription?: string;
  baseUrl?: string;
}) {
  const { locale, appDescription, baseUrl = getBaseSiteUrl() } = options;
  const inLanguage = getLanguageCode(locale);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "@id": `${baseUrl}/${locale}#software`,
        name: "Vielora",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        inLanguage,
        url: `${baseUrl}/${locale}`,
        offers: {
          "@type": "AggregateOffer",
          lowPrice: "0",
          highPrice: "799000",
          priceCurrency: "VND",
        },
        description: appDescription,
        publisher: {
          "@id": `${baseUrl}/#organization`,
        },
      },
      {
        "@type": "Organization",
        "@id": `${baseUrl}/#organization`,
        name: "Titops DX4U",
        url: baseUrl,
        logo: DEFAULT_LOGO_URL,
        sameAs: ["https://dx4u.io/"],
      },
    ],
  };
}

/**
 * 2. About Us Page Schema: AboutPage & Organization
 */
export function buildAboutSchema(options: {
  locale: string;
  pageName: string;
  pageDescription: string;
  orgDescription: string;
  baseUrl?: string;
}) {
  const { locale, pageName, pageDescription, orgDescription, baseUrl = getBaseSiteUrl() } = options;
  const inLanguage = getLanguageCode(locale);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "AboutPage",
        "@id": `${baseUrl}/${locale}/about-us`,
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": `${baseUrl}/${locale}/about-us`,
        },
        name: pageName,
        description: pageDescription,
        inLanguage,
      },
      {
        "@type": "Organization",
        "@id": `${baseUrl}/#organization`,
        name: "Titops DX4U",
        url: "https://dx4u.io/",
        logo: DEFAULT_DX4U_LOGO_URL,
        description: orgDescription,
        knowsAbout: ["Artificial Intelligence", "SaaS", "Chatbot", "RAG", "Web3"],
      },
    ],
  };
}

/**
 * 3. Blog Detail Page Schema: BlogPosting / Article
 */
export function buildBlogPostSchema(options: {
  locale: string;
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  thumbnailUrl?: string | null;
  authorName?: string;
  baseUrl?: string;
}) {
  const {
    locale,
    slug,
    title,
    description,
    publishedAt,
    thumbnailUrl,
    authorName = "Titops DX4U",
    baseUrl = getBaseSiteUrl(),
  } = options;

  const inLanguage = getLanguageCode(locale);
  const postUrl = `${baseUrl}/${locale}/posts/${slug}`;

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${postUrl}#article`,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": postUrl,
    },
    headline: title,
    description,
    inLanguage,
    datePublished: publishedAt,
    dateModified: publishedAt,
    image: thumbnailUrl ? [thumbnailUrl] : [],
    author: {
      "@type": "Organization",
      name: authorName,
      url: baseUrl,
    },
    publisher: {
      "@type": "Organization",
      name: "Vielora",
      url: baseUrl,
      logo: {
        "@type": "ImageObject",
        url: DEFAULT_LOGO_URL,
      },
    },
  };
}

/**
 * 4. Blog Listing Page Schema: CollectionPage
 */
export function buildBlogListingSchema(options: {
  locale: string;
  pageName: string;
  pageDescription: string;
  baseUrl?: string;
}) {
  const { locale, pageName, pageDescription, baseUrl = getBaseSiteUrl() } = options;
  const inLanguage = getLanguageCode(locale);
  const collectionUrl = `${baseUrl}/${locale}/posts`;

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": collectionUrl,
    name: pageName,
    description: pageDescription,
    inLanguage,
    url: collectionUrl,
    publisher: {
      "@type": "Organization",
      name: "Titops DX4U",
      url: baseUrl,
      logo: DEFAULT_LOGO_URL,
    },
  };
}
