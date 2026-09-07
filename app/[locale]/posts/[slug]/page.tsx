import { Metadata } from "next";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import CTASection from "@/components/landing/CTASection";
import { createServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Calendar, ChevronRight, Clock, ArrowLeft, BookOpen } from "lucide-react";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { buildBlogPostSchema } from "@/lib/helpers";
import { getPostBySlug, getRelatedPosts } from "@/lib/services/post.service";

export async function generateMetadata(props: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const { locale, slug } = params;
  const supabase = await createServerClient();

  const { data: post } = await supabase
    .from("posts")
    .select("title, summary, thumbnail_url")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  interface DBPostMeta {
    title: string;
    summary: string;
    thumbnail_url: string | null;
  }

  const postMeta = post as unknown as DBPostMeta | null;

  if (!postMeta) {
    const t = await getTranslations({ locale, namespace: "metadata" });
    return {
      title: t("postNotFound"),
    };
  }

  return {
    title: postMeta.title,
    description: postMeta.summary,
    alternates: {
      canonical: `/${locale}/posts/${slug}`,
      languages: {
        vi: `/vi/posts/${slug}`,
        en: `/en/posts/${slug}`,
        "x-default": `/vi/posts/${slug}`,
      },
    },
    openGraph: {
      title: postMeta.title,
      description: postMeta.summary,
      type: "article",
      images: postMeta.thumbnail_url ? [postMeta.thumbnail_url] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: postMeta.title,
      description: postMeta.summary,
      images: postMeta.thumbnail_url ? [postMeta.thumbnail_url] : [],
    },
  };
}

