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
