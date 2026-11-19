// @ts-check
// «Configurar Mi PJ»: qué hace Mi PJ en el foro. La página de PAM (js/paginas/mipj/) guarda la configuración en
// `grimorio.mipj.config` (viaja con la Sesión con código) y deja una copia en el almacén del agente, `pam.mipj`
// (js/pam/ConfigMiPjAlForo.js), porque el panel, dentro del foro, no ve lo que PAM guarda en el navegador (GUIA §5.2).
// Lógica pura: sin leer ni escribir. Sin configuración, todo está como siempre (todo activo).

/**
 * Lo que se puede activar y desactivar, por grupos. `id` es la clave dentro del grupo.
 * Lo que NO está aquí no se puede apagar a propósito (ver SIEMPRE): son las protecciones o la puerta de entrada.
 */
export const OPCIONES = {
  foro: [
    { id: 'oficial', glifo: '🎓', titulo: 'Cartel «Este oficial»', desc: 'El resumen arriba de los mensajes de un oficial: posts de cada uno, cuántos cuentan y las grageas que tocan.' },
    { id: 'boveda', glifo: '⛁', titulo: 'Revisión de la bóveda', desc: 'La barra debajo del editor («Bóveda: las cuentas cuadran») y el aviso «Antes de publicar» si algo no cuadra.' },
    { id: 'colorear', glifo: '✦', titulo: 'Botón «Colorear diálogos»', desc: 'Junto a «Previsualizar», colorea los diálogos con tu Coloreador de PAM.' },
    { id: 'quitar', glifo: '↶', titulo: 'Botón «Quitar colores»', desc: 'Aparece cuando el texto tiene algún [color] y los quita todos.' },
    { id: 'canjes', glifo: '⚖', titulo: 'Botones en el Registro de Canjes', desc: 'Debajo de tus peticiones aprobadas: «Llevar a PAM» (suma el canje a tu ficha y tu bóveda de PAM) y «Aplicar cambio a la ficha».' },
    { id: 'inspector', glifo: '🔍', titulo: 'Barras del Inspector de Canjes', desc: 'Solo para Inspectores: la barra «Revisar canje» en cada pedido. Además hay que activarlo en la tarjeta del panel.' }
  ],
  panel: [
    { id: 'responder', glifo: '✒', titulo: 'Te toca responder', desc: 'Tus roles y turnos de misión pendientes.' },
    { id: 'otrasCuentas', glifo: '⚔', titulo: 'Misiones de tus otras cuentas', desc: 'Los turnos de misión de las otras cuentas con las que entraste.' },
    { id: 'viejos', glifo: '◷', titulo: 'Roles viejos', desc: 'El aviso «y N roles viejos» de los roles quietos hace mucho.' },
    { id: 'oficiales', glifo: '🎓', titulo: 'Oficiales en curso', desc: 'Tus oficiales abiertos y cuántas grageas llevan.' },
    { id: 'sueldo', glifo: '⚜', titulo: 'Sueldo', desc: 'Si ya cobraste el sueldo del mes.' },
    { id: 'veterania', glifo: '✶', titulo: 'Veteranía', desc: 'Cuántos años lleva tu personaje, cuántas veteranías cobraste y cuándo toca la próxima.' },
    { id: 'ficha', glifo: '❖', titulo: 'Ficha', desc: 'Enlace a tu ficha, si está revisada y el último sello.' },
    { id: 'boveda', glifo: '⛁', titulo: 'Bóveda', desc: 'Grageas, últimos movimientos y la última revisión.' },
    { id: 'biblioteca', glifo: '📜', titulo: 'Biblioteca de oficiales', desc: 'Los sucesos de El Profeta libres, en curso o abandonados.' },
    { id: 'canjes', glifo: '⚖', titulo: 'Canjes', desc: 'Publicar la petición de canje y aplicar el canje aprobado.' }
  ],
  pastilla: [
    { id: 'grageas', glifo: '✦', titulo: 'Grageas', desc: 'Las grageas que tenés, al lado de «Mi PJ».' },
    { id: 'roles', glifo: '✒', titulo: 'Roles pendientes', desc: 'El número de roles donde te toca responder.' },
    { id: 'misiones', glifo: '⚔', titulo: 'Turnos que vencen', desc: 'Los turnos de misión que vencen en menos de 24 h.' },
    { id: 'sueldo', glifo: '⚜', titulo: 'Sueldo sin cobrar', desc: 'El aviso de que todavía no pediste el sueldo.' },
    { id: 'veterania', glifo: '✶', titulo: 'Veteranía sin cobrar', desc: 'El aviso de que te corresponde una veteranía que no pediste.' },
    { id: 'ficha', glifo: '●', titulo: 'Ficha pendiente', desc: 'El punto de «ficha pendiente de revisión».' }
  ]
};

