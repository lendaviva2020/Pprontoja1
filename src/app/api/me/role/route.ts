import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

/**
 * Retorna o role do usuário logado (client | professional).
 * Usa service_role para não depender de RLS em user_roles.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ role: null }, { status: 401 });
    }

    const service = createServiceClient();
    const { data } = await service
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    return NextResponse.json({ role: data?.role ?? null });
  } catch {
    return NextResponse.json({ role: null }, { status: 500 });
  }
}
