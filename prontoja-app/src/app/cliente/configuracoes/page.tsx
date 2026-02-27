"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { User, Mail, Phone, Shield, Loader2, Save } from "lucide-react";

export default function ConfiguracoesClientePage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }
    setEmail(user.email || "");

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, display_name, phone_masked")
      .eq("id", user.id)
      .single();

    if (profile) {
      setFullName(profile.full_name || "");
      setDisplayName(profile.display_name || "");
      setPhone(profile.phone_masked || "");
    }
    setLoading(false);
  }

  async function saveProfile() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("profiles").update({
      full_name: fullName,
      display_name: displayName || null,
      phone_masked: phone || null,
    }).eq("id", user.id);

    if (error) toast.error("Erro ao salvar: " + error.message);
    else toast.success("Configurações salvas!");
    setSaving(false);
  }

  async function changePassword() {
    if (newPassword.length < 8) { toast.error("Senha deve ter no mínimo 8 caracteres"); return; }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast.error(error.message);
    else { toast.success("Senha atualizada!"); setNewPassword(""); }
    setChangingPassword(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-500 mt-1">Gerencie sua conta</p>
      </div>

      <div className="space-y-6">
        <div className="card p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
            <User className="h-5 w-5 text-brand-600" /> Dados pessoais
          </h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Nome completo</label>
              <input type="text" className="input-field" value={fullName} onChange={e => setFullName(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Nome de exibição</label>
              <input type="text" className="input-field" placeholder="Opcional" value={displayName} onChange={e => setDisplayName(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Telefone</label>
              <input type="tel" className="input-field" placeholder="(11) 99999-0000" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <button onClick={saveProfile} disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
            <Mail className="h-5 w-5 text-brand-600" /> E-mail
          </h2>
          <input type="email" className="input-field bg-gray-50" value={email} disabled />
          <p className="text-xs text-gray-400 mt-1">O e-mail não pode ser alterado.</p>
        </div>

        <div className="card p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
            <Shield className="h-5 w-5 text-brand-600" /> Alterar senha
          </h2>
          <div className="space-y-3">
            <input type="password" className="input-field" placeholder="Nova senha (mínimo 8 caracteres)" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            <button onClick={changePassword} disabled={changingPassword || !newPassword} className="btn-primary flex items-center gap-2 disabled:opacity-50">
              {changingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
              {changingPassword ? "Alterando..." : "Alterar senha"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
