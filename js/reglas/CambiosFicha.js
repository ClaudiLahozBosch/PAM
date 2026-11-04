// @ts-check
// N07: los cambios de la ficha de PAM se llevan al código del foro con el editor por mensajes (js/bbcode/EditorFicha.js),
// ya no con el «Personalizada» antiguo (actualizarCodigo). Siempre igual: se mira qué cambió en PAM entre dos fotos de
// su ficha (formato antiguo) y se le aplica eso a la ficha leída del código del foro. Así lo que PAM no entendió del
// código (lo que su lector antiguo se saltaba) no se toca, y lo que se cambió en el foro después no se pisa.
//   · Canjes (aplicarCanje): «antes» = la ficha como se importó del foro, «despues» = con el carrito. Solo sube y
//     añade (un reintento no repite nada, y lo que en el foro ya está más alto se queda). Los textos no se tocan.
//   · «Código para el foro» de Mi Ficha (aplicarEdicion): «antes» = la ficha de cuando guardaste tu código,
//     «despues» = la de ahora. Todo lo que cambiaste: textos, niveles que suben o bajan, lo que añadiste o quitaste.
import { Ficha } from '../modelos/Ficha.js?v=0.6.7';
import { Trasfondo } from '../modelos/Trasfondo.js?v=0.6.7';
import { Arcano } from '../modelos/Arcano.js?v=0.6.7';
import { norm, num, aRomano } from '../core/texto.js?v=0.6.7';

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

/** ¿Ya hay un aviso «a mano» que habla de esto? (para no avisar dos veces de lo mismo) */
export function yaAvisado(avisos, que) {
  const n = norm(que.replace(/^(Atributo|Habilidad|Ventaja|Especialización|Arte\/Artesanía|Arcano|Trasfondo|Idioma|Talento|Título)\s+/, '').replace(/[«»]/g, ''));
  return avisos.some(m => norm(m).includes(n));
}

const kArc = a => `${a.tipo}|${a.nivel}|${norm(a.nombre)}`;
const kTal = t => norm(t.nombre) + '|' + norm(t.nota);
const mismoBg = (x, b, conIdentidad) => norm(x.tipo) === norm(b.tipo) && norm(x.categoria) === norm(b.categoria) && norm(x.especifico) === norm(b.especifico)
  && (!conIdentidad || norm(x.identidad) === norm(b.identidad));
const nombreBg = t => [t.tipo, t.categoria, t.especifico].filter(Boolean).join(' > ') + (t.identidad ? ` (${t.identidad})` : '');
const txt = v => String(v ?? '').trim();

/**
 * @typedef {{ despues: Ficha, manual: string[], comprobar: (f: Ficha) => string[] }} Resultado
 *   `comprobar(fichaReleída)`: lo que no quedó como debía (para no decir «hecho» sin verlo)
 * @typedef {{ sistema: import('../datos/Sistema.js').Sistema, compendio: import('../datos/Compendio.js').Compendio }} Datos
 */

/**
 * La ficha del foro con lo del canje.
 * @param {Ficha} foro la ficha leída del foro ahora (con sus partes) @param {{antes: any, despues: any}} cambios lo que guardó PAM
 * @param {Datos} datos @returns {Resultado}
 */
export function aplicarCanje(foro, cambios, { sistema, compendio }) {
  return aplicar(foro, Ficha.desdeLegado(cambios.antes || {}, sistema), Ficha.desdeLegado(cambios.despues || {}, sistema), { todo: false, compendio });
}

/**
 * El código del foro con todo lo que cambiaste en PAM desde que lo guardaste («Código para el foro», modo «Personalizada»).
 * @param {Ficha} foro la ficha leída de tu código @param {any} base la ficha de PAM de cuando guardaste el código
 * @param {any} actual la ficha de PAM ahora @param {Datos} datos @returns {Resultado}
 */
export function aplicarEdicion(foro, base, actual, { sistema, compendio }) {
  const B = Ficha.desdeLegado(actual || {}, sistema);
  if (actual && actual.plantilla && actual.plantilla.forzarCombate) B.plantilla = { forzarCombate: true };
  return aplicar(foro, Ficha.desdeLegado(base || {}, sistema), B, { todo: true, compendio });
}

/**
 * Lo que cambió de A a B, sobre la ficha del foro.
 * @param {Ficha} foro @param {Ficha} A @param {Ficha} B
 * @param {{ todo: boolean, compendio: import('../datos/Compendio.js').Compendio }} op todo=false: solo subir y añadir (canjes)
 * @returns {Resultado}
 */
