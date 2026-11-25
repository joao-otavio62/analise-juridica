import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, RefreshCw, Search, UserRound } from "lucide-react";
import { errorMessage, getClients } from "../api/client";
import type { ClientRecord } from "../api/types";

function normalizeText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
}

export default function Clients() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadClients() {
    setLoading(true);
    setError(null);
    try {
      setClients(await getClients());
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadClients(); }, []);

  const filteredClients = useMemo(() => {
    const text = normalizeText(query);
    const cpf = query.replace(/\D/g, "");
    if (!text && !cpf) return clients;
    return clients.filter((client) => (
      normalizeText(client.full_name).includes(text)
      || (cpf.length > 0 && client.cpf.replace(/\D/g, "").includes(cpf))
    ));
  }, [clients, query]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-navy">Clientes</h1>
          <p className="mt-1 text-sm text-slate-600">Dados pessoais, processos e documentos em um só lugar.</p>
        </div>
        <Link to="/clientes/novo" className="inline-flex items-center gap-2 rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-soft">
          <Plus className="h-4 w-4" aria-hidden /> Novo cliente
        </Link>
      </div>

      <div className="my-6 flex flex-wrap gap-3">
        <label className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" aria-hidden />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Buscar cliente por nome ou CPF"
            placeholder="Buscar por nome ou CPF…"
            className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm"
          />
        </label>
        <button
          type="button"
          onClick={() => void loadClients()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className="h-4 w-4" aria-hidden /> Atualizar
        </button>
      </div>

      {error && (
        <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          <span>{error}</span>
          <button type="button" onClick={() => void loadClients()} className="font-medium underline">Tentar novamente</button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Carregando clientes… Consultas à lista respeitam o intervalo mínimo de 5 segundos.</p>
      ) : filteredClients.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          {query ? "Nenhum cliente encontrado para essa busca." : (
            <>
              Você ainda não cadastrou clientes.{" "}
              <Link to="/clientes/novo" className="font-medium text-amber-accent underline">Cadastrar primeiro cliente</Link>
            </>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {filteredClients.map((client) => (
            <li key={client.id}>
              <Link to={`/clientes/${client.id}`} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-300 hover:shadow-sm">
                <span className="rounded-full bg-amber-50 p-2 text-amber-accent">
                  <UserRound className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-navy">{client.full_name}</span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {client.cpf ? `CPF ${client.cpf}` : "CPF não informado"}
                    {client.process_number ? ` · Processo ${client.process_number}` : ""}
                  </span>
                  {client.process_status && <span className="mt-2 inline-block rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">{client.process_status}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {!loading && clients.length > 0 && (
        <p className="mt-4 text-right text-xs text-slate-500">
          {filteredClients.length} de {clients.length} cliente(s)
        </p>
      )}
    </div>
  );
}
