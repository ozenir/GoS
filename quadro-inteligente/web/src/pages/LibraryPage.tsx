import type { LessonSummary } from "@qi/shared";
import { BookOpen, Clock, Play, Plus, Trash2, Wand2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ErrorBox } from "../components/JobProgress";
import { Badge, Button, Spinner } from "../components/ui";
import { api } from "../lib/api";

const STATUS: Record<LessonSummary["status"], { label: string; tone: "slate" | "indigo" | "green" | "amber" | "rose" }> = {
  uploaded: { label: "Aguardando análise", tone: "slate" },
  analyzing: { label: "Analisando", tone: "indigo" },
  analyzed: { label: "Pronta para gerar", tone: "amber" },
  generating: { label: "Gerando aula", tone: "indigo" },
  ready: { label: "Aula pronta", tone: "green" },
  error: { label: "Erro", tone: "rose" },
};

export function LibraryPage() {
  const [items, setItems] = useState<LessonSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = () => api.list().then(setItems).catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);

  const remove = async (l: LessonSummary) => {
    if (!confirm(`Excluir a aula “${l.title || "sem título"}”? Esta ação não pode ser desfeita.`)) return;
    await api.remove(l.id).catch((e) => setError(e.message));
    load();
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Biblioteca de aulas</h1>
          <p className="mt-1 text-sm text-slate-500">Aulas preparadas anteriormente, prontas para apresentar.</p>
        </div>
        <Link to="/"><Button variant="primary" icon={<Plus className="size-4" />}>Nova aula</Button></Link>
      </div>
      {error && <ErrorBox message={error} />}
      {!items ? (
        <div className="flex justify-center p-16 text-slate-400"><Spinner /></div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center text-slate-500">Nenhuma aula ainda.</div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((l) => {
            const st = STATUS[l.status];
            const href = l.status === "ready" ? `/aulas/${l.id}` : `/aulas/${l.id}/preparar`;
            return (
              <li key={l.id} className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition-shadow hover:shadow-md">
                <Link to={href} className="relative block h-36 overflow-hidden bg-[#f7f3e8]">
                  {l.hasImage ? (
                    <img src={api.imageUrl(l.id)} alt="" className="h-full w-full object-cover object-top opacity-90 transition-transform duration-300 group-hover:scale-[1.03]" loading="lazy" />
                  ) : (
                    <div className="flex h-full items-center justify-center p-4 text-center font-hand text-2xl text-slate-800">{l.title}</div>
                  )}
                  <span className="absolute left-3 top-3"><Badge tone={st.tone}>{st.label}</Badge></span>
                  {l.sample && <span className="absolute right-3 top-3"><Badge tone="amber">Exemplo</Badge></span>}
                </Link>
                <div className="flex flex-1 flex-col p-4">
                  <Link to={href} className="line-clamp-2 font-medium leading-snug text-slate-900 hover:text-indigo-700">{l.title || "Questão sem título"}</Link>
                  <p className="mt-1 text-xs text-slate-500">{[l.subject, l.level].filter(Boolean).join(" · ") || "—"}</p>
                  <div className="mt-auto flex items-center gap-3 pt-4 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1"><Clock className="size-3.5" />{new Date(l.updatedAt).toLocaleDateString("pt-BR")}</span>
                    {l.stepCount > 0 && <span className="inline-flex items-center gap-1"><BookOpen className="size-3.5" />{l.stepCount} etapas</span>}
                    <span className="ml-auto flex gap-1">
                      {!l.sample && (
                        <button onClick={() => remove(l)} className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="Excluir"><Trash2 className="size-4" /></button>
                      )}
                      <Link to={href} className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 font-medium text-indigo-700 hover:bg-indigo-50">
                        {l.status === "ready" ? <><Play className="size-3.5" />Apresentar</> : <><Wand2 className="size-3.5" />Continuar</>}
                      </Link>
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
