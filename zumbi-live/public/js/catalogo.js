// Lista de presentes usada quando a página abre sem o programa (prévia e botões de teste).
// Na live, quem manda é o config.json (o programa envia a lista ao abrir).
export const PRESENTES_PADRAO = {
  "Rose": {
    "emoji": "🌹",
    "nome": "Rosa",
    "moedas": 1,
    "efeito": "cura",
    "valor": 10
  },
  "Ice Cream Cone": {
    "emoji": "🍦",
    "nome": "Sorvete",
    "moedas": 1,
    "efeito": "vidro",
    "segundos": 5
  },
  "TikTok": {
    "emoji": "🎵",
    "nome": "TikTok",
    "moedas": 1,
    "efeito": "zumbis",
    "qtd": 3
  },
  "Finger Heart": {
    "emoji": "🫰",
    "nome": "Coração c/ dedos",
    "moedas": 5,
    "efeito": "municao",
    "quarteiroes": 3
  },
  "Perfume": {
    "emoji": "🧴",
    "nome": "Perfume",
    "moedas": 20,
    "efeito": "horda",
    "qtd": 8
  },
  "Donut": {
    "emoji": "🍩",
    "nome": "Rosquinha",
    "moedas": 30,
    "efeito": "kit",
    "valor": 25
  },
  "Hat and Mustache": {
    "emoji": "🎩",
    "nome": "Chapéu e Bigode",
    "moedas": 99,
    "efeito": "explosivo",
    "qtd": 1
  },
  "Hand Hearts": {
    "emoji": "🫶",
    "nome": "Mãos de coração",
    "moedas": 100,
    "efeito": "colete",
    "golpes": 3
  },
  "Corgi": {
    "emoji": "🐶",
    "nome": "Corgi",
    "moedas": 299,
    "efeito": "cachorro",
    "quarteiroes": 4
  },
  "Money Gun": {
    "emoji": "🔫",
    "nome": "Arma de Dinheiro",
    "moedas": 500,
    "efeito": "bau",
    "raridade": "medio"
  },
  "Swan": {
    "emoji": "🦢",
    "nome": "Cisne",
    "moedas": 699,
    "efeito": "alarme",
    "segundos": 20
  },
  "Train": {
    "emoji": "🚂",
    "nome": "Trem",
    "moedas": 899,
    "efeito": "trem",
    "qtd": 15
  },
  "Galaxy": {
    "emoji": "🌌",
    "nome": "Galáxia",
    "moedas": 1000,
    "efeito": "bau",
    "raridade": "lendario"
  },
  "Fireworks": {
    "emoji": "🎆",
    "nome": "Fogos",
    "moedas": 1088,
    "efeito": "chefao"
  },
  "Lion": {
    "emoji": "🦁",
    "nome": "Leão",
    "moedas": 29999,
    "efeito": "rei",
    "segundos": 60
  },
  "Universe": {
    "emoji": "🪐",
    "nome": "Universo",
    "moedas": 34999,
    "efeito": "helicoptero",
    "quarteiroes": 1
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
  "horda_a_cada_segundos": 24,
  "horda_base": 10,
  "horda_por_nivel": 2,
  "zumbis_na_rua_base": 14,
  "zumbis_na_rua_por_nivel": 2.5,
  "ameaca_por_caminho_perigoso": 0.18,
  "caminho_perigoso_porcento": 80,
  "caminho_livre_porcento": 18,
  "caminho_historia_porcento": 2,
  "noite_a_cada_segundos": 150,
  "noite_dura_segundos": 35,
  "segundos_dentro_do_predio": 70
};
