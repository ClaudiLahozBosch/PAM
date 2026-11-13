// @ts-check
// Arranque de la «Sesión con código» en PAM (index.html). La lista de lo que viaja y los datos traídos de la nube ya los
// puso js/nube/pendiente.js al principio de la página (window.PAM_SESION).
import { crearNube } from './Nube.js?v=2.1.0';
import { iniciarSesion } from './Sesion.js?v=2.1.0';

const claves = /** @type {any} */ (window).PAM_SESION;
if (claves) iniciarSesion({ doc: document, win: window, nube: crearNube(), claves });
else console.error('[PAM] Falta js/nube/pendiente.js: la sesión con código no arranca.');
