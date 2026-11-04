// @ts-check
// N07: los canjes cambian la ficha del foro con el editor por mensajes (js/bbcode/EditorFicha.js), ya no con el código
// «Personalizada» entero en el primer mensaje.
//   · PAM, al «Preparar el canje», guarda dos fotos de su ficha (formato antiguo, solo lo que un canje puede cambiar):
//     «antes» = la ficha tal como se importó del foro (la misma base que usaba el «Personalizada»), «despues» = con
//     el carrito ya pasado («Traer de la calculadora»).
//   · El panel, al «Aplicar el canje», lee la ficha del foro TAL COMO ESTÁ AHORA (todas sus partes) y le aplica lo que
//     cambió entre las dos fotos. Así no se pisa nada que se haya editado en el foro después de importarla, y un
//     reintento no repite nada (los niveles se suben hasta el nuevo, lo que ya está no se vuelve a añadir).
// Las descripciones, la historia y los demás textos no se tocan nunca desde un canje.
import { Ficha } from '../modelos/Ficha.js?v=0.5.2';
import { Trasfondo } from '../modelos/Trasfondo.js?v=0.5.2';
import { Arcano } from '../modelos/Arcano.js?v=0.5.2';
import { norm, num, aRomano } from '../core/texto.js?v=0.5.2';

const CAMPOS = ['nombre', 'attrs', 'skills', 'artes', 'bgs', 'adv', 'esp', 'arcanos', 'idiomas', 'talentos', 'vinculos', 'titulos'];

/** Lo que un canje puede cambiar de una ficha antigua de PAM (sin descripciones ni historia). */
export function recorte(f) {
  if (!f || typeof f !== 'object') return null;
  /** @type {any} */ const r = {};
  for (const k of CAMPOS) if (f[k] !== undefined) r[k] = JSON.parse(JSON.stringify(f[k]));
  r.extra = { pd: f.extra?.pd ?? '' };
  r.d = { raza: f.d?.raza ?? '' };
  return r;
}

/** Lo que PAM guarda en la petición de canje. */
export function cambiosDeCanje(antes, despues) { return { v: 1, antes: recorte(antes), despues: recorte(despues) }; }

/** ¿Hay algo que cambiar en la ficha? */
export function hayCambios(cambios) { return !!cambios && JSON.stringify(cambios.antes) !== JSON.stringify(cambios.despues); }

const kArc = a => `${a.tipo}|${a.nivel}|${norm(a.nombre)}`;
const kTal = t => norm(t.nombre) + '|' + norm(t.nota);
const mismoBg = (x, b, conIdentidad) => norm(x.tipo) === norm(b.tipo) && norm(x.categoria) === norm(b.categoria) && norm(x.especifico) === norm(b.especifico)
  && (!conIdentidad || norm(x.identidad) === norm(b.identidad));
const nombreBg = t => [t.tipo, t.categoria, t.especifico].filter(Boolean).join(' > ') + (t.identidad ? ` (${t.identidad})` : '');

/**
 * La ficha del foro con lo del canje.
 * @param {Ficha} foro la ficha leída del foro ahora (con sus partes)
 * @param {{antes: any, despues: any}} cambios lo que guardó PAM
 * @param {{ sistema: import('../datos/Sistema.js').Sistema, compendio: import('../datos/Compendio.js').Compendio }} datos
 * @returns {{ despues: Ficha, manual: string[], comprobar: (f: Ficha) => string[] }}
 *   `comprobar(fichaReleída)`: lo del canje que no quedó en la ficha (para no decir «hecho» sin verlo)
 */
