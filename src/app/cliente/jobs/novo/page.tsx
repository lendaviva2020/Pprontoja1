"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Loader2, MapPin, Calendar, DollarSign, Camera } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ServiceCatalog } from "@/types/database";

const STEPS = ["Serviço", "Local & Data", "Orçamento", "Confirmar"];

const schema = z.object({
  service_catalog_id: z.string().optional(),
  title: z.string().min(5, "Descreva melhor o serviço"),
  description: z.string().min(20, "Adicione mais detalhes (mín. 20 caracteres)"),
  address_line: z.string().min(5, "Informe o endereço"),
  address_city: z.string().min(2, "Informe a cidade"),
  address_state: z.string().length(2, "Use a sigla do estado (ex: SP)"),
  address_zip: z.string().optional(),
  scheduled_at: z.string().optional(),
  budget_min_cents: z.coerce.number().min(0).optional(),
  budget_max_cents: z.coerce.number().min(1, "Informe o orçamento máximo"),
});
type FormData = z.infer<typeof schema>;

export default function NovoJobPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(0);
  const [services, setServices] = useState<ServiceCatalog[]>([]);
  const [selectedService, setSelectedService] = useState<ServiceCatalog | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, setValue, watch, trigger, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onChange",
  });

  useEffect(() => {
    supabase.from("services_catalog")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => setServices(data || []));
  }, []);

  const categories = [...new Set(services.map(s => s.category))];

  async function nextStep() {
    let valid = false;
    if (step === 0) valid = await trigger(["title", "description"]);
    else if (step === 1) valid = await trigger(["address_line", "address_city", "address_state"]);
    else if (step === 2) valid = await trigger(["budget_max_cents"]);
    else valid = true;

    if (valid) setStep(s => Math.min(s + 1, STEPS.length - 1));
  }

  async function onSubmit(data: FormData) {
    setIsSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }

    const { data: job, error } = await supabase.from("jobs").insert({
      client_id: user.id,
      service_catalog_id: data.service_catalog_id || null,
      title: data.title,
      description: data.description,
      address_line: data.address_line,
      address_city: data.address_city,
      address_state: data.address_state,
      address_zip: data.address_zip || null,
      scheduled_at: data.scheduled_at || null,
      budget_min_cents: data.budget_min_cents ? Math.round(Number(data.budget_min_cents) * 100) : null,
      budget_max_cents: Math.round(Number(data.budget_max_cents) * 100),
      status: "open",
    }).select().single();

    if (error) {
      toast.error("Erro ao criar pedido: " + error.message);
      setIsSubmitting(false);
      return;
    }
    toast.success("Pedido criado! Profissionais serão notificados.");
    router.push(`/cliente/jobs/${job.id}`);
  }

  const titleWatch = watch("title");

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center gap-4">
        <button onClick={() => step > 0 ? setStep(s => s - 1) : router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Solicitar serviço</h1>
          <p className="text-sm text-gray-500">Passo {step + 1} de {STEPS.length}: {STEPS[step]}</p>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-8 flex gap-1">
        {STEPS.map((_, i) => (
          <div key={i} className={cn("h-1.5 flex-1 rounded-full transition-colors", i <= step ? "bg-brand-500" : "bg-gray-200")} />
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Step 0: Serviço */}
        {step === 0 && (
          <div className="card p-6 space-y-5">
            <div>
              <h2 className="mb-4 font-semibold text-gray-900">Qual serviço você precisa?</h2>
              {categories.map(cat => (
                <div key={cat} className="mb-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-400">{cat}</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {services.filter(s => s.category === cat).map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setSelectedService(s);
                          setValue("service_catalog_id", s.id);
                          setValue("title", s.name);
                        }}
                        className={cn(
                          "rounded-xl border-2 p-3 text-left transition-all",
                          selectedService?.id === s.id
                            ? "border-brand-500 bg-brand-50"
                            : "border-gray-200 hover:border-gray-300"
                        )}
                      >
                        <div className="text-xl mb-1">{s.icon_name || "🔧"}</div>
                        <div className="text-sm font-medium text-gray-900">{s.name}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Título do serviço <span className="text-red-500">*</span>
              </label>
              <input
                className="input-field"
                placeholder="Ex: Instalação de tomada na sala"
                {...register("title")}
              />
              {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Descrição detalhada <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                className="input-field resize-none"
                placeholder="Descreva o que precisa ser feito, tamanho do ambiente, materiais disponíveis..."
                {...register("description")}
              />
              {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>}
            </div>
          </div>
        )}

        {/* Step 1: Local & Data */}
        {step === 1 && (
          <div className="card p-6 space-y-5">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5 text-brand-600" />
              <h2 className="font-semibold text-gray-900">Onde será o serviço?</h2>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Endereço <span className="text-red-500">*</span></label>
              <input className="input-field" placeholder="Rua, número, complemento" {...register("address_line")} />
              {errors.address_line && <p className="mt-1 text-xs text-red-500">{errors.address_line.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Cidade <span className="text-red-500">*</span></label>
                <input className="input-field" placeholder="São Paulo" {...register("address_city")} />
                {errors.address_city && <p className="mt-1 text-xs text-red-500">{errors.address_city.message}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Estado <span className="text-red-500">*</span></label>
                <input className="input-field" placeholder="SP" maxLength={2} {...register("address_state")} />
                {errors.address_state && <p className="mt-1 text-xs text-red-500">{errors.address_state.message}</p>}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">CEP</label>
              <input className="input-field" placeholder="00000-000" {...register("address_zip")} />
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-700">
                <Calendar className="h-4 w-4" /> Data preferencial
              </label>
              <input
                type="datetime-local"
                className="input-field"
                min={new Date().toISOString().slice(0, 16)}
                {...register("scheduled_at")}
              />
            </div>
          </div>
        )}

        {/* Step 2: Orçamento */}
        {step === 2 && (
          <div className="card p-6 space-y-5">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="h-5 w-5 text-brand-600" />
              <h2 className="font-semibold text-gray-900">Qual o seu orçamento?</h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Mínimo (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input-field"
                  placeholder="0,00"
                  {...register("budget_min_cents")}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Máximo (R$) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  className="input-field"
                  placeholder="500,00"
                  {...register("budget_max_cents")}
                />
                {errors.budget_max_cents && <p className="mt-1 text-xs text-red-500">{errors.budget_max_cents.message}</p>}
              </div>
            </div>

            <div className="rounded-xl bg-brand-50 p-4 text-sm text-brand-700">
              <p className="font-medium mb-1">💡 Como funciona o pagamento</p>
              <p>Você só paga quando aprovar o trabalho concluído. O valor fica retido na plataforma com segurança.</p>
            </div>
          </div>
        )}

        {/* Step 3: Confirmar */}
        {step === 3 && (
          <div className="card p-6 space-y-4">
            <h2 className="font-semibold text-gray-900 mb-4">Confirmar pedido</h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Serviço</span>
                <span className="font-medium text-right max-w-xs truncate">{titleWatch}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Local</span>
                <span className="font-medium">{watch("address_city")}/{watch("address_state")}</span>
              </div>
              {watch("scheduled_at") && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Data</span>
                  <span className="font-medium">{new Date(watch("scheduled_at")!).toLocaleString("pt-BR")}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Orçamento máx.</span>
                <span className="font-medium text-brand-600">
                  R$ {Number(watch("budget_max_cents")).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
              Após publicar, profissionais verificados da sua região receberão uma notificação e poderão enviar propostas.
            </div>
          </div>
        )}

        <div className="mt-6 flex gap-3">
          {step > 0 && (
            <button type="button" onClick={() => setStep(s => s - 1)} className="btn-secondary flex-1">
              Voltar
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button type="button" onClick={nextStep} className="btn-primary flex-1 flex items-center justify-center gap-2">
              Próximo <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Publicando...</> : "Publicar pedido 🚀"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
