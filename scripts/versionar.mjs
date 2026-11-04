// Pone la versión del agente en todas las direcciones del panel, para que el navegador nunca mezcle archivos
// de dos versiones (GitHub Pages los guarda 10 minutos: si main.js es nuevo y MiPj.js viejo, el panel no arranca).
//   · cada «import … from './x.js'» de js/ pasa a «'./x.js?v=VERSION'»;
//   · panel.html: main.js y mipj.css con ?v=VERSION; index.html: pendiente.js, tema-inicial.js, css/pam.css y arranque.js con ?v=VERSION;
//   · js/pam/arranque.js: const V (los datos y los módulos de las páginas que monta);
//   · js/datos/cargar.js: los JSON con ?v=VERSION;
//   · el agente pide panel.html?…&v=VERSION.
// Uso (antes de subir): node scripts/versionar.mjs
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const agente = readFileSync(path.join(RAIZ, 'agente/pam-agente.user.js'), 'utf8');
const VERSION = agente.match(/var VERSION = '([^']+)'/)[1];

const cambiar = (f, fn) => { const p = path.join(RAIZ, f), a = readFileSync(p, 'utf8'), b = fn(a); if (a !== b) { writeFileSync(p, b); return 1; } return 0; };
const v = `?v=${VERSION}`;
let n = 0;

// 1. imports relativos de js/
const archivos = d => readdirSync(d).flatMap(x => { const p = path.join(d, x); return statSync(p).isDirectory() ? archivos(p) : p.endsWith('.js') ? [p] : []; });
for (const p of archivos(path.join(RAIZ, 'js'))) {
  n += cambiar(path.relative(RAIZ, p), s => s.replace(/(\bfrom\s*['"])(\.{1,2}\/[^'"?]+\.js)(?:\?v=[^'"]*)?(['"])/g, `$1$2${v}$3`));
}
// 2. panel.html
n += cambiar('panel.html', s => s.replace(/(src="js\/paginas\/panel\/main\.js)(?:\?v=[^"]*)?"/, `$1${v}"`).replace(/(href="css\/mipj\.css)(?:\?v=[^"]*)?"/, `$1${v}"`));
// 2b. index.html: el arranque de js/pam/ y los de la sesión con código (js/nube/)
// (desde la fase 8a: la sesión, el tema, los estilos y el arranque; el arranque carga lo demás con su V)
n += cambiar('index.html', s => s.replace(/(src="js\/(?:nube\/pendiente|pam\/tema-inicial|pam\/arranque)\.js)(?:\?v=[^"]*)?"/g, `$1${v}"`)
  .replace(/(href="css\/pam\.css)(?:\?v=[^"]*)?"/, `$1${v}"`));
n += cambiar('js/pam/arranque.js', s => s.replace(/const V = '[^']*';/, `const V = '${v}';`));
// 3. datos
n += cambiar('js/datos/cargar.js', s => s.replace(/const VERSION_DATOS = '[^']*';/, `const VERSION_DATOS = '${VERSION}';`));
// 4. el agente
n += cambiar('agente/pam-agente.user.js', s => s.replace(/'panel\.html\?foro=' \+ encodeURIComponent\(location\.origin\)(?: \+ '&v=[^']*')?/, `'panel.html?foro=' + encodeURIComponent(location.origin) + '&v=${VERSION}'`));
console.log(`versión ${VERSION}: ${n} archivos cambiados`);
