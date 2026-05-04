import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ServiceClient = SupabaseClient<Database, any, any, any, any>;
