// La misma corrección de F15 con la hora de Argentina (UTC−3): allí el error antiguo iba al revés
// y daba el día SIGUIENTE entre las 21:00 y la medianoche.
process.env.TZ = 'America/Argentina/Buenos_Aires';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fechaLocal, fechaISO } from '../../js/core/fechas.js';

test('fechas: a las 22:00 de Buenos Aires sigue siendo hoy', () => {
  const noche = new Date(2026, 10, 3, 22, 0); // 3/11/2026 22:00 hora de Argentina
  assert.equal(noche.toISOString().slice(0, 10), '2026-11-04', 'el cálculo antiguo daba el día siguiente');
  assert.equal(fechaLocal(noche), '2026-11-03');
  assert.equal(fechaISO(1, noche), '2026-11-04');
});
