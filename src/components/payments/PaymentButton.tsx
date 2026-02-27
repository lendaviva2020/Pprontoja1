"use client";

import { useState } from "react";
import { Loader2, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

interface Props {
  jobId: string;
  amount: number;
}

export default function PaymentButton({ jobId, amount }: Props) {
  const [loading, setLoading] = useState(false);

  async function handlePay() {
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("supabase.auth.token") || ""}`,
          },
          body: JSON.stringify({ job_id: jobId, gateway: "stripe" }),
        }
      );

      // Pegar token de session do Supabase
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const res2 = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ job_id: jobId, gateway: "stripe" }),
        }
      );

      if (!res2.ok) {
        const err = await res2.json();
        throw new Error(err.error || "Erro ao criar pagamento");
      }

      const data = await res2.json();

      if (data.client_secret) {
        // Redirecionar para página de checkout Stripe
        window.location.href = `/cliente/pagamento/${jobId}?secret=${data.client_secret}&payment_id=${data.payment_id}`;
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao processar pagamento");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handlePay}
      disabled={loading}
      className="btn-primary flex items-center gap-2 text-sm"
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <CreditCard className="h-3 w-3" />}
      Pagar {formatCurrency(amount)}
    </button>
  );
}
