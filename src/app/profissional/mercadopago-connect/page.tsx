"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Loader2,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  CreditCard,
  Shield,
  Zap,
  Clock,
  XCircle,
  Wallet,
  Link2,
  Link2Off,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface ConnectStatus {
  status: "not_connected" | "connected" | "disconnected" | "error";
  is_connected: boolean;
  token_expired: boolean;
  mp_account_id: string | null;
  mp_nickname: string | null;
  mp_email: string | null;
  mp_live_mode: boolean;
  mp_connected_at: string | null;
}

function translateError(error: string): string {
  const map: Record<string, string> = {
    cancelled: "Autorização cancelada. Tente novamente.",
    missing_params: "Parâmetros inválidos na URL. Tente novamente.",
    invalid_state: "Sessão inválida. Por favor, tente novamente.",
    state_expired: "Sessão expirada. Inicie o processo novamente.",
    token_exchange_failed: "Falha ao conectar com o MercadoPago. Tente novamente.",
    save_failed: "Erro ao salvar os dados. Tente novamente.",
    not_connected: "Conta não conectada.",
  };
  return map[error] ?? "Ocorreu um erro. Tente novamente.";
}

function StatusBadge({ status }: { status: ConnectStatus }) {
  const configs = {
    connected: {
      bg: "bg-green-50 border-green-200",
      icon: <CheckCircle className="h-7 w-7 text-green-600" />,
      iconBg: "bg-green-100",
      title: "Conta conectada ✅",
      color: "text-green-800",
      descColor: "text-green-700",
    },
    not_connected: {
      bg: "bg-gray-50 border-gray-200",
      icon: <AlertTriangle className="h-7 w-7 text-gray-500" />,
      iconBg: "bg-gray-100",
      title: "Conta não conectada",
      color: "text-gray-700",
      descColor: "text-gray-600",
    },
    disconnected: {
      bg: "bg-amber-50 border-amber-200",
      icon: <Link2Off className="h-7 w-7 text-amber-600" />,
      iconBg: "bg-amber-100",
      title: "Conta desconectada",
      color: "text-amber-800",
      descColor: "text-amber-700",
    },
    error: {
      bg: "bg-red-50 border-red-200",
      icon: <XCircle className="h-7 w-7 text-red-600" />,
      iconBg: "bg-red-100",
      title: "Erro na conexão",
      color: "text-red-800",
      descColor: "text-red-700",
    },
  };

  const c = configs[status.status] ?? configs.not_connected;

  return (
    <div className={cn("flex items-start gap-4 rounded-2xl border p-5", c.bg)}>
      <div className={cn("flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl", c.iconBg)}>
        {c.icon}
      </div>

      <div className="flex-1 min-w-0">
        <h2 className={cn("font-bold text-lg", c.color)}>{c.title}</h2>

        {status.is_connected && status.mp_nickname && (
          <p className={cn("text-sm mt-0.5 font-medium", c.descColor)}>
            @{status.mp_nickname}
            {status.mp_email && (
              <span className="font-normal opacity-75"> · {status.mp_email}</span>
            )}
          </p>
        )}

        {status.token_expired && (
          <p className={cn("text-sm mt-1", c.descColor)}>
            ⚠️ Token expirado — reconecte sua conta para continuar recebendo.
          </p>
        )}

        {!status.mp_live_mode && status.is_connected && (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-200 px-2.5 py-0.5 text-xs font-medium text-amber-800">
            <AlertTriangle className="h-3 w-3" />
            Modo sandbox — sem cobranças reais
          </div>
        )}

        {status.mp_connected_at && (
          <p className={cn("text-xs mt-1.5 opacity-60", c.descColor)}>
            Conectado em{" "}
            {new Date(status.mp_connected_at).toLocaleDateString("pt-BR")}
          </p>
        )}
      </div>
    </div>
  );
}

