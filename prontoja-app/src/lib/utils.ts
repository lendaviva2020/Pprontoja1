import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export const JOB_STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  open: "Aberto",
  matching: "Buscando profissional",
  proposal_received: "Proposta recebida",
  accepted: "Aceito",
  in_progress: "Em andamento",
  pending_review: "Aguardando revisão",
  completed: "Concluído",
  disputed: "Em disputa",
  cancelled: "Cancelado",
};

export const JOB_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  open: "bg-blue-100 text-blue-700",
  matching: "bg-yellow-100 text-yellow-700",
  proposal_received: "bg-purple-100 text-purple-700",
  accepted: "bg-green-100 text-green-700",
  in_progress: "bg-brand-100 text-brand-700",
  pending_review: "bg-orange-100 text-orange-700",
  completed: "bg-green-100 text-green-800",
  disputed: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export const PROPOSAL_STATUS_LABELS: Record<string, string> = {
  pending: "Aguardando resposta",
  accepted: "Aceita",
  rejected: "Recusada",
  expired: "Expirada",
  withdrawn: "Retirada",
};
