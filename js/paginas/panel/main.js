// @ts-check
// Arranque del panel «Mi PJ» dentro del foro (el agente lo muestra en un iframe sin marco).
import { ClienteAgente } from '../../servicios/agente/ClienteAgente.js';
import { PROTOCOLO } from '../../servicios/agente/protocolo.js';
import { cargarSistema, cargarCompendio, cargarForos } from '../../datos/cargar.js';
import { LectorFicha } from '../../lectores/LectorFicha.js';
import { leerMiPj, aDatosMiPj } from '../../servicios/MiPj.js';
import { crearPanelMiPj } from './MiPjPanel.js';

const CACHE_MIN = 30; // como Mi PJ: si lo leído tiene más de media hora, se vuelve a leer al abrir
const root = /** @type {HTMLElement} */ (document.getElementById('mipj'));

async function arrancar() {
  const agente = ClienteAgente.enPanel();
  if (!agente) { root.textContent = 'Este panel lo muestra el script de PAM dentro del foro.'; return; }
  // Mientras no esté la revisión de la bóveda (fase 5b), el editor del foro publica sin preguntar
  agente.atender('editor.revisar', () => ({ avisos: [] }));
  const hola = await agente.hola();
  if (hola.protocolo !== PROTOCOLO) { root.textContent = 'Hay una versión nueva del script de PAM: actualizalo en Tampermonkey.'; await agente.tamano(420, 80).catch(() => {}); return; }
  if (!hola.cuenta) { await agente.tamano(1, 1); return; } // sin sesión, Mi PJ no se mostraba

  // el tema que guardaba el «Mi PJ» antiguo (mismo script en Tampermonkey), si lo hay
  let temaAntiguo = null;
  try { const v = (await agente.legado())['mipj.tema']; temaAntiguo = typeof v === 'string' ? JSON.parse(v) : v; } catch { /* sin tema */ }
  let guardado = null; try { guardado = window.localStorage; } catch { /* sin almacenamiento */ }
  if (temaAntiguo && guardado && !guardado.getItem('mipj.tema')) guardado.setItem('mipj.tema', JSON.stringify(temaAntiguo));

  const [sistema, compendio, foros] = await Promise.all([cargarSistema(), cargarCompendio(), cargarForos()]);
  const lector = new LectorFicha(sistema, compendio);
  const panel = crearPanelMiPj({
    root, documento: document, guardado, agente, ventana: hola.ventana, cuenta: hola.cuenta,
    pamUrl: new URL('index.html', location.href).href,
    cargar: async () => aDatosMiPj(await leerMiPj(agente, { sistema, compendio, lector, foros }), sistema)
  });
  agente.atender('ventana.cambio', v => { panel.ventana(v); return {}; });
  const d = panel.datos;
  if (!d || d.v !== 2 || Date.now() - new Date(d.leido).getTime() > CACHE_MIN * 60000) panel.actualizar();
}

arrancar().catch(e => { root.textContent = 'No se pudo abrir Mi PJ: ' + (e instanceof Error ? e.message : String(e)); });
