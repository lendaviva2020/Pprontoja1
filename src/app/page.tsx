import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Zap, Shield, Star, Clock, ChevronRight, CheckCircle, MapPin, Search } from "lucide-react";

const CATEGORIAS = [
  { emoji: "🧹", name: "Limpeza", q: "limpeza" },
  { emoji: "⚡", name: "Elétrica", q: "eletrica" },
  { emoji: "🔧", name: "Encanamento", q: "encanamento" },
  { emoji: "🎨", name: "Pintura", q: "pintura" },
  { emoji: "🪚", name: "Marcenaria", q: "marcenaria" },
  { emoji: "❄️", name: "Ar-condicionado", q: "ar_condicionado" },
  { emoji: "🏠", name: "Reformas", q: "reforma" },
  { emoji: "🌿", name: "Jardinagem", q: "jardinagem" },
];

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          className={`h-3.5 w-3.5 ${i <= Math.round(rating) ? "text-yellow-400" : "text-gray-200"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

export default async function HomePage() {
  const supabase = await createClient();

  const { data: profissionaisIds } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "professional");

  const ids = profissionaisIds?.map((r) => r.user_id) ?? [];

  const { data: destaques } =
    ids.length > 0
      ? await supabase
          .from("profiles")
          .select("id, full_name, display_name, avatar_url, headline, location_city, rating_avg, rating_count, skills, slug")
          .in("id", ids)
          .eq("status", "active")
          .eq("is_available", true)
          .not("rating_avg", "is", null)
          .order("rating_avg", { ascending: false })
          .limit(6)
      : { data: null };

  const { count: totalProfissionais } =
    ids.length > 0
      ? await supabase.from("profiles").select("id", { count: "exact", head: true }).in("id", ids)
      : { count: 0 };

  const { count: totalJobs } = await supabase
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("status", "completed");

  return (
    <main className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">ProntoJá</span>
          </div>
          <nav className="hidden items-center gap-6 md:flex">
            <Link href="#como-funciona" className="text-sm text-gray-600 hover:text-gray-900">Como funciona</Link>
            <Link href="#servicos" className="text-sm text-gray-600 hover:text-gray-900">Serviços</Link>
            <Link href="/busca" className="text-sm text-gray-600 hover:text-gray-900">Buscar profissional</Link>
            <Link href="/auth/login" className="btn-secondary text-sm">Entrar</Link>
            <Link href="/auth/cadastro" className="btn-primary text-sm">Começar agora</Link>
          </nav>
          <div className="flex items-center gap-2 md:hidden">
            <Link href="/auth/login" className="btn-secondary text-sm">Entrar</Link>
            <Link href="/auth/cadastro" className="btn-primary text-sm">Começar</Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-gradient-to-br from-brand-50 to-white px-4 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-100 px-4 py-1.5 text-sm font-medium text-brand-700">
            <span className="h-2 w-2 rounded-full bg-brand-500 animate-pulse" />
            {totalProfissionais ?? 0}+ profissionais disponíveis agora
          </div>
          <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-gray-900 md:text-6xl">
            Serviços em casa,<br />
            <span className="text-brand-600">rápido e seguro</span>
          </h1>
          <p className="mb-8 text-lg text-gray-600 md:text-xl">
            Conectamos você a profissionais verificados para limpeza, reformas, elétrica, encanamento e muito mais.
            Orçamento na hora, pagamento protegido.
          </p>

          <form action="/busca" method="GET" className="mx-auto mb-6 flex max-w-2xl flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                name="q"
                placeholder="O que você precisa? Ex: eletricista..."
                className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20"
              />
            </div>
            <div className="relative sm:w-44">
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                name="cidade"
                placeholder="Cidade"
                className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20"
              />
            </div>
            <button type="submit" className="btn-primary rounded-xl px-6 py-3 text-sm">
              Buscar
            </button>
          </form>

          <div className="flex flex-col items-center justify-center gap-3 text-sm text-gray-500 sm:flex-row sm:gap-6">
            <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-brand-500" /> Grátis para clientes</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-brand-500" /> Pagamento seguro</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-brand-500" /> Profissionais verificados</span>
          </div>
        </div>
      </section>

      <section className="border-y border-gray-100 bg-white px-4 py-10">
        <div className="mx-auto max-w-4xl grid grid-cols-3 gap-8 text-center">
          {[
            { value: `${totalProfissionais ?? 0}+`, label: "Profissionais cadastrados" },
            { value: `${totalJobs ?? 0}+`, label: "Serviços realizados" },
            { value: "4.8⭐", label: "Avaliação média" },
          ].map((item) => (
            <div key={item.label}>
              <div className="text-3xl font-extrabold text-brand-600">{item.value}</div>
              <div className="mt-1 text-sm text-gray-500">{item.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="servicos" className="bg-gray-50 px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-3 text-center text-3xl font-bold text-gray-900">Serviços disponíveis</h2>
          <p className="mb-10 text-center text-gray-500">Clique em uma categoria para encontrar profissionais</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {CATEGORIAS.map((cat) => (
              <Link
                key={cat.name}
                href={`/busca?categoria=${cat.q}`}
                className="card p-5 text-center hover:border-brand-200 hover:shadow-md transition-all"
              >
                <div className="text-4xl mb-3">{cat.emoji}</div>
                <div className="font-semibold text-sm text-gray-900">{cat.name}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {destaques && destaques.length > 0 && (
        <section className="px-4 py-20">
          <div className="mx-auto max-w-5xl">
            <div className="mb-10 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Profissionais em destaque</h2>
                <p className="mt-1 text-gray-500">Os melhores avaliados da plataforma</p>
              </div>
              <Link href="/busca" className="btn-secondary text-sm hidden sm:flex items-center gap-1">
                Ver todos <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {destaques.map((prof) => {
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
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{name}</p>
                        {prof.location_city && (
                          <p className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                            <MapPin className="h-3 w-3" /> {prof.location_city}
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
                          <span key={s} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">{s}</span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      {prof.rating_avg ? (
                        <div className="flex items-center gap-1.5">
                          <Stars rating={Number(prof.rating_avg)} />
                          <span className="text-xs font-medium text-gray-700">
                            {Number(prof.rating_avg).toFixed(1)}
                          </span>
                          <span className="text-xs text-gray-400">({prof.rating_count})</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Sem avaliações</span>
                      )}
                      <span className="text-xs font-medium text-brand-600 flex items-center gap-0.5">
                        Ver perfil <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="mt-6 text-center sm:hidden">
              <Link href="/busca" className="btn-secondary inline-flex items-center gap-2 text-sm">
                Ver todos os profissionais <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      <section id="como-funciona" className="bg-gray-50 px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-gray-900">Como funciona</h2>
          <div className="grid gap-8 md:grid-cols-4">
            {[
              { step: "01", emoji: "📝", title: "Descreva o serviço", desc: "Conte o que precisa, onde e quando. Adicione fotos para mais detalhes." },
              { step: "02", emoji: "💬", title: "Receba propostas", desc: "Profissionais verificados enviam orçamentos. Compare e escolha o melhor." },
              { step: "03", emoji: "🔒", title: "Pague com segurança", desc: "O pagamento fica retido até o serviço ser concluído com sucesso." },
              { step: "04", emoji: "⭐", title: "Avalie", desc: "Ajude outros clientes avaliando o profissional após o serviço." },
            ].map((item) => (
              <div key={item.step} className="card p-6 text-center">
                <div className="mb-4 text-4xl">{item.emoji}</div>
                <div className="mb-2 text-xs font-bold uppercase tracking-widest text-brand-500">{item.step}</div>
                <h3 className="mb-2 text-base font-bold text-gray-900">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-gray-900">Por que o ProntoJá?</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: <Zap className="h-6 w-6" />, title: "Rápido", desc: "Receba propostas em menos de 1 hora" },
              { icon: <Shield className="h-6 w-6" />, title: "Seguro", desc: "Pagamento protegido até a conclusão" },
              { icon: <Star className="h-6 w-6" />, title: "Qualificado", desc: "Profissionais com documentos verificados" },
              { icon: <Clock className="h-6 w-6" />, title: "Suporte 24h", desc: "Atendimento para qualquer problema" },
            ].map((d) => (
              <div key={d.title} className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
                  {d.icon}
                </div>
                <h3 className="mb-1 font-bold text-gray-900">{d.title}</h3>
                <p className="text-sm text-gray-600">{d.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-20 bg-gray-50">
        <div className="mx-auto max-w-4xl grid md:grid-cols-2 gap-6">
          <div className="card p-8 text-center border-brand-200">
            <div className="text-4xl mb-4">🏠</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Para clientes</h3>
            <p className="text-gray-500 mb-6 text-sm">Publique seu primeiro serviço grátis e receba propostas de profissionais verificados</p>
            <Link href="/auth/cadastro?tipo=cliente" className="btn-primary w-full flex items-center justify-center gap-2">
              Solicitar um serviço <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="card p-8 text-center bg-brand-600 border-brand-600">
            <div className="text-4xl mb-4">💼</div>
            <h3 className="text-xl font-bold text-white mb-2">Para profissionais</h3>
            <p className="text-brand-100 mb-6 text-sm">Cadastre-se e comece a receber jobs hoje mesmo. Taxa de apenas 10%.</p>
            <Link
              href="/auth/cadastro?tipo=profissional"
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 font-semibold text-brand-700 hover:bg-brand-50 transition-colors"
            >
              Quero ser profissional <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-100 bg-white px-4 py-10">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col gap-8 md:flex-row md:justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
                  <Zap className="h-4 w-4 text-white" />
                </div>
                <span className="text-lg font-bold text-gray-900">ProntoJá</span>
              </div>
              <p className="text-sm text-gray-500 max-w-xs">
                Marketplace de serviços locais. Conectamos clientes a profissionais qualificados com segurança.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Plataforma</h4>
                <ul className="space-y-2 text-sm text-gray-500">
                  <li><Link href="/busca" className="hover:text-gray-900">Buscar profissionais</Link></li>
                  <li><Link href="/auth/cadastro" className="hover:text-gray-900">Criar conta</Link></li>
                  <li><Link href="#como-funciona" className="hover:text-gray-900">Como funciona</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Legal</h4>
                <ul className="space-y-2 text-sm text-gray-500">
                  <li><Link href="/termos" className="hover:text-gray-900">Termos de uso</Link></li>
                  <li><Link href="/privacidade" className="hover:text-gray-900">Privacidade</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Contato</h4>
                <ul className="space-y-2 text-sm text-gray-500">
                  <li>contato@prontoja.com.br</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-8 border-t border-gray-100 pt-6 text-center text-xs text-gray-400">
            © 2026 ProntoJá. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </main>
  );
}
