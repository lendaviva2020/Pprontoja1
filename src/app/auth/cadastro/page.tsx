"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Briefcase, Loader2, User, Zap } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

const schema = z.object({
  full_name: z.string().min(3, "Nome muito curto"),
  email: z.string().email("E-mail invalido"),
  password: z.string().min(8, "Minimo 8 caracteres"),
  tipo: z.enum(["cliente", "profissional"]),
  lgpd: z.boolean().refine((v) => v, "Aceite os termos para continuar"),
});

type FormData = z.infer<typeof schema>;

function CadastroForm() {
  const router = useRouter();
  const params = useSearchParams();
  const tipoParam = params.get("tipo") as "cliente" | "profissional" | null;
  const [tipo, setTipo] = useState<"cliente" | "profissional">(tipoParam || "cliente");
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
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
      router.push(data.tipo === "profissional" ? "/profissional/dashboard" : "/cliente/dashboard");
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
            <span className="text-2xl font-bold text-gray-900">ProntoJa</span>
          </Link>
          <p className="mt-3 text-gray-500">Crie sua conta gratuita</p>
        </div>

        <div className="card p-8">
          <GoogleSignInButton variant="cadastro" tipo={tipo} className="mb-6" />

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-gray-500">ou com e-mail</span>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => selectTipo("cliente")}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
                tipo === "cliente"
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              )}
            >
              <User className="h-6 w-6" />
              <span className="text-sm font-semibold">Sou cliente</span>
              <span className="text-center text-xs opacity-70">Preciso de servicos</span>
            </button>

            <button
              type="button"
              onClick={() => selectTipo("profissional")}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
                tipo === "profissional"
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              )}
            >
              <Briefcase className="h-6 w-6" />
              <span className="text-sm font-semibold">Sou profissional</span>
              <span className="text-center text-xs opacity-70">Quero trabalhar</span>
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <input type="hidden" {...register("tipo")} value={tipoWatch} />

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Nome completo</label>
              <input type="text" placeholder="Joao da Silva" className="input-field" {...register("full_name")} />
              {errors.full_name && <p className="mt-1 text-xs text-red-500">{errors.full_name.message}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">E-mail</label>
              <input type="email" placeholder="joao@email.com" className="input-field" {...register("email")} />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Senha</label>
              <input type="password" placeholder="Minimo 8 caracteres" className="input-field" {...register("password")} />
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
            </div>

            <div className="flex items-start gap-2">
              <input type="checkbox" id="lgpd" className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600" {...register("lgpd")} />
              <label htmlFor="lgpd" className="text-xs text-gray-600">
                Li e aceito os <Link href="/termos" className="text-brand-600 hover:underline">Termos de Uso</Link> e a <Link href="/privacidade" className="text-brand-600 hover:underline">Politica de Privacidade</Link>. Concordo com o tratamento dos meus dados conforme a LGPD.
              </label>
            </div>
            {errors.lgpd && <p className="text-xs text-red-500">{errors.lgpd.message}</p>}

            <button type="submit" disabled={isSubmitting} className="btn-primary flex w-full items-center justify-center gap-2 py-2.5">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Criando conta...
                </>
              ) : (
                "Criar conta gratis"
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            Ja tem conta? <Link href="/auth/login" className="font-medium text-brand-600 hover:underline">Entrar</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CadastroPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        </div>
      }
    >
      <CadastroForm />
    </Suspense>
  );
}
