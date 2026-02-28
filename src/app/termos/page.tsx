import Link from "next/link";
import { Zap, ChevronLeft } from "lucide-react";

export const metadata = {
  title: "Termos de Uso | ProntoJá",
  description: "Termos e condições de uso da plataforma ProntoJá",
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
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Termos de Uso</h1>
        <p className="mb-8 text-sm text-gray-500">Última atualização: 27 de fevereiro de 2025</p>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">1. Aceitação dos Termos</h2>
            <p className="mb-2">
              Ao acessar, cadastrar-se ou utilizar a plataforma ProntoJá, você declara ter lido,
              compreendido e aceito integralmente estes Termos de Uso, que constituem contrato de
              adesão nos termos do art. 46 do Código de Defesa do Consumidor (Lei nº 8.078/1990).
            </p>
            <p>
              Se você não concordar com qualquer disposição destes termos, não deverá utilizar
              nossos serviços. O uso continuado da plataforma após alterações constitui aceitação
              tácita das modificações.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">2. Descrição do Serviço</h2>
            <p className="mb-2">
              O ProntoJá é uma plataforma digital de intermediação (marketplace) que conecta
              clientes a profissionais autônomos prestadores de serviços diversos, incluindo, mas
              não se limitando a: limpeza, elétrica, encanamento, pintura, marcenaria,
              ar-condicionado, reformas e jardinagem.
            </p>
            <p className="mb-2">
              A plataforma facilita a publicação de demandas (jobs), o envio e recebimento de
              propostas, a contratação, o pagamento em custódia, a comunicação em tempo real e a
              avaliação dos serviços prestados. O ProntoJá atua como intermediário tecnológico e
              financeiro, não sendo parte na relação contratual entre cliente e profissional.
            </p>
            <p>
              O modelo de negócio utiliza split payment: a plataforma retém 10% (dez por cento)
              de cada transação concluída e repassa 90% (noventa por cento) ao profissional via
              Stripe Connect.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">3. Cadastro e Conta</h2>
            <p className="mb-2">
              Para utilizar a plataforma, é necessário criar uma conta fornecendo informações
              verdadeiras, completas e atualizadas. O usuário pode cadastrar-se como cliente ou
              profissional, podendo, em regra, ter apenas um perfil de cada tipo vinculado à
              mesma conta.
            </p>
            <p className="mb-2">
              Você é integralmente responsável por manter a confidencialidade de sua senha e por
              todas as atividades realizadas em sua conta. Em caso de uso não autorizado, notifique
              imediatamente a plataforma.
            </p>
            <p>
              O cadastro de menores de 18 anos não é permitido. Profissionais devem comprovar
              capacidade civil e, quando aplicável, qualificações para o exercício da atividade.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">4. Uso Adequado e Conduta</h2>
            <p className="mb-2">
              O usuário compromete-se a utilizar a plataforma de forma ética, legal e em
              conformidade com o Marco Civil da Internet (Lei nº 12.965/2014), não podendo:
            </p>
            <ul className="list-disc pl-6 space-y-1 mb-2">
              <li>Utilizar o serviço para fins ilícitos, fraudulentos ou que violem direitos de terceiros;</li>
              <li>Publicar conteúdo falso, difamatório, ofensivo ou que incite discriminação;</li>
              <li>Contornar sistemas de segurança ou realizar engenharia reversa;</li>
              <li>Realizar transações fora da plataforma para evadir taxas;</li>
              <li>Manipular avaliações ou criar contas falsas;</li>
              <li>Utilizar dados de terceiros sem autorização.</li>
            </ul>
            <p>
              A plataforma reserva-se o direito de remover conteúdo que viole estes termos ou a
              legislação vigente, nos termos do art. 19 do Marco Civil da Internet, e de
              suspender ou encerrar contas em caso de descumprimento.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">5. Pagamentos, Taxas e Custódia</h2>
            <p className="mb-2">
              Os valores dos serviços são definidos entre cliente e profissional por meio de
              propostas. A plataforma cobra taxa de 10% sobre o valor da transação, descontada do
              repasse ao profissional. O cliente não paga taxa adicional para publicar jobs ou
              receber propostas.
            </p>
            <p className="mb-2">
              O pagamento é processado via Stripe em regime de custódia: o valor fica retido até
              que o cliente confirme a conclusão do serviço. Após a confirmação, o valor é
              liberado ao profissional (90%) e à plataforma (10%). Em caso de disputa, o valor
              permanece em custódia até resolução.
            </p>
            <p>
              O profissional deve concluir o onboarding no Stripe Connect para receber pagamentos.
              A plataforma não se responsabiliza por atrasos ou falhas decorrentes de dados
              incorretos fornecidos pelo profissional ao Stripe.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">6. Relação entre as Partes</h2>
            <p className="mb-2">
              O ProntoJá é uma plataforma de intermediação. O contrato de prestação de serviços
              é celebrado diretamente entre cliente e profissional. A plataforma não é
              empregadora do profissional nem subcontratada do cliente.
            </p>
            <p>
              O ProntoJá não garante a qualidade, legalidade ou segurança dos serviços prestados
              pelos profissionais, embora incentive verificações e avaliações. A escolha do
              profissional e a supervisão do serviço são de responsabilidade do cliente.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">7. Disputas e Mediação</h2>
            <p className="mb-2">
              Em caso de divergência entre cliente e profissional quanto à conclusão ou qualidade
              do serviço, qualquer das partes pode abrir uma disputa pela plataforma. O ProntoJá
              analisará as evidências (mensagens, fotos, descrições) e poderá decidir pela
              liberação total, parcial ou retenção do pagamento.
            </p>
            <p>
              As decisões da plataforma em disputas são vinculantes para fins de liberação de
              pagamento. Para questões que ultrapassem o escopo da plataforma, as partes podem
              recorrer aos órgãos de defesa do consumidor e ao Poder Judiciário.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">8. Propriedade Intelectual</h2>
            <p>
              Todo o conteúdo da plataforma (marca, layout, código, textos, gráficos) é de
              propriedade do ProntoJá ou de seus licenciadores. O uso não autorizado constitui
              violação de direitos autorais e de propriedade industrial. Conteúdos enviados pelos
              usuários (fotos, descrições) são licenciados à plataforma para fins de operação do
              serviço.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">9. Limitação de Responsabilidade</h2>
            <p className="mb-2">
              Na extensão permitida pela lei, o ProntoJá não se responsabiliza por: (a) danos
              indiretos, incidentais ou consequenciais; (b) atos ou omissões dos profissionais ou
              clientes; (c) falhas de terceiros (Stripe, Supabase, provedores de internet); (d)
              perda de dados ou interrupções temporárias do serviço.
            </p>
            <p>
              A responsabilidade da plataforma, quando cabível, limita-se ao valor da transação
              em questão ou ao valor pago pelo usuário nos últimos 12 meses, o que for menor,
              salvo em casos de dolo ou culpa grave.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">10. Cancelamento e Suspensão</h2>
            <p>
              O usuário pode encerrar sua conta a qualquer momento pelas configurações. O
              ProntoJá pode suspender ou encerrar contas em caso de violação destes termos,
              suspeita de fraude ou por decisão administrativa. Em caso de encerramento, jobs e
              transações em andamento serão tratados conforme as regras de disputa e custódia.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">11. Modificações</h2>
            <p>
              O ProntoJá pode alterar estes Termos de Uso a qualquer momento. Alterações
              significativas serão comunicadas por e-mail ou notificação na plataforma com
              antecedência mínima de 30 dias. O uso continuado após a vigência das alterações
              constitui aceitação. Em caso de discordância, o usuário deve encerrar sua conta.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">12. Lei Aplicável e Foro</h2>
            <p>
              Estes Termos são regidos pelas leis da República Federativa do Brasil. Para
              consumidores, aplicam-se as disposições do Código de Defesa do Consumidor. Fica
              eleito o foro da comarca do domicílio do consumidor para dirimir controvérsias,
              salvo hipóteses de competência absoluta.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">13. Contato</h2>
            <p>
              Para dúvidas sobre estes Termos de Uso, entre em contato através do e-mail
              contato@prontoja.com.br ou pelos canais disponíveis na plataforma.
            </p>
          </section>
        </div>

        <div className="mt-12 flex flex-wrap gap-4">
          <Link href="/" className="btn-secondary">
            Voltar ao início
          </Link>
          <Link href="/privacidade" className="btn-primary">
            Política de Privacidade
          </Link>
          <Link href="/como-funciona" className="btn-secondary">
            Como funciona
          </Link>
        </div>
      </main>
    </div>
  );
}
