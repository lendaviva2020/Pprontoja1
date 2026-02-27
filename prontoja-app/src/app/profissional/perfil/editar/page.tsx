"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  User, Briefcase, Award, Image as ImageIcon, Plus, Trash2,
  Save, Camera, Globe, Linkedin, Instagram, MapPin, Clock,
  DollarSign, Star, ChevronRight, CheckCircle, AlertCircle
} from "lucide-react";

type SkillLevel = "beginner" | "intermediate" | "advanced" | "expert";

interface Skill { skill_name: string; skill_level: SkillLevel; years_exp: number; }
interface Certificate { id?: string; title: string; issuer: string; issued_year?: number; file_url?: string; is_verified?: boolean; }
interface PortfolioItem { id?: string; title: string; description?: string; image_url?: string; service_category?: string; }

const SKILL_LEVELS: { value: SkillLevel; label: string; color: string }[] = [
  { value: "beginner", label: "Iniciante", color: "bg-gray-100 text-gray-700" },
  { value: "intermediate", label: "Intermediário", color: "bg-blue-100 text-blue-700" },
  { value: "advanced", label: "Avançado", color: "bg-purple-100 text-purple-700" },
  { value: "expert", label: "Especialista", color: "bg-green-100 text-green-700" },
];

const STEPS = [
  { id: "basico", label: "Básico", icon: User },
  { id: "profissional", label: "Profissional", icon: Briefcase },
  { id: "skills", label: "Skills", icon: Star },
  { id: "certificados", label: "Certificados", icon: Award },
  { id: "portfolio", label: "Portfólio", icon: ImageIcon },
];

