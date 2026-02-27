"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

interface Props {
  proposalId: string;
  jobId: string;
  price: number;
}

export default function AcceptProposalButton({ proposalId, jobId, price }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function accept() {
    if (!confirm(`Aceitar proposta de ${formatCurrency(price)}?`)) return;
    setLoading(true);

    // Aceitar proposta
    const { error: propError } = await supabase
      .from("proposals")
      .update({ status: "accepted", client_response_at: new Date().toISOString() })
      .eq("id", proposalId);

    if (propError) {
      toast.error("Erro ao aceitar proposta");
      setLoading(false);
      return;
    }

    // Rejeitar outras propostas
    await supabase
      .from("proposals")
      .update({ status: "rejected" })
      .eq("job_id", jobId)
      .neq("id", proposalId);

    // Buscar professional_id
    const { data: proposal } = await supabase
      .from("proposals")
      .select("professional_id")
      .eq("id", proposalId)
      .single();

    // Atualizar job
    await supabase
      .from("jobs")
      .update({
        status: "accepted",
        professional_id: proposal?.professional_id,
        agreed_price_cents: price,
      })
      .eq("id", jobId);

    toast.success("Proposta aceita! Agora faça o pagamento para confirmar.");
    router.refresh();
    setLoading(false);
  }

  return (
    <button
      onClick={accept}
      disabled={loading}
      className="btn-primary flex items-center gap-2 text-sm"
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
      Aceitar proposta
    </button>
  );
}
