// @ts-check
/** Lector de ejemplo: recibe una página del foro ya parseada y saca datos. No sabe de dónde viene el HTML. */
export class LectorForo {
  /** @param {Document} doc */
  static resumenIndice(doc) {
    const temas = new Set();
    doc.querySelectorAll('a[href]').forEach(a => {
      const m = (a.getAttribute('href') || '').match(/^(?:https?:\/\/[^/]+)?\/t(\d+)-/);
      if (m) temas.add(m[1]);
    });
    return {
      titulo: (doc.title || '').trim(),
      temasEnlazados: temas.size,
      conectado: /_userdata\["session_logged_in"\]\s*=\s*1/.test(doc.documentElement.innerHTML)
    };
  }
}
