import { createServiceClient } from "@/lib/supabase/service";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Star, MapPin, Clock, DollarSign, CheckCircle, Briefcase,
  Globe, Linkedin, Instagram, Award, MessageSquare, Calendar
} from "lucide-react";

const SKILL_LEVEL_LABELS: Record<string, string> = {
  beginner: "Iniciante",
  intermediate: "Intermediário",
  advanced: "Avançado",
  expert: "Especialista",
};

const SKILL_LEVEL_COLORS: Record<string, string> = {
  beginner: "bg-gray-100 text-gray-600",
  intermediate: "bg-blue-100 text-blue-700",
  advanced: "bg-purple-100 text-purple-700",
  expert: "bg-green-100 text-green-700",
};

export default async function PublicProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = createServiceClient();

  const { data: profile } = await service
    .from("profiles")
    .select(`
      *,
      professional_skills (*),
      professional_certificates (*),
      professional_portfolio (*)
    `)
    .eq("slug", slug)
    .eq("status", "active")
    .single();

  if (!profile) notFound();

  // Buscar avaliações
  const { data: reviews } = await service
    .from("reviews")
    .select(`
      *,
      reviewer:profiles!reviewer_id (id, display_name, full_name, avatar_url)
    `)
    .eq("reviewee_id", profile.id)
    .eq("is_visible", true)
    .order("created_at", { ascending: false })
    .limit(10);

  const name = profile.display_name || profile.full_name;
  const initials = name?.split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-brand-700 to-brand-900 pt-16 pb-24">
        <div className="mx-auto max-w-4xl px-4">
          <div className="flex flex-col items-center text-center sm:flex-row sm:text-left sm:items-end gap-6">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="h-32 w-32 rounded-2xl overflow-hidden border-4 border-white shadow-xl">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={name} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-brand-100 text-4xl font-bold text-brand-600">{initials}</div>
                )}
              </div>
              {profile.is_available && (
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-green-500 px-3 py-0.5 text-xs font-bold text-white shadow">
                  🟢 Disponível
                </span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 text-white">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                <h1 className="text-2xl font-bold">{name}</h1>
                {profile.verified_identity && (
                  <CheckCircle className="h-5 w-5 text-blue-300" title="Identidade verificada" />
                )}
              </div>
              {profile.headline && <p className="text-brand-200 text-lg">{profile.headline}</p>}
              <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-sm text-brand-200">
                {profile.location_city && (
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{profile.location_city}, {profile.location_state}</span>
                )}
                {profile.years_experience && (
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{profile.years_experience} anos exp.</span>
                )}
                {profile.rating_avg && (
                  <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />{Number(profile.rating_avg).toFixed(1)} ({profile.rating_count} avaliações)</span>
                )}
                {profile.hourly_rate_cents && (
                  <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" />R$ {(profile.hourly_rate_cents / 100).toFixed(0)}/h</span>
                )}
              </div>
            </div>

            {/* CTA */}
            <div className="flex flex-col gap-2">
              <Link
                href={`/cliente/jobs/novo?professional_id=${profile.id}`}
                className="flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-brand-700 shadow-lg hover:bg-brand-50 transition-colors"
              >
                <Calendar className="h-4 w-4" /> Contratar
              </Link>
              <Link
                href={`/chat/direto/${profile.id}`}
                className="flex items-center gap-2 rounded-xl border border-white/30 px-6 py-3 font-medium text-white hover:bg-white/10 transition-colors"
              >
                <MessageSquare className="h-4 w-4" /> Enviar mensagem
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 -mt-8">
        <div className="grid gap-6 lg:grid-cols-3">

          {/* Coluna principal */}
          <div className="lg:col-span-2 space-y-6">

            {/* Bio */}
            {profile.bio && (
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold text-gray-900 mb-3">Sobre</h2>
                <p className="text-gray-600 leading-relaxed whitespace-pre-line">{profile.bio}</p>
              </div>
            )}

            {/* Portfólio */}
            {profile.professional_portfolio?.length > 0 && (
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-brand-500" /> Portfólio
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {profile.professional_portfolio.map((item: { id: string; image_url?: string; title: string; description?: string }) => (
                    <div key={item.id} className="group relative rounded-xl overflow-hidden bg-gray-100 aspect-square cursor-pointer">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-gray-400">📷</div>
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                        <p className="text-white text-xs font-semibold">{item.title}</p>
                        {item.description && <p className="text-white/80 text-xs mt-1 line-clamp-2">{item.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Avaliações */}
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" /> Avaliações
                  {profile.rating_count > 0 && (
                    <span className="ml-1 rounded-full bg-yellow-100 px-2 py-0.5 text-sm text-yellow-700 font-semibold">
                      {Number(profile.rating_avg).toFixed(1)} ★
                    </span>
                  )}
                </h2>
                <span className="text-sm text-gray-500">{profile.rating_count || 0} no total</span>
              </div>

              {!reviews?.length ? (
                <p className="text-center text-gray-400 py-8">Ainda sem avaliações</p>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review: {
                    id: string;
                    rating: number;
                    comment?: string;
                    created_at: string;
                    would_hire_again?: boolean;
                    professional_response?: string;
                    reviewer?: { display_name?: string; full_name?: string; avatar_url?: string };
                  }) => {
                    const rName = review.reviewer?.display_name || review.reviewer?.full_name || "Anônimo";
                    return (
                      <div key={review.id} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-bold text-gray-600">
                            {review.reviewer?.avatar_url
                              ? <img src={review.reviewer.avatar_url} alt={rName} className="h-9 w-9 rounded-full object-cover" />
                              : rName[0]?.toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm text-gray-900">{rName}</span>
                              <span className="text-xs text-gray-400">{new Date(review.created_at).toLocaleDateString("pt-BR")}</span>
                              {review.would_hire_again && <span className="text-xs text-green-600 font-medium">✓ Contraria novamente</span>}
                            </div>
                            <div className="flex my-1">
                              {Array.from({ length: 5 }, (_, i) => (
                                <Star key={i} className={`h-3.5 w-3.5 ${i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} />
                              ))}
                            </div>
                            {review.comment && <p className="text-sm text-gray-600">{review.comment}</p>}
                            {review.professional_response && (
                              <div className="mt-2 rounded-lg bg-blue-50 p-3 text-sm">
                                <p className="font-medium text-blue-700 text-xs mb-1">Resposta do profissional:</p>
                                <p className="text-blue-600">{review.professional_response}</p>
                              </div>
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

          {/* Sidebar */}
          <div className="space-y-4">

            {/* Skills */}
            {profile.professional_skills?.length > 0 && (
              <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-3">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.professional_skills.map((skill: { id: string; skill_name: string; skill_level: string }) => (
                    <span key={skill.id} className={`rounded-full px-3 py-1 text-xs font-medium ${SKILL_LEVEL_COLORS[skill.skill_level] || "bg-gray-100 text-gray-600"}`}>
                      {skill.skill_name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Certificados */}
            {profile.professional_certificates?.length > 0 && (
              <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Award className="h-4 w-4 text-amber-500" /> Certificados
                </h3>
                <div className="space-y-2">
                  {profile.professional_certificates.map((cert: { id: string; title: string; issuer: string; issued_year?: number; is_verified?: boolean }) => (
                    <div key={cert.id} className="flex items-start gap-2">
                      <Award className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="flex items-center gap-1">
                          <p className="text-sm font-medium text-gray-800">{cert.title}</p>
                          {cert.is_verified && <CheckCircle className="h-3.5 w-3.5 text-green-500" />}
                        </div>
                        <p className="text-xs text-gray-500">{cert.issuer}{cert.issued_year ? ` • ${cert.issued_year}` : ""}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Links */}
            {(profile.website_url || profile.linkedin_url || profile.instagram_url) && (
              <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-3">Links</h3>
                <div className="space-y-2">
                  {profile.website_url && (
                    <a href={profile.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-gray-600 hover:text-brand-600">
                      <Globe className="h-4 w-4" /> Site pessoal
                    </a>
                  )}
                  {profile.linkedin_url && (
                    <a href={`https://${profile.linkedin_url.replace(/^https?:\/\//, "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600">
                      <Linkedin className="h-4 w-4" /> LinkedIn
                    </a>
                  )}
                  {profile.instagram_url && (
                    <a href={`https://instagram.com/${profile.instagram_url.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-gray-600 hover:text-pink-600">
                      <Instagram className="h-4 w-4" /> Instagram
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-3">Estatísticas</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Jobs concluídos</span>
                  <span className="font-bold text-gray-900">{profile.total_jobs_done || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Avaliações</span>
                  <span className="font-bold text-gray-900">{profile.rating_count || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Resp. média</span>
                  <span className="font-bold text-gray-900">{profile.response_time_hours || 24}h</span>
                </div>
                {profile.service_radius_km && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Raio de atend.</span>
                    <span className="font-bold text-gray-900">{profile.service_radius_km} km</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
