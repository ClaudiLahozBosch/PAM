// Un foro inventado para comparar los canjes de Mi PJ antiguo y de PAM: el Registro de Canjes con peticiones y
// respuestas, los grupos de Inspectores, y el perfil, la ficha y la bóveda de la cuenta de prueba (Irvin Giles).
// Todos los demás personajes son inventados.

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
export const U = { 'Irvin Giles': 5203, 'Cora Blest': 31, 'Bruno Ketch': 77, 'Ofelia Marsh': 12, 'Lia Fenn': 45 };

/** Un tema: título, mensajes [id, autor, fecha, html] y paginación. */
function tema(tid, slug, titulo, posts, paginas = []) {
  const pag = paginas.map(o => `<a href="/t${tid}p${o}-${slug}">${o / 15 + 1}</a>`).join(' ');
  return `<!doctype html><html><body><h1 class="page-title"><a href="/t${tid}-${slug}">${esc(titulo)}</a></h1><div class="pagination">${pag}</div>
${posts.map(([id, autor, fecha, html]) => `<div class="post" id="p${id}"><p class="author">por <a href="/u${U[autor] ?? 99}">${esc(autor)}</a> ${fecha}</p><div class="content">${html}</div></div>`).join('\n')}
</body></html>`;
}
/** La página «editar mensaje» de un mensaje (con su número, como el formulario del foro). */
export const editar = (bb, p = '') => `<html><body><form name="post" action="/post" method="post"><textarea name="message">${esc(bb)}</textarea><input type="hidden" name="mode" value="editpost"><input type="hidden" name="p" value="${p}"></form></body></html>`;
/** Un mensaje en la página de un tema (para añadirlo al publicar). */
export const mensaje = (id, autor, fecha, html) => `<div class="post" id="p${id}"><p class="author">por <a href="/u${U[autor] ?? 99}">${esc(autor)}</a> ${fecha}</p><div class="content">${html}</div></div>`;

/** El BBCode de la petición de Irvin que ya está publicada (la 9630, entre sus tres últimos mensajes del registro). */
export const BB_PUBLICADA = '[b]Petición de canje[/b] — Irvin Giles\nBóveda: [url=https://hp-avada-kedavra.foroactivo.com/t301-]Bóveda de Irvin Giles[/url]\nGrageas actuales: 3.000 · Coste: 500 · Quedarían: 2.500\n\nESTADÍSTICAS\nVigor: 2 → 3 — 400 grageas';

