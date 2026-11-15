#!/usr/bin/env python3
"""Baixa dados oficiais do Data Dragon (Riot) — nunca use números de memória.

Uso:
  # campeão principal (JSON pt_BR completo, passiva, 4 habilidades, ícone, splash)
  # + ícones de outros campeões
  .venv/bin/python scripts/ddragon.py campeao Taliyah --outros Jhin,Rakan,Alistar,Kaisa,Sivir,Xayah \
      --pasta dados/taliyah-adc

  # resumo compacto de todos os campeões e itens (para o Estúdio / guia de matchup)
  .venv/bin/python scripts/ddragon.py resumo --pasta dados/ddragon

Gera também <pasta>/resumo.md com nome, recarga, custo e alcance de cada habilidade.
"""
import argparse, json, re, sys, urllib.request
from pathlib import Path

BASE = "https://ddragon.leagueoflegends.com"


def baixar(url: str) -> bytes:
    with urllib.request.urlopen(url, timeout=60) as r:
        return r.read()


def jget(url: str):
    return json.loads(baixar(url))


def versao() -> str:
    return jget(f"{BASE}/api/versions.json")[0]


def limpar(html: str) -> str:
    return re.sub(r"<[^>]+>", "", html or "").replace("&nbsp;", " ").strip()


def nivel(lista):
    return "/".join(f"{x:g}" for x in lista) if lista else "-"


def campeao(a):
    v = versao()
    pasta = Path(a.pasta)
    (pasta / "icones").mkdir(parents=True, exist_ok=True)
    nome = a.nome
    dados = jget(f"{BASE}/cdn/{v}/data/pt_BR/champion/{nome}.json")
    (pasta / f"{nome}.json").write_text(json.dumps(dados, ensure_ascii=False, indent=1), encoding="utf-8")
    c = dados["data"][nome]

    def salvar(url, destino):
        (pasta / destino).write_bytes(baixar(url))
        return destino

    arquivos = {"icone": salvar(f"{BASE}/cdn/{v}/img/champion/{c['image']['full']}", f"icones/{nome}.png"),
                "splash": salvar(f"{BASE}/cdn/img/champion/splash/{nome}_0.jpg", f"{nome}_splash.jpg"),
                "passiva": salvar(f"{BASE}/cdn/{v}/img/passive/{c['passive']['image']['full']}", "passiva.png")}
    for tecla, s in zip("QWER", c["spells"]):
        arquivos[tecla] = salvar(f"{BASE}/cdn/{v}/img/spell/{s['image']['full']}", f"habilidade_{tecla}.png")
    for outro in [x for x in (a.outros or "").split(",") if x]:
        salvar(f"{BASE}/cdn/{v}/img/champion/{outro}.png", f"icones/{outro}.png")

    linhas = [f"# {c['name']}, {c['title']} — Data Dragon {v} (pt_BR)", "",
              f"Recurso: {c['partype']} · Funções: {', '.join(c['tags'])} · "
              f"Alcance de ataque: {c['stats']['attackrange']:g} · Velocidade: {c['stats']['movespeed']:g}", "",
              f"## Passiva — {c['passive']['name']}", limpar(c["passive"]["description"]), ""]
    for tecla, s in zip("QWER", c["spells"]):
        linhas += [f"## {tecla} — {s['name']}",
                   f"- Recarga (s): {nivel(s['cooldown'])}",
                   f"- Custo: {nivel(s['cost'])} de {c['partype'] if 'abilityresourcename' in s.get('costType', '') or not limpar(s.get('costType', '')).strip(' de') else limpar(s['costType']).replace('de ', '', 1)}",
                   f"- Alcance: {nivel(s['range'])}",
                   f"- Descrição: {limpar(s['description'])}", ""]
    (pasta / "resumo.md").write_text("\n".join(linhas), encoding="utf-8")
    meta = {"versao": v, "campeao": nome, "arquivos": arquivos,
            "habilidades": {t: {"nome": s["name"], "recarga": s["cooldown"], "custo": s["cost"], "alcance": s["range"]}
                            for t, s in zip("QWER", c["spells"])},
            "passiva": c["passive"]["name"], "outros": (a.outros or "").split(",")}
    (pasta / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"ok: {pasta} (Data Dragon {v})")


def resumo(a):
    """Campeões (nome, funções, recurso, habilidades com números) e itens compráveis, em um JSON pequeno."""
    v = versao()
    pasta = Path(a.pasta)
    pasta.mkdir(parents=True, exist_ok=True)
    full = jget(f"{BASE}/cdn/{v}/data/pt_BR/championFull.json")["data"]
    campeoes = {}
    for cid, c in full.items():
        campeoes[cid] = {
            "nome": c["name"], "funcoes": c["tags"], "recurso": c["partype"],
            "alcance": c["stats"]["attackrange"],
            "passiva": c["passive"]["name"],
            "hab": [{"t": t, "n": s["name"], "cd": s["cooldown"], "custo": s["cost"], "alc": s["range"]}
                    for t, s in zip("QWER", c["spells"])],
        }
    itens_raw = jget(f"{BASE}/cdn/{v}/data/pt_BR/item.json")["data"]
    itens = {}
    for iid, it in itens_raw.items():
        g = it.get("gold", {})
        if int(iid) >= 10000 or not g.get("purchasable") or not it.get("maps", {}).get("11"):
            continue
        if it.get("requiredChampion") or it.get("requiredAlly") or "Consumable" in it.get("tags", []) and g.get("total", 0) > 500:
            continue
        itens[iid] = {"nome": it["name"], "custo": g.get("total"), "tags": it.get("tags", []),
                      "de": it.get("from", []), "vira": it.get("into", []),
                      "resumo": limpar(it.get("plaintext", ""))[:120]}
    runas = [{"arvore": r["name"], "chaves": [x["name"] for x in r["slots"][0]["runes"]],
              "menores": [[x["name"] for x in sl["runes"]] for sl in r["slots"][1:]]}
             for r in jget(f"{BASE}/cdn/{v}/data/pt_BR/runesReforged.json")]
    saida = {"versao": v, "campeoes": campeoes, "itens": itens, "runas": runas}
    arq = pasta / "resumo.json"
    arq.write_text(json.dumps(saida, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"ok: {arq} ({arq.stat().st_size / 1024:.0f} KB, {len(campeoes)} campeões, {len(itens)} itens, Data Dragon {v})")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("campeao"); c.add_argument("nome"); c.add_argument("--outros"); c.add_argument("--pasta", required=True)
    r = sub.add_parser("resumo"); r.add_argument("--pasta", required=True)
    a = ap.parse_args()
    {"campeao": campeao, "resumo": resumo}[a.cmd](a)
