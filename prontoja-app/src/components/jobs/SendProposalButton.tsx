"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Send, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

const schema = z.object({
  price_cents: z.coerce.number().min(1, "Informe o valor"),
  description: z.string().min(20, "Descreva sua proposta (mín. 20 caracteres)"),
  estimated_hours: z.coerce.number().min(0.5).optional(),
  available_date: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

interface Props {
  jobId: string;
  jobTitle: string;
  budgetMax: number | null;
}

export default function SendProposalButton({ jobId, jobTitle, budgetMax }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Faça login primeiro"); return; }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 3); // expira em 3 dias

    const { error } = await supabase.from("proposals").insert({
      job_id: jobId,
      professional_id: user.id,
      price_cents: Math.round(data.price_cents * 100),
      description: data.description,
      estimated_hours: data.estimated_hours || null,
      available_date: data.available_date || null,
      status: "pending",
      expires_at: expiresAt.toISOString(),
    });

    if (error) {
      toast.error("Erro ao enviar proposta: " + error.message);
      return;
    }

    // Atualizar status do job
    await supabase.from("jobs")
      .update({ status: "proposal_received" })
      .eq("id", jobId)
      .eq("status", "open");

    toast.success("Proposta enviada com sucesso!");
    reset();
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-primary flex items-center gap-1.5 text-sm whitespace-nowrap"
      >
        <Send className="h-3.5 w-3.5" />
        Enviar proposta
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md card p-6 relative">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="mb-1 text-lg font-bold text-gray-900">Enviar proposta</h2>
            <p className="mb-5 text-sm text-gray-500 truncate">{jobTitle}</p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Seu preço (R$) <span className="text-red-500">*</span>
                  {budgetMax && (
                    <span className="ml-2 text-xs text-gray-400">orçamento: até {formatCurrency(budgetMax)}</span>
                  )}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  className="input-field"
                  placeholder="150,00"
                  {...register("price_cents")}
                />
                {errors.price_cents && <p className="mt-1 text-xs text-red-500">{errors.price_cents.message}</p>}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Descrição da proposta <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  className="input-field resize-none"
                  placeholder="Explique como você fará o serviço, sua experiência, materiais incluídos..."
                  {...register("description")}
                />
                {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Horas estimadas</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    className="input-field"
                    placeholder="2"
                    {...register("estimated_hours")}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Disponível em</label>
                  <input
                    type="date"
                    className="input-field"
                    min={new Date().toISOString().split("T")[0]}
                    {...register("available_date")}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="btn-secondary flex-1">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Enviar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
