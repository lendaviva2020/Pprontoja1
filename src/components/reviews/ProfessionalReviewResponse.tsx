"use client";

import { useState } from "react";
import { MessageSquare, Send, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function ProfessionalReviewResponse({ reviewId }: { reviewId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [response, setResponse] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!response.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/reviews/${reviewId}/responder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: response.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Resposta enviada!");
      setOpen(false);
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao responder");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors"
      >
        <MessageSquare className="h-3.5 w-3.5" /> Responder avaliação
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-brand-200 bg-brand-50 p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-brand-700">Escreva sua resposta</p>
        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
          <X className="h-4 w-4" />
        </button>
      </div>
      <textarea
        value={response}
        onChange={e => setResponse(e.target.value)}
        rows={3}
        maxLength={300}
        placeholder="Agradeça o feedback ou esclareça algo..."
        className="w-full rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none resize-none"
      />
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-gray-400">{response.length}/300</span>
        <button
          onClick={submit}
          disabled={saving || !response.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
          Publicar resposta
        </button>
      </div>
    </div>
  );
}
