"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Send, Paperclip, Check, CheckCheck, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  job_id: string;
  sender_id: string;
  body: string | null;
  attachment_url: string | null;
  message_type: string;
  is_read: boolean;
  created_at: string;
  sender?: {
    id: string;
    display_name?: string;
    full_name?: string;
    avatar_url?: string;
  };
}

interface ChatBoxProps {
  jobId: string;
  currentUserId: string;
  otherUser?: {
    id: string;
    display_name?: string;
    full_name?: string;
    avatar_url?: string;
  };
  jobTitle?: string;
  jobStatus?: string;
}

export default function ChatBox({ jobId, currentUserId, otherUser, jobTitle, jobStatus }: ChatBoxProps) {
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Carregar mensagens
  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetch(`/api/chat/${jobId}`);
      if (res.ok) {
        const { messages: msgs } = await res.json();
        setMessages(msgs || []);
      }
      setLoading(false);
    }
    load();
  }, [jobId]);

  // Scroll para o fim
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Realtime - escutar novas mensagens e indicador de digitação (um canal por tipo para as sobrecargas do Supabase)
  useEffect(() => {
    type PostgresPayload<T = Record<string, unknown>> = { new: T; old: T; eventType: string };
    const channelMessages = supabase
      .channel(`chat:${jobId}:messages`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `job_id=eq.${jobId}` },
        (payload: PostgresPayload<Message>) => {
          const newMsg = payload.new;
          if (newMsg.sender_id !== currentUserId) {
            setMessages((prev) => {
              if (prev.find((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            fetch(`/api/chat/${jobId}`, { method: "GET" });
          }
        }
      )
      .subscribe();

    const channelTyping = supabase
      .channel(`chat:${jobId}:typing`)
      .on(
        "postgres_changes",
        { event: "UPSERT", schema: "public", table: "typing_indicators", filter: `job_id=eq.${jobId}` },
        (payload: PostgresPayload<{ user_id: string; is_typing: boolean }>) => {
          const data = payload.new;
          if (data.user_id !== currentUserId) {
            setOtherTyping(data.is_typing);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelMessages);
      supabase.removeChannel(channelTyping);
    };
  }, [jobId, currentUserId]);

  // Indicador "digitando"
  const updateTyping = useCallback(async (typing: boolean) => {
    await supabase.from("typing_indicators").upsert({
      job_id: jobId,
      user_id: currentUserId,
      is_typing: typing,
      updated_at: new Date().toISOString(),
    });
  }, [jobId, currentUserId]);

  function handleInputChange(value: string) {
    setInput(value);
    if (!isTyping && value) {
      setIsTyping(true);
      updateTyping(true);
    }
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      setIsTyping(false);
      updateTyping(false);
    }, 2000);
  }

  async function sendMessage() {
    if (!input.trim() || sending) return;
    setSending(true);
    const text = input.trim();
    setInput("");
    updateTyping(false);

    // Otimista
    const tempMsg: Message = {
      id: `temp-${Date.now()}`,
      job_id: jobId,
      sender_id: currentUserId,
      body: text,
      attachment_url: null,
      message_type: "text",
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const res = await fetch(`/api/chat/${jobId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      const { message, error } = await res.json();
      if (!res.ok) throw new Error(error);
      // Substituir temp
      setMessages((prev) => prev.map((m) => (m.id === tempMsg.id ? message : m)));
    } catch (e: unknown) {
      toast.error("Erro ao enviar mensagem");
      setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
      setInput(text);
    } finally {
      setSending(false);
    }
  }

  async function sendFile(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", "chat-attachments");

    // Upload via storage direto ao Supabase
    const ext = file.name.split(".").pop();
    const path = `${jobId}/${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage.from("chat-attachments").upload(path, file);
    if (error) { toast.error("Erro ao enviar arquivo"); return; }

    const { data: { publicUrl } } = supabase.storage.from("chat-attachments").getPublicUrl(path);

    const res = await fetch(`/api/chat/${jobId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: `📎 ${file.name}`,
        attachment_url: publicUrl,
        message_type: file.type.startsWith("image/") ? "image" : "file",
      }),
    });
    const { message } = await res.json();
    if (message) setMessages((prev) => [...prev, message]);
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Hoje";
    if (d.toDateString() === yesterday.toDateString()) return "Ontem";
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  }

  // Agrupar por dia
  const groupedMessages: { date: string; messages: Message[] }[] = [];
  messages.forEach((msg) => {
    const date = formatDate(msg.created_at);
    const last = groupedMessages[groupedMessages.length - 1];
    if (last && last.date === date) last.messages.push(msg);
    else groupedMessages.push({ date, messages: [msg] });
  });

  const otherName = otherUser?.display_name || otherUser?.full_name || "Outro usuário";

  return (
    <div className="flex h-full flex-col bg-gray-50">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand-100">
          {otherUser?.avatar_url ? (
            <img src={otherUser.avatar_url} alt={otherName} className="h-10 w-10 rounded-full object-cover" />
          ) : (
            <span className="text-sm font-bold text-brand-700">{otherName[0]?.toUpperCase()}</span>
          )}
        </div>
        <div>
          <p className="font-semibold text-gray-900">{otherName}</p>
          {jobTitle && <p className="text-xs text-gray-500 truncate max-w-xs">{jobTitle}</p>}
        </div>
        {jobStatus && (
          <span className={cn(
            "ml-auto rounded-full px-3 py-1 text-xs font-medium",
            jobStatus === "completed" ? "bg-green-100 text-green-700" :
            jobStatus === "in_progress" ? "bg-blue-100 text-blue-700" :
            "bg-gray-100 text-gray-600"
          )}>
            {jobStatus === "completed" ? "Concluído" : jobStatus === "in_progress" ? "Em andamento" : jobStatus}
          </span>
        )}
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Send className="h-7 w-7 text-gray-400" />
            </div>
            <p className="font-medium text-gray-600">Nenhuma mensagem ainda</p>
            <p className="text-sm text-gray-400 mt-1">Seja o primeiro a mandar uma mensagem!</p>
          </div>
        ) : (
          groupedMessages.map(({ date, messages: dayMsgs }) => (
            <div key={date}>
              {/* Separador de data */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs font-medium text-gray-400 bg-gray-100 rounded-full px-3 py-1">{date}</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {dayMsgs.map((msg, i) => {
                const isMine = msg.sender_id === currentUserId;
                const isTemp = msg.id.startsWith("temp-");
                const prevMsg = i > 0 ? dayMsgs[i - 1] : null;
                const showAvatar = !isMine && msg.sender_id !== prevMsg?.sender_id;

                return (
                  <div key={msg.id} className={cn("flex gap-2 mb-1", isMine ? "flex-row-reverse" : "flex-row")}>
                    {/* Avatar */}
                    {!isMine && (
                      <div className={cn("flex-shrink-0", showAvatar ? "visible" : "invisible")}>
                        <div className="h-7 w-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                          {otherUser?.avatar_url
                            ? <img src={otherUser.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                            : otherName[0]?.toUpperCase()}
                        </div>
                      </div>
                    )}

                    {/* Bubble */}
                    <div className={cn("max-w-[70%] group", isMine ? "items-end" : "items-start", "flex flex-col")}>
                      {msg.message_type === "image" && msg.attachment_url ? (
                        <div className="rounded-2xl overflow-hidden shadow-sm max-w-xs">
                          <img src={msg.attachment_url} alt="Imagem" className="w-full object-cover cursor-pointer" onClick={() => window.open(msg.attachment_url!, "_blank")} />
                          {msg.body && msg.body !== `📎 ${msg.body}` && (
                            <div className={cn("px-3 py-2 text-sm", isMine ? "bg-brand-600 text-white" : "bg-white text-gray-800")}>
                              {msg.body}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className={cn(
                          "rounded-2xl px-4 py-2.5 shadow-sm text-sm leading-relaxed",
                          isMine
                            ? "bg-brand-600 text-white rounded-tr-sm"
                            : "bg-white text-gray-800 border border-gray-100 rounded-tl-sm",
                          isTemp && "opacity-60"
                        )}>
                          {msg.attachment_url && (
                            <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className={cn("underline text-xs block mb-1", isMine ? "text-brand-200" : "text-blue-500")}>
                              📎 Ver arquivo
                            </a>
                          )}
                          {msg.body}
                        </div>
                      )}
                      <div className={cn("flex items-center gap-1 mt-0.5 px-1", isMine ? "flex-row-reverse" : "flex-row")}>
                        <span className="text-[10px] text-gray-400">{formatTime(msg.created_at)}</span>
                        {isMine && (
                          isTemp
                            ? <Loader2 className="h-3 w-3 text-gray-300 animate-spin" />
                            : msg.is_read
                            ? <CheckCheck className="h-3 w-3 text-brand-400" />
                            : <Check className="h-3 w-3 text-gray-300" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}

        {/* Indicador "digitando" */}
        {otherTyping && (
          <div className="flex items-center gap-2 px-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200">
              <span className="text-xs font-bold text-gray-600">{otherName[0]}</span>
            </div>
            <div className="flex items-center gap-1 rounded-2xl bg-white border border-gray-100 px-4 py-3 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 bg-white px-4 py-3">
        <div className="flex items-end gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <input ref={fileRef} type="file" className="hidden" onChange={e => e.target.files?.[0] && sendFile(e.target.files[0])} />

          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={e => handleInputChange(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Digite uma mensagem..."
              rows={1}
              style={{ minHeight: "40px", maxHeight: "120px" }}
              className="w-full resize-none rounded-2xl border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-colors"
            />
          </div>

          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-center text-[10px] text-gray-400 mt-1">Enter para enviar • Shift+Enter para nova linha</p>
      </div>
    </div>
  );
}
