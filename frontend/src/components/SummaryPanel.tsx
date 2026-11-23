import type { ReactNode } from "react";
import { AlertTriangle, CalendarClock } from "lucide-react";
import type { AnalysisDetail } from "../api/types";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-6">
      <h3 className="mb-2 border-b border-amber-accent/40 pb-1 font-serif text-sm font-bold uppercase tracking-wide text-amber-accent">
        {title}
      </h3>
      {children}
    </section>
  );
}

const Empty = () => <p className="text-sm italic text-slate-400">Nada identificado no documento.</p>;

export function SummaryPanel({ analysis }: { analysis: AnalysisDetail }) {
  const s = analysis.summary;
  return (
    <div className="p-6">
      <h2 className="font-serif text-xl font-bold text-navy">{analysis.title}</h2>
      <p className="mb-5 mt-1 text-xs text-slate-500">
        {analysis.original_filename} · {analysis.char_count.toLocaleString("pt-BR")} caracteres analisados ·{" "}
        {new Date(analysis.created_at).toLocaleString("pt-BR")}
      </p>
      {analysis.text_truncated && (
        <p role="status" className="mb-5 flex gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          O documento é muito extenso: apenas o início foi analisado pela IA.
        </p>
      )}

      {s.resumo_geral && <p className="mb-6 text-sm leading-relaxed text-slate-700">{s.resumo_geral}</p>}

      <Section title="Partes envolvidas">
        {s.partes_envolvidas.length === 0 ? <Empty /> : (
          <ul className="space-y-1.5">
            {s.partes_envolvidas.map((p, i) => (
              <li key={i} className="text-sm">
                <span className="font-medium">{p.nome}</span>
                {p.papel && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">{p.papel}</span>}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Fatos principais">
        {s.fatos_principais.length === 0 ? <Empty /> : (
          <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-slate-700">
            {s.fatos_principais.map((f, i) => <li key={i}>{f}</li>)}
          </ol>
        )}
      </Section>

      <Section title="Riscos e prazos">
        {s.riscos_prazos.length === 0 ? <Empty /> : (
          <ul className="space-y-2">
            {s.riscos_prazos.map((r, i) => {
              const isDeadline = r.tipo.startsWith("prazo");
              const Icon = isDeadline ? CalendarClock : AlertTriangle;
              return (
                <li key={i} className="flex gap-2 rounded-md border border-slate-200 bg-white p-3 text-sm">
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${isDeadline ? "text-navy" : "text-amber-accent"}`} aria-hidden />
                  <div>
                    <span className="text-xs font-semibold uppercase text-slate-500">{isDeadline ? "Prazo" : "Risco"}</span>
                    <p className="text-slate-700">{r.descricao}</p>
                    {r.prazo && <p className="mt-0.5 text-xs font-medium text-navy">{r.prazo}</p>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </div>
  );
}
