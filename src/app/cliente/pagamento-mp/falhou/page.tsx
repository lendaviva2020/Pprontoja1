"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { XCircle, RefreshCw, ArrowLeft, HelpCircle } from "lucide-react";
import Link from "next/link";

function translateReason(reason: string | null): string {
  const map: Record<string, string> = {
    cc_rejected_insufficient_amount: "Saldo insuficiente no cartão",
    cc_rejected_bad_filled_card_number: "Número do cartão inválido",
    cc_rejected_bad_filled_date: "Data de vencimento inválida",
    cc_rejected_bad_filled_security_code: "Código de segurança incorreto",
    cc_rejected_call_for_authorize: "Pagamento requer autorização do banco",
    cc_rejected_card_disabled: "Cartão bloqueado. Entre em contato com seu banco",
    cc_rejected_duplicated_payment: "Pagamento duplicado detectado",
    cc_rejected_high_risk: "Pagamento recusado por suspeita de fraude",
    cc_rejected_max_attempts: "Número máximo de tentativas atingido",
    cc_rejected_other_reason: "Pagamento recusado pelo banco",
  };
  return map[reason ?? ""] ?? "O pagamento não foi aprovado. Tente outro método.";
}

function FalhaContent() {
  const params = useSearchParams();
  const router = useRouter();
  const jobId = params.get("job_id");
  const reason = params.get("reason");

  const errorMessage = translateReason(reason);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="card p-8 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100 mb-6">
            <XCircle className="h-10 w-10 text-red-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Pagamento não aprovado
          </h1>
          <p className="text-gray-500 mb-2">{errorMessage}</p>

          <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-left mb-6">
            <div className="flex items-start gap-3">
              <HelpCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-800 mb-1">O que você pode fazer:</p>
                <ul className="space-y-1 text-xs text-blue-700">
                  <li>• Verifique os dados do cartão e tente novamente</li>
                  <li>• Tente com outro cartão ou forma de pagamento</li>
                  <li>• Use o saldo da sua conta MercadoPago</li>
                  <li>• Tente pagar com PIX (aprovação imediata)</li>
                  <li>• Entre em contato com seu banco se o problema persistir</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {jobId && (
              <button
                onClick={() => router.push(`/cliente/pagamento-mp/${jobId}`)}
                className="btn-primary flex items-center justify-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Tentar novamente
              </button>
            )}
            <button
              onClick={() => router.back()}
              className="btn-secondary flex items-center justify-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>
            <Link
              href="/cliente/dashboard"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Ir ao meu painel
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PagamentoFalhouPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-500 border-t-transparent" />
        </div>
      }
    >
      <FalhaContent />
    </Suspense>
  );
}
