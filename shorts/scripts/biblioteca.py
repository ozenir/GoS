"""Biblioteca de mídia por campeão: baixa uma vez, reaproveita em todos os vídeos.

    .venv/bin/python scripts/biblioteca.py campeao Xerath Akali "Jarvan IV"
    .venv/bin/python scripts/biblioteca.py listar

Para cada campeão cria biblioteca/campeoes/<Id>/:
    dados.json            nome, chave, versão do Data Dragon e habilidades (recarga, custo, alcance)
    arte.jpg / icone.png  arte de carregamento e ícone quadrado (Data Dragon)
    splash.jpg            splash art horizontal (fundo em tela cheia no estilo viral)
    habilidades/<X>.png   ícones da passiva (P) e de Q, W, E, R
    videos/<X>.mp4        vídeo oficial da habilidade (o mesmo das páginas de campeão da Riot),
                          recomprimido e sem som; habilidades com mais de um vídeo ganham <X>2.mp4…
    quadros/<X>.jpg       um quadro do vídeo (o chão do jogo), usado de fundo na prova "alcance"
    interacoes/           clipes de interações e jogadas (gravados pelo usuário ou montados depois)

Arquivos que já existem não são baixados de novo. Use --forcar para baixar tudo outra vez.
"""
import argparse
import json
import subprocess
import sys
import unicodedata
import urllib.request
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
BIB = RAIZ / "biblioteca" / "campeoes"
DD = "https://ddragon.leagueoflegends.com"
# a página oficial usa o 1º; o 2º é o endereço antigo, que ainda tem a maioria dos vídeos
VIDEOS = ["https://lol.dyn.riotcdn.net/x/videos/champion-abilities", "https://d28xe8vt774jo5.cloudfront.net/champion-abilities"]
LETRAS = ["P", "Q", "W", "E", "R"]


def baixar(url: str) -> bytes | None:
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "estudio-shorts"}), timeout=60) as r:
            return r.read()
    except Exception:
        return None


def salvar(destino: Path, url: str, forcar: bool) -> bool:
    if destino.exists() and not forcar:
        return True
    dados = baixar(url)
    if not dados:
        return False
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_bytes(dados)
    return True


def norm(s: str) -> str:
    s = unicodedata.normalize("NFD", s)
    return "".join(c for c in s if c.isalnum() and unicodedata.category(c) != "Mn").lower()


def versao() -> str:
    return json.loads(baixar(f"{DD}/api/versions.json"))[0]


def lista_campeoes(v: str) -> dict:
    return json.loads(baixar(f"{DD}/cdn/{v}/data/pt_BR/champion.json"))["data"]


def achar(nome: str, campeoes: dict) -> str | None:
    n = norm(nome)
    for cid, c in campeoes.items():
        if norm(cid) == n or norm(c["name"]) == n:
            return cid
    return None


def video(destino: Path, chave: str, rotulo: str, forcar: bool) -> bool:
    """Baixa o vídeo da habilidade, tira o som e recomprime (fica ~5x menor)."""
    if destino.exists() and not forcar:
        return True
    dados = None
    for base in VIDEOS:
        for ext in ("mp4", "webm"):
            dados = dados or baixar(f"{base}/{chave}/ability_{chave}_{rotulo}.{ext}")
    if not dados:
        return False
    destino.parent.mkdir(parents=True, exist_ok=True)
    bruto = destino.with_suffix(".bruto")
    bruto.write_bytes(dados)
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-i", str(bruto), "-an", "-vf", "scale='min(1056,iw)':-2", "-c:v", "libx264", "-preset", "slow", "-crf", "28",
         "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(destino)],
        check=True,
    )
    bruto.unlink()
    return True


def quadro(video_: Path, destino: Path, forcar: bool):
    """Um quadro do começo do vídeo: o campeão parado no chão do jogo."""
    if destino.exists() and not forcar:
        return
    destino.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", "0.15", "-i", str(video_), "-frames:v", "1", "-q:v", "3", str(destino)], check=True)


def tamanho(arq: Path) -> tuple[int, int]:
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", str(arq)], capture_output=True, text=True)
    try:
        w, h = r.stdout.strip().split(",")[:2]
        return int(w), int(h)
    except ValueError:
        return 1056, 720


