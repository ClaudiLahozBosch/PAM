// Un foro inventado para comparar lo que leen Mi PJ antiguo y PAM: roles, misiones, sueldo y oficiales.
// Todos los personajes son inventados salvo la cuenta de prueba (Irvin Giles, la de los demás tests).
// Las fechas del sueldo dependen de hoy (el tema es «Sueldos de <mes anterior>»).

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const U = { 'Irvin Giles': 5203, 'Ofelia Marsh': 12, 'Bruno Ketch': 77, 'Cora Blest': 31, 'Tramas': 2, 'Dados Mágicos': 3 };

/** Un tema: título, mensajes [id, autor, fecha, texto con \n] y paginación opcional. */
function tema(tid, slug, titulo, posts, { paginas = [] } = {}) {
  const pag = paginas.map(o => `<a href="/t${tid}p${o}-${slug}">${o / 15 + 1}</a>`).join(' ');
  return `<!doctype html><html><body><h1 class="page-title"><a href="/t${tid}-${slug}">${esc(titulo)}</a></h1><div class="pagination">${pag}</div>
${posts.map(([id, autor, fecha, texto]) => `<div class="post" id="p${id}"><p class="author">por <a href="/u${U[autor] ?? 99}">${esc(autor)}</a> ${fecha}</p><div class="content">${esc(texto).replace(/\n/g, '<br>')}</div></div>`).join('\n')}
</body></html>`;
}
/** Una fila de «Mis temas» (/sta/u…): título, subforo y último mensaje. */
const fila = (tid, slug, titulo, fid, autor, fecha, post) =>
  `<tr><td><a class="topictitle" href="/t${tid}-${slug}">${esc(titulo)}</a></td><td class="span-tab"><a href="/f${fid}-sub">Sub</a></td>` +
  `<td class="lastpost"><a href="/t${tid}-${slug}#${post}">ir</a> ${fecha} <a href="/u${U[autor] ?? 99}">${esc(autor)}</a></td></tr>`;

