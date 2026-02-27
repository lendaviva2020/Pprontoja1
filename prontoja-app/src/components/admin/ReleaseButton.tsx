"use client";

import { useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function ReleaseButton({ paymentId, amount }: { paymentId: string; amount: number }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function release() {
    if (!confirm(`Liberar ${formatCurrency(amount)} para o profissional?\nEssa ação não pode ser desfeita.`)) return;
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/release-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_id: paymentId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`${formatCurrency(amount)} liberados com sucesso!`);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    }
    setLoading(false);
  }

  return (
    <button
      onClick={release}
      disabled={loading}
      className="flex items-center gap-1 rounded-lg bg-brand-50 px-2.5 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100 transition-colors disabled:opacity-50"
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
      Liberar
    </button>
  );
}
