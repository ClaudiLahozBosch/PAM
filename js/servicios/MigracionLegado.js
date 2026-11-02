// @ts-check
// Lee lo que el PAM antiguo dejó guardado en el navegador y lo convierte en personajes del modelo nuevo.
// SOLO LEE: no borra ni reescribe ninguna clave antigua, así el PAM antiguo sigue funcionando igual y se
// puede volver atrás en cualquier momento.
//
// Claves antiguas:
//   grimorio.personajes  { activa, lista: [{ id, ficha }] }       las fichas (Mi Ficha)
//   revisorEmpleos.ficha  ficha suelta (antes de que hubiera varios personajes)
//   registro-roles-v1     { personajes: [{ id, pamId, nombre, roles, ganancias, wish, boveda, … }], … }
import { Personaje } from '../modelos/Personaje.js';
import { Ficha } from '../modelos/Ficha.js';
import { Boveda } from '../modelos/Boveda.js';
import { normNombre } from '../core/texto.js';

export const CLAVES_LEGADO = { personajes: 'grimorio.personajes', fichaSuelta: 'revisorEmpleos.ficha', registro: 'registro-roles-v1' };

/**
 * @param {import('../core/Almacen.js').Almacen} almacen
 * @param {import('../datos/Sistema.js').Sistema} sistema
 * @returns {{ personajes: Personaje[], activo: string|null, registroGlobal: any, sinFicha: any[], avisos: string[] }}
 */
export function leerLegado(almacen, sistema) {
  const avisos = [];
  const pjs = almacen.leer(CLAVES_LEGADO.personajes, null);
  let lista = pjs && Array.isArray(pjs.lista) ? pjs.lista.filter(p => p && p.id && p.ficha) : [];
  if (!lista.length) {
    const suelta = almacen.leer(CLAVES_LEGADO.fichaSuelta, null);
    if (suelta && typeof suelta === 'object') { lista = [{ id: 'legado-ficha', ficha: suelta }]; avisos.push('Solo había una ficha suelta (formato muy antiguo).'); }
  }
  const personajes = lista.map(p => new Personaje({ id: String(p.id), ficha: Ficha.desdeLegado(p.ficha, sistema) }));

  const reg = almacen.leer(CLAVES_LEGADO.registro, null);
  const sinFicha = [];
  let registroGlobal = null;
  if (reg && Array.isArray(reg.personajes)) {
    const { personajes: rps, ...global } = reg;
    registroGlobal = global;
    for (const r of rps) {
      if (!r || typeof r !== 'object') continue;
      const { boveda, ...resto } = r;
      const pj = r.pamId ? personajes.find(p => p.id === r.pamId) : null;
      if (pj) { pj.registro = resto; pj.boveda = Boveda.desdeLegado(boveda); continue; }
      // Registro viejo sin enlace a una ficha: no se adivina por el nombre (auditoría F03).
      // Se guarda aparte y se ofrece unirlo, indicando si hay un personaje con un nombre parecido.
      const parecido = personajes.find(p => normNombre(p.ficha.nombre) === normNombre(r.nombre));
      sinFicha.push({ registro: resto, boveda: Boveda.desdeLegado(boveda), sugerido: parecido ? parecido.id : null });
      avisos.push(`El registro de «${r.nombre || 'sin nombre'}» no está unido a ninguna ficha${parecido ? `; parece de ${parecido.nombre}` : ''}.`);
    }
  }
  const activo = pjs && personajes.some(p => p.id === pjs.activa) ? pjs.activa : (personajes[0]?.id ?? null);
  return { personajes, activo, registroGlobal, sinFicha, avisos };
}
