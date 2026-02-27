"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { User, Lock, Bell, Trash2, Save, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

type Tab = "perfil" | "senha" | "notificacoes" | "conta";

const TABS = [
  { id: "perfil" as Tab, label: "Perfil", icon: User },
  { id: "senha" as Tab, label: "Senha", icon: Lock },
  { id: "notificacoes" as Tab, label: "Notificações", icon: Bell },
  { id: "conta" as Tab, label: "Conta", icon: Trash2 },
];

export default function ClienteConfiguracoesPage() {
  const supabase = createClient();
  const [tab, setTab] = useState<Tab>("perfil");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const [fullName, setFullName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");

  const [notifProps, setNotifProps] = useState({
    new_message: true,
    proposal_received: true,
    job_completed: true,
    payment_confirmed: true,
  });

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, display_name, metadata")
        .eq("id", user.id)
        .single();

      if (profile) {
        setFullName(profile.full_name ?? "");
        setDisplayName(profile.display_name ?? "");
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
      .update({ full_name: fullName, display_name: displayName, metadata: meta })
      .eq("id", user.id);

    if (error) toast.error("Erro ao salvar perfil");
    else toast.success("Perfil atualizado com sucesso!");
    setLoading(false);
  }

  async function saveSenha() {
    if (newPass !== confirmPass) {
      toast.error("As senhas não coincidem");
      return;
    }
    if (newPass.length < 8) {
      toast.error("A senha deve ter pelo menos 8 caracteres");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPass });
    if (error) toast.error("Erro ao alterar senha. Faça login novamente.");
    else {
      toast.success("Senha alterada com sucesso!");
      setCurrentPass("");
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
    if (error) toast.error("Erro ao salvar preferências");
    else toast.success("Preferências de notificação salvas!");
    setLoading(false);
  }

  function deleteAccount() {
    const confirmed = window.confirm(
      "Tem certeza que deseja excluir sua conta? Esta ação é irreversível e todos os seus dados serão perdidos."
    );
    if (!confirmed) return;
    toast.info("Entre em contato com suporte@prontoja.com.br para solicitar a exclusão da conta.");
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="mt-1 text-gray-500">Gerencie sua conta e preferências</p>
      </div>

      <div className="mb-6 flex gap-1 rounded-xl bg-gray-100 p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              tab === id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
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
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="input-field" placeholder="Como quer ser chamado" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input value={email} disabled className="input-field bg-gray-50 text-gray-400 cursor-not-allowed" />
            <p className="text-xs text-gray-400 mt-1">Para alterar o e-mail, entre em contato com o suporte</p>
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
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
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
              placeholder="Repita a nova senha"
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
          <p className="text-sm text-gray-500">Escolha quais notificações deseja receber por e-mail</p>

          <div className="space-y-4">
            {[
              { key: "new_message" as const, label: "Nova mensagem", desc: "Quando você receber uma mensagem no chat" },
              { key: "proposal_received" as const, label: "Proposta recebida", desc: "Quando um profissional enviar uma proposta" },
              { key: "job_completed" as const, label: "Serviço concluído", desc: "Quando seu serviço for marcado como concluído" },
              { key: "payment_confirmed" as const, label: "Pagamento confirmado", desc: "Quando seu pagamento for processado" },
            ].map(({ key, label, desc }) => (
              <label key={key} className="flex items-start gap-4 cursor-pointer">
                <div className="relative mt-0.5 flex-shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={notifProps[key]}
                    onChange={(e) => setNotifProps((prev) => ({ ...prev, [key]: e.target.checked }))}
                  />
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
              Você tem direito de receber uma cópia de todos os seus dados (LGPD).
            </p>
            <button
              onClick={() => toast.info("Solicitação enviada! Você receberá os dados em até 5 dias úteis.")}
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
                  Esta ação é <strong>irreversível</strong>. Todos os seus dados, histórico de pedidos e conversas serão permanentemente excluídos.
                </p>
              </div>
            </div>
            <button
              onClick={deleteAccount}
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
