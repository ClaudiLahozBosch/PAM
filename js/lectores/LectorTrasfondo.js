// @ts-check
// Lee una línea de trasfondo de la ficha. Admite las formas que ya leía el PAM antiguo y las que no
// (auditoría F02), por ejemplo:
//   «Biblioteca V: Arcanismo.»                         nivel antes de la categoría
//   «Biblioteca VI: Arcanismo > Artes Oscuras.»        con específico
//   «Informantes III: Contrabandistas (Zacharias Hayes).»  específico + identidad; la categoría sale del encabezado o de la lista
//   «Influencia V (Zacharias Hayes):»                  identidad sin categoría: la da el encabezado
//   «Influencia II: Gobierno Mágico de los Estados Unidos / MACUSA.»  el «/» es parte del nombre
//   «Biblioteca — Medicina — Heridas mágicas III: nota», «IV Biblioteca — Medicina», «Biblioteca Medicina IV»…
// Si no se entiende, devuelve null y quien llama guarda la línea para revisarla (nunca «nivel 0»).
import { norm, deRomano } from '../core/texto.js?v=0.6.2';
import { Trasfondo } from '../modelos/Trasfondo.js?v=0.6.2';

const TIPOS = ['Biblioteca', 'Influencia', 'Informantes', 'Seguidores'];
const NIVEL = '(VI|V|IV|I{1,3}|[1-6])';
/** Más de seis palabras o con comas: es una frase, no el nombre de una categoría. */
const esFrase = s => /,/.test(s) || String(s).trim().split(/\s+/).length > 6;
const SEP = /\s*(?:>|›|—|–|·|\s-\s)\s*/; // separadores de categoría y específico (el «/» NO: va dentro de nombres)

export class LectorTrasfondo {
  /** @param {import('../datos/Sistema.js').Sistema} sistema */
  constructor(sistema) { this.sistema = sistema; }

  /**
   * @param {string} linea línea ya limpia (sin BBCode ni viñeta)
   * @param {{ tipo?: string, categoria?: string, origen?: {tema?: number|null, post?: number|null} }} [contexto]
   *        tipo y categoría de los encabezados bajo los que está la línea
   * @returns {Trasfondo|null}
   */
  leer(linea, contexto = {}) {
    const original = String(linea ?? '').trim();
    let l = original.replace(/^trasfondos?\s*(?:generales?|espec[ií]ficos?)?\s*[:—–\-]?\s*/i, '').replace(/[.;]\s*$/, '').trim();
    if (!l) return null;

    // Nivel delante del tipo: «IV Biblioteca — Medicina»
    let nivelPrevio = null;
    const pre = l.match(new RegExp(`^\\(?${NIVEL}\\)?\\s*[—–\\-:.]?\\s+(?=${TIPOS.join('|')})`, 'i'));
    if (pre) { nivelPrevio = deRomano(pre[1]); l = l.slice(pre[0].length); }

    let tipo = null, resto = l;
    const mt = l.match(new RegExp(`^(${TIPOS.join('|')})\\b\\s*(.*)$`, 'i'));
    if (mt) { tipo = TIPOS.find(t => norm(t) === norm(mt[1])); resto = mt[2]; }
    else if (contexto.tipo) tipo = contexto.tipo; // bajo un encabezado BIBLIOTECA, INFORMANTES…
    else return null;
    if (!tipo) return null;

    const r = this.#formaNivelPrimero(tipo, resto, contexto) ?? this.#formaNivelDespues(tipo, resto, nivelPrevio, contexto);
    if (!r) return null;
    return new Trasfondo({ ...r, tipo, origen: contexto.origen, textoOriginal: original, estadoLectura: r.estadoLectura });
  }

