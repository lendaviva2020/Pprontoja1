"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle, ArrowRight, Star } from "lucide-react";
import Link from "next/link";

function SucessoContent() {
  const params = useSearchParams();
  const router = useRouter();
  const jobId = params.get("job_id");
  const paymentId = params.get("payment_id");

  useEffect(() => {
    const timer = setTimeout(() => {
      if (jobId) router.push(`/cliente/jobs/${jobId}`);
      else router.push("/cliente/dashboard");
    }, 8000);
    return () => clearTimeout(timer);
  }, [jobId, router]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="card p-8 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 mb-6 animate-pulse">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Pagamento aprovado! 🎉
          </h1>
          <p className="text-gray-500 mb-6">
            O profissional foi notificado e o serviço está em andamento.
          </p>

          {paymentId && (
            <div className="rounded-xl bg-gray-50 p-3 mb-6 text-xs text-gray-500 break-all">
              ID do pagamento: <span className="font-mono font-medium">{paymentId}</span>
            </div>
          )}

          <div className="space-y-3 text-left mb-6">
            {[
              { num: "1", text: "O profissional foi notificado e iniciará o serviço" },
              { num: "2", text: "Acompanhe o andamento no seu painel" },
              { num: "3", text: "Após a conclusão, avalie o profissional" },
            ].map((step) => (
              <div key={step.num} className="flex items-center gap-3">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">
                  {step.num}
                </div>
                <span className="text-sm text-gray-600">{step.text}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            {jobId && (
              <Link
                href={`/cliente/jobs/${jobId}`}
                className="btn-primary flex items-center justify-center gap-2"
              >
                Acompanhar serviço
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
            <Link
              href="/cliente/dashboard"
              className="btn-secondary flex items-center justify-center gap-2"
            >
              Ir ao meu painel
            </Link>
          </div>

          <p className="text-xs text-gray-400 mt-4">
            Redirecionando automaticamente em alguns segundos...
          </p>
        </div>

        <div className="mt-4 rounded-2xl bg-amber-50 border border-amber-100 p-4 text-center">
          <Star className="mx-auto h-5 w-5 text-amber-500 mb-1" />
          <p className="text-sm text-amber-800 font-medium">
            Lembre-se de avaliar o profissional após o serviço!
          </p>
          <p className="text-xs text-amber-600 mt-0.5">
            Sua avaliação ajuda outros clientes a encontrar profissionais de confiança.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PagamentoSucessoPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
        </div>
      }
    >
      <SucessoContent />
    </Suspense>
  );
}
