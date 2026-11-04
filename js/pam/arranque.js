// Arranque de PAM (fase 8a). index.html ya no lleva dentro ni el código ni los datos; este módulo:
//   1. trae los datos de data/ (los mismos archivos que usan el panel de Mi PJ y el Inspector) y los deja en la página
//      donde los buscan las páginas antiguas (#empleos-foro, #arcanos-data);
//   2. carga las páginas en el mismo orden que tenían dentro de index.html. Las de js/paginas/pam/ son scripts normales
//      (no módulos): comparten sus variables como antes. Las que ya se reescribieron (fase 8b: el Registro de Roles)
//      son módulos con una función montar(ventana, {traer}) y se cargan en su mismo sitio;
//   3. y después lo nuevo: la sesión con código (js/nube/) y lo que llega del foro (js/pam/), como antes, al final.
// Si algo no se puede traer, PAM avisa arriba en vez de quedarse a medias sin decir nada.
// N07 (0.5.3): antes de las páginas deja en window.PAM_EDITOR el editor nuevo del «Código para el foro» (js/pam/EditorPam.js),
// con data/sistema.json y los arcanos. Si eso falla, PAM sigue con el «Personalizada» antiguo.
import { Sistema } from '../datos/Sistema.js?v=0.6.1';
import { Compendio } from '../datos/Compendio.js?v=0.6.1';
import { LectorFicha } from '../lectores/LectorFicha.js?v=0.6.1';
import { crearEditorPam } from './EditorPam.js?v=0.6.1';

const V = '?v=0.6.1'; // lo pone scripts/versionar.mjs

/** Los datos que las páginas antiguas leen de la página, en orden. */
export const DATOS = [
  { id: 'empleos-foro', tipo: 'text/plain', src: 'data/empleos-foro.txt' },
  { id: 'arcanos-data', tipo: 'application/json', src: 'data/arcanos.json' },
];
/** Las páginas, en el orden en que estaban en index.html: las antiguas (js/paginas/pam/<nombre>.js, scripts normales)
 *  y las que ya son módulos (MODULOS). */
export const PAGINAS = ['tabla-canjes', 'revisor', 'registro', 'portada', 'temas', 'foro-antiguo'];
/** Fase 8b: el Registro de Roles y el Coloreador ya son módulos (js/paginas/registro/). */
export const MODULOS = { registro: '../paginas/registro/main.js' };

export const urlPagina = p => `js/paginas/pam/${p}.js${V}`;

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
  // Las antiguas, por tandas entre módulo y módulo: las de una tanda a la vez (se descargan en paralelo) y async=false,
  // así se ejecutan en este orden, como dentro de index.html. Si una falla al ejecutarse, las demás siguen, como antes.
  const tanda = ps => Promise.all(ps.map(p => new Promise(listo => {
    const s = doc.createElement('script');
    s.src = urlPagina(p); s.async = false;
    s.onload = () => listo();
    s.onerror = () => { errores.push(urlPagina(p)); listo(); };
    doc.body.appendChild(s);
  })));
  let antiguas = [];
  for (const p of PAGINAS) {
    if (!MODULOS[p]) { antiguas.push(p); continue; }
    await tanda(antiguas); antiguas = [];
    try {
      const m = await importar(MODULOS[p] + V);
      await m.montar(doc.defaultView, { traer });
    } catch (e) { console.error(`[PAM] ${p}:`, e); errores.push(`${p} (${e && e.message || e})`); }
  }
  await tanda(antiguas);
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
