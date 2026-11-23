import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Scale } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { errorMessage } from "../api/client";

export default function Login() {
  const { authenticated, login, sessionExpired, clearExpiredNotice } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (authenticated) return <Navigate to="/analise" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username.trim(), password);
      navigate("/analise", { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-lg bg-white p-8 shadow-xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <Scale className="h-8 w-8 text-amber-accent" aria-hidden />
          <h1 className="mt-3 font-serif text-2xl font-bold text-navy">Análise Jurídica</h1>
          <p className="mt-1 text-sm text-slate-500">Entre para analisar seus processos com IA</p>
        </div>

        {sessionExpired && (
          <p role="status" className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Sua sessão expirou. Entre novamente.
          </p>
        )}
        {error && (
          <p role="alert" className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
        )}

        <label className="block text-sm font-medium text-slate-700" htmlFor="username">Usuário</label>
        <input
          id="username" autoFocus autoComplete="username" required value={username}
          onChange={(e) => { setUsername(e.target.value); clearExpiredNotice(); }}
          className="mb-4 mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <label className="block text-sm font-medium text-slate-700" htmlFor="password">Senha</label>
        <input
          id="password" type="password" autoComplete="current-password" required value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-6 mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit" disabled={loading}
          className="w-full rounded-md bg-navy py-2.5 text-sm font-medium text-white hover:bg-navy-soft disabled:opacity-60"
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
