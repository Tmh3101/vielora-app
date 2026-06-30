import { Metadata } from "next";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import CTASection from "@/components/landing/CTASection";
import { createServerClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Calendar, Tag, ArrowRight, BookOpen } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import ScrollToTop from "@/components/shared/ScrollToTop";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export const metadata: Metadata = {
  title: "Blog & Tin tức | Vielora",
  description:
    "Cập nhật các tin tức mới nhất, hướng dẫn sử dụng, kiến thức AI và các cập nhật tính năng mới từ Vielora.",
};

const POSTS_PAGE_SIZE = 6;

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Post {
  id: string;
  title: string;
  slug: string;
  summary: string;
  thumbnail_url: string | null;
  published_at: string;
  categories: Category[];
}

function getVisiblePages(currentPage: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  const visiblePages = Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);

  return visiblePages.reduce<Array<number | "ellipsis">>((items, page, index) => {
    if (index > 0 && page - visiblePages[index - 1] > 1) {
      items.push("ellipsis");
    }
    items.push(page);
    return items;
  }, []);
}

export default async function BlogPage(props: {
  searchParams: Promise<{ page?: string; category?: string }>;
}) {
  const searchParams = await props.searchParams;
  const page = Number(searchParams.page) || 1;
  const activeCategorySlug = searchParams.category || "";

  const supabase = await createServerClient();

  // 1. Lấy toàn bộ danh mục để hiển thị thanh lọc danh mục
  const { data: categoriesData } = await supabase
    .from("categories")
    .select("id, name, slug")
    .order("name", { ascending: true });

  const categories: Category[] = categoriesData || [];

  // 2. Tìm các IDs bài viết có chứa danh mục được chọn (nếu có lọc danh mục)
  let postIds: string[] | null = null;
  if (activeCategorySlug) {
    const { data: catRelations } = await supabase
      .from("post_categories")
      .select("post_id, categories!inner(slug)")
      .eq("categories.slug", activeCategorySlug);

    interface DBCatRel {
      post_id: string;
    }
    const catRelData = (catRelations || []) as unknown as DBCatRel[];
    postIds = catRelData.map((r) => r.post_id);
  }

  // 3. Thực hiện truy vấn danh sách bài viết
  let postsQuery = supabase
    .from("posts")
    .select(
      `
      id,
      title,
      slug,
      summary,
      thumbnail_url,
      published_at,
      post_categories (
        categories (
          id,
          name,
          slug
        )
      )
    `,
      { count: "exact" }
    )
    .eq("status", "published");

  if (postIds) {
    postsQuery = postsQuery.in("id", postIds);
  } else if (activeCategorySlug) {
    // Nếu có chọn danh mục nhưng không tìm thấy bài viết nào tương ứng
    postsQuery = postsQuery.in("id", ["00000000-0000-0000-0000-000000000000"]);
  }

  const {
    data: rawPosts,
    count,
    error,
  } = await postsQuery
    .order("published_at", { ascending: false })
    .range((page - 1) * POSTS_PAGE_SIZE, page * POSTS_PAGE_SIZE - 1);

  if (error) {
    console.error("Lỗi truy vấn bài viết công khai:", error);
  }

  const totalItems = count || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / POSTS_PAGE_SIZE));
  const pageItems = getVisiblePages(page, totalPages);

  interface DBPostCategory {
    categories: {
      id: string;
      name: string;
      slug: string;
    } | null;
  }

  interface DBPost {
    id: string;
    title: string;
    slug: string;
    summary: string;
    thumbnail_url: string | null;
    published_at: string;
    post_categories: DBPostCategory[] | null;
  }

  const rawPostsData = (rawPosts || []) as unknown as DBPost[];

  // Định dạng lại bài viết từ DB
  const posts: Post[] = rawPostsData.map((post) => {
    const cats: Category[] = [];
    if (post.post_categories) {
      post.post_categories.forEach((item) => {
        if (item.categories) {
          cats.push({
            id: item.categories.id,
            name: item.categories.name,
            slug: item.categories.slug,
          });
        }
      });
    }
    return {
      id: post.id,
      title: post.title,
      slug: post.slug,
      summary: post.summary,
      thumbnail_url: post.thumbnail_url,
      published_at: post.published_at,
      categories: cats,
    };
  });

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />

      <main className="relative flex-grow overflow-hidden pb-12 pt-24 md:pb-20 md:pt-32">
        {/* Vòng sáng trang trí */}
        <div className="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-primary/10 blur-[120px]" />
        <div className="pointer-events-none absolute -left-40 top-1/2 h-96 w-96 rounded-full bg-accent/10 blur-[120px]" />

        <div className="relative z-10 mx-auto max-w-6xl px-4">
          {/* Header section */}
          <div className="mx-auto mb-12 max-w-2xl text-center md:mb-16">
            <div className="animate-fade-in mb-4 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
              <BookOpen className="h-3.5 w-3.5" />
              <span>Vielora Journal</span>
            </div>
            <h1 className="mb-4 bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-4xl font-extrabold tracking-tight text-transparent md:text-5xl">
              Kiến thức & Tin tức mới nhất
            </h1>
            <p className="text-base text-muted-foreground md:text-lg">
              Tìm hiểu các xu hướng công nghệ AI, hướng dẫn tích hợp chatbot và các bản tin cập nhật
              tính năng mới nhất từ Vielora.
            </p>
          </div>

          {/* Thanh lọc danh mục (Category Pills) */}
          <div className="mb-10 flex flex-wrap items-center justify-center gap-2 border-b border-border/40 pb-4">
            <Link
              href="/posts"
              className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                activeCategorySlug === ""
                  ? "shadow-glow-sm border-primary bg-primary text-white"
                  : "border-border/50 bg-card/40 text-muted-foreground hover:bg-card/70 hover:text-foreground"
              }`}
            >
              Tất cả
            </Link>
            {categories.map((cat) => {
              const isActive = activeCategorySlug === cat.slug;
              return (
                <Link
                  key={cat.id}
                  href={`/posts?category=${cat.slug}`}
                  className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? "shadow-glow-sm border-primary bg-primary text-white"
                      : "border-border/50 bg-card/40 text-muted-foreground hover:bg-card/70 hover:text-foreground"
                  }`}
                >
                  {cat.name}
                </Link>
              );
            })}
          </div>

          {/* Grid bài viết */}
          {posts.length === 0 ? (
            <div className="glass-md mx-auto max-w-xl rounded-2xl border border-border/40 bg-card/25 p-8 py-20 text-center">
              <Tag className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
              <h3 className="text-lg font-bold text-foreground">Không tìm thấy bài viết</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Chưa có bài viết nào thuộc danh mục này được xuất bản. Vui lòng quay lại sau!
              </p>
              <Link
                href="/posts"
                className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline"
              >
                Quay lại xem tất cả bài viết <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-12 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                {posts.map((post) => (
                  <article
                    key={post.id}
                    className="hover:shadow-glow-sm glass-md group flex flex-col overflow-hidden rounded-2xl border border-border/50 bg-card/30 transition-all duration-300 hover:-translate-y-1 hover:border-border"
                  >
                    {/* Thumbnail Image */}
                    <Link
                      href={`/posts/${post.slug}`}
                      className="relative block aspect-[16/10] overflow-hidden bg-muted"
                    >
                      {post.thumbnail_url ? (
                        <Image
                          src={post.thumbnail_url}
                          alt={post.title}
                          fill
                          sizes="(min-width: 1024px) 352px, (min-width: 768px) 50vw, calc(100vw - 2rem)"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
                          <BookOpen className="h-10 w-10 text-primary/30" />
                        </div>
                      )}
                    </Link>

                    {/* Content Card */}
                    <div className="flex flex-1 flex-col justify-between p-6">
                      <div className="space-y-3">
                        {/* Meta: Ngày đăng & danh mục */}
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(post.published_at).toLocaleDateString("vi-VN", {
                              day: "2-digit",
                              month: "long",
                              year: "numeric",
                            })}
                          </span>
                        </div>

                        {/* Tiêu đề */}
                        <h3 className="line-clamp-2 text-xl font-bold text-foreground transition-colors duration-200 group-hover:text-primary">
                          <Link href={`/posts/${post.slug}`}>{post.title}</Link>
                        </h3>

                        {/* Tóm tắt */}
                        <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                          {post.summary}
                        </p>
                      </div>

                      {/* Phân chân card: Danh mục & Chi tiết */}
                      <div className="mt-6 flex items-center justify-between border-t border-border/40 pt-4">
                        <div className="flex flex-wrap gap-1">
                          {post.categories.slice(0, 2).map((c) => (
                            <Badge
                              key={c.id}
                              variant="secondary"
                              className="border-0 bg-muted/50 text-[10px] text-muted-foreground hover:bg-muted/70"
                            >
                              {c.name}
                            </Badge>
                          ))}
                          {post.categories.length > 2 && (
                            <span className="self-center align-middle text-[10px] text-muted-foreground/60">
                              +{post.categories.length - 2}
                            </span>
                          )}
                        </div>

                        <Link
                          href={`/posts/${post.slug}`}
                          className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                        >
                          Đọc tiếp
                          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {/* Điều khiển phân trang */}
              {totalPages > 1 && (
                <div className="mt-12 flex justify-center">
                  <Pagination className="w-auto">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href={`/posts?page=${Math.max(1, page - 1)}${
                            activeCategorySlug ? `&category=${activeCategorySlug}` : ""
                          }`}
                          aria-disabled={page === 1}
                          className={page === 1 ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>

                      {pageItems.map((item, index) =>
                        item === "ellipsis" ? (
                          <PaginationItem key={`ellipsis-${index}`}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        ) : (
                          <PaginationItem key={item}>
                            <PaginationLink
                              href={`/posts?page=${item}${
                                activeCategorySlug ? `&category=${activeCategorySlug}` : ""
                              }`}
                              isActive={item === page}
                            >
                              {item}
                            </PaginationLink>
                          </PaginationItem>
                        )
                      )}

                      <PaginationItem>
                        <PaginationNext
                          href={`/posts?page=${Math.min(totalPages, page + 1)}${
                            activeCategorySlug ? `&category=${activeCategorySlug}` : ""
                          }`}
                          aria-disabled={page === totalPages}
                          className={page === totalPages ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <CTASection />
      <Footer />
      <ScrollToTop />
    </div>
  );
}
