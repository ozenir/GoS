import type { Depth, LessonSummary } from "@qi/shared";
import { AlertCircle, Camera, CheckCircle2, ImagePlus, PlayCircle, RotateCcw, RotateCw, ScanSearch, Sparkles, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Card, Field, inputCls, Segmented } from "../components/ui";
import { api, type Health } from "../lib/api";
import { usePref } from "../lib/storage";

const SUBJECTS = ["", "Matemática", "Física", "Química", "Biologia", "Geografia", "História", "Língua Portuguesa", "Inglês"];
const LEVELS = [
  "",
  "Ensino Fundamental — anos finais (6º ao 9º ano)",
  "Ensino Médio — 1º ano",
  "Ensino Médio — 2º ano",
  "Ensino Médio — 3º ano",
  "Pré-vestibular / ENEM",
  "Ensino Superior — ciclo básico",
];
const ACCEPT = ["image/jpeg", "image/png", "image/webp"];
const MAX_MB = 15;

/** Reduz fotos grandes no próprio navegador antes do envio (respeita a orientação EXIF). */
async function prepareImage(file: File): Promise<Blob> {
  if (file.size < 2.5 * 1024 * 1024) return file;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob"))), "image/jpeg", 0.9));
  } catch {
    return file;
  }
}

export function HomePage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [rotate, setRotate] = useState(0);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = usePref("newLesson", { subject: "", level: "", depth: "intermediate" as Depth });
  const [notes, setNotes] = useState("");
  const [health, setHealth] = useState<Health | null>(null);
  const [recent, setRecent] = useState<LessonSummary[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth(null));
    api.list().then(setRecent).catch(() => {});
  }, []);

  const pick = useCallback((f: File | null | undefined) => {
    setError(null);
    if (!f) return;
    if (!ACCEPT.includes(f.type)) {
      setError("Formato não suportado. Envie uma imagem JPG, JPEG, PNG ou WEBP.");
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`A imagem tem mais de ${MAX_MB} MB.`);
      return;
    }
    setFile(f);
    setRotate(0);
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(f);
    });
  }, []);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.type.startsWith("image/"));
      if (item) pick(item.getAsFile());
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [pick]);

  const submit = async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const image = await prepareImage(file);
      const lesson = await api.create({ image, subject: form.subject, level: form.level, depth: form.depth, teacherNotes: notes.trim(), rotate });
      navigate(`/aulas/${lesson.id}/preparar`, { state: { autostart: true } });
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  const sample = recent.find((l) => l.sample);
  const mine = recent.filter((l) => !l.sample).slice(0, 4);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
      <div className="mb-8 max-w-3xl">
        <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 ring-1 ring-indigo-200">
          <Sparkles className="size-3.5" /> Preparação de aula com IA
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Transforme uma questão em uma aula no quadro.</h1>
        <p className="mt-3 text-base leading-relaxed text-slate-600">
          Envie a foto de uma questão. A IA lê, resolve, verifica e organiza a explicação em etapas — com o quadro sendo escrito à mão e o roteiro do que falar, sincronizados.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <div className="grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <div>
              {!preview ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDrag(true);
                  }}
                  onDragLeave={() => setDrag(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDrag(false);
                    pick(e.dataTransfer.files?.[0]);
                  }}
                  className={`flex h-full min-h-80 flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors ${drag ? "border-indigo-400 bg-indigo-50" : "border-slate-300 bg-slate-50"}`}
                >
                  <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
                    <ImagePlus className="size-7 text-indigo-600" />
                  </div>
                  <p className="font-medium text-slate-900">Arraste a imagem da questão para cá</p>
                  <p className="mt-1 text-sm text-slate-500">ou cole com Ctrl+V · JPG, PNG ou WEBP até {MAX_MB} MB</p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    <Button variant="primary" icon={<Upload className="size-4" />} onClick={() => fileInput.current?.click()}>
                      Selecionar imagem
                    </Button>
                    <Button icon={<Camera className="size-4" />} onClick={() => cameraInput.current?.click()}>
                      Tirar foto
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex h-full flex-col">
                  <div className="relative flex min-h-80 flex-1 items-center justify-center overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200">
                    <img
                      src={preview}
                      alt="Pré-visualização da questão"
                      className="max-h-[420px] max-w-full object-contain transition-transform duration-300"
                      style={{ transform: `rotate(${rotate}deg)`, maxWidth: rotate % 180 ? "420px" : undefined }}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button size="sm" icon={<RotateCcw className="size-4" />} onClick={() => setRotate((r) => (r + 270) % 360)}>
                      Girar
                    </Button>
                    <Button size="sm" icon={<RotateCw className="size-4" />} onClick={() => setRotate((r) => (r + 90) % 360)}>
                      Girar
                    </Button>
                    <span className="min-w-0 flex-1 truncate text-xs text-slate-500">{file?.name}</span>
                    <Button size="sm" variant="ghost" icon={<Trash2 className="size-4" />} onClick={() => { setFile(null); setPreview(null); }}>
                      Remover
                    </Button>
                  </div>
                </div>
              )}
              <input ref={fileInput} type="file" accept={ACCEPT.join(",")} className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
              <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
            </div>

            <div className="flex flex-col gap-4">
              <Field label="Disciplina" hint="Opcional — a IA identifica automaticamente.">
                <select className={inputCls} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}>
                  {SUBJECTS.map((s) => (
                    <option key={s} value={s}>{s || "Detectar automaticamente"}</option>
                  ))}
                </select>
              </Field>
              <Field label="Ano escolar / nível do aluno" hint="Opcional — ajuda a calibrar a linguagem.">
                <select className={inputCls} value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
                  {LEVELS.map((s) => (
                    <option key={s} value={s}>{s || "Não informado"}</option>
                  ))}
                </select>
              </Field>
              <div>
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Profundidade da explicação</span>
                <Segmented
                  value={form.depth}
                  onChange={(v) => setForm({ ...form, depth: v })}
                  options={[
                    { value: "basic", label: "Básica" },
                    { value: "intermediate", label: "Intermediária" },
                    { value: "advanced", label: "Avançada" },
                  ]}
                />
              </div>
              <Field label="Observações para a IA" hint="Ex.: “o aluno confunde seno e cosseno”, “foque na alternativa C”.">
                <textarea className={`${inputCls} min-h-20 resize-y`} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" />
              </Field>
              {error && (
                <p className="flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-200">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" /> {error}
                </p>
              )}
              <Button variant="primary" size="lg" className="mt-auto w-full" disabled={!file} loading={busy} icon={<ScanSearch className="size-5" />} onClick={submit}>
                Analisar questão
              </Button>
            </div>
          </div>
        </Card>

        <div className="flex flex-col gap-6">
          <Card title="Status da IA">
            {health?.ai.configured ? (
              <p className="flex items-start gap-2 text-sm text-slate-600">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                <span>
                  Conectada ao modelo <code className="rounded bg-slate-100 px-1 text-[12px]">{health.ai.model}</code>.
                </span>
              </p>
            ) : (
              <div className="text-sm text-slate-600">
                <p className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-500" />
                  {health ? "A chave da API de IA não está configurada no servidor." : "Servidor indisponível."}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  Defina <code className="rounded bg-slate-100 px-1">ANTHROPIC_API_KEY</code> em <code className="rounded bg-slate-100 px-1">server/.env</code> e reinicie o servidor. A aula de exemplo funciona sem IA.
                </p>
              </div>
            )}
          </Card>

          {sample && (
            <Link to={`/aulas/${sample.id}`} className="group block overflow-hidden rounded-2xl bg-[#f7f3e8] p-5 shadow-sm ring-1 ring-amber-200/70 transition-shadow hover:shadow-md">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">Aula de exemplo</p>
              <p className="mt-1 font-hand text-2xl leading-tight text-slate-900">{sample.title}</p>
              <p className="mt-1 text-sm text-slate-600">{sample.stepCount} etapas · {sample.subject}</p>
              <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-700 group-hover:underline">
                <PlayCircle className="size-4" /> Assistir à demonstração
              </span>
            </Link>
          )}

          {mine.length > 0 && (
            <Card title="Aulas recentes" actions={<Link to="/aulas" className="text-xs font-medium text-indigo-600 hover:underline">Ver todas</Link>}>
              <ul className="-my-2 divide-y divide-slate-100">
                {mine.map((l) => (
                  <li key={l.id}>
                    <Link to={l.status === "ready" ? `/aulas/${l.id}` : `/aulas/${l.id}/preparar`} className="block py-2.5 hover:text-indigo-700">
                      <span className="block truncate text-sm font-medium">{l.title || "Questão sem título"}</span>
                      <span className="text-xs text-slate-500">{l.subject || "—"} · {new Date(l.updatedAt).toLocaleDateString("pt-BR")}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