export default async function PostDetailPage(props: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const params = await props.params;
  const { locale, slug } = params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "posts" });
  const tNav = await getTranslations({ locale, namespace: "navigation" });
  const supabase = await createServerClient();

  const post = await getPostBySlug(supabase, slug);
  if (!post) {
    notFound();
  }

  const categoryIds = post.categories.map((c) => c.id);
  const relatedPosts = await getRelatedPosts(supabase, {
    currentPostId: post.id,
    categoryIds,
    limit: 3,
  });

  const wordCount = post.content.replace(/<[^>]*>/g, "").split(/\s+/).length;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  const postSchema = buildBlogPostSchema({
    locale,
    slug: post.slug,
    title: post.title,
    description: post.summary,
    publishedAt: post.published_at,
    thumbnailUrl: post.thumbnail_url,
  });

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(postSchema) }}
      />
      <Header />

      <main className="relative flex-grow overflow-hidden pb-12 pt-24 md:pb-16 md:pt-32">
        {/* Vòng sáng trang trí */}
        <div className="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-primary/10 blur-[120px]" />
        <div className="pointer-events-none absolute -left-40 top-1/2 h-96 w-96 rounded-full bg-accent/10 blur-[120px]" />

        <div className="relative z-10 mx-auto max-w-4xl px-4">
          {/* Breadcrumbs */}
          <nav className="mb-8 flex items-center gap-1.5 border-b border-border/20 pb-4 text-xs text-muted-foreground/80 md:text-sm">
            <Link href="/" className="transition-colors hover:text-primary">
              {tNav("home")}
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href="/posts" className="transition-colors hover:text-primary">
              {tNav("blog")}
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            {post.categories.length > 0 && (
              <>
                <Link
                  href={`/posts?category=${post.categories[0].slug}`}
                  className="font-medium text-foreground/80 transition-colors hover:text-primary"
                >
                  {post.categories[0].name}
                </Link>
                <ChevronRight className="h-3.5 w-3.5" />
              </>
            )}
            <span className="max-w-[200px] truncate text-muted-foreground/50">{post.title}</span>
          </nav>

          {/* Nút quay lại */}
          <Link
            href="/posts"
            className="mb-6 inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" /> {t("backToBlog")}
          </Link>

          {/* Thông tin đầu trang */}
          <div className="mb-8 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {post.categories.map((c) => (
                <Link key={c.id} href={`/posts?category=${c.slug}`}>
                  <Badge
                    variant="secondary"
                    className="border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary transition-all hover:bg-primary/20"
                  >
                    {c.name}
                  </Badge>
                </Link>
              ))}
            </div>

            <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-foreground md:text-4xl lg:text-5xl">
              {post.title}
            </h1>

            {/* Meta bar */}
            <div className="flex flex-wrap items-center gap-4 border-y border-border/40 py-3 text-xs text-muted-foreground md:text-sm">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(post.published_at).toLocaleDateString(
                  locale === "vi" ? "vi-VN" : "en-US",
                  {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  }
                )}
              </span>
              <span className="hidden h-1.5 w-1.5 rounded-full bg-muted-foreground/30 sm:inline" />
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {t("minRead", { min: readTime })}
              </span>
            </div>
          </div>

          {/* Tóm tắt bài viết */}
          <div className="mb-8 rounded-r-2xl border-l-4 border-primary/70 bg-muted/20 p-4 md:p-6">
            <p className="text-sm font-medium italic leading-relaxed text-foreground/90 md:text-base">
              {post.summary}
            </p>
          </div>

          {/* Ảnh Thumbnail */}
          {post.thumbnail_url && (
            <div className="relative mb-10 aspect-[16/9] w-full overflow-hidden rounded-3xl border border-border/50 bg-muted shadow-lg">
              <Image
                src={post.thumbnail_url}
                alt={post.title}
                fill
                priority
                sizes="(min-width: 1024px) 896px, calc(100vw - 2rem)"
                className="object-cover"
                unoptimized
              />
            </div>
          )}

          {/* Nội dung bài viết */}
          <div className="relative">
            <style
              dangerouslySetInnerHTML={{
                __html: `
              .blog-content {
                color: hsl(var(--foreground)) !important;
                font-size: 1.0625rem;
                line-height: 1.8;
              }
              .blog-content h1, .blog-content H1 {
                font-size: 2rem !important;
                font-weight: 800 !important;
                margin-top: 2rem !important;
                margin-bottom: 1rem !important;
                color: hsl(var(--foreground)) !important;
                display: block !important;
              }
              .blog-content h2, .blog-content H2 {
                font-size: 1.5rem !important;
                font-weight: 700 !important;
                margin-top: 1.75rem !important;
                margin-bottom: 0.75rem !important;
                color: hsl(var(--foreground)) !important;
                display: block !important;
              }
              .blog-content h3, .blog-content H3 {
                font-size: 1.25rem !important;
                font-weight: 600 !important;
                margin-top: 1.5rem !important;
                margin-bottom: 0.5rem !important;
                color: hsl(var(--foreground)) !important;
                display: block !important;
              }
              .blog-content p, .blog-content P {
                font-size: 1rem !important;
                line-height: 1.75 !important;
                margin-top: 1rem !important;
                margin-bottom: 1rem !important;
                color: hsl(var(--foreground)) !important;
              }
              .blog-content ul, .blog-content UL {
                list-style-type: disc !important;
                padding-left: 2rem !important;
                margin-top: 1rem !important;
                margin-bottom: 1rem !important;
              }
              .blog-content ol, .blog-content OL {
                list-style-type: decimal !important;
                padding-left: 2rem !important;
                margin-top: 1rem !important;
                margin-bottom: 1rem !important;
              }
              .blog-content li, .blog-content LI {
                margin-top: 0.5rem !important;
                margin-bottom: 0.5rem !important;
                line-height: 1.6 !important;
              }
              .blog-content strong, .blog-content STRONG {
                font-weight: bold !important;
                color: hsl(var(--foreground)) !important;
              }
              .blog-content em, .blog-content EM {
                font-style: italic !important;
              }
            `,
              }}
            />
            <div className="blog-content" dangerouslySetInnerHTML={{ __html: post.content }} />
          </div>

          {/* Phần chân bài viết - Related Posts */}
          {relatedPosts.length > 0 && (
            <div className="mt-12 border-t border-border/60 pt-10">
              <h3 className="mb-6 flex items-center gap-2 text-xl font-bold text-foreground md:text-2xl">
                <BookOpen className="h-5 w-5 text-primary" />
                {t("relatedArticles")}
              </h3>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {relatedPosts.map((rel) => (
                  <Link
                    key={rel.id}
                    href={`/posts/${rel.slug}`}
                    className="hover:shadow-glow-sm group flex flex-col overflow-hidden rounded-xl border border-border/40 bg-card/20 p-4 transition-all duration-300 hover:border-border/80"
                  >
                    {/* Related Thumbnail */}
                    <div className="relative mb-3 aspect-[16/10] w-full overflow-hidden rounded-lg bg-muted">
                      {rel.thumbnail_url ? (
                        <Image
                          src={rel.thumbnail_url}
                          alt={rel.title}
                          fill
                          sizes="(min-width: 768px) 288px, calc(100vw - 4rem)"
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
                          <BookOpen className="h-6 w-6 text-primary/20" />
                        </div>
                      )}
                    </div>
                    {/* Related Date & Title */}
                    <div className="flex flex-1 flex-col justify-between">
                      <span className="mb-1 block text-[10px] text-muted-foreground">
                        {new Date(rel.published_at).toLocaleDateString(
                          locale === "vi" ? "vi-VN" : "en-US",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          }
                        )}
                      </span>
                      <h4 className="line-clamp-2 text-sm font-bold leading-snug text-foreground transition-colors group-hover:text-primary">
                        {rel.title}
                      </h4>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <CTASection />
      <Footer />
    </div>
  );
}
