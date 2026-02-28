import Link from "next/link";
import {
  Zap,
  ChevronLeft,
  FileText,
  MessageSquare,
  CreditCard,
  Star,
  UserPlus,
  Search,
  Shield,
  CheckCircle,
} from "lucide-react";

export const metadata = {
  title: "Como Funciona | ProntoJá",
  description: "Entenda como o ProntoJá conecta clientes a profissionais de serviços",
};

const PASSOS_CLIENTE = [
  {
    step: "01",
    icon: FileText,
    title: "Descreva o serviço",
    desc: "Conte o que você precisa, onde e quando. Adicione fotos e detalhes para receber propostas mais precisas. A publicação é gratuita.",
  },
  {
    step: "02",
    icon: MessageSquare,
    title: "Receba propostas",
    desc: "Profissionais verificados enviam orçamentos com valor e prazo. Compare e escolha o melhor para você.",
  },
  {
    step: "03",
    icon: CreditCard,
    title: "Pague com segurança",
    desc: "O pagamento fica em custódia até o serviço ser concluído. Só liberamos o valor ao profissional após sua confirmação.",
  },
  {
    step: "04",
    icon: Star,
    title: "Avalie o profissional",
    desc: "Após o serviço, avalie pontualidade, qualidade e comunicação. Sua avaliação ajuda outros clientes.",
  },
];

const PASSOS_PROFISSIONAL = [
  {
    step: "01",
    icon: UserPlus,
    title: "Cadastre-se",
    desc: "Crie seu perfil com foto, bio, habilidades e portfólio. Quanto mais completo, mais chances de ser escolhido.",
  },
  {
    step: "02",
    icon: Search,
    title: "Encontre oportunidades",
    desc: "Navegue pelos jobs publicados pelos clientes e envie propostas com seu valor e prazo de entrega.",
  },
  {
    step: "03",
    icon: Shield,
    title: "Conecte o Stripe",
    desc: "Faça o onboarding no Stripe Connect para receber pagamentos. O valor é liberado após o cliente confirmar a conclusão.",
  },
  {
    step: "04",
    icon: Star,
    title: "Construa sua reputação",
    desc: "Receba avaliações dos clientes e responda para demonstrar profissionalismo. Avaliações altas aumentam suas chances.",
  },
];

export default function ComoFuncionaPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ChevronLeft className="h-5 w-5" />
            Voltar
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-gray-900">ProntoJá</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-12">
        <div className="mb-16 text-center">
          <h1 className="mb-4 text-3xl font-bold text-gray-900 md:text-4xl">
            Como funciona o ProntoJá
          </h1>
          <p className="text-lg text-gray-600">
            Conectamos clientes a profissionais qualificados de forma simples e segura
          </p>
        </div>

        <section className="mb-20">
          <h2 className="mb-2 text-xl font-bold text-gray-900">Para clientes</h2>
          <p className="mb-8 text-gray-600">
            Publique seu serviço, receba propostas e contrate com pagamento protegido
          </p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {PASSOS_CLIENTE.map((item) => (
              <div key={item.step} className="card p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
                  <item.icon className="h-6 w-6" />
                </div>
                <div className="mb-2 text-xs font-bold uppercase tracking-widest text-brand-500">
                  {item.step}
                </div>
                <h3 className="mb-2 text-base font-bold text-gray-900">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-20">
          <h2 className="mb-2 text-xl font-bold text-gray-900">Para profissionais</h2>
          <p className="mb-8 text-gray-600">
            Cadastre-se, envie propostas e receba pagamentos com apenas 10% de taxa
          </p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {PASSOS_PROFISSIONAL.map((item) => (
              <div key={item.step} className="card p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
                  <item.icon className="h-6 w-6" />
                </div>
                <div className="mb-2 text-xs font-bold uppercase tracking-widest text-brand-500">
                  {item.step}
                </div>
                <h3 className="mb-2 text-base font-bold text-gray-900">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-16 rounded-2xl border border-brand-100 bg-brand-50 p-8">
          <h2 className="mb-6 text-xl font-bold text-gray-900">Por que escolher o ProntoJá?</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Zap, title: "Rápido", desc: "Receba propostas em menos de 1 hora" },
              {
                icon: Shield,
                title: "Seguro",
                desc: "Pagamento em custódia até a conclusão do serviço",
              },
              {
                icon: Star,
                title: "Qualificado",
                desc: "Profissionais com perfis verificados e avaliados",
              },
              {
                icon: CheckCircle,
                title: "Transparente",
                desc: "Taxa de 10% apenas para profissionais, grátis para clientes",
              },
            ].map((d) => (
              <div key={d.title} className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white">
                  <d.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{d.title}</h3>
                  <p className="text-sm text-gray-600">{d.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-16 grid gap-6 md:grid-cols-2">
          <div className="card border-brand-200 p-8 text-center">
            <div className="mb-4 text-4xl">🏠</div>
            <h3 className="mb-2 text-xl font-bold text-gray-900">Para clientes</h3>
            <p className="mb-6 text-sm text-gray-500">
              Publique seu primeiro serviço grátis e receba propostas de profissionais verificados
            </p>
            <Link
              href="/auth/cadastro?tipo=cliente"
              className="btn-primary inline-flex items-center justify-center gap-2"
            >
              Solicitar um serviço
            </Link>
          </div>
          <div className="card border-brand-600 bg-brand-600 p-8 text-center">
            <div className="mb-4 text-4xl">💼</div>
            <h3 className="mb-2 text-xl font-bold text-white">Para profissionais</h3>
            <p className="mb-6 text-sm text-brand-100">
              Cadastre-se e comece a receber jobs hoje mesmo. Taxa de apenas 10%.
            </p>
            <Link
              href="/auth/cadastro?tipo=profissional"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 font-semibold text-brand-700 hover:bg-brand-50 transition-colors"
            >
              Quero ser profissional
            </Link>
          </div>
        </section>

        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/" className="btn-secondary">
            Voltar ao início
          </Link>
          <Link href="/termos" className="btn-secondary">
            Termos de Uso
          </Link>
          <Link href="/privacidade" className="btn-primary">
            Política de Privacidade
          </Link>
        </div>
      </main>
    </div>
  );
}
