// @ts-check
// Lee una ficha del foro (BBCode o HTML, en una o varias partes) y la convierte en una Ficha.
// Es el lector del PAM antiguo (parseFichaForo) con cuatro cambios:
//   · lee por partes y cada dato sabe de qué mensaje salió (auditoría F01/F04);
//   · los arcanos guardan su nombre tal como está escrito y su descripción (R04, R05), y se enlazan al
//     Compendio por id;
//   · los trasfondos con el lector nuevo, teniendo en cuenta los encabezados (F02);
//   · lo que parece un trasfondo pero no se entiende se guarda para revisar, no se pierde (regla 3).
import { norm, num } from '../core/texto.js?v=0.6.2';
import { Ficha, ParteFicha, EntradaDesconocida } from '../modelos/Ficha.js?v=0.6.2';
import { Arcano } from '../modelos/Arcano.js?v=0.6.2';
import { LectorTrasfondo } from './LectorTrasfondo.js?v=0.6.2';

/** Texto de un mensaje sin HTML ni BBCode, una línea por línea de la ficha (como cleanForo). */
export function limpiarForo(raw) {
  let t = String(raw ?? '').replace(/\r/g, '');
  t = t.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<!--[\s\S]*?-->/g, '');
  // también al ABRIR una caja: el modelo extendido pega el título de la caja a la primera línea («{Datos Básicos»▋ Nombre…»)
  t = t.replace(/<(?:div|p|li|tr|h\d|center|dl|dt|dd|table|blockquote)\b[^>]*>/gi, '\n');
  t = t.replace(/<summary[^>]*>/gi, '\n').replace(/<(br|\/div|\/p|\/li|\/summary|\/details|\/h\d|\/tr|\/label)\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');
  t = t.replace(/\[img[^\]]*\][\s\S]*?\[\/img\]/gi, '');
  t = t.replace(/\[spoiler=\s*(?:▋\s*)?([^\]]*)\]/gi, '\n$1\n').replace(/\[\/spoiler\]/gi, '\n');
  t = t.replace(/\[\/?(?:color|b|i|u|s|url|center|left|right|justify|size|font|spoiler|hide|quote|code|strike|sub|sup|table|tr|td|list|\*|flash|youtube|scroll|updown|blur|fade|rand|roll)(?:=[^\]]*)?\]/gi, '');
  t = t.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  return t.split('\n').map(l => l.replace(/[ \t ]+/g, ' ').trim()).join('\n').replace(/\n{3,}/g, '\n\n');
}

