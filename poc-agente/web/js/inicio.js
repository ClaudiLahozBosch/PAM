// @ts-check
import { ClienteAgente } from './ClienteAgente.js';

const CLAVE_FICHA = 'pam.poc.ficha';
const $ = (/** @type {string} */ id) => /** @type {HTMLElement} */ (document.getElementById(id));
const pon = (id, txt, clase = '') => { const e = $(id); e.textContent = txt; e.className = 'res ' + clase; };

const agente = ClienteAgente.enPagina();

agente.hola()
  .then(h => pon('r-hola', `✓ Agente ${h.agente} · protocolo ${h.protocolo}`, 'ok'))
  .catch(() => pon('r-hola', '✗ No encuentro el script. Instálalo en Tampermonkey y recarga.', 'mal'));

$('b-guardar').onclick = async () => {
  const ficha = { nombre: /** @type {HTMLInputElement} */ ($('i-nombre')).value.trim() || 'Sin nombre', guardado: new Date().toISOString() };
  try { localStorage.setItem(CLAVE_FICHA, JSON.stringify(ficha)); } catch (e) { /* sin guardado del navegador */ }
  try {
    await agente.guardarDato(CLAVE_FICHA, ficha);
    const leida = await agente.leerDato(CLAVE_FICHA);
    pon('r-guardar', `✓ Guardada en el navegador y en el almacén del script:\n${JSON.stringify(leida)}\nAhora ve al foro, abre el panel y haz la prueba 2.`, 'ok');
  } catch (e) { pon('r-guardar', '✗ Guardada solo en el navegador; el script no responde: ' + e.message, 'mal'); }
};
