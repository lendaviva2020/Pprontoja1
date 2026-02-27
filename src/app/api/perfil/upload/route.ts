import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const type = formData.get("type") as string; // "avatar" | "certificate" | "portfolio"
  const title = formData.get("title") as string;
  const issuer = formData.get("issuer") as string;
  const issuedYear = formData.get("issued_year") as string;
  const portfolioTitle = formData.get("portfolio_title") as string;
  const portfolioDesc = formData.get("portfolio_description") as string;
  const category = formData.get("category") as string;

  if (!file || !type) return NextResponse.json({ error: "Arquivo e tipo são obrigatórios" }, { status: 400 });

  const service = createServiceClient();
  const ext = file.name.split(".").pop();
  const fileName = `${user.id}/${Date.now()}.${ext}`;

  let bucket = "avatars";
  if (type === "certificate") bucket = "certificates";
  if (type === "portfolio") bucket = "portfolio";

  const { error: uploadErr, data: uploadData } = await service.storage
    .from(bucket)
    .upload(fileName, file, { upsert: true });

  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 });

  const { data: { publicUrl } } = service.storage.from(bucket).getPublicUrl(fileName);

  // Atualizar banco conforme tipo
  if (type === "avatar") {
    await service.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);
    return NextResponse.json({ url: publicUrl });
  }

  if (type === "certificate") {
    const { data: cert, error: certErr } = await service
      .from("professional_certificates")
      .insert({
        profile_id: user.id,
        title: title || file.name,
        issuer: issuer || "Não informado",
        issued_year: issuedYear ? parseInt(issuedYear) : null,
        file_url: publicUrl,
      })
      .select()
      .single();

    if (certErr) return NextResponse.json({ error: certErr.message }, { status: 500 });
    return NextResponse.json({ url: publicUrl, certificate: cert });
  }

  if (type === "portfolio") {
    const { data: item, error: portErr } = await service
      .from("professional_portfolio")
      .insert({
        profile_id: user.id,
        title: portfolioTitle || "Projeto",
        description: portfolioDesc,
        image_url: publicUrl,
        service_category: category,
      })
      .select()
      .single();

    if (portErr) return NextResponse.json({ error: portErr.message }, { status: 500 });
    return NextResponse.json({ url: publicUrl, portfolio_item: item });
  }

  return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
}
