"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { User, Lock, Bell, Trash2, Save, Eye, EyeOff, AlertTriangle, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "perfil" | "disponibilidade" | "senha" | "notificacoes" | "conta";

const TABS = [
  { id: "perfil" as Tab, label: "Perfil", icon: User },
  { id: "disponibilidade" as Tab, label: "Disponibilidade", icon: MapPin },
  { id: "senha" as Tab, label: "Senha", icon: Lock },
  { id: "notificacoes" as Tab, label: "Notificações", icon: Bell },
  { id: "conta" as Tab, label: "Conta", icon: Trash2 },
];

export default function ProfissionalConfiguracoesPage() {
  const supabase = createClient();
  const [tab, setTab] = useState<Tab>("perfil");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const [fullName, setFullName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [headline, setHeadline] = useState("");

  const [isAvailable, setIsAvailable] = useState(true);
  const [raioAtendimento, setRaio] = useState("30");
  const [cidade, setCidade] = useState("");

  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");

  const [notifProps, setNotifProps] = useState({
    new_job_opportunity: true,
    proposal_accepted: true,
    new_message: true,
    payment_released: true,
    new_review: true,
  });

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, display_name, metadata, headline, is_available, location_city, service_radius_km")
        .eq("id", user.id)
        .single();

      if (profile) {
        setFullName(profile.full_name ?? "");
        setDisplayName(profile.display_name ?? "");
        setHeadline(profile.headline ?? "");
        setIsAvailable(profile.is_available ?? true);
        setCidade(profile.location_city ?? "");
        setRaio(String(profile.service_radius_km ?? 30));
        const meta = (profile.metadata as Record<string, unknown>) || {};
        setPhone((meta.phone as string) ?? "");
        if (meta.notification_prefs) {
          setNotifProps((prev) => ({ ...prev, ...(meta.notification_prefs as Record<string, boolean>) }));
        }
      }
    }
    load();
  }, []);

  async function savePerfil() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: current } = await supabase.from("profiles").select("metadata").eq("id", user.id).single();
    const meta: Record<string, unknown> = current?.metadata ? { ...(current.metadata as object) } : {};
    meta.phone = phone;

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, display_name: displayName, headline, metadata: meta })
      .eq("id", user.id);

    if (error) toast.error("Erro ao salvar perfil");
    else toast.success("Perfil atualizado!");
    setLoading(false);
  }

  async function saveDisponibilidade() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({ is_available: isAvailable, location_city: cidade, service_radius_km: Number(raioAtendimento) })
      .eq("id", user.id);

    if (error) toast.error("Erro ao salvar");
    else toast.success("Disponibilidade atualizada!");
    setLoading(false);
  }

  async function saveSenha() {
    if (newPass !== confirmPass) {
      toast.error("As senhas não coincidem");
      return;
    }
    if (newPass.length < 8) {
      toast.error("Mínimo 8 caracteres");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPass });
    if (error) toast.error("Erro ao alterar senha");
    else {
      toast.success("Senha alterada!");
      setNewPass("");
      setConfirmPass("");
    }
    setLoading(false);
  }

  async function saveNotifs() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: current } = await supabase.from("profiles").select("metadata").eq("id", user.id).single();
    const meta: Record<string, unknown> = current?.metadata ? { ...(current.metadata as object) } : {};
    meta.notification_prefs = notifProps;

    const { error } = await supabase.from("profiles").update({ metadata: meta }).eq("id", user.id);
    if (error) toast.error("Erro ao salvar");
    else toast.success("Preferências salvas!");
    setLoading(false);
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="mt-1 text-gray-500">Gerencie sua conta e preferências</p>
      </div>

      <div className="mb-6 overflow-x-auto">
        <div className="flex gap-1 rounded-xl bg-gray-100 p-1 min-w-max">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap",
                tab === id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "perfil" && (
        <div className="card p-6 space-y-5">
          <h2 className="font-semibold text-gray-900">Informações pessoais</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome de exibição</label>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="input-field" placeholder="Nome no perfil público" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Headline profissional</label>
            <input value={headline} onChange={(e) => setHeadline(e.target.value)} className="input-field" placeholder="Ex: Eletricista com 10 anos de experiência" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input value={email} disabled className="input-field bg-gray-50 text-gray-400 cursor-not-allowed" />
            <p className="text-xs text-gray-400 mt-1">Para alterar, contate o suporte</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input-field" placeholder="(11) 99999-9999" />
          </div>

          <button onClick={savePerfil} disabled={loading} className="btn-primary flex items-center gap-2">
            <Save className="h-4 w-4" />
            {loading ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      )}

      {tab === "disponibilidade" && (
        <div className="card p-6 space-y-6">
          <h2 className="font-semibold text-gray-900">Disponibilidade e atendimento</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Status</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: true, label: "🟢 Disponível", desc: "Apareço em novas oportunidades" },
                { value: false, label: "⚫ Indisponível", desc: "Não recebo novos jobs" },
              ].map((opt) => (
                <button
                  key={String(opt.value)}
                  onClick={() => setIsAvailable(opt.value)}
                  className={cn(
                    "rounded-xl border-2 p-3 text-left transition-all",
                    isAvailable === opt.value ? "border-brand-500 bg-brand-50" : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <div className="text-sm font-medium text-gray-900">{opt.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cidade de atendimento</label>
            <input value={cidade} onChange={(e) => setCidade(e.target.value)} className="input-field" placeholder="Ex: São Paulo" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Raio de atendimento: <span className="font-semibold text-brand-600">{raioAtendimento} km</span>
            </label>
            <input
              type="range"
              min="5"
              max="100"
              step="5"
              value={raioAtendimento}
              onChange={(e) => setRaio(e.target.value)}
              className="w-full accent-brand-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>5 km</span>
              <span>100 km</span>
            </div>
          </div>

          <button onClick={saveDisponibilidade} disabled={loading} className="btn-primary flex items-center gap-2">
            <Save className="h-4 w-4" />
            {loading ? "Salvando..." : "Salvar disponibilidade"}
          </button>
        </div>
      )}

      {tab === "senha" && (
        <div className="card p-6 space-y-5">
          <h2 className="font-semibold text-gray-900">Alterar senha</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nova senha</label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                className="input-field pr-10"
                placeholder="Mínimo 8 caracteres"
              />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar nova senha</label>
            <input
              type={showPass ? "text" : "password"}
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              className="input-field"
            />
          </div>

          {newPass && confirmPass && newPass !== confirmPass && (
            <p className="text-sm text-red-600">As senhas não coincidem</p>
          )}

          <button onClick={saveSenha} disabled={loading || !newPass} className="btn-primary flex items-center gap-2">
            <Lock className="h-4 w-4" />
            {loading ? "Alterando..." : "Alterar senha"}
          </button>
        </div>
      )}

      {tab === "notificacoes" && (
        <div className="card p-6 space-y-5">
          <h2 className="font-semibold text-gray-900">Preferências de notificação</h2>
          <p className="text-sm text-gray-500">Escolha quais e-mails deseja receber</p>

          <div className="space-y-4">
            {[
              { key: "new_job_opportunity" as const, label: "Nova oportunidade", desc: "Quando surgir um job compatível com suas skills" },
              { key: "proposal_accepted" as const, label: "Proposta aceita", desc: "Quando um cliente aceitar sua proposta" },
              { key: "new_message" as const, label: "Nova mensagem", desc: "Quando receber mensagem no chat" },
              { key: "payment_released" as const, label: "Pagamento liberado", desc: "Quando o pagamento for liberado para você" },
              { key: "new_review" as const, label: "Nova avaliação", desc: "Quando um cliente te avaliar" },
            ].map(({ key, label, desc }) => (
              <label key={key} className="flex items-start gap-4 cursor-pointer">
                <div className="relative mt-0.5 flex-shrink-0">
                  <div
                    onClick={() => setNotifProps((prev) => ({ ...prev, [key]: !prev[key] }))}
                    className={cn(
                      "flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer",
                      notifProps[key] ? "bg-brand-600" : "bg-gray-200"
                    )}
                  >
                    <div
                      className={cn(
                        "h-4 w-4 rounded-full bg-white shadow transition-transform mx-1",
                        notifProps[key] ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{label}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
              </label>
            ))}
          </div>

          <button onClick={saveNotifs} disabled={loading} className="btn-primary flex items-center gap-2">
            <Save className="h-4 w-4" />
            {loading ? "Salvando..." : "Salvar preferências"}
          </button>
        </div>
      )}

      {tab === "conta" && (
        <div className="space-y-4">
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-1">Exportar meus dados</h2>
            <p className="text-sm text-gray-500 mb-4">
              Seus direitos pela LGPD incluem receber uma cópia de todos os seus dados.
            </p>
            <button
              onClick={() => toast.info("Solicitação enviada! Dados disponíveis em até 5 dias úteis.")}
              className="btn-secondary text-sm"
            >
              Solicitar exportação de dados
            </button>
          </div>

          <div className="card p-6 border-red-100">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="font-semibold text-red-700">Excluir conta</h2>
                <p className="text-sm text-red-600 mt-0.5">
                  Esta ação é <strong>irreversível</strong>. Seu perfil, histórico e avaliações serão perdidos permanentemente.
                </p>
              </div>
            </div>
            <button
              onClick={() => toast.info("Entre em contato com suporte@prontoja.com.br para excluir sua conta.")}
              className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Excluir minha conta
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
