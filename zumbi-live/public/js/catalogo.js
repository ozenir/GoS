// Lista de presentes usada quando a página abre sem o programa (prévia e botões de teste).
// Na live, quem manda é o config.json (o programa envia a lista ao abrir).
export const PRESENTES_PADRAO = {
  "Rose": {
    "emoji": "🌹",
    "nome": "Rosa",
    "moedas": 1,
    "efeito": "cura",
    "valor": 14,
    "aliases": [
      "Rosa"
    ]
  },
  "White Rose": {
    "emoji": "🤍",
    "nome": "Rosa branca",
    "moedas": 1,
    "efeito": "colete",
    "golpes": 4,
    "aliases": [
      "Rosa branca"
    ]
  },
  "Awesome": {
    "emoji": "😺",
    "nome": "Incrível",
    "moedas": 1,
    "efeito": "municao",
    "quarteiroes": 3,
    "aliases": [
      "Incrível",
      "Thumbs Up",
      "Amazing"
    ]
  },
  "Heart Me": {
    "emoji": "💗",
    "nome": "Heart Me",
    "moedas": 1,
    "efeito": "kit",
    "valor": 35
  },
  "Love you": {
    "emoji": "🤗",
    "nome": "Amo você",
    "moedas": 1,
    "efeito": "cachorro",
    "quarteiroes": 4,
    "aliases": [
      "Amo você",
      "Love You So Much",
      "I Love You"
    ]
  },
  "TikTok": {
    "emoji": "🎵",
    "nome": "TikTok",
    "moedas": 1,
    "efeito": "zumbis",
    "qtd": 3
  },
  "GG": {
    "emoji": "🎮",
    "nome": "Bom jogo",
    "moedas": 1,
    "efeito": "vidro",
    "segundos": 5,
    "aliases": [
      "Bom jogo",
      "Good Game"
    ]
  },
  "Classics": {
    "emoji": "📻",
    "nome": "Clássicas",
    "moedas": 1,
    "efeito": "alarme",
    "segundos": 20,
    "aliases": [
      "Clássicas",
      "Classic"
    ]
  },
  "Mantap": {
    "emoji": "🤙",
    "nome": "Mantap",
    "moedas": 1,
    "efeito": "explosivo",
    "qtd": 1
  },
  "Finger Heart": {
    "emoji": "🫰",
    "nome": "Mãos fazendo coração",
    "moedas": 5,
    "efeito": "bau",
    "raridade": "medio",
    "aliases": [
      "Mãos fazendo coração",
      "Coração com dedos"
    ]
  },
  "Coconut Drink": {
    "emoji": "🥥",
    "nome": "Bebida de coco",
    "moedas": 5,
    "efeito": "helicoptero",
    "quarteiroes": 1,
    "aliases": [
      "Bebida de coco",
      "Coconut"
    ]
  },
  "Love Aroma": {
    "emoji": "💝",
    "nome": "Aroma de amor",
    "moedas": 5,
    "efeito": "bau",
    "raridade": "lendario",
    "aliases": [
      "Aroma de amor",
      "Scent of Love",
      "Love Scent"
    ]
  },
  "Overreact": {
    "emoji": "🤪",
    "nome": "Reação exagerada",
    "moedas": 5,
    "efeito": "horda",
    "qtd": 8,
    "aliases": [
      "Reação exagerada",
      "Overreaction",
      "Over Reaction"
    ]
  },
  "Encore Ticket": {
    "emoji": "🎟️",
    "nome": "Ingresso de bis",
    "moedas": 5,
    "efeito": "trem",
    "qtd": 15,
    "aliases": [
      "Ingresso de bis",
      "Encore"
    ]
  },
  "Firework": {
    "emoji": "🎆",
    "nome": "Fogos de artifício",
    "moedas": 5,
    "efeito": "chefao",
    "aliases": [
      "Fogos de artifício",
      "Fogos de artifício efeito",
      "Fireworks"
    ]
  },
  "Mention Name": {
    "emoji": "👄",
    "nome": "Mencionar o nome",
    "moedas": 5,
    "efeito": "rei",
    "segundos": 60,
    "aliases": [
      "Mencionar o nome",
      "Shout Out",
      "Name Mention"
    ]
  }
};
export const SEGUIR_PADRAO = {"efeito": "aliado", "quarteiroes": 1};
export const COMPARTILHAR_PADRAO = {"efeito": "caixa_municao"};
export const JOGO_PADRAO = {
  "segundos_de_votacao": 10,
  "atraso_da_live_segundos": 6,
  "segundos_caido": 12,
  "segundos_escolha_habilidade": 12,
  "segundos_do_relatorio": 10,
  "segundos_dos_destaques": 12,
  "protecao_ao_nascer_segundos": 15,
  "curtidas_por_suprimento": 300,
  "maximo_zumbis": 90,
  "velocidade_do_heroi": 1.1,
  "ameaca_por_minuto": 1.2,
  "ameaca_por_quarteirao": 0.12,
  "ameaca_por_nivel_do_heroi": 0.45,
  "horda_a_cada_quarteiroes": 5,
  "horda_a_cada_segundos": 0,
  "horda_base": 10,
  "horda_por_nivel": 2,
  "zumbis_por_quarteirao": 24,
  "zumbis_por_quarteirao_por_nivel": 2,
  "zumbis_na_rua_base": 14,
  "zumbis_na_rua_por_nivel": 2.5,
  "ameaca_por_caminho_perigoso": 0.18,
  "caminho_perigoso_porcento": 80,
  "caminho_livre_porcento": 18,
  "caminho_historia_porcento": 2,
  "noite_a_cada_segundos": 150,
  "noite_dura_segundos": 35,
  "segundos_dentro_do_predio": 70,
  "drop_ate_moedas": 1,
  "doacao_a_partir_de_moedas": 2,
  "inspiracao_segundos": 10,
  "vida_do_colosso": 10000
};
