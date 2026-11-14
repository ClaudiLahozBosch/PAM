// @ts-check
// Editor de la ficha del foro: cambia en el código original SOLO lo que cambió, en el mensaje donde está.
// Sustituye al modo «Personalizada» antiguo (actualizarCodigo). Diferencias:
//   · sabe en qué mensaje está cada dato (fichas de varias partes, F04/F07);
//   · una línea nueva va DENTRO del bloque de su lista, antes de los cierres que no son suyos (R01), y al
//     quitar una línea esos cierres se quedan (R02);
//   · las líneas nuevas de un mismo grupo quedan en orden (R03);
//   · también idiomas, trasfondos, ventajas, especializaciones, talentos y títulos (R06);
//   · CADA cambio se comprueba volviendo a leer la ficha: si el dato no queda como debe, si se mueve otra
//     cosa o si se descuadra una etiqueta, el cambio se deshace y va a la lista «a mano». Nunca dice
//     «hecho» sin haberlo comprobado.
// Los campos de texto, atributos, habilidades y combate se cambian como en el PAM antiguo (funcionaba bien).
import { analizar, balance, partesDeLinea, visible, marco } from './Etiquetas.js?v=2.1.4';
import { limpiarForo, seccion } from '../lectores/LectorFicha.js?v=2.1.4';
import { combate, puntos } from '../reglas/Combate.js?v=2.1.4';
import { norm, num, aRomano, escRe } from '../core/texto.js?v=2.1.4';

const SKILL_LV = ['Desentrenado (+0)', 'Novato (+1)', 'Competente (+2)', 'Experto (+4)', 'Maestro (+7)', 'Legendario (+9)'];
const NIVEL_ARC = { dom: 'doméstico', bas: 'básico', int: 'intermedio', ava: 'avanzado', leg: 'legendario' };
const TIER_PAL = { dom: ['DOMÉSTICOS', 'DOMÉSTICAS'], bas: ['BÁSICOS', 'BÁSICAS'], int: ['INTERMEDIOS', 'INTERMEDIAS'], ava: ['AVANZADOS', 'AVANZADAS'] };
const ORDEN_TIER = ['dom', 'bas', 'int', 'ava', 'leg'];

const normLinea = s => norm(String(s).replace(/^[^A-Za-zÁÉÍÓÚáéíóúÑñ0-9]+/, '')).replace(/\s+/g, ' ');
const kArc = a => `${a.tipo}|${a.nivel}|${a.ref || norm(a.nombre)}`;
const kBg = t => [t.tipo, t.categoria, t.especifico, t.identidad].map(norm).join('|');
const kBgN = t => kBg(t) + '|' + t.nivel;
const kId = i => norm(i.nombre);
const kTal = t => norm(t.nombre) + '|' + norm(t.nota);
const ordenado = l => [...l].sort();

/** Lo que se compara al comprobar un cambio. */
function resumen(f) {
  return {
    arcanos: ordenado(f.arcanos.map(kArc)), trasfondos: ordenado(f.trasfondos.map(kBgN)),
    idiomas: ordenado(f.idiomas.map(i => kId(i) + '|' + i.nivel)), talentos: ordenado(f.talentos.map(kTal)),
    titulos: ordenado(f.titulos.map(norm).filter(Boolean)), ventajas: JSON.stringify(f.ventajas), esp: JSON.stringify(f.especializaciones),
    atributos: JSON.stringify(f.atributos), habilidades: JSON.stringify(f.habilidades), artes: ordenado(f.artes.map(a => norm(a.nombre) + '|' + a.nivel)),
    pd: f.presentacion.pd, nombre: f.nombre, desconocidos: f.desconocidos.length
  };
}
const quitar1 = (l, x) => { const i = l.indexOf(x); return i < 0 ? l : [...l.slice(0, i), ...l.slice(i + 1)]; };

/** Posición [a, b) de cada línea del texto. */
function lineas(texto) {
  const out = []; let a = 0;
  for (const l of texto.split('\n')) { out.push({ a, b: a + l.length, l }); a += l.length + 1; }
  return out;
}

export class EditorFicha {
  /**
   * @param {import('../datos/Sistema.js').Sistema} sistema
   * @param {import('../datos/Compendio.js').Compendio} compendio
   * @param {import('../lectores/LectorFicha.js').LectorFicha} lector
   */
  constructor(sistema, compendio, lector) { this.sistema = sistema; this.compendio = compendio; this.lector = lector; }

