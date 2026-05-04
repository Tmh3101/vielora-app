import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Server not configured" }, { status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Fetch all users
    // TODO: For better performance, consider implementing a server-side function in Supabase to check email existence directly in the database instead of fetching all users and filtering in memory.
    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) {
      return NextResponse.json({ error: error.message || "Unknown" }, { status: 500 });
    }

    // Explicitly type users as an array of objects with at least an email property
    const users: { email?: string | null }[] = data?.users ?? [];

    // Check if any user has the provided email
    const user = users.find((u) => u.email === email);

    console.log("Checked email existence:", { email, user, exists: !!user });
    const exists = !!user;

    return NextResponse.json({ exists });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
