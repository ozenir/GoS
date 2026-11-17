#!/usr/bin/env python3
"""Remove os silêncios de um vídeo usando o silencedetect do FFmpeg.

Uso:
  .venv/bin/python scripts/cortar_silencios.py brutos/video.mp4 [saida.mp4]
      [--limiar -35] [--min 0.5] [--margem 0.12]

--limiar  volume (dB) abaixo do qual conta como silêncio (padrão -35)
--min     duração mínima (s) de um silêncio para ser cortado (padrão 0.5)
--margem  respiro (s) mantido antes/depois de cada fala (padrão 0.12)
"""
import argparse, re, subprocess, sys
from pathlib import Path


def duracao(arq: str) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", arq], capture_output=True, text=True, check=True)
    return float(out.stdout.strip())


def silencios(arq: str, limiar: float, minimo: float):
    out = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", arq, "-af",
         f"silencedetect=noise={limiar}dB:d={minimo}", "-f", "null", "-"],
        capture_output=True, text=True).stderr
    ini = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", out)]
    fim = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", out)]
    return list(zip(ini, fim + [None] * (len(ini) - len(fim))))


def main():
    p = argparse.ArgumentParser()
    p.add_argument("entrada")
    p.add_argument("saida", nargs="?")
    p.add_argument("--limiar", type=float, default=-35)
    p.add_argument("--min", type=float, default=0.5)
    p.add_argument("--margem", type=float, default=0.12)
    a = p.parse_args()

    total = duracao(a.entrada)
    saida = a.saida or str(Path(a.entrada).with_name(Path(a.entrada).stem + "_semsilencio.mp4"))

    # Trechos a manter = o complemento dos silêncios (com margem)
    manter, cursor = [], 0.0
    for s, e in silencios(a.entrada, a.limiar, a.min):
        e = total if e is None else e
        corte_ini, corte_fim = s + a.margem, e - a.margem
        if corte_fim - corte_ini <= 0.05:
            continue
        if corte_ini > cursor:
            manter.append((cursor, corte_ini))
        cursor = corte_fim
    if cursor < total:
        manter.append((cursor, total))

    if not manter:
        sys.exit("Nenhum trecho com som encontrado (ajuste --limiar).")

    partes, rotulos = [], ""
    for i, (s, e) in enumerate(manter):
        partes.append(f"[0:v]trim={s:.3f}:{e:.3f},setpts=PTS-STARTPTS[v{i}];"
                      f"[0:a]atrim={s:.3f}:{e:.3f},asetpts=PTS-STARTPTS[a{i}];")
        rotulos += f"[v{i}][a{i}]"
    filtro = "".join(partes) + f"{rotulos}concat=n={len(manter)}:v=1:a=1[v][a]"

    script = Path(saida).with_suffix(".filtro.txt")
    script.write_text(filtro)
    subprocess.run(["ffmpeg", "-hide_banner", "-v", "error", "-y", "-i", a.entrada,
                    "-filter_complex_script", str(script), "-map", "[v]", "-map", "[a]",
                    "-c:v", "libx264", "-preset", "medium", "-crf", "18",
                    "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", saida], check=True)
    script.unlink()
    nova = sum(e - s for s, e in manter)
    print(f"{saida}: {total:.1f}s -> {nova:.1f}s ({len(manter)} trechos, -{total - nova:.1f}s)")


if __name__ == "__main__":
    main()