const LBL = {
  'nombre y apellido': 'nombre', 'nombre': 'nombre', 'avatar/pb': 'd.avatar', 'avatar / pb': 'd.avatar', 'avatar': 'd.avatar', 'pb': 'd.avatar', 'multicuenta': 'd.multicuenta', 'multicuentas': 'd.multicuenta',
  'lugar de nacimiento': 'd.nacimiento', 'lugar de residencia': 'd.residencia', 'residencia': 'd.residencia', 'clase social': 'd.clase',
  'fecha de nacimiento': 'd.fechaNac', 'edad': 'd.edad', 'etapa': 'd.etapa', 'orientacion sexual': 'd.orientacion', 'orientacion': 'd.orientacion',
  'tipo de sangre': 'd.sangre', 'sangre': 'd.sangre', 'raza': 'd.raza', 'casa': 'd.casa', 'curso': 'd.curso', 'faccion': 'd.faccion', 'equipo de quidditch': 'd.quidditch',
  'descripcion fisica': 'desc.fisica', 'descripcion psicologica': 'desc.psico', 'punto fuerte': 'desc.fuerte', 'puntos fuertes': 'desc.fuerte', 'punto debil': 'desc.debil', 'puntos debiles': 'desc.debil',
  'gustos/aficiones': 'desc.gustos', 'gustos / aficiones': 'desc.gustos', 'gustos': 'desc.gustos', 'fobias/manias': 'desc.fobias', 'fobias / manias': 'desc.fobias', 'fobias': 'desc.fobias',
  'historia': 'desc.historia', 'familia': 'desc.familia', 'mascota': 'desc.mascota', 'mascotas': 'desc.mascota',
  'atributos': '_attrs', 'habilidades': '_skills', 'combate': '_x', 'puntos de pociones': '_x', 'puntos de rituales': '_x',
  'puntos de destino': 'extra.pd', 'perdida de puntos de destino': 'extra.pdPerdida'
};
const SECT = {
  'HECHIZOS': 'm:hechizo', 'POCIONES': 'm:pocion', 'RITUALES': 'm:ritual', 'OBJETOS/ARMAS': 'm:objeto', 'OBJETOS / ARMAS': 'm:objeto', 'OBJETOS': 'm:objeto', 'ARMAS': 'm:objeto', 'QUIDDITCH': 'm:quidditch',
  'DOMESTICOS': 't:dom', 'DOMESTICAS': 't:dom', 'BASICOS': 't:bas', 'BASICAS': 't:bas', 'INTERMEDIOS': 't:int', 'INTERMEDIAS': 't:int', 'AVANZADOS': 't:ava', 'AVANZADAS': 't:ava', 'LEGENDARIOS': 't:leg', 'LEGENDARIAS': 't:leg', 'ESPECIALES': 't:',
  'IDIOMAS': 'o:idiomas', 'TRASFONDOS': 'o:bg', 'BIBLIOTECA': 'o:bg', 'INFORMANTES': 'o:bg', 'INFLUENCIA': 'o:bg', 'SEGUIDORES': 'o:bg', 'VENTAJAS': 'o:adv', 'ESPECIALIZACIONES': 'o:esp', 'ESPECIALIZACION': 'o:esp',
  'TALENTOS': 'o:tal', 'TITULOS ACADEMICOS': 'o:tit', 'TITULOS': 'o:tit', 'RAZA': 'o:raza', 'MAGIA': 'x', 'OTROS': 'x', 'DATOS': 'x', 'DESC.': 'x', 'DESCRIPCION': 'x', 'CARACT.': 'x', 'CARACTERISTICAS': 'x'
};
const ROMANO = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6 };
const NIVELES_HAB = { desentrenado: 0, novato: 1, competente: 2, experto: 3, maestro: 4, legendario: 5 };
const TIPOS_BG = ['Biblioteca', 'Influencia', 'Informantes', 'Seguidores'];
const up = s => norm(s).toUpperCase().replace(/:$/, '').trim();
SECT['IDIOMAS MUGGLES'] = 'o:idiomas'; SECT['IDIOMAS MAGICOS'] = 'o:idiomas';

/**
 * Si la línea es un encabezado de sección, sus códigos (uno o dos: «HECHIZOS DOMÉSTICOS» = tipo + nivel).
 * Admite adornos y recuentos: «▋ HECHIZOS:», «HECHIZOS BÁSICOS | 28:», «POCIONES (12)».
 * @returns {string[]|null}
 */
export function seccion(ln) {
  const directo = SECT[up(ln)];
  if (directo !== undefined) return [directo];
  // «{Los Trasfondos»», «▋ HECHIZOS:», «HECHIZOS BÁSICOS | 28:»
  const h = up(ln).replace(/^[^A-Z0-9]+/, '').replace(/[^A-Z0-9|()]+$/, '').replace(/\s*(?:\|\s*\d+|\(\d+\))\s*:?\s*$/, '').replace(/^(?:LOS|LAS|LA|EL)\s+/, '').trim();
  if (SECT[h] !== undefined) return [SECT[h]];
  const m = h.match(/^(HECHIZOS|POCIONES|RITUALES|OBJETOS\s*\/\s*ARMAS|OBJETOS)\s+(\S+)$/);
  if (m && SECT[m[1].replace(/\s+/g, '')] !== undefined && String(SECT[m[2]] ?? '').startsWith('t:')) return [SECT[m[1].replace(/\s+/g, '')], SECT[m[2]]];
  return null;
}
const esc = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** @typedef {{ post: number|null, bbcode: string }} ParteEntrada */

