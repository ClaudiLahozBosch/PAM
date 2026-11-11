// @ts-check
// Arranque de lo nuevo dentro de PAM (index.html lo carga con una sola línea). Si el script de PAM (el agente) no
// está instalado, no hace nada y PAM funciona como siempre.
import { ClienteAgente } from '../servicios/agente/ClienteAgente.js?v=2.0.1';
import { PROTOCOLO } from '../servicios/agente/protocolo.js?v=2.0.1';
import { crearPamActual } from './PamActual.js?v=2.0.1';
import { crearControladorForo } from './ControladorForo.js?v=2.0.1';
import { cargarForos } from '../datos/cargar.js?v=2.0.1';

const esperar = ms => new Promise(r => setTimeout(r, ms));

async function arrancar() {
  const agente = ClienteAgente.enPagina();
  // el agente se carga cuando la página ya está lista: se le pregunta unas veces
  let hola = null;
  for (const pausa of [0, 1500, 4000]) {
    await esperar(pausa);
    try { hola = await agente.hola(); break; } catch (e) { /* todavía no está */ }
  }
  if (!hola || hola.protocolo !== PROTOCOLO) return;
  let foros = {}; try { foros = await cargarForos(); } catch (e) { /* sin nombres de foro */ }
  const ctl = crearControladorForo({ agente, pam: crearPamActual(window), doc: document, foros });
  // como hacía Mi PJ: al abrir PAM y cada vez que se vuelve a su pestaña
  setTimeout(ctl.revisarOficiales, 2500);
  window.addEventListener('focus', () => setTimeout(ctl.revisarOficiales, 600));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(ctl.revisarOficiales, 600); });
  // canjes: la pastilla «Mi PJ», el cierre que llega del foro y «Llevar a la calculadora» tras importar la ficha
  ctl.canjes.vigilarImportacion();
  ctl.canjes.revisarPendientes();
  window.addEventListener('focus', () => ctl.canjes.revisarPendientes());
  window.addEventListener('hashchange', () => ctl.canjes.revisarPendientes());
}

arrancar().catch(e => console.warn('[PAM] puente con el foro:', e));
