"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Clock, Loader2, ArrowRight } from "lucide-react";

export default function StripeConnectRetornoPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "active" | "pending">("loading");

  useEffect(() => {
    checkStatus();
  }, []);

  async function checkStatus() {
    // Aguardar um pouco para o webhook processar
    await new Promise(r => setTimeout(r, 2000));

    const res = await fetch("/api/stripe/connect");
    const data = await res.json();

    if (data.status === "active") {
      setStatus("active");
    } else {
      setStatus("pending");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-white px-4">
      <div className="max-w-md w-full text-center">
        {status === "loading" && (
          <div>
            <Loader2 className="mx-auto h-16 w-16 animate-spin text-brand-500" />
            <h1 className="mt-6 text-2xl font-bold text-gray-900">Verificando conta...</h1>
            <p className="mt-2 text-gray-500">Aguarde enquanto confirmamos seu cadastro</p>
          </div>
        )}

        {status === "active" && (
          <div>
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Conta ativada com sucesso! 🎉</h1>
            <p className="mt-3 text-gray-600">
              Parabéns! Sua conta de pagamentos está ativa. Você já pode receber pelos seus serviços.
            </p>
            <div className="mt-4 rounded-xl bg-brand-50 p-4 text-sm text-brand-700">
              <p className="font-medium">✅ Pagamentos ativados</p>
              <p className="mt-1">Os valores serão transferidos em até 2 dias úteis após cada serviço concluído.</p>
            </div>
            <button
              onClick={() => router.push("/profissional/dashboard")}
              className="btn-primary mt-6 flex w-full items-center justify-center gap-2 py-3"
            >
              Ir para o dashboard <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {status === "pending" && (
          <div>
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
              <Clock className="h-10 w-10 text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Cadastro em análise</h1>
            <p className="mt-3 text-gray-600">
              Seus dados estão sendo verificados pelo Stripe. Você receberá uma notificação quando a conta for ativada.
            </p>
            <p className="mt-2 text-sm text-gray-500">Prazo: até 2 dias úteis</p>
            <button
              onClick={() => router.push("/profissional/stripe-connect")}
              className="btn-secondary mt-6 flex w-full items-center justify-center gap-2"
            >
              Ver status do cadastro
            </button>
            <button
              onClick={() => router.push("/profissional/oportunidades")}
              className="btn-primary mt-3 flex w-full items-center justify-center gap-2"
            >
              Explorar oportunidades <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
