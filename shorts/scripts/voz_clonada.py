"""Narração com a voz do usuário ("minha-voz").

Roda no ambiente da voz (.venv-voz, com PyTorch). Quem chama é o scripts/narrar.py:

    .venv-voz/bin/python scripts/voz_clonada.py pedido.json

Modo "conversao" (o escolhido pelo usuário: sotaque brasileiro neutro, o timbre dele):
    pedido.json: {"modo": "conversao", "audios": ["cena00.mp3", ...], "saida": "pasta",
                  "referencia": "voz/ref/referencia.wav"}
    Cada áudio (fala do Antonio, edge-tts, com os tempos das palavras já conhecidos) é convertido para
    o timbre do usuário com o ChatterboxVC. Imprime na última linha:
    {"cenas": [{"wav": "...", "dur_origem": s, "dur": s}]}  (o narrar.py ajusta os tempos se a duração mudar)

Modo "clonagem" (texto direto na voz clonada; pronúncia com sotaque estranho em pt, guardado para testes):
    pedido.json: {"modo": "clonagem", "cenas": ["texto", ...], "saida": "pasta", "velocidade": 10, "referencia": ...}
    Imprime {"cenas": [{"wav": "...", "palavras": [{"texto", "inicio", "fim"}]}]} (tempos pelo Whisper).
"""
import difflib
import json
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

import librosa
import torch
import torchaudio as ta

RAIZ = Path(__file__).resolve().parent.parent
PARAMS_CLONAGEM = {"exaggeration": 0.5, "cfg_weight": 0.6, "temperature": 0.5}


def norm(s: str) -> str:
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^\w%+]", "", s)


def duracao(arq: Path) -> float:
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(arq)],
                       capture_output=True, text=True)
    return float(r.stdout.strip() or 0)


def dispositivo() -> str:
    dev = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"voz do usuário em {dev}", flush=True)
    return dev


def conversao(pedido: dict, saida: Path, ref: Path):
    from chatterbox.vc import ChatterboxVC

    vc = ChatterboxVC.from_pretrained(device=dispositivo())
    vc.set_target_voice(str(ref))
    res = []
    audios = pedido["audios"]
    for i, a in enumerate(audios):
        print(f"cena {i + 1}/{len(audios)}", flush=True)
        wav = vc.generate(a)
        out = saida / f"cena{i:02}.wav"
        ta.save(str(out), wav, vc.sr)
        res.append({"wav": str(out), "dur_origem": duracao(Path(a)), "dur": wav.shape[-1] / vc.sr})
    return res


def alinhar(texto: str, ditas: list[dict], dur: float) -> list[dict]:
    """Palavras do roteiro com os tempos das palavras que o Whisper ouviu."""
    orig = texto.split()
    a = [norm(w) for w in orig]
    b = [norm(w["texto"]) for w in ditas]
    tempos: list = [None] * len(orig)
    for bloco in difflib.SequenceMatcher(a=a, b=b, autojunk=False).get_matching_blocks():
        for k in range(bloco.size):
            w = ditas[bloco.b + k]
            tempos[bloco.a + k] = (w["inicio"], w["fim"])
    i = 0
    while i < len(orig):
        if tempos[i] is not None:
            i += 1
            continue
        j = i
        while j < len(orig) and tempos[j] is None:
            j += 1
        ini = tempos[i - 1][1] if i > 0 else (ditas[0]["inicio"] if ditas else 0.0)
        fim = tempos[j][0] if j < len(orig) else (ditas[-1]["fim"] if ditas else dur)
        fim = max(fim, ini + 0.12 * (j - i))
        passo = (fim - ini) / (j - i)
        for k in range(i, j):
            tempos[k] = (ini + passo * (k - i), ini + passo * (k - i + 1))
        i = j
    return [{"texto": re.sub(r"[.,!?;:…]+$", "", w), "inicio": round(t[0], 3), "fim": round(t[1], 3)} for w, t in zip(orig, tempos)]


def clonagem(pedido: dict, saida: Path, ref: Path):
    from chatterbox.mtl_tts import ChatterboxMultilingualTTS
    from faster_whisper import WhisperModel

    dev = dispositivo()
    tts = ChatterboxMultilingualTTS.from_pretrained(device=dev)
    ouvido = WhisperModel("small", device=dev, compute_type="float16" if dev == "cuda" else "int8")
    fator = 1 + int(pedido.get("velocidade", 0)) / 100
    res = []
    cenas = pedido["cenas"]
    for i, texto in enumerate(cenas):
        print(f"cena {i + 1}/{len(cenas)}", flush=True)
        melhor = None
        for tentativa in range(3):
            torch.manual_seed(1000 + i * 10 + tentativa)
            wav = tts.generate(texto, language_id="pt", audio_prompt_path=str(ref), **PARAMS_CLONAGEM)
            bruto = saida / f"cena{i:02}_bruto.wav"
            ta.save(str(bruto), wav, tts.sr)
            final = saida / f"cena{i:02}_t{tentativa}.wav"
            subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", str(bruto), "-af", f"atempo={fator}", str(final)], check=True)
            audio16, _ = librosa.load(str(final), sr=16000)
            segs, _ = ouvido.transcribe(audio16, language="pt", word_timestamps=True, vad_filter=False)
            ditas = [{"texto": w.word.strip(), "inicio": w.start, "fim": w.end} for s in segs for w in (s.words or [])]
            dur = wav.shape[-1] / tts.sr / fator
            ouvidas = {norm(w["texto"]) for w in ditas}
            fim_texto = [norm(w) for w in texto.split()][-3:]
            cobertura = sum(1 for w in fim_texto if w in ouvidas) / max(1, len(fim_texto))
            nota = (cobertura, len(ditas) / max(1, len(texto.split())))
            if melhor is None or nota > melhor[0]:
                melhor = (nota, final, ditas, dur)
            if cobertura >= 0.67:
                break
            print(f"  cena {i + 1}: fim cortado, gerando de novo", flush=True)
        _, escolhido, ditas, dur = melhor
        final = saida / f"cena{i:02}.wav"
        escolhido.replace(final)
        for f in saida.glob(f"cena{i:02}_*.wav"):
            f.unlink()
        res.append({"wav": str(final), "palavras": alinhar(texto, ditas, dur)})
    return res


def main():
    pedido = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    saida = Path(pedido["saida"])
    saida.mkdir(parents=True, exist_ok=True)
    ref = Path(pedido.get("referencia") or RAIZ / "voz" / "ref" / "referencia.wav")
    if not ref.exists():
        sys.exit(f"amostra da voz não encontrada: {ref} (veja 'Minha voz' no CLAUDE.md)")
    if torch.device("cpu"):
        torch.set_num_threads(max(1, torch.get_num_threads()))
    res = clonagem(pedido, saida, ref) if pedido.get("modo") == "clonagem" else conversao(pedido, saida, ref)
    print(json.dumps({"cenas": res}, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