export class LectorFicha {
  /**
   * @param {import('../datos/Sistema.js').Sistema} sistema
   * @param {import('../datos/Compendio.js').Compendio} compendio
   */
  constructor(sistema, compendio) {
    this.sistema = sistema;
    this.compendio = compendio;
    this.trasfondos = new LectorTrasfondo(sistema);
  }

  /**
   * @param {string | ParteEntrada[]} entrada un código, o las partes de la ficha en orden
   * @param {{ tema?: number|null }} [op]
   * @returns {{ ficha: Ficha, resumen: string }}
   */
  leer(entrada, { tema = null } = {}) {
    const partes = typeof entrada === 'string' ? [{ post: null, bbcode: entrada }] : entrada;
    const S = this.sistema;
    // Líneas de todas las partes, cada una con el mensaje del que sale
    const lines = [], postDe = [];
    partes.forEach((p, i) => {
      if (i) { lines.push(''); postDe.push(p.post); }
      for (const l of limpiarForo(p.bbcode).split('\n')) { lines.push(l); postDe.push(p.post); }
    });
    const T = lines.join('\n');
    const origen = i => ({ tema, post: postDe[i] ?? null });

    const f = new Ficha({
      partes: partes.map((p, i) => new ParteFicha({ post: p.post ?? 0, orden: i, bbcode: p.bbcode })),
      atributos: Object.fromEntries(S.atributos.map(a => [a, 1])),
      habilidades: Object.fromEntries(S.listaHabilidades.filter(h => !h.multiple).map(h => [h.nombre, 0])),
      ventajas: Object.fromEntries(S.datos.ventajas.map(v => [v.nombre, 0])),
      especializaciones: Object.fromEntries(S.especializaciones.map(r => [r, 0]))
    });
    const leg = this.#vacia();

    // 1. campos con etiqueta
    let cur = null, buf = []; const got = {};
    const flush = () => { if (cur && !(cur in got)) { const v = buf.join('\n').replace(/\n{3,}/g, '\n\n').trim(); if (v) got[cur] = v; } cur = null; buf = []; };
    const labelRe = /^(?:[▋■▌█●•→\-]\s*)?([A-Za-zÁÉÍÓÚÜáéíóúüÑñ\/ ]{2,40}?)\s*:\s*(.*)$/;
    for (const ln of lines) {
      if (seccion(ln)) { flush(); continue; }
      const m = ln.match(labelRe), key = m && LBL[norm(m[1]).replace(/\s+/g, ' ').trim()];
      if (key) { flush(); cur = key; buf = [m[2]]; continue; }
      if (cur) buf.push(ln);
    }
    flush();
    for (let [k, v] of Object.entries(got)) {
      if (k.startsWith('_')) continue;
      if (k.startsWith('d.') || k === 'nombre' || k === 'extra.pd') v = v.split('\n')[0].trim();
      if (v === '-' || /^aqu[ií]$/i.test(v)) v = '';
      // Puntos de Destino: el número completo («13», no «1»; auditoría F06)
      if (k === 'extra.pd') v = num((v.match(/\d+/) || [0])[0]);
      if (k === 'nombre') leg.nombre = v; else { const [o, c] = k.split('.'); leg[o][c] = v; }
    }
    const et = Object.keys(S.datos.etapas).find(e => norm(leg.d.etapa).includes(norm(e)));
    leg.d.etapa = et || '';
    const lim = T.match(/L[ií]mites?\s*:\s*([^)\n]*)/i); if (lim && !/^_+$/.test(lim[1].trim())) leg.extra.limites = lim[1].trim();

    // 2. atributos
    let aStart = T.search(/Atributos\s*:/i); if (aStart < 0) aStart = T.search(/(?:^|\n)\W*Atributos\b/i); if (aStart < 0) aStart = T.search(/Atributos/i);
    let sStart = T.search(/Habilidades\s*:/i); if (sStart < 0) sStart = T.search(/\bHabilidades\b/i);
    const aSeg = aStart >= 0 ? T.slice(aStart, sStart > aStart ? sStart : aStart + 600) : '';
    for (const a of S.atributos) { const m = aSeg.match(new RegExp(a + '\\s*:\\s*\\+?\\s*(\\d+)', 'i')); if (m) f.atributos[a] = num(m[1]); }

