import { useState, type FormEvent } from "react";
import { errorMessage } from "../api/client";
import type { ClientRecord } from "../api/types";

type ClientFormValues = Omit<ClientRecord, "id" | "documents" | "created_at" | "updated_at">;

const emptyValues: ClientFormValues = {
  full_name: "",
  cpf: "",
  rg: "",
  birth_date: "",
  email: "",
  phone: "",
  profession: "",
  marital_status: "",
  zip_code: "",
  street: "",
  address_number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  personal_notes: "",
  process_number: "",
  court: "",
  case_type: "",
  subject: "",
  opposing_party: "",
  process_status: "",
  process_notes: "",
};

interface Field {
  name: keyof ClientFormValues;
  label: string;
  type?: string;
  multiline?: boolean;
}

const personalFields: Field[] = [
  { name: "full_name", label: "Nome completo" },
  { name: "cpf", label: "CPF" },
  { name: "rg", label: "RG" },
  { name: "birth_date", label: "Data de nascimento", type: "date" },
  { name: "email", label: "E-mail", type: "email" },
  { name: "phone", label: "Telefone" },
  { name: "profession", label: "Profissão" },
  { name: "marital_status", label: "Estado civil" },
  { name: "personal_notes", label: "Observações pessoais", multiline: true },
];

const addressFields: Field[] = [
  { name: "zip_code", label: "CEP" },
  { name: "street", label: "Rua / Avenida" },
  { name: "address_number", label: "Número" },
  { name: "complement", label: "Complemento" },
  { name: "neighborhood", label: "Bairro" },
  { name: "city", label: "Cidade" },
  { name: "state", label: "UF" },
];

const processFields: Field[] = [
  { name: "process_number", label: "Número do processo" },
  { name: "court", label: "Vara / Tribunal" },
  { name: "case_type", label: "Tipo de ação" },
  { name: "subject", label: "Assunto" },
  { name: "opposing_party", label: "Parte contrária" },
  { name: "process_status", label: "Situação do processo" },
  { name: "process_notes", label: "Observações do processo", multiline: true },
];

interface Props {
  initial?: ClientRecord;
  submitLabel: string;
  onSubmit: (values: ClientFormValues) => Promise<void>;
  onCancel: () => void;
}

export function ClientForm({ initial, submitLabel, onSubmit, onCancel }: Props) {
  const [values, setValues] = useState<ClientFormValues>(() => initial
    ? {
        full_name: initial.full_name,
        cpf: initial.cpf,
        rg: initial.rg,
        birth_date: initial.birth_date ?? "",
        email: initial.email,
        phone: initial.phone,
        profession: initial.profession,
        marital_status: initial.marital_status,
        zip_code: initial.zip_code,
        street: initial.street,
        address_number: initial.address_number,
        complement: initial.complement,
        neighborhood: initial.neighborhood,
        city: initial.city,
        state: initial.state,
        personal_notes: initial.personal_notes,
        process_number: initial.process_number,
        court: initial.court,
        case_type: initial.case_type,
        subject: initial.subject,
        opposing_party: initial.opposing_party,
        process_status: initial.process_status,
        process_notes: initial.process_notes,
      }
    : emptyValues);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit({ ...values, birth_date: values.birth_date || null });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function renderFields(fields: Field[]) {
    return fields.map((field) => (
      <label key={field.name} className={field.multiline ? "sm:col-span-2" : ""}>
        <span className="mb-1 block text-sm font-medium text-slate-700">{field.label}</span>
        {field.multiline ? (
          <textarea
            value={values[field.name] ?? ""}
            onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))}
            rows={3}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        ) : (
          <input
            type={field.type ?? "text"}
            name={field.name}
            required={field.name === "full_name"}
            maxLength={field.name === "state" ? 2 : undefined}
            value={values[field.name] ?? ""}
            onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        )}
      </label>
    ));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-4 font-serif text-lg font-bold text-navy">Dados pessoais</h2>
        <div className="grid gap-4 sm:grid-cols-2">{renderFields(personalFields)}</div>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-4 font-serif text-lg font-bold text-navy">Endereço</h2>
        <div className="grid gap-4 sm:grid-cols-2">{renderFields(addressFields)}</div>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-4 font-serif text-lg font-bold text-navy">Processo jurídico</h2>
        <div className="grid gap-4 sm:grid-cols-2">{renderFields(processFields)}</div>
      </section>
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Cancelar
        </button>
        <button type="submit" disabled={busy} className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-soft disabled:opacity-60">
          {busy ? "Salvando…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

export type { ClientFormValues };
