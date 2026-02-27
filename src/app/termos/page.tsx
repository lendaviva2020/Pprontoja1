import Link from "next/link";
import { Zap, ChevronLeft } from "lucide-react";

export const metadata = {
  title: "Termos de Uso | ProntoJá",
  description: "Termos de uso da plataforma ProntoJá",
};

export default function TermosPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-4">
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

      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="mb-8 text-2xl font-bold text-gray-900">Termos de Uso</h1>
        <p className="mb-4 text-sm text-gray-500">Última atualização: fevereiro de 2025</p>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-700">
          <section>
            <h2 className="text-lg font-semibold text-gray-900">1. Aceitação dos Termos</h2>
            <p>
              Ao acessar e utilizar a plataforma ProntoJá, você concorda em cumprir e estar vinculado
              a estes Termos de Uso. Se você não concordar com qualquer parte destes termos, não
              deverá utilizar nossos serviços.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">2. Descrição do Serviço</h2>
            <p>
              O ProntoJá é uma plataforma que conecta clientes a profissionais de serviços diversos,
              facilitando a contratação, o acompanhamento e o pagamento de serviços.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">3. Cadastro e Conta</h2>
            <p>
              Para utilizar a plataforma, é necessário criar uma conta fornecendo informações
              verdadeiras e atualizadas. Você é responsável por manter a confidencialidade de sua
              senha e por todas as atividades realizadas em sua conta.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">4. Uso Adequado</h2>
            <p>
              O usuário compromete-se a utilizar a plataforma de forma ética e legal, não podendo
              utilizar o serviço para fins ilícitos, fraudulentos ou que violem direitos de terceiros.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">5. Pagamentos e Taxas</h2>
            <p>
              Os valores dos serviços, taxas da plataforma e condições de pagamento são informados
              no momento da contratação. O ProntoJá atua como intermediário nos pagamentos entre
              clientes e profissionais.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">6. Contato</h2>
            <p>
              Para dúvidas sobre estes termos, entre em contato através dos canais disponíveis na
              plataforma.
            </p>
          </section>
        </div>

        <div className="mt-12 flex gap-4">
          <Link href="/" className="btn-secondary">
            Voltar ao início
          </Link>
          <Link href="/privacidade" className="btn-primary">
            Política de Privacidade
          </Link>
        </div>
      </main>
    </div>
  );
}
