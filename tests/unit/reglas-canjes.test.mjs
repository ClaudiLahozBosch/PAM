// Las reglas de los canjes en el foro (js/reglas/Canjes.js): lo que no cubre la comparación con Mi PJ.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { avisosPeticion, clasificarRespuesta, textoPeticion } from '../../js/reglas/Canjes.js';

const pet = { pj: 'Irvin Giles', disponibles: '1.525', gastadas: '300', restantes: '1.225', texto: 'ESTADÍSTICAS\nCarisma: 1 → 2 — 300 grageas\n' };

test('F03: el punto final de la ficha no hace saltar el aviso de otro personaje', () => {
  assert.deepEqual(avisosPeticion(pet, { actForo: 1525, nombreFicha: 'Irvin Giles.' }), []);
  assert.match(avisosPeticion(pet, { actForo: 1525, nombreFicha: 'Hana Park' })[0], /la petición es de «Irvin Giles» y tu ficha es de «Hana Park»/);
});

test('el texto de la petición: cabecera con la bóveda y las grageas', () => {
  assert.equal(textoPeticion(pet, { url: 'https://foro/t301-', titulo: '' }),
    '[b]Petición de canje[/b] — Irvin Giles\nBóveda: [url=https://foro/t301-]Bóveda[/url]\nGrageas actuales: 1.525 · Coste: 300 · Quedarían: 1.225\n\nESTADÍSTICAS\nCarisma: 1 → 2 — 300 grageas');
});

test('lo que dice el Inspector', () => {
  assert.deepEqual(clasificarRespuesta('Irvin: son correctos, puedes añadirlos'), { clase: 'aprobada', importe: null });
  assert.deepEqual(clasificarRespuesta('La suma correcta es de 1.250 grageas'), { clase: 'corregida', importe: 1250 });
  assert.deepEqual(clasificarRespuesta('Te falta el enlace del segundo post'), { clase: 'revisar', importe: null });
  // como Mi PJ: «no son correctos» también contiene «son correct», y entonces se pregunta
  assert.deepEqual(clasificarRespuesta('No son correctos'), { clase: 'dudosa', importe: null });
  assert.deepEqual(clasificarRespuesta('Hola'), { clase: 'dudosa', importe: null });
});
