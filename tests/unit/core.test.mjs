process.env.TZ = 'Europe/Madrid';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { norm, normNombre, esc, aRomano, deRomano, num } from '../../js/core/texto.js';
import { fechaLocal, fechaISO, sumarDias, deFechaLocal } from '../../js/core/fechas.js';
import { Almacen } from '../../js/core/Almacen.js';

test('texto: norm y normNombre', () => {
  assert.equal(norm('  Seducción '), 'seduccion');
  assert.equal(normNombre('Irvin  Giles.'), 'irvin giles');
  assert.equal(normNombre('Irvin Giles'), normNombre('Irvin Giles.'), 'auditoría F03: mismo PJ con y sin punto final');
});
test('texto: esc también escapa comillas (atributos HTML, auditoría F08)', () => {
  assert.equal(esc(`a"><img src=x onerror=alert(1)>`), 'a&quot;&gt;&lt;img src=x onerror=alert(1)&gt;');
  assert.equal(esc("O'Neill & co"), 'O&#39;Neill &amp; co');
  assert.equal(esc(null), '');
});
test('texto: números romanos y num', () => {
  assert.deepEqual([1, 3, 6].map(aRomano), ['I', 'III', 'VI']);
  assert.deepEqual(['iv', 'VI', '3', 'X', ''].map(deRomano), [4, 6, 3, null, null]);
  assert.deepEqual([num('5'), num('x'), num(null)], [5, 0, 0]);
});

test('fechas: a las 00:30 de Madrid sigue siendo hoy (auditoría F15)', () => {
  const madrugada = new Date(2026, 10, 3, 0, 30); // 3/11/2026 00:30 hora de Madrid
  const antiguo = (() => { const x = new Date(madrugada); x.setDate(x.getDate() + 0); return x.toISOString().slice(0, 10); })();
  assert.equal(antiguo, '2026-11-02', 'el cálculo antiguo daba el día anterior');
  assert.equal(fechaLocal(madrugada), '2026-11-03');
  assert.equal(fechaISO(2, madrugada), '2026-11-05');
  assert.equal(fechaISO(-1, madrugada), '2026-11-02');
});
test('fechas: cambio de hora de octubre', () => {
  const antes = new Date(2026, 9, 24, 0, 30); // la noche del 25/10/2026 se atrasa la hora
  assert.equal(fechaLocal(sumarDias(1, antes)), '2026-10-25');
  assert.equal(fechaLocal(sumarDias(2, antes)), '2026-10-26');
  assert.equal(fechaLocal(deFechaLocal('2026-03-29')), '2026-03-29');
});

/** localStorage de mentira; `fallarDesde` hace fallar las escrituras a partir de la n-ésima. */
function almacenamiento({ fallarDesde = Infinity } = {}) {
  const m = new Map(); let escrituras = 0;
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { if (++escrituras >= fallarDesde) throw new Error('QuotaExceededError'); m.set(k, String(v)); },
    removeItem: k => { m.delete(k); },
    key: i => [...m.keys()][i] ?? null,
    get length() { return m.size; },
    _mapa: m, permitir() { fallarDesde = Infinity; }
  };
}

test('almacén: guardar, leer y errores devueltos', () => {
  const s = almacenamiento(), A = new Almacen({ storage: s });
  assert.deepEqual(A.guardar('pam.x', { a: 1 }), { ok: true });
  assert.deepEqual(A.leer('pam.x'), { a: 1 });
  assert.equal(A.leer('pam.no', 'nada'), 'nada');
  s._mapa.set('pam.roto', '{no es json');
  assert.equal(A.leer('pam.roto', 'def'), 'def');
  const lleno = new Almacen({ storage: almacenamiento({ fallarDesde: 1 }) });
  assert.equal(lleno.guardar('pam.x', 1).ok, false);
});
test('almacén: lo pendiente se guarda al salir de la página (auditoría F14)', () => {
  const s = almacenamiento(), A = new Almacen({ storage: s });
  const oyentes = {};
  const ventana = { addEventListener: (e, f) => { oyentes[e] = f; }, document: { visibilityState: 'visible', addEventListener: (e, f) => { oyentes[e] = f; } } };
  A.vigilarSalida(ventana);
  A.guardarLuego('registro-roles-v1', { personajes: [1] }, 60000);
  assert.equal(s.getItem('registro-roles-v1'), null, 'todavía no');
  assert.deepEqual(A.leer('registro-roles-v1'), { personajes: [1] }, 'pero ya se lee el valor nuevo');
  oyentes.pagehide();
  assert.equal(s.getItem('registro-roles-v1'), '{"personajes":[1]}');
  A.guardarLuego('pam.y', 2, 60000);
  ventana.document.visibilityState = 'hidden'; oyentes.visibilitychange();
  assert.equal(s.getItem('pam.y'), '2');
});
test('almacén: restaurar es todo o nada (auditoría F11)', () => {
  const esDePam = k => k.startsWith('pam.');
  const s = almacenamiento(); s.setItem('pam.a', 'viejo-a'); s.setItem('pam.b', 'viejo-b'); s.setItem('otro', 'no se toca');
  const A = new Almacen({ storage: s });
  const ok = A.restaurar({ 'pam.a': 'nuevo-a', 'pam.c': 'nuevo-c', 'otro': 'ignorado' }, esDePam);
  assert.deepEqual(ok, { ok: true, escritas: 2 });
  assert.deepEqual(Object.fromEntries(s._mapa), { 'pam.a': 'nuevo-a', 'pam.c': 'nuevo-c', otro: 'no se toca' });

  const s2 = almacenamiento(); s2.setItem('pam.a', 'viejo-a'); s2.setItem('pam.b', 'viejo-b');
  const A2 = new Almacen({ storage: s2 });
  const original = s2.setItem; let n = 0;
  s2.setItem = (k, v) => { if (k === 'pam.z' && n++ === 0) throw new Error('QuotaExceededError'); original(k, v); };
  const mal = A2.restaurar({ 'pam.a': 'nuevo-a', 'pam.z': 'x'.repeat(10) }, esDePam);
  assert.equal(mal.ok, false);
  assert.equal(mal.restaurado, true);
  assert.deepEqual(Object.fromEntries(s2._mapa), { 'pam.a': 'viejo-a', 'pam.b': 'viejo-b' }, 'quedó como estaba');
  assert.equal(A2.restaurar('no', esDePam).ok, false);
});