  /**
   * @param {import('../modelos/Ficha.js').Ficha} antes la ficha tal como se leyó del foro (con sus partes)
   * @param {import('../modelos/Ficha.js').Ficha} despues cómo tiene que quedar
   * @param {{ tema?: number|null }} [op]
   * @returns {{ partes: {post: number, antes: string, despues: string}[], hechos: string[], manual: string[] }}
   */
  aplicar(antes, despues, { tema = null } = {}) {
    const S = this.sistema;
    const orden = antes.partes.map(p => p.post);
    const textos = new Map(antes.partes.map(p => [p.post, p.bbcode]));
    const hechos = [], manual = [];
    const leer = tx => this.lector.leer(orden.map(post => ({ post, bbcode: tx.get(post) })), { tema }).ficha;
    let actual = leer(textos);

    /**
     * Prueba cada forma de hacer un cambio y se queda con la primera que, al volver a leer la ficha, deja
     * exactamente lo esperado sin descuadrar etiquetas.
     * @param {string} que @param {((tx: Map<number,string>) => boolean)[]} formas @param {(r: any) => any} esperado
     */
    const intentar = (que, formas, esperado) => {
      for (const forma of formas) {
        const copia = new Map(textos);
        let tocado = false;
        try { tocado = forma(copia); } catch { tocado = false; }
        if (!tocado) continue;
        if (orden.some(p => copia.get(p) !== textos.get(p) && JSON.stringify(balance(copia.get(p))) !== JSON.stringify(balance(textos.get(p))))) continue;
        const nueva = leer(copia);
        if (JSON.stringify(resumen(nueva)) !== JSON.stringify(esperado(resumen(actual)))) continue;
        for (const [k, v] of copia) textos.set(k, v);
        actual = nueva; hechos.push(que); return true;
      }
      return false;
    };

    // ---------- 1. campos, atributos, habilidades y combate (como el PAM antiguo) ----------
    this.#campos(textos, orden, antes, despues, hechos, manual);
    actual = leer(textos);

    // ---------- 2. quitar ----------
    const nuevosArc = despues.arcanos.map(kArc);
    for (const a of [...actual.arcanos]) {
      if (nuevosArc.includes(kArc(a))) continue;
      const ok = intentar(`Quitado: ${a.nombre}`, [tx => this.#quitarLinea(tx, a.origen.post, a.textoOriginal)], r => ({ ...r, arcanos: quitar1(r.arcanos, kArc(a)) }));
      if (!ok) manual.push(`Arcano ${a.nombre}: lo quitaste; bórralo a mano`);
    }
    const nuevosBg = despues.trasfondos.map(kBg);
    for (const t of [...actual.trasfondos]) {
      if (nuevosBg.includes(kBg(t))) continue;
      const ok = intentar(`Quitado: ${this.#nombreBg(t)}`, [tx => this.#quitarLinea(tx, t.origen.post, t.textoOriginal)], r => ({ ...r, trasfondos: quitar1(r.trasfondos, kBgN(t)) }));
      if (!ok) manual.push(`Trasfondo ${this.#nombreBg(t)}: lo quitaste; bórralo a mano`);
    }
    for (const i of [...actual.idiomas]) {
      if (despues.idiomas.some(x => kId(x) === kId(i))) continue;
      const ok = intentar(`Quitado: idioma ${i.nombre}`, this.#lineasCon(textos, l => normLinea(l).startsWith(norm(i.nombre)) && norm(l).includes(norm(i.nivel))).map(([post, n]) => tx => this.#quitarIndice(tx, post, n)),
        r => ({ ...r, idiomas: quitar1(r.idiomas, kId(i) + '|' + i.nivel) }));
      if (!ok) manual.push(`Idioma ${i.nombre}: lo quitaste; bórralo a mano`);
    }
    for (const t of [...actual.talentos]) {
      if (despues.talentos.some(x => kTal(x) === kTal(t))) continue;
      const ok = intentar(`Quitado: talento ${t.nombre}`, this.#lineasCon(textos, l => normLinea(l).startsWith(norm(t.nombre))).map(([post, n]) => tx => this.#quitarIndice(tx, post, n)),
        r => ({ ...r, talentos: quitar1(r.talentos, kTal(t)) }));
      if (!ok) manual.push(`Talento ${t.nombre}: lo quitaste; bórralo a mano`);
    }

    // ---------- 3. cambios de nivel ----------
    for (const t of despues.trasfondos) {
      const o = actual.trasfondos.find(x => kBg(x) === kBg(t));
      if (!o || o.nivel === t.nivel) continue;
      const ok = intentar(`Trasfondo ${this.#nombreBg(t)}: ${aRomano(o.nivel)} → ${aRomano(t.nivel)}`, this.#formasNivel(textos, o.origen.post, o.textoOriginal, [aRomano(o.nivel), String(o.nivel)], aRomano(t.nivel)),
        r => ({ ...r, trasfondos: [...quitar1(r.trasfondos, kBgN(o)), kBgN(t)].sort() }));
      if (!ok) manual.push(`Trasfondo ${this.#nombreBg(t)}: cámbialo a mano a ${aRomano(t.nivel)}`);
    }
    for (const i of despues.idiomas) {
      const o = actual.idiomas.find(x => kId(x) === kId(i));
      if (!o || o.nivel === i.nivel) continue;
      const formas = this.#lineasCon(textos, l => normLinea(l).startsWith(norm(o.nombre))).flatMap(([post, n]) => this.#formasPalabra(textos, post, n, o.nivel, i.nivel));
      const ok = intentar(`Idioma ${i.nombre}: ${o.nivel} → ${i.nivel}`, formas, r => ({ ...r, idiomas: [...quitar1(r.idiomas, kId(o) + '|' + o.nivel), kId(i) + '|' + i.nivel].sort() }));
      if (!ok) manual.push(`Idioma ${i.nombre}: cámbialo a mano a ${i.nivel}`);
    }
    for (const [campo, grupo, lista] of [['ventajas', 'Ventaja', Object.keys(despues.ventajas)], ['especializaciones', 'Especialización', Object.keys(despues.especializaciones)]]) {
      for (const k of lista) {
        const vA = num(actual[campo][k]), vD = num(despues[campo][k]);
        if (vA === vD) continue;
        const esperado = r => { const o = JSON.parse(r[campo === 'ventajas' ? 'ventajas' : 'esp']); o[k] = vD; return { ...r, [campo === 'ventajas' ? 'ventajas' : 'esp']: JSON.stringify(o) }; };
        let formas = [];
        if (vA > 0 && vD > 0) formas = this.#lineasCon(textos, l => normLinea(l).startsWith(norm(k))).flatMap(([post, n]) => this.#formasPalabra(textos, post, n, aRomano(vA), aRomano(vD)));
        else if (vA > 0 && vD === 0) formas = this.#lineasCon(textos, l => normLinea(l).startsWith(norm(k))).map(([post, n]) => tx => this.#quitarIndice(tx, post, n));
        else formas = this.#formasNuevaEnSeccion(textos, campo === 'ventajas' ? 'o:adv' : 'o:esp', `${k} ${aRomano(vD)}`);
        if (!intentar(`${grupo} ${k}: ${vA ? aRomano(vA) : '—'} → ${vD ? aRomano(vD) : '—'}`, formas, esperado)) manual.push(`${grupo} ${k}: ponla a mano en ${vD ? aRomano(vD) : 'ninguna'}`);
      }
    }

    // ---------- 4. añadir (en el orden de la ficha nueva: así quedan en orden, R03) ----------
    for (const a of despues.arcanos) {
      if (actual.arcanos.some(x => kArc(x) === kArc(a))) continue;
      const desc = a.descripcion || (a.ref ? this.compendio.porId(a.ref)?.texto ?? '' : '');
      const ok = intentar(`Añadido: ${a.nombre}`, this.#formasArcano(textos, actual, a, desc), r => ({ ...r, arcanos: [...r.arcanos, kArc(a)].sort() }));
      if (!ok) manual.push(`Arcano nuevo ${a.nombre} (${a.tipo} ${NIVEL_ARC[a.nivel] ?? a.nivel}): añádelo a mano`);
    }
    for (const t of despues.trasfondos) {
      if (actual.trasfondos.some(x => kBg(x) === kBg(t))) continue;
      const ok = intentar(`Añadido: ${this.#nombreBg(t)}`, this.#formasTrasfondo(textos, actual, t), r => ({ ...r, trasfondos: [...r.trasfondos, kBgN(t)].sort() }));
      if (!ok) manual.push(`Trasfondo nuevo ${this.#nombreBg(t)}: añádelo a mano`);
    }
    for (const i of despues.idiomas) {
      if (actual.idiomas.some(x => kId(x) === kId(i))) continue;
      const formas = this.#formasCopiando(textos, actual.idiomas.map(x => x.nombre), h => {
        const m = visible(h.contenido).match(new RegExp(`${escRe(h.nombre)}(\\s*(?:—|–|-|:|\\()\\s*(?:nivel\\s+)?)`, 'i'));
        return i.nombre + (m ? m[1] : ' — ') + i.nivel + (m && m[1].includes('(') ? ')' : '');
      }, 'o:idiomas', `${i.nombre} — ${i.nivel}`);
      if (!intentar(`Añadido: idioma ${i.nombre} (${i.nivel})`, formas, r => ({ ...r, idiomas: [...r.idiomas, kId(i) + '|' + i.nivel].sort() }))) manual.push(`Idioma ${i.nombre} (${i.nivel}): añádelo a mano`);
    }
    for (const t of despues.talentos) {
      if (actual.talentos.some(x => kTal(x) === kTal(t))) continue;
      const txt = t.nombre + (t.nota ? ` (${t.nota})` : '');
      const formas = this.#formasCopiando(textos, actual.talentos.map(x => x.nombre), () => txt, 'o:tal', txt);
      if (!intentar(`Añadido: talento ${t.nombre}`, formas, r => ({ ...r, talentos: [...r.talentos, kTal(t)].sort() }))) manual.push(`Talento ${t.nombre}: añádelo a mano`);
    }
    const titA = actual.titulos.map(norm);
    for (const t of despues.titulos.filter(x => x.trim() && !titA.includes(norm(x)))) {
      const formas = this.#formasCopiando(textos, actual.titulos.filter(x => x.trim() && x.trim() !== '-'), () => t, 'o:tit', t);
      if (!intentar(`Añadido: título ${t}`, formas, r => ({ ...r, titulos: [...r.titulos, norm(t)].sort() }))) manual.push(`Título «${t}»: añádelo a mano`);
    }
    for (const t of actual.titulos.filter(x => x.trim() && !despues.titulos.map(norm).includes(norm(x))))
      if (!intentar(`Quitado: título ${t}`, this.#lineasCon(textos, l => normLinea(l) === normLinea(t)).map(([post, n]) => tx => this.#quitarIndice(tx, post, n)), r => ({ ...r, titulos: quitar1(r.titulos, norm(t)) }))) manual.push(`Título «${t}»: quítalo a mano`);

    // ---------- 5. lo que no se pudo comprobar ----------
    const fin = resumen(actual), quiero = resumen(despues);
    for (const k of ['atributos', 'habilidades', 'pd', 'nombre']) if (JSON.stringify(fin[k]) !== JSON.stringify(quiero[k]) && !manual.some(m => m.startsWith(k))) manual.push(`${k}: no quedó como debía; revísalo`);
    return { partes: orden.map(post => ({ post, antes: antes.partes.find(p => p.post === post)?.bbcode ?? '', despues: textos.get(post) ?? '' })), hechos, manual };
  }

  #nombreBg(t) { return [t.tipo, t.categoria, t.especifico].filter(Boolean).join(' > ') + ' ' + aRomano(t.nivel) + (t.identidad ? ` (${t.identidad})` : ''); }

  /** Índice de la línea (cruda) cuyo texto limpio es `textoOriginal`. */
  #indice(texto, textoOriginal) {
    const buscado = normLinea(textoOriginal);
    return texto.split('\n').findIndex(l => limpiarForo(l).split('\n').some(s => normLinea(s) === buscado));
  }

  /** [post, índice] de las líneas que cumplen `pred` (sobre el texto limpio). */
  #lineasCon(textos, pred) {
    const out = [];
    for (const [post, t] of textos) t.split('\n').forEach((l, n) => { if (limpiarForo(l).split('\n').some(s => s.trim() && pred(s))) out.push([post, n]); });
    return out;
  }

  #quitarLinea(tx, post, textoOriginal) {
    const t = tx.get(post); if (t == null) return false;
    const n = this.#indice(t, textoOriginal); if (n < 0) return false;
    return this.#quitarIndice(tx, post, n);
  }

  /** Quita lo que es de la línea y deja los cierres y aperturas de bloques ajenos (R02). */
  #quitarIndice(tx, post, n) {
    const t = tx.get(post); const L = lineas(t), mapa = analizar(t), { a, b } = L[n];
    const { ini, fin } = partesDeLinea(mapa, a, b, t);
    const pre = t.slice(a, ini), post_ = t.slice(fin, b);
    let nuevo;
    if (!pre.trim() && !post_.trim()) nuevo = n > 0 ? t.slice(0, a - 1) + t.slice(b) : t.slice(b + 1);           // la línea entera
    else if (!pre.trim()) nuevo = n > 0 ? t.slice(0, a - 1) + post_ + t.slice(b) : post_ + t.slice(b);             // sus cierres pasan a la línea anterior
    else nuevo = t.slice(0, a) + pre + (post_.trim() && !visible(pre).trim() ? '-' : '') + post_ + t.slice(b);   // bloque que queda vacío: «-»
    tx.set(post, nuevo); return true;
  }

  /** Inserta `contenido` como línea nueva justo después de la línea n, DENTRO de su bloque (R01). */
  #insertarTras(tx, post, n, contenido) {
    const t = tx.get(post); const L = lineas(t), mapa = analizar(t), { a, b } = L[n];
    const { fin } = partesDeLinea(mapa, a, b, t);
    tx.set(post, t.slice(0, fin) + '\n' + contenido + t.slice(fin)); return true;
  }

  /** Lo que es de la línea n (sin aperturas ni cierres ajenos), y lo que va delante del nombre (viñeta, colores). */
  #contenido(t, n) {
    const L = lineas(t), mapa = analizar(t), { a, b } = L[n];
    const { ini, fin } = partesDeLinea(mapa, a, b, t);
    return t.slice(ini, fin);
  }

