// @ts-check
// Todo lo que el panel «Mi PJ» necesita saber de la cuenta conectada, leído del foro a través del agente:
// cuenta → perfil (enlaces a ficha y bóveda) → ficha (con el lector nuevo) → bóveda → stats de combate.
// Cada paso que falla se apunta en `errores` y los demás siguen.
import { leerPerfil, rutaTema, RUTA_PERFIL } from '../lectores/LectorPerfil.js';
import { leerFichaDelForo } from './FichaDelForo.js';
import { leerBovedaDelForo } from './BovedaDelForo.js';
import { combate, puntos } from '../reglas/Combate.js';

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
