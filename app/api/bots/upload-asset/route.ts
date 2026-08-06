import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/constants";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canUserAccessBot, getBotByIdServer } from "@/lib/services/bot.service";

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401, headers: corsHeaders }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const botId = formData.get("botId") as string | null;
    const bucket = (formData.get("bucket") as string | null) || "bot_avatars";
    const filePrefix = (formData.get("filePrefix") as string | null) || "avatar";

    if (!file || !botId) {
      return NextResponse.json(
        { success: false, error: "file and botId are required" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check workspace access
    const bot = await getBotByIdServer(supabase, botId);
    if (!bot) {
      return NextResponse.json(
        { success: false, error: "Bot not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    const hasAccess = await canUserAccessBot(supabase, bot, user.id);
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403, headers: corsHeaders }
      );
    }

    const admin = createAdminClient();

    // Remove existing files in bucket for this bot
    const { data: existingFiles } = await admin.storage.from(bucket).list(botId);
    if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles.map((f) => `${botId}/${f.name}`);
      await admin.storage.from(bucket).remove(filesToDelete);
    }

    const fileExt = file.name.split(".").pop()?.toLowerCase() || "png";
    const fileName = `${botId}/${filePrefix}-${Date.now()}.${fileExt}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data: uploadData, error: uploadError } = await admin.storage
      .from(bucket)
      .upload(fileName, buffer, {
        contentType: file.type || "image/png",
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.error("[upload-asset] Admin storage upload error:", uploadError);
      return NextResponse.json(
        { success: false, error: uploadError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    const {
      data: { publicUrl },
    } = admin.storage.from(bucket).getPublicUrl(uploadData.path);

    return NextResponse.json(
      { success: true, url: publicUrl, path: uploadData.path },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("[upload-asset] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
