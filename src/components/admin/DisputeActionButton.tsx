"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DisputeActionButton({
  disputeId,
  currentStatus,
}: {
  disputeId: string;
  currentStatus: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function updateStatus(newStatus: string) {
    setLoading(true);
    const { error } = await supabase
      .from("disputes")
      .update({
        status: newStatus,
        resolved_at: newStatus.startsWith("resolved") ? new Date().toISOString() : null,
      })
      .eq("id", disputeId);

    if (error) toast.error(error.message);
    else {
      toast.success("Status atualizado!");
      router.refresh();
    }
    setLoading(false);
  }

  if (loading) return <Loader2 className="h-4 w-4 animate-spin text-gray-400" />;

  if (currentStatus === "open") {
    return (
      <div className="flex gap-2">
        <button
          onClick={() => updateStatus("under_review")}
          className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100"
        >
          Analisar
        </button>
      </div>
    );
  }

  if (currentStatus === "under_review") {
    return (
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => updateStatus("resolved_pro_platform")}
          className="rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100"
        >
          Favorável plataforma
        </button>
        <button
          onClick={() => updateStatus("resolved_pro_client")}
          className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
        >
          Favorável cliente
        </button>
      </div>
    );
  }

  return null;
}
