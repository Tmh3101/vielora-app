import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  DEFAULT_CACHE_CONTROL,
  BOT_AVATAR_BUCKET_NAME,
  WIDGET_BACKGROUND_BUCKET_NAME,
  WIDGET_ICON_BUCKET_NAME,
  MAX_FILE_SIZE,
  ALLOWED_TYPES,
  KNOWLEDGE_FILES_BUCKET_NAME,
  ALLOWED_KNOWLEDGE_FILE_EXTENSIONS,
  ALLOWED_KNOWLEDGE_FILE_TYPES,
  MAX_KNOWLEDGE_FILE_SIZE,
  KNOWLEDGE_FILES_PAGE_SIZE,
  BOT_AVATAR_FILE_PREFIX,
  WIDGET_BACKGROUND_FILE_PREFIX,
  WIDGET_ICON_FILE_PREFIX,
} from "@/config";
import { WIDGET_LIMITS } from "@/config/widget";
import type { ServiceClient } from "@/lib/services/types";

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

async function uploadFile(
  file: File,
  botId: string,
  bucket: string,
  filePrefix: string,
  maxSize: number
): Promise<UploadResult> {
  const supabase = createBrowserSupabaseClient();

  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      success: false,
      error: "File format is not supported. Allowed formats: JPEG, PNG, GIF, WEBP.",
    };
  }

  if (file.size > maxSize) {
    const sizeInMB = Math.round(maxSize / (1024 * 1024));
    return {
      success: false,
      error: `File is too large. Maximum file size is ${sizeInMB}MB.`,
    };
  }

  try {
    const fileExt = file.name.split(".").pop()?.toLowerCase() || "png";
    const fileName = `${botId}/${filePrefix}-${Date.now()}.${fileExt}`;

    const performUpload = async () => {
      const { data: existingFiles } = await supabase.storage.from(bucket).list(botId);

      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles.map((f) => `${botId}/${f.name}`);
        await supabase.storage.from(bucket).remove(filesToDelete);
      }

      return await supabase.storage.from(bucket).upload(fileName, file, {
        cacheControl: DEFAULT_CACHE_CONTROL,
        upsert: true,
      });
    };

    let { data, error } = await performUpload();

    // Handle bucket not found - create it and retry
    if (
      error &&
      (error.message.includes("Bucket not found") || error.message.includes("does not exist"))
    ) {
      console.log("Bucket not found, creating...");

      const { error: createError } = await supabase.storage.createBucket(bucket, {
        public: true,
        allowedMimeTypes: ALLOWED_TYPES,
        fileSizeLimit: maxSize,
      });

      if (createError && !createError.message.includes("already exists")) {
        console.error("Create bucket error:", createError);
        return {
          success: false,
          error: "Failed to create storage bucket. Please contact admin.",
        };
      }

      // Retry upload after creating bucket
      const retryResult = await performUpload();
      data = retryResult.data;
      error = retryResult.error;
    }

    if (error) {
      console.error("Upload error:", error);
      return {
        success: false,
        error: "Failed to upload file. Please try again.",
      };
    }

    if (!data) {
      return {
        success: false,
        error: "Upload failed. No data returned.",
      };
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(data.path);

    return {
      success: true,
      url: publicUrl,
    };
  } catch (error) {
    console.error("Upload error:", error);
    return {
      success: false,
      error: "An error occurred while uploading. Please try again.",
    };
  }
}

async function deleteFiles(botId: string, bucket: string): Promise<boolean> {
  const supabase = createBrowserSupabaseClient();
  try {
    const { data: existingFiles } = await supabase.storage.from(bucket).list(botId);

    if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles.map((f) => `${botId}/${f.name}`);
      await supabase.storage.from(bucket).remove(filesToDelete);
    }

    return true;
  } catch (error) {
    console.error("Delete files error:", error);
    return false;
  }
}

export async function uploadBotAvatar(file: File, botId: string): Promise<UploadResult> {
  const supabase = createBrowserSupabaseClient();
  const dbClient: ServiceClient = supabase;

  const result = await uploadFile(
    file,
    botId,
    BOT_AVATAR_BUCKET_NAME,
    BOT_AVATAR_FILE_PREFIX,
    MAX_FILE_SIZE
  );

  if (result.success && result.url) {
    await dbClient.from("bots").update({ avatar_url: result.url }).eq("id", botId);
  }

  return result;
}

export async function deleteBotAvatar(botId: string): Promise<boolean> {
  const supabase = createBrowserSupabaseClient();
  const dbClient: ServiceClient = supabase;
  try {
    const success = await deleteFiles(botId, BOT_AVATAR_BUCKET_NAME);
    if (success) {
      await dbClient.from("bots").update({ avatar_url: null }).eq("id", botId);
    }
    return success;
  } catch (error) {
    console.error("Delete avatar error:", error);
    return false;
  }
}