/** @param {Date} hoy @returns {Record<string, string>} ruta → HTML */
export function foroDePrueba(hoy = new Date()) {
  const mesAnt = MESES[(hoy.getMonth() + 11) % 12];
  const P = {};
  P['/sta/u5203'] = `<html><body><table>
${fila(500, 'rol-en-la-taberna', 'Rol en la taberna', 40, 'Bruno Ketch', 'Lun 2 Nov 2026 - 10:00', 9010)}
${fila(510, 'el-muelle', 'El muelle', 40, 'Irvin Giles', 'Dom 1 Nov 2026 - 09:00', 9020)}
${fila(520, 'tirada-en-el-bosque', 'Tirada en el bosque', 40, 'Dados Mágicos', 'Sáb 31 Oct 2026 - 22:15', 9032)}
${fila(530, 'pedido', 'Mi pedido', 172, 'Cora Blest', 'Vie 30 Oct 2026 - 12:00', 9040)}
${fila(540, 'charla', 'Charla fuera de rol', 50, 'Bruno Ketch', 'Vie 30 Oct 2026 - 13:00', 9050)}
${fila(700, 'mision-la-cripta', '[Misión] La cripta', 40, 'Ofelia Marsh', 'Lun 2 Nov 2026 - 20:00', 9104)}
${fila(710, 'mision-el-faro', '[Misión] El faro', 40, 'Ofelia Marsh', 'Lun 2 Nov 2026 - 21:00', 9113)}
${fila(560, 'la-cabana', 'La cabaña', 40, 'Bruno Ketch', 'Mié 3 Jun 2026 - 18:00', 9060)}
${fila(800, 'oficial-el-robo', '[Oficial] El robo', 40, 'Irvin Giles', 'Lun 2 Nov 2026 - 23:30', 9207)}
${fila(810, 'oficial-la-boda', '[Oficial] La boda', 40, 'Tramas', 'Dom 1 Nov 2026 - 12:00', 9303)}
</table></body></html>`;
  P['/sta/u5203/50'] = '<html><body></body></html>';
  P['/f40-'] = '<html><body><a class="nav" href="/c10-zona-del-rol">Zona del rol</a></body></html>';
  P['/f50-'] = '<html><body><a class="nav" href="/c3-fuera-de-rol">Fuera de rol</a></body></html>';
  // el último mensaje es de los dados: cuenta quién escribió antes
  P['/t520-tirada-en-el-bosque'] = tema(520, 'tirada-en-el-bosque', 'Tirada en el bosque', [
    [9030, 'Irvin Giles', 'Sáb 31 Oct 2026 - 20:00', 'Busco huellas.'],
    [9031, 'Bruno Ketch', 'Sáb 31 Oct 2026 - 22:10', 'Tiro Alerta.'],
    [9032, 'Dados Mágicos', 'Sáb 31 Oct 2026 - 22:15', 'Resultado: 7']]);
  // misión con turno para Irvin y plazo en hora de España
  P['/t700-mision-la-cripta'] = tema(700, 'mision-la-cripta', '[Misión] La cripta', [
    [9100, 'Ofelia Marsh', 'Jue 29 Oct 2026 - 10:00', 'Bienvenidos a la cripta.'],
    [9101, 'Irvin Giles', 'Jue 29 Oct 2026 - 18:00', 'Entro con la varita en alto.'],
    [9102, 'Bruno Ketch', 'Vie 30 Oct 2026 - 11:00', 'Lo sigo.'],
    [9103, 'Dados Mágicos', 'Vie 30 Oct 2026 - 11:01', 'Resultado: 12'],
    [9104, 'Ofelia Marsh', 'Lun 2 Nov 2026 - 20:00', 'TURNO 2\nIrvin Giles\nLa losa cede bajo tus pies.\nBruno Ketch\nOyes un ruido.\nPRÓXIMO TURNO: Jueves 12 de noviembre · HORA LÍMITE 18.00 hora peninsular española']]);
  // misión cuyo turno nombra solo a otro jugador
  P['/t710-mision-el-faro'] = tema(710, 'mision-el-faro', '[Misión] El faro', [
    [9110, 'Ofelia Marsh', 'Jue 29 Oct 2026 - 10:00', 'El faro está apagado.'],
    [9111, 'Irvin Giles', 'Jue 29 Oct 2026 - 19:00', 'Subo la escalera.'],
    [9112, 'Bruno Ketch', 'Vie 30 Oct 2026 - 12:00', 'Me quedo abajo.'],
    [9113, 'Ofelia Marsh', 'Lun 2 Nov 2026 - 21:00', 'Turno 3\nBruno Ketch\nAlgo se mueve en el agua.\nPlazo: viernes 13, 7:59 pm (Hora de Madrid GMT +1)']]);
  // un oficial: Irvin escribe cuatro veces el mismo día (el cuarto no cuenta), Tramas no cobra
  P['/t800-oficial-el-robo'] = tema(800, 'oficial-el-robo', '[Oficial] El robo', [
    [9200, 'Tramas', 'Dom 1 Nov 2026 - 10:00', 'Se abre el oficial.'],
    [9201, 'Irvin Giles', 'Lun 2 Nov 2026 - 09:00', 'Uno.'],
    [9202, 'Bruno Ketch', 'Lun 2 Nov 2026 - 10:00', 'Dos.'],
    [9203, 'Irvin Giles', 'Lun 2 Nov 2026 - 12:00', 'Tres.'],
    [9204, 'Irvin Giles', 'Lun 2 Nov 2026 - 18:00', 'Cuatro.'],
    [9205, 'Dados Mágicos', 'Lun 2 Nov 2026 - 18:01', 'Resultado: 3'],
    [9206, 'Bruno Ketch', 'Lun 2 Nov 2026 - 20:00', 'Cinco.'],
    [9207, 'Irvin Giles', 'Lun 2 Nov 2026 - 23:30', 'Seis.']]);
  // un oficial cerrado por el staff (R09: ya no sale en curso)
  P['/t810-oficial-la-boda'] = tema(810, 'oficial-la-boda', '[Oficial] La boda', [
    [9300, 'Tramas', 'Jue 1 Oct 2026 - 10:00', 'Se abre el oficial.'],
    [9301, 'Irvin Giles', 'Vie 2 Oct 2026 - 10:00', 'Llego tarde.'],
    [9302, 'Bruno Ketch', 'Sáb 3 Oct 2026 - 10:00', 'Brindo.'],
    [9303, 'Tramas', 'Dom 1 Nov 2026 - 12:00', '¡AVISO! Este oficial queda cerrado. Gracias por participar.']]);
  // sueldo: pedido de Irvin y aprobación de una inspectora
  P['/f172-sueldos-mensuales'] = `<html><body><a class="topictitle" href="/t600-sueldos-de-${mesAnt}">Sueldos de ${mesAnt}</a><a class="topictitle" href="/t89-formularios">Formularios para solicitar sueldo</a></body></html>`;
  P[`/t600-sueldos-de-${mesAnt}`] = tema(600, `sueldos-de-${mesAnt}`, `Sueldos de ${mesAnt}`, [
    [9400, 'Cora Blest', 'Dom 1 Nov 2026 - 08:00', 'Abrimos los sueldos del mes.'],
    [9401, 'Bruno Ketch', 'Dom 1 Nov 2026 - 09:00', 'Sueldo total» 200'],
    [9402, 'Irvin Giles', 'Dom 1 Nov 2026 - 10:00', 'Pido mi sueldo.\nSueldo total» 300\nEnlaces» varios'],
    [9403, 'Cora Blest', 'Lun 2 Nov 2026 - 11:00', 'Bruno Ketch: falta el enlace del segundo post.\nIrvin Giles: todo es correcto, puedes añadirlo a tu bóveda.']]);
  P['/profile?mode=editprofile&page_profil=preferences'] = '<html><body><select name="timezone"><option value="Europe/Madrid" selected>Madrid</option></select></body></html>';
  return P;
}

/** Ruta de una petición (con o sin dominio, sin «#…» ni el «_=» anticaché). */
export function rutaDe(url) {
  const u = new URL(url, 'https://hp-avada-kedavra.foroactivo.com');
  u.searchParams.delete('_');
  return u.pathname + (u.search || '');
}