    // 3. habilidades (cualquier nombre: oficial o de ficha)
    const sSeg = sStart >= 0 ? T.slice(sStart) : T;
    const lvRe = '(Desentrenado|Novato|Competente|Experto|Maestro|Legendario)';
    for (const h of S.listaHabilidades.filter(x => !x.multiple)) {
      for (const nombre of [h.enFicha, h.nombre].filter(Boolean)) {
        const m = sSeg.match(new RegExp('(?:^|\\n|→)\\s*' + esc(nombre) + '\\s*:\\s*' + lvRe, 'i'));
        if (m) { f.habilidades[h.nombre] = NIVELES_HAB[norm(m[1])]; break; }
      }
    }
    // artes / artesanías
    const reP = new RegExp('(?:Arte\\s*\\/\\s*Artesan[ií]a|Artesan[ií]a|Arte)\\s*\\(([^)]*)\\)\\s*:\\s*' + lvRe, 'gi'); let am;
    while ((am = reP.exec(sSeg))) { const n = am[1].trim(); if (n && !/^_+$/.test(n)) f.artes.push({ nombre: n, nivel: NIVELES_HAB[norm(am[2])] }); }
    const ai = sSeg.search(/Arte\s*\/\s*Artesan[ií]a\s*:\s*\n/i);
    if (ai >= 0) {
      const nombresHab = S.listaHabilidades.flatMap(h => [h.nombre, h.enFicha]).filter(Boolean).map(norm);
      for (const l of sSeg.slice(ai).split('\n').slice(1)) {
        const m = l.match(new RegExp('^→?\\s*([^:→]{2,40})\\s*:\\s*' + lvRe, 'i')); if (!m) break;
        const n = m[1].trim(); if (nombresHab.includes(norm(n))) break; f.artes.push({ nombre: n, nivel: NIVELES_HAB[norm(m[2])] });
      }
    }

