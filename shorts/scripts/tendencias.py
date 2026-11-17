"""Coleta o que está em alta no League of Legends, em fontes com público grande.

    .venv/bin/python scripts/tendencias.py            # -> dados/tendencias/AAAA-MM-DD.json

Fontes (todas públicas, sem login):
  youtube   vídeos da semana mais vistos, buscas em pt-BR e em inglês, e canais grandes do Brasil
            (Ilha das Lendas / Cortes da Ilha / BaianoTV, CBLOL, LOUD, paiN...) com visualizações
  noticias  Google Notícias (pt-BR, últimos 7 dias): o que a imprensa está cobrindo
  trends    Google Trends Brasil (buscas do dia em alta) filtradas por termos do LoL
  oficial   notícias do site oficial do LoL (patches, eventos, anúncios)
O X (Twitter) exige login para buscar: o Claude completa com buscas na web na hora de montar o top 10.
O arquivo traz os sinais brutos; o ranking dos 10 temas é feito pelo Claude a partir dele.
"""
import datetime as dt
import html
import json
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36", "Accept-Language": "pt-BR,pt;q=0.9"}
# filtro do YouTube: "esta semana", ordenado por visualizações
SEMANA_POR_VIEWS = "CAMSAggD"
BUSCAS_YT = ["league of legends", "lol", "lol brasil", "league of legends brasil", "cblol", "worlds lol",
             "ilha das lendas", "cortes da ilha", "baiano lol", "lol patch", "campeão lol", "lol skin"]
BUSCAS_NOTICIAS = ["League of Legends", "LoL CBLOL", "Riot Games LoL", "LoL Worlds", "LoL patch"]
TERMOS_LOL = re.compile(r"\b(lol|league of legends|riot|cblol|worlds|lck|lpl|faker|t1|paiN|loud|baiano|ilha das lendas|new dawn|patch|campe[aã]o|skin|arcane|teamfight tactics|tft)\b", re.I)


def termos_lol() -> re.Pattern:
    """Termos do LoL + nomes de todos os campeões (do resumo do Data Dragon), para filtrar o que não é LoL."""
    nomes = []
    r = RAIZ / "dados" / "ddragon" / "resumo.json"
    if r.exists():
        nomes = [c["nome"] for c in json.loads(r.read_text(encoding="utf-8"))["campeoes"].values() if len(c["nome"]) > 3]
    base = ["league of legends", "lol esports", "riot", "cblol", "worlds", "mundial", "lck", "lpl", "lec", "msi", "faker",
            "t1", "pain", "loud", "baiano", "ilha das lendas", "cortes da ilha", "new dawn", "nova alvorada", "league next",
            "patch", "skin", "arcane", "tft", "teamfight", "k/da", "kda", "true damage", "ranked", "elo", "solo ?q",
            "jungle", "selva", "adc", "suporte", "support", "mid lane", "top lane", "geng", "gen\\.g", "blg", "bilibili"]
    return re.compile(r"(?<![\\w])(" + "|".join(base + [re.escape(n) for n in nomes]) + r")(?![\\w])", re.I)


def baixar(url: str, timeout: int = 30) -> str:
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
            return r.read().decode("utf-8", errors="ignore")
    except Exception as e:
        print(f"  falhou: {url[:80]} ({e.__class__.__name__})", file=sys.stderr)
        return ""


def numero(txt: str) -> int:
    """'2.012.100 visualizações' / '1,2 mi' -> int"""
    t = (txt or "").lower().replace("\xa0", " ")
    m = re.search(r"([\d.,]+)\s*(mi|mil|k|m|b)?", t)
    if not m:
        return 0
    n, suf = m.group(1), m.group(2)
    if suf in ("mi", "m", "mil", "k", "b"):
        n = float(n.replace(".", "").replace(",", ".")) if "," in n else float(n)
        return int(n * {"mi": 1e6, "m": 1e6, "mil": 1e3, "k": 1e3, "b": 1e9}[suf])
    return int(re.sub(r"[.,]", "", n) or 0)