FOCO_PADRAO = [0.55, 0.65]  # onde o campeão costuma estar nos vídeos da Riot (centro, parte de baixo)


def duracao(arq: Path) -> float:
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(arq)], capture_output=True, text=True)
    try:
        return round(float(r.stdout.strip()), 2)
    except ValueError:
        return 0.0


def campeao(cid: str, v: str, forcar: bool):
    d = BIB / cid
    anterior = json.loads((d / "dados.json").read_text()) if (d / "dados.json").exists() else {}
    info = json.loads(baixar(f"{DD}/cdn/{v}/data/pt_BR/champion/{cid}.json"))["data"][cid]
    chave = info["key"].zfill(4)
    salvar(d / "arte.jpg", f"{DD}/cdn/img/champion/loading/{cid}_0.jpg", forcar)
    salvar(d / "icone.png", f"{DD}/cdn/{v}/img/champion/{cid}.png", forcar)
    salvar(d / "splash.jpg", f"{DD}/cdn/img/champion/splash/{cid}_0.jpg", forcar)  # horizontal, para o estilo viral
    salvar(d / "habilidades" / "P.png", f"{DD}/cdn/{v}/img/passive/{info['passive']['image']['full']}", forcar)
    hab = {"P": {"nome": info["passive"]["name"], "descricao": info["passive"]["description"]}}
    for letra, s in zip("QWER", info["spells"]):
        salvar(d / "habilidades" / f"{letra}.png", f"{DD}/cdn/{v}/img/spell/{s['image']['full']}", forcar)
        hab[letra] = {"nome": s["name"], "recarga": s["cooldown"], "custo": s["cost"], "alcance": s["range"], "descricao": s["description"]}
    videos = {}
    for letra in LETRAS:
        for n in (1, 2, 3):
            nome = letra if n == 1 else f"{letra}{n}"
            arq = d / "videos" / f"{nome}.mp4"
            if not video(arq, chave, f"{letra}{n}", forcar):
                break
            quadro(arq, d / "quadros" / f"{nome}.jpg", forcar)
            w, h = tamanho(arq)
            velho = anterior.get("videos", {}).get(nome, {})
            videos[nome] = {"arquivo": f"videos/{nome}.mp4", "quadro": f"quadros/{nome}.jpg", "duracao": duracao(arq), "w": w, "h": h,
                            # foco medido à mão (campeão em destaque no vídeo) é mantido; sem medida, usa o padrão
                            "foco": velho.get("foco", FOCO_PADRAO), "focoMedido": velho.get("focoMedido", False)}
    (d / "interacoes").mkdir(parents=True, exist_ok=True)
    (d / "interacoes" / ".gitkeep").touch()
    dados = {"id": cid, "nome": info["name"], "titulo": info["title"], "chave": chave, "versao": v,
             "alcanceAtaque": info["stats"]["attackrange"], "habilidades": hab, "videos": videos}
    (d / "dados.json").write_text(json.dumps(dados, ensure_ascii=False, indent=1))
    mb = sum(f.stat().st_size for f in d.rglob("*") if f.is_file()) / 1048576
    print(f"ok: biblioteca/campeoes/{cid} ({info['name']}) · vídeos {', '.join(videos) or 'nenhum'} · {mb:.1f} MB")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("campeao")
    c.add_argument("nomes", nargs="+")
    c.add_argument("--forcar", action="store_true")
    sub.add_parser("listar")
    a = ap.parse_args()
    if a.cmd == "listar":
        for d in sorted(BIB.glob("*/dados.json")):
            j = json.loads(d.read_text())
            print(f"{j['id']:<14} {j['nome']:<16} vídeos: {', '.join(j['videos'])}  (Data Dragon {j['versao']})")
        return
    v = versao()
    campeoes = lista_campeoes(v)
    for nome in a.nomes:
        cid = achar(nome, campeoes)
        if not cid:
            print(f"não achei o campeão: {nome}", file=sys.stderr)
            continue
        campeao(cid, v, a.forcar)


if __name__ == "__main__":
    main()