    // 4. secciones (magia y otros)
    let mode = null, mType = null, mTier = 'bas', oSec = null;
    const tal = [], tit = [], idi = [], raza = [];
    lines.forEach((ln, i) => {
      // cada mensaje del foro empieza su propia sección (la magia de una parte no sigue en la siguiente)
      if (i && postDe[i] !== postDe[i - 1]) { mode = null; oSec = null; }
      const ss = seccion(ln);
      if (ss) {
        for (const s of ss) {
          if (s.startsWith('m:')) { mode = 'm'; mType = s.slice(2); mTier = mType === 'hechizo' ? 'dom' : 'bas'; }
          else if (s.startsWith('t:')) { if (mode === 'm') mTier = s.slice(2); }
          else if (s.startsWith('o:')) { mode = 'o'; oSec = s.slice(2); }
        }
        return;
      }
      if (!ln) return;
      if (mode === 'm') { this.#arcano(f, ln, mType, mTier, origen(i)); return; }
      if (mode === 'o') {
        if (oSec === 'raza') raza.push(ln);
        if (oSec === 'idiomas') idi.push(ln);
        if (oSec === 'tal') tal.push(ln);
        if (oSec === 'tit' && !/^(\S )+\S$/.test(ln)) tit.push(ln);
      }
    });

    // idiomas
    // «Francés — Medio», «Árabe (Alto)», y también «→ Alemán: nivel alto. Lo aprendió…»
    const idRe = /^[✦✧•\-–→*]?\s*([A-Za-zÁÉÍÓÚáéíóúÑñü' ]{2,30}?)\s*(?:—|–|-|:|\()\s*(?:nivel\s+)?(Nativo|Bajo|Medio|Alto|Básico|Intermedio|Avanzado)\b[\)\.]?\s*(.*)$/i;
    const idMap = { basico: 'Bajo', intermedio: 'Medio', avanzado: 'Alto' };
    for (const l of (idi.length ? idi : lines)) {
      const m = l.match(idRe); if (!m) continue;
      const nv = idMap[norm(m[2])] || m[2].charAt(0).toUpperCase() + m[2].slice(1).toLowerCase();
      if (!f.idiomas.some(x => norm(x.nombre) === norm(m[1]))) f.idiomas.push({ nombre: m[1].trim(), nivel: nv, nota: m[3].replace(/^[.:\-—\s]+/, '').trim() });
    }

    // trasfondos, ventajas, especializaciones: desde el primer encabezado de la parte final
    const heads = [/\n\s*IDIOMAS\b/i, /\n\s*TRASFONDOS?\b/i, /\n\s*BIBLIOTECA\s*\n/i, /\n\s*INFORMANTES\s*\n/i, /\n\s*INFLUENCIA\s*\n/i, /\n\s*SEGUIDORES\s*\n/i, /\n\s*VENTAJAS\b/i, /\n[^\n]{0,4}(?:Los\s+)?Trasfondos?\b/i].map(r => T.search(r)).filter(i => i >= 0);
    const oIdx = heads.length ? Math.min(...heads) : 0;
    const desde = T.slice(0, oIdx).split('\n').length - 1;
    const ctx = { tipo: /** @type {string|undefined} */ (undefined), categoria: /** @type {string|undefined} */ (undefined) };
    for (let i = Math.max(desde, 0); i < lines.length; i++) {
      const l0 = lines[i], l = l0.replace(/^[^A-Za-zÁÉÍÓÚáéíóúÑñ0-9]+/, '');
      if (!l) continue;
      // encabezados que dan contexto a los trasfondos («INFORMANTES», «Bajos Fondos:»)
      const h = up(l);
      const tipoH = TIPOS_BG.find(t => h === norm(t).toUpperCase() || h === norm(t).toUpperCase() + 'S'); // «BIBLIOTECA», «• Bibliotecas:»
      if (tipoH) { ctx.tipo = tipoH; ctx.categoria = undefined; continue; }
      const sh = seccion(l);
      if (sh) { if (!sh.includes('o:bg')) { ctx.tipo = undefined; ctx.categoria = undefined; } continue; }
      // «• Bajos Fondos:» tras «• Bibliotecas:»: es una categoría de otro tipo, así que el tipo deja de valer
      const catDelTipo = this.#categoriaEncabezado(l, ctx.tipo), catH = catDelTipo ?? this.#categoriaEncabezado(l, undefined);
      if (catH) { if (!catDelTipo) ctx.tipo = undefined; ctx.categoria = catH; continue; }

      const empiezaConTipo = new RegExp(`^(?:\\(?(?:VI|V|IV|I{1,3}|[1-6])\\)?\\s*[—–\\-:.]?\\s+)?(?:trasfondos?\\s*(?:generales?|espec[ií]ficos?)?\\s*[:—–\\-]?\\s*)?(${TIPOS_BG.join('|')})\\b`, 'i').test(l);
      if (!empiezaConTipo && this.#ventajaOEsp(f, l)) continue;
      const bg = this.trasfondos.leer(l, { tipo: ctx.tipo, categoria: ctx.categoria, origen: origen(i) });
      if (bg) {
        // Solo se descarta si es la MISMA línea repetida, o el mismo trasfondo al mismo nivel sin descripción
        // propia. Dos líneas distintas nunca se funden en una (con la ficha real de Irvin se perdía una).
        const repetido = f.trasfondos.some(x => x.textoOriginal === bg.textoOriginal
          || (x.tipo === bg.tipo && norm(x.categoria) === norm(bg.categoria) && norm(x.especifico) === norm(bg.especifico) && norm(x.identidad) === norm(bg.identidad) && x.nivel === bg.nivel && (!bg.nota || x.nota === bg.nota)));
        if (!repetido) f.trasfondos.push(bg);
        continue;
      }
      if (empiezaConTipo) { f.desconocidos.push(new EntradaDesconocida({ texto: l0, seccion: 'trasfondos', origen: origen(i) })); continue; }
      this.#ventajaOEsp(f, l);
    }

    // talentos y lazos
    const grupos = [...new Set(S.datos.talentos.map(t => norm(t.grupo)))];
    for (const l0 of tal) {
      const l = l0.replace(/^[✦✧•●○◆❖♦▪■\-–→*]\s*/, '');
      // «Talentos Generales», «Mágicos:»: encabezados de grupo, no talentos
      const g = norm(l.replace(/:\s*$/, '')).replace(/^talentos?\s+/, '');
      if (grupos.includes(g)) continue;
      let m = l.match(/^(Lazo|Uni[oó]n|V[ií]nculo)\s*(?:con)?\s*:?\s*(.+)$/i);
      if (m) {
        const [pj, ...rest] = m[2].split(/\s+[—–-]\s+/); const tipo = S.datos.vinculos.find(v => norm(v) === norm(m[1])) || 'Vínculo';
        f.vinculos.push({ tipo, pj: pj.trim(), nota: rest.join(' — ').trim() }); continue;
      }
      m = l.match(/^((?:Objeto|Hechizo|Poci[oó]n|Ritual)\s+Inventad[oa])\s*(?::|—|–)?\s*(.+)$/i);
      if (m) { f.talentos.push({ nombre: m[1], nota: m[2].trim() }); continue; }
      const pi = l.search(/\s*[(:]|\s+[—–]\s+/);
      const n = (pi > 0 ? l.slice(0, pi) : l).trim(); let nota = pi > 0 ? l.slice(pi).replace(/^[\s:]+/, '').trim() : '';
      nota = nota.replace(/^[—–]\s*/, '').replace(/^\((.*)\)$/, '$1'); if (/^requiere/i.test(nota)) nota = '';
      if (n && n.length <= 60) f.talentos.push({ nombre: n, nota });
    }
    f.titulos = tit.length ? tit.join('\n').split('\n') : [];

    // raza con canje
    const RAZAS_C = [['semigigant', 'Semigigante'], ['semiduend', 'Semiduende'], ['semiveel', 'Semiveela'], ['metamorfomag', 'Metamorfomago']];
    const razaDe = t => { const z = norm(t || '').replace(/[^a-z]/g, ''); const h = RAZAS_C.find(([k]) => z.includes(k)); return h ? h[1] : null; };
    if (!razaDe(leg.d.raza)) {
      const cand = raza.concat(lines.filter(l => /^\W*raza\s*:/i.test(l)).map(l => l.replace(/^\W*raza\s*:/i, '')));
      for (const l of cand) { const rz = razaDe(l); if (rz) { leg.d.raza = rz; break; } }
    }
    const raw = partes.map(p => p.bbcode).join('\n');
    const img = raw.match(/<img[^>]+src="([^"]+)"/i); if (img) leg.extra.foto = img[1];

    f.nombre = leg.nombre; f.datos = leg.d; f.descripcion = leg.desc; f.presentacion = leg.extra;
    const nA = f.arcanos.length, nB = f.trasfondos.length, nD = f.desconocidos.length;
    const resumen = `${nA} arcano${nA !== 1 ? 's' : ''}, ${nB} trasfondo${nB !== 1 ? 's' : ''}, ${f.idiomas.length} idioma${f.idiomas.length !== 1 ? 's' : ''}` + (nD ? `, ${nD} línea${nD !== 1 ? 's' : ''} para revisar` : '');
    return { ficha: f, resumen };
  }

  /** Datos personales vacíos con los mismos campos que el PAM antiguo. */
  #vacia() {
    return {
      nombre: '',
      d: { avatar: '', multicuenta: '', nacimiento: '', residencia: '', clase: '', fechaNac: '', edad: '', etapa: '', orientacion: '', sangre: '', raza: 'Humana', casa: '', curso: '', faccion: '', quidditch: '' },
      desc: { fisica: '', psico: '', fuerte: '', debil: '', gustos: '', fobias: '', historia: '', familia: '', mascota: '' },
      extra: { kicker: '', ocupacion: '', foto: '', limites: '', pd: 1, pdPerdida: '', frase: '' }
    };
  }

  /** Una línea de una sección de magia. El nombre y la descripción quedan como están en la ficha. */
  #arcano(f, ln, mType, mTier, origen) {
    const bullet = /^[✦✧•●○▪■\-–→*❖◆♦]/.test(ln);
    const l = ln.replace(/^[✦✧•●○▪■\-–→*❖◆♦]\s*/, '');
    const ci = l.indexOf(':');
    let name = ci > 0 && ci < 80 ? l.slice(0, ci).trim() : (l.length <= 60 ? l.trim() : '');
    let descripcion = ci > 0 ? l.slice(ci + 1).trim() : '';
    // «• Alset. Requiere Especialización Encantador 2.»: sin dos puntos, el nombre llega hasta el primer punto
    if (ci < 0) {
      const p = l.match(/^([^.]{2,80}?)\.(?:\s+(.*))?$/);
      // con viñeta, aunque no esté en el Compendio: una línea larga no se tira, se guarda para revisar (regla 3)
      if (p && (this.compendio.buscar(p[1].trim(), mType) || (bullet && !name))) { name = p[1].trim(); descripcion = (p[2] || '').trim(); }
    }
    // restos de etiquetas rotas («Ferula.[/colo]») y el punto final
    name = name.replace(/\[[^\]]*\]/g, '').replace(/\.+$/, '').trim();
    if (!name) return;
    const hit = this.compendio.buscar(name, mType);
    if (!hit && !bullet) return;
    if (!hit && ci < 0 && l.length > 60 && !(bullet && name.length < l.length)) return;
    const tipo = mType === 'objeto' && mTier === '' ? 'especial' : mType;
    if (f.arcanos.some(a => (hit && a.ref === hit.id) || norm(a.nombre) === norm(name))) return;
    const nivel = hit && tipo !== 'especial' ? hit.nivel : mTier;
    f.arcanos.push(new Arcano({ tipo: /** @type {any} */ (tipo), nivel: /** @type {any} */ (nivel), nombre: name, descripcion, ref: hit ? hit.id : null, origen, textoOriginal: ln, estadoLectura: hit ? 'reconocido' : 'revisar' }));
  }

