// ==UserScript==
// @name         PAM · Inspector de Canjes (HP Avada Kedavra)
// @namespace    https://jesleytherabbit-prog.github.io/PAM/
// @version      2.0.0
// @description  El Inspector de Canjes ahora está dentro de «Mi PJ». Esta última versión solo avisa: este script ya no hace falta y se puede desinstalar.
// @author       Hana Park
// @match        https://hp-avada-kedavra.foroactivo.com/t34430*
// @grant        GM_getValue
// @grant        GM_setValue
// @noframes
// @run-at       document-idle
// ==/UserScript==

/* Desde PAM 2.0.0 el Inspector de Canjes va dentro de «Mi PJ»: en el Registro de Canjes, tarjeta «🔍 Inspector de
   Canjes» del panel → «Activar el modo Inspector». Este script ya no revisa nada (la versión anterior leía la Tabla de
   Canjes de dentro de index.html y con PAM 2.0.0 ya no la encontraría). Solo enseña este aviso, con el aspecto del
   Inspector, hasta que se pulse «Entendido». La versión anterior está en tests/legado/pam-inspector-canjes.user.js. */

(function () {
  'use strict';
  if (GM_getValue('insp.adios', false)) { return; }

  var css = [
    '.icj-adios{--x-panel:var(--m-panel,#1e2236);--x-panel2:var(--m-panel-2,#262a42);--x-parch:var(--m-parchment,#F1EADF);--x-dim:var(--m-parchment-dim,#a7a1b6);',
    '--x-gold:var(--m-gold,#B49768);--x-goldb:var(--m-gold-bright,#d6bd8f);--x-arc:var(--m-arcane-bright,#cf94a3);--x-line:var(--m-line-strong,rgba(241,234,223,.16));',
    '--x-serif:var(--m-serif,"Cormorant Garamond",Georgia,serif);--x-sans:var(--m-sans,"Nunito",system-ui,sans-serif);',
    'position:fixed;left:16px;bottom:16px;z-index:99990;width:360px;max-width:calc(100vw - 24px);font:13.5px/1.45 var(--x-sans);color:var(--x-parch);text-align:left}',
    '.icj-adios *{box-sizing:border-box}',
    '.icj-adios .box{background:radial-gradient(420px 180px at 0% 0%,color-mix(in srgb,var(--x-arc) 16%,transparent),transparent 70%),var(--x-panel);border:1px solid color-mix(in srgb,var(--x-gold) 45%,transparent);border-radius:16px;box-shadow:0 24px 60px -24px rgba(0,0,0,.6);overflow:hidden}',
    '.icj-adios .hd{display:flex;align-items:center;gap:10px;padding:12px 16px 10px;border-bottom:1px solid var(--x-line)}',
    '.icj-adios .brand{font-family:var(--x-serif);font-style:italic;font-size:20px}',
    '.icj-adios .brand i{font-style:normal;color:var(--x-goldb);font-size:13px;margin-right:4px}',
    '.icj-adios .hd small{margin-left:auto;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--x-dim)}',
    '.icj-adios .bd{padding:12px 16px 14px;display:grid;gap:10px}',
    '.icj-adios p{margin:0}',
    '.icj-adios .dim{color:var(--x-dim);font-size:12.5px}',
    '.icj-adios .acciones{display:flex;justify-content:flex-end}',
    '.icj-adios .b{font:700 12px var(--x-sans);border-radius:999px;padding:6px 13px;cursor:pointer;border:1px solid var(--x-gold);background:color-mix(in srgb,var(--x-gold) 22%,transparent);color:var(--x-parch)}',
    '.icj-adios .b:hover{transform:translateY(-1px)}'
  ].join('\n');

  var estilo = document.createElement('style');
  estilo.textContent = css;
  document.head.appendChild(estilo);

  var caja = document.createElement('div');
  caja.className = 'icj-adios';
  caja.setAttribute('role', 'status');
  caja.innerHTML = '<div class="box"><div class="hd"><span class="brand"><i>✦</i>Inspector</span><small>Canjes</small></div>'
    + '<div class="bd"><p>El Inspector de Canjes ahora está <b>dentro de Mi PJ</b>: en esta página, abrí el panel Mi PJ y, en la tarjeta «🔍 Inspector de Canjes», pulsá «Activar el modo Inspector».</p>'
    + '<p class="dim">Este script ya no hace falta: podés desinstalarlo desde Tampermonkey (Panel de control → «PAM · Inspector de Canjes» → papelera).</p>'
    + '<div class="acciones"><button class="b" type="button">Entendido</button></div></div></div>';
  caja.querySelector('button').addEventListener('click', function () { GM_setValue('insp.adios', true); caja.remove(); });
  document.body.appendChild(caja);
})();
