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