  /** Ventajas y especializaciones («Fama II», «Orden de Merlín, Segunda clase», «Medimago I»). */
  #ventajaOEsp(f, l) {
    let m = l.match(/^(Fama|Orden de Merl[ií]n|Patr[oó]n|Recursos)\s+(IV|I{1,3}|[1-4])\b/i);
    if (m) { const k = Object.keys(f.ventajas).find(a => norm(a) === norm(m[1])); if (k) f.ventajas[k] = Math.max(f.ventajas[k], ROMANO[m[2].toUpperCase()] || num(m[2])); return true; }
    m = l.match(/^Orden de Merl[ií]n.*?(Primera|Segunda|Tercera)\s+clase/i);
    if (m) { f.ventajas['Orden de Merlín'] = Math.max(f.ventajas['Orden de Merlín'], { primera: 3, segunda: 2, tercera: 1 }[norm(m[1])]); return true; }
    m = l.match(/^(Combatiente|Encantador|Hechicero|Jugador de Quidditch|Magizo[oó]logo|Mago Oscuro|Medimago)\s+(I{1,3}|[1-3])\b/i);
    if (m) { const r = Object.keys(f.especializaciones).find(x => norm(x) === norm(m[1])); if (r) { f.especializaciones[r] = Math.max(f.especializaciones[r], ROMANO[m[2].toUpperCase()] || num(m[2])); return true; } }
    return false;
  }

  /** «Bajos Fondos», «Bajos fondos:», «▋ Política» → nombre oficial de la categoría, si lo es y la línea no lleva nada más. */
  #categoriaEncabezado(l, tipo) {
    const t = l.replace(/[:.]\s*$/, '').trim();
    if (!t || /\d|\b(?:I{1,3}|IV|VI?)\b/.test(t)) return null;
    const tipos = tipo ? [tipo] : TIPOS_BG;
    for (const tp of tipos) { const c = Object.keys(this.sistema.categoriasTrasfondo(tp)).find(k => norm(k) === norm(t)); if (c) return c; }
    return null;
  }
}
