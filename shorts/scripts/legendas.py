#!/usr/bin/env python3
"""Gera legendas em português com faster-whisper.

Uso:
  .venv/bin/python scripts/legendas.py brutos/video_semsilencio.mp4 [--modelo small]

Cria, ao lado do vídeo:
  <nome>.srt   legenda tradicional (para subir no YouTube/TikTok)
  <nome>.json  palavras com tempo (para legendas animadas no Remotion)

Modelos: tiny, base, small (padrão, bom em PT), medium, large-v3 (melhor, mais lento).
Na primeira execução o modelo é baixado do huggingface.co.
"""
import argparse, json
from pathlib import Path
from faster_whisper import WhisperModel


def ts(t: float) -> str:
    h, r = divmod(t, 3600)
    m, s = divmod(r, 60)
    return f"{int(h):02}:{int(m):02}:{int(s):02},{int((s % 1) * 1000):03}"


def main():
    p = argparse.ArgumentParser()
    p.add_argument("entrada")
    p.add_argument("--modelo", default="small")
    p.add_argument("--idioma", default="pt")
    a = p.parse_args()

    modelo = WhisperModel(a.modelo, device="cpu", compute_type="int8")
    segs, info = modelo.transcribe(a.entrada, language=a.idioma,
                                   word_timestamps=True, vad_filter=True)

    srt, palavras = [], []
    for i, s in enumerate(segs, 1):
        srt.append(f"{i}\n{ts(s.start)} --> {ts(s.end)}\n{s.text.strip()}\n")
        for w in s.words or []:
            palavras.append({"texto": w.word.strip(), "inicio": round(w.start, 3),
                             "fim": round(w.end, 3)})

    base = Path(a.entrada).with_suffix("")
    Path(f"{base}.srt").write_text("\n".join(srt), encoding="utf-8")
    Path(f"{base}.json").write_text(json.dumps(palavras, ensure_ascii=False, indent=1),
                                    encoding="utf-8")
    print(f"{base}.srt e {base}.json ({len(palavras)} palavras, {info.duration:.1f}s)")


if __name__ == "__main__":
    main()
