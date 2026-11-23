import { useRef, useState, type DragEvent } from "react";
import { FileUp } from "lucide-react";

export const ACCEPTED = [".txt", ".pdf", ".docx", ".xlsx"];
export const MAX_MB = 100;

/** Valida no cliente (o servidor valida de novo). Retorna mensagem de erro ou null. */
export function validateFile(file: File): string | null {
  const ext = "." + (file.name.split(".").pop() ?? "").toLowerCase();
  if (ext === ".doc" || ext === ".xls") return `Formato ${ext} antigo não é suportado. Salve como ${ext}x.`;
  if (!ACCEPTED.includes(ext)) return `Formato não suportado. Use: ${ACCEPTED.join(", ")}.`;
  if (file.size === 0) return "O arquivo está vazio.";
  if (file.size > MAX_MB * 1024 * 1024) return `Arquivo acima do limite de ${MAX_MB}MB.`;
  return null;
}

interface Props { onSelect: (file: File) => void; error?: string | null }

export function UploadZone({ onSelect, error }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onSelect(file);
  }

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col justify-center px-6 py-12">
      <h1 className="font-serif text-2xl font-bold text-navy">Nova análise</h1>
      <p className="mb-6 mt-2 text-sm text-slate-600">
        Envie o documento do processo para receber um resumo estruturado e conversar com a IA sobre o caso.
      </p>
      <div
        role="button" tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed px-6 py-16 text-center transition-colors ${
          dragging ? "border-amber-accent bg-amber-50" : "border-slate-300 bg-white hover:border-slate-400"
        }`}
      >
        <FileUp className="h-10 w-10 text-amber-accent" aria-hidden />
        <p className="mt-3 text-sm font-medium text-navy">Arraste o arquivo aqui ou clique para selecionar</p>
        <p className="mt-1 text-xs text-slate-500">TXT, PDF, Word (.docx) ou Excel (.xlsx) · até {MAX_MB}MB</p>
        <input
          ref={inputRef} type="file" hidden accept={ACCEPTED.join(",")}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onSelect(f); e.target.value = ""; }}
        />
      </div>
      {error && <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      <p className="mt-4 text-xs text-slate-500">
        O conteúdo será enviado à IA (Google Gemini) para análise. Evite enviar dados que você não está autorizado a compartilhar.
      </p>
    </div>
  );
}
