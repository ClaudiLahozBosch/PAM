// Arranque de PAM. index.html no lleva dentro ni el código ni los datos (fase 8a); este módulo:
//   1. trae los datos de data/ (los mismos archivos que usan el panel de Mi PJ y el Inspector) y los deja en la página
//      (#empleos-foro, #arcanos-data), donde los buscan las páginas;
//   2. monta las páginas, una tras otra y en el mismo orden que tenían dentro de index.html. Desde la fase 8e todas
//      son módulos (js/paginas/<carpeta>/) con una función montar(ventana, {traer}). Lo que una página usa de otra
//      va por un objeto en window (window.pamTabla, window.pamFicha, window.rrBoveda…);
//   3. y después lo nuevo: la sesión con código (js/nube/) y lo que llega del foro (js/pam/), como antes, al final.
// Si algo no se puede traer o una página no arranca, PAM avisa arriba en vez de quedarse a medias sin decir nada.
// N07 (0.5.3): antes de las páginas deja en window.PAM_EDITOR el editor nuevo del «Código para el foro» (js/pam/EditorPam.js),
// con data/sistema.json y los arcanos. Si eso falla, Mi Ficha sigue con el «Personalizada» antiguo.
import { Sistema } from '../datos/Sistema.js?v=2.1.1';
import { Compendio } from '../datos/Compendio.js?v=2.1.1';
import { LectorFicha } from '../lectores/LectorFicha.js?v=2.1.1';
import { crearEditorPam } from './EditorPam.js?v=2.1.1';

const V = '?v=2.1.1'; // lo pone scripts/versionar.mjs

/** Los datos que las páginas leen de la página, en orden. */
export const DATOS = [
  { id: 'empleos-foro', tipo: 'text/plain', src: 'data/empleos-foro.txt' },
  { id: 'arcanos-data', tipo: 'application/json', src: 'data/arcanos.json' },
];
/** Las páginas, en el orden en que estaban en index.html. */
export const PAGINAS = ['tabla-canjes', 'revisor', 'registro', 'portada', 'temas', 'foro-antiguo'];
/** Dónde está cada una (fases 8b–8e). */
export const MODULOS = {
  'tabla-canjes': '../paginas/canjes/main.js',   // Tabla de Canjes y Compendio (8d)
  revisor: '../paginas/revisor/main.js',          // Mi Ficha, Controlador, Revisor y Editor de empleos (8c)
  registro: '../paginas/registro/main.js',        // Registro de Roles, Bóveda y Coloreador (8b)
  portada: '../paginas/inicio/portada.js',        // portada y navegación (8e)
  temas: '../paginas/inicio/temas.js',            // kit de temas (8e)
  'foro-antiguo': '../paginas/inicio/foroAntiguo.js' // «Datos del foro → PAM» (8e)
};

/**
 * @param {{doc?: Document, fetch?: typeof fetch, importar?: (ruta: string) => Promise<any>}} [o]
 * @returns {Promise<boolean>} si PAM arrancó entero
 */
export async function arrancar({ doc = document, fetch: traer = (...a) => fetch(...a), importar = r => import(r) } = {}) {
  const errores = [];
  const sistemaJson = traer('data/sistema.json' + V).then(r => (r.ok ? r.text() : null)).then(t => (t ? JSON.parse(t) : null)).catch(() => null);
  let textos;
  try {
    textos = await Promise.all(DATOS.map(async d => {
      const r = await traer(d.src + V);
      if (!r.ok) throw new Error(`${d.src} (HTTP ${r.status})`);
      return r.text();
    }));
    DATOS.forEach((d, i) => {
      const s = doc.createElement('script');
      s.type = d.tipo; s.id = d.id; s.textContent = textos[i];
      doc.body.appendChild(s);
    });
  } catch (e) {
    return fallo(doc, e);
  }
  try {
    const sj = await sistemaJson;
    if (sj) {
      const sistema = new Sistema(sj), compendio = new Compendio(JSON.parse(textos[DATOS.findIndex(d => d.id === 'arcanos-data')]));
      /** @type {any} */ (doc.defaultView).PAM_EDITOR = crearEditorPam({ sistema, compendio, lector: new LectorFicha(sistema, compendio) });
    }
  } catch (e) { console.warn('[PAM] sin el editor nuevo del «Código para el foro»:', e); }
  // Una tras otra, en orden. Si una falla, las demás siguen (como antes) y al final se avisa.
  for (const p of PAGINAS) {
    try {
      const m = await importar(MODULOS[p] + V);
      await m.montar(doc.defaultView, { traer });
    } catch (e) { console.error(`[PAM] ${p}:`, e); errores.push(`${p} (${e && e.message || e})`); }
  }
  if (errores.length) return fallo(doc, new Error(errores.join(', ')));
  await importar('../nube/main.js' + V);
  await importar('./main.js' + V);
  return true;
}

function fallo(doc, e) {
  console.error('PAM no pudo arrancar:', e);
  const p = doc.createElement('p');
  p.className = 'pam-arranque-error';
  p.setAttribute('role', 'alert');
  p.style.cssText = 'margin:12px;padding:10px 14px;border:1px solid #c0392b;border-radius:8px;background:#fff3f2;color:#7b1d14;font:15px/1.4 sans-serif';
  p.textContent = `No se pudo cargar una parte de PAM (${e && e.message || e}). Probá recargar la página.`;
  doc.body.prepend(p);
  return false;
}

if (typeof document !== 'undefined' && !globalThis.__pamSinArranque) arrancar();
