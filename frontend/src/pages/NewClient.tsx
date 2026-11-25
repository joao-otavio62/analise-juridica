import { Link, useNavigate } from "react-router-dom";
import { ClientForm, type ClientFormValues } from "../components/ClientForm";
import { api } from "../api/client";
import type { ClientRecord } from "../api/types";

export default function NewClient() {
  const navigate = useNavigate();

  async function createClient(values: ClientFormValues) {
    const { data } = await api.post<ClientRecord>("/clients", values);
    navigate(`/clientes/${data.id}`);
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <Link to="/clientes" className="text-sm font-medium text-amber-accent hover:underline">
        ← Voltar para clientes
      </Link>
      <h1 className="mb-6 mt-3 font-serif text-2xl font-bold text-navy">Novo cliente</h1>
      <ClientForm submitLabel="Criar cliente" onSubmit={createClient} onCancel={() => navigate("/clientes")} />
    </div>
  );
}
