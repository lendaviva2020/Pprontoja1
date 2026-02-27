"use client";

import { useState } from "react";
import { RotateCcw, Loader2, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function RefundButton({ paymentId, maxAmount }: { paymentId: string; maxAmount: number }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState((maxAmount / 100).toFixed(2));
  const [reason, setReason] = useState("requested_by_customer");
  const [internalReason, setInternalReason] = useState("");
  const router = useRouter();

  async function refund() {
    const amountCents = Math.round(parseFloat(amount) * 100);
    if (amountCents <= 0 || amountCents > maxAmount) {
      toast.error("Valor inválido");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment_id: paymentId,
          amount_cents: amountCents,
          reason,
          internal_reason: internalReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Estorno processado com sucesso!");
      setOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    }
    setLoading(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 rounded-lg bg-orange-50 px-2.5 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-100 transition-colors"
      >
        <RotateCcw className="h-3 w-3" />
        Estornar
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Processar Estorno</h3>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor a estornar (máx. {formatCurrency(maxAmount)})
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={(maxAmount / 100).toFixed(2)}
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="input-field pl-9"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo (Stripe)</label>
                <select
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="input-field"
                >
                  <option value="requested_by_customer">Solicitado pelo cliente</option>
                  <option value="fraudulent">Fraude</option>
                  <option value="duplicate">Cobrança duplicada</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observação interna (auditoria)
                </label>
                <textarea
                  value={internalReason}
                  onChange={e => setInternalReason(e.target.value)}
                  placeholder="Descreva o motivo do estorno..."
                  rows={3}
                  className="input-field resize-none"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button onClick={() => setOpen(false)} className="btn-secondary flex-1">
                Cancelar
              </button>
              <button
                onClick={refund}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                Confirmar Estorno
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
