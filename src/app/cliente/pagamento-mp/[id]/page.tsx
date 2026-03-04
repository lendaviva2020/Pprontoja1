"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  Wallet,
  CreditCard,
  ShieldCheck,
  Info,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface CheckoutMP {
  preference_id: string;
  init_point: string;
  sandbox_init_point: string;
  payment_id: string;
  amount_cents: number;
  amount_brl: number;
  platform_fee_cents: number;
  platform_fee_brl: number;
  professional_payout_cents: number;
  professional_payout_brl: number;
  reused?: boolean;
}

interface JobInfo {
  id: string;
  title: string;
  status: string;
  agreed_price_cents: number;
  payment_status: string | null;
  professional: {
    full_name: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

const METODOS = [
  { icon: "💳", label: "Cartão de crédito" },
  { icon: "🏦", label: "Débito online" },
  { icon: "⚡", label: "PIX (aprovação imediata)" },
  { icon: "📄", label: "Boleto bancário" },
  { icon: "💰", label: "Saldo MercadoPago" },
];

export default function PagamentoMPPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;
  const supabase = createClient();

  const [jobInfo, setJobInfo] = useState<JobInfo | null>(null);
  const [checkout, setCheckout] = useState<CheckoutMP | null>(null);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyPaid, setAlreadyPaid] = useState(false);
  const [isSandbox, setIsSandbox] = useState(false);

  const initCheckout = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push(`/auth/login?redirectTo=/cliente/pagamento-mp/${jobId}`);
        return;
      }

      const { data: job, error: jobErr } = await supabase
        .from("jobs")
        .select(
          "id, title, status, agreed_price_cents, payment_status, professional:professional_id(full_name, display_name, avatar_url)"
        )
        .eq("id", jobId)
        .eq("client_id", user.id)
        .single();

      if (jobErr || !job) {
        setError("Serviço não encontrado ou sem permissão.");
        return;
      }

      if (
        job.payment_status === "captured" ||
        job.payment_status === "released" ||
        ["in_progress", "completed"].includes(job.status)
      ) {
        setAlreadyPaid(true);
        setJobInfo(job as unknown as JobInfo);
        return;
      }

      if (job.status !== "accepted") {
        setError(`Serviço no status '${job.status}' não pode ser pago agora.`);
        return;
      }

      if (!job.agreed_price_cents) {
        setError("O preço ainda não foi acordado com o profissional.");
        return;
      }

      setJobInfo(job as unknown as JobInfo);

      const res = await fetch("/api/mercadopago/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: jobId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }

      const data: CheckoutMP = await res.json();
      setCheckout(data);

      setIsSandbox(data.sandbox_init_point !== data.init_point);

      if (data.reused) {
        toast.info("Retomando pagamento anterior...", { duration: 2000 });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao preparar pagamento";
      console.error("[PagamentoMP]", err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [jobId, supabase, router]);

  useEffect(() => {
    if (jobId) initCheckout();
  }, [initCheckout, jobId]);

  function handlePay() {
    if (!checkout) return;
    setRedirecting(true);

    const checkoutUrl =
      process.env.NODE_ENV === "production"
        ? checkout.init_point
        : checkout.sandbox_init_point ?? checkout.init_point;

    window.location.href = checkoutUrl;
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-[#009EE3]" />
          <p className="mt-3 text-sm text-gray-500">Preparando pagamento seguro...</p>
        </div>
      </div>
    );
  }

  if (alreadyPaid && jobInfo) {
    return (
      <div className="max-w-md mx-auto mt-8">
        <div className="card p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-4">
            <ShieldCheck className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Já foi pago!</h2>
          <p className="text-gray-500 text-sm mb-5">
            O pagamento para <strong>{jobInfo.title}</strong> já foi processado.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => router.push(`/cliente/jobs/${jobInfo.id}`)}
              className="btn-primary flex-1"
            >
              Ver detalhes
            </button>
            <button
              onClick={() => router.push("/cliente/dashboard")}
              className="btn-secondary flex-1"
            >
              Meu painel
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-8">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-red-500 mb-3" />
          <h2 className="font-bold text-red-800 mb-1">Não foi possível iniciar</h2>
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => router.back()} className="btn-secondary flex items-center gap-1.5">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </button>
            <button onClick={initCheckout} className="btn-primary">
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!checkout || !jobInfo) return null;

  const professional = jobInfo.professional as { display_name?: string | null; full_name: string; avatar_url?: string | null } | null;
  const professionalName = professional?.display_name ?? professional?.full_name ?? "Profissional";

  const amountFormatted = (jobInfo.agreed_price_cents / 100)
    .toFixed(2)
    .replace(".", ",");
  const feeFormatted = checkout.platform_fee_brl.toFixed(2).replace(".", ",");
  const payoutFormatted = checkout.professional_payout_brl.toFixed(2).replace(".", ",");

  return (
    <div className="max-w-md mx-auto">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#009EE3] flex items-center justify-center shadow-sm">
            <Wallet className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Pagar com MercadoPago</h1>
            <p className="text-xs text-gray-400">Checkout seguro</p>
          </div>
        </div>
      </div>

      {isSandbox && (
        <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 p-3">
          <p className="text-xs font-medium text-amber-800">
            ⚠️ Modo sandbox — este pagamento não é real
          </p>
        </div>
      )}

      <div className="card p-5 mb-4">
        <h2 className="font-semibold text-gray-900 mb-4">Resumo do pedido</h2>

        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
          <div className="h-10 w-10 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
            {professional?.avatar_url ? (
              <img
                src={professional.avatar_url}
                alt={professionalName}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-gray-400 font-bold text-sm">
                {professionalName[0].toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800">{professionalName}</p>
            <p className="text-xs text-gray-500">{jobInfo.title}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Valor do serviço</span>
            <span className="font-semibold">R$ {amountFormatted}</span>
          </div>
          <div className="flex justify-between text-sm items-center">
            <span className="text-gray-500 flex items-center gap-1">
              Taxa de plataforma (10%)
              <span title="Taxa pela intermediação do serviço">
                <Info className="h-3.5 w-3.5 text-gray-400 cursor-help" />
              </span>
            </span>
            <span className="text-gray-500 text-xs">R$ {feeFormatted}</span>
          </div>
          <div className="flex justify-between text-sm border-t border-gray-100 pt-2 font-semibold">
            <span className="text-gray-700">Profissional recebe</span>
            <span className="text-green-700">R$ {payoutFormatted}</span>
          </div>
        </div>
      </div>

      <div className="card p-5 mb-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-[#009EE3]" />
          Formas de pagamento aceitas
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {METODOS.map((m) => (
            <div key={m.label} className="flex items-center gap-2 text-xs text-gray-600">
              <span>{m.icon}</span>
              <span>{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handlePay}
        disabled={redirecting}
        className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 font-bold text-white text-base transition-all shadow-md active:scale-[0.98] disabled:opacity-70"
        style={{ background: redirecting ? "#7bb8d4" : "#009EE3" }}
      >
        {redirecting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Abrindo MercadoPago...
          </>
        ) : (
          <>
            <ExternalLink className="h-5 w-5" />
            Pagar R$ {amountFormatted} com MercadoPago
          </>
        )}
      </button>

      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <ShieldCheck className="h-4 w-4 text-green-500" />
          Pagamento 100% seguro
        </span>
        <span>🔒 SSL/TLS</span>
        <span>PCI-DSS ✓</span>
      </div>

      <p className="text-center text-xs text-gray-400 mt-3">
        Você será redirecionado para o ambiente seguro do MercadoPago
      </p>
    </div>
  );
}