  /** Formas de cambiar un nivel en una línea: probar cada aparición del número viejo (fuera de las etiquetas). */
  #formasNivel(textos, post, textoOriginal, viejos, nuevo) {
    const t = textos.get(post); if (t == null) return [];
    const n = this.#indice(t, textoOriginal); if (n < 0) return [];
    return viejos.flatMap(v => this.#formasPalabra(textos, post, n, v, nuevo));
  }

  #formasPalabra(textos, post, n, viejo, nuevo) {
    const t = textos.get(post); const { a, b } = lineas(t)[n];
    const linea = t.slice(a, b), etq = analizar(linea);
    const re = new RegExp(`(^|[^A-Za-zÁÉÍÓÚáéíóúÑñ0-9])(${escRe(viejo)})(?![A-Za-zÁÉÍÓÚáéíóúÑñ0-9])`, 'gi');
    const formas = []; let m;
    while ((m = re.exec(linea))) {
      const pos = m.index + m[1].length;
      if (etq.some(e => pos >= e.ini && pos < e.fin)) continue; // dentro de una etiqueta («[i]»)
      const mayus = /^[A-ZÁÉÍÓÚÑ]/.test(m[2]) && !/^[IVX]+$/.test(m[2]) ? nuevo.charAt(0).toUpperCase() + nuevo.slice(1) : (m[2] === m[2].toLowerCase() && !/^[IVX]+$/.test(nuevo) ? nuevo.toLowerCase() : nuevo);
      const largo = m[2].length; // copiado: `m` cambia en la siguiente vuelta del bucle
      formas.push(tx => { const tt = tx.get(post); tx.set(post, tt.slice(0, a + pos) + mayus + tt.slice(a + pos + largo)); return true; });
    }
    return formas;
  }

  /**
   * Línea nueva copiando el formato de un hermano (otro elemento de la misma lista): lo de delante (viñeta,
   * «[b]», colores) y las etiquetas que lo cierran al final («[/b]»). Solo vale un hermano cuyo formato
   * quede con las mismas etiquetas abiertas y cerradas. Si no hay, tras el encabezado de la sección.
   * @param {(h: {nombre: string, contenido: string}) => string} construir el texto nuevo (sin formato)
   */
  #formasCopiando(textos, nombresHermanos, construir, codigoSeccion, textoSinHermano) {
    const formas = [];
    for (const nombre of [...nombresHermanos].reverse()) {
      for (const [post, n] of this.#lineasCon(textos, l => normLinea(l).startsWith(norm(nombre)))) {
        formas.push(tx => {
          const c = this.#contenido(tx.get(post), n), at = c.toLowerCase().indexOf(String(nombre).toLowerCase());
          if (at < 0) return false;
          const { prefijo, sufijo } = marco(c, at);
          const linea = prefijo + construir({ nombre, contenido: c }) + sufijo;
          if (JSON.stringify(balance(linea)) !== JSON.stringify(balance(c))) return false;
          return this.#insertarTras(tx, post, n, linea);
        });
      }
    }
    return formas.concat(this.#formasNuevaEnSeccion(textos, codigoSeccion, textoSinHermano));
  }

  /** Tras el encabezado de una sección («IDIOMAS», «[spoiler=TALENTOS]»); si solo tiene «-», en su lugar. */
  #formasNuevaEnSeccion(textos, codigo, contenido) {
    const formas = [];
    for (const [post, t] of textos) {
      t.split('\n').forEach((l, n) => {
        if (!limpiarForo(l).split('\n').some(s => seccion(s)?.includes(codigo))) return;
        formas.push(tx => {
          const tt = tx.get(post), L = lineas(tt);
          // ¿la sección solo tiene «-»? (en la misma línea del encabezado o en la siguiente)
          const sig = L[n + 1];
          if (sig && visible(sig.l).trim() === '-') { const { ini, fin } = partesDeLinea(analizar(tt), sig.a, sig.b, tt); const k = tt.indexOf('-', ini); if (k >= 0 && k < fin) { tx.set(post, tt.slice(0, k) + contenido + tt.slice(k + 1)); return true; } }
          const sub = limpiarForo(L[n].l).split('\n').map(s => s.trim()).filter(Boolean);
          if (sub.length === 2 && sub[1] === '-') { const k = L[n].a + L[n].l.lastIndexOf('-'); tx.set(post, tt.slice(0, k) + contenido + tt.slice(k + 1)); return true; }
          return this.#insertarTras(tx, post, n, contenido);
        });
      });
    }
    return formas;
  }

  /** Formas de añadir un arcano: tras el último de su tipo y nivel; si no hay, tras el encabezado de su nivel; si no hay encabezado, creándolo. */
  #formasArcano(textos, actual, a, desc) {
    const formas = [];
    const linea = (base, sib) => {
      // «✦ [b]Fiendfyre[/b]: …» → «✦ [b]Nuevo[/b]: descripción»; «• Alset. Requiere…» → «• Nuevo. descripción»
      const at = base.toLowerCase().indexOf(sib.nombre.toLowerCase());
      if (at < 0) return `✦ [b]${a.nombre}[/b]${desc ? ': ' + desc : ''}`;
      let resto = base.slice(at + sib.nombre.length);
      const cierre = (resto.match(/^(?:\[\/[a-z]+\]|<\/[a-z]+>)*/i) ?? [''])[0];
      resto = resto.slice(cierre.length);
      const sep = (resto.match(/^\s*[:.]\s*/) ?? [''])[0] || ': ';
      return base.slice(0, at) + a.nombre + cierre + (desc ? sep + desc : '');
    };
    const hermanos = actual.arcanos.filter(x => x.tipo === a.tipo && x.nivel === a.nivel);
    const ultimo = hermanos[hermanos.length - 1];
    if (ultimo) {
      formas.push(tx => { const t = tx.get(ultimo.origen.post); const n = this.#indice(t, ultimo.textoOriginal); if (n < 0) return false; return this.#insertarTras(tx, ultimo.origen.post, n, linea(this.#contenido(t, n), ultimo)); });
    }
    // sin hermanos: tras el encabezado de su nivel, con el formato de cualquier otro arcano
    const modelo = actual.arcanos[actual.arcanos.length - 1];
    const lineaModelo = tx => { if (!modelo) return `✦ [b]${a.nombre}[/b]${desc ? ': ' + desc : ''}`; const t = tx.get(modelo.origen.post); const n = this.#indice(t, modelo.textoOriginal); return n < 0 ? `✦ [b]${a.nombre}[/b]${desc ? ': ' + desc : ''}` : linea(this.#contenido(t, n), modelo); };
    for (const [post, n, codigos] of this.#encabezados(textos)) {
      if (codigos.tipo !== a.tipo || codigos.nivel !== a.nivel) continue;
      formas.push(tx => this.#insertarTras(tx, post, n, lineaModelo(tx)));
    }
    // sin encabezado de su nivel: se crea, copiando el de otro nivel del mismo tipo, en su sitio
    const otros = this.#encabezados(textos).filter(([, , c]) => c.tipo === a.tipo && c.nivel && c.nivel !== a.nivel && TIER_PAL[c.nivel]);
    const menores = otros.filter(([, , c]) => ORDEN_TIER.indexOf(c.nivel) < ORDEN_TIER.indexOf(a.nivel));
    const ref = menores[menores.length - 1];
    if (ref && TIER_PAL[a.nivel]) {
      formas.push(tx => {
        const [post, nH, cH] = ref; const t = tx.get(post);
        const visH = this.#contenido(t, nH);
        const pal = TIER_PAL[cH.nivel].find(p => norm(visH).toUpperCase().includes(norm(p).toUpperCase())) ?? TIER_PAL[cH.nivel][0];
        const fem = TIER_PAL[cH.nivel].indexOf(pal) === 1;
        const re = new RegExp(escRe(pal), 'i'), m = visH.match(re); if (!m) return false;
        const enMinus = m[0] !== m[0].toUpperCase();
        let nuevaPal = TIER_PAL[a.nivel][fem ? 1 : 0]; if (enMinus) nuevaPal = nuevaPal.charAt(0) + nuevaPal.slice(1).toLowerCase();
        const cab = visH.replace(re, nuevaPal).replace(/\|\s*\d+/, '| 1');
        // tras el último arcano de ese nivel menor (o su encabezado)
        const delMenor = actual.arcanos.filter(x => x.tipo === a.tipo && x.nivel === cH.nivel);
        const ult = delMenor[delMenor.length - 1];
        let n = nH; if (ult && ult.origen.post === post) { const k = this.#indice(t, ult.textoOriginal); if (k >= 0) n = k; }
        this.#insertarTras(tx, post, n, cab);
        return this.#insertarTras(tx, post, n + 1, lineaModelo(tx));
      });
    }
    return formas;
  }

  /** Encabezados de magia: [post, línea, { tipo, nivel }], siguiendo el mismo orden que el lector. */
  #encabezados(textos) {
    const out = [];
    for (const [post, t] of textos) {
      let tipo = null;
      t.split('\n').forEach((l, n) => {
        for (const s of limpiarForo(l).split('\n')) {
          const cs = seccion(s); if (!cs) continue;
          for (const c of cs) {
            if (c.startsWith('m:')) tipo = c.slice(2);
            else if (c.startsWith('o:')) tipo = null;
            else if (c.startsWith('t:') && tipo) out.push([post, n, { tipo, nivel: c.slice(2) }]);
          }
        }
      });
    }
    return out;
  }

  /** Formas de añadir un trasfondo copiando el formato de otro (el del mismo tipo y categoría, si lo hay). */
  #formasTrasfondo(textos, actual, t) {
    const sibs = [...actual.trasfondos].reverse();
    const sib = sibs.find(x => x.tipo === t.tipo && norm(x.categoria) === norm(t.categoria)) ?? sibs.find(x => x.tipo === t.tipo) ?? sibs[0];
    const R = aRomano(t.nivel);
    const formas = [];
    if (sib) {
      formas.push(tx => {
        const tt = tx.get(sib.origen.post); const n = this.#indice(tt, sib.textoOriginal); if (n < 0) return false;
        const c = this.#contenido(tt, n);
        const at = c.search(new RegExp(`\\b${escRe(sib.tipo)}\\b`, 'i'));
        if (at < 0) return false;
        const { prefijo, sufijo } = marco(c, at);
        const nivelPrimero = new RegExp(`^(?:Biblioteca|Influencia|Informantes|Seguidores)\\s+(?:VI|V|IV|I{1,3}|[1-6])\\b`, 'i').test(sib.textoOriginal);
        const catImplicita = norm(sib.categoria) === norm(t.categoria) && !norm(sib.textoOriginal).includes(norm(sib.categoria));
        let txt;
        if (nivelPrimero) {
          const cuerpo = [catImplicita ? '' : t.categoria, t.especifico].filter(Boolean).join(' > ');
          txt = `${t.tipo} ${R}${!cuerpo && t.identidad ? ` (${t.identidad})` : ''}: ${cuerpo}${cuerpo && t.identidad ? ` (${t.identidad})` : ''}${cuerpo ? '.' : ''}${t.nota ? ' ' + t.nota : ''}`.replace(/:\s*$/, ':');
        } else {
          const sep = (sib.textoOriginal.match(/\s(—|–|>|-)\s/) ?? [, '—'])[1];
          txt = [t.tipo, t.categoria, t.especifico].filter(Boolean).join(` ${sep} `) + ' ' + R + (t.identidad ? ` (${t.identidad})` : '') + (t.nota ? ': ' + t.nota : '');
        }
        // la descripción de Irvin va en la misma línea: el «sufijo» solo vale si son etiquetas de cierre
        const linea = prefijo + txt + sufijo;
        if (JSON.stringify(balance(linea)) !== JSON.stringify(balance(c))) return false;
        return this.#insertarTras(tx, sib.origen.post, n, linea);
      });
    }
    return formas.concat(this.#formasNuevaEnSeccion(textos, 'o:bg', [t.tipo, t.categoria, t.especifico].filter(Boolean).join(' — ') + ' ' + R + (t.identidad ? ` (${t.identidad})` : '')));
  }

  // ---------- campos (adaptado del PAM antiguo) ----------
  #campos(textos, orden, antes, despues, hechos, manual) {
    const S = this.sistema;
    const CLOSE = '(?:\\s*(?:\\[\\/(?:color|b|i|u|font|size)\\]|<\\/(?:span|b|strong|i|em|font)>))*';
    // el valor puede ir dentro de su propio formato: «→ Atletismo:[/color] [color=#316996]Novato (+1)[/color]» (ficha de Elena,
    // pruebas en Chrome del 5/11/2026); sin esto no se encontraba, y en los atributos el número nuevo quedaba delante del viejo
    const OPEN = '(?:\\[(?:color|b|i|u|font|size)(?:=[^\\]]*)?\\]|<(?:span|b|strong|i|em|font)\\b[^>]*>)*';
    const valor = (f, p) => { if (p === 'nombre') return f.nombre; const [o, k] = p.split('.'); const obj = o === 'd' ? f.datos : o === 'desc' ? f.descripcion : f.presentacion; return obj?.[k] ?? ''; };
    const v = x => String(x ?? '').trim();
    // aplica una sustitución en el primer mensaje donde encaje
    const rep = (re, fn, que) => {
      for (const post of orden) { const t = textos.get(post); let n = 0; const nt = t.replace(re, (...m) => { n++; return fn(...m); }); if (n) { textos.set(post, nt); hechos.push(que); return true; } }
      return false;
    };
    const CAMPOS = [['nombre', 'Nombre y Apellido', 'Nombre y Apellido'], ['d.avatar', 'Avatar/PB', 'Avatar/PB'], ['d.avatar', 'Avatar', 'Avatar/PB'], ['d.multicuenta', 'Multicuentas?', 'Multicuenta'],
      ['d.nacimiento', 'Lugar de Nacimiento', 'Lugar de Nacimiento'], ['d.residencia', 'Lugar de Residencia', 'Lugar de Residencia'], ['d.clase', 'Clase Social', 'Clase Social'],
      ['d.fechaNac', 'Fecha de Nacimiento', 'Fecha de Nacimiento'], ['d.edad', 'Edad', 'Edad'], ['d.etapa', 'Etapa', 'Etapa'], ['d.orientacion', 'Orientación Sexual', 'Orientación Sexual'],
      ['d.sangre', 'Tipo de Sangre', 'Tipo de Sangre'], ['d.raza', 'Raza', 'Raza'], ['d.casa', 'Casa', 'Casa'], ['d.curso', 'Curso', 'Curso'], ['d.faccion', 'Facción', 'Facción'],
      ['d.quidditch', 'Equipo de Quidditch', 'Equipo de Quidditch'], ['desc.fuerte', 'Puntos? Fuertes?', 'Punto Fuerte'], ['desc.debil', 'Puntos? Débil(?:es)?', 'Punto Débil'],
      ['desc.gustos', 'Gustos ?\\/ ?Aficiones', 'Gustos/Aficiones'], ['desc.fobias', 'Fobias ?\\/ ?[Mm]anías', 'Fobias/manías'], ['desc.mascota', 'Mascotas?', 'Mascota'],
      ['extra.pdPerdida', 'Pérdida de Puntos de Destino', 'Pérdida de Puntos de Destino']];
    const vistos = new Set();
    for (const [p, lab, nombre] of CAMPOS) {
      if (vistos.has(p)) continue;
      const a = v(valor(antes, p)), b = v(valor(despues, p));
      if (a === b) continue;
      const re = new RegExp(`(▋\\s*(?:${lab})\\s*:${CLOSE}[ \\t]*)([^\\n<]*?)([ \\t]*)(?=\\n|<|\\[\\/spoiler\\]|$)`, 'i');
      if (rep(re, (m, pre, x, sp) => pre + (b || '-') + sp, nombre)) vistos.add(p);
      else if (!/Avatar$/.test(lab)) manual.push(`${nombre}: no encontré dónde va en tu código (nuevo valor: ${b || '-'})`);
    }
    for (const [p, lab] of [['desc.fisica', 'Descripción Física'], ['desc.psico', 'Descripción Psicológica'], ['desc.historia', 'Historia'], ['desc.familia', 'Familia']]) {
      const a = v(valor(antes, p)), b = v(valor(despues, p));
      if (a === b) continue;
      const re = new RegExp(`(▋\\s*${lab}\\s*:${CLOSE}[ \\t]*)([\\s\\S]*?)(?=\\n[^\\n]*▋|<\\/div>|\\[\\/spoiler\\]|<\\/details>|$)`, 'i');
      if (!rep(re, (m, pre, seg) => pre + mezclarLineas(seg, b || '-'), lab)) manual.push(`${lab}: no la encontré en tu código`);
    }
    for (const [p, l] of [['extra.foto', 'Imagen'], ['extra.kicker', 'Nombre en su idioma'], ['extra.ocupacion', 'Ocupación'], ['extra.frase', 'Frase']]) {
      const a = v(valor(antes, p)), b = v(valor(despues, p));
      if (a === b || !b) continue;
      const post = orden.find(x => a.length >= 3 && textos.get(x).includes(a));
      if (post != null) { textos.set(post, textos.get(post).split(a).join(b)); hechos.push(l); } else manual.push(`${l}: cámbiala a mano (nuevo: ${b})`);
    }
    if (v(antes.presentacion.limites) !== v(despues.presentacion.limites) && despues.presentacion.limites)
      rep(/(Límites:\s*)([^)\n]*)(\))/i, (m, a, x, c) => a + despues.presentacion.limites + c, 'Límites');
    for (const at of S.atributos) {
      if (num(antes.atributos[at]) === num(despues.atributos[at])) continue;
      const re = new RegExp(`(→\\s*${escRe(at)}\\s*:${CLOSE}[ \\t]*${OPEN})([+-]?\\d*)`, 'i');
      // con «+» como el PAM antiguo, salvo si la ficha lo escribía sin él
      if (!rep(re, (m, pre, viejo) => pre + (/^\d/.test(viejo) ? '' : '+') + num(despues.atributos[at]), at)) manual.push(`Atributo ${at}: no lo encontré`);
    }
    const LV = '(?:Desentrenad[oa]|Novat[oa]|Competente|Expert[oa]|Maestr[oa]|Legendari[oa])\\s*\\(\\+\\d+\\)(?:\\s*\\/[^\\n]*)?';
    for (const h of S.listaHabilidades.filter(x => !x.multiple)) {
      if (num(antes.habilidades[h.nombre]) === num(despues.habilidades[h.nombre])) continue;
      const nombres = [h.enFicha, h.nombre].filter(Boolean).map(escRe).join('|');
      const re = new RegExp(`(→\\s*(?:${nombres})\\s*:${CLOSE}[ \\t]*${OPEN})(${LV})`, 'i');
      if (!rep(re, (m, pre) => pre + SKILL_LV[num(despues.habilidades[h.nombre])], S.nombreHabilidad(h, 'ficha'))) manual.push(`Habilidad ${S.nombreHabilidad(h, 'ficha')}: no la encontré`);
    }
    for (const x of despues.artes) {
      const old = antes.artes.find(y => norm(y.nombre) === norm(x.nombre));
      if (old && num(old.nivel) === num(x.nivel)) continue;
      const re = new RegExp(`(→\\s*(?:Arte\\s*\\/\\s*Artesanía\\s*\\(\\s*)?${escRe(x.nombre)}\\s*\\)?\\s*:${CLOSE}[ \\t]*${OPEN})(${LV})`, 'i');
      if (!rep(re, (m, pre) => pre + SKILL_LV[num(x.nivel)], `Arte/Artesanía (${x.nombre})`)) manual.push(`Arte/Artesanía ${x.nombre}: añádela a mano (${SKILL_LV[num(x.nivel)]})`);
    }
    for (const x of antes.artes) if (!despues.artes.some(y => norm(y.nombre) === norm(x.nombre))) manual.push(`Arte/Artesanía ${x.nombre}: la quitaste; bórrala a mano`);
    // combate y puntos: se recalculan si cambió algo de lo que los compone
    const op = { warlock: null, compendio: this.compendio };
    const cB = combate(antes, S, op), cC = combate(despues, S, op), pB = puntos(antes, { compendio: this.compendio }), pC = puntos(despues, { compendio: this.compendio });
    const forzar = !!(despues.plantilla && despues.plantilla.forzarCombate);
    const comb = [['Iniciativa', 'ini'], ['Ataque Físico', 'atkF'], ['Lucha Física', 'luchaF'], ['Ataque Mágico', 'atkM'], ['Lucha Mágica', 'luchaM'], ['Defensa', 'def'], ['PAs', 'pa'], ['Umbral de heridas', 'umbral'], ['Heridas', 'heridas']]
      .map(([l, k]) => [l, `${cC.t[k]} = [b]${cC[k]}[/b]`, cB.t[k] !== cC.t[k]]);
    const postC = orden.find(p => /▋\s*Combate/i.test(textos.get(p)));
    if (postC != null) {
      const code = textos.get(postC), ci = code.search(/▋\s*Combate/i);
      let tail = code.slice(ci);
      for (const [l, val, cambio] of comb) {
        if (!cambio && !forzar) continue;
        const re = new RegExp(`(→\\s*${escRe(l)}\\s*:${CLOSE}[ \\t]*)([^\\n<]*)`, 'i');
        let n = 0; tail = tail.replace(re, (m, pre) => { n++; return pre + val; });
        if (n) hechos.push(`Combate: ${l}`); else manual.push(`Combate ${l}: no lo encontré (${val.replace(/\[\/?b\]/g, '')})`);
      }
      textos.set(postC, code.slice(0, ci) + tail);
    } else if (comb.some(x => x[2]) || forzar) manual.push('Combate: no encontré el bloque «▋ Combate» para recalcularlo');
    if (forzar || pB.pp !== pC.pp || pB.ppTxt !== pC.ppTxt) rep(/(▋\s*Puntos de Pociones\s*:(?:\s*(?:\[\/color\]|<\/span>|<\/b>))*[ \t]*)([^\n<]*)/i, (m, pre) => pre + `${pC.ppTxt} = [b]${pC.pp}[/b]`, 'Puntos de Pociones');
    if (forzar || pB.pr !== pC.pr || pB.prTxt !== pC.prTxt) rep(/(▋\s*Puntos de Rituales\s*:(?:\s*(?:\[\/color\]|<\/span>|<\/b>))*[ \t]*)([^\n<]*)/i, (m, pre) => pre + `${pC.prTxt} = [b]${pC.pr}[/b]`, 'Puntos de Rituales');
    if (num(antes.presentacion.pd) !== num(despues.presentacion.pd)) rep(/(▋\s*Puntos de Destino\s*:(?:\s*(?:\[\/color\]|<\/span>|<\/b>))*[ \t]*)(?:\[b\])?\d+(?:\[\/b\])?/i, (m, pre) => pre + `[b]${num(despues.presentacion.pd)}[/b]`, 'Puntos de Destino');
  }
}

