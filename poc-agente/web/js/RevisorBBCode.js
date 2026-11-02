// @ts-check
/** Revisión de ejemplo: etiquetas que abren y cierran. En el PAM real aquí iría la revisión de la bóveda. */
export class RevisorBBCode {
  static ETIQUETAS = ['spoiler', 'b', 'i', 'u', 'color', 'center', 'quote'];

  /** @param {string} texto @returns {string[]} avisos */
  static revisar(texto) {
    const avisos = [];
    for (const et of RevisorBBCode.ETIQUETAS) {
      const abre = (texto.match(new RegExp(`\\[${et}(=[^\\]]*)?\\]`, 'gi')) || []).length;
      const cierra = (texto.match(new RegExp(`\\[\\/${et}\\]`, 'gi')) || []).length;
      if (abre !== cierra) avisos.push(`[${et}]: ${abre} abiertas y ${cierra} cerradas.`);
    }
    const divA = (texto.match(/<div\b/gi) || []).length, divC = (texto.match(/<\/div>/gi) || []).length;
    if (divA !== divC) avisos.push(`<div>: ${divA} abiertos y ${divC} cerrados.`);
    return avisos;
  }
}
