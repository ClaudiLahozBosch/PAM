// El Profeta y la Lista de Roleos Oficiales inventados, para comparar la Biblioteca de oficiales antigua y la de PAM.
// Sucesos libres, en curso, terminados, abandonados, uno con discrepancia (la lista dice abierto y está terminado),
// uno que solo se encuentra por el título y un rol de la lista sin suceso.

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const post = (id, autor, fecha, html) => `<div class="post" id="p${id}"><p class="author">por <a href="/u${id % 97}">${esc(autor)}</a> ${fecha}</p><div class="content clearfix">${html}</div></div>`;
const pagina = (titulo, cuerpo, extra = '') => `<!doctype html><html><body><h1 class="page-title">${esc(titulo)}</h1>${extra}${cuerpo}</body></html>`;
const suceso = (fecha, titulo, texto) => `<div style="text-align:center"><span>${fecha}</span><br><b>${titulo}</b><br><span>${texto}</span></div>`;

/** @returns {Record<string, string>} ruta → HTML */
export function profetaDePrueba() {
  const P = {};
  P['/f45-diario-el-profeta'] = pagina('Diario El Profeta', `<table>
<tr><td><a class="topictitle" href="/t901-el-profeta-edicion-3">El Profeta · Edición 3</a></td></tr>
<tr><td><a class="topictitle" href="/t902-el-profeta-edicion-2">El Profeta · Edición 2</a></td></tr>
<tr><td><a class="topictitle" href="/t950-normas-del-diario">Normas del diario</a></td></tr>
</table>`, '<a href="/f45p50-diario-el-profeta">2</a>');
  P['/f45p50-diario-el-profeta'] = pagina('Diario El Profeta', '<table><tr><td><a class="topictitle" href="/t903-el-profeta-edicion-1">El Profeta · Edición 1</a></td></tr></table>');
  // edición 3, con dos páginas
  P['/t901-el-profeta-edicion-3'] = pagina('El Profeta · Edición 3', [
    post(9500, 'Redacción', 'Lun 2 Nov 2026 - 10:00', 'Bienvenidos a una nueva edición de El Profeta.'),
    post(9501, 'Redacción', 'Lun 2 Nov 2026 - 10:05', suceso('12 de octubre de 2026', 'El robo del banco', 'Alguien vació una cámara de Gringotts.')),
    post(9502, 'Redacción', 'Lun 2 Nov 2026 - 10:10', suceso('3 octubre 2026', 'Niebla en el muelle', 'La niebla no se levanta desde hace días.')),
    post(9503, 'Redacción', 'Lun 2 Nov 2026 - 10:15', '<b>Duendes en la biblioteca</b><br>Los libros cambian de sitio solos.')
  ].join('\n'), '<a href="/t901p15-el-profeta-edicion-3">2</a>');
  P['/t901p15-el-profeta-edicion-3'] = pagina('El Profeta · Edición 3', post(9504, 'Redacción', 'Lun 2 Nov 2026 - 10:20', suceso('1 de octubre de 2026', 'La boda de los Lestrange', 'Una boda con invitados inesperados.')));
  P['/t902-el-profeta-edicion-2'] = pagina('El Profeta · Edición 2', [
    post(9600, 'Redacción', 'Jue 1 Oct 2026 - 10:00', 'Edición de octubre.'),
    post(9601, 'Redacción', 'Jue 1 Oct 2026 - 10:05', suceso('20 de septiembre de 2026', 'El dragón de Gales', 'Un dragón sobrevuela el valle.')),
    post(9602, 'Redacción', 'Jue 1 Oct 2026 - 10:10', suceso('15 de septiembre de 2026', 'Cartas sin remitente', 'Llegan cartas en blanco a medio Londres.'))
  ].join('\n'));
  P['/t903-el-profeta-edicion-1'] = pagina('El Profeta · Edición 1', [
    post(9700, 'Redacción', 'Mar 1 Sep 2026 - 10:00', 'Primera edición.'),
    post(9701, 'Redacción', 'Mar 1 Sep 2026 - 10:05', suceso('30 de agosto de 2026', 'El tren fantasma', 'Un tren que nadie conduce.'))
  ].join('\n'));
  // la lista: abiertos, cerrados sin terminar y terminados
  const item = (rol, titulo, pjs, prof, suc) => `• <a href="${rol}">${titulo}</a> // ${pjs} // ${prof ? `<a href="${prof}">${suc}</a>` : suc}<br>`;
  P['/t26725-lista-de-roleos-oficiales'] = pagina('Lista de Roleos Oficiales', [
    post(9800, 'Tramas', 'Lun 2 Nov 2026 - 09:00', '<b>Oficiales abiertos</b><br>' +
      item('/t800-oficial-el-robo', 'El robo', 'Irvin Giles, Bruno Ketch', '/t901-el-profeta-edicion-3#9501', 'El robo del banco') +
      item('/t820-oficial-el-dragon', 'Tras el dragón', 'Bruno Ketch', '', 'El dragón de Gales') +
      item('/t840-oficial-cartas', 'Cartas', 'Ofelia Marsh', '/t902-el-profeta-edicion-2#9602', 'Cartas sin remitente')),
    post(9801, 'Tramas', 'Lun 2 Nov 2026 - 09:01', '<b>Oficiales cerrados sin terminar</b><br>' +
      item('/t830-oficial-el-tren', 'El tren', 'Cora Blest', '/t903-el-profeta-edicion-1#9701', 'El tren fantasma')),
    post(9802, 'Tramas', 'Lun 2 Nov 2026 - 09:02', '<b>Oficiales terminados</b><br>' +
      item('/t810-oficial-la-boda', 'La boda', 'Irvin Giles, Bruno Ketch', '/t901p15-el-profeta-edicion-3#9504', 'La boda de los Lestrange') +
      item('/t860-oficial-perdido', 'Un oficial perdido', 'Nadie Nunca', '', 'Un suceso que no está en El Profeta'))
  ].join('\n'));
  // estado real de los roles
  const rolPagina = (tid, titulo, posts) => pagina(titulo, posts.map(([id, autor, fecha, html]) => post(id, autor, fecha, html)).join('\n'));
  P['/t820-oficial-el-dragon'] = rolPagina(820, 'Tras el dragón', [
    [9900, 'Tramas', 'Lun 21 Sep 2026 - 10:00', 'Se abre.'],
    [9901, 'Bruno Ketch', 'Mar 22 Sep 2026 - 10:00', 'Sigo las huellas.'],
    [9902, 'Tramas', 'Jue 1 Oct 2026 - 10:00', 'Ficha final de la aventura<br>Cómo se ha terminado: Con éxito, el dragón volvió a su reserva.<br>-----<br>Recompensas: 60 grageas']]);
  P['/t840-oficial-cartas'] = rolPagina(840, 'Cartas', [
    [9910, 'Tramas', 'Mié 16 Sep 2026 - 10:00', 'Se abre.'],
    [9911, 'Ofelia Marsh', 'Jue 1 Oct 2026 - 18:30', 'Abro una carta.']]);
  P['/t830-oficial-el-tren'] = rolPagina(830, 'El tren', [
    [9920, 'Tramas', 'Lun 31 Ago 2026 - 10:00', 'Se abre.'],
    [9921, 'Tramas', 'Lun 28 Sep 2026 - 10:00', 'Ficha final de la aventura<br>Cómo se ha terminado: No se terminó por inactividad.']]);
  P['/t860-oficial-perdido'] = rolPagina(860, 'Un oficial perdido', [[9930, 'Nadie Nunca', 'Lun 1 Jun 2026 - 10:00', 'Hola.']]);
  return P;
}
