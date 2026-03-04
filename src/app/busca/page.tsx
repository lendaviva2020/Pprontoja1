import { use } from "react";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Search, Star, MapPin, Filter, Zap, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type ProfissionalBusca = {
  id: string;
  full_name?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  headline?: string | null;
  location_city?: string | null;
  rating_avg?: number | null;
  rating_count?: number | null;
  skills?: string[] | null;
  slug?: string | null;
};

const CATEGORIAS = [
  { value: "limpeza", label: "Limpeza", emoji: "🧹" },
  { value: "eletrica", label: "Elétrica", emoji: "⚡" },
  { value: "encanamento", label: "Encanamento", emoji: "🔧" },
  { value: "pintura", label: "Pintura", emoji: "🎨" },
  { value: "marcenaria", label: "Marcenaria", emoji: "🪚" },
  { value: "ar_condicionado", label: "Ar-condicionado", emoji: "❄️" },
  { value: "reforma", label: "Reformas", emoji: "🏠" },
  { value: "jardinagem", label: "Jardinagem", emoji: "🌿" },
];

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} className={cn("h-3.5 w-3.5", i <= Math.round(rating) ? "text-yellow-400" : "text-gray-200")} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default async function BuscaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categoria?: string; cidade?: string; rating?: string }>;
}) {
  const supabase = await createClient();
  const params = use(searchParams);

  const q = params.q ?? "";
  const categoria = params.categoria ?? "";
  const cidade = params.cidade ?? "";
  const minRating = Number(params.rating ?? 0);

  const { data: profissionaisIds } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "professional");

  const ids = profissionaisIds?.map((r) => r.user_id) ?? [];

  let query =
    ids.length > 0
      ? supabase
          .from("profiles")
          .select("id, full_name, display_name, avatar_url, headline, location_city, rating_avg, rating_count, skills, slug")
          .in("id", ids)
          .eq("status", "active")
          .eq("is_available", true)
          .order("rating_avg", { ascending: false })
      : supabase.from("profiles").select("id").limit(0);

  if (q) {
    query = query.or(`display_name.ilike.%${q}%,full_name.ilike.%${q}%,headline.ilike.%${q}%`);
  }
  if (cidade) {
    query = query.ilike("location_city", `%${cidade}%`);
  }
  if (minRating > 0) {
    query = query.gte("rating_avg", minRating);
  }

  const { data: profissionais } = await query.limit(24);

  const filtered = (
    profissionais?.filter((p) => {
      if (!categoria) return true;
      const skills = ((p as ProfissionalBusca).skills ?? []) as string[];
      return skills.some((s) => s.toLowerCase().includes(categoria));
    }) ?? []
  ) as ProfissionalBusca[];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">ProntoJá</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="btn-secondary text-sm">Entrar</Link>
            <Link href="/auth/cadastro" className="btn-primary text-sm">Cadastrar</Link>
          </div>
        </div>
      </header>

      <section className="bg-gradient-to-br from-brand-600 to-brand-700 px-4 py-12 text-white">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="mb-2 text-3xl font-bold">Encontre o profissional ideal</h1>
          <p className="mb-8 text-brand-100">Profissionais verificados perto de você</p>

          <form method="GET" action="/busca" className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                name="q"
                defaultValue={q}
                placeholder="Ex: eletricista, limpeza, pintor..."
                className="w-full rounded-xl border-0 bg-white py-3 pl-10 pr-4 text-gray-900 placeholder-gray-400 shadow-sm focus:ring-2 focus:ring-white/30 focus:outline-none"
              />
            </div>
            <div className="relative sm:w-48">
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                name="cidade"
                defaultValue={cidade}
                placeholder="Cidade"
                className="w-full rounded-xl border-0 bg-white py-3 pl-10 pr-4 text-gray-900 placeholder-gray-400 shadow-sm focus:ring-2 focus:ring-white/30 focus:outline-none"
              />
            </div>
            <button type="submit" className="rounded-xl bg-white px-6 py-3 font-semibold text-brand-700 shadow-sm hover:bg-brand-50 transition-colors">
              Buscar
            </button>
          </form>
        </div>
      </section>

      <section className="border-b border-gray-200 bg-white px-4 py-4">
        <div className="mx-auto max-w-6xl">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <Link
              href="/busca"
              className={cn(
                "flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors border",
                !categoria ? "bg-brand-600 text-white border-brand-600" : "bg-white text-gray-600 border-gray-200 hover:border-brand-300 hover:text-brand-700"
              )}
            >
              Todos
            </Link>
            {CATEGORIAS.map((cat) => (
              <Link
                key={cat.value}
                href={`/busca?q=${q}&cidade=${cidade}&categoria=${cat.value}`}
                className={cn(
                  "flex-shrink-0 flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors border",
                  categoria === cat.value
                    ? "bg-brand-600 text-white border-brand-600"
                    : "bg-white text-gray-600 border-gray-200 hover:border-brand-300 hover:text-brand-700"
                )}
              >
                {cat.emoji} {cat.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex gap-6">
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="card p-5 sticky top-24">
              <div className="mb-4 flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="font-semibold text-gray-900">Filtros</span>
              </div>

              <form method="GET" action="/busca" className="space-y-5">
                <input type="hidden" name="q" value={q} />
                <input type="hidden" name="categoria" value={categoria} />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                  <input name="cidade" defaultValue={cidade} placeholder="Ex: São Paulo" className="input-field text-sm" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Avaliação mínima</label>
                  <div className="space-y-1.5">
                    {[0, 3, 4, 5].map((r) => (
                      <label key={r} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="rating"
                          value={r}
                          defaultChecked={minRating === r}
                          className="accent-brand-600"
                        />
                        {r === 0 ? (
                          <span className="text-sm text-gray-600">Qualquer avaliação</span>
                        ) : (
                          <span className="flex items-center gap-1 text-sm text-gray-600">
                            {r}+ <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>

                <button type="submit" className="btn-primary w-full text-sm">Aplicar filtros</button>
                <Link href="/busca" className="btn-secondary w-full text-sm text-center block">Limpar filtros</Link>
              </form>
            </div>
          </aside>

          <div className="flex-1">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {filtered.length === 0
                  ? "Nenhum profissional encontrado"
                  : `${filtered.length} profissional${filtered.length !== 1 ? "is" : ""} encontrado${filtered.length !== 1 ? "s" : ""}`}
              </p>
            </div>

            {filtered.length === 0 ? (
              <div className="card py-20 text-center">
                <Search className="mx-auto h-12 w-12 text-gray-200 mb-4" />
                <p className="font-medium text-gray-500">Nenhum profissional encontrado</p>
                <p className="text-sm text-gray-400 mt-1">Tente outros termos ou remova os filtros</p>
                <Link href="/busca" className="btn-secondary mt-4 inline-flex text-sm">
                  Limpar busca
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((prof) => {
                  const name = prof.display_name || prof.full_name || "Profissional";
                  const initials = name.split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase();
                  const skills = (prof.skills as string[] | null) ?? [];
                  const profileLink = prof.slug ? `/p/${prof.slug}` : `/p/${prof.id}`;

                  return (
                    <Link
                      key={prof.id}
                      href={profileLink}
                      className="card p-5 hover:shadow-md hover:border-brand-200 transition-all block"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        {prof.avatar_url ? (
                          <img
                            src={prof.avatar_url}
                            alt={name}
                            className="h-12 w-12 rounded-xl object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-brand-100 text-sm font-bold text-brand-700">
                            {initials}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-900 truncate">{name}</p>
                          {prof.location_city && (
                            <p className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                              <MapPin className="h-3 w-3" />
                              {prof.location_city}
                            </p>
                          )}
                        </div>
                      </div>

                      {prof.headline && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{prof.headline}</p>
                      )}

                      {skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {skills.slice(0, 3).map((s: string) => (
                            <span key={s} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">
                              {s}
                            </span>
                          ))}
                          {skills.length > 3 && (
                            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-500">
                              +{skills.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {prof.rating_avg ? (
                            <>
                              <Stars rating={Number(prof.rating_avg)} />
                              <span className="text-xs font-medium text-gray-700">
                                {Number(prof.rating_avg).toFixed(1)}
                              </span>
                              <span className="text-xs text-gray-400">({prof.rating_count})</span>
                            </>
                          ) : (
                            <span className="text-xs text-gray-400">Sem avaliações</span>
                          )}
                        </div>
                        <span className="flex items-center gap-0.5 text-xs font-medium text-brand-600">
                          Ver perfil <ChevronRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-400">
        <p>© 2026 ProntoJá. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
