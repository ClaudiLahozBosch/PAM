/* PAM · Sesión con código: lo que tiene que pasar ANTES de que cargue la app (por eso es un script normal, no un módulo,
   y va al principio de index.html).
   1. La lista de lo que viaja con la sesión: las claves del navegador que empiezan por estos prefijos (salvo EXC).
      Es la ÚNICA lista: la usan esto y js/nube/Sesion.js (ver REFACTOR.md, «Dónde guarda PAM los datos»).
   2. Si se acaban de traer datos de la nube («pam.pendiente»), se ponen en el navegador. Todo o nada (auditoría F11):
      si algo falla a medias, se vuelve a dejar lo que había y la sesión lo avisa (`errorAlTraer`). */
(function () {
  'use strict';
  var PRE = ['grimorio.', 'grimorioAvadense.', 'revisorEmpleos.', 'registro-roles-v1', 'cd_'], EXC = ['cd_bg'];
  function esDePAM(k) { return EXC.indexOf(k) < 0 && PRE.some(function (x) { return k.indexOf(x) === 0; }); }
  var S = window.PAM_SESION = { PRE: PRE.slice(), EXC: EXC.slice(), esDePAM: esDePAM, errorAlTraer: null };

  var p = null;
  try { p = sessionStorage.getItem('pam.pendiente'); if (p) { sessionStorage.removeItem('pam.pendiente'); } } catch (e) { return; }
  if (!p) { return; }
  var datos;
  try { datos = JSON.parse(p).datos || {}; } catch (e) { S.errorAlTraer = 'datos dañados'; return; }

  function clavesDePAM() { var out = []; for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k != null && esDePAM(k)) { out.push(k); } } return out; }
  function poner(pares) {
    clavesDePAM().forEach(function (k) { localStorage.removeItem(k); });
    pares.forEach(function (x) {
      localStorage.setItem(x[0], x[1]);
      if (localStorage.getItem(x[0]) !== x[1]) { throw new Error('no se guardó bien ' + x[0]); }
    });
  }
  var antes = clavesDePAM().map(function (k) { return [k, localStorage.getItem(k)]; });
  var nuevas = Object.keys(datos).filter(function (k) { return esDePAM(k) && typeof datos[k] === 'string'; }).map(function (k) { return [k, datos[k]]; });
  try { poner(nuevas); }
  catch (e) {
    S.errorAlTraer = (e && e.name === 'QuotaExceededError') ? 'el navegador no tiene espacio' : String((e && e.message) || e);
    try { poner(antes); } catch (e2) { S.errorAlTraer += '; además no se pudo dejar todo como estaba'; }
  }
})();
