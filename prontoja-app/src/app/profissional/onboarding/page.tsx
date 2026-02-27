"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Zap, User, MapPin, Wrench, CreditCard, ChevronRight, ChevronLeft, CheckCircle, Loader2 } from "lucide-react";

const STEPS = [
  { id: 1, label: "Dados básicos", icon: User },
  { id: 2, label: "Localização", icon: MapPin },
  { id: 3, label: "Habilidades", icon: Wrench },
  { id: 4, label: "Pagamento", icon: CreditCard },
];

const SKILLS_OPTIONS = [
  "Limpeza residencial", "Limpeza comercial", "Eletricista", "Encanador",
  "Pintor", "Marceneiro", "Ar-condicionado", "Pedreiro", "Reformas",
  "Instalação de câmeras", "Fechaduras", "Jardinagem", "Montagem de móveis",
];

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [radius, setRadius] = useState("20");
  const [hourlyRate, setHourlyRate] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  function toggleSkill(skill: string) {
    setSelectedSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  }

  async function saveProfile() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Sessão expirada"); return; }

    const res = await fetch("/api/perfil", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        display_name: displayName || undefined,
        headline: headline || undefined,
        bio: bio || undefined,
        location_city: city || undefined,
        location_state: state || undefined,
        service_radius_km: radius ? parseInt(radius) : undefined,
        hourly_rate_cents: hourlyRate ? parseInt(hourlyRate) * 100 : undefined,
        skills: selectedSkills.map(s => ({ skill_name: s, skill_level: "intermediate", years_exp: 1 })),
      }),
    });

    if (res.ok) {
      toast.success("Perfil configurado com sucesso!");
      router.push("/profissional/dashboard");
      router.refresh();
    } else {
      toast.error("Erro ao salvar perfil");
    }
    setSaving(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-white px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">ProntoJá</span>
          </Link>
          <p className="mt-3 text-gray-500">Configure seu perfil profissional</p>
        </div>

        <div className="mb-6 flex items-center justify-between">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition-colors",
                step > s.id ? "bg-brand-600 text-white" :
                step === s.id ? "bg-brand-100 text-brand-700 ring-2 ring-brand-500" :
                "bg-gray-100 text-gray-400"
              )}>
                {step > s.id ? <CheckCircle className="h-5 w-5" /> : s.id}
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn("mx-2 h-0.5 w-8 sm:w-12", step > s.id ? "bg-brand-500" : "bg-gray-200")} />
              )}
            </div>
          ))}
        </div>

        <div className="card p-8">
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900">Dados básicos</h2>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Nome de exibição</label>
                <input type="text" placeholder="Como quer ser chamado" className="input-field" value={displayName} onChange={e => setDisplayName(e.target.value)} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Título profissional</label>
                <input type="text" placeholder="Ex: Eletricista com 10 anos de experiência" className="input-field" value={headline} onChange={e => setHeadline(e.target.value)} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Sobre você</label>
                <textarea placeholder="Descreva sua experiência e especialidades..." className="input-field min-h-[100px] resize-none" value={bio} onChange={e => setBio(e.target.value)} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900">Localização</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Cidade</label>
                  <input type="text" placeholder="São Paulo" className="input-field" value={city} onChange={e => setCity(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Estado</label>
                  <input type="text" placeholder="SP" className="input-field" maxLength={2} value={state} onChange={e => setState(e.target.value.toUpperCase())} />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Raio de atendimento (km)</label>
                <input type="number" placeholder="20" className="input-field" value={radius} onChange={e => setRadius(e.target.value)} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Valor por hora (R$)</label>
                <input type="number" placeholder="80" className="input-field" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900">Suas habilidades</h2>
              <p className="text-sm text-gray-500">Selecione pelo menos 3 habilidades</p>
              <div className="flex flex-wrap gap-2">
                {SKILLS_OPTIONS.map(skill => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                      selectedSkills.includes(skill)
                        ? "border-brand-500 bg-brand-50 text-brand-700"
                        : "border-gray-200 text-gray-600 hover:border-brand-300"
                    )}
                  >
                    {selectedSkills.includes(skill) && "✓ "}{skill}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400">{selectedSkills.length} selecionadas</p>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900">Receba pagamentos</h2>
              <p className="text-sm text-gray-500">Configure sua conta para receber pelos serviços realizados.</p>
              <div className="rounded-xl bg-brand-50 p-4">
                <p className="text-sm text-brand-800 font-medium">Você pode configurar isso depois!</p>
                <p className="text-xs text-brand-600 mt-1">Seu perfil será salvo agora. Você pode configurar o Stripe Connect a qualquer momento na seção Financeiro.</p>
              </div>
              <div className="rounded-xl border border-gray-200 p-4">
                <h3 className="font-medium text-gray-900 mb-2">Resumo do perfil:</h3>
                <ul className="space-y-1 text-sm text-gray-600">
                  {displayName && <li>✅ Nome: {displayName}</li>}
                  {headline && <li>✅ Título: {headline}</li>}
                  {city && <li>✅ Cidade: {city}, {state}</li>}
                  {hourlyRate && <li>✅ Valor/hora: R$ {hourlyRate}</li>}
                  <li>{selectedSkills.length >= 3 ? "✅" : "⚠️"} {selectedSkills.length} habilidades</li>
                </ul>
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
            {step > 1 ? (
              <button onClick={() => setStep(step - 1)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
                <ChevronLeft className="h-4 w-4" /> Voltar
              </button>
            ) : <div />}

            {step < 4 ? (
              <button onClick={() => setStep(step + 1)} className="btn-primary flex items-center gap-1">
                Próximo <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button onClick={saveProfile} disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</> : "Concluir configuração"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
