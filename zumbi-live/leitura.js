// Lê as mensagens da live do jeito que a biblioteca tiktok-live-connector entrega.
//
// A versão 2.x da biblioteca usa o formato novo do TikTok ("v3"):
//   comentário  → texto em `content`
//   curtidas    → quantidade em `count`
//   pessoa      → @ em `displayId`, nome em `nickname`, foto em `avatarThumb.urlList`
// O formato antigo usava `comment`, `likeCount` e `uniqueId`. Aceitamos os dois,
// pra não parar de funcionar se a biblioteca mudar de novo.

export function fotoDe(u = {}) {
  for (const p of [u.avatarThumb, u.avatarMedium, u.avatarLarge, u.profilePicture]) {
    const l = p && (p.urlList || p.urls || p.url || p.url_list);
    if (Array.isArray(l) && l[0]) return String(l[0]);
    if (typeof l === 'string' && l) return l;
  }
  return '';
}

export function pessoa(u = {}) {
  u = u || {};
  const id = String(u.uniqueId || u.displayId || u.userId || u.id || u.nickname || 'anonimo');
  const nick = String(u.nickname || u.uniqueId || u.displayId || 'alguém').slice(0, 24);
  return { id, nick, avatar: fotoDe(u) };
}

// Texto do comentário (vazio se não tiver)
export const textoDoComentario = d => String(d?.content ?? d?.comment ?? '').slice(0, 80).trim();

// Quantas curtidas vieram nesta mensagem
export const curtidasDe = d => Math.max(0, Number(d?.count ?? d?.likeCount) || 0);
