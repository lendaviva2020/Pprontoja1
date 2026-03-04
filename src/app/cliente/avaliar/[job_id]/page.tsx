import { use } from "react";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect, notFound } from "next/navigation";
import ReviewForm from "@/components/reviews/ReviewForm";
import Link from "next/link";
import { ArrowLeft, CheckCircle } from "lucide-react";

export default async function AvaliarPage({ params }: { params: Promise<{ job_id: string }> }) {
  const { job_id } = use(params);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const service = createServiceClient();
  const { data: job } = await service
    .from("jobs")
    .select(`
      *,
      professional:profiles!professional_id (id, display_name, full_name, avatar_url)
    `)
    .eq("id", job_id)
    .eq("client_id", user.id)
    .single();

  if (!job) notFound();
  if (job.status !== "completed") redirect(`/cliente/jobs/${job_id}`);

  // Verificar se já avaliou
  const { data: existing } = await service
    .from("reviews")
    .select("id")
    .eq("job_id", job_id)
    .eq("reviewer_id", user.id)
    .maybeSingle();

  const profName = job.professional?.display_name || job.professional?.full_name || "Profissional";

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="mx-auto max-w-lg">
        <Link href={`/cliente/jobs/${job_id}`} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Voltar ao job
        </Link>

        {existing ? (
          <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100 text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Avaliação já enviada!</h2>
            <p className="text-gray-500 mb-6">Você já avaliou este serviço. Obrigado pelo seu feedback!</p>
            <Link href="/cliente/jobs" className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700 transition-colors">
              Ver meus jobs
            </Link>
          </div>
        ) : (
          <ReviewForm
            jobId={job_id}
            professionalName={profName}
          />
        )}
      </div>
    </div>
  );
}
