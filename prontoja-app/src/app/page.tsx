import Link from "next/link";
import { Zap, Shield, Star, Clock, ChevronRight, CheckCircle } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
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
            <Link href="/auth/login" className="btn-secondary text-sm">Entrar</Link>
            <Link href="/auth/cadastro" className="btn-primary text-sm">Começar agora</Link>
          </nav>
          <div className="flex items-center gap-2 md:hidden">
            <Link href="/auth/login" className="btn-secondary text-sm">Entrar</Link>
            <Link href="/auth/cadastro" className="btn-primary text-sm">Começar</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-50 to-white px-4 py-20 text-center">
        <div className="mx-auto max-w-4xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-100 px-4 py-1.5 text-sm font-medium text-brand-700">
            <span className="h-2 w-2 rounded-full bg-brand-500 animate-pulse" />
            Profissionais disponíveis agora
          </div>
          <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-gray-900 md:text-6xl">
            Serviços em casa,<br />
            <span className="text-brand-600">rápido e seguro</span>
          </h1>
          <p className="mb-8 text-lg text-gray-600 md:text-xl">
            Conectamos você a profissionais verificados para limpeza, reformas, elétrica, encanamento e muito mais.
            Orçamento na hora, pagamento protegido.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/auth/cadastro?tipo=cliente" className="btn-primary w-full px-8 py-3 text-base sm:w-auto flex items-center justify-center gap-2">
              Quero um serviço <ChevronRight className="h-4 w-4" />
            </Link>
            <Link href="/auth/cadastro?tipo=profissional" className="btn-secondary w-full px-8 py-3 text-base sm:w-auto">
              Sou profissional
            </Link>
          </div>
          <div className="mt-8 flex items-center justify-center gap-6 text-sm text-gray-500">
            <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-brand-500" /> Grátis para clientes</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-brand-500" /> Pagamento seguro</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-brand-500" /> Profissionais verificados</span>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-gray-900">Como funciona</h2>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { step: "01", icon: "📝", title: "Descreva o serviço", desc: "Conte o que precisa, onde e quando. Adicione fotos para mais detalhes." },
              { step: "02", icon: "💬", title: "Receba propostas", desc: "Profissionais verificados enviam orçamentos. Compare e escolha o melhor." },
              { step: "03", icon: "✅", title: "Serviço concluído", desc: "Acompanhe em tempo real. Pague só quando estiver satisfeito." },
            ].map((item) => (
              <div key={item.step} className="card p-6 text-center">
                <div className="mb-4 text-4xl">{item.icon}</div>
                <div className="mb-2 text-xs font-bold uppercase tracking-widest text-brand-500">{item.step}</div>
                <h3 className="mb-2 text-lg font-bold text-gray-900">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Serviços */}
      <section id="servicos" className="bg-gray-50 px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-gray-900">Serviços disponíveis</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {[
              { emoji: "🧹", name: "Limpeza", sub: "Residencial e comercial" },
              { emoji: "⚡", name: "Elétrica", sub: "Instalação e manutenção" },
              { emoji: "🔧", name: "Encanamento", sub: "Reparos e instalações" },
              { emoji: "🎨", name: "Pintura", sub: "Interna e externa" },
              { emoji: "🪚", name: "Marcenaria", sub: "Móveis e reparos" },
              { emoji: "❄️", name: "Ar-condicionado", sub: "Instalação e higienização" },
              { emoji: "🏠", name: "Reformas", sub: "Pequenas e grandes" },
              { emoji: "🔒", name: "Segurança", sub: "Câmeras e fechaduras" },
            ].map((s) => (
              <Link key={s.name} href="/auth/cadastro" className="card p-4 text-center hover:border-brand-200 hover:shadow-md transition-all cursor-pointer">
                <div className="text-3xl mb-2">{s.emoji}</div>
                <div className="font-semibold text-sm text-gray-900">{s.name}</div>
                <div className="text-xs text-gray-500">{s.sub}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Diferenciais */}
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

      {/* CTA */}
      <section className="bg-brand-600 px-4 py-20 text-center text-white">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-4 text-3xl font-bold">Pronto para começar?</h2>
          <p className="mb-8 text-brand-100">Cadastre-se grátis e solicite seu primeiro serviço hoje.</p>
          <Link href="/auth/cadastro" className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3 font-semibold text-brand-600 hover:bg-brand-50 transition-colors">
            Criar conta grátis <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-4 py-8 text-center text-sm text-gray-500">
        <p>© 2026 ProntoJá. Todos os direitos reservados.</p>
      </footer>
    </main>
  );
}
