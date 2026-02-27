import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// GET /api/perfil → perfil completo do usuário logado
export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(`
      *,
      professional_skills (*),
      professional_certificates (*),
      professional_portfolio (*)
    `)
    .eq("id", user.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile });
}

// PATCH /api/perfil → atualizar perfil
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const {
    display_name, bio, headline, phone_masked,
    location_city, location_state, location_lat, location_lng,
    service_radius_km, hourly_rate_cents, years_experience,
    website_url, linkedin_url, instagram_url,
    skills, // array de skills para upsert
  } = body;

  const service = createServiceClient();

  // Calcular completeness
  let completeness = 10; // base
  if (display_name) completeness += 10;
  if (bio) completeness += 15;
  if (headline) completeness += 10;
  if (location_city) completeness += 10;
  if (hourly_rate_cents) completeness += 10;
  if (years_experience) completeness += 5;
  if (skills?.length > 0) completeness += 15;
  if (phone_masked) completeness += 10;
  if (website_url || linkedin_url) completeness += 5;

  // Gerar slug se não tiver
  const { data: existing } = await service.from("profiles").select("slug,full_name").eq("id", user.id).single();
  let slug = existing?.slug;
  if (!slug) {
    const name = display_name || existing?.full_name || "profissional";
    const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    slug = base;
    // Checar unicidade
    let counter = 0;
    while (true) {
      const { data: taken } = await service.from("profiles").select("id").eq("slug", slug).neq("id", user.id).maybeSingle();
      if (!taken) break;
      counter++;
      slug = `${base}-${counter}`;
    }
  }

  // Atualizar perfil
  const { error: updateErr } = await service
    .from("profiles")
    .update({
      ...(display_name !== undefined && { display_name }),
      ...(bio !== undefined && { bio }),
      ...(headline !== undefined && { headline }),
      ...(phone_masked !== undefined && { phone_masked }),
      ...(location_city !== undefined && { location_city }),
      ...(location_state !== undefined && { location_state }),
      ...(location_lat !== undefined && { location_lat }),
      ...(location_lng !== undefined && { location_lng }),
      ...(service_radius_km !== undefined && { service_radius_km }),
      ...(hourly_rate_cents !== undefined && { hourly_rate_cents }),
      ...(years_experience !== undefined && { years_experience }),
      ...(website_url !== undefined && { website_url }),
      ...(linkedin_url !== undefined && { linkedin_url }),
      ...(instagram_url !== undefined && { instagram_url }),
      slug,
      profile_completeness: completeness,
    })
    .eq("id", user.id);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  // Atualizar skills se fornecidas
  if (Array.isArray(skills)) {
    await service.from("professional_skills").delete().eq("profile_id", user.id);
    if (skills.length > 0) {
      await service.from("professional_skills").insert(
        skills.map((s: { skill_name: string; skill_level: string; years_exp: number }) => ({
          profile_id: user.id,
          skill_name: s.skill_name,
          skill_level: s.skill_level || "intermediate",
          years_exp: s.years_exp || 0,
        }))
      );
    }
  }

  return NextResponse.json({ success: true, slug });
}
