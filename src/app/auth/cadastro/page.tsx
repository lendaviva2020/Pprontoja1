"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Briefcase, Loader2, User, Zap, Mail, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

// ─── Schema de validação ─────────────────────────────────────────────────────
const schema = z.object({
  full_name: z
    .string()
    .min(3, "Nome muito curto — mínimo 3 caracteres")
    .max(100, "Nome muito longo"),
  email: z.string().email("E-mail inválido"),
  password: z
    .string()
    .min(8, "Mínimo 8 caracteres")
    .regex(/[A-Z]/, "Inclua pelo menos uma letra maiúscula")
    .regex(/[0-9]/, "Inclua pelo menos um número"),
  tipo: z.enum(["cliente", "profissional"]),
  lgpd: z.boolean().refine((v) => v, "Aceite os termos para continuar"),
});

type FormData = z.infer<typeof schema>;

// ─── Tela de sucesso (aguardando confirmação de e-mail) ───────────────────────
function EmailEnviadoScreen({
  email,
  tipo,
}: {
  email: string;
  tipo: "cliente" | "profissional";
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-white px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">ProntoJá</span>
          </Link>
        </div>

        <div className="card p-8 text-center">
          {/* Ícone animado */}
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <Mail className="h-10 w-10 text-green-600" />
          </div>

          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            Verifique seu e-mail!
          </h1>

          <p className="mb-2 text-gray-500">
            Enviamos um link de confirmação para:
          </p>

          <p className="mb-6 rounded-xl bg-gray-50 px-4 py-3 font-semibold text-gray-800 break-all">
            {email}
          </p>

          <div className="mb-6 space-y-3 text-left">
            {[
              "Abra o e-mail que enviamos",
              'Clique em "Confirmar minha conta"',
              "Pronto! Você será redirecionado automaticamente",
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                  {i + 1}
                </div>
                <span className="text-sm text-gray-600">{step}</span>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 text-left mb-6">
            <p className="text-sm font-medium text-amber-800 mb-1">
              📬 Não recebeu o e-mail?
            </p>
            <p className="text-xs text-amber-700">
              Verifique a pasta de spam. Se ainda não chegou, aguarde alguns
              minutos e tente novamente.
            </p>
          </div>

          <div className="space-y-3">
            <Link
              href={`/auth/login`}
              className="btn-secondary block w-full text-center"
            >
              Já confirmei — ir para o login
            </Link>
            <Link
              href="/auth/cadastro"
              className="block w-full text-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Usar outro e-mail
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Formulário de cadastro ──────────────────────────────────────────────────
function CadastroForm() {
  const router = useRouter();
  const params = useSearchParams();
  const tipoParam = params.get("tipo") as "cliente" | "profissional" | null;

  const [tipo, setTipo] = useState<"cliente" | "profissional">(
    tipoParam || "cliente"
  );
  // Estado para controlar tela de "e-mail enviado"
  const [emailEnviado, setEmailEnviado] = useState<string | null>(null);
  const [tipoEnviado, setTipoEnviado] = useState<"cliente" | "profissional">(
    "cliente"
  );

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
        // Passar o tipo no metadata para o callback/trigger usar
        data: {
          full_name: data.full_name,
          user_type: data.tipo,
        },
        // URL para onde o usuário será redirecionado APÓS confirmar o e-mail
        // O callback vai detectar o tipo e redirecionar ao dashboard correto
        emailRedirectTo: `${window.location.origin}/api/auth/callback?tipo=${data.tipo}&next=${
          data.tipo === "profissional"
            ? "/profissional/onboarding"
            : "/cliente/dashboard"
        }`,
      },
    });

    if (error) {
      // Tratar erros comuns com mensagens em português
      if (error.message.includes("already registered")) {
        toast.error("Este e-mail já está cadastrado. Tente fazer login.");
      } else if (error.message.includes("Password")) {
        toast.error("Senha muito fraca. Use letras, números e maiúsculas.");
      } else {
        toast.error(error.message);
      }
      return;
    }

    if (authData.user) {
      // Verificar se o Supabase criou uma sessão imediatamente
      // (isso ocorre quando confirmação de e-mail está desabilitada no projeto)
      if (authData.session) {
        // E-mail confirmation está OFF no Supabase → login automático
        toast.success("Conta criada com sucesso! Bem-vindo(a)!");
        router.push(
          data.tipo === "profissional"
            ? "/profissional/onboarding"
            : "/cliente/dashboard"
        );
        router.refresh();
      } else {
        // E-mail confirmation está ON → mostrar tela de verificação
        setTipoEnviado(data.tipo);
        setEmailEnviado(data.email);
      }
    }
  }

  // ── Tela de e-mail enviado ──
  if (emailEnviado) {
    return <EmailEnviadoScreen email={emailEnviado} tipo={tipoEnviado} />;
  }

  // ── Formulário de cadastro ──
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-white px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
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
          {/* Google Sign-in */}
          <GoogleSignInButton variant="cadastro" tipo={tipo} className="mb-6" />

          {/* Divisor */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-gray-500">ou com e-mail</span>
            </div>
          </div>

          {/* Seletor de tipo */}
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
              <span className="text-center text-xs opacity-70">
                Preciso de serviços
              </span>
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
              <span className="text-center text-xs opacity-70">
                Quero trabalhar
              </span>
            </button>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <input type="hidden" {...register("tipo")} value={tipoWatch} />

            {/* Nome */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Nome completo
              </label>
              <input
                type="text"
                placeholder="João da Silva"
                autoComplete="name"
                className={cn(
                  "input-field",
                  errors.full_name && "border-red-400 focus:border-red-400 focus:ring-red-400/20"
                )}
                {...register("full_name")}
              />
              {errors.full_name && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.full_name.message}
                </p>
              )}
            </div>

            {/* E-mail */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                E-mail
              </label>
              <input
                type="email"
                placeholder="joao@email.com"
                autoComplete="email"
                className={cn(
                  "input-field",
                  errors.email && "border-red-400 focus:border-red-400 focus:ring-red-400/20"
                )}
                {...register("email")}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Senha */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Senha
              </label>
              <input
                type="password"
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
                className={cn(
                  "input-field",
                  errors.password && "border-red-400 focus:border-red-400 focus:ring-red-400/20"
                )}
                {...register("password")}
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.password.message}
                </p>
              )}
              {/* Dica de senha */}
              <p className="mt-1 text-xs text-gray-400">
                Use pelo menos 8 caracteres, uma maiúscula e um número
              </p>
            </div>

            {/* LGPD */}
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="lgpd"
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                {...register("lgpd")}
              />
              <label htmlFor="lgpd" className="text-xs text-gray-600">
                Li e aceito os{" "}
                <Link
                  href="/termos"
                  className="text-brand-600 hover:underline"
                  target="_blank"
                >
                  Termos de Uso
                </Link>{" "}
                e a{" "}
                <Link
                  href="/privacidade"
                  className="text-brand-600 hover:underline"
                  target="_blank"
                >
                  Política de Privacidade
                </Link>
                . Concordo com o tratamento dos meus dados conforme a LGPD.
              </label>
            </div>
            {errors.lgpd && (
              <p className="text-xs text-red-500">{errors.lgpd.message}</p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary flex w-full items-center justify-center gap-2 py-2.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Criando conta...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Criar conta grátis
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            Já tem conta?{" "}
            <Link
              href="/auth/login"
              className="font-medium text-brand-600 hover:underline"
            >
              Entrar
            </Link>
          </div>
        </div>

        {/* Garantias */}
        <div className="mt-6 flex items-center justify-center gap-6 text-xs text-gray-400">
          <span>🔒 Dados protegidos</span>
          <span>🚫 Sem spam</span>
          <span>✅ 100% gratuito</span>
        </div>
      </div>
    </div>
  );
}

// ─── Página com Suspense (obrigatório para useSearchParams no Next.js 14+) ────
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