export function aplicarCanje(foro, cambios, { sistema, compendio }) {
  const A = Ficha.desdeLegado(cambios.antes || {}, sistema), B = Ficha.desdeLegado(cambios.despues || {}, sistema);
  const D = new Ficha(JSON.parse(JSON.stringify(foro)));
  /** @type {string[]} */ const manual = [];
  /** @type {{que: string, ok: (f: Ficha) => boolean}[]} */ const checks = [];

  // números: atributos, habilidades, ventajas, especializaciones (un canje solo sube)
  for (const [campo, que] of /** @type {const} */ ([['atributos', 'Atributo'], ['habilidades', 'Habilidad'], ['ventajas', 'Ventaja'], ['especializaciones', 'Especialización']])) {
    for (const [k, v] of Object.entries(B[campo])) {
      if (num(v) === num(A[campo][k]) || num(v) < num(A[campo][k])) continue;
      if (num(v) > num(D[campo][k])) D[campo][k] = num(v);
      checks.push({ que: `${que} ${k}`, ok: f => num(f[campo][k]) >= num(v) });
    }
  }
  // Puntos de Destino y raza
  const pdB = num(B.presentacion.pd), pdA = num(A.presentacion.pd);
  if (pdB > pdA) { if (pdB > num(D.presentacion.pd)) D.presentacion.pd = pdB; checks.push({ que: 'Puntos de Destino', ok: f => num(f.presentacion.pd) >= pdB }); }
  const razaB = String(B.datos.raza || '').trim();
  if (razaB && norm(razaB) !== norm(A.datos.raza)) { D.datos.raza = razaB; checks.push({ que: 'Raza', ok: f => norm(f.datos.raza) === norm(razaB) }); }
  // Arte / Artesanía
  for (const b of B.artes) {
    const a = A.artes.find(x => norm(x.nombre) === norm(b.nombre));
    if (a && num(a.nivel) >= num(b.nivel)) continue;
    const d = D.artes.find(x => norm(x.nombre) === norm(b.nombre));
    if (d) { if (num(b.nivel) > num(d.nivel)) d.nivel = num(b.nivel); } else D.artes.push({ nombre: b.nombre, nivel: num(b.nivel) });
    checks.push({ que: `Arte/Artesanía ${b.nombre}`, ok: f => f.artes.some(x => norm(x.nombre) === norm(b.nombre) && num(x.nivel) >= num(b.nivel)) });
  }
  // arcanos nuevos (con el nombre y la descripción del Compendio, si lo conoce)
  const enA = new Set(A.arcanos.map(kArc));
  for (const b of B.arcanos) {
    if (enA.has(kArc(b))) continue;
    const hit = compendio.buscar(b.nombre, b.tipo);
    const es = x => (hit && x.ref === hit.id) || norm(x.nombre) === norm(b.nombre) || (hit && norm(x.nombre) === norm(hit.nombre));
    if (!D.arcanos.some(es)) D.arcanos.push(new Arcano({ tipo: b.tipo, nivel: b.nivel, nombre: hit ? hit.nombre : b.nombre, descripcion: b.descripcion || '', ref: hit ? hit.id : null }));
    checks.push({ que: `Arcano ${b.nombre}`, ok: f => f.arcanos.some(es) });
  }
  // trasfondos: subir el que ya está o añadir uno nuevo
  for (const b of B.trasfondos) {
    const a = A.trasfondos.find(x => mismoBg(x, b, true));
    if (a && a.nivel >= b.nivel) continue;
    let cand = D.trasfondos.filter(x => mismoBg(x, b, true));
    if (!cand.length && !b.identidad) cand = D.trasfondos.filter(x => mismoBg(x, b, false));
    if (cand.length > 1) { manual.push(`Trasfondo ${nombreBg(b)} ${aRomano(b.nivel)}: tenés varios con ese nombre en la ficha; cambialo a mano`); continue; }
    if (cand.length === 1) { if (b.nivel > cand[0].nivel) cand[0].nivel = b.nivel; }
    else D.trasfondos.push(new Trasfondo({ tipo: b.tipo, categoria: b.categoria, especifico: b.especifico, identidad: b.identidad, nivel: b.nivel, nota: '' }));
    checks.push({ que: `Trasfondo ${nombreBg(b)}`, ok: f => f.trasfondos.some(x => mismoBg(x, b, !!b.identidad) && x.nivel >= b.nivel) });
  }
  // idiomas
  for (const b of B.idiomas) {
    const a = A.idiomas.find(x => norm(x.nombre) === norm(b.nombre));
    if (a && norm(a.nivel) === norm(b.nivel)) continue;
    const d = D.idiomas.find(x => norm(x.nombre) === norm(b.nombre));
    if (d) d.nivel = b.nivel; else D.idiomas.push({ nombre: b.nombre, nivel: b.nivel, nota: '' });
    checks.push({ que: `Idioma ${b.nombre}`, ok: f => f.idiomas.some(x => norm(x.nombre) === norm(b.nombre) && norm(x.nivel) === norm(b.nivel)) });
  }
  // talentos y títulos nuevos
  const talA = new Set(A.talentos.map(kTal));
  for (const b of B.talentos) {
    if (talA.has(kTal(b))) continue;
    if (!D.talentos.some(x => kTal(x) === kTal(b))) D.talentos.push({ nombre: b.nombre, nota: b.nota || '' });
    checks.push({ que: `Talento ${b.nombre}`, ok: f => f.talentos.some(x => norm(x.nombre) === norm(b.nombre)) });
  }
  const titA = A.titulos.map(norm);
  for (const t of B.titulos.filter(x => x.trim() && !titA.includes(norm(x)))) {
    if (!D.titulos.some(x => norm(x) === norm(t))) D.titulos.push(t);
    checks.push({ que: `Título «${t}»`, ok: f => f.titulos.some(x => norm(x) === norm(t)) });
  }
  // vínculos: el editor no los escribe (como el «Personalizada» antiguo)
  for (const v of B.vinculos) if (!A.vinculos.some(x => norm(x.pj) === norm(v.pj) && x.tipo === v.tipo)) manual.push(`${v.tipo} con ${v.pj}: agregalo a mano`);

  const comprobar = f => checks.filter(c => !c.ok(f)).map(c => c.que);
  return { despues: D, manual, comprobar };
}
