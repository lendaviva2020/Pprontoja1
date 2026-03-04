import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

/**
 * Apaga a conta do usuário logado e todos os dados relacionados.
 * Usa service_role para limpar tabelas que referenciam auth.users e depois remove o user.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const service = createServiceClient();
    const userId = user.id;

    // 1) Mensagens onde o usuário é o remetente
    await service.from("messages").delete().eq("sender_id", userId);

    // 2) Notificações e indicadores de digitação
    await service.from("notifications").delete().eq("user_id", userId);
    await service.from("typing_indicators").delete().eq("user_id", userId);

    // 3) Avaliações onde o usuário é revisor ou avaliado
    await service.from("reviews").delete().eq("reviewer_id", userId);
    await service.from("reviews").delete().eq("reviewee_id", userId);

    // 4) Jobs do cliente ou do profissional
    const { data: userJobs } = await service
      .from("jobs")
      .select("id")
      .or(`client_id.eq.${userId},professional_id.eq.${userId}`);
    const jobIds = userJobs?.map((j) => j.id) ?? [];

    if (jobIds.length > 0) {
      // Propostas desses jobs
      await service.from("proposals").delete().in("job_id", jobIds);
      // Pagamentos desses jobs
      await service.from("payments").delete().in("job_id", jobIds);
      // Disputas desses jobs (e onde opened_by = user)
      await service.from("disputes").delete().in("job_id", jobIds);
      await service.from("disputes").delete().eq("opened_by", userId);
      // Mensagens desses jobs (pode ter sobrado por job_id)
      await service.from("messages").delete().in("job_id", jobIds);
      // Jobs
      await service.from("jobs").delete().or(`client_id.eq.${userId},professional_id.eq.${userId}`);
    }

    // Pagamentos onde o usuário é payer ou payee; limpar released_by se for o usuário
    await service.from("payments").delete().eq("payer_id", userId);
    await service.from("payments").delete().eq("payee_id", userId);
    await service.from("payments").update({ released_by: null }).eq("released_by", userId);

    // 5) Perfil profissional (skills, certificados, portfólio)
    await service.from("professional_skills").delete().eq("profile_id", userId);
    await service.from("professional_certificates").delete().eq("profile_id", userId);
    await service.from("professional_portfolio").delete().eq("profile_id", userId);

    // 6) Role, OAuth e auditoria
    await service.from("user_roles").delete().eq("user_id", userId);
    await service.from("oauth_states").delete().eq("user_id", userId);
    await service.from("audit_logs").delete().eq("actor_id", userId);

    // 7) Profile (trigger do Supabase pode criar de novo no próximo login; o importante é limpar para o delete do auth)
    await service.from("profiles").delete().eq("id", userId);

    // 8) Remover usuário do Auth (requer service_role)
    const { error: authError } = await service.auth.admin.deleteUser(userId);
    if (authError) {
      console.error("[account/delete] auth.admin.deleteUser:", authError);
      return NextResponse.json(
        { error: "Não foi possível remover a conta. Tente pelo painel do Supabase (Authentication > Users)." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[account/delete]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao excluir conta" },
      { status: 500 }
    );
  }
}
