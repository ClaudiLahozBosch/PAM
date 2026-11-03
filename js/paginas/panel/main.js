// @ts-check
// Arranque del panel de PAM dentro del foro (lo muestra el agente en un iframe).
import { ClienteAgente } from '../../servicios/agente/ClienteAgente.js';
import { PROTOCOLO } from '../../servicios/agente/protocolo.js';
import { cargarSistema, cargarCompendio, cargarForos } from '../../datos/cargar.js';
import { LectorFicha } from '../../lectores/LectorFicha.js';
import { leerMiPj } from '../../servicios/MiPj.js';
import { PanelMiPj } from './PanelMiPj.js';
import { h, reemplazar } from '../../core/dom.js';

const raiz = /** @type {HTMLElement} */ (document.getElementById('contenido'));
const pie = /** @type {HTMLElement} */ (document.getElementById('pie'));

async function arrancar() {
  const agente = ClienteAgente.enPanel();
  if (!agente) {
    reemplazar(raiz, h('p', { class: 'aviso' }, 'Este panel se abre desde el botón «PAM» del foro, con el script instalado.'));
    return;
  }
  // Mientras no haya revisiones, el editor del foro publica sin preguntar (fase 5b: revisión de la bóveda)
  agente.atender('editor.revisar', () => ({ avisos: [] }));
  let hola;
  try { hola = await agente.hola(); } catch (e) { reemplazar(raiz, h('p', { class: 'aviso' }, 'El script no responde. Recarga la página del foro.')); return; }
  reemplazar(pie, `Agente ${hola.agente} · protocolo ${hola.protocolo}`);
  if (hola.protocolo !== PROTOCOLO) { reemplazar(raiz, h('p', { class: 'aviso' }, 'Hay una versión nueva del script de PAM: actualízalo en Tampermonkey.')); return; }

  const [sistema, compendio, foros] = await Promise.all([cargarSistema(), cargarCompendio(), cargarForos()]);
  const lector = new LectorFicha(sistema, compendio);
  let guardado = null; try { guardado = window.localStorage; } catch { /* sin almacenamiento */ }
  const panel = new PanelMiPj(raiz, { cargar: () => leerMiPj(agente, { sistema, compendio, lector, foros }), guardado });
  await panel.iniciar();
}

arrancar().catch(e => reemplazar(raiz, h('p', { class: 'aviso' }, 'No se pudo abrir el panel: ' + (e instanceof Error ? e.message : String(e)))));
