"use client";

import { useState } from "react";
import { Star, ThumbsUp, ThumbsDown, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface ReviewFormProps {
  jobId: string;
  professionalName: string;
  onSuccess?: () => void;
}

const RATING_LABELS = ["", "Péssimo", "Ruim", "Regular", "Bom", "Excelente"];

export default function ReviewForm({ jobId, professionalName, onSuccess }: ReviewFormProps) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [punctuality, setPunctuality] = useState(0);
  const [quality, setQuality] = useState(0);
  const [communication, setCommunication] = useState(0);
  const [wouldHireAgain, setWouldHireAgain] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const displayed = hoverRating || rating;

  async function submit() {
    if (rating === 0) { toast.error("Selecione uma nota geral"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: jobId,
          rating,
          comment: comment.trim() || null,
          punctuality_rating: punctuality || null,
          quality_rating: quality || null,
          communication_rating: communication || null,
          would_hire_again: wouldHireAgain,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Avaliação enviada! Obrigado pelo feedback 🎉");
      onSuccess?.();
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar avaliação");
    } finally {
      setSubmitting(false);
    }
  }

  function StarRow({ value, onChange, hover, onHover, onLeave }: {
    value: number; onChange: (v: number) => void;
    hover: number; onHover: (v: number) => void; onLeave: () => void;
  }) {
    const d = hover || value;
    return (
      <div className="flex gap-1" onMouseLeave={onLeave}>
        {[1, 2, 3, 4, 5].map(i => (
          <button key={i} type="button" onClick={() => onChange(i)} onMouseEnter={() => onHover(i)}>
            <Star className={cn("h-6 w-6 transition-all", i <= d ? "fill-yellow-400 text-yellow-400 scale-110" : "text-gray-300")} />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 max-w-lg mx-auto">
      <div className="mb-6 text-center">
        <h2 className="text-xl font-bold text-gray-900">Avaliar serviço</h2>
        <p className="text-gray-500 text-sm mt-1">Como foi sua experiência com <span className="font-semibold text-gray-700">{professionalName}</span>?</p>
      </div>

      {/* Nota geral */}
      <div className="mb-6 text-center">
        <div className="flex justify-center gap-1 mb-2" onMouseLeave={() => setHoverRating(0)}>
          {[1, 2, 3, 4, 5].map(i => (
            <button
              key={i}
              type="button"
              onClick={() => setRating(i)}
              onMouseEnter={() => setHoverRating(i)}
              className="transition-transform hover:scale-125"
            >
              <Star className={cn("h-10 w-10 transition-colors", i <= displayed ? "fill-yellow-400 text-yellow-400" : "text-gray-200")} />
            </button>
          ))}
        </div>
        {displayed > 0 && (
          <p className={cn(
            "text-sm font-semibold transition-all",
            displayed >= 4 ? "text-green-600" : displayed >= 3 ? "text-yellow-600" : "text-red-500"
          )}>
            {RATING_LABELS[displayed]}
          </p>
        )}
      </div>

      {/* Ratings detalhados */}
      <div className="mb-6 space-y-3 rounded-xl bg-gray-50 p-4">
        <p className="text-xs font-semibold uppercase text-gray-400 tracking-wider mb-3">Avalie em detalhes</p>
        {[
          { label: "⏰ Pontualidade", value: punctuality, onChange: setPunctuality },
          { label: "⭐ Qualidade do serviço", value: quality, onChange: setQuality },
          { label: "💬 Comunicação", value: communication, onChange: setCommunication },
        ].map(({ label, value, onChange }) => {
          const [h, setH] = useState(0);
          return (
            <div key={label} className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{label}</span>
              <div className="flex gap-1" onMouseLeave={() => setH(0)}>
                {[1,2,3,4,5].map(i => (
                  <button key={i} type="button" onClick={() => onChange(i)} onMouseEnter={() => setH(i)}>
                    <Star className={cn("h-4 w-4", i <= (h || value) ? "fill-yellow-400 text-yellow-400" : "text-gray-200")} />
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Contrataria novamente */}
      <div className="mb-5">
        <p className="text-sm font-medium text-gray-700 mb-2">Contrataria novamente?</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setWouldHireAgain(true)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-xl border-2 py-2.5 text-sm font-medium transition-all",
              wouldHireAgain === true ? "border-green-500 bg-green-50 text-green-700" : "border-gray-200 text-gray-500 hover:border-green-300"
            )}
          >
            <ThumbsUp className="h-4 w-4" /> Sim, com certeza!
          </button>
          <button
            type="button"
            onClick={() => setWouldHireAgain(false)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-xl border-2 py-2.5 text-sm font-medium transition-all",
              wouldHireAgain === false ? "border-red-400 bg-red-50 text-red-600" : "border-gray-200 text-gray-500 hover:border-red-300"
            )}
          >
            <ThumbsDown className="h-4 w-4" /> Não
          </button>
        </div>
      </div>

      {/* Comentário */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Comentário (opcional)</label>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Conte como foi o serviço, pontos positivos e negativos..."
          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none"
        />
        <p className="text-xs text-gray-400 mt-1 text-right">{comment.length}/500</p>
      </div>

      <button
        onClick={submit}
        disabled={submitting || rating === 0}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {submitting ? "Enviando..." : "Enviar avaliação"}
      </button>
    </div>
  );
}
