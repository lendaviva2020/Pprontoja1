"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Loader2, Shield, ArrowLeft, CheckCircle, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface CheckoutData {
  client_secret: string;
  payment_intent_id: string;
  payment_id: string;
  amount_cents: number;
  platform_fee_cents: number;
  professional_payout_cents: number;
}

// ──────────────────────────────────────────
// Formulário interno (usa contexto Elements)
// ──────────────────────────────────────────
function CheckoutForm({
  data,
  jobTitle,
  onSuccess,
}: {
  data: CheckoutData;
  jobTitle: string;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setPaying(true);
    setError(null);

    const { error: submitErr } = await elements.submit();
    if (submitErr) {
      setError(submitErr.message ?? "Erro ao processar");
      setPaying(false);
      return;
    }

    const { error: confirmErr } = await stripe.confirmPayment({
      elements,
      clientSecret: data.client_secret,
      confirmParams: {
        return_url: `${window.location.origin}/cliente/pagamento/sucesso?payment_id=${data.payment_id}`,
      },
      redirect: "if_required",
    });

    if (confirmErr) {
      setError(confirmErr.message ?? "Pagamento recusado");
      setPaying(false);
      return;
    }

    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Resumo do pagamento */}
      <div className="rounded-xl bg-gray-50 p-4 space-y-2 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>Serviço</span>
          <span className="font-medium text-gray-900 max-w-[200px] text-right truncate">{jobTitle}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Taxa da plataforma (10%)</span>
          <span>{formatCurrency(data.platform_fee_cents)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Profissional recebe</span>
          <span className="text-brand-600">{formatCurrency(data.professional_payout_cents)}</span>
        </div>
        <div className="border-t pt-2 flex justify-between font-bold text-gray-900">
          <span>Total</span>
          <span className="text-lg">{formatCurrency(data.amount_cents)}</span>
        </div>
      </div>

      {/* Stripe Payment Element */}
      <div className="rounded-xl border border-gray-200 p-4">
        <PaymentElement
          options={{
            layout: "tabs",
            defaultValues: { billingDetails: { address: { country: "BR" } } },
          }}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-gray-400">
        <Shield className="h-4 w-4 text-green-500" />
        Pagamento protegido por criptografia SSL. Processado pelo Stripe.
      </div>

      <button
        type="submit"
        disabled={paying || !stripe || !elements}
        className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-base"
      >
        {paying ? (
          <><Loader2 className="h-5 w-5 animate-spin" /> Processando...</>
        ) : (
          <>Pagar {formatCurrency(data.amount_cents)}</>
        )}
      </button>
    </form>
  );
}

// ──────────────────────────────────────────
// Página principal
// ──────────────────────────────────────────
export default function PagamentoPage() {
  const { id: jobId } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [jobTitle, setJobTitle] = useState("");
  const [paid, setPaid] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    initCheckout();
  }, [jobId]);

  async function initCheckout() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/auth/login"); return; }

      // Buscar title do job
      const { data: job } = await supabase
        .from("jobs")
        .select("title, agreed_price_cents, payment_status")
        .eq("id", jobId)
        .single();

      if (job?.payment_status === "captured") {
        setPaid(true);
        setLoading(false);
        return;
      }

      setJobTitle(job?.title ?? "");

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ job_id: jobId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setCheckoutData(data);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleSuccess() {
    setPaid(true);
    toast.success("Pagamento realizado com sucesso!");
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-brand-500" />
      </div>
    );
  }

  if (paid) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Pagamento confirmado!</h1>
          <p className="mt-2 text-gray-500">
            O profissional foi notificado e pode iniciar o serviço.
          </p>
          <button
            onClick={() => router.push(`/cliente/jobs/${jobId}`)}
            className="btn-primary mt-6 w-full py-2.5"
          >
            Ver detalhes do serviço
          </button>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-sm text-center">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-400" />
          <h1 className="text-xl font-bold text-gray-900">Erro ao criar pagamento</h1>
          <p className="mt-2 text-sm text-gray-500">{err}</p>
          <button onClick={() => router.back()} className="btn-secondary mt-4 flex items-center gap-2 mx-auto">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Finalizar pagamento</h1>
          <p className="text-sm text-gray-500">Pagamento seguro via Stripe</p>
        </div>
      </div>

      <div className="card p-6">
        {checkoutData && (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret: checkoutData.client_secret,
              appearance: {
                theme: "stripe",
                variables: {
                  colorPrimary: "#16a34a",
                  borderRadius: "8px",
                  fontFamily: "Inter, system-ui, sans-serif",
                },
              },
              locale: "pt-BR",
            }}
          >
            <CheckoutForm
              data={checkoutData}
              jobTitle={jobTitle}
              onSuccess={handleSuccess}
            />
          </Elements>
        )}
      </div>
    </div>
  );
}