def videos_yt(pagina: str) -> list[dict]:
    m = re.search(r"var ytInitialData = (\{.*?\});</script>", pagina)
    if not m:
        return []
    out = []

    def walk(o):
        if isinstance(o, dict):
            if "videoRenderer" in o:
                v = o["videoRenderer"]
                vt = v.get("viewCountText", {})
                out.append({
                    "titulo": "".join(r.get("text", "") for r in v.get("title", {}).get("runs", [])),
                    "canal": "".join(r.get("text", "") for r in v.get("ownerText", {}).get("runs", [])),
                    "views": numero(vt.get("simpleText") or "".join(r.get("text", "") for r in vt.get("runs", []))),
                    "quando": v.get("publishedTimeText", {}).get("simpleText", ""),
                    "url": f"https://www.youtube.com/watch?v={v.get('videoId')}",
                })
            for x in o.values():
                walk(x)
        elif isinstance(o, list):
            for x in o:
                walk(x)

    try:
        walk(json.loads(m.group(1)))
    except json.JSONDecodeError:
        return []
    return out


def youtube() -> list[dict]:
    vistos = {}
    for q in BUSCAS_YT:
        url = f"https://www.youtube.com/results?search_query={urllib.parse.quote_plus(q)}&sp={SEMANA_POR_VIEWS}"
        for v in videos_yt(baixar(url)):
            if v["url"] not in vistos and v["views"]:
                v["busca"] = q
                vistos[v["url"]] = v
    # só o que é desta semana e é de LoL (a busca "lol" também traz vlogs e outros jogos)
    lol = termos_lol()
    recentes = [v for v in vistos.values() if re.search(r"(hora|minuto|dia|semana|hour|minute|day|week)", v["quando"] or "dia")
                and not re.search(r"(semanas|weeks)", v["quando"] or "")
                and lol.search(v["titulo"] + " " + v["canal"]) and not re.search(r"minecraft|limbachiy", v["titulo"] + v["canal"], re.I)]
    return sorted(recentes, key=lambda v: -v["views"])[:80]


def rss_itens(xml: str) -> list[dict]:
    itens = []
    for bloco in re.findall(r"<item>(.*?)</item>", xml, re.S):
        g = lambda tag: html.unescape(re.sub(r"<!\[CDATA\[|\]\]>", "", (re.search(fr"<{tag}[^>]*>(.*?)</{tag}>", bloco, re.S) or [None, ""])[1])).strip()
        itens.append({"titulo": g("title"), "url": g("link"), "data": g("pubDate"), "fonte": g("source"),
                      "trafego": g("ht:approx_traffic"), "noticias": re.findall(r"<ht:news_item_title>(.*?)</ht:news_item_title>", bloco)})
    return itens


def noticias() -> list[dict]:
    vistos = {}
    for q in BUSCAS_NOTICIAS:
        url = f"https://news.google.com/rss/search?q={urllib.parse.quote_plus(q + ' when:7d')}&hl=pt-BR&gl=BR&ceid=BR:pt-419"
        for it in rss_itens(baixar(url)):
            chave = re.sub(r"\s+-\s+[^-]+$", "", it["titulo"]).lower()
            if chave not in vistos:
                it["busca"] = q
                vistos[chave] = it
    return list(vistos.values())[:120]


def trends() -> list[dict]:
    itens = rss_itens(baixar("https://trends.google.com/trending/rss?geo=BR"))
    return [i for i in itens if TERMOS_LOL.search(i["titulo"] + " " + " ".join(i["noticias"]))]


def oficial() -> list[dict]:
    pagina = baixar("https://www.leagueoflegends.com/pt-br/news/")
    titulos = re.findall(r'"title"\s*:\s*"([^"]{8,140})"', pagina)
    vistos, out = set(), []
    for t in titulos:
        t = html.unescape(t)
        if t not in vistos and len(t.split()) >= 3 and not t.lower().startswith(("league of legends", "notícias", "atualizações", "criar conta", "fazer login")):
            vistos.add(t)
            out.append({"titulo": t})
    return out[:30]


def main():
    hoje = dt.date.today().isoformat()
    print("YouTube…", flush=True)
    yt = youtube()
    print(f"  {len(yt)} vídeos da semana", flush=True)
    print("Google Notícias…", flush=True)
    nt = noticias()
    print(f"  {len(nt)} notícias", flush=True)
    print("Google Trends Brasil…", flush=True)
    tr = trends()
    print(f"  {len(tr)} buscas em alta ligadas ao LoL", flush=True)
    print("Site oficial…", flush=True)
    of = oficial()
    print(f"  {len(of)} títulos", flush=True)
    dados = {"data": hoje, "coletadoEm": dt.datetime.now().isoformat(timespec="seconds"),
             "fontes": {"youtube": yt, "noticias": nt, "trends": tr, "oficial": of}}
    destino = RAIZ / "dados" / "tendencias" / f"{hoje}.json"
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text(json.dumps(dados, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"ok: {destino.relative_to(RAIZ)}")


if __name__ == "__main__":
    main()
