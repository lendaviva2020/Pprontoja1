import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Edit, Star, Award, Image as ImageIcon, ExternalLink, CheckCircle, AlertCircle } from "lucide-react";
import type { Profile, ProfessionalSkill, ProfessionalCertificate, ProfessionalPortfolioItem } from "@/types/database";

type ProfileWithRelations = Profile & {
  professional_skills: ProfessionalSkill[] | null;
  professional_certificates: ProfessionalCertificate[] | null;
  professional_portfolio: ProfessionalPortfolioItem[] | null;
};

export default async function PerfilProfissionalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const service = createServiceClient();
  const { data: profileData } = await service
    .from("profiles")
    .select(`*, professional_skills (*), professional_certificates (*), professional_portfolio (*)`)
    .eq("id", user.id)
    .single();

  const profile = profileData as ProfileWithRelations | null;
  if (!profile) redirect("/profissional/dashboard");

  const completeness = profile.profile_completeness || 0;
  const name = profile.display_name || profile.full_name;

  const checks = [
    { label: "Foto de perfil", done: !!profile.avatar_url },
    { label: "Nome e tagline", done: !!(profile.display_name && profile.headline) },
    { label: "Bio completa", done: (profile.bio?.length || 0) >= 50 },
    { label: "Localização", done: !!profile.location_city },
    { label: "Valor/hora", done: !!profile.hourly_rate_cents },
    { label: "Skills adicionadas", done: (profile.professional_skills?.length || 0) >= 3 },
    { label: "Certificado", done: (profile.professional_certificates?.length || 0) >= 1 },
    { label: "Portfólio", done: (profile.professional_portfolio?.length || 0) >= 1 },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meu Perfil</h1>
          <p className="text-gray-500 mt-1">Como os clientes te veem</p>
        </div>
        <div className="flex gap-2">
          {profile.slug && (
            <Link href={`/p/${profile.slug}`} target="_blank" className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
              <ExternalLink className="h-4 w-4" /> Ver público
            </Link>
          )}
          <Link href="/profissional/perfil/editar" className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
            <Edit className="h-4 w-4" /> Editar perfil
          </Link>
        </div>
      </div>

      {/* Preview do perfil */}
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
        <div className="flex items-start gap-5">
          <div className="h-20 w-20 flex-shrink-0 rounded-2xl overflow-hidden bg-gray-100 border-2 border-white shadow-md">
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt={name} className="h-full w-full object-cover" />
              : <div className="h-full w-full flex items-center justify-center text-2xl font-bold text-gray-400">{name?.[0]?.toUpperCase()}</div>}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900">{name || "Sem nome"}</h2>
              {profile.verified_identity && <CheckCircle className="h-5 w-5 text-blue-500" />}
            </div>
            {profile.headline && <p className="text-gray-500 mt-0.5">{profile.headline}</p>}
            <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-500">
              {profile.location_city && <span>📍 {profile.location_city}, {profile.location_state}</span>}
              {profile.rating_avg && <span>⭐ {Number(profile.rating_avg).toFixed(1)} ({profile.rating_count} avaliações)</span>}
              {profile.hourly_rate_cents && <span>💰 R$ {(profile.hourly_rate_cents / 100).toFixed(0)}/h</span>}
            </div>
            {profile.bio && <p className="mt-3 text-sm text-gray-600 line-clamp-3">{profile.bio}</p>}
          </div>
        </div>

        {(profile.professional_skills?.length ?? 0) > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {(profile.professional_skills ?? []).slice(0, 8).map((s) => (
              <span key={s.id} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">{s.skill_name}</span>
            ))}
            {(profile.professional_skills?.length ?? 0) > 8 && (
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-400">+{(profile.professional_skills?.length ?? 0) - 8} mais</span>
            )}
          </div>
        )}
      </div>

      {/* Completude com checklist */}
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">Completude do perfil</h3>
          <span className={`text-lg font-bold ${completeness >= 80 ? "text-green-600" : completeness >= 50 ? "text-yellow-600" : "text-red-500"}`}>{completeness}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-5">
          <div
            className={`h-full rounded-full transition-all duration-500 ${completeness >= 80 ? "bg-green-500" : completeness >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
            style={{ width: `${completeness}%` }}
          />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {checks.map(c => (
            <div key={c.label} className="flex items-center gap-2 text-sm">
              {c.done
                ? <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                : <AlertCircle className="h-4 w-4 text-gray-300 flex-shrink-0" />}
              <span className={c.done ? "text-gray-700" : "text-gray-400"}>{c.label}</span>
            </div>
          ))}
        </div>
        {completeness < 100 && (
          <Link href="/profissional/perfil/editar" className="mt-4 flex w-full items-center justify-center rounded-xl bg-brand-50 py-2.5 text-sm font-medium text-brand-700 hover:bg-brand-100 transition-colors">
            Completar perfil →
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100 text-center">
          <Star className="mx-auto h-6 w-6 text-yellow-500 mb-1" />
          <p className="text-2xl font-bold text-gray-900">{profile.rating_count || 0}</p>
          <p className="text-xs text-gray-500">Avaliações</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100 text-center">
          <Award className="mx-auto h-6 w-6 text-amber-500 mb-1" />
          <p className="text-2xl font-bold text-gray-900">{profile.professional_certificates?.length || 0}</p>
          <p className="text-xs text-gray-500">Certificados</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100 text-center">
          <ImageIcon className="mx-auto h-6 w-6 text-blue-500 mb-1" />
          <p className="text-2xl font-bold text-gray-900">{profile.professional_portfolio?.length || 0}</p>
          <p className="text-xs text-gray-500">Portfólio</p>
        </div>
      </div>
    </div>
  );
}
