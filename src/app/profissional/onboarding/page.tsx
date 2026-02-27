"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { CheckCircle, ChevronRight, ChevronLeft, Zap, User, Briefcase, MapPin, CreditCard, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

const STEPS = [
  { id: 1, label: "Perfil", icon: User },
  { id: 2, label: "Especialidades", icon: Briefcase },
  { id: 3, label: "Localização", icon: MapPin },
  { id: 4, label: "Pagamento", icon: CreditCard },
  { id: 5, label: "Pronto!", icon: Rocket },
];

const SKILLS_OPTIONS = [
  "Limpeza residencial", "Limpeza comercial",
  "Eletricidade", "Encanamento",
  "Pintura", "Marcenaria",
  "Ar-condicionado", "Jardinagem",
  "Reformas", "Instalações",
  "Informática", "Segurança eletrônica",
  "Dedetização", "Mudanças",
];

export default function OnboardingPage() {
  const supabase = createClient();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");

  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [experience, setExperience] = useState("1-3");

  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [raio, setRaio] = useState("30");

  function toggleSkill(skill: string) {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  }

  async function finishOnboarding() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: current } = await supabase.from("profiles").select("metadata").eq("id", user.id).single();
    const meta: Record<string, unknown> = current?.metadata ? { ...(current.metadata as object) } : {};
    meta.phone = phone;
    meta.years_experience = experience;

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName,
        headline,
        bio,
        metadata: meta,
        skills: selectedSkills,
        location_city: cidade,
        location_state: estado || null,
        service_radius_km: Number(raio),
        onboarding_completed: true,
        is_available: true,
      })
      .eq("id", user.id);

    if (error) {
      toast.error("Erro ao salvar. Tente novamente.");
      setLoading(false);
      return;
    }

    setStep(5);
    setLoading(false);
  }

  function canAdvance() {
    if (step === 1) return displayName.trim().length >= 2 && headline.trim().length >= 5;
    if (step === 2) return selectedSkills.length >= 1;
    if (step === 3) return cidade.trim().length >= 2;
    return true;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white flex flex-col">
      <header className="px-4 py-5">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">ProntoJá</span>
        </div>
      </header>

      <div className="px-4 pb-8">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-between">
            {STEPS.map((s, idx) => (
              <div key={s.id} className="flex flex-col items-center gap-1 flex-1">
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all",
                    step > s.id ? "bg-brand-600 border-brand-600 text-white" : step === s.id ? "border-brand-600 bg-white text-brand-600" : "border-gray-200 bg-white text-gray-400"
                  )}
                >
                  {step > s.id ? <CheckCircle className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
                </div>
                <span className={cn("text-xs font-medium hidden sm:block", step === s.id ? "text-brand-700" : step > s.id ? "text-gray-500" : "text-gray-400")}>
                  {s.label}
                </span>
                {idx < STEPS.length - 1 && (
                  <div className={cn("flex-1 h-0.5 w-full mt-2 transition-colors", step > s.id ? "bg-brand-500" : "bg-gray-200")} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 pb-8">
        <div className="mx-auto max-w-2xl">
          {step === 1 && (
            <div className="card p-8">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">Conte-nos sobre você</h2>
                <p className="mt-1 text-gray-500">Estas informações serão exibidas no seu perfil público</p>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Como você quer ser chamado? <span className="text-red-500">*</span></label>
                  <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="input-field" placeholder="Ex: João Silva" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Título profissional <span className="text-red-500">*</span></label>
                  <input value={headline} onChange={(e) => setHeadline(e.target.value)} className="input-field" placeholder="Ex: Eletricista com 10 anos de experiência" maxLength={100} />
                  <p className="text-xs text-gray-400 mt-1">{headline.length}/100</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sobre você</label>
                  <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="input-field min-h-[100px] resize-none" placeholder="Fale um pouco sobre sua experiência..." maxLength={500} />
                  <p className="text-xs text-gray-400 mt-1">{bio.length}/500</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input-field" placeholder="(11) 99999-9999" />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="card p-8">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">Suas especialidades</h2>
                <p className="mt-1 text-gray-500">Selecione todos os serviços que você oferece</p>
              </div>

              <div className="mb-6">
                <p className="text-sm font-medium text-gray-700 mb-3">Tipos de serviço <span className="text-red-500">*</span> <span className="text-gray-400 font-normal">({selectedSkills.length} selecionado{selectedSkills.length !== 1 ? "s" : ""})</span></p>
                <div className="flex flex-wrap gap-2">
                  {SKILLS_OPTIONS.map((skill) => (
                    <button
                      key={skill}
                      onClick={() => toggleSkill(skill)}
                      className={cn(
                        "rounded-full px-4 py-2 text-sm font-medium border transition-all",
                        selectedSkills.includes(skill) ? "bg-brand-600 text-white border-brand-600" : "bg-white text-gray-600 border-gray-200 hover:border-brand-300 hover:text-brand-700"
                      )}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">Anos de experiência</p>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { value: "<1", label: "< 1 ano" },
                    { value: "1-3", label: "1–3 anos" },
                    { value: "3-10", label: "3–10 anos" },
                    { value: "10+", label: "10+ anos" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setExperience(opt.value)}
                      className={cn(
                        "rounded-xl border-2 py-3 text-sm font-medium transition-all",
                        experience === opt.value ? "border-brand-500 bg-brand-50 text-brand-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="card p-8">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">Onde você atua?</h2>
                <p className="mt-1 text-gray-500">Usamos essa informação para conectar você a clientes na sua região</p>
              </div>

              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cidade <span className="text-red-500">*</span></label>
                    <input value={cidade} onChange={(e) => setCidade(e.target.value)} className="input-field" placeholder="Ex: São Paulo" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                    <select value={estado} onChange={(e) => setEstado(e.target.value)} className="input-field">
                      <option value="">Selecione...</option>
                      {["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"].map((uf) => (
                        <option key={uf} value={uf}>{uf}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Raio de atendimento: <span className="font-semibold text-brand-600">{raio} km</span></label>
                  <input type="range" min="5" max="100" step="5" value={raio} onChange={(e) => setRaio(e.target.value)} className="w-full accent-brand-600" />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>5 km</span>
                    <span>100 km</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Você receberá jobs de clientes dentro de um raio de <strong>{raio} km</strong> da sua cidade</p>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="card p-8">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">Configure seu recebimento</h2>
                <p className="mt-1 text-gray-500">Conecte sua conta bancária via Stripe para receber seus pagamentos</p>
              </div>

              <div className="mb-6 rounded-xl bg-brand-50 border border-brand-100 p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand-100">
                    <CreditCard className="h-5 w-5 text-brand-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-brand-900">Stripe Express</h3>
                    <p className="text-sm text-brand-700 mt-1">Plataforma de pagamento segura. Você precisará informar:</p>
                    <ul className="mt-2 space-y-1 text-sm text-brand-700">
                      <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 flex-shrink-0" /> CPF ou CNPJ</li>
                      <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 flex-shrink-0" /> Dados bancários</li>
                      <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 flex-shrink-0" /> Foto do documento</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="mb-6 rounded-xl bg-gray-50 border border-gray-100 p-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Modelo de repasse</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 rounded-lg bg-brand-600 p-3 text-center text-white">
                    <div className="text-2xl font-bold">90%</div>
                    <div className="text-xs text-brand-100">Para você</div>
                  </div>
                  <div className="text-gray-400">+</div>
                  <div className="flex-1 rounded-lg bg-gray-200 p-3 text-center">
                    <div className="text-2xl font-bold text-gray-500">10%</div>
                    <div className="text-xs text-gray-400">Plataforma</div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Link href="/profissional/stripe-connect" className="btn-primary w-full flex items-center justify-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Conectar conta bancária agora
                </Link>
                <button onClick={finishOnboarding} disabled={loading} className="btn-secondary w-full text-sm">
                  {loading ? "Salvando..." : "Fazer isso depois"}
                </button>
              </div>

              <p className="text-xs text-gray-400 mt-4 text-center">
                Você pode configurar isso depois, mas precisará conectar para receber pagamentos.
              </p>
            </div>
          )}

          {step === 5 && (
            <div className="card p-8 text-center">
              <div className="mb-6">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-brand-100">
                  <Rocket className="h-10 w-10 text-brand-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Tudo pronto! 🎉</h2>
                <p className="mt-2 text-gray-500">Seu perfil está configurado. Você já pode começar a receber oportunidades de serviço.</p>
              </div>

              <div className="mb-8 space-y-3 text-left">
                {[
                  { icon: "✅", text: "Perfil criado e visível para clientes" },
                  { icon: "🔔", text: "Você será notificado sobre novos jobs" },
                  { icon: "💬", text: "Envie propostas competitivas" },
                  { icon: "💰", text: "Receba pagamentos de forma segura" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-3">
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-sm text-gray-700">{item.text}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <Link href="/profissional/dashboard" className="btn-primary w-full flex items-center justify-center gap-2">
                  Ir para o dashboard
                  <ChevronRight className="h-4 w-4" />
                </Link>
                <Link href="/profissional/oportunidades" className="btn-secondary w-full flex items-center justify-center gap-2">
                  Ver oportunidades de serviço
                </Link>
              </div>
            </div>
          )}

          {step < 5 && (
            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={() => setStep((s) => Math.max(1, s - 1))}
                disabled={step === 1}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                  step === 1 ? "invisible" : "text-gray-600 hover:bg-gray-100"
                )}
              >
                <ChevronLeft className="h-4 w-4" />
                Voltar
              </button>

              <span className="text-xs text-gray-400">
                Passo {step} de {STEPS.length - 1}
              </span>

              {step < 4 ? (
                <button onClick={() => setStep((s) => s + 1)} disabled={!canAdvance()} className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50">
                  Continuar
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button onClick={finishOnboarding} disabled={loading} className="btn-primary flex items-center gap-2 text-sm">
                  {loading ? "Salvando..." : "Finalizar"}
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
