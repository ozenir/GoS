#!/usr/bin/env python3
"""Gera a narração de um projeto do painel com edge-tts (gratuito, vozes pt-BR).

Uso: .venv/bin/python scripts/narrar.py projetos/<id> --hash <hash>

Lê   projetos/<id>/otimizado.json (cenas[].narracao, cenas[].destaque)
     projetos/<id>/config.json    (voz, velocidade)
Gera projetos/<id>/narracao.m4a   (áudio único)
     projetos/<id>/trilha.json    (tempo de cada cena e de cada palavra)

O tempo das palavras vem do próprio TTS (WordBoundary), então a legenda fica
sincronizada sem precisar do Whisper.
"""
import argparse, asyncio, json, os, re, shutil, subprocess, sys, unicodedata, wave
from pathlib import Path

import edge_tts

GAP = 0.10  # respiro entre cenas (s)
TAXA = 48000


def norm(s: str) -> str:
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^\w%+]", "", s)


async def falar(texto: str, voz: str, rate: str, destino: Path, tentativas: int = 3):
    # o serviço de voz às vezes devolve "No audio was received" por instantes: tenta de novo
    for n in range(tentativas):
        try:
            return await _falar(texto, voz, rate, destino)
        except (edge_tts.exceptions.NoAudioReceived, edge_tts.exceptions.WebSocketError, OSError):
            if n == tentativas - 1:
                raise
            await asyncio.sleep(2 * (n + 1))


async def _falar(texto: str, voz: str, rate: str, destino: Path):
    kw = {"rate": rate, "boundary": "WordBoundary"}
    proxy = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy")
    if proxy:
        kw["proxy"] = proxy
    com = edge_tts.Communicate(texto, voz, **kw)
    palavras = []
    with open(destino, "wb") as f:
        async for ch in com.stream():
            if ch["type"] == "audio":
                f.write(ch["data"])
            elif ch["type"] == "WordBoundary":
                ini = ch["offset"] / 1e7
                palavras.append({"texto": ch["text"], "inicio": ini, "fim": ini + ch["duration"] / 1e7})
    return palavras


VOZ_CLONADA = "minha-voz"
RAIZ = Path(__file__).resolve().parent.parent


def voz_clonada(textos: list[str], pasta: Path, vel: int) -> list[dict]:
    """Gera as cenas com a voz do usuário no ambiente .venv-voz (scripts/voz_clonada.py)."""
    py = next((p for p in [RAIZ / ".venv-voz" / "bin" / "python", RAIZ / ".venv-voz" / "Scripts" / "python.exe"] if p.exists()), None)
    if not py:
        sys.exit("Ambiente da voz clonada não instalado (.venv-voz). Veja 'Minha voz' no CLAUDE.md.")
    pasta.mkdir(parents=True, exist_ok=True)
    pedido = pasta / "pedido.json"
    pedido.write_text(json.dumps({"cenas": textos, "saida": str(pasta), "velocidade": vel,
                                  "referencia": str(RAIZ / "voz" / "ref" / "referencia.wav")}, ensure_ascii=False), encoding="utf-8")
    proc = subprocess.Popen([str(py), "-I", str(RAIZ / "scripts" / "voz_clonada.py"), str(pedido)],
                            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding="utf-8")
    ultima = ""
    for linha in proc.stdout:
        linha = linha.rstrip()
        if linha.startswith("{"):
            ultima = linha
        elif linha.startswith(("cena ", "voz clonada", "  cena", "amostra")):
            print(linha, flush=True)
    if proc.wait() != 0 or not ultima:
        sys.exit("Falha na voz clonada.")
    return json.loads(ultima)["cenas"]


def para_wav(src: Path, dst: Path, pad: float):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-af", f"apad=pad_dur={pad}",
                    "-ar", str(TAXA), "-ac", "1", str(dst)], check=True)
    with wave.open(str(dst)) as w:
        return w.getnframes() / w.getframerate()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("projeto")
    ap.add_argument("--hash", default="")
    a = ap.parse_args()
    proj = Path(a.projeto)
    ot = json.loads((proj / "otimizado.json").read_text(encoding="utf-8"))
    cfg = json.loads((proj / "config.json").read_text(encoding="utf-8"))
    voz = cfg.get("voz", "pt-BR-AntonioNeural")
    vel = int(cfg.get("velocidade", 10))
    rate = f"{'+' if vel >= 0 else ''}{vel}%"

    pasta = proj / "narracao"
    pasta.mkdir(exist_ok=True)
    shutil.rmtree(pasta, ignore_errors=True)
    pasta.mkdir(exist_ok=True)

    cenas_out, wavs, t = [], [], 0.15
    lista = [c for c in ot.get("cenas", []) if c.get("narracao", "").strip()]
    if not lista:
        sys.exit("Nenhuma cena com narração.")
    clonadas = voz_clonada([c["narracao"].strip() for c in lista], pasta / "clonada", vel) if voz == VOZ_CLONADA else None
    for i, c in enumerate(lista):
        if clonadas:
            audio, pal = Path(clonadas[i]["wav"]), clonadas[i]["palavras"]
        else:
            print(f"cena {i + 1}/{len(lista)}", flush=True)
            audio = pasta / f"cena{i:02}.mp3"
            pal = asyncio.run(falar(c["narracao"].strip(), voz, rate, audio))
        wav = pasta / f"cena{i:02}.wav"
        dur = para_wav(audio, wav, GAP)
        wavs.append(wav)
        alvo = {norm(d) for d in c.get("destaque", []) for d in d.split()}
        palavras = [{"texto": p["texto"], "inicio": round(t + p["inicio"], 3),
                     "fim": round(t + p["fim"], 3), "destaque": norm(p["texto"]) in alvo}
                    for p in pal]
        # sem WordBoundary (raro): distribui as palavras pelo tempo da cena
        if not palavras:
            ws = c["narracao"].split()
            passo = (dur - GAP) / max(1, len(ws))
            palavras = [{"texto": w, "inicio": round(t + k * passo, 3), "fim": round(t + (k + 1) * passo, 3),
                         "destaque": norm(w) in alvo} for k, w in enumerate(ws)]
        cenas_out.append({"inicio": round(t, 3), "fim": round(t + dur - GAP, 3), "palavras": palavras})
        t += dur

    # junta tudo (com 0.15s de silêncio no começo)
    lst = pasta / "lista.txt"
    lst.write_text("".join(f"file '{w.name}'\n" for w in wavs))
    tmp = pasta / "junto.wav"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(lst),
                    "-c", "copy", str(tmp)], check=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(tmp), "-af", "adelay=150",
                    "-c:a", "aac", "-b:a", "192k", str(proj / "narracao.m4a")], check=True)
    for f in pasta.glob("*.wav"):
        f.unlink()
    if (pasta / "clonada").exists():
        for f in (pasta / "clonada").glob("*"):
            f.unlink()
        (pasta / "clonada").rmdir()

    trilha = {"fonte": "narracao", "hash": a.hash, "duracao": round(t, 3), "cenas": cenas_out}
    (proj / "trilha.json").write_text(json.dumps(trilha, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"ok {t:.1f}s", flush=True)


if __name__ == "__main__":
    main()
