import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

const baseURL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";
const ACCESS = "aj_access";
const REFRESH = "aj_refresh";

export const tokens = {
  get access() { return localStorage.getItem(ACCESS); },
  get refresh() { return localStorage.getItem(REFRESH); },
  set(access: string, refresh?: string) {
    localStorage.setItem(ACCESS, access);
    if (refresh) localStorage.setItem(REFRESH, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS);
    localStorage.removeItem(REFRESH);
  },
};

export const api = axios.create({ baseURL });

// Evento global: o AuthContext escuta para voltar ao login quando a sessão expira.
export const SESSION_EXPIRED = "aj:session-expired";

api.interceptors.request.use((config) => {
  const t = tokens.access;
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

let refreshing: Promise<string> | null = null;

async function refreshAccess(): Promise<string> {
  const refresh = tokens.refresh;
  if (!refresh) throw new Error("sem refresh token");
  // axios "puro": evita cair no próprio interceptor
  const { data } = await axios.post(`${baseURL}/auth/refresh`, { refresh });
  tokens.set(data.access, data.refresh);
  return data.access as string;
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const isAuthRoute = original?.url?.startsWith("/auth/");
    if (error.response?.status === 401 && original && !original._retry && !isAuthRoute) {
      original._retry = true;
      try {
        refreshing ??= refreshAccess().finally(() => { refreshing = null; });
        const access = await refreshing;
        original.headers.Authorization = `Bearer ${access}`;
        return api(original);
      } catch {
        tokens.clear();
        window.dispatchEvent(new Event(SESSION_EXPIRED));
      }
    }
    return Promise.reject(error);
  },
);

/** Converte erros do DRF/rede em uma mensagem amigável em português. */
export function errorMessage(err: unknown): string {
  if (!axios.isAxiosError(err)) return "Erro inesperado. Tente novamente.";
  if (!err.response) return "Não foi possível conectar ao servidor.";
  const { status, data, headers } = err.response;
  if (status === 429) {
    const wait = Number(headers["retry-after"]);
    const mins = wait ? Math.ceil(wait / 60) : null;
    const base = typeof data?.detail === "string" && !data.detail.startsWith("Request was throttled")
      ? data.detail
      : "Limite de uso atingido.";
    return mins ? `${base} Tente novamente em cerca de ${mins} min.` : base;
  }
  if (status === 401) return data?.detail ?? "Usuário ou senha inválidos.";
  if (status === 413) return "Arquivo grande demais.";
  if (typeof data?.detail === "string") return data.detail;
  if (data && typeof data === "object") {
    const first = Object.values(data)[0];
    const msg = Array.isArray(first) ? first[0] : first;
    if (typeof msg === "string") return msg;
  }
  return `Erro ${status}. Tente novamente.`;
}
