import { Library, PlusCircle } from "lucide-react";
import type { ReactNode } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { LibraryPage } from "./pages/LibraryPage";
import { PrepPage } from "./pages/PrepPage";
import { PresentPage } from "./pages/PresentPage";
import { PrintPage } from "./pages/PrintPage";

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
        <rect x="2" y="4" width="28" height="20" rx="4" fill="#F7F3E8" stroke="#0f172a" strokeWidth="2" />
        <path d="M7 17c3-6 5-6 7 0s4 6 7 0" fill="none" stroke="#2F6FE0" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M11 28h10" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
        <circle cx="25" cy="9" r="2" fill="#c8372d" />
      </svg>
      <span className="leading-none">
        <span className="block text-[15px] font-semibold tracking-tight text-slate-900">Quadro Inteligente</span>
        <span className="block text-[11px] text-slate-500">Aulas com IA</span>
      </span>
    </span>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const link = ({ isActive }: { isActive: boolean }) =>
    `inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors ${isActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`;
  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
          <NavLink to="/" aria-label="Início">
            <Logo />
          </NavLink>
          <nav className="ml-auto flex items-center gap-1">
            <NavLink to="/" end className={link}>
              <PlusCircle className="size-4" /> <span className="hidden sm:inline">Nova aula</span>
            </NavLink>
            <NavLink to="/aulas" className={link}>
              <Library className="size-4" /> <span className="hidden sm:inline">Biblioteca</span>
            </NavLink>
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Shell><HomePage /></Shell>} />
      <Route path="/aulas" element={<Shell><LibraryPage /></Shell>} />
      <Route path="/aulas/:id/preparar" element={<Shell><PrepPage /></Shell>} />
      <Route path="/aulas/:id" element={<PresentPage />} />
      <Route path="/aulas/:id/imprimir" element={<PrintPage />} />
      <Route path="*" element={<Shell><div className="p-10 text-center text-slate-500">Página não encontrada.</div></Shell>} />
    </Routes>
  );
}