/** @returns {Record<string, string>} ruta → HTML */
export function registroDePrueba() {
  const P = {};
  P['/profile?mode=editprofile&page_profil=informations'] = '<html><body><form><input name="profile_field_3_-10" value="/t300-ficha-de-irvin-giles"><input name="profile_field_3_24" value="https://hp-avada-kedavra.foroactivo.com/t301-boveda-de-irvin-giles#9811"></form></body></html>';
  P['/t300-ficha-de-irvin-giles'] = tema(300, 'ficha-de-irvin-giles', 'Ficha de Irvin Giles', [
    [9800, 'Irvin Giles', 'Lun 2 Mar 2026 - 10:00', 'Nombre y Apellido: Irvin Giles<br>Edad: 30']]);
  P['/post?p=9800&mode=editpost'] = editar('Nombre y Apellido: Irvin Giles\nEdad: 30', 9800);
  P['/t301-boveda-de-irvin-giles'] = tema(301, 'boveda-de-irvin-giles', 'Bóveda de Irvin Giles', [
    [9810, 'Irvin Giles', 'Lun 2 Mar 2026 - 10:05', 'Grageas Iniciales: 1.000<br>Grageas Totales: 5.000<br>Grageas Actuales: 2.000'],
    [9811, 'Irvin Giles', 'Dom 1 Nov 2026 - 10:00', 'Grageas actuales: 2.000<br>+500 por el sueldo<br>Grageas restantes: 2.500<br>Grageas totales: 5.500']]);
  P['/post?p=9810&mode=editpost'] = editar('[b]Grageas Iniciales:[/b] 1.000\n[b]Grageas Totales:[/b] 5.000\n[b]Grageas Actuales:[/b] 2.000', 9810);
  P['/post?t=301&mode=reply'] = '<html><body><form name="post" action="/post" method="post"><textarea name="message"></textarea><input type="hidden" name="mode" value="reply"><input type="hidden" name="t" value="301"></form></body></html>';
  P['/post?t=300&mode=reply'] = '<html><body><form name="post" action="/post" method="post"><textarea name="message"></textarea><input type="hidden" name="mode" value="reply"><input type="hidden" name="t" value="300"></form></body></html>';

  // El registro: dos páginas. En la primera, una petición antigua; en la segunda, las de ahora y sus respuestas.
  P['/t34430-registro-de-canjes'] = tema(34430, 'registro-de-canjes', 'Registro de Canjes', [
    [9500, 'Cora Blest', 'Jue 1 Ene 2026 - 10:00', 'Aquí se piden los canjes.'],
    [9501, 'Bruno Ketch', 'Vie 2 Ene 2026 - 10:00', 'Petición de canje — Bruno Ketch'],
    [9502, 'Cora Blest', 'Vie 2 Ene 2026 - 12:00', 'Bruno: son correctos.']], [15]);
  P['/t34430p15-registro-de-canjes'] = tema(34430, 'registro-de-canjes', 'Registro de Canjes', [
    // A: aprobada por un Inspector que te nombra → confirmada sola
    [9600, 'Irvin Giles', 'Lun 2 Nov 2026 - 10:00', '<b>Petición de canje</b> — Irvin Giles<br>Coste: 500'],
    [9601, 'Bruno Ketch', 'Lun 2 Nov 2026 - 11:00', 'Petición de canje — Bruno Ketch'],
    [9602, 'Lia Fenn', 'Lun 2 Nov 2026 - 11:30', 'Irvin, qué buen canje.'],
    [9603, 'Cora Blest', 'Lun 2 Nov 2026 - 12:00', 'Irvin Giles: los canjes son correctos, puedes añadirlos a tu ficha.'],
    // B: la primera respuesta de un Inspector no te nombra → se pregunta
    [9610, 'Irvin Giles', 'Lun 2 Nov 2026 - 13:00', 'Petición de canje — Irvin Giles<br>Coste: 300'],
    [9611, 'Cora Blest', 'Lun 2 Nov 2026 - 14:00', 'Revisado, sumá un total de 350 grageas.'],
    // C: corregida (otro importe) y te nombra
    [9620, 'Irvin Giles', 'Lun 2 Nov 2026 - 15:00', 'Petición de canje — Irvin Giles<br>Coste: 200'],
    [9621, 'Ofelia Marsh', 'Lun 2 Nov 2026 - 16:00', 'Irvin: la suma correcta es de 250 grageas.'],
    // D: sin respuesta
    [9630, 'Irvin Giles', 'Lun 2 Nov 2026 - 17:00', 'Petición de canje — Irvin Giles<br>Coste: 100']], [15]);
  P['/post?p=9600&mode=editpost'] = editar('Petición de canje — Irvin Giles\nCoste: 500');
  P['/post?p=9610&mode=editpost'] = editar('Petición de canje — Irvin Giles\nCoste: 300');
  P['/post?p=9620&mode=editpost'] = editar('Petición de canje — Irvin Giles\nCoste: 200');
  P['/post?p=9630&mode=editpost'] = editar(BB_PUBLICADA);
  P['/post?t=34430&mode=reply'] = '<html><body><form name="post" action="/post" method="post"><textarea name="message"></textarea><input type="hidden" name="mode" value="reply"><input type="hidden" name="t" value="34430"></form></body></html>';

  // Los grupos: Cora y Ofelia son Inspectoras de Canjes (Lia sale en «conectados», que no cuenta)
  const grupo = (miembros, conectados = []) => `<html><body><div id="main-content"><table>${miembros.map(n => `<tr><td><a href="/u${U[n]}">${esc(n)}</a></td></tr>`).join('')}</table>
<div id="whosonline">${conectados.map(n => `<a href="/u${U[n]}">${esc(n)}</a>`).join('')}</div></div></body></html>`;
  P['/g121-inspectores-de-canjes'] = grupo(['Cora Blest', 'Ofelia Marsh'], ['Lia Fenn']);
  P['/g28-personal-de-gringotts'] = grupo(['Bruno Ketch']);
  P['/g81-inspectores-de-aventuras'] = grupo([]);
  return P;
}

/** Las peticiones guardadas de la cuenta antes de leer el registro (A–D y una que ya no está en el registro). */
export function peticionesGuardadas() {
  const p = (post, gastadas) => ({ post: String(post), enlace: 'https://hp-avada-kedavra.foroactivo.com/viewtopic?p=' + post + '#' + post, creado: '2026-11-02T09:00:00.000Z', fecha: '', pj: 'Irvin Giles', gastadas, estado: 'esperando', aprobacion: null, descartadas: [], ficha: { codigo: 'nuevo', base: 'viejo' }, boveda: null });
  return [p(1234, 50), p(9600, 500), p(9610, 300), p(9620, 200), p(9630, 100)];
}

/** La petición que dejó PAM al «Preparar el canje». */
export const PETICION_PAM = {
  v: 1, creado: '2026-11-03T10:00:00.000Z', foro: 'hp-avada-kedavra.foroactivo.com', cuenta: { id: 5203, nombre: 'Irvin Giles' },
  pj: 'Irvin Giles', texto: 'ESTADÍSTICAS\nCarisma: 1 → 2 — 300 grageas\n\nTotal: 300 grageas', disponibles: '2.400', gastadas: '300', restantes: '2.100',
  ficha: { codigo: 'ficha nueva', base: 'ficha vieja', hechos: 'Carisma', manual: [] }, boveda: { numeros: { iniciales: 2500, actuales: 2200, totales: 5500 }, html: '{Enlaces»', divisor: '✦' }
};
