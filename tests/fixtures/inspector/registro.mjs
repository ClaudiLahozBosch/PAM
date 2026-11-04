// Un Registro de Canjes inventado para comparar el Inspector antiguo con el de PAM: tres pedidos (uno casi
// correcto, uno con errores y devoluciones, uno ya respondido), la ficha y la bóveda de cada PJ.
// Personajes inventados (Irvin Giles es la cuenta de prueba de los demás tests; la ficha es la inventada de varias-partes).

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const br = t => esc(t).replace(/\n/g, '<br>');
export const U = { 'Irvin Giles': 5203, 'Bruno Ketch': 77, 'Cora Blest': 31, 'Lia Fenn': 45 };
const ICONO_FICHA = 'zu0MvZg', ICONO_BOVEDA = 'e4PVpbK';

/** Un mensaje del registro, con el perfil (etapa, raza, edad, curso) y la pestaña «Fichas» (ficha y bóveda). */
function mensaje(id, autor, fecha, html, perfil = null) {
  const prof = perfil ? `<div class="postprofile">${Object.entries(perfil.campos).map(([k, v]) => `<span class="profileField"><span class="label">${k}:</span> ${esc(v)}</span>`).join('')}
<div class="tab_content"><a href="${perfil.ficha}"><img src="https://i.imgur.com/${ICONO_FICHA}.png"></a><a href="${perfil.boveda}"><img src="https://i.imgur.com/${ICONO_BOVEDA}.png"></a></div></div>` : '';
  return `<div class="post" id="p${id}">${prof}<p class="author">por <a href="/u${U[autor] ?? 99}">${esc(autor)}</a> ${fecha}</p><div class="content">${html}</div></div>`;
}
const tema = (titulo, posts) => `<!doctype html><html><body><h1 class="page-title">${esc(titulo)}</h1>\n${posts.join('\n')}\n</body></html>`;

const IRVIN = { campos: { Etapa: 'Adulto', Raza: 'Humano', Edad: '30', Curso: 'Graduado' }, ficha: '/t300-ficha-de-irvin-giles', boveda: '/t301-boveda-de-irvin-giles' };
const BRUNO = { campos: { Etapa: 'Adolescente', Raza: 'Humano', Edad: '15', Curso: '5º' }, ficha: '/t310-ficha-de-bruno-ketch', boveda: '/t311-boveda-de-bruno-ketch' };

const PEDIDO_IRVIN = `[b]Petición de canje[/b] — Irvin Giles
Bóveda: Bóveda de Irvin Giles
Grageas actuales: 2.500 · Coste: 1.450 · Quedarían: 1.050

ESTADÍSTICAS
Vigor: 2 → 3 — 400 grageas
HABILIDADES
Sigilo: Novato → Competente — 150 grageas
TRASFONDOS
Informantes Bajos fondos > Contrabandistas: III → IV — 200 grageas
Seguidores Sociedad > Prensa: II → III — 150 grageas
VENTAJAS
Recursos: I → II — 100 grageas
ARCANOS
Expelliarmus — 100 grageas
Hechizo Desmaius — 100 grageas
TALENTOS
Aparecerse — 200 grageas
IDIOMAS
Francés: Medio → Alto — 50 grageas
VETERANÍA
Punto de Destino — 1.000 grageas

Total: 2.450 grageas`;

const PEDIDO_BRUNO = `Petición de canje — Bruno Ketch
ESTADÍSTICAS
Destreza: 1 → 3 — 500 grageas
HABILIDADES
Pelea: Competente → Maestro — 650 grageas
TRASFONDOS
Biblioteca Arcanismo: 0 → I — 100 grageas
ESPECIALIZACIÓN
Combatiente 1 — 150 grageas
OTROS
Una cosa rara — 75 grageas
DEVOLUCIÓN
Poción embellecedora — 50 grageas
Total: 1.400 grageas`;

