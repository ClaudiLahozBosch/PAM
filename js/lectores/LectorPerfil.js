// @ts-check
// Lo que dice el perfil del jugador: enlaces a su ficha y a su bóveda (campos del perfil del foro).
// Solo para la cuenta conectada: se lee la página de editar el perfil.

export const RUTA_PERFIL = '/profile?mode=editprofile&page_profil=informations';

/**
 * @param {Document} doc página de editar el perfil
 * @param {{ campoFicha: string|null, campoBoveda: string|null }} cfg configuración del foro (data/foros.json)
 * @returns {{ ficha: string, boveda: string }}
 */
export function leerPerfil(doc, cfg) {
  const valor = nombre => {
    if (!nombre) return '';
    const e = /** @type {HTMLInputElement|null} */ (doc.querySelector(`[name="${nombre}"]`));
    return e ? String(e.value || '').trim() : '';
  };
  return { ficha: valor(cfg.campoFicha), boveda: valor(cfg.campoBoveda) };
}

/** «/t37969-mortimer-gaunt#737593» o la URL completa → «/t37969-» (o null si no es un tema del foro). */
export function rutaTema(enlace, host) {
  const m = String(enlace ?? '').trim().match(/^(?:https?:\/\/([^/]+))?\/t(\d+)/);
  if (!m || (m[1] && host && m[1] !== host)) return null;
  return `/t${m[2]}-`;
}
