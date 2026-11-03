// @ts-check
// Todo lo que el panel «Mi PJ» necesita saber de la cuenta conectada, leído del foro a través del agente:
// cuenta → perfil (enlaces a ficha y bóveda) → ficha (con el lector nuevo) → bóveda → stats de combate.
// Cada paso que falla se apunta en `errores` y los demás siguen.
import { leerPerfil, rutaTema, RUTA_PERFIL } from '../lectores/LectorPerfil.js?v=0.3.1';
import { leerFichaDelForo } from './FichaDelForo.js?v=0.3.1';
import { leerBovedaDelForo } from './BovedaDelForo.js?v=0.3.1';
import { combate, puntos } from '../reglas/Combate.js?v=0.3.1';

/**
 * @param {import('./agente/ClienteAgente.js').ClienteAgente} agente
 * @param {{ sistema: any, compendio: any, lector: any, foros: Record<string, any> }} dep
 */
export async function leerMiPj(agente, { sistema, compendio, lector, foros }) {
  const errores = [];
  const hola = await agente.hola();
  const base = { leido: new Date().toISOString(), agente: hola.agente, foro: hola.foro, cuenta: hola.cuenta, errores };
  if (!hola.cuenta) return { ...base, estado: 'sinSesion' };
  const cfg = foros[hola.foro ?? ''] ?? null;
  if (!cfg) return { ...base, estado: 'foroDesconocido' };

  let perfil = { ficha: '', boveda: '' };
  if (cfg.campoFicha || cfg.campoBoveda) {
    try { perfil = leerPerfil(await agente.leer(RUTA_PERFIL), cfg); } catch (e) { errores.push('Perfil: ' + mensaje(e)); }
  }
  const rutaF = rutaTema(perfil.ficha, hola.foro), rutaB = rutaTema(perfil.boveda, hola.foro);
  if (!rutaF) errores.push(cfg.campoFicha ? 'Tu perfil no tiene el enlace a la ficha.' : 'En este foro no sé dónde está el enlace a la ficha.');

  let ficha = null, stats = null;
  if (rutaF) {
    try {
      ficha = await leerFichaDelForo(agente, rutaF, { lector, cuentaId: hola.cuenta.id });
      stats = { combate: combate(ficha.ficha, sistema, { warlock: null, compendio }), puntos: puntos(ficha.ficha, { compendio }) };
    } catch (e) { errores.push('Ficha: ' + mensaje(e)); }
  }
  let boveda = null;
  if (rutaB) { try { boveda = await leerBovedaDelForo(agente, rutaB); } catch (e) { errores.push('Bóveda: ' + mensaje(e)); } }
  else if (cfg.campoBoveda) errores.push('Tu perfil no tiene el enlace a la bóveda.');

  return { ...base, estado: 'ok', perfil, ficha, stats, boveda };
}

const mensaje = e => (e instanceof Error ? e.message : String(e));

/**
 * Lo leído, en el formato de datos que usaba el panel «Mi PJ» (así su interfaz se porta tal cual):
 * { v, cuenta, pj, uid, leido, ficha: {url, titulo, estado, sello, codigo}, boveda, roles, sueldo, oficiales, rapido }.
 * `rapido` es lo que el acceso rápido sacaba de la ficha de PAM: aquí sale de la ficha del foro leída con las
 * reglas de PAM (atributos, habilidades, combate, puntos, trasfondos y ventajas).
 * @param {any} r resultado de leerMiPj
 * @param {import('../datos/Sistema.js').Sistema} sistema
 */
export function aDatosMiPj(r, sistema) {
  if (r.estado !== 'ok') return null;
  const foro = 'https://' + r.foro;
  const F = r.ficha, f = F?.ficha;
  const abs = u => (u ? new URL(u, foro).href : '');
  const boveda = r.boveda ? { ...r.boveda, url: abs(r.boveda.url), titulo: r.boveda.titulo || 'Bóveda', l1: abs(r.boveda.l1), l2: abs(r.boveda.l2), l3: abs(r.boveda.l3), revision: r.boveda.revision ? { ...r.boveda.revision, url: abs(r.boveda.revision.url) } : null } : null;
  return {
    v: 2, cuenta: r.cuenta?.nombre ?? '', pj: (f?.nombre || F?.titulo || r.cuenta?.nombre || ''), uid: r.cuenta?.id ?? null, leido: r.leido,
    ficha: F ? { url: `${foro}/t${F.tema}-`, titulo: F.titulo, estado: F.estado, sello: F.sello, codigo: f.partes.map(p => p.bbcode).join('\n') } : null,
    boveda,
    // todavía no están en PAM (fases 5c y 5d): el panel lo dice en lugar de «Tocá Actualizar»
    roles: null, sueldo: null, oficiales: [], pendientes: ['roles', 'sueldo', 'oficiales', 'biblioteca', 'canjes'],
    rapido: f && r.stats ? rapidoDeFicha(f, r.stats, sistema, r.leido) : null,
    errores: r.errores
  };
}

/** El acceso rápido con los datos de la ficha (mismos nombres que usaba Mi PJ: los de la ficha, «Esquiva», «Vuelo»…). */
function rapidoDeFicha(f, stats, sistema, leido) {
  const skills = {};
  for (const h of sistema.listaHabilidades.filter(x => !x.multiple)) skills[sistema.nombreHabilidad(h, 'ficha')] = f.habilidades[h.nombre] ?? 0;
  const c = stats.combate, p = stats.puntos;
  return {
    attrs: { ...f.atributos }, skills, artes: f.artes.map(a => ({ n: a.nombre, nv: a.nivel })),
    combate: { Iniciativa: c.ini, 'Ataque Físico': c.atkF, 'Ataque Mágico': c.atkM, Defensa: c.def, 'Lucha Física': c.luchaF, 'Lucha Mágica': c.luchaM, PAs: c.pa, 'Umbral de heridas': c.umbral, Heridas: c.heridas },
    puntos: { pociones: p.pp, rituales: p.pr, destino: f.presentacion?.pd },
    bgs: f.trasfondos.map(t => ({ t: t.tipo, c: t.categoria, e: t.especifico, v: t.nivel, nota: t.nota })),
    adv: { ...f.ventajas }, raza: f.datos?.raza ?? '', semiG: /semigigant/i.test(String(f.datos?.raza ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')),
    ok: Object.keys(f.atributos ?? {}).length >= 4, fuente: 'foro', leido, etapa: f.datos?.etapa ?? ''
  };
}
