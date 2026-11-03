// @ts-check
// Arranque del panel «Mi PJ» dentro del foro (el agente lo muestra en un iframe sin marco).
import { ClienteAgente } from '../../servicios/agente/ClienteAgente.js?v=0.3.3';
import { PROTOCOLO } from '../../servicios/agente/protocolo.js?v=0.3.3';
import { cargarSistema, cargarCompendio, cargarForos } from '../../datos/cargar.js?v=0.3.3';
import { LectorFicha } from '../../lectores/LectorFicha.js?v=0.3.3';
import { leerMiPj, aDatosMiPj } from '../../servicios/MiPj.js?v=0.3.3';
import { crearPanelMiPj } from './MiPjPanel.js?v=0.3.3';
import { revisarEditor, temaDeRuta } from '../../reglas/RevisorBoveda.js?v=0.3.3';
import { crearActividad } from '../../servicios/ActividadDelForo.js?v=0.3.3';
import { ES_OFICIAL, barraDeOficial, marcarCuarto } from '../../reglas/Oficiales.js?v=0.3.3';

const CACHE_MIN = 30; // como Mi PJ: si lo leído tiene más de media hora, se vuelve a leer al abrir
const root = /** @type {HTMLElement} */ (document.getElementById('mipj'));

async function arrancar() {
  const agente = ClienteAgente.enPanel();
  if (!agente) { root.replaceChildren(); root.textContent = 'Este panel lo muestra el script de PAM dentro del foro.'; return; }
  // La revisión de la bóveda del editor del foro (la barra de debajo y «Antes de publicar»).
  // Funciona desde el principio: sin datos todavía, revisa las cuentas sin compararlas con la bóveda.
  /** @type {any} */ let panel = null;
  agente.atender('editor.revisar', d => revisarEditor({ texto: String(d.texto ?? ''), ruta: String(d.ruta ?? '') }, panel?.datos?.boveda ?? null));
  const hola = await agente.hola();
  if (hola.protocolo !== PROTOCOLO) { root.textContent = 'Hay una versión nueva del script de PAM: actualizalo en Tampermonkey.'; await agente.tamano(420, 80).catch(() => {}); return; }
  if (!hola.cuenta) { await agente.tamano(1, 1); return; } // sin sesión, Mi PJ no se mostraba

  // lo que guardaba el «Mi PJ» antiguo (mismo script en Tampermonkey), la primera vez: el tema, los roles ocultos,
  // qué foros son de rol y las marcas de «segundo oficial»
  let guardado = null; try { guardado = window.localStorage; } catch { /* sin almacenamiento */ }
  try {
    const L = await agente.legado();
    for (const k of ['mipj.tema', 'mipj.ocultos.' + hola.cuenta.id, 'mipj.forosRol', 'mipj.of.cuarto', 'mipj.of.abierta']) {
      if (L[k] == null || !guardado || guardado.getItem(k) != null) continue;
      guardado.setItem(k, typeof L[k] === 'string' ? L[k] : JSON.stringify(L[k]));
    }
  } catch { /* sin datos antiguos */ }
  const memoria = {
    gv: (k, d) => { try { const v = guardado?.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    sv: (k, v) => { try { guardado?.setItem(k, JSON.stringify(v)); } catch { /* sin espacio */ } }
  };

  const [sistema, compendio, foros] = await Promise.all([cargarSistema(), cargarCompendio(), cargarForos()]);
  const lector = new LectorFicha(sistema, compendio);
  const cfg = foros[hola.foro ?? ''];
  // en el tema de un oficial: la barra con las cuentas, arriba de los mensajes (como Mi PJ, antes de pintar el panel)
  if (cfg?.actividad && ES_OFICIAL.test(hola.titulo || '') && /^\/t\d+/.test(hola.ruta || '')) barraOficial(agente, crearActividad(agente, { yo: hola.cuenta.nombre, uid: hola.cuenta.id, origen: 'https://' + hola.foro, cfg: cfg.actividad, memoria }), hola.ruta, memoria);
  panel = crearPanelMiPj({
    root, documento: document, guardado, agente, ventana: hola.ventana, cuenta: hola.cuenta,
    pamUrl: new URL('index.html', location.href).href,
    cargar: async () => aDatosMiPj(await leerMiPj(agente, { sistema, compendio, lector, foros, memoria }), sistema)
  });
  agente.atender('ventana.cambio', v => { panel.ventana(v); return {}; });
  const d = panel.datos;
  const viejo = !d || d.v !== 2 || Date.now() - new Date(d.leido).getTime() > CACHE_MIN * 60000 || (d.pendientes || []).includes('roles'); // leído por la 0.3.2, sin roles
  // como Mi PJ: escribiendo en la propia bóveda, se relee si lo leído tiene más de 2 minutos (para comparar con lo último)
  const enMiBoveda = !!(d?.boveda && hola.editor && (d.boveda.tema ?? d.boveda.tid) === temaDeRuta(hola.ruta) && Date.now() - new Date(d.leido).getTime() > 2 * 60000);
  if (viejo || enMiBoveda) panel.actualizar();
}

/** La barra del oficial: «leyendo…» al tener la primera página, y luego las cuentas; las marcas de «segundo oficial» se guardan aquí. */
async function barraOficial(agente, act, ruta, memoria) {
  const abierta = () => memoria.gv('mipj.of.abierta', true);
  let O = null;
  const pintar = () => ({ estado: 'ok', abierta: abierta(), barra: barraDeOficial(O, memoria.gv('mipj.of.cuarto', {})) });
  agente.atender('oficial.abierta', d => { memoria.sv('mipj.of.abierta', !!d.abierta); return {}; });
  agente.atender('oficial.cuarto', d => {
    if (!O) throw new Error('Todavía leyendo el tema');
    memoria.sv('mipj.of.cuarto', marcarCuarto(memoria.gv('mipj.of.cuarto', {}), d.tid, String(d.autor), !!d.si));
    return pintar();
  });
  try {
    O = await act.leerOficialDeRuta(ruta.split('?')[0].split('#')[0], () => { agente.oficial({ estado: 'leyendo', abierta: abierta() }).catch(() => {}); });
    await agente.oficial(pintar());
  } catch (e) {
    agente.oficial({ estado: 'error', abierta: abierta(), error: e instanceof Error ? e.message : String(e) }).catch(() => {});
  }
}

arrancar().catch(e => {
  // la pastilla de siempre, con el motivo al pasar el ratón (el agente la muestra aunque el panel no le pida tamaño)
  const p = root.querySelector('.pill');
  if (p) p.setAttribute('title', 'Mi PJ no pudo arrancar: ' + (e instanceof Error ? e.message : String(e)));
  console.error('[Mi PJ]', e);
});