/** @returns {Record<string, string>} ruta → HTML */
export function registroInspector() {
  const P = {};
  P['/t34430-registro-de-canjes'] = tema('Registro de Canjes', [
    mensaje(9500, 'Cora Blest', 'Jue 1 Ene 2026 - 10:00', 'Aquí se piden los canjes.'),
    mensaje(9700, 'Irvin Giles', 'Lun 2 Nov 2026 - 10:00', br(PEDIDO_IRVIN), IRVIN),
    mensaje(9701, 'Bruno Ketch', 'Lun 2 Nov 2026 - 11:00', br(PEDIDO_BRUNO), BRUNO),
    mensaje(9702, 'Lia Fenn', 'Lun 2 Nov 2026 - 11:30', 'Qué buenos canjes.'),
    mensaje(9703, 'Bruno Ketch', 'Lun 2 Nov 2026 - 12:00', br('Petición de canje — Bruno Ketch\nHABILIDADES\nAlerta: Novato → Competente — 150 grageas\nTotal: 150 grageas'), BRUNO),
    mensaje(9704, 'Cora Blest', 'Lun 2 Nov 2026 - 13:00', 'Bruno, tus canjes son correctos y puedes añadirlos a tu ficha.')
  ]);
  // la ficha de Irvin: la inventada (varias-partes), en un mensaje y con 13 Puntos de Destino; después, un aviso largo
  P['/t300-ficha-de-irvin-giles'] = tema('Irvin Giles', [
    mensaje(9800, 'Irvin Giles', 'Lun 2 Mar 2026 - 10:00', br(`DATOS
▋ Nombre y Apellido: Irvin Giles.
▋ Etapa: Adulto
CARACT.
▋ Atributos: (Límites: Cuatro al 4)
→ Vigor: +2
→ Destreza: +3
→ Poder: +3
→ Inteligencia: +4
▋ Habilidades:
DESTREZA
→ Esquiva: Competente (+2)
→ Sigilo: Novato (+1)
INTELIGENCIA
→ Arcanismo: Experto (+4)
▋ Puntos de Destino: 13
HECHIZOS
✦ Accio: atrae objetos.
✦ Expelliarmus: desarma.
TRASFONDOS
→ Biblioteca V: Arcanismo.
→ Informantes III: Contrabandistas.
→ Seguidores II: Sociedad > Prensa.
VENTAJAS
Fama II
Recursos I
IDIOMAS
Inglés — Nativo
Francés — Medio`)),
    mensaje(9801, 'Cora Blest', 'Lun 2 Mar 2026 - 12:00', '<img src="https://i.imgur.com/0LPnzxG.png">'),
    mensaje(9802, 'Irvin Giles', 'Mar 3 Mar 2026 - 10:00', br('Ficha actualizada con los canjes del mes.\n' + 'Detalle del canje anterior, con mucho texto para que pase de 800 letras: '.repeat(14) + '\n→ Vigor: +9'))
  ]);
  P['/t301-boveda-de-irvin-giles'] = tema('Bóveda de Irvin Giles', [
    mensaje(9810, 'Irvin Giles', 'Lun 2 Mar 2026 - 10:05', br('Grageas Iniciales: 1.000\nGrageas Totales: 5.000\nGrageas Actuales: 2.000')),
    mensaje(9811, 'Irvin Giles', 'Dom 1 Nov 2026 - 10:00', br('Grageas actuales: 2.000\n+500 por el sueldo\nGrageas restantes: 2.500\nGrageas totales: 5.500'))
  ]);
  P['/t310-ficha-de-bruno-ketch'] = tema('Bruno Ketch', [
    mensaje(9820, 'Bruno Ketch', 'Lun 2 Mar 2026 - 10:00', br(`DATOS
▋ Nombre y Apellido: Bruno Ketch
CARACT.
→ Vigor: +3
→ Destreza: +1
▋ Habilidades:
→ Pelea: Competente (+2)
→ Alerta: Novato (+1)
▋ Puntos de Destino: 2`))
  ]);
  P['/t311-boveda-de-bruno-ketch'] = tema('Bóveda de Bruno Ketch', [
    mensaje(9830, 'Bruno Ketch', 'Lun 2 Mar 2026 - 10:05', br('Grageas Iniciales: 1.000\nGrageas Totales: 1.200\nGrageas Actuales: 1.200'))
  ]);
  return P;
}
