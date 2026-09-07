import type { ServiceClient } from "@/lib/services/types";

export interface PostCategory {
  id: string;
  name: string;
  slug: string;
}

export interface PostItem {
  id: string;
  title: string;
  slug: string;
  summary: string;
  thumbnail_url: string | null;
  published_at: string;
  categories: PostCategory[];
}

export interface PostDetail extends PostItem {
  content: string;
}

export interface RelatedPost {
  id: string;
  title: string;
  slug: string;
  summary: string;
  thumbnail_url: string | null;
  published_at: string;
}

export interface GetPaginatedPostsParams {
  page?: number;
  pageSize?: number;
  categorySlug?: string;
}

export interface PaginatedPostsResult {
  posts: PostItem[];
  totalPosts: number;
  totalPages: number;
  page: number;
}

export const DEFAULT_PAGE_SIZE = 6;

interface DBPostCategoryRelation {
  categories: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

interface RawPostRow {
  id: string;
  title: string;
  slug: string;
  summary: string;
  thumbnail_url: string | null;
  published_at: string;
  post_categories?: DBPostCategoryRelation[] | null;
}

interface RawPostDetailRow extends RawPostRow {
  content: string;
}

function extractCategories(postCategories?: DBPostCategoryRelation[] | null): PostCategory[] {
  if (!postCategories || !Array.isArray(postCategories)) {
    return [];
  }
  return postCategories
    .filter((item): item is { categories: PostCategory } => Boolean(item.categories))
    .map((item) => ({
      id: item.categories.id,
      name: item.categories.name,
      slug: item.categories.slug,
    }));
}

export async function getAllCategories(supabase: ServiceClient): Promise<PostCategory[]> {
  const { data } = await supabase
    .from("categories")
    .select("id, name, slug")
    .order("name", { ascending: true });

  return (data || []) as PostCategory[];
}

export async function getPaginatedPosts(
  supabase: ServiceClient,
  params: GetPaginatedPostsParams = {}
): Promise<PaginatedPostsResult> {
  const page = Math.max(1, params.page || 1);
  const pageSize = params.pageSize || DEFAULT_PAGE_SIZE;
  const categorySlug = params.categorySlug?.trim();

  let postIds: string[] | null = null;

  if (categorySlug) {
    const { data: catRelations } = await supabase
      .from("post_categories")
      .select("post_id, categories!inner(slug)")
      .eq("categories.slug", categorySlug);

    const catRelData = (catRelations || []) as unknown as Array<{ post_id: string }>;
    postIds = catRelData.map((r) => r.post_id);

    if (postIds.length === 0) {
      return {
        posts: [],
        totalPosts: 0,
        totalPages: 0,
        page,
      };
    }
  }

  let countQuery = supabase
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("status", "published");

  if (postIds !== null) {
    countQuery = countQuery.in("id", postIds);
  }

  const { count: totalPostsCount } = await countQuery;
  const totalPosts = totalPostsCount || 0;
  const totalPages = Math.ceil(totalPosts / pageSize);

  const from = (page - 1) * pageSize;
  const to = page * pageSize - 1;

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
    `
    )
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .range(from, to);

  if (postIds !== null) {
    postsQuery = postsQuery.in("id", postIds);
  }

  const { data: rawPosts } = await postsQuery;
  const rawList = (rawPosts || []) as unknown as RawPostRow[];

  const posts: PostItem[] = rawList.map((post) => ({
    id: post.id,
    title: post.title,
    slug: post.slug,
    summary: post.summary,
    thumbnail_url: post.thumbnail_url,
    published_at: post.published_at,
    categories: extractCategories(post.post_categories),
  }));

  return {
    posts,
    totalPosts,
    totalPages,
    page,
  };
}

export async function getPostBySlug(
  supabase: ServiceClient,
  slug: string
): Promise<PostDetail | null> {
  const { data: rawPost, error } = await supabase
    .from("posts")
    .select(
      `
      id,
      title,
      slug,
      summary,
      thumbnail_url,
      content,
      published_at,
      post_categories (
        categories (
          id,
          name,
          slug
        )
      )
    `
    )
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (error || !rawPost) {
    return null;
  }

  const rawData = rawPost as unknown as RawPostDetailRow;

  return {
    id: rawData.id,
    title: rawData.title,
    slug: rawData.slug,
    summary: rawData.summary,
    thumbnail_url: rawData.thumbnail_url,
    content: rawData.content,
    published_at: rawData.published_at,
    categories: extractCategories(rawData.post_categories),
  };
}

export async function getRelatedPosts(
  supabase: ServiceClient,
  options: {
    currentPostId: string;
    categoryIds: string[];
    limit?: number;
  }
): Promise<RelatedPost[]> {
  const { currentPostId, categoryIds, limit = 3 } = options;

  if (!categoryIds || categoryIds.length === 0) {
    return [];
  }

  const { data: relRelations } = await supabase
    .from("post_categories")
    .select("post_id")
    .in("category_id", categoryIds)
    .neq("post_id", currentPostId)
    .limit(10);

  const relData = (relRelations || []) as unknown as Array<{ post_id: string }>;
  const relIds = Array.from(new Set(relData.map((r) => r.post_id)));

  if (relIds.length === 0) {
    return [];
  }

  const { data: relPosts } = await supabase
    .from("posts")
    .select("id, title, slug, summary, thumbnail_url, published_at")
    .in("id", relIds)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);

  return (relPosts || []) as unknown as RelatedPost[];
}
