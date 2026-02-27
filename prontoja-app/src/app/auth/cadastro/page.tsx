"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Zap, Loader2, User, Briefcase } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const schema = z.object({
  full_name: z.string().min(3, "Nome muito curto"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
  tipo: z.enum(["cliente", "profissional"]),
  lgpd: z.boolean().refine(v => v, "Aceite os termos para continuar"),
});
type FormData = z.infer<typeof schema>;

export default function CadastroPage() {
  const router = useRouter();
  const params = useSearchParams();
  const tipoParam = params.get("tipo") as "cliente" | "profissional" | null;
  const [tipo, setTipo] = useState<"cliente" | "profissional">(tipoParam || "cliente");
  const [googleLoading, setGoogleLoading] = useState(false);
  const supabase = createClient();

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { tipo: tipoParam || "cliente" },
  });

  const tipoWatch = watch("tipo");

  function selectTipo(t: "cliente" | "profissional") {
    setTipo(t);
    setValue("tipo", t);
  }

  async function onSubmit(data: FormData) {
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.full_name,
          user_type: data.tipo,
        },
      },
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    if (authData.user) {
      toast.success("Conta criada! Verifique seu e-mail.");
      const dest = data.tipo === "profissional" ? "/profissional/dashboard" : "/cliente/dashboard";
      router.push(dest);
    }
  }

  async function handleGoogleSignup() {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?tipo=${tipo}`,
      },
    });
    if (error) {
      toast.error("Erro ao conectar com Google: " + error.message);
      setGoogleLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-white px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">ProntoJá</span>
          </Link>
          <p className="mt-3 text-gray-500">Crie sua conta gratuita</p>
        </div>

        <div className="card p-8">
          {/* Seleção de tipo */}
          <div className="mb-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => selectTipo("cliente")}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
                tipo === "cliente"
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-gray-200 hover:border-gray-300 text-gray-600"
              )}
            >
              <User className="h-6 w-6" />
              <span className="text-sm font-semibold">Sou cliente</span>
              <span className="text-xs text-center opacity-70">Preciso de serviços</span>
            </button>
            <button
              type="button"
              onClick={() => selectTipo("profissional")}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
                tipo === "profissional"
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-gray-200 hover:border-gray-300 text-gray-600"
              )}
            >
              <Briefcase className="h-6 w-6" />
              <span className="text-sm font-semibold">Sou profissional</span>
              <span className="text-xs text-center opacity-70">Quero trabalhar</span>
            </button>
          </div>

          {/* Google Signup */}
          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={googleLoading}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {googleLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            )}
            {googleLoading ? "Conectando..." : "Cadastrar com Google"}
          </button>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs text-gray-400">ou</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <input type="hidden" {...register("tipo")} value={tipoWatch} />

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Nome completo</label>
              <input
                type="text"
                placeholder="João da Silva"
                className="input-field"
                {...register("full_name")}
              />
              {errors.full_name && <p className="mt-1 text-xs text-red-500">{errors.full_name.message}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">E-mail</label>
              <input
                type="email"
                placeholder="joao@email.com"
                className="input-field"
                {...register("email")}
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Senha</label>
              <input
                type="password"
                placeholder="Mínimo 8 caracteres"
                className="input-field"
                {...register("password")}
              />
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
            </div>

            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="lgpd"
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600"
                {...register("lgpd")}
              />
              <label htmlFor="lgpd" className="text-xs text-gray-600">
                Li e aceito os{" "}
                <Link href="/termos" className="text-brand-600 hover:underline">Termos de Uso</Link>
                {" "}e a{" "}
                <Link href="/privacidade" className="text-brand-600 hover:underline">Política de Privacidade</Link>
                . Concordo com o tratamento dos meus dados conforme a LGPD.
              </label>
            </div>
            {errors.lgpd && <p className="text-xs text-red-500">{errors.lgpd.message}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full py-2.5 flex items-center justify-center gap-2"
            >
              {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Criando conta...</> : "Criar conta grátis"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            Já tem conta?{" "}
            <Link href="/auth/login" className="font-medium text-brand-600 hover:underline">
              Entrar
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
