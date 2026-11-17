"""Monta o documento config/biblioteca do Estúdio (Artifact) a partir da biblioteca local e dos assets já enviados.

    python3 scripts/biblioteca_estudio.py Jhin Xerath ...   # -> dados/biblioteca-estudio.json  (+ lista do que falta enviar)

O Estúdio usa esse documento para mostrar o estilo viral no player: splash e vídeos das habilidades do
campeão em destaque. Arquivos ainda não enviados aparecem em "faltaEnviar" (envie como asset do Artifact,
anote o id em dados/assets.json e rode de novo). Sem argumentos, usa todos os campeões que têm algo enviado.
"""
import json
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
BIB = RAIZ / "biblioteca" / "campeoes"


def main():
    assets = json.loads((RAIZ / "dados" / "assets.json").read_text())
    nomes = sys.argv[1:] or sorted({k.split("/")[2] for k in assets if k.startswith("biblioteca/campeoes/") and k.endswith((".mp4", "splash.jpg"))})
    doc, falta = {}, []
    for cid in nomes:
        arq = BIB / cid / "dados.json"
        if not arq.exists():
            print(f"sem biblioteca: {cid} (rode scripts/biblioteca.py campeao {cid})", file=sys.stderr)
            continue
        d = json.loads(arq.read_text())
        rel = lambda f: f"biblioteca/campeoes/{cid}/{f}"
        if rel("splash.jpg") not in assets and (BIB / cid / "splash.jpg").exists():
            falta.append(rel("splash.jpg"))
        vids = []
        for nome, v in d.get("videos", {}).items():
            a = assets.get(rel(v["arquivo"]))
            if not a:
                falta.append(rel(v["arquivo"]))
                continue
            vids.append({"asset": a, "dur": v.get("duracao") or 4, "foco": v.get("foco"), "w": v.get("w"), "h": v.get("h"),
                         "letra": nome[0], "nome": d.get("habilidades", {}).get(nome[0], {}).get("nome")})
        doc[cid] = {"nome": d["nome"], "splash": assets.get(rel("splash.jpg")), "videos": vids}
    saida = RAIZ / "dados" / "biblioteca-estudio.json"
    saida.write_text(json.dumps({"campeoes": doc}, ensure_ascii=False, indent=1))
    print(json.dumps({"campeoes": len(doc), "faltaEnviar": falta}, ensure_ascii=False))


if __name__ == "__main__":
    main()
