import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, errorMessage } from "../api/client";
import type { AnalysisDetail } from "../api/types";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { ChatPanel } from "../components/ChatPanel";
import { SummaryPanel } from "../components/SummaryPanel";
import { UploadZone, validateFile } from "../components/UploadZone";

export default function Dashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<AnalysisDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  useEffect(() => {
    setError(null);
    if (!id) { setAnalysis(null); return; }
    let cancelled = false;
    setLoading(true);
    api.get<AnalysisDetail>(`/analyses/${id}`)
      .then((r) => { if (!cancelled) setAnalysis(r.data); })
      .catch((e) => { if (!cancelled) { setAnalysis(null); setError(errorMessage(e)); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  function onSelect(file: File) {
    const problem = validateFile(file);
    if (problem) { setError(problem); return; }
    setError(null);
    setPendingFile(file);
  }

  async function confirmUpload() {
    if (!pendingFile) return;
    const form = new FormData();
    form.append("file", pendingFile);
    try {
      const { data } = await api.post<AnalysisDetail>("/analyses", form, { timeout: 180_000 });
      setPendingFile(null);
      navigate(`/analise/${data.id}`);
    } catch (e) {
      setPendingFile(null);
      setError(errorMessage(e));
    }
  }

  if (loading) return <p className="p-8 text-sm text-slate-500">Carregando análise…</p>;

  if (!analysis) {
    return (
      <>
        <UploadZone onSelect={onSelect} error={error} />
        <ConfirmDialog
          open={!!pendingFile}
          title="Enviar arquivo para a IA?"
          description={
            <>
              O conteúdo de <strong>{pendingFile?.name}</strong> será enviado ao Google Gemini para gerar o resumo.
              Isso consome sua cota de uploads (limite por hora) e pode levar alguns segundos.
            </>
          }
          confirmLabel="Enviar e analisar"
          onCancel={() => setPendingFile(null)}
          onConfirm={confirmUpload}
        />
      </>
    );
  }

  return (
    <div className="grid h-full grid-cols-1 lg:grid-cols-2">
      <div className="overflow-y-auto border-slate-200 lg:border-r">
        <SummaryPanel analysis={analysis} />
      </div>
      <div className="min-h-[60vh] bg-slate-50 lg:min-h-0">
        <ChatPanel key={analysis.id} analysisId={analysis.id} initial={analysis.messages} />
      </div>
    </div>
  );
}
