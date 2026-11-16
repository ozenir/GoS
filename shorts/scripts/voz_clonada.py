"""Narração com a voz clonada do usuário (Chatterbox multilíngue, pt) + tempo de cada palavra (Whisper).

Roda no ambiente da voz (.venv-voz, com PyTorch). Quem chama é o scripts/narrar.py quando a voz do
projeto é "minha-voz":

    .venv-voz/bin/python scripts/voz_clonada.py pedido.json

pedido.json: {"cenas": ["texto 1", "texto 2", ...], "saida": "pasta", "velocidade": 10,
              "referencia": "voz/ref/referencia.wav"}
Gera <saida>/cenaNN.wav e imprime, na última linha, o JSON:
    {"cenas": [{"wav": "...", "palavras": [{"texto", "inicio", "fim"}]}]}

As palavras mantêm a grafia do roteiro; o Whisper só dá os tempos. Se a fala sair cortada (faltando
palavras no fim), a cena é gerada de novo com outra semente, até 3 vezes.
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
PARAMS = {"exaggeration": 0.4, "cfg_weight": 0.3, "temperature": 0.7}  # os que deram a voz mais parecida


def norm(s: str) -> str:
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^\w%+]", "", s)


def alinhar(texto: str, ditas: list[dict], dur: float) -> list[dict]:
    """Palavras do roteiro com os tempos das palavras que o Whisper ouviu."""
    orig = texto.split()
    a = [norm(w) for w in orig]
    b = [norm(w["texto"]) for w in ditas]
    tempos: list[tuple[float, float] | None] = [None] * len(orig)
    for bloco in difflib.SequenceMatcher(a=a, b=b, autojunk=False).get_matching_blocks():
        for k in range(bloco.size):
            w = ditas[bloco.b + k]
            tempos[bloco.a + k] = (w["inicio"], w["fim"])
    # palavras sem par (números falados por extenso, nomes): reparte o espaço entre as vizinhas conhecidas
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


def main():
    pedido = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    saida = Path(pedido["saida"])
    saida.mkdir(parents=True, exist_ok=True)
    ref = Path(pedido.get("referencia") or RAIZ / "voz" / "ref" / "referencia.wav")
    if not ref.exists():
        sys.exit(f"amostra da voz não encontrada: {ref} (veja 'Minha voz' no CLAUDE.md)")
    fator = 1 + int(pedido.get("velocidade", 0)) / 100

    from chatterbox.mtl_tts import ChatterboxMultilingualTTS
    from faster_whisper import WhisperModel

    dev = "cuda" if torch.cuda.is_available() else "cpu"
    if dev == "cpu":
        torch.set_num_threads(max(1, (torch.get_num_threads() or 4)))
    print(f"voz clonada em {dev}", flush=True)
    tts = ChatterboxMultilingualTTS.from_pretrained(device=dev)
    ouvido = WhisperModel("small", device=dev, compute_type="float16" if dev == "cuda" else "int8")

    res = []
    cenas = pedido["cenas"]
    for i, texto in enumerate(cenas):
        print(f"cena {i + 1}/{len(cenas)}", flush=True)
        melhor = None
        for tentativa in range(3):
            torch.manual_seed(1000 + i * 10 + tentativa)
            wav = tts.generate(texto, language_id="pt", audio_prompt_path=str(ref), **PARAMS)
            bruto = saida / f"cena{i:02}_bruto.wav"
            ta.save(str(bruto), wav, tts.sr)
            final = saida / f"cena{i:02}_t{tentativa}.wav"
            # velocidade do projeto (+10% = um pouco mais rápido), sem mudar o tom
            subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", str(bruto), "-af", f"atempo={fator}", str(final)], check=True)
            audio16, _ = librosa.load(str(final), sr=16000)  # carregado aqui: evita a leitura de arquivo do Whisper
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
    print(json.dumps({"cenas": res}, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
