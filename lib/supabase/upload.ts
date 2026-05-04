import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { BUCKET_NAME, MAX_FILE_SIZE, ALLOWED_TYPES } from "@/config";
import type { ServiceClient } from "@/lib/services/types";

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Upload a bot avatar image to Supabase Storage
 * @param file - The file to upload
 * @param botId - The bot ID (used for file naming)
 * @returns Upload result with URL or error
 */
export async function uploadBotAvatar(file: File, botId: string): Promise<UploadResult> {
  const supabase = createBrowserSupabaseClient();
  const dbClient: ServiceClient = supabase;
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      success: false,
      error: "File format is not supported. Allowed formats: JPEG, PNG, GIF, WEBP.",
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      success: false,
      error: "File is too large. Maximum file size is 2MB.",
    };
  }

  try {
    const fileExt = file.name.split(".").pop()?.toLowerCase() || "png";
    const fileName = `${botId}/avatar-${Date.now()}.${fileExt}`;

    // Helper function to perform the actual upload
    const performUpload = async () => {
      const { data: existingFiles } = await supabase.storage.from(BUCKET_NAME).list(botId);

      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles.map((f) => `${botId}/${f.name}`);
        await supabase.storage.from(BUCKET_NAME).remove(filesToDelete);
      }

      return await supabase.storage.from(BUCKET_NAME).upload(fileName, file, {
        cacheControl: "3600",
        upsert: true,
      });
    };

    let { data, error } = await performUpload();
    if (
      error &&
      (error.message.includes("Bucket not found") || error.message.includes("does not exist"))
    ) {
      console.log("Bucket not found, creating...");

      const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        allowedMimeTypes: ALLOWED_TYPES,
        fileSizeLimit: MAX_FILE_SIZE,
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
    } = supabase.storage.from(BUCKET_NAME).getPublicUrl(data.path);

    await dbClient.from("bots").update({ avatar_url: publicUrl }).eq("id", botId);

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

/**
 * Delete a bot avatar from Supabase Storage
 * @param botId - The bot ID
 */
export async function deleteBotAvatar(botId: string): Promise<boolean> {
  const supabase = createBrowserSupabaseClient();
  const dbClient: ServiceClient = supabase;
  try {
    const { data: existingFiles } = await supabase.storage.from(BUCKET_NAME).list(botId);

    if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles.map((f) => `${botId}/${f.name}`);
      await supabase.storage.from(BUCKET_NAME).remove(filesToDelete);
    }

    await dbClient.from("bots").update({ avatar_url: null }).eq("id", botId);

    return true;
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
