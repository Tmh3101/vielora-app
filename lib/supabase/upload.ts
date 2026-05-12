import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  BOT_AVATAR_BUCKET_NAME,
  WIDGET_BACKGROUND_BUCKET_NAME,
  WIDGET_ICON_BUCKET_NAME,
  MAX_FILE_SIZE,
  ALLOWED_TYPES,
} from "@/config";
import { WIDGET_LIMITS } from "@/config/widget";
import type { ServiceClient } from "@/lib/services/types";
import {
  ALLOWED_KNOWLEDGE_FILE_EXTENSIONS,
  ALLOWED_KNOWLEDGE_FILE_TYPES,
  MAX_KNOWLEDGE_FILE_SIZE,
} from "@/config/knowledge";

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Generic file upload function to Supabase Storage
 * Handles validation, old file cleanup, bucket creation, and URL retrieval
 * @param file - The file to upload
 * @param botId - The bot ID (used for file naming)
 * @param bucket - The bucket name
 * @param filePrefix - Prefix for the file name (e.g., 'avatar', 'background')
 * @param maxSize - Maximum file size in bytes
 * @returns Upload result with URL or error
 */
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

    // Helper function to perform the actual upload
    const performUpload = async () => {
      // Delete old files first
      const { data: existingFiles } = await supabase.storage.from(bucket).list(botId);

      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles.map((f) => `${botId}/${f.name}`);
        await supabase.storage.from(bucket).remove(filesToDelete);
      }

      return await supabase.storage.from(bucket).upload(fileName, file, {
        cacheControl: "3600",
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

  const result = await uploadFile(file, botId, BOT_AVATAR_BUCKET_NAME, "avatar", MAX_FILE_SIZE);

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
  return uploadFile(file, botId, WIDGET_BACKGROUND_BUCKET_NAME, "background", MAX_FILE_SIZE);
}

export async function uploadWidgetIcon(file: File, botId: string): Promise<UploadResult> {
  return uploadFile(
    file,
    botId,
    WIDGET_ICON_BUCKET_NAME,
    "icon",
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

  const { data, error } = await client.storage.from("knowledge_files").upload(filePath, file, {
    upsert: false,
    cacheControl: "3600",
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

  const { error } = await client.storage.from("knowledge_files").remove([normalizedPath]);
  if (error) {
    return {
      success: false,
      error: error.message || "Failed to delete knowledge file.",
    };
  }

  return { success: true };
}
