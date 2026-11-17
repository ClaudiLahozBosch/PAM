// 2.2.4: los temas «「OFICIAL」…» no se reconocían como oficiales (ni el cartel ni «Oficiales en curso").
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ES_OFICIAL, sinMarcaOficial } from '../../js/reglas/Oficiales.js';

test('reconoce los oficiales con corchetes de siempre y con corchetes japoneses', () => {
  for (const t of ['[Oficial] El robo', '[Rol oficial] Algo', 'Oficial: algo', 'Oficial • algo',
    '「OFICIAL」Lacrimae aurorae • Woojin', '「OFICIAL」Reporte Anual • Irina', '『Oficial』Algo', '【OFICIAL】 Algo'])
    assert.ok(ES_OFICIAL.test(t), t);
  for (const t of ['Los oficiales del ministerio', 'Reporte Anual • Irina', 'Oficialmente cerrado'])
    assert.ok(!ES_OFICIAL.test(t), t);
});

test('el título sin la marca, para «Oficiales en curso»', () => {
  assert.equal(sinMarcaOficial('[Oficial] El robo'), 'El robo');
  assert.equal(sinMarcaOficial('「OFICIAL」Lacrimae aurorae • Woojin'), 'Lacrimae aurorae • Woojin');
  assert.equal(sinMarcaOficial('Sin marca'), 'Sin marca');
});
