import { useEffect, useRef, useState, type FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import { Send } from "lucide-react";
import { api, errorMessage } from "../api/client";
import type { ChatMessage } from "../api/types";

const MAX_CHARS = 2000;

interface Props { analysisId: number; initial: ChatMessage[] }

export function ChatPanel({ analysisId, initial }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initial);
  const [text, setText] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, pending]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const message = text.trim();
    if (!message || pending) return;
    setError(null);
    setPending(message);
    setText("");
    try {
      const { data } = await api.post<ChatMessage[]>(`/analyses/${analysisId}/chat`, { message });
      setMessages((prev) => [...prev, ...data]);
    } catch (err) {
      setError(errorMessage(err));
      setText(message); // devolve o texto para o usuário tentar de novo
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 px-6 py-3">
        <h2 className="font-serif text-base font-bold text-navy">Chat do caso</h2>
        <p className="text-xs text-slate-500">Pergunte sobre o documento analisado.</p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4" aria-live="polite">
        {messages.length === 0 && !pending && (
          <p className="text-sm text-slate-400">
            Ex.: “Quais são os principais riscos para o réu?” ou “Qual o prazo para contestar?”
          </p>
        )}
        {messages.map((m) => <Bubble key={m.id} role={m.role} content={m.content} />)}
        {pending && (
          <>
            <Bubble role="user" content={pending} />
            <p className="text-sm italic text-slate-400">Analisando…</p>
          </>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="border-t border-slate-200 p-4">
        {error && <p role="alert" className="mb-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
        <div className="flex gap-2">
          <textarea
            value={text} rows={2} maxLength={MAX_CHARS} aria-label="Sua pergunta"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }}
            placeholder="Escreva sua pergunta… (Enter envia, Shift+Enter quebra linha)"
            className="min-h-[44px] flex-1 resize-none rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="submit" disabled={!text.trim() || !!pending} aria-label="Enviar pergunta"
            className="self-end rounded-md bg-navy px-3 py-2.5 text-white hover:bg-navy-soft disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

function Bubble({ role, content }: { role: "user" | "assistant"; content: string }) {
  const mine = role === "user";
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[88%] rounded-lg px-4 py-2.5 text-sm leading-relaxed ${
          mine ? "bg-navy text-white" : "border border-slate-200 bg-white text-slate-800"
        }`}
      >
        {mine ? <p className="whitespace-pre-wrap">{content}</p> : (
          <div className="prose-chat"><ReactMarkdown>{content}</ReactMarkdown></div>
        )}
      </div>
    </div>
  );
}
