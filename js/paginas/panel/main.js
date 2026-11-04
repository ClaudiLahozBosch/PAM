// @ts-check
// Arranque del panel «Mi PJ» dentro del foro (el agente lo muestra en un iframe sin marco).
import { ClienteAgente } from '../../servicios/agente/ClienteAgente.js?v=0.5.0';
import { PROTOCOLO } from '../../servicios/agente/protocolo.js?v=0.5.0';
import { cargarSistema, cargarCompendio, cargarForos, cargarCierresOficial, cargarDatosTabla } from '../../datos/cargar.js?v=0.5.0';
import { LectorFicha } from '../../lectores/LectorFicha.js?v=0.5.0';
import { leerMiPj, aDatosMiPj } from '../../servicios/MiPj.js?v=0.5.0';
import { crearPanelMiPj } from './MiPjPanel.js?v=0.5.0';
import { revisarEditor, temaDeRuta } from '../../reglas/RevisorBoveda.js?v=0.5.0';
import { crearActividad } from '../../servicios/ActividadDelForo.js?v=0.5.0';
import { crearLectorBiblioteca } from '../../servicios/BibliotecaDelForo.js?v=0.5.0';
import { CLAVES_BIBLIOTECA } from './BibliotecaPanel.js?v=0.5.0';
import { ES_OFICIAL, barraDeOficial, marcarCuarto } from '../../reglas/Oficiales.js?v=0.5.0';
import { crearCanjesDelForo } from '../../servicios/CanjesDelForo.js?v=0.5.0';
import { crearTarjetaCanjes } from './CanjesPanel.js?v=0.5.0';
import { crearRevision } from '../../inspector/Revision.js?v=0.5.0';
import { crearInspectorUI } from '../../inspector/InspectorUI.js?v=0.5.0';
import { crearInspector } from '../../inspector/Inspector.js?v=0.5.0';
import { normNombre } from '../../core/texto.js?v=0.5.0';

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
  // qué foros son de rol, las marcas de «segundo oficial» y la Biblioteca de oficiales (último escaneo, caché y ★)
  let guardado = null; try { guardado = window.localStorage; } catch { /* sin almacenamiento */ }
  try {
    const L = await agente.legado();
    for (const k of ['mipj.tema', 'mipj.ocultos.' + hola.cuenta.id, 'mipj.forosRol', 'mipj.of.cuarto', 'mipj.of.abierta', CLAVES_BIBLIOTECA.ultimo, CLAVES_BIBLIOTECA.favs, CLAVES_BIBLIOTECA.cache]) {
      if (L[k] == null || L[k] === '' || !guardado || guardado.getItem(k) != null) continue;
      guardado.setItem(k, typeof L[k] === 'string' ? L[k] : JSON.stringify(L[k]));
    }
  } catch { /* sin datos antiguos */ }
  const memoria = {
    gv: (k, d) => { try { const v = guardado?.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    sv: (k, v) => { try { guardado?.setItem(k, JSON.stringify(v)); } catch { /* sin espacio */ } }
  };

  const [sistema, compendio, foros, cierres] = await Promise.all([cargarSistema(), cargarCompendio(), cargarForos(), cargarCierresOficial()]);
  const lector = new LectorFicha(sistema, compendio);
  const cfg = foros[hola.foro ?? ''];
  // en el tema de un oficial: la barra con las cuentas, arriba de los mensajes (como Mi PJ, antes de pintar el panel)
  if (cfg?.actividad && ES_OFICIAL.test(hola.titulo || '') && /^\/t\d+/.test(hola.ruta || '')) barraOficial(agente, crearActividad(agente, { yo: hola.cuenta.nombre, uid: hola.cuenta.id, origen: 'https://' + hola.foro, cfg: cfg.actividad, memoria, cierres }), hola.ruta, memoria);
  // los canjes en el foro: la petición que preparó PAM, publicarla y la respuesta del Inspector (solo si el foro tiene registro)
  const servicioCanjes = cfg?.registroCanjes ? crearCanjesDelForo(agente, { foroHost: hola.foro || '', cuenta: hola.cuenta, cfg, memoria }) : null;
  if (servicioCanjes) await traerPeticionesAntiguas(agente, servicioCanjes.clave, 'cuentas.' + hola.foro + '.' + hola.cuenta.id);
  const canjes = servicioCanjes ? crearTarjetaCanjes({
    documento: document, servicio: servicioCanjes, datos: () => panel?.datos,
    actualizar: () => panel.actualizar(), abrirPanel: () => panel.abrir(), irA: ruta => agente.ir(ruta),
    puerta: accion => agente.puerta(accion), enviarAPam: op => panel.enviarAPam(op)
  }) : null;
  // el modo Inspector: en el Registro de Canjes, para los Inspectores de Canjes y los desarrolladores (en el foro de pruebas, todos)
  const inspector = modoInspector(agente, { hola, cfg, servicioCanjes, memoria, repintar: () => panel && panel.pintar() });
  panel = crearPanelMiPj({
    root, documento: document, guardado, agente, ventana: hola.ventana, cuenta: hola.cuenta, foroHost: hola.foro || '', canjes, inspector,
    pamUrl: new URL('index.html', location.href).href,
    biblioteca: cfg?.actividad?.biblioteca ? (() => {
      const origen = 'https://' + hola.foro;
      const lectorBib = crearLectorBiblioteca(agente, { origen, cfg: cfg.actividad.biblioteca, store: { get: () => memoria.gv(CLAVES_BIBLIOTECA.cache, { ediciones: {}, roles: {} }), set: v => memoria.sv(CLAVES_BIBLIOTECA.cache, v) } });
      return { origen, escanear: lectorBib.escanear, guardarEnAgente: (k, v) => agente.guardarDato(k, v) };
    })() : null,
    // como Mi PJ: al leer el foro también se busca la respuesta de los Inspectores a tus peticiones
    cargar: async () => {
      const [r] = await Promise.all([leerMiPj(agente, { sistema, compendio, lector, foros, memoria, cierres }), servicioCanjes ? servicioCanjes.actualizarAprobaciones().catch(() => {}) : null]);
      if (canjes) canjes.recargar();
      return aDatosMiPj(r, sistema);
    }
  });
  if (canjes) canjes.recargar();
  inspector.comprobar();
  agente.atender('ventana.cambio', v => { panel.ventana(v); return {}; });
  // «Terminar en PAM»: la pestaña de PAM terminó de cerrar el canje; ahora se le mandan los datos nuevos del foro
  agente.atender('pam.cierre', () => { panel.alCierrePam(); return {}; });
  const d = panel.datos;
  const viejo = !d || d.v !== 2 || Date.now() - new Date(d.leido).getTime() > CACHE_MIN * 60000 || (d.pendientes || []).includes('roles'); // leído por la 0.3.2, sin roles
  // como Mi PJ: escribiendo en la propia bóveda, se relee si lo leído tiene más de 2 minutos (para comparar con lo último)
  const enMiBoveda = !!(d?.boveda && hola.editor && (d.boveda.tema ?? d.boveda.tid) === temaDeRuta(hola.ruta) && Date.now() - new Date(d.leido).getTime() > 2 * 60000);
  // llegada desde PAM con «Ir al foro a publicar la petición»: se abre sola la puerta
  if (canjes && hola.hash === '#escriba-publicar') canjes.alCargarForo(hola.cuenta.nombre);
  else if (viejo || enMiBoveda) panel.actualizar();
}

/**
 * El modo Inspector (antes, el script «PAM · Inspector de Canjes»). Se puede activar si la cuenta está en el grupo de
 * Inspectores de Canjes o en «desarrolladores» (data/foros.json); en el foro de pruebas, siempre. Activo y en una
 * página del Registro de Canjes, cada pedido tiene su barra «Revisar canje».
 */
function modoInspector(agente, { hola, cfg, servicioCanjes, memoria, repintar }) {
  const CLAVE = 'mipj.inspector';
  const tema = String(cfg?.registroCanjes || '').match(/\/t(\d+)/)?.[1];
  const enRegistro = !!(tema && new RegExp('^/t' + tema + '(p\\d+)?-').test(hola.ruta || ''));
  let disponible = false, insp = null;
  const activo = () => !!memoria.gv(CLAVE, false);
  agente.atender('inspector.accion', d => (insp ? insp.accion(d) : {}));
  async function arrancar() {
    if (!enRegistro || insp) return;
    const R = crearRevision({ leer: r => agente.leer(r) });
    insp = crearInspector({ agente, R, ui: crearInspectorUI(document.implementation.createHTMLDocument(''), R), cargarDatos: f => cargarDatosTabla(f), ruta: hola.ruta });
    try { await insp.iniciar(); } catch (e) { console.warn('[Mi PJ] Inspector', e); }
  }
  return {
    disponible: () => disponible,
    activo,
    cambiar() {
      const on = !activo();
      memoria.sv(CLAVE, on);
      if (on) arrancar();
      else if (insp) { insp.quitar(); insp = null; }
    },
    /** ¿Puede esta cuenta usar el modo Inspector? (el grupo se lee una vez al día) */
    async comprobar() {
      if (!cfg || !servicioCanjes) return;
      const yo = normNombre(hola.cuenta.nombre);
      const desarrollador = (cfg.desarrolladores?.cuentas || []).some(n => normNombre(n) === yo);
      let delGrupo = false;
      if (!cfg.pruebas && !desarrollador) {
        try { const g = await servicioCanjes.leerGruposRevisores(false); delGrupo = (g?.grupos?.canjes || []).some(m => m.id === hola.cuenta.id); } catch { /* sin grupo */ }
      }
      disponible = !!(cfg.pruebas || desarrollador || delGrupo);
      if (!disponible) return;
      repintar();
      if (activo()) arrancar();
    }
  };
}

/** Las peticiones de canje que guardaba el «Mi PJ» antiguo («cuentas.<foro>.<id>»), la primera vez. */
async function traerPeticionesAntiguas(agente, clave, claveAntigua) {
  try {
    if (await agente.leerDato(clave)) return;
    const L = await agente.legado();
    const viejas = L && L[claveAntigua] && L[claveAntigua].peticiones;
    if (Array.isArray(viejas) && viejas.length) await agente.guardarDato(clave, { peticiones: viejas });
  } catch { /* sin datos antiguos */ }
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