/** Junta el texto nuevo con el código viejo línea a línea: las líneas que no cambiaron conservan sus enlaces, colores e imágenes. (Del PAM antiguo.) */
export function mezclarLineas(seg, nuevo) {
  const plain = s => String(s || '').replace(/\[[^\]]*\]/g, '').replace(/<[^>]*>/g, '').trim();
  const nk = s => norm(plain(String(s).replace(/\[img[^\]]*\][\s\S]*?\[\/img\]/gi, '').replace(/<img[^>]*>/gi, ''))).replace(/\s+/g, ' ');
  const O = seg.split('\n'), N = nuevo.split('\n').filter(l => l.trim());
  const oi = O.map((l, i) => ({ l, i, k: nk(l) })).filter(x => x.k), nkN = N.map(nk);
  const n = oi.length, m = N.length, L = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = oi[i].k === nkN[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const match = new Map(); let i = 0, j = 0;
  while (i < n && j < m) { if (oi[i].k === nkN[j]) { match.set(oi[i].i, j); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++; }
  const out = []; let nj = 0;
  O.forEach((l, idx) => {
    const k = nk(l);
    if (!k) { out.push(l); return; }
    if (match.has(idx)) { const jj = match.get(idx); while (nj < jj) out.push(N[nj++]); out.push(l); nj = jj + 1; }
  });
  const tailBlank = []; while (out.length && !out[out.length - 1].trim()) tailBlank.unshift(out.pop());
  while (nj < m) out.push(N[nj++]);
  return out.concat(tailBlank).join('\n');
}
