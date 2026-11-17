"""Acha os vídeos curtos de LoL que mais cresceram: muitas visualizações em pouco tempo.

    .venv/bin/python scripts/virais.py              # -> dados/virais/AAAA-MM-DD.json
    .venv/bin/python scripts/virais.py --dias 7     # janela (padrão 10 dias)

Fontes:
  YouTube Shorts  buscas pt-BR e inglês com o filtro "Shorts de hoje" e "Shorts desta semana". O YouTube não
                  entrega a data exata a robôs: a idade vira o limite do filtro (24 h ou 7 dias) e a velocidade
                  é um MÍNIMO garantido (estimado: true)
  TikTok          perfis grandes de LoL (a busca e as hashtags do TikTok bloqueiam robôs); lista em CONTAS_TIKTOK
Métrica principal: velocidade = visualizações por hora desde a publicação. Também: views por inscrito do canal
(quanto o vídeo foi além do público do canal) e engajamento (likes + comentários por view).
"""
import argparse
import concurrent.futures as cf
import datetime as dt
import json
import re
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
YTDLP = str(RAIZ / ".venv" / "bin" / "yt-dlp")
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36", "Accept-Language": "pt-BR,pt;q=0.9"}
FILTROS = {"semana": "EgQIAxAJ", "hoje": "EgQIAhAJ"}  # Shorts + data de envio
BUSCAS = ["league of legends", "lol", "lol brasil", "league of legends brasil", "lol shorts", "lol outplay",
          "lol dica", "lol build", "lol campeão", "cblol", "worlds lol", "league of legends funny", "lol meme",
          "league of legends tips", "league of legends outplay", "lol new dawn", "faker", "lol pentakill"]
CONTAS_TIKTOK = ["leagueoflegends", "leagueoflegendsbr", "lolesports", "cblol", "ilhadaslendas", "mylonlol",
                 "caedrel", "loltyler1", "necrit"]


def baixar(url: str) -> str:
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
            return r.read().decode("utf-8", errors="ignore")
    except Exception:
        return ""


def numero(txt: str) -> int:
    t = (txt or "").lower().replace("\xa0", " ")
    m = re.search(r"([\d.,]+)\s*(mi|mil|k|m|b)?\b", t)
    if not m:
        return 0
    n, suf = m.group(1), m.group(2)
    if suf:
        return int(float(n.replace(".", "").replace(",", ".")) * {"mi": 1e6, "m": 1e6, "mil": 1e3, "k": 1e3, "b": 1e9}[suf])
    return int(re.sub(r"[.,]", "", n) or 0)


def shorts_da_busca(pagina: str) -> list[dict]:
    m = re.search(r"var ytInitialData = (\{.*?\});</script>", pagina)
    if not m:
        return []
    out = []

    def walk(o):
        if isinstance(o, dict):
            if "shortsLockupViewModel" in o:
                v = o["shortsLockupViewModel"]
                ov = v.get("overlayMetadata", {})
                vid = v.get("onTap", {}).get("innertubeCommand", {}).get("reelWatchEndpoint", {}).get("videoId")
                if vid:
                    out.append({"id": vid, "titulo": ov.get("primaryText", {}).get("content", ""), "views": numero(ov.get("secondaryText", {}).get("content", ""))})
            for x in o.values():
                walk(x)
        elif isinstance(o, list):
            for x in o:
                walk(x)

    try:
        walk(json.loads(m.group(1)))
    except json.JSONDecodeError:
        pass
    return out


def youtube(janela_h: float) -> list[dict]:
    vistos = {}
    for q in BUSCAS:
        for nome, f in FILTROS.items():
            for v in shorts_da_busca(baixar(f"https://www.youtube.com/results?search_query={urllib.parse.quote_plus(q)}&sp={f}")):
                idade = 24 if nome == "hoje" else 24 * 7
                if v["id"] not in vistos or idade < vistos[v["id"]]["idadeMax"]:
                    vistos[v["id"]] = {"plataforma": "youtube", "id": v["id"], "url": f"https://www.youtube.com/shorts/{v['id']}", "titulo": v["titulo"],
                                       "canal": "", "views": v["views"], "idadeMax": idade, "estimado": True,
                                       "timestamp": time.time() - idade * 3600, "busca": q}
    return list(vistos.values())


def _seguro(f, *a):
    try:
        return f(*a)
    except Exception:
        return None


def tiktok_perfil(conta: str) -> list[dict]:
    r = subprocess.run([YTDLP, "--flat-playlist", "--playlist-end", "30", "-J", "--no-warnings", f"https://www.tiktok.com/@{conta}"],
                       capture_output=True, text=True, timeout=150)
    try:
        d = json.loads(r.stdout)
    except Exception:
        return []
    out = []
    for e in (d or {}).get("entries") or []:
        if not e:
            continue
        out.append({"plataforma": "tiktok", "id": e.get("id"), "url": e.get("url") or f"https://www.tiktok.com/@{conta}/video/{e.get('id')}",
                    "titulo": (e.get("title") or e.get("description") or "")[:200], "canal": conta, "inscritos": e.get("channel_follower_count"),
                    "views": e.get("view_count") or 0, "likes": e.get("like_count"), "comentarios": e.get("comment_count"),
                    "duracao": e.get("duration"), "timestamp": e.get("timestamp")})
    return out


def tiktok(janela_h: float) -> list[dict]:
    with cf.ThreadPoolExecutor(5) as ex:
        todos = [v for lst in ex.map(lambda c: _seguro(tiktok_perfil, c) or [], CONTAS_TIKTOK) for v in lst]
    return [v for v in todos if v["timestamp"] and time.time() - v["timestamp"] <= janela_h * 3600]


def metricas(v: dict) -> dict:
    horas = max(1.0, (time.time() - v["timestamp"]) / 3600)
    v["horas"] = round(horas, 1)
    v["velocidade"] = round(v["views"] / horas)  # views por hora
    v["publicado"] = dt.datetime.fromtimestamp(v["timestamp"]).isoformat(timespec="minutes")
    if v.get("inscritos"):
        v["alemDoCanal"] = round(v["views"] / max(1, v["inscritos"]), 2)
    if v["views"]:
        v["engajamento"] = round(((v.get("likes") or 0) + 3 * (v.get("comentarios") or 0)) / v["views"], 4)
    return v


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dias", type=float, default=10)
    a = ap.parse_args()
    janela = a.dias * 24
    print("YouTube Shorts…", flush=True)
    yt = youtube(janela)
    print(f"  {len(yt)} Shorts na janela", flush=True)
    print("TikTok (perfis)…", flush=True)
    tk = tiktok(janela)
    print(f"  {len(tk)} vídeos na janela", flush=True)
    todos = sorted((metricas(v) for v in yt + tk if v["views"]), key=lambda v: -v["velocidade"])
    hoje = dt.date.today().isoformat()
    destino = RAIZ / "dados" / "virais" / f"{hoje}.json"
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text(json.dumps({"data": hoje, "janelaDias": a.dias, "videos": todos}, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"ok: {destino.relative_to(RAIZ)} ({len(todos)} vídeos)")
    for v in todos[:15]:
        print(f"{v['velocidade']:>9,}/h {v['views']:>10,} {v['horas']:>6}h {v['plataforma']:<7} {v['canal'][:18]:<18} {v['titulo'][:60]}")


if __name__ == "__main__":
    main()
