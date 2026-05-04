import type { ServiceClient } from "@/lib/services/types";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/supabase/types";
import { EPageStatus } from "@/types";

export type PageRow = Tables<"pages">;

/**
 * Các trường cơ bản của một trang đã được discover (status = pending).
 * Dùng cho bước chọn index trong onboarding.
 */
export type DiscoveredPage = Pick<PageRow, "id" | "url" | "title">;

/**
 * Trường preview của trang dùng khi hiển thị danh sách trước khi reindex.
 */
export type PagePreview = Pick<
  PageRow,
  "id" | "url" | "title" | "status" | "error_message" | "source_type"
>;

/**
 * Lấy danh sách tất cả pages của một bot, sắp xếp theo crawled_at giảm dần.
 * Có thể lọc theo một hoặc nhiều trạng thái.
 */
export async function getPagesByBotId(
  client: ServiceClient,
  botId: string,
  statuses?: EPageStatus[]
): Promise<PageRow[]> {
  let query = client
    .from("pages")
    .select("*")
    .eq("bot_id", botId)
    .order("crawled_at", { ascending: false });

  if (statuses && statuses.length > 0) {
    query = query.in("status", statuses);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Lấy danh sách các trang đã được discover (status = pending) của một bot.
 * Dùng cho bước chọn index trong onboarding.
 */
export async function getDiscoveredPagesByBotId(
  client: ServiceClient,
  botId: string
): Promise<DiscoveredPage[]> {
  const { data, error } = await client
    .from("pages")
    .select("id, url, title")
    .eq("bot_id", botId)
    .eq("status", EPageStatus.Pending);

  if (error) throw new Error(error.message);
  return (data ?? []) as DiscoveredPage[];
}

/**
 * Lấy danh sách pages với các trường cần thiết để preview (dùng khi reindex).
 * Trả về id, url, title, status, error_message, source_type cho mỗi trang.
 */
export async function getPagePreviewByBotId(
  client: ServiceClient,
  botId: string
): Promise<PagePreview[]> {
  const { data, error } = await client
    .from("pages")
    .select("id, url, title, status, error_message, source_type")
    .eq("bot_id", botId);
  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Đếm số trang đã được index thành công (status = completed) của một bot.
 */
export async function getIndexedPageCount(client: ServiceClient, botId: string): Promise<number> {
  const { count, error } = await client
    .from("pages")
    .select("id", { count: "exact", head: true })
    .eq("bot_id", botId)
    .eq("status", EPageStatus.Completed);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

/**
 * Đếm số trang đã được index thành công cho nhiều bots cùng lúc.
 * Trả về một Record<botId, count>.
 */
export async function getIndexedPageCountsByBotIds(
  client: ServiceClient,
  botIds: string[]
): Promise<Record<string, number>> {
  if (botIds.length === 0) return {};
  const counts = await Promise.all(
    botIds.map((id) => getIndexedPageCount(client, id).then((c) => [id, c] as const))
  );
  return Object.fromEntries(counts);
}

/**
 * Xóa tất cả pages của một bot.
 */
export async function deletePagesByBotId(client: ServiceClient, botId: string): Promise<void> {
  const { error } = await client.from("pages").delete().eq("bot_id", botId);
  if (error) throw new Error(error.message);
}

// ============================================================
// Server-client variants — nhận ServiceClient làm tham số
// Dùng trong API routes với server client
// ============================================================

/**
 * Lấy danh sách pages của bot (server client) — trả về id và status.
 */
export async function getPagesByBotIdServer(
  client: ServiceClient,
  botId: string
): Promise<Pick<PageRow, "id" | "status">[]> {
  const { data, error } = await client.from("pages").select("id, status").eq("bot_id", botId);

  if (error) throw new Error(error.message);
  return (data ?? []) as Pick<PageRow, "id" | "status">[];
}

/**
 * Lấy page theo ID (server client). Trả về null nếu không tìm thấy.
 */
export async function getPageByIdServer(
  client: ServiceClient,
  pageId: string
): Promise<PageRow | null> {
  const { data, error } = await client.from("pages").select("*").eq("id", pageId).maybeSingle();

  if (error) throw new Error(error.message);
  return data as PageRow | null;
}

/**
 * Lấy page theo ID kèm thông tin owner (bọots.user_id) (server client).
 * Trả về null nếu không tìm thấy.
 */
export async function getPageWithOwnerById(
  client: ServiceClient,
  pageId: string
): Promise<(PageRow & { bots: { user_id: string } }) | null> {
  const { data, error } = await client
    .from("pages")
    .select(
      `
      *,
      bots!inner(user_id)
    `
    )
    .eq("id", pageId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  // Supabase returns bots as an array for joins; extract the first element.
  const { bots, ...page } = data as unknown as PageRow & { bots: { user_id: string }[] };
  return { ...page, bots: Array.isArray(bots) ? bots[0] : bots };
}

/**
 * Thêm một page mới (server client).
 */
export async function insertPageServer(
  client: ServiceClient,
  page: TablesInsert<"pages">
): Promise<void> {
  const { error } = await client.from("pages").insert(page);
  if (error) throw new Error(error.message);
}

/**
 * Cập nhật page theo ID (server client).
 */
export async function updatePageServer(
  client: ServiceClient,
  pageId: string,
  updates: TablesUpdate<"pages">
): Promise<void> {
  const { error } = await client.from("pages").update(updates).eq("id", pageId);
  if (error) throw new Error(error.message);
}

/**
 * Cập nhật status của nhiều pages theo IDs (server client).
 * Có thể lọc thêm theo bot_id và status hiện tại.
 */
export async function updatePagesStatusServer(
  client: ServiceClient,
  pageIds: string[],
  status: EPageStatus,
  filter?: { botId?: string; currentStatus?: EPageStatus }
): Promise<void> {
  if (pageIds.length === 0) return;

  let query = client.from("pages").update({ status }).in("id", pageIds);

  if (filter?.botId) query = query.eq("bot_id", filter.botId);
  if (filter?.currentStatus) query = query.eq("status", filter.currentStatus);

  const { error } = await query;
  if (error) throw new Error(error.message);
}

/**
 * Xóa page theo ID (server client).
 */
export async function deletePageByIdServer(client: ServiceClient, pageId: string): Promise<void> {
  const { error } = await client.from("pages").delete().eq("id", pageId);
  if (error) throw new Error(error.message);
}

/**
 * Xóa tất cả document chunks liên quan đến URL của page (server client).
 */
export async function deleteDocumentsByPageUrl(
  client: ServiceClient,
  botId: string,
  url: string
): Promise<void> {
  const { error } = await client
    .from("documents")
    .delete()
    .eq("bot_id", botId)
    .eq("metadata->>url", url);
  if (error) throw new Error(error.message);
}

/**
 * Tìm page theo bot_id và url (server client). Trả về null nếu không tìm thấy.
 * Dùng trong worker để kiểm tra trước khi insert/update.
 */
export async function getPageByBotIdAndUrlServer(
  client: ServiceClient,
  botId: string,
  url: string
): Promise<PageRow | null> {
  const { data, error } = await client
    .from("pages")
    .select("*")
    .eq("bot_id", botId)
    .eq("url", url)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as PageRow | null;
}

/**
 * Đếm số pages của bot theo một hoặc nhiều trạng thái (server client).
 */
export async function countPagesByBotIdAndStatusesServer(
  client: ServiceClient,
  botId: string,
  statuses: EPageStatus | EPageStatus[]
): Promise<number> {
  const statusArray = Array.isArray(statuses) ? statuses : [statuses];
  const { count, error } = await client
    .from("pages")
    .select("id", { count: "exact", head: true })
    .eq("bot_id", botId)
    .in("status", statusArray);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/**
 * Đếm số document chunks liên quan đến một URL của bot (server client).
 * Dùng để kiểm tra xem trang đã được embed trước khi re-index.
 */
export async function countDocumentsByBotIdAndUrlServer(
  client: ServiceClient,
  botId: string,
  url: string
): Promise<number> {
  const { count, error } = await client
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("bot_id", botId)
    .contains("metadata", { url });
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/**
 * Chèn nhiều document chunks vào bảng documents (server client).
 */
export async function insertDocumentsServer(
  client: ServiceClient,
  docs: TablesInsert<"documents">[]
): Promise<void> {
  if (docs.length === 0) return;
  const { error } = await client.from("documents").insert(docs);
  if (error) throw new Error(error.message);
}

/**
 * Lấy các trang fallback để trả về khi RAG không tìm được kết quả (server client).
 */
export async function getFallbackPagesServer(
  client: ServiceClient,
  botId: string,
  limit: number
): Promise<Pick<PageRow, "title" | "content" | "url">[]> {
  const { data, error } = await client
    .from("pages")
    .select("title, content, url")
    .eq("bot_id", botId)
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as Pick<PageRow, "title" | "content" | "url">[];
}
