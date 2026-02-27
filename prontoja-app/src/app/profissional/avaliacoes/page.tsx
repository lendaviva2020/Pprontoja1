import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import { Star, MessageSquare, TrendingUp } from "lucide-react";
import ProfessionalReviewResponse from "@/components/reviews/ProfessionalReviewResponse";

export default async function AvaliacoesProfissionalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const service = createServiceClient();

  const { data: reviews } = await service
    .from("reviews")
    .select(`
      *,
      reviewer:profiles!reviewer_id (id, display_name, full_name, avatar_url),
      job:jobs!job_id (id, title)
    `)
    .eq("reviewee_id", user.id)
    .eq("is_visible", true)
    .order("created_at", { ascending: false });

  const { data: profile } = await service
    .from("profiles")
    .select("rating_avg, rating_count")
    .eq("id", user.id)
    .single();

  const avgRating = profile?.rating_avg ? Number(profile.rating_avg) : 0;
  const totalReviews = profile?.rating_count || 0;

  // Calcular distribuição de notas
  const dist = [5,4,3,2,1].map(r => ({
    rating: r,
    count: reviews?.filter((rv: { rating: number }) => rv.rating === r).length || 0,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Minhas avaliações</h1>
        <p className="text-gray-500 mt-1">Veja o que seus clientes estão dizendo</p>
      </div>

      {/* Resumo */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="text-5xl font-bold text-gray-900">{avgRating.toFixed(1)}</div>
            <div>
              <div className="flex gap-0.5 mb-1">
                {[1,2,3,4,5].map(i => (
                  <Star key={i} className={`h-5 w-5 ${i <= Math.round(avgRating) ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} />
                ))}
              </div>
              <p className="text-sm text-gray-500">{totalReviews} avaliações</p>
            </div>
          </div>

          {/* Distribuição */}
          <div className="mt-4 space-y-2">
            {dist.map(({ rating, count }) => (
              <div key={rating} className="flex items-center gap-2 text-sm">
                <span className="w-4 text-gray-500 text-right">{rating}</span>
                <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 rounded-full transition-all"
                    style={{ width: totalReviews ? `${(count / totalReviews) * 100}%` : "0%" }}
                  />
                </div>
                <span className="w-6 text-gray-400 text-xs">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-3 content-start">
          <div className="rounded-xl bg-green-50 p-4 border border-green-100">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm font-semibold text-green-700">Contratariam novamente</span>
            </div>
            <p className="text-2xl font-bold text-green-700">
              {reviews?.length ? Math.round((reviews.filter(r => r.would_hire_again).length / reviews.length) * 100) : 0}%
            </p>
          </div>
          <div className="rounded-xl bg-blue-50 p-4 border border-blue-100">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-semibold text-blue-700">Com comentários</span>
            </div>
            <p className="text-2xl font-bold text-blue-700">
              {reviews?.filter(r => r.comment).length || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Lista de avaliações */}
      <div className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
        {!reviews?.length ? (
          <div className="p-12 text-center">
            <Star className="mx-auto h-10 w-10 text-gray-200 mb-3" />
            <p className="font-medium text-gray-500">Nenhuma avaliação ainda</p>
            <p className="text-sm text-gray-400 mt-1">Complete jobs para começar a receber avaliações</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {reviews.map((review) => {
              const rName = review.reviewer?.display_name || review.reviewer?.full_name || "Cliente";
              return (
                <div key={review.id} className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-bold text-gray-600">
                      {review.reviewer?.avatar_url
                        ? <img src={review.reviewer.avatar_url} alt={rName} className="h-10 w-10 rounded-full object-cover" />
                        : rName[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <span className="font-medium text-gray-900">{rName}</span>
                          <span className="text-xs text-gray-400 ml-2">{new Date(review.created_at).toLocaleDateString("pt-BR")}</span>
                        </div>
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map(i => (
                            <Star key={i} className={`h-4 w-4 ${i <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} />
                          ))}
                        </div>
                      </div>

                      {review.job && (
                        <p className="text-xs text-brand-600 mt-0.5">📋 {review.job.title}</p>
                      )}

                      {review.would_hire_again && (
                        <span className="mt-1 inline-block text-xs text-green-600 font-medium">✓ Contrataria novamente</span>
                      )}

                      {review.comment && (
                        <p className="mt-2 text-sm text-gray-600 leading-relaxed">{review.comment}</p>
                      )}

                      {/* Detalhes de rating */}
                      {(review.punctuality_rating || review.quality_rating || review.communication_rating) && (
                        <div className="mt-3 flex flex-wrap gap-3">
                          {review.punctuality_rating && (
                            <span className="text-xs text-gray-500">⏰ Pontualidade: {review.punctuality_rating}/5</span>
                          )}
                          {review.quality_rating && (
                            <span className="text-xs text-gray-500">⭐ Qualidade: {review.quality_rating}/5</span>
                          )}
                          {review.communication_rating && (
                            <span className="text-xs text-gray-500">💬 Comunicação: {review.communication_rating}/5</span>
                          )}
                        </div>
                      )}

                      {/* Resposta ou botão de responder */}
                      {review.professional_response ? (
                        <div className="mt-3 rounded-lg bg-blue-50 border border-blue-100 p-3 text-sm">
                          <p className="text-xs font-semibold text-blue-700 mb-1">Sua resposta</p>
                          <p className="text-blue-600">{review.professional_response}</p>
                        </div>
                      ) : (
                        <ProfessionalReviewResponse reviewId={review.id} />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
