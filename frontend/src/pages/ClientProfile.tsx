import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowDownToLine, ArrowLeft, FileText, Pencil, Trash2, Upload } from "lucide-react";
import { api, errorMessage } from "../api/client";
import type { ClientDocument, ClientRecord } from "../api/types";
import { ClientForm, type ClientFormValues } from "../components/ClientForm";
import { ConfirmDialog } from "../components/ConfirmDialog";

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm text-navy">{value || "—"}</dd>
    </div>
  );
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} bytes`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ClientProfile() {
  const { id } = useParams();
  const fileInput = useRef<HTMLInputElement>(null);
  const [client, setClient] = useState<ClientRecord | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toDeleteDocument, setToDeleteDocument] = useState<ClientDocument | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setClient(null);
    setError(null);
    api.get<ClientRecord>(`/clients/${id}`)
      .then(({ data }) => { if (!cancelled) setClient(data); })
      .catch((e) => { if (!cancelled) setError(errorMessage(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  async function saveClient(values: ClientFormValues) {
    const { data } = await api.patch<ClientRecord>(`/clients/${id}`, values);
    setClient(data);
    setEditing(false);
  }

  async function uploadDocument(file?: File) {
    if (!file || !client) return;
    setUploading(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const { data } = await api.post<ClientDocument>(`/clients/${client.id}/documents`, form);
      setClient((current) => current
        ? { ...current, documents: [data, ...current.documents] }
        : current);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function downloadDocument(document: ClientDocument) {
    if (!client) return;
    setError(null);
    try {
      const { data } = await api.get(
        `/clients/${client.id}/documents/${document.id}/download`,
        { responseType: "blob" },
      );
      const url = URL.createObjectURL(data);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = document.original_filename;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function confirmDeleteDocument() {
    if (!client || !toDeleteDocument) return;
    setError(null);
    try {
      await api.delete(`/clients/${client.id}/documents/${toDeleteDocument.id}`);
      setClient((current) => current
        ? { ...current, documents: current.documents.filter((item) => item.id !== toDeleteDocument.id) }
        : current);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setToDeleteDocument(null);
    }
  }

  if (loading) return <p className="p-8 text-sm text-slate-500">Carregando perfil do cliente…</p>;
  if (!client) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-8">
        <p role="alert" className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error ?? "Cliente não encontrado."}</p>
        <Link to="/clientes" className="text-sm font-medium text-amber-accent hover:underline">Voltar para clientes</Link>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-8">
        <button type="button" onClick={() => setEditing(false)} className="inline-flex items-center gap-2 text-sm font-medium text-amber-accent hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Voltar ao perfil
        </button>
        <h1 className="mb-6 mt-3 font-serif text-2xl font-bold text-navy">Editar {client.full_name}</h1>
        <ClientForm initial={client} submitLabel="Salvar alterações" onSubmit={saveClient} onCancel={() => setEditing(false)} />
      </div>
    );
  }

  const address = [client.street, client.address_number, client.complement, client.neighborhood]
    .filter(Boolean).join(", ");
  const city = [client.city, client.state].filter(Boolean).join(" / ");

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link to="/clientes" className="inline-flex items-center gap-2 text-sm font-medium text-amber-accent hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Todos os clientes
        </Link>
        <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          <Pencil className="h-4 w-4" aria-hidden /> Editar perfil
        </button>
      </div>

      <header className="mb-6 rounded-lg bg-navy p-6 text-white">
        <p className="text-sm text-slate-300">Perfil do cliente</p>
        <h1 className="mt-1 font-serif text-2xl font-bold">{client.full_name}</h1>
        <p className="mt-2 text-sm text-slate-300">
          {client.cpf ? `CPF ${client.cpf}` : "CPF não informado"}
          {client.process_number ? ` · Processo ${client.process_number}` : ""}
        </p>
      </header>

      {error && <p role="alert" className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-serif text-lg font-bold text-navy">Dados pessoais</h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Info label="Nome completo" value={client.full_name} />
            <Info label="CPF" value={client.cpf} />
            <Info label="RG" value={client.rg} />
            <Info label="Data de nascimento" value={client.birth_date ? new Date(`${client.birth_date}T00:00:00`).toLocaleDateString("pt-BR") : ""} />
            <Info label="E-mail" value={client.email} />
            <Info label="Telefone" value={client.phone} />
            <Info label="Profissão" value={client.profession} />
            <Info label="Estado civil" value={client.marital_status} />
            <Info label="Endereço" value={address} />
            <Info label="Cidade / UF" value={city} />
            <Info label="CEP" value={client.zip_code} />
            <Info label="Observações pessoais" value={client.personal_notes} />
          </dl>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-serif text-lg font-bold text-navy">Processo jurídico</h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Info label="Número do processo" value={client.process_number} />
            <Info label="Vara / Tribunal" value={client.court} />
            <Info label="Tipo de ação" value={client.case_type} />
            <Info label="Assunto" value={client.subject} />
            <Info label="Parte contrária" value={client.opposing_party} />
            <Info label="Situação" value={client.process_status} />
            <div className="sm:col-span-2"><Info label="Observações do processo" value={client.process_notes} /></div>
          </dl>
        </section>
      </div>

      <section className="mt-5 rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-lg font-bold text-navy">Documentos do cliente</h2>
            <p className="mt-1 text-sm text-slate-500">Os arquivos ficam privados e vinculados a este perfil.</p>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept=".doc,.docx,.jpg,.jpeg,.pdf,.png,.txt,.xls,.xlsx"
            className="hidden"
            onChange={(event) => void uploadDocument(event.target.files?.[0])}
          />
          <button type="button" onClick={() => fileInput.current?.click()} disabled={uploading} className="inline-flex items-center gap-2 rounded-md bg-navy px-3 py-2 text-sm font-medium text-white hover:bg-navy-soft disabled:opacity-60">
            <Upload className="h-4 w-4" aria-hidden /> {uploading ? "Enviando…" : "Anexar documento"}
          </button>
        </div>
        {client.documents.length === 0 ? (
          <p className="mt-5 rounded-md border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Nenhum documento anexado.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {client.documents.map((document) => (
              <li key={document.id} className="flex flex-wrap items-center gap-3 py-3">
                <FileText className="h-5 w-5 shrink-0 text-amber-accent" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-navy">{document.original_filename}</span>
                  <span className="text-xs text-slate-500">{formatFileSize(document.file_size)} · {new Date(document.uploaded_at).toLocaleDateString("pt-BR")}</span>
                </span>
                <button type="button" onClick={() => void downloadDocument(document)} aria-label={`Baixar ${document.original_filename}`} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-navy">
                  <ArrowDownToLine className="h-4 w-4" aria-hidden />
                </button>
                <button type="button" onClick={() => setToDeleteDocument(document)} aria-label={`Excluir ${document.original_filename}`} className="rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-700">
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <ConfirmDialog
        open={!!toDeleteDocument}
        danger
        title="Excluir documento?"
        description={<>O arquivo <strong>{toDeleteDocument?.original_filename}</strong> será removido permanentemente.</>}
        confirmLabel="Excluir documento"
        onCancel={() => setToDeleteDocument(null)}
        onConfirm={confirmDeleteDocument}
      />
    </div>
  );
}
