// Prueba local: agente y PAM en la misma pestaña (PAM abierto normal). Uso: node tests/pestana-pam.mjs
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
let fallos = 0;
const comprobar = (n, c, x = '') => { if (!c) fallos++; console.log((c ? 'OK  ' : 'FALLA ') + n + (x ? '  · ' + x : '')); };

const dom = new JSDOM('<!doctype html><body></body>', { url: 'https://claudilahozbosch.github.io/PAM/poc-agente/web/', runScripts: 'outside-only' });
const W = dom.window;
const gm = {};
W.GM_getValue = (k, d) => (k in gm ? JSON.parse(gm[k]) : d);
W.GM_setValue = (k, v) => { gm[k] = JSON.stringify(v); };
W.eval(readFileSync(path.join(raiz, 'agente/pam-agente-poc.user.js'), 'utf8'));

comprobar('en PAM no pinta pastilla ni panel', !W.document.getElementById('pam-agente'));

// jsdom no rellena «origin» en window.postMessage: lo hacemos como el navegador.
const real = W.postMessage.bind(W);
W.postMessage = (data, destino) => { if (destino === W.location.origin) setTimeout(() => W.dispatchEvent(new W.MessageEvent('message', { data: structuredClone(data), origin: W.location.origin })), 0); else real(data, destino); };

const { ClienteAgente } = await import('../web/js/ClienteAgente.js');
const agente = new ClienteAgente({ destino: W, origen: W.location.origin, escuchar: W });

const h = await agente.hola();
comprobar('hola en la pestaña de PAM', h.agente === '0.1.0' && h.foro === null && h.cuenta === null, JSON.stringify(h));
await agente.guardarDato('pam.poc.ficha', { nombre: 'Mortimer' });
comprobar('guardar → queda en el almacén del script', JSON.parse(gm['pam.poc.ficha']).nombre === 'Mortimer');
let err = null; try { await agente.pedir('foro.leer', { ruta: '/' }, 500); } catch (e) { err = e.message; }
comprobar('en PAM el agente no lee el foro', /desconocido/.test(err || ''), err || '');
process.exit(fallos ? 1 : 0);
