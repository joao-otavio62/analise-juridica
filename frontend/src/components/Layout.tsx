import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Scale, LogOut } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { ConfirmDialog } from "./ConfirmDialog";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
    isActive ? "border-amber-accent text-white" : "border-transparent text-slate-300 hover:text-white"
  }`;

export function Layout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [confirmLogout, setConfirmLogout] = useState(false);

  return (
    <div className="flex h-screen flex-col">
      <header className="bg-navy text-white">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-3">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-amber-accent" aria-hidden />
              <span className="font-serif text-base font-bold">Análise Jurídica</span>
            </div>
            <nav className="flex gap-2">
              <NavLink to="/analise" end className={linkClass}>Nova análise</NavLink>
              <NavLink to="/historico" className={linkClass}>Histórico</NavLink>
            </nav>
          </div>
          <button
            onClick={() => setConfirmLogout(true)}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-navy-soft hover:text-white"
          >
            <LogOut className="h-4 w-4" aria-hidden /> Sair
          </button>
        </div>
      </header>
      <main className="min-h-0 flex-1 overflow-auto">
        <Outlet />
      </main>
      <ConfirmDialog
        open={confirmLogout}
        title="Encerrar sessão?"
        description="Você precisará entrar novamente para acessar suas análises."
        confirmLabel="Sair"
        onCancel={() => setConfirmLogout(false)}
        onConfirm={async () => { await logout(); setConfirmLogout(false); navigate("/login", { replace: true }); }}
      />
    </div>
  );
}