/** Cada cuánto vuelve a leer el foro al abrir una página (minutos; 0 = solo con «Actualizar»). */
export const LECTURA = [
  { min: 10, texto: 'Cada 10 minutos' }, { min: 30, texto: 'Cada media hora' }, { min: 60, texto: 'Cada hora' },
  { min: 180, texto: 'Cada 3 horas' }, { min: 0, texto: 'Solo cuando toque «Actualizar»' }
];

/** Lo que no se puede desactivar, y por qué (se enseña en la página). */
export const SIEMPRE = [
  { glifo: '✦', titulo: 'La pastilla «Mi PJ»', desc: 'Es la puerta para abrir el panel. Sin ella no tendrías cómo volver a encender nada desde el foro.' },
  { glifo: '⚖', titulo: 'La puerta Aceptar / Denegar', desc: 'Mi PJ nunca publica ni edita sin que lo aceptes viendo exactamente qué cambia. Es la protección principal.' },
  { glifo: '↺', titulo: 'No tocar un mensaje que cambió', desc: 'Si el mensaje cambió desde que se leyó, no se edita. Evita pisar lo que escribiste a mano.' },
  { glifo: '☾', titulo: 'Leer el foro con tu sesión', desc: 'Mi PJ solo lee lo que vos ves. Sin esto no podría saber nada de tu ficha ni de tu bóveda.' }
];

export const VERSION_CONFIG = 1;

/** @typedef {{ v: number, pausa: boolean, foro: Record<string, boolean>, panel: Record<string, boolean>, pastilla: Record<string, boolean>, lectura: { cada: number, boveda: boolean } }} ConfigMiPj */

/** La configuración de siempre: todo activo, como antes de que existiera esta página. @returns {ConfigMiPj} */
export function configPorDefecto() {
  const todos = l => Object.fromEntries(l.map(o => [o.id, true]));
  return { v: VERSION_CONFIG, pausa: false, foro: todos(OPCIONES.foro), panel: todos(OPCIONES.panel), pastilla: todos(OPCIONES.pastilla), lectura: { cada: 30, boveda: true } };
}

/**
 * Junta lo guardado con lo de siempre: lo que falta o no se entiende queda como siempre (activo).
 * @param {any} guardada @returns {ConfigMiPj}
 */
export function normalizarConfig(guardada) {
  const c = configPorDefecto();
  if (!guardada || typeof guardada !== 'object') return c;
  c.pausa = guardada.pausa === true;
  for (const g of /** @type {const} */ (['foro', 'panel', 'pastilla'])) {
    const G = guardada[g];
    if (!G || typeof G !== 'object') continue;
    for (const o of OPCIONES[g]) if (typeof G[o.id] === 'boolean') c[g][o.id] = G[o.id];
  }
  const L = guardada.lectura;
  if (L && typeof L === 'object') {
    if (LECTURA.some(x => x.min === L.cada)) c.lectura.cada = L.cada;
    if (typeof L.boveda === 'boolean') c.lectura.boveda = L.boveda;
  }
  return c;
}

/**
 * ¿Está activo? «Pausar en el foro» apaga todo lo que se pinta dentro de las páginas del foro (grupo `foro`).
 * @param {ConfigMiPj|null|undefined} cfg @param {'foro'|'panel'|'pastilla'} grupo @param {string} id
 */
export function activo(cfg, grupo, id) {
  if (!cfg) return true;
  if (grupo === 'foro' && cfg.pausa) return false;
  const v = cfg[grupo] && cfg[grupo][id];
  return v !== false;
}
