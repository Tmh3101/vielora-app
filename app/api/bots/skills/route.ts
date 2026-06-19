import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/constants";
import { authenticateRequest, isAuthError } from "@/lib/helpers/auth-helpers";
import { getActiveSkills } from "@/lib/services/ai-skill.service";

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

export async function GET(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (isAuthError(authResult)) return authResult;
    const { supabase } = authResult;

    const data = await getActiveSkills(supabase);

    return NextResponse.json({ success: true, data }, { headers: corsHeaders });
  } catch (error) {
    console.error("Error fetching skills:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch skills" },
      { status: 500, headers: corsHeaders }
    );
  }
}
