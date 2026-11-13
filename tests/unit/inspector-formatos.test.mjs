// 2.0.2: los formatos de petición que el Inspector no veía (Registro de Canjes, revisado entero el 13/11/2026: de 34
// peticiones sin barra quedan 5, que no ponen precio a cada canje). Textos cortos al estilo de los posts reales.
// Las reglas nuevas que podrían confundirse con otra cosa («Nombre: 300», «Nombre (300)», «Nombre 300») sólo valen
// si el post tiene «Total»; así las respuestas de los revisores siguen sin barra.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { crearRevision } from '../../js/inspector/Revision.js';

const R = crearRevision({ leer: async () => { throw new Error('sin red'); } });
const { document } = new JSDOM('').window;
/** El pedido de un post con estas líneas. */
function pedido(...lineas) {
  const el = document.createElement('div');
  el.innerHTML = lineas.map(l => l.replace(/&/g, '&amp;').replace(/</g, '&lt;')).join('<br>');
  const p = R.leerPedido(el);
  return { canjes: p.items.map(x => [x.desc, x.precio]), total: p.total, devoluciones: p.devoluciones.length };
}

test('«Nombre: 300» sin encabezado: vale si el post tiene «Total»', () => {
  const p = pedido('Los siguientes canjes:', 'Morsequor: 300', 'Poción calmante: 100', 'Los ojos del muerto | Oculi Morti: 100', 'Total: 500');
  assert.deepEqual(p.canjes, [['Morsequor', 300], ['Poción calmante', 100], ['Los ojos del muerto | Oculi Morti', 100]]);
  // también con «=», «-» y el total con punto de miles
  assert.deepEqual(pedido('Poder 1 = 250', 'Inteligencia - 1000', 'Total = 1.250 grageas').canjes, [['Poder 1', 250], ['Inteligencia', 1000]]);
});

test('«Nombre: 300» sin «Total» no cuenta: puede ser una respuesta o un comentario', () => {
  assert.deepEqual(pedido('Te faltó esto en la ficha:', 'Cultura muggle de 2 a 3: 250').canjes, []);
  assert.deepEqual(pedido('Correcto, podéis añadirlo.', 'Saldo anterior: 1200').canjes, []);
});

test('el precio entre paréntesis o pegado al final, con «Total»', () => {
  assert.deepEqual(pedido('Habilidades (250 grageas):', 'Política: 2 > 3 (250)', '● Lazo con Blake (50)', 'TOTAL: 300 grageas').canjes,
    [['Política: 2 > 3', 250], ['Lazo con Blake', 50]]);
  assert.deepEqual(pedido('Talentoso Inteligencia 1.000', 'Influencia Sociedad > Muggles de 1 a 2 100', 'Total: 1100').canjes,
    [['Talentoso Inteligencia', 1000], ['Influencia Sociedad > Muggles de 1 a 2', 100]]);
  // «Carisma 2» o «(+2)» no son precios
  assert.deepEqual(pedido('Carisma 2', 'Coordinación: Competente (+2)', 'Total: 550').canjes, []);
});

test('el precio solo en la línea de abajo: el canje es la línea de antes que sea un nombre', () => {
  assert.deepEqual(pedido('ARCANOS', 'Objeto avanzado', 'Maletín del pocionista inquieto', '600 grageas', 'Cinturón del Herbalista', '600 grageas', 'Total: 1200 grageas').canjes,
    [['Maletín del pocionista inquieto', 600], ['Cinturón del Herbalista', 600]]);
  // nombre, descripción larga y precio
  assert.deepEqual(pedido('Protego', 'Arcano de Combate. Encantamiento protector. Genera una barrera en forma de pequeño escudo.', '100 grageas').canjes, [['Protego', 100]]);
  // nombre y descripción en la misma línea
  assert.deepEqual(pedido('Un canjecito:', 'Lechuza mecánica: Este pequeño autómata mágico es una lechuza en miniatura llena de engranajes.', '100 grageas.').canjes, [['Lechuza mecánica', 100]]);
  // «100 grageas a devolver» no es un canje
  assert.deepEqual(pedido('Vengo a devolver la poción que ya tenía.', '100 grageas a devolver.').canjes, []);
});

test('el precio delante del canje', () => {
  assert.deepEqual(pedido('100g Avensegium (Ritual básico)').canjes, [['Avensegium (Ritual básico)', 100]]);
  assert.deepEqual(pedido('● 1000 grageas --- Punto de Destino', '● 500 grageas --- +1 al límite de 1 STAT:', 'Total: 1500 grageas').canjes,
    [['Punto de Destino', 1000], ['+1 al límite de 1 STAT', 500]]);
  assert.deepEqual(pedido('● 300 grageas y 3 PL --- Proeza: Estilo.', '600g 6PL Objeto Inventado').canjes, [['Proeza: Estilo', 300], ['Objeto Inventado', 600]]);
  // lo que se cuenta detrás del canje queda fuera
  assert.deepEqual(pedido('● 300 grageas --- Biblioteca 0 > II: Callejeo. Robert ha pasado media vida en los callejones.').canjes, [['Biblioteca 0 > II: Callejeo', 300]]);
  assert.deepEqual(pedido('● 600 grageas --- Reanimado de Combate: Puede ser un elemental, un gólem o un muerto viviente.').canjes, [['Reanimado de Combate', 600]]);
});

test('las cuentas no son canjes: subtotales, saldos, resúmenes y encabezados con la suma de su apartado', () => {
  const p = pedido('Maniobras de combate — 650 grageas:', 'Ataque cauteloso (básica) — 75 grageas', 'Subtotal: 650 grageas', 'Sub Total: 1700',
    'Habilidades: 1.350 · Especializaciones: 900 · Arcanos: 200', 'Grageas disponibles: 6.050', 'Grageas restantes: 2.950', 'Total: 3.100 grageas');
  assert.deepEqual(p.canjes, [['Ataque cauteloso (básica)', 75]]);
  assert.equal(p.total, 3100);
});

test('lo que sobra al final de la línea: etiquetas de BBCode, los PL y las erratas de «grageas»', () => {
  assert.deepEqual(pedido('Habilidades:', 'Pociones de 0 a 1: 75[/list]', 'Arcanismo de experto a legendario = 1.150 + 7 PL', 'Vigor de 7 a 8: 1.750 y 7 PL', '- Consciencia 0 > 1 = 75 grageaa').canjes,
    [['Pociones de 0 a 1', 75], ['Arcanismo de experto a legendario', 1150], ['Vigor de 7 a 8', 1750], ['Consciencia 0 > 1', 75]]);
});

test('lo de antes sigue igual: con encabezado, con «grageas» y las devoluciones', () => {
  assert.deepEqual(pedido('ESTADÍSTICAS', 'Vigor: 4 → 5 — 300 grageas', 'ARCANOS', 'Rayo: 100', 'DEVOLUCIONES', 'Frigus: 100 grageas', 'Total: 300').canjes,
    [['Vigor: 4 → 5', 300], ['Rayo', 100]]);
  assert.equal(pedido('DEVOLUCIONES', 'Frigus: 100 grageas').devoluciones, 1);
});
