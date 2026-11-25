export interface Party { nome: string; papel: string }
export interface RiskDeadline { tipo: string; descricao: string; prazo: string | null }
export interface Summary {
  resumo_geral: string;
  partes_envolvidas: Party[];
  fatos_principais: string[];
  riscos_prazos: RiskDeadline[];
}
export interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}
export interface AnalysisItem {
  id: number;
  title: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  char_count: number;
  text_truncated: boolean;
  preview: string;
  created_at: string;
}
export interface AnalysisDetail extends AnalysisItem {
  summary: Summary;
  messages: ChatMessage[];
}
export interface Page<T> { count: number; next: string | null; previous: string | null; results: T[] }

export interface ClientDocument {
  id: number;
  original_filename: string;
  file_size: number;
  uploaded_at: string;
}

export interface ClientRecord {
  id: number;
  full_name: string;
  cpf: string;
  rg: string;
  birth_date: string | null;
  email: string;
  phone: string;
  profession: string;
  marital_status: string;
  zip_code: string;
  street: string;
  address_number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  personal_notes: string;
  process_number: string;
  court: string;
  case_type: string;
  subject: string;
  opposing_party: string;
  process_status: string;
  process_notes: string;
  documents: ClientDocument[];
  created_at: string;
  updated_at: string;
}