  /** «Tipo NIVEL[ (identidad)]: resto» — la forma de la ficha de Irvin. */
  #formaNivelPrimero(tipo, resto, ctx) {
    // «Tipo NIVEL: …», «Tipo NIVEL (identidad): …» y también «Tipo NIVEL (identidad). …»
    const m = resto.match(new RegExp(`^\\s*${NIVEL}\\b\\s*(?:\\(([^)]*)\\)\\s*[:.]|\\s*:)\\s*(.*)$`, 'i'));
    if (!m) return null;
    const nivel = deRomano(m[1]);
    let identidad = (m[2] || '').trim();
    const identidadDelante = !!identidad;
    const cuerpo = m[3].trim();
    // «Arcanismo. El verdadero hombre…» (o «Negocios.Un Ministro…», sin espacio): el nombre llega hasta
    // el primer punto; lo demás es la descripción
    const corte = cuerpo.match(/^(.*?[^.\s])\.(?:\s+|(?=[A-ZÁÉÍÓÚÑ¿¡"«]))(\S[\s\S]*)$/);
    let nombre = corte ? corte[1] : cuerpo;
    const nota = corte ? corte[2].trim() : '';
    const finIdentidad = nombre.match(/^(.*?)\s*\(([^()]+)\)\s*$/);
    if (finIdentidad && deRomano(finIdentidad[2]) == null) { nombre = finIdentidad[1].trim(); identidad = identidad || finIdentidad[2].trim(); }
    const cats = this.#categorias(tipo, nombre, ctx);
    // «Influencia V: Irvin Giles ya no necesita ocupar el cargo…» o «Seguidores VI (Zacharias Hayes): Hay
    // organizaciones…»: no es un nombre, es la descripción (la categoría la da el encabezado)
    if (cats.estadoLectura === 'revisar' && (esFrase(nombre) || identidadDelante)) return { nivel, identidad, ...this.#categorias(tipo, '', ctx), nota: cuerpo };
    return { nivel, identidad, ...cats, nota };
  }

  /** Formas del PAM antiguo: el nivel va al final del nombre, o al principio de la nota. */
  #formaNivelDespues(tipo, resto, nivelPrevio, ctx) {
    let r = resto.replace(/^\s*(?:—|–|-|:|·|>)?\s*/, '');
    const ci = r.indexOf(':');
    let nombre = ci >= 0 ? r.slice(0, ci) : r, nota = ci >= 0 ? r.slice(ci + 1).trim() : '', nivel = null;
    const alFinal = nombre.match(new RegExp(`(?:\\s+|\\s*[—–\\-,(]\\s*)\\(?\\s*(?:nivel|niv\\.?|nv\\.?|lv\\.?)?\\s*${NIVEL}\\s*\\)?\\s*\\.?\\s*$`, 'i'));
    if (alFinal && alFinal.index > 0) { nivel = deRomano(alFinal[1]); nombre = nombre.slice(0, alFinal.index); }
    else if (nota) {
      const x = nota.match(new RegExp(`^\\(?\\s*(?:nivel|niv\\.?|nv\\.?|lv\\.?)?\\s*${NIVEL}\\s*\\)?(?=$|[\\s.:,;—–\\-])\\s*[.:,;—–\\-]*\\s*`, 'i'));
      if (x) { nivel = deRomano(x[1]); nota = nota.slice(x[0].length).trim(); }
    }
    nivel = nivel ?? nivelPrevio;
    if (!nivel) return null;
    nombre = nombre.replace(/^(?:de|del|de la)\s+/i, '').trim();
    let identidad = '';
    const id = nombre.match(/^(.*?)\s*\(([^()]+)\)\s*$/);
    if (id && deRomano(id[2]) == null) { nombre = id[1].trim(); identidad = id[2].trim(); }
    if (!nombre && !identidad && !ctx.categoria) return null;
    return { nivel, identidad, ...this.#categorias(tipo, nombre, ctx), nota: nota.replace(/^[—–\-\s]+/, '').trim() };
  }

  /**
   * Reparte «Arcanismo > Artes oscuras», «Bajos fondos Ladrones», «Contrabandistas»… en categoría y específico,
   * con la lista oficial y el encabezado. Lo que no está en la lista se conserva tal cual y se marca para revisar.
   */
  #categorias(tipo, texto, ctx) {
    const C = this.sistema.categoriasTrasfondo(tipo), cats = Object.keys(C);
    const oficial = s => this.sistema.nombreOficialTrasfondo(s, tipo);
    let partes = String(texto).split(SEP).map(s => s.replace(/^(?:de|del|de la)\s+/i, '').trim()).filter(Boolean);
    // «Bajos fondos Ladrones» sin separador
    if (partes.length === 1) {
      const c = cats.filter(k => norm(partes[0]).startsWith(norm(k) + ' ')).sort((a, b) => b.length - a.length)[0];
      if (c) partes = [c, partes[0].slice(c.length).trim().replace(/^(?:de|del)\s+/i, '')];
    }
    const ctxCat = ctx.categoria ? cats.find(k => norm(k) === norm(ctx.categoria)) ?? null : null;
    if (!partes.length) return { categoria: ctxCat ?? '', especifico: '', estadoLectura: ctxCat ? 'reconocido' : 'revisar' };

    const [p0, ...pr] = partes;
    const esCat = cats.find(k => norm(k) === norm(p0));
    if (esCat) {
      const e = pr.join(' > ');
      return { categoria: esCat, especifico: e ? this.#especifico(C[esCat], e) : '', estadoLectura: !e || this.#esOficial(C[esCat], e) ? 'reconocido' : 'revisar' };
    }
    // El primer trozo es un específico: su categoría, la del encabezado o la única de la lista que lo tiene
    const enCtx = ctxCat && this.#esOficial(C[ctxCat], p0) ? ctxCat : null;
    const deLista = cats.filter(k => this.#esOficial(C[k], p0));
    const cat = enCtx ?? (deLista.length === 1 ? deLista[0] : ctxCat);
    const e = [p0, ...pr].join(' > ');
    if (cat) return { categoria: cat, especifico: this.#especifico(C[cat], e), estadoLectura: this.#esOficial(C[cat], p0) ? 'reconocido' : 'revisar' };
    return { categoria: oficial(p0) ?? p0, especifico: pr.join(' > '), estadoLectura: 'revisar' };
  }

  /** El nombre oficial si está en la lista; si es una plantilla («Gobierno mágico de (X país)»), lo escrito. */
  #especifico(lista, texto) {
    const exacto = lista.find(s => norm(s) === norm(texto));
    return exacto ?? texto.trim();
  }

  #esOficial(lista, texto) {
    const n = norm(texto);
    return lista.some(s => norm(s) === n || (/\(x [^)]*\)|\[x [^\]]*\]/i.test(s) && n.startsWith(norm(s.replace(/\s*[([]x [^)\]]*[)\]].*$/i, '')) + ' ')));
  }
}
