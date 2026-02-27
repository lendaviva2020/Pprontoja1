"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Zap, Home, RefreshCw, AlertTriangle } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <Link href="/" className="flex items-center gap-2 mb-12">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <span className="text-xl font-bold text-gray-900">ProntoJá</span>
      </Link>

      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-red-50">
          <AlertTriangle className="h-12 w-12 text-red-400" />
        </div>
        <div className="text-8xl font-extrabold text-gray-100 select-none">500</div>
      </div>

      <div className="mb-8 max-w-md text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Algo deu errado</h1>
        <p className="text-gray-500">
          Ocorreu um erro inesperado no servidor. Nossa equipe já foi notificada e estamos trabalhando para resolver.
        </p>
        {error.digest && (
          <p className="mt-3 text-xs text-gray-400 font-mono bg-gray-100 rounded-lg px-3 py-2 inline-block">
            ID: {error.digest}
          </p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
        <button
          onClick={reset}
          className="btn-primary flex items-center justify-center gap-2 flex-1"
        >
          <RefreshCw className="h-4 w-4" />
          Tentar novamente
        </button>
        <Link href="/" className="btn-secondary flex items-center justify-center gap-2 flex-1">
          <Home className="h-4 w-4" />
          Início
        </Link>
      </div>
    </div>
  );
}
