"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, CheckCircle, AlertTriangle, ExternalLink, RefreshCw, CreditCard, Shield, Zap } from "lucide-react";
import { toast } from "sonner";

interface AccountStatus {
  status: "not_started" | "incomplete" | "pending_verification" | "active";
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  details_submitted?: boolean;
  requirements?: {
    currently_due?: string[];
    pending_verification?: string[];
  };
}

export default function StripeConnectPage() {
  return (
    <Suspense>
      <StripeConnectContent />
    </Suspense>
  );
}

function StripeConnectContent() {
  const params = useSearchParams();
  const isRefresh = params.get("refresh") === "true";
  const [status, setStatus] = useState<AccountStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    fetchStatus();
    if (isRefresh) toast.info("Continue o cadastro clicando em 'Retomar cadastro'.");
  }, []);

  async function fetchStatus() {
    setLoading(true);
    const res = await fetch("/api/stripe/connect");
    const data = await res.json();
    setStatus(data);
    setLoading(false);
  }

  async function startOnboarding() {
    setConnecting(true);
    try {
      const res = await fetch("/api/stripe/connect", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Erro ao iniciar cadastro");
      }
    } catch {
      toast.error("Erro de conexão");
    }
    setConnecting(false);
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Configurar recebimentos</h1>
        <p className="mt-1 text-gray-500">Conecte sua conta bancária para receber pelos seus serviços</p>
      </div>

      {/* Status atual */}
      {status?.status === "active" && (
        <div className="mb-6 flex items-start gap-4 rounded-2xl bg-green-50 border border-green-200 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h2 className="font-bold text-green-800">Conta ativa! ✅</h2>
            <p className="text-sm text-green-700 mt-1">
              Você está pronto para receber pagamentos. Os valores são transferidos automaticamente após a conclusão dos serviços.
            </p>
            <div className="mt-3 flex gap-4 text-sm">
              <span className="flex items-center gap-1.5 text-green-700">
                <CheckCircle className="h-4 w-4" /> Pagamentos ativados
              </span>
              <span className="flex items-center gap-1.5 text-green-700">
                <CheckCircle className="h-4 w-4" /> Saques ativados
              </span>
            </div>
          </div>
        </div>
      )}

      {status?.status === "pending_verification" && (
        <div className="mb-6 flex items-start gap-4 rounded-2xl bg-amber-50 border border-amber-200 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100">
            <RefreshCw className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <h2 className="font-bold text-amber-800">Em verificação</h2>
            <p className="text-sm text-amber-700 mt-1">
              Seus dados estão sendo verificados pelo Stripe. Isso pode levar de alguns minutos a 2 dias úteis.
            </p>
            {status.requirements?.pending_verification && status.requirements.pending_verification.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-medium text-amber-700">Aguardando verificação:</p>
                <ul className="mt-1 space-y-1">
                  {status.requirements.pending_verification.map(r => (
                    <li key={r} className="text-xs text-amber-600">• {r.replace(/_/g, " ")}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {(status?.status === "not_started" || status?.status === "incomplete") && (
        <div className="mb-6 flex items-start gap-4 rounded-2xl bg-red-50 border border-red-200 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h2 className="font-bold text-red-800">
              {status?.status === "not_started" ? "Cadastro não iniciado" : "Cadastro incompleto"}
            </h2>
            <p className="text-sm text-red-700 mt-1">
              {status?.status === "not_started"
                ? "Você precisa cadastrar uma conta bancária para receber pagamentos."
                : "Seu cadastro no Stripe está incompleto. Complete para começar a receber."}
            </p>
            {status?.requirements?.currently_due && status.requirements.currently_due.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-medium text-red-700">Dados pendentes:</p>
                <ul className="mt-1 space-y-1">
                  {status.requirements.currently_due.slice(0, 5).map(r => (
                    <li key={r} className="text-xs text-red-600">• {r.replace(/_/g, " ")}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Como funciona */}
      <div className="card p-6 mb-6">
        <h2 className="mb-4 font-semibold text-gray-900">Como funciona</h2>
        <div className="space-y-4">
          {[
            { icon: <Shield className="h-5 w-5" />, color: "bg-blue-100 text-blue-600", title: "Pagamentos seguros com Stripe", desc: "Processador líder mundial com criptografia e proteção antifraude." },
            { icon: <Zap className="h-5 w-5" />, color: "bg-brand-100 text-brand-600", title: "Receba 90% do valor", desc: "A plataforma retém apenas 10% de taxa. Você fica com 90% do serviço." },
            { icon: <CreditCard className="h-5 w-5" />, color: "bg-purple-100 text-purple-600", title: "Transferência automática", desc: "Após aprovação do serviço, o valor é transferido para sua conta em até 2 dias úteis." },
          ].map(item => (
            <div key={item.title} className="flex items-start gap-3">
              <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${item.color}`}>
                {item.icon}
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">{item.title}</p>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Documentos necessários */}
      <div className="card p-6 mb-6">
        <h2 className="mb-4 font-semibold text-gray-900">Documentos necessários</h2>
        <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
          {["CPF", "Data de nascimento", "Endereço residencial", "Conta bancária (PIX/TED)", "Número de celular"].map(doc => (
            <div key={doc} className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-brand-500 flex-shrink-0" />
              <span>{doc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Botão de ação */}
      <div className="flex gap-3">
        {status?.status === "active" ? (
          <button onClick={startOnboarding} className="btn-secondary flex items-center gap-2">
            <ExternalLink className="h-4 w-4" />
            Gerenciar conta Stripe
          </button>
        ) : (
          <button
            onClick={startOnboarding}
            disabled={connecting}
            className="btn-primary flex-1 flex items-center justify-center gap-2 py-3"
          >
            {connecting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Aguarde...</>
            ) : status?.status === "incomplete" ? (
              <><RefreshCw className="h-4 w-4" /> Retomar cadastro Stripe</>
            ) : (
              <><ExternalLink className="h-4 w-4" /> Iniciar cadastro no Stripe</>
            )}
          </button>
        )}
        <button onClick={fetchStatus} className="btn-secondary flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </button>
      </div>

      <p className="mt-4 text-center text-xs text-gray-400">
        Powered by{" "}
        <a href="https://stripe.com" target="_blank" rel="noopener noreferrer" className="underline">
          Stripe
        </a>
        . Seus dados financeiros são protegidos por criptografia bancária.
      </p>
    </div>
  );
}
