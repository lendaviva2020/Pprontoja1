import Link from "next/link";
import { Zap, ChevronLeft } from "lucide-react";

export const metadata = {
  title: "Política de Privacidade | ProntoJá",
  description: "Política de privacidade da plataforma ProntoJá",
};

export default function PrivacidadePage() {
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
        <h1 className="mb-8 text-2xl font-bold text-gray-900">Política de Privacidade</h1>
        <p className="mb-4 text-sm text-gray-500">Última atualização: fevereiro de 2025</p>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-700">
          <section>
            <h2 className="text-lg font-semibold text-gray-900">1. Coleta de Dados</h2>
            <p>
              Coletamos informações que você nos fornece diretamente, como nome, e-mail, telefone e
              dados de pagamento, além de informações geradas automaticamente durante o uso da
              plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">2. Uso dos Dados</h2>
            <p>
              Utilizamos seus dados para fornecer e melhorar nossos serviços, processar pagamentos,
              comunicar-nos com você e cumprir obrigações legais. Seus dados são tratados em
              conformidade com a Lei Geral de Proteção de Dados (LGPD).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">3. Compartilhamento</h2>
            <p>
              Não vendemos seus dados pessoais. Podemos compartilhar informações com prestadores de
              serviços essenciais (como processadores de pagamento) e quando exigido por lei.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">4. Segurança</h2>
            <p>
              Implementamos medidas técnicas e organizacionais para proteger seus dados contra
              acesso não autorizado, alteração, divulgação ou destruição.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">5. Seus Direitos</h2>
            <p>
              Você tem direito a acessar, corrigir, excluir ou portar seus dados pessoais. Para
              exercer esses direitos, entre em contato conosco através dos canais disponíveis.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">6. Contato</h2>
            <p>
              Para dúvidas sobre esta política ou sobre o tratamento dos seus dados, entre em contato
              através dos canais disponíveis na plataforma.
            </p>
          </section>
        </div>

        <div className="mt-12 flex gap-4">
          <Link href="/" className="btn-secondary">
            Voltar ao início
          </Link>
          <Link href="/termos" className="btn-primary">
            Termos de Uso
          </Link>
        </div>
      </main>
    </div>
  );
}
