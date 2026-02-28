import Link from "next/link";
import { Zap, ChevronLeft } from "lucide-react";

export const metadata = {
  title: "Política de Privacidade | ProntoJá",
  description: "Política de privacidade da plataforma ProntoJá em conformidade com a LGPD",
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
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Política de Privacidade</h1>
        <p className="mb-8 text-sm text-gray-500">Última atualização: 27 de fevereiro de 2025</p>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">1. Introdução</h2>
            <p>
              Esta Política de Privacidade descreve como o ProntoJá coleta, utiliza, armazena e
              protege seus dados pessoais, em conformidade com a Lei Geral de Proteção de Dados
              (LGPD – Lei nº 13.709/2018), o Marco Civil da Internet (Lei nº 12.965/2014) e demais
              normas aplicáveis. Ao utilizar nossa plataforma, você consente com o tratamento dos
              seus dados conforme descrito nesta política.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">2. Controlador e Encarregado</h2>
            <p className="mb-2">
              O controlador dos dados pessoais é o ProntoJá, responsável pelas decisões sobre o
              tratamento de dados na plataforma.
            </p>
            <p>
              Para exercer seus direitos ou esclarecer dúvidas sobre privacidade, entre em
              contato pelo e-mail: contato@prontoja.com.br. Podemos indicar um Encarregado de
              Proteção de Dados (DPO) para tratar demandas específicas.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">3. Dados Coletados</h2>
            <p className="mb-2">Coletamos os seguintes tipos de dados:</p>
            <p className="mb-2">
              <strong>Dados de cadastro e identificação:</strong> nome completo, e-mail, telefone,
              data de nascimento (quando aplicável), foto de perfil, endereço e cidade.
            </p>
            <p className="mb-2">
              <strong>Dados do profissional:</strong> bio, habilidades (skills), certificados,
              portfólio, localização para prestação de serviços, dados bancários para repasse
              (via Stripe Connect).
            </p>
            <p className="mb-2">
              <strong>Dados de transação:</strong> histórico de jobs, propostas, pagamentos,
              avaliações e mensagens trocadas no chat.
            </p>
            <p>
              <strong>Dados técnicos:</strong> endereço IP, tipo de navegador, páginas visitadas,
              data e hora de acesso, cookies e identificadores de dispositivo, conforme
              permitido pelo Marco Civil da Internet.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">4. Base Legal e Finalidades</h2>
            <p className="mb-2">
              O tratamento de dados pessoais baseia-se nas seguintes hipóteses legais da LGPD
              (art. 7º):
            </p>
            <ul className="list-disc pl-6 space-y-1 mb-2">
              <li><strong>Execução de contrato:</strong> prestar o serviço de intermediação;</li>
              <li><strong>Legítimo interesse:</strong> melhorar a plataforma, prevenir fraudes e garantir segurança;</li>
              <li><strong>Consentimento:</strong> comunicações de marketing e cookies não essenciais;</li>
              <li><strong>Cumprimento de obrigação legal:</strong> guarda de registros (Marco Civil) e atendimento a autoridades.</li>
            </ul>
            <p>
              Utilizamos seus dados para: fornecer e melhorar nossos serviços; processar
              pagamentos; comunicar-nos com você sobre jobs, propostas e atualizações; exibir
              perfis públicos de profissionais; moderar conteúdo e resolver disputas; cumprir
              obrigações legais e regulatórias; e, com seu consentimento, enviar ofertas e
              novidades.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">5. Compartilhamento de Dados</h2>
            <p className="mb-2">
              Não vendemos seus dados pessoais. Podemos compartilhar informações com:
            </p>
            <ul className="list-disc pl-6 space-y-1 mb-2">
              <li><strong>Stripe:</strong> processamento de pagamentos e Stripe Connect;</li>
              <li><strong>Supabase:</strong> hospedagem de banco de dados, autenticação e armazenamento;</li>
              <li><strong>Vercel:</strong> hospedagem da aplicação;</li>
              <li><strong>Cliente ou profissional:</strong> dados necessários à execução do serviço (ex.: endereço do job para o profissional);</li>
              <li><strong>Autoridades:</strong> quando exigido por lei ou ordem judicial.</li>
            </ul>
            <p>
              Os operadores que processam dados em nosso nome são contratados com obrigações de
              confidencialidade e adequação à LGPD. Em caso de transferência internacional,
              adotamos cláusulas contratuais ou mecanismos equivalentes quando aplicável.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">6. Cookies e Tecnologias Similares</h2>
            <p className="mb-2">
              Utilizamos cookies e tecnologias similares para: manter sua sessão autenticada;
              lembrar preferências; analisar o uso da plataforma; e melhorar a experiência. Cookies
              essenciais são necessários ao funcionamento e não requerem consentimento.
            </p>
            <p>
              Cookies analíticos ou de marketing podem requerer seu consentimento. Você pode
              gerenciar preferências de cookies nas configurações do navegador. A desativação de
              cookies essenciais pode limitar o uso da plataforma.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">7. Seus Direitos (LGPD – art. 18)</h2>
            <p className="mb-2">Como titular dos dados, você tem direito a:</p>
            <ul className="list-disc pl-6 space-y-1 mb-2">
              <li><strong>Confirmação e acesso:</strong> saber se tratamos seus dados e acessá-los;</li>
              <li><strong>Correção:</strong> corrigir dados incompletos, inexatos ou desatualizados;</li>
              <li><strong>Anonimização, bloqueio ou eliminação:</strong> de dados desnecessários ou tratados em desconformidade;</li>
              <li><strong>Portabilidade:</strong> receber seus dados em formato estruturado;</li>
              <li><strong>Informação sobre compartilhamento:</strong> saber com quem compartilhamos seus dados;</li>
              <li><strong>Revogação do consentimento:</strong> quando o tratamento for baseado em consentimento.</li>
            </ul>
            <p>
              Para exercer esses direitos, envie solicitação para contato@prontoja.com.br. Em
              regra, responderemos em até 15 (quinze) dias. A ANPD (Autoridade Nacional de
              Proteção de Dados) pode ser acionada em caso de insatisfação.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">8. Segurança</h2>
            <p>
              Implementamos medidas técnicas e organizacionais para proteger seus dados contra
              acesso não autorizado, alteração, divulgação ou destruição, incluindo: criptografia
              em trânsito e em repouso; controle de acesso; políticas de senha; e monitoramento
              de segurança. Em caso de incidente que possa gerar risco relevante, comunicaremos
              os titulares e a ANPD nos termos da LGPD.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">9. Retenção de Dados</h2>
            <p>
              Mantemos seus dados pelo tempo necessário às finalidades descritas e para cumprir
              obrigações legais. Registros de conexão e acesso são armazenados conforme o Marco
              Civil da Internet (6 meses a 1 ano, conforme o caso). Dados de transações são
              mantidos por período compatível com exigências fiscais e contábeis (mínimo de 5
              anos). Após o término do prazo, os dados são anonimizados ou eliminados.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">10. Dados de Crianças e Adolescentes</h2>
            <p>
              A plataforma não é destinada a menores de 18 anos. Não coletamos intencionalmente
              dados de crianças ou adolescentes. Se tomarmos conhecimento de que dados de menor
              foram fornecidos, procederemos à exclusão em conformidade com o art. 14 da LGPD.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">11. Alterações</h2>
            <p>
              Podemos atualizar esta Política de Privacidade periodicamente. Alterações
              relevantes serão comunicadas por e-mail ou notificação na plataforma. A data da
              última atualização consta no topo desta página. O uso continuado após as alterações
              constitui aceitação da nova versão.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">12. Contato</h2>
            <p>
              Para dúvidas sobre esta política, exercício de direitos ou reclamações sobre
              privacidade, entre em contato: contato@prontoja.com.br.
            </p>
          </section>
        </div>

        <div className="mt-12 flex flex-wrap gap-4">
          <Link href="/" className="btn-secondary">
            Voltar ao início
          </Link>
          <Link href="/termos" className="btn-primary">
            Termos de Uso
          </Link>
          <Link href="/como-funciona" className="btn-secondary">
            Como funciona
          </Link>
        </div>
      </main>
    </div>
  );
}
