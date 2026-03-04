"use client";

import { useState, Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Zap, Loader2, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

const schema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});
type FormData = z.infer<typeof schema>;

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get("redirectTo") || null;
  const errorParam = params.get("error");
  const [showPass, setShowPass] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (errorParam === "role_check_failed") {
      toast.error("Não foi possível verificar seu tipo de conta. Tente novamente.");
    }
  }, [errorParam]);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    const { error } = await supabase.auth.signInWithPassword(data);
    if (error) {
      toast.error(error.message === "Invalid login credentials"
        ? "E-mail ou senha incorretos"
        : error.message);
      return;
    }
    // Buscar role via API (usa service_role, não depende de RLS)
    let role: string | null = null;
    try {
      const res = await fetch("/api/me/role", { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        role = json.role ?? null;
      }
    } catch {
      // fallback: tenta ler do client (pode falhar por RLS)
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id ?? "")
        .limit(1);
      role = roles?.[0]?.role ?? null;
    }
    // Se temos redirectTo (ex.: /profissional/dashboard), usamos; senão decidimos pelo role
    const dest =
      redirectTo ||
      (role === "professional" ? "/profissional/dashboard" : "/cliente/dashboard");
    router.push(dest);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-white px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">ProntoJá</span>
          </Link>
          <p className="mt-3 text-gray-500">Bem-vindo de volta!</p>
        </div>

        <div className="card p-8">
          <GoogleSignInButton variant="login" redirectTo={redirectTo} className="mb-5" />

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-gray-500">ou com e-mail</span>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">E-mail</label>
              <input
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                className="input-field"
                {...register("email")}
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Senha</label>
                <Link href="/auth/esqueci-senha" className="text-xs text-brand-600 hover:underline">
                  Esqueci minha senha
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="input-field pr-10"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full py-2.5 flex items-center justify-center gap-2"
            >
              {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Entrando...</> : "Entrar"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            Não tem conta?{" "}
            <Link href="/auth/cadastro" className="font-medium text-brand-600 hover:underline">
              Cadastre-se grátis
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
