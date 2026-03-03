"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Clock, RefreshCw, AlertCircle } from "lucide-react";
import Link from "next/link";

function PendenteContent() {
  const params = useSearchParams();
  const router = useRouter();
  const jobId = params.get("job_id");

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="card p-8 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 mb-6">
            <Clock className="h-10 w-10 text-amber-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Pagamento em processamento
          </h1>
          <p className="text-gray-500 mb-6">
            Seu pagamento foi recebido e está sendo processado pelo MercadoPago.
            Pode levar de alguns minutos a 2 dias úteis.
          </p>

          <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 text-left mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">O que acontece agora?</p>
                <ul className="space-y-1 text-xs text-amber-700">
                  <li>• O MercadoPago está analisando o pagamento</li>
                  <li>• Você será notificado por e-mail quando aprovado</li>
                  <li>• O profissional será acionado após a aprovação</li>
                  <li>• Pagamentos por boleto levam até 3 dias úteis</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.refresh()}
              className="btn-primary flex items-center justify-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Verificar status
            </button>
            {jobId && (
              <Link
                href={`/cliente/jobs/${jobId}`}
                className="btn-secondary"
              >
                Ver detalhes do serviço
              </Link>
            )}
            <Link href="/cliente/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
              Ir ao meu painel
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PagamentoPendentePage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
        </div>
      }
    >
      <PendenteContent />
    </Suspense>
  );
}
