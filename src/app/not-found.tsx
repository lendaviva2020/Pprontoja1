import Link from "next/link";
import { Zap, Home, Search, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <Link href="/" className="flex items-center gap-2 mb-12">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <span className="text-xl font-bold text-gray-900">ProntoJá</span>
      </Link>

      <div className="mb-8 text-center">
        <div className="text-[120px] leading-none select-none">🔍</div>
        <div className="mt-2 text-8xl font-extrabold text-gray-100 select-none">404</div>
      </div>

      <div className="mb-8 max-w-md text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Página não encontrada</h1>
        <p className="text-gray-500">
          A página que você está procurando não existe, foi movida ou o endereço está incorreto.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
        <Link href="/" className="btn-primary flex items-center justify-center gap-2 flex-1">
          <Home className="h-4 w-4" />
          Ir para o início
        </Link>
        <Link href="/busca" className="btn-secondary flex items-center justify-center gap-2 flex-1">
          <Search className="h-4 w-4" />
          Buscar
        </Link>
      </div>

      <Link
        href="javascript:history.back()"
        className="mt-6 flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar à página anterior
      </Link>
    </div>
  );
}
