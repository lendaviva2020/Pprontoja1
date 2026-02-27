"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Search, MapPin, Star, Filter, X, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIAS = [
  { value: "", label: "Todas" },
  { value: "limpeza", label: "🧹 Limpeza" },
  { value: "eletrica", label: "⚡ Elétrica" },
  { value: "encanamento", label: "🔧 Encanamento" },
  { value: "pintura", label: "🎨 Pintura" },
  { value: "marcenaria", label: "🪚 Marcenaria" },
  { value: "ar_condicionado", label: "❄️ Ar-condicionado" },
  { value: "reformas", label: "🏠 Reformas" },
  { value: "seguranca", label: "🔒 Segurança" },
];

type Professional = {
  id: string;
  full_name: string;
  display_name: string | null;
  avatar_url: string | null;
  headline: string | null;
  bio: string | null;
  location_city: string | null;
  location_state: string | null;
  rating_avg: number | null;
  rating_count: number | null;
  hourly_rate_cents: number | null;
  slug: string | null;
  skills: string[] | null;
  is_available: boolean | null;
};

export default function BuscaPage() {
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("");
  const [profissionais, setProfissionais] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadProfessionals();
  }, [categoria]);

  async function loadProfessionals() {
    setLoading(true);
    let query = supabase
      .from("profiles")
      .select("id, full_name, display_name, avatar_url, headline, bio, location_city, location_state, rating_avg, rating_count, hourly_rate_cents, slug, skills, is_available")
      .eq("is_available", true)
      .order("rating_avg", { ascending: false, nullsFirst: false })
      .limit(50);

    const { data } = await query;
    let results = (data || []) as Professional[];

    if (categoria) {
      results = results.filter(p =>
        p.skills?.some(s => s.toLowerCase().includes(categoria)) ||
        p.headline?.toLowerCase().includes(categoria) ||
        p.bio?.toLowerCase().includes(categoria)
      );
    }

    setProfissionais(results);
    setLoading(false);
  }

  const filtered = busca
    ? profissionais.filter(p =>
        (p.display_name || p.full_name).toLowerCase().includes(busca.toLowerCase()) ||
        p.headline?.toLowerCase().includes(busca.toLowerCase()) ||
        p.location_city?.toLowerCase().includes(busca.toLowerCase()) ||
        p.skills?.some(s => s.toLowerCase().includes(busca.toLowerCase()))
      )
    : profissionais;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">ProntoJá</span>
          </Link>
          <Link href="/auth/login" className="btn-secondary text-sm">Entrar</Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Encontre profissionais</h1>
          <p className="mt-2 text-gray-500">Profissionais verificados prontos para atender</p>
        </div>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome, habilidade ou cidade..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn("btn-secondary flex items-center gap-2", showFilters && "bg-brand-50 border-brand-300 text-brand-700")}
          >
            <Filter className="h-4 w-4" /> Filtros
          </button>
        </div>

        {showFilters && (
          <div className="mb-6 flex flex-wrap gap-2">
            {CATEGORIAS.map(c => (
              <button
                key={c.value}
                onClick={() => setCategoria(c.value)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                  categoria === c.value
                    ? "border-brand-500 bg-brand-500 text-white"
                    : "border-gray-200 bg-white text-gray-600 hover:border-brand-300"
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
            <p className="mt-3 text-gray-500">Carregando profissionais...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <Search className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <h3 className="font-semibold text-gray-700">Nenhum profissional encontrado</h3>
            <p className="text-sm text-gray-400 mt-1">Tente ajustar seus filtros de busca.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(p => {
              const name = p.display_name || p.full_name;
              const initials = name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
              return (
                <Link
                  key={p.id}
                  href={p.slug ? `/p/${p.slug}` : `/auth/cadastro`}
                  className="card p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 flex-shrink-0 rounded-xl overflow-hidden bg-brand-100">
                      {p.avatar_url ? (
                        <img src={p.avatar_url} alt={name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-sm font-bold text-brand-700">{initials}</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-900 truncate">{name}</h3>
                      {p.headline && <p className="text-sm text-gray-500 truncate">{p.headline}</p>}
                      <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                        {p.location_city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {p.location_city}
                          </span>
                        )}
                        {p.rating_avg && (
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-yellow-500" /> {Number(p.rating_avg).toFixed(1)} ({p.rating_count})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {p.hourly_rate_cents && (
                    <div className="mt-3 text-right">
                      <span className="text-sm font-semibold text-brand-600">R$ {(p.hourly_rate_cents / 100).toFixed(0)}/h</span>
                    </div>
                  )}
                  {p.skills && p.skills.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {p.skills.slice(0, 3).map(s => (
                        <span key={s} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{s}</span>
                      ))}
                      {p.skills.length > 3 && <span className="text-xs text-gray-400">+{p.skills.length - 3}</span>}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
