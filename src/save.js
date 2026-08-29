// save.js — persistência isolada atrás de salvar e carregar. Na fase 5 estas
// duas funções viram chamada de rede e nada mais no jogo precisa mudar.

const CHAVE = 'heroi-de-masmorra/v1';

// A taxa é gravada junto com o estado, congelada no fechamento. É ela que paga
// o offline: recalcular na volta deixaria o jogador comprar tudo, fechar e
// reabrir para colher a taxa nova.
export function salvar(estado, taxa) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify({ em: Date.now(), taxa, estado }));
    return true;
  } catch {
    return false;
  }
}

export function carregar() {
  try {
    const cru = localStorage.getItem(CHAVE);
    if (!cru) return null;
    const d = JSON.parse(cru);
    if (!d || !d.estado || typeof d.estado.floor !== 'number') return null;
    return { estado: d.estado, taxa: Number(d.taxa) || 0, em: Number(d.em) || Date.now() };
  } catch {
    return null;
  }
}

export function apagar() {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    /* modo privado pode recusar; não é motivo para derrubar o jogo */
  }
}