export default function EditarPerfilPage() {
  const router = useRouter();
  const supabase = createClient();
  const avatarRef = useRef<HTMLInputElement>(null);
  const certRef = useRef<HTMLInputElement>(null);
  const portfolioRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [completeness, setCompleteness] = useState(0);

  // Dados do formulário
  const [avatar, setAvatar] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [website, setWebsite] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [instagram, setInstagram] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [yearsExp, setYearsExp] = useState("");
  const [radiusKm, setRadiusKm] = useState("30");
  const [skills, setSkills] = useState<Skill[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const [newSkillLevel, setNewSkillLevel] = useState<SkillLevel>("intermediate");
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    // Calcular completeness
    let c = 10;
    if (displayName) c += 10;
    if (bio) c += 15;
    if (headline) c += 10;
    if (city) c += 10;
    if (hourlyRate) c += 10;
    if (yearsExp) c += 5;
    if (skills.length > 0) c += 15;
    if (phone) c += 10;
    if (avatar) c += 5;
    setCompleteness(Math.min(c, 100));
  }, [displayName, bio, headline, city, hourlyRate, yearsExp, skills, phone, avatar]);

  async function loadProfile() {
    const res = await fetch("/api/perfil");
    const { profile } = await res.json();
    if (!profile) return;

    setAvatar(profile.avatar_url);
    setDisplayName(profile.display_name || profile.full_name || "");
    setHeadline(profile.headline || "");
    setBio(profile.bio || "");
    setPhone(profile.phone_masked || "");
    setCity(profile.location_city || "");
    setState(profile.location_state || "");
    setWebsite(profile.website_url || "");
    setLinkedin(profile.linkedin_url || "");
    setInstagram(profile.instagram_url || "");
    setHourlyRate(profile.hourly_rate_cents ? String(profile.hourly_rate_cents / 100) : "");
    setYearsExp(profile.years_experience ? String(profile.years_experience) : "");
    setRadiusKm(profile.service_radius_km ? String(profile.service_radius_km) : "30");
    setSkills(profile.professional_skills || []);
    setCertificates(profile.professional_certificates || []);
    setPortfolio(profile.professional_portfolio || []);
  }

  async function uploadAvatar(file: File) {
    setUploadingAvatar(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", "avatar");
    const res = await fetch("/api/perfil/upload", { method: "POST", body: fd });
    const { url } = await res.json();
    if (url) { setAvatar(url); toast.success("Foto atualizada!"); }
    setUploadingAvatar(false);
  }

  async function uploadCertificate(file: File) {
    const title = prompt("Nome do certificado:") || file.name;
    const issuer = prompt("Emitido por (escola/empresa):") || "";
    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", "certificate");
    fd.append("title", title);
    fd.append("issuer", issuer);
    const res = await fetch("/api/perfil/upload", { method: "POST", body: fd });
    const { certificate } = await res.json();
    if (certificate) { setCertificates(p => [...p, certificate]); toast.success("Certificado adicionado!"); }
  }

  async function uploadPortfolioImage(file: File) {
    const title = prompt("Título do projeto:") || "Projeto";
    const desc = prompt("Descrição (opcional):") || "";
    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", "portfolio");
    fd.append("portfolio_title", title);
    fd.append("portfolio_description", desc);
    const res = await fetch("/api/perfil/upload", { method: "POST", body: fd });
    const { portfolio_item } = await res.json();
    if (portfolio_item) { setPortfolio(p => [...p, portfolio_item]); toast.success("Projeto adicionado!"); }
  }

  function addSkill() {
    if (!newSkill.trim()) return;
    if (skills.find(s => s.skill_name.toLowerCase() === newSkill.toLowerCase())) {
      toast.error("Skill já adicionada"); return;
    }
    setSkills(prev => [...prev, { skill_name: newSkill.trim(), skill_level: newSkillLevel, years_exp: 0 }]);
    setNewSkill("");
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/perfil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName,
          headline,
          bio,
          phone_masked: phone,
          location_city: city,
          location_state: state,
          website_url: website,
          linkedin_url: linkedin,
          instagram_url: instagram,
          hourly_rate_cents: hourlyRate ? Math.round(parseFloat(hourlyRate) * 100) : null,
          years_experience: yearsExp ? parseInt(yearsExp) : null,
          service_radius_km: parseInt(radiusKm),
          skills,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Perfil salvo com sucesso!");
      if (step < STEPS.length - 1) {
        setStep(s => s + 1);
      } else {
        router.push("/profissional/perfil");
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  const completenessColor = completeness >= 80 ? "bg-green-500" : completeness >= 50 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Editar Perfil</h1>
          <p className="mt-1 text-gray-500">Complete seu perfil para atrair mais clientes</p>

          {/* Barra de completeness */}
          <div className="mt-4 rounded-xl bg-white p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Completude do perfil</span>
              <span className={`text-sm font-bold ${completeness >= 80 ? "text-green-600" : completeness >= 50 ? "text-yellow-600" : "text-red-600"}`}>
                {completeness}%
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full ${completenessColor} transition-all duration-500`} style={{ width: `${completeness}%` }} />
            </div>
            {completeness < 80 && (
              <p className="mt-2 text-xs text-gray-500">
                {completeness < 50 ? "⚠️ Perfil incompleto — clientes raramente contactam perfis incompletos" : "💡 Quase lá! Complete mais informações para aparecer no topo"}
              </p>
            )}
          </div>
        </div>

        {/* Steps */}
        <div className="mb-8 flex items-center gap-1 overflow-x-auto">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === step;
            const isDone = i < step;
            return (
              <button key={s.id} onClick={() => setStep(i)} className="flex flex-col items-center gap-1 min-w-[60px]">
                <div className={`flex h-9 w-9 items-center justify-center rounded-full transition-all ${
                  isDone ? "bg-green-500 text-white" : isActive ? "bg-brand-600 text-white" : "bg-gray-200 text-gray-500"
                }`}>
                  {isDone ? <CheckCircle className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span className={`text-xs font-medium ${isActive ? "text-brand-600" : "text-gray-500"}`}>{s.label}</span>
                {i < STEPS.length - 1 && <div className={`absolute mt-4 ml-14 h-0.5 w-8 ${isDone ? "bg-green-400" : "bg-gray-200"}`} />}
              </button>
            );
          })}
        </div>

        {/* Card do step atual */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">

          {/* STEP 0: BÁSICO */}
          {step === 0 && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><User className="h-5 w-5 text-brand-500" /> Informações básicas</h2>

              {/* Avatar */}
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="h-24 w-24 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-md">
                    {avatar ? (
                      <img src={avatar} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-3xl font-bold text-gray-400">
                        {displayName?.[0]?.toUpperCase() || "?"}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => avatarRef.current?.click()}
                    className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-white shadow-md hover:bg-brand-700 transition-colors"
                  >
                    {uploadingAvatar ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Camera className="h-4 w-4" />}
                  </button>
                  <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Foto de perfil</p>
                  <p className="text-sm text-gray-500">JPG ou PNG, máx. 5MB</p>
                  <p className="text-xs text-green-600 mt-1">✓ Perfis com foto recebem 3x mais contatos</p>
                </div>
              </div>

              <div className="grid gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome de exibição *</label>
                  <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Como aparecer no app" className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tagline / Título profissional</label>
                  <input value={headline} onChange={e => setHeadline(e.target.value)} placeholder="Ex: Encanador com 10 anos de experiência" maxLength={100} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
                  <p className="text-xs text-gray-400 mt-1">{headline.length}/100</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sobre você</label>
                  <textarea value={bio} onChange={e => setBio(e.target.value)} rows={4} placeholder="Conte sua experiência, especialidades e diferenciais..." maxLength={500} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none" />
                  <p className="text-xs text-gray-400 mt-1">{bio.length}/500</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
                  <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(11) 99999-9999" className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
                </div>
              </div>
            </div>
          )}

          {/* STEP 1: PROFISSIONAL */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Briefcase className="h-5 w-5 text-brand-500" /> Dados profissionais</h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1"><MapPin className="inline h-3.5 w-3.5" /> Cidade *</label>
                  <input value={city} onChange={e => setCity(e.target.value)} placeholder="São Paulo" className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <select value={state} onChange={e => setState(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none">
                    <option value="">Selecione</option>
                    {["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map(uf => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1"><DollarSign className="inline h-3.5 w-3.5" /> Valor/hora (R$)</label>
                  <input value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} type="number" min="0" placeholder="150" className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1"><Clock className="inline h-3.5 w-3.5" /> Anos de experiência</label>
                  <input value={yearsExp} onChange={e => setYearsExp(e.target.value)} type="number" min="0" max="50" placeholder="5" className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Raio de atendimento: <span className="font-bold text-brand-600">{radiusKm} km</span></label>
                  <input value={radiusKm} onChange={e => setRadiusKm(e.target.value)} type="range" min="5" max="100" step="5" className="w-full accent-brand-600" />
                  <div className="flex justify-between text-xs text-gray-400 mt-1"><span>5km</span><span>50km</span><span>100km</span></div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Redes sociais (opcional)</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://seusite.com.br" className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Linkedin className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    <input value={linkedin} onChange={e => setLinkedin(e.target.value)} placeholder="linkedin.com/in/seuperfil" className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Instagram className="h-4 w-4 text-pink-500 flex-shrink-0" />
                    <input value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="@seuinstagram" className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: SKILLS */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Star className="h-5 w-5 text-brand-500" /> Skills e competências</h2>

              <div className="flex gap-2">
                <input
                  value={newSkill}
                  onChange={e => setNewSkill(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addSkill()}
                  placeholder="Ex: Hidráulica, Pintura, React..."
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
                />
                <select value={newSkillLevel} onChange={e => setNewSkillLevel(e.target.value as SkillLevel)} className="rounded-lg border border-gray-300 px-2 py-2.5 text-sm focus:border-brand-500 focus:outline-none">
                  {SKILL_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
                <button onClick={addSkill} className="flex items-center gap-1 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
                  <Plus className="h-4 w-4" /> Adicionar
                </button>
              </div>

              {skills.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center">
                  <Star className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                  <p className="text-gray-500 text-sm">Nenhuma skill adicionada</p>
                  <p className="text-gray-400 text-xs mt-1">Adicione suas habilidades para aparecer nas buscas</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill, i) => {
                    const level = SKILL_LEVELS.find(l => l.value === skill.skill_level);
                    return (
                      <div key={i} className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 shadow-sm">
                        <span className="text-sm font-medium text-gray-800">{skill.skill_name}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${level?.color}`}>{level?.label}</span>
                        <button onClick={() => setSkills(s => s.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-700">
                💡 Dica: Adicione pelo menos 5 skills relevantes. Profissionais com mais skills aparecem primeiro nas buscas.
              </div>
            </div>
          )}

          {/* STEP 3: CERTIFICADOS */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Award className="h-5 w-5 text-brand-500" /> Certificados</h2>
                <button onClick={() => certRef.current?.click()} className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
                  <Plus className="h-4 w-4" /> Adicionar
                </button>
                <input ref={certRef} type="file" accept=".pdf,image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadCertificate(e.target.files[0])} />
              </div>

              {certificates.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-gray-200 p-12 text-center cursor-pointer hover:border-brand-400 transition-colors" onClick={() => certRef.current?.click()}>
                  <Award className="mx-auto h-10 w-10 text-gray-300 mb-3" />
                  <p className="font-medium text-gray-500">Clique para adicionar certificados</p>
                  <p className="text-gray-400 text-sm mt-1">PDF ou imagem — diplomas, cursos, especializações</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {certificates.map((cert, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-xl border border-gray-200 p-4">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100">
                        <Award className="h-5 w-5 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 truncate">{cert.title}</p>
                          {cert.is_verified && <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />}
                        </div>
                        <p className="text-sm text-gray-500">{cert.issuer}</p>
                        {cert.issued_year && <p className="text-xs text-gray-400">{cert.issued_year}</p>}
                      </div>
                      <button onClick={() => setCertificates(c => c.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 4: PORTFÓLIO */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><ImageIcon className="h-5 w-5 text-brand-500" /> Portfólio</h2>
                <button onClick={() => portfolioRef.current?.click()} className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
                  <Plus className="h-4 w-4" /> Adicionar
                </button>
                <input ref={portfolioRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadPortfolioImage(e.target.files[0])} />
              </div>

              {portfolio.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-gray-200 p-12 text-center cursor-pointer hover:border-brand-400 transition-colors" onClick={() => portfolioRef.current?.click()}>
                  <ImageIcon className="mx-auto h-10 w-10 text-gray-300 mb-3" />
                  <p className="font-medium text-gray-500">Adicione fotos dos seus trabalhos</p>
                  <p className="text-gray-400 text-sm mt-1">Antes e depois, projetos concluídos, resultados</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {portfolio.map((item, i) => (
                    <div key={i} className="group relative rounded-xl overflow-hidden bg-gray-100 aspect-square">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center"><ImageIcon className="h-8 w-8 text-gray-300" /></div>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                        <p className="text-white text-xs font-medium text-center truncate w-full">{item.title}</p>
                        <button onClick={() => setPortfolio(p => p.filter((_, j) => j !== i))} className="flex items-center gap-1 rounded-lg bg-red-500 px-2 py-1 text-xs text-white">
                          <Trash2 className="h-3 w-3" /> Remover
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="rounded-xl border-2 border-dashed border-gray-200 aspect-square flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-brand-400 transition-colors" onClick={() => portfolioRef.current?.click()}>
                    <Plus className="h-6 w-6 text-gray-400" />
                    <span className="text-xs text-gray-400">Adicionar</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Botões de navegação */}
          <div className="mt-8 flex items-center justify-between border-t pt-6">
            <button
              onClick={() => step > 0 ? setStep(s => s - 1) : router.back()}
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {step === 0 ? "Cancelar" : "← Anterior"}
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {saving ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="h-4 w-4" />}
              {step === STEPS.length - 1 ? "Salvar e finalizar" : "Salvar e continuar →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
