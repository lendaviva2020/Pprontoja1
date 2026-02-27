import { createServiceClient } from "@/lib/supabase/service";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { AlertTriangle, Clock, CheckCircle } from "lucide-react";
import Link from "next/link";
import DisputeActionButton from "@/components/admin/DisputeActionButton";

export default async function AdminDisputasPage() {
  const supabase = createServiceClient();

  const { data: disputes } = await supabase
    .from("disputes")
    .select(`
      id, type, reason, status, amount_cents, description,
      created_at, resolved_at, evidence_due_by,
      gateway_dispute_id,
      job:job_id ( title, status ),
      opened_by_user:opened_by ( full_name )
    `)
    .order("created_at", { ascending: false })
    .limit(50);

  const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    open: {
      label: "Aberta",
      color: "bg-red-100 text-red-700 border border-red-200",
      icon: <AlertTriangle className="h-3 w-3" />,
    },
    under_review: {
      label: "Em análise",
      color: "bg-amber-100 text-amber-700 border border-amber-200",
      icon: <Clock className="h-3 w-3" />,
    },
    resolved_pro_platform: {
      label: "Resolvida (plataforma)",
      color: "bg-green-100 text-green-700 border border-green-200",
      icon: <CheckCircle className="h-3 w-3" />,
    },
    resolved_pro_client: {
      label: "Resolvida (cliente)",
      color: "bg-blue-100 text-blue-700 border border-blue-200",
      icon: <CheckCircle className="h-3 w-3" />,
    },
    closed: {
      label: "Fechada",
      color: "bg-gray-100 text-gray-600",
      icon: null,
    },
  };

  const open = disputes?.filter(d => d.status === "open") ?? [];
  const underReview = disputes?.filter(d => d.status === "under_review") ?? [];
  const resolved = disputes?.filter(d => ["resolved_pro_platform", "resolved_pro_client", "closed"].includes(d.status)) ?? [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gestão de Disputas</h1>
        <p className="text-gray-500 mt-1">Chargebacks, contestações e mediações</p>
      </div>

      {/* Sumário */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        {[
          { label: "Abertas", count: open.length, amount: open.reduce((s, d) => s + d.amount_cents, 0), color: "text-red-600", bg: "bg-red-50" },
          { label: "Em análise", count: underReview.length, amount: underReview.reduce((s, d) => s + d.amount_cents, 0), color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Resolvidas", count: resolved.length, amount: resolved.reduce((s, d) => s + d.amount_cents, 0), color: "text-green-600", bg: "bg-green-50" },
        ].map(s => (
          <div key={s.label} className={cn("card p-4", s.bg)}>
            <p className={cn("text-2xl font-bold", s.color)}>{s.count}</p>
            <p className="text-sm text-gray-600">{s.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{formatCurrency(s.amount)}</p>
          </div>
        ))}
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {disputes?.map(dispute => {
          const config = STATUS_CONFIG[dispute.status] ?? STATUS_CONFIG.closed;
          const dueBy = dispute.evidence_due_by ? new Date(dispute.evidence_due_by) : null;
          const daysLeft = dueBy ? Math.ceil((dueBy.getTime() - Date.now()) / 86400000) : null;
          const job = Array.isArray(dispute.job) ? dispute.job[0] : dispute.job as any;
          const openedBy = Array.isArray(dispute.opened_by_user) ? dispute.opened_by_user[0] : dispute.opened_by_user as any;

          return (
            <div key={dispute.id} className={cn("card p-5", dispute.status === "open" && "border-l-4 border-red-400")}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn("flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", config.color)}>
                      {config.icon}
                      {config.label}
                    </span>
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                      {dispute.type === "chargeback" ? "Chargeback" : dispute.type}
                    </span>
                    {daysLeft !== null && daysLeft >= 0 && (
                      <span className={cn("text-xs font-medium", daysLeft <= 3 ? "text-red-600" : "text-amber-600")}>
                        ⏰ {daysLeft}d para prazo de evidências
                      </span>
                    )}
                    {daysLeft !== null && daysLeft < 0 && (
                      <span className="text-xs text-gray-400">Prazo expirado</span>
                    )}
                  </div>

                  <p className="mt-2 font-medium text-gray-900 truncate">
                    Serviço: {job?.title || "N/A"}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5 truncate">
                    {dispute.description}
                  </p>

                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                    <span>Motivo: {dispute.reason}</span>
                    {openedBy?.full_name && <span>Cliente: {openedBy.full_name}</span>}
                    <span>{new Date(dispute.created_at).toLocaleDateString("pt-BR")}</span>
                    {dispute.gateway_dispute_id && (
                      <span className="font-mono">{dispute.gateway_dispute_id.slice(0, 12)}…</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(dispute.amount_cents)}</p>
                  {["open", "under_review"].includes(dispute.status) && (
                    <DisputeActionButton disputeId={dispute.id} currentStatus={dispute.status} />
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {disputes?.length === 0 && (
          <div className="card p-12 text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-400 mb-3" />
            <h3 className="font-semibold text-gray-700">Nenhuma disputa!</h3>
            <p className="text-sm text-gray-400 mt-1">Todas as transações estão em ordem.</p>
          </div>
        )}
      </div>
    </div>
  );
}