export function getFilePreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

export function revokeFilePreviewUrl(url: string): void {
  URL.revokeObjectURL(url);
}

export async function uploadWidgetBackground(file: File, botId: string): Promise<UploadResult> {
  return uploadFile(
    file,
    botId,
    WIDGET_BACKGROUND_BUCKET_NAME,
    WIDGET_BACKGROUND_FILE_PREFIX,
    MAX_FILE_SIZE
  );
}

export async function uploadWidgetIcon(file: File, botId: string): Promise<UploadResult> {
  return uploadFile(
    file,
    botId,
    WIDGET_ICON_BUCKET_NAME,
    WIDGET_ICON_FILE_PREFIX,
    WIDGET_LIMITS.CHAT_ICON_MAX_FILE_SIZE
  );
}

export async function deleteWidgetBackground(botId: string): Promise<boolean> {
  return deleteFiles(botId, WIDGET_BACKGROUND_BUCKET_NAME);
}

export async function deleteWidgetIcon(botId: string): Promise<boolean> {
  return deleteFiles(botId, WIDGET_ICON_BUCKET_NAME);
}

export async function uploadKnowledgeFile(
  client: ServiceClient,
  file: File,
  botId: string
): Promise<UploadResult> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  const extWithDot = extension ? `.${extension}` : "";

  if (
    !ALLOWED_KNOWLEDGE_FILE_EXTENSIONS.includes(extWithDot) ||
    !ALLOWED_KNOWLEDGE_FILE_TYPES.includes(file.type || "application/octet-stream")
  ) {
    return {
      success: false,
      error: "Unsupported file type. Allowed: PDF, DOCX, TXT, CSV, MD.",
    };
  }

  if (file.size > MAX_KNOWLEDGE_FILE_SIZE) {
    return {
      success: false,
      error: "File is too large. Maximum file size is 10MB.",
    };
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = `${botId}/${crypto.randomUUID()}-${safeName}`;

  const { data, error } = await client.storage
    .from(KNOWLEDGE_FILES_BUCKET_NAME)
    .upload(filePath, file, {
      upsert: false,
      cacheControl: DEFAULT_CACHE_CONTROL,
      contentType: file.type || undefined,
    });

  if (error || !data) {
    return {
      success: false,
      error: error?.message || "Failed to upload knowledge file.",
    };
  }

  return { success: true, url: data.path };
}

export async function deleteKnowledgeFile(
  client: ServiceClient,
  filePath: string
): Promise<UploadResult> {
  const normalizedPath = filePath.trim();
  if (!normalizedPath) {
    return {
      success: false,
      error: "Knowledge file path is required.",
    };
  }

  const { error } = await client.storage.from(KNOWLEDGE_FILES_BUCKET_NAME).remove([normalizedPath]);
  if (error) {
    return {
      success: false,
      error: error.message || "Failed to delete knowledge file.",
    };
  }

  return { success: true };
}

export async function deleteKnowledgeFilesByBotId(
  client: ServiceClient,
  botId: string
): Promise<UploadResult> {
  const normalizedBotId = botId.trim();
  if (!normalizedBotId) {
    return {
      success: false,
      error: "Bot ID is required.",
    };
  }

  const bucket = client.storage.from(KNOWLEDGE_FILES_BUCKET_NAME);
  const filesToDelete: string[] = [];
  let offset = 0;
  let hasMoreFiles = true;

  while (hasMoreFiles) {
    const { data, error } = await bucket.list(normalizedBotId, {
      limit: KNOWLEDGE_FILES_PAGE_SIZE,
      offset,
    });

    if (error) {
      return {
        success: false,
        error: error.message || "Failed to list knowledge files.",
      };
    }

    if (!data || data.length === 0) {
      hasMoreFiles = false;
      continue;
    }

    filesToDelete.push(...data.map((file) => `${normalizedBotId}/${file.name}`));
    hasMoreFiles = data.length === KNOWLEDGE_FILES_PAGE_SIZE;
    offset += KNOWLEDGE_FILES_PAGE_SIZE;
  }

  for (let index = 0; index < filesToDelete.length; index += KNOWLEDGE_FILES_PAGE_SIZE) {
    const batch = filesToDelete.slice(index, index + KNOWLEDGE_FILES_PAGE_SIZE);
    const { error } = await bucket.remove(batch);

    if (error) {
      return {
        success: false,
        error: error.message || "Failed to delete knowledge files.",
      };
    }
  }

  return { success: true };
}