function aplicar(foro, A, B, { todo, compendio }) {
  const D = new Ficha(JSON.parse(JSON.stringify(foro)));
  /** @type {string[]} */ const manual = [];
  /** @type {{que: string, ok: (f: Ficha) => boolean}[]} */ const checks = [];
  const nivel = (actual, nuevo) => (todo ? nuevo : Math.max(num(actual), nuevo)); // en un canje, lo que en el foro está más alto se queda
  const vale = (a, b) => b === a || (!todo && b < a); // nada que hacer

  // números: atributos, habilidades, ventajas, especializaciones
  for (const [campo, que] of /** @type {const} */ ([['atributos', 'Atributo'], ['habilidades', 'Habilidad'], ['ventajas', 'Ventaja'], ['especializaciones', 'Especialización']])) {
    for (const k of new Set([...Object.keys(A[campo]), ...Object.keys(B[campo])])) {
      const a = num(A[campo][k]), b = num(B[campo][k]);
      if (vale(a, b)) continue;
      D[campo][k] = nivel(D[campo][k], b);
      checks.push({ que: `${que} ${k}`, ok: f => (todo ? num(f[campo][k]) === b : num(f[campo][k]) >= b) });
    }
  }
  // Puntos de Destino
  const pdA = num(A.presentacion.pd), pdB = num(B.presentacion.pd);
  if (!vale(pdA, pdB)) { D.presentacion.pd = nivel(D.presentacion.pd, pdB); checks.push({ que: 'Puntos de Destino', ok: f => (todo ? num(f.presentacion.pd) === pdB : num(f.presentacion.pd) >= pdB) }); }
  // textos: en un canje, solo la raza; al editar, todos (nombre, datos, descripción y cabecera)
  if (todo) {
    if (txt(A.nombre) !== txt(B.nombre)) D.nombre = B.nombre;
    for (const g of /** @type {const} */ (['datos', 'descripcion', 'presentacion'])) {
      for (const k of new Set([...Object.keys(A[g]), ...Object.keys(B[g])])) {
        if (g === 'presentacion' && k === 'pd') continue;
        if (txt(A[g][k]) !== txt(B[g][k])) D[g][k] = B[g][k] ?? '';
      }
    }
    if (B.plantilla && B.plantilla.forzarCombate) D.plantilla = { ...(D.plantilla || {}), forzarCombate: true };
  } else {
    const razaB = txt(B.datos.raza);
    if (razaB && norm(razaB) !== norm(A.datos.raza)) { D.datos.raza = razaB; checks.push({ que: 'Raza', ok: f => norm(f.datos.raza) === norm(razaB) }); }
  }
  // Arte / Artesanía
  for (const b of B.artes) {
    const a = A.artes.find(x => norm(x.nombre) === norm(b.nombre));
    if (a && vale(num(a.nivel), num(b.nivel))) continue;
    const d = D.artes.find(x => norm(x.nombre) === norm(b.nombre));
    if (d) d.nivel = nivel(d.nivel, num(b.nivel)); else D.artes.push({ nombre: b.nombre, nivel: num(b.nivel) });
    checks.push({ que: `Arte/Artesanía ${b.nombre}`, ok: f => f.artes.some(x => norm(x.nombre) === norm(b.nombre) && (todo ? num(x.nivel) === num(b.nivel) : num(x.nivel) >= num(b.nivel))) });
  }
  if (todo) for (const a of A.artes) if (!B.artes.some(x => norm(x.nombre) === norm(a.nombre))) D.artes = D.artes.filter(x => norm(x.nombre) !== norm(a.nombre));
  // arcanos (con el nombre y la descripción del Compendio, si lo conoce)
  const esArc = b => { const hit = compendio.buscar(b.nombre, b.tipo); return { hit, es: x => (hit && x.ref === hit.id) || norm(x.nombre) === norm(b.nombre) || (!!hit && norm(x.nombre) === norm(hit.nombre)) }; };
  const enA = new Set(A.arcanos.map(kArc)), enB = new Set(B.arcanos.map(kArc));
  if (todo) for (const a of A.arcanos) {
    if (enB.has(kArc(a))) continue;
    const { es } = esArc(a);
    D.arcanos = D.arcanos.filter(x => !(es(x) && x.tipo === a.tipo && x.nivel === a.nivel));
    checks.push({ que: `Arcano ${a.nombre}`, ok: f => !f.arcanos.some(x => es(x) && x.tipo === a.tipo && x.nivel === a.nivel) });
  }
  for (const b of B.arcanos) {
    if (enA.has(kArc(b))) continue;
    const { hit, es } = esArc(b);
    if (!D.arcanos.some(x => es(x) && x.tipo === b.tipo && x.nivel === b.nivel)) D.arcanos.push(new Arcano({ tipo: b.tipo, nivel: b.nivel, nombre: hit ? hit.nombre : b.nombre, descripcion: b.descripcion || '', ref: hit ? hit.id : null }));
    checks.push({ que: `Arcano ${b.nombre}`, ok: f => f.arcanos.some(es) });
  }
  // trasfondos: cambiar el nivel del que ya está, añadir uno nuevo o (al editar) quitarlo
  const enFicha = b => { let c = D.trasfondos.filter(x => mismoBg(x, b, true)); if (!c.length && !b.identidad) c = D.trasfondos.filter(x => mismoBg(x, b, false)); return c; };
  for (const b of B.trasfondos) {
    const a = A.trasfondos.find(x => mismoBg(x, b, true));
    if (a && vale(a.nivel, b.nivel)) continue;
    const cand = enFicha(b);
    if (cand.length > 1) { manual.push(`Trasfondo ${nombreBg(b)} ${aRomano(b.nivel)}: tenés varios con ese nombre en la ficha; cambialo a mano`); continue; }
    if (cand.length === 1) cand[0].nivel = nivel(cand[0].nivel, b.nivel);
    else D.trasfondos.push(new Trasfondo({ tipo: b.tipo, categoria: b.categoria, especifico: b.especifico, identidad: b.identidad, nivel: b.nivel, nota: '' }));
    checks.push({ que: `Trasfondo ${nombreBg(b)}`, ok: f => f.trasfondos.some(x => mismoBg(x, b, !!b.identidad) && (todo ? x.nivel === b.nivel : x.nivel >= b.nivel)) });
  }
  if (todo) for (const a of A.trasfondos) {
    if (B.trasfondos.some(x => mismoBg(x, a, true))) continue;
    const cand = enFicha(a);
    if (cand.length > 1) { manual.push(`Trasfondo ${nombreBg(a)}: lo quitaste y tenés varios con ese nombre; bórralo a mano`); continue; }
    D.trasfondos = D.trasfondos.filter(x => !cand.includes(x));
    checks.push({ que: `Trasfondo ${nombreBg(a)}`, ok: f => !f.trasfondos.some(x => mismoBg(x, a, !!a.identidad)) });
  }
  // idiomas
  for (const b of B.idiomas) {
    const a = A.idiomas.find(x => norm(x.nombre) === norm(b.nombre));
    if (a && norm(a.nivel) === norm(b.nivel)) continue;
    const d = D.idiomas.find(x => norm(x.nombre) === norm(b.nombre));
    if (d) d.nivel = b.nivel; else D.idiomas.push({ nombre: b.nombre, nivel: b.nivel, nota: '' });
    checks.push({ que: `Idioma ${b.nombre}`, ok: f => f.idiomas.some(x => norm(x.nombre) === norm(b.nombre) && norm(x.nivel) === norm(b.nivel)) });
  }
  if (todo) for (const a of A.idiomas) if (!B.idiomas.some(x => norm(x.nombre) === norm(a.nombre))) {
    D.idiomas = D.idiomas.filter(x => norm(x.nombre) !== norm(a.nombre));
    checks.push({ que: `Idioma ${a.nombre}`, ok: f => !f.idiomas.some(x => norm(x.nombre) === norm(a.nombre)) });
  }
  // talentos y títulos
  const talA = new Set(A.talentos.map(kTal)), talB = new Set(B.talentos.map(kTal));
  for (const b of B.talentos) {
    if (talA.has(kTal(b))) continue;
    if (!D.talentos.some(x => kTal(x) === kTal(b))) D.talentos.push({ nombre: b.nombre, nota: b.nota || '' });
    checks.push({ que: `Talento ${b.nombre}`, ok: f => f.talentos.some(x => norm(x.nombre) === norm(b.nombre)) });
  }
  if (todo) for (const a of A.talentos) if (!talB.has(kTal(a))) {
    D.talentos = D.talentos.filter(x => kTal(x) !== kTal(a));
    checks.push({ que: `Talento ${a.nombre}`, ok: f => !f.talentos.some(x => kTal(x) === kTal(a)) });
  }
  const titA = A.titulos.map(norm), titB = B.titulos.map(norm);
  for (const t of B.titulos.filter(x => x.trim() && !titA.includes(norm(x)))) {
    if (!D.titulos.some(x => norm(x) === norm(t))) D.titulos.push(t);
    checks.push({ que: `Título «${t}»`, ok: f => f.titulos.some(x => norm(x) === norm(t)) });
  }
  if (todo) for (const t of A.titulos.filter(x => x.trim() && !titB.includes(norm(x)))) D.titulos = D.titulos.filter(x => norm(x) !== norm(t));
  // vínculos: el editor no los escribe (como el «Personalizada» antiguo)
  for (const v of B.vinculos) if (!A.vinculos.some(x => norm(x.pj) === norm(v.pj) && x.tipo === v.tipo)) manual.push(`${v.tipo} con ${v.pj}: agregalo a mano`);
  if (todo) for (const v of A.vinculos) if (!B.vinculos.some(x => norm(x.pj) === norm(v.pj) && x.tipo === v.tipo)) manual.push(`${v.tipo} con ${v.pj}: lo quitaste, borralo a mano`);

  const comprobar = f => checks.filter(c => !c.ok(f)).map(c => c.que);
  return { despues: D, manual, comprobar };
}
