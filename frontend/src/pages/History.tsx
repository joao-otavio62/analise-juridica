import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Search, Trash2 } from "lucide-react";
import { api, errorMessage } from "../api/client";
import type { AnalysisItem, Page } from "../api/types";
import { ConfirmDialog } from "../components/ConfirmDialog";

export default function History() {
  const [items, setItems] = useState<AnalysisItem[]>([]);
  const [count, setCount] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [q, setQ] = useState("");
  const [date, setDate] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<AnalysisItem | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQ(q); setPageNum(1); }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<Page<AnalysisItem>>("/analyses", {
        params: { q: debouncedQ || undefined, date: date || undefined, page: pageNum },
      });
      setItems(data.results);
      setCount(data.count);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [debouncedQ, date, pageNum]);

  useEffect(() => { load(); }, [load]);

  async function confirmDelete() {
    if (!toDelete) return;
    try {
      await api.delete(`/analyses/${toDelete.id}`);
      setToDelete(null);
      if (items.length === 1 && pageNum > 1) setPageNum(pageNum - 1); else await load();
    } catch (e) {
      setToDelete(null);
      setError(errorMessage(e));
    }
  }

  const totalPages = Math.max(1, Math.ceil(count / 20));

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="font-serif text-2xl font-bold text-navy">Histórico de análises</h1>

      <div className="my-6 flex flex-wrap gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" aria-hidden />
          <input
            value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar análises"
            placeholder="Buscar por título, arquivo ou conteúdo do resumo…"
            className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <input
          type="date" value={date} aria-label="Filtrar por data"
          onChange={(e) => { setDate(e.target.value); setPageNum(1); }}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
        />
      </div>

      {error && <p role="alert" className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate-500">Carregando…</p>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          {q || date ? "Nenhuma análise encontrada para esse filtro." : (
            <>Você ainda não analisou nenhum documento. <Link to="/analise" className="font-medium text-amber-accent underline">Começar agora</Link></>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((a) => (
            <li key={a.id} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-300">
              <FileText className="mt-1 h-5 w-5 shrink-0 text-amber-accent" aria-hidden />
              <Link to={`/analise/${a.id}`} className="min-w-0 flex-1">
                <p className="truncate font-medium text-navy">{a.title}</p>
                <p className="text-xs text-slate-500">
                  {a.original_filename} · {new Date(a.created_at).toLocaleString("pt-BR")}
                </p>
                {a.preview && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{a.preview}</p>}
              </Link>
              <button
                onClick={() => setToDelete(a)} aria-label={`Excluir ${a.title}`}
                className="rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4 text-sm">
          <button disabled={pageNum <= 1} onClick={() => setPageNum(pageNum - 1)} className="rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-40">Anterior</button>
          <span className="text-slate-600">Página {pageNum} de {totalPages}</span>
          <button disabled={pageNum >= totalPages} onClick={() => setPageNum(pageNum + 1)} className="rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-40">Próxima</button>
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete} danger
        title="Excluir análise?"
        description={<>A análise <strong>{toDelete?.title}</strong>, o chat e o arquivo enviado serão removidos permanentemente.</>}
        confirmLabel="Excluir"
        onCancel={() => setToDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