function MPConnectContent() {
  const searchParams = useSearchParams();
  const successParam = searchParams.get("success");
  const errorParam = searchParams.get("error");

  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/mercadopago/connect");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ConnectStatus = await res.json();
      setStatus(data);
    } catch {
      toast.error("Erro ao buscar status da conta");
      setStatus({
        status: "error",
        is_connected: false,
        token_expired: false,
        mp_account_id: null,
        mp_nickname: null,
        mp_email: null,
        mp_live_mode: false,
        mp_connected_at: null,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();

    if (successParam === "true") {
      toast.success("🎉 MercadoPago conectado com sucesso!");
    }

    if (errorParam) {
      toast.error(translateError(errorParam), { duration: 5000 });
    }
  }, [fetchStatus, successParam, errorParam]);

  async function handleDisconnect() {
    if (!confirm("Tem certeza que deseja desconectar sua conta MercadoPago?")) return;
    setDisconnecting(true);
    try {
      const res = await fetch("/api/mercadopago/connect", { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchStatus();
      toast.success("Conta desconectada");
    } catch {
      toast.error("Erro ao desconectar");
    } finally {
      setDisconnecting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-brand-500" />
          <p className="mt-3 text-sm text-gray-500">Verificando conta...</p>
        </div>
      </div>
    );
  }

  const isConnected = status?.is_connected && !status.token_expired;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Configurar MercadoPago
          </h1>
          <p className="text-gray-500 mt-1">
            Conecte sua conta para receber pagamentos pelo app
          </p>
        </div>
        <div className="flex-shrink-0 ml-4">
          <div className="h-12 w-12 rounded-xl bg-[#009EE3] flex items-center justify-center shadow-sm">
            <Wallet className="h-6 w-6 text-white" />
          </div>
        </div>
      </div>

      {status && <StatusBadge status={status} />}

      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Como funciona</h2>
        <div className="space-y-4">
          {[
            {
              icon: <Shield className="h-5 w-5" />,
              color: "bg-blue-100 text-blue-600",
              title: "Pagamentos seguros com MercadoPago",
              desc: "Processador líder na América Latina com proteção antifraude e conformidade PCI-DSS.",
            },
            {
              icon: <Zap className="h-5 w-5" />,
              color: "bg-[#009EE3]/10 text-[#009EE3]",
              title: "Receba 90% do valor",
              desc: "A plataforma retém 10% de taxa. Você fica com 90% de cada serviço concluído.",
            },
            {
              icon: <CreditCard className="h-5 w-5" />,
              color: "bg-purple-100 text-purple-600",
              title: "Múltiplas formas de pagamento",
              desc: "Clientes podem pagar com cartão (crédito/débito), PIX, boleto e saldo MP.",
            },
            {
              icon: <Clock className="h-5 w-5" />,
              color: "bg-green-100 text-green-600",
              title: "Transferência automática",
              desc: "Após aprovação do serviço, os valores ficam disponíveis na sua conta MP conforme calendário de repasse.",
            },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3">
              <div className={cn("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl", item.color)}>
                {item.icon}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                <p className="text-sm text-gray-500 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {!isConnected && (
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">O que você vai precisar</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: "🪪", label: "CPF ou CNPJ" },
              { icon: "📱", label: "Celular verificado" },
              { icon: "📧", label: "E-mail cadastrado no MP" },
              { icon: "🏦", label: "Conta criada no MercadoPago" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-sm text-gray-600">
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl bg-blue-50 border border-blue-100 p-3">
            <p className="text-xs text-blue-700">
              💡 Não tem conta no MercadoPago?{" "}
              <a
                href="https://www.mercadopago.com.br/registration-mp"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium"
              >
                Crie gratuitamente aqui
              </a>
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        {isConnected ? (
          <>
            <a
              href="https://www.mercadopago.com.br/activities"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary flex flex-1 items-center justify-center gap-2 py-3"
            >
              <ExternalLink className="h-4 w-4" />
              Ver minha conta MP
            </a>
            <Link
              href="/profissional/financeiro"
              className="btn-secondary flex items-center justify-center gap-2"
            >
              Ver ganhos
            </Link>
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors"
            >
              {disconnecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Link2Off className="h-4 w-4" />
              )}
              Desconectar
            </button>
          </>
        ) : (
          <a
            href="/api/mercadopago/oauth"
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold text-white transition-all shadow-sm",
              "bg-[#009EE3] hover:bg-[#0087c5] active:scale-[0.98]"
            )}
          >
            <Link2 className="h-5 w-5" />
            {status?.status === "disconnected"
              ? "Reconectar MercadoPago"
              : "Conectar MercadoPago"}
          </a>
        )}

        <button
          onClick={fetchStatus}
          disabled={loading}
          className="btn-secondary flex items-center justify-center gap-2"
          title="Atualizar status"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Atualizar
        </button>
      </div>

      {status?.is_connected && !status.mp_live_mode && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
          <p className="text-sm font-medium text-amber-800 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            Ambiente de testes ativo
          </p>
          <p className="text-xs text-amber-700 mt-1">
            Sua conta está em modo sandbox. Os pagamentos não são reais. Para
            ativar o modo produção, configure suas credenciais de produção.
          </p>
        </div>
      )}

      <p className="text-center text-xs text-gray-400">
        Powered by{" "}
        <a
          href="https://www.mercadopago.com.br"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-gray-600"
        >
          MercadoPago
        </a>
        . Todos os dados financeiros são processados com segurança.
      </p>
    </div>
  );
}

export default function MPConnectPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-brand-500" />
        </div>
      }
    >
      <MPConnectContent />
    </Suspense>
  );
}
