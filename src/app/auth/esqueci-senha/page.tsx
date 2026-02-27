"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Zap, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

const schema = z.object({
  email: z.string().email("E-mail inválido"),
});
type FormData = z.infer<typeof schema>;

export default function EsqueciSenhaPage() {
  const [sent, setSent] = useState(false);
  const supabase = createClient();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/auth/login?reset=success`,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    setSent(true);
    toast.success("E-mail enviado! Verifique sua caixa de entrada.");
  }

  if (sent) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          <div className="mb-6 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-green-100">
              <span className="text-2xl">✓</span>
            </div>
          </div>
          <h1 className="mb-2 text-center text-xl font-bold text-gray-900">E-mail enviado!</h1>
          <p className="mb-6 text-center text-sm text-gray-500">
            Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
          </p>
          <Link href="/auth/login" className="btn-primary block w-full text-center">
            Voltar ao login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 text-gray-600 hover:text-gray-900">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-gray-900">ProntoJá</span>
        </Link>

        <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          <h1 className="mb-2 text-xl font-bold text-gray-900">Esqueceu sua senha?</h1>
          <p className="mb-6 text-sm text-gray-500">
            Informe seu e-mail e enviaremos um link para redefinir sua senha.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input
                {...register("email")}
                type="email"
                className="input-field"
                placeholder="seu@email.com"
                autoComplete="email"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando...
                </span>
              ) : (
                "Enviar link de redefinição"
              )}
            </button>
          </form>

          <Link
            href="/auth/login"
            className="mt-6 block text-center text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            Voltar ao login
          </Link>
        </div>
      </div>
    </div>
  );
}
