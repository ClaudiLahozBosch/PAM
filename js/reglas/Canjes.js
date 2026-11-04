// @ts-check
// Las reglas de los canjes en el foro (pam-mi-pj.user.js 1.7.1, crearCanjes), tal cual: el texto de la petición
// para el Registro de Canjes, qué dice la respuesta de un revisor y los números con puntos de miles.
// Aquí no se lee ni se escribe nada: eso está en js/servicios/CanjesDelForo.js.

/** «1.325 gr» → 1325 (solo las cifras y el signo); sin cifras, NaN. */
export function numero(txt) {
  const limpio = String(txt == null ? '' : txt).replace(/[^\d-]/g, '');
  if (limpio === '' || limpio === '-') return NaN;
  return parseInt(limpio, 10);
}

/** 1325 → «1.325»; lo que no es número, «—». */
export function formato(n) {
  if (typeof n !== 'number' || isNaN(n)) return '—';
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export const esNumero = n => typeof n === 'number' && !isNaN(n);

/** Sin tildes, espacios juntos, en minúsculas (la de los canjes: no quita la puntuación final). */
export function normNombre(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

/** ¿El mismo texto? (sin fijarse en los saltos de Windows ni en los espacios al final de las líneas) */
export function mismoTexto(a, b) {
  const n = s => String(s == null ? '' : s).replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, '').trim();
  return n(a) === n(b);
}

/** Enlace a un mensaje del foro. @param {string} origen «https://foro» */
export const enlacePost = (origen, idPost) => origen + '/viewtopic?p=' + idPost + '#' + idPost;

/** «/t34430-registro-de-canjes» → «34430». */
export const temaNumero = url => (String(url || '').match(/\/t(\d+)/) || [])[1] || null;

/**
 * La petición preparada en PAM para este foro y esta cuenta (o null): la que PAM dejó en «pam.peticion» y no se usó.
 * @param {any} p @param {string} foroHost @param {{ id: number }} cuenta
 */
export function peticionCapturada(p, foroHost, cuenta) {
  if (!p || p.usado || p.foro !== foroHost) return null;
  if (p.cuenta && p.cuenta.id !== cuenta.id) return null;
  return p;
}

/**
 * El mensaje de la petición: la cabecera (personaje, bóveda y grageas) y el texto que armó PAM.
 * @param {any} pet @param {{ url: string, titulo?: string } | null} boveda con la dirección completa
 */
export function textoPeticion(pet, boveda) {
  let cab = '[b]Petición de canje[/b] — ' + pet.pj + '\n';
  if (boveda) cab += 'Bóveda: [url=' + boveda.url + ']' + (boveda.titulo || 'Bóveda') + '[/url]\n';
  cab += 'Grageas actuales: ' + formato(numero(pet.disponibles)) + ' · Coste: ' + formato(numero(pet.gastadas)) + ' · Quedarían: ' + formato(numero(pet.restantes)) + '\n';
  return cab + '\n' + pet.texto.trim();
}

/**
 * Lo que conviene revisar antes de publicar la petición.
 * @param {any} pet @param {{ actForo: number, nombreFicha: string }} foro grageas actuales de la bóveda del foro y nombre de la ficha
 */
export function avisosPeticion(pet, { actForo, nombreFicha }) {
  const avisos = [];
  if (esNumero(actForo) && numero(pet.disponibles) !== actForo) {
    avisos.push('Ojo: en PAM pusiste ' + formato(numero(pet.disponibles)) + ' grageas disponibles, pero tu bóveda del foro dice ' + formato(actForo) + '.');
  }
  if (numero(pet.restantes) < 0) {
    avisos.push('Ojo: según PAM te quedarían ' + formato(numero(pet.restantes)) + ' grageas: no te llegan para estos canjes.');
  }
  // F03: «Irvin Giles.» (con el punto de la ficha) es el mismo personaje que «Irvin Giles»
  const sinPunto = s => normNombre(s).replace(/[.,;:!¡?¿]+$/, '').trim();
  if (sinPunto(pet.pj) !== sinPunto(nombreFicha)) {
    avisos.push('Ojo: la petición es de «' + pet.pj + '» y tu ficha es de «' + nombreFicha + '».');
  }
  return avisos;
}

/** Lo que dice un revisor: aprobada, corregida (otro importe), revisar o dudosa. */
export function clasificarRespuesta(texto) {
  const t = normNombre(texto);
  const neg = /no son correct|no es correct|no esta correct|no estan correct|incorrect|denegad|rechazad|no se puede|no pueden|no podeis|te falta|os falta/.test(t);
  const pos = /son correct|es correct|esta correct|estan correct|pueden? anadir|podeis anadir|puedes anadir|aprobad|aceptad/.test(t);
  const m = t.match(/(?:suma correcta es de|dara un total de|total correcto es de|el total es de|un total de)\s*(\d[\d.\s]*\d|\d)/);
  const importe = m ? numero(m[1]) : null;
  if (neg && pos) return { clase: 'dudosa', importe };
  if (neg) return { clase: 'revisar', importe };
  if (importe) return { clase: 'corregida', importe };
  if (pos) return { clase: 'aprobada', importe: null };
  return { clase: 'dudosa', importe: null };
}

/** Cómo se enseña la respuesta en la tarjeta. */
export function describirAprobacion(a) {
  return a.clase === 'aprobada' ? 'Aprobada' : a.clase === 'corregida' ? 'Aprobada con otro importe: ' + formato(a.importe) : a.clase === 'revisar' ? 'Parece que hay algo que corregir' : 'Respuesta que no sé interpretar';
}

/* ---------------- aplicar el canje aprobado (fase 6b·3) ---------------- */

/** Dónde se guardan las peticiones de una cuenta en el almacén del agente (el agente solo acepta [\w.-] en las claves). */
export const claveCuenta = (foroHost, id) => 'pam.cuentas.' + String(foroHost).replace(/[^\w.-]/g, '_') + '.' + id;

/** Lo que se le pasa a PAM para cerrar el canje (enlaces y «Ya lo publiqué»). */
export function paqueteCierre(foroHost, cuenta, pet) {
  return {
    v: 2, creado: new Date().toISOString(), foro: foroHost,
    cuenta: { id: cuenta.id, nombre: cuenta.nombre, foro: foroHost },
    pj: pet.pj, peticion: pet.post,
    pet: pet.enlace, ace: pet.aprobacion.enlace, delta: '-' + pet.gastadas,
    actuales: pet.boveda ? pet.boveda.numeros.actuales : null
  };
}

/**
 * Cambia el número que sigue a una etiqueta («Grageas Actuales») en el BBCode, respetando si se escribía con
 * puntos de miles. Devuelve null si no lo encuentra.
 */
export function cambiarNumeroTras(bb, etiqueta, valor) {
  const lineas = String(bb).split('\n');
  const re = new RegExp(etiqueta.replace(/ /g, '\\s+'), 'i');
  for (let i = 0; i < lineas.length; i++) {
    const pos = lineas[i].search(re);
    if (pos === -1) continue;
    const antes = lineas[i].slice(0, pos), despues = lineas[i].slice(pos);
    // Primer número tras la etiqueta que no forme parte de un color (#7c623e) ni de una palabra.
    const m = despues.match(/(^|[^#\w])(\d{1,3}(?:[.,]\d{3})+|\d+)(?!\w)/);
    if (!m) return null;
    const viejo = m[2];
    const nuevoTxt = /[.,]/.test(viejo) ? formato(valor) : String(valor);
    const at = (m.index ?? 0) + m[1].length;
    lineas[i] = antes + despues.slice(0, at) + nuevoTxt + despues.slice(at + viejo.length);
    return { texto: lineas.join('\n'), antes: numero(viejo) };
  }
  return null;
}

// Etiquetas abiertas menos cerradas ([spoiler], <div>…). Si el código nuevo cambia este
// equilibrio respecto al original, algo se ha roto (p. ej. un [/spoiler] de más).
const ETIQUETAS_EQUILIBRIO = ['spoiler', 'div', 'center', 'table', 'tr', 'td', 'span', 'font', 'label', 'details', 'color', 'size', 'b', 'i', 'u', 'url', 'quote', 'list'];
function equilibrioEtiquetas(t) {
  const res = {};
  ETIQUETAS_EQUILIBRIO.forEach(tag => {
    const abre = (String(t).match(new RegExp('\\[' + tag + '(=[^\\]]*)?\\]|<' + tag + '(\\s[^>]*)?>', 'gi')) || []).length;
    const cierra = (String(t).match(new RegExp('\\[\\/' + tag + '\\]|<\\/' + tag + '>', 'gi')) || []).length;
    res[tag] = abre - cierra;
  });
  return res;
}
/** Las etiquetas que el código nuevo descuadra respecto al original («[spoiler]: 1 cierre(s) de más»). */
export function descuadres(original, nuevo) {
  const a = equilibrioEtiquetas(original), b = equilibrioEtiquetas(nuevo);
  return ETIQUETAS_EQUILIBRIO.filter(tag => a[tag] !== b[tag]).map(tag => {
    const dif = b[tag] - a[tag];
    return (/^(div|center|table|tr|td|span|font|label|details)$/.test(tag) ? '<' + tag + '>' : '[' + tag + ']') + ': ' + (dif > 0 ? dif + ' apertura(s) de más' : (-dif) + ' cierre(s) de más');
  });
}

/**
 * Añade los enlaces de la petición y de la aprobación a la línea «{Enlaces»» del código de PAM,
 * en el mismo orden y con el mismo divisor que usa PAM.
 */
export function codigoConEnlaces(html, enlacePet, enlaceAce, divisor) {
  const d = ' ' + (divisor || '✦') + ' ';
  const nuevos = '[url=' + enlacePet + ']Petición[/url]' + d + '[url=' + enlaceAce + ']Aceptación[/url]';
  let hecho = false;
  const t = String(html).replace(/(\{Enlaces»(?:<\/span>)?)[ \t]*([^\n<]*)/, (m, cab, resto) => {
    hecho = true;
    return cab + ' ' + nuevos + (resto.trim() ? d + resto.trim() : '');
  });
  return hecho ? t : null;
}
