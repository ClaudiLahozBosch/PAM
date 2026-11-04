# Guía del refactor de PAM para agentes de IA

Estado a **4/11/2026**, rama `refactor`, versión **0.6.1** (fase 8b hecha; lista de deseos con los datos oficiales).
Este documento es para un agente de IA (o una persona programadora) que tenga que seguir trabajando en la rama sin haber estado en las sesiones anteriores. Explica qué se reorganizó, cómo funciona ahora, qué errores se corrigieron y dónde, y qué queda. Léelo entero antes de tocar nada.

Documentos relacionados (en este orden de importancia):

| Documento | Para qué |
|---|---|
| `GUIA-AGENTES.md` (este) | Visión completa y técnica. |
| `PENDIENTES.md` | **Fuente única** de errores (F01–F17, R01–R10, N01–N08): estado, fase y prueba de cada uno. Si arreglas algo, se marca ahí. |
| `REFACTOR.md` | El plan y las decisiones, escrito para Hana Park (la dueña de PAM). |
| `RESUMEN-REFACTOR.html` | Resumen visual para quien no programa. |
| `tests/README.md` | Cómo pasar las pruebas y qué fichas se pueden subir. |
| `D:\Avada\PAM-refactor\poc-agente\PROVES-*.md` | Guías de prueba manual en Chrome para el usuario (en catalán). No están en el repositorio. |

---

## 1. Contexto

- **PAM** es la web de herramientas de Hana Park para el foro de rol *HP Avada Kedavra* (foroactivo): Tabla de Canjes, Compendio, Revisor de Empleos y «Mi Ficha», Registro de Roles con la Bóveda, Coloreador de diálogos, temas. Está en GitHub Pages: `https://jesleytherabbit-prog.github.io/PAM/` (repo `jesleytherabbit-prog/PAM`, rama `main`). Hana la edita subiendo archivos desde la web de GitHub, sin herramientas.
- **Mi PJ** (`pam-mi-pj.user.js`, 4.044 líneas) es el script de Tampermonkey que instalan los jugadores: un panel dentro del foro (ficha, bóveda, roles pendientes, misiones, sueldo, oficiales, Biblioteca de oficiales, canjes) que además manejaba PAM desde fuera.
- **Inspector de Canjes** (`pam-inspector-canjes.user.js`, 1.321 líneas): otro script, para los inspectores, que revisa los pedidos del Registro de Canjes.
- Antes del refactor, `index.html` tenía **9.496 líneas** (HTML, CSS, datos y todo el código en una página).
- Usuario de estas sesiones: Claudi (cuenta GitHub `ClaudiLahozBosch`, colaborador del repo de Hana). Programa en otros lenguajes, le gusta la orientación a objetos y el diseño por capas («como un controlador de una API en Java»). La conversación con él es en **catalán**; todo lo que ve el foro o Hana (textos de la interfaz, documentos del repo, commits) va en **castellano** con el voseo que ya usa PAM («Probá», «tenés»).

## 2. Qué es el refactor y sus reglas

**Objetivo:** reorganizar PAM, Mi PJ y el Inspector en módulos, que toda la lógica viva en PAM y que el script instalado quede como un «agente» mínimo. Es un refactor **organizativo**, no una aplicación nueva.

Reglas que no se discuten (decisiones del usuario):

1. **Aspecto idéntico.** Se porta el HTML, el CSS y los textos de antes. Cualquier cambio visual se **propone primero** y se espera el sí. Para comprobarlo hay pruebas que ejecutan el código antiguo y el nuevo con los mismos datos y comparan el HTML.
2. **Sin compilación.** Módulos ES servidos tal cual por GitHub Pages, tipos en JSDoc (`// @ts-check`). No Vite, no TypeScript, no GitHub Actions: Hana tiene que poder seguir subiendo archivos desde la web.
3. **El agente no sabe nada de fichas ni de canjes.** Solo hace lo que PAM no puede hacer desde su dominio (ver §5.3).
4. **Reglas del núcleo** (de la auditoría del 2/11/2026):
   1. Un personaje se identifica por **foro + número de tema** de su ficha; el nombre es solo lo que se muestra.
   2. Una ficha tiene **una o varias partes** (mensajes); de cada una se guarda el número de mensaje, la sección, el BBCode y una huella.
   3. Lo que no se entiende **se conserva y se marca para revisar**; nunca desaparece ni pasa a «nivel 0».
   4. Un canje es una lista de operaciones con identificador: un reintento no duplica mensajes, gastos ni avisos.
   5. Cada edición va **al mensaje concreto** que contiene el dato, con vista previa; se cancela si el mensaje cambió desde que se leyó.
5. **Todo dato del usuario que PAM guarde tiene que viajar con la «Sesión con código»** (ver §5.5). Hay una prueba que lo vigila.
6. **Caracterización antes que reescritura.** Antes de sustituir código antiguo, una prueba carga el código antiguo real y comprueba que el nuevo da lo mismo. Las únicas diferencias permitidas son los errores corregidos, escritas en la propia prueba.
7. **Validar con datos reales** antes de dar algo por cerrado (la ficha real de Irvin destapó seis fallos que la inventada no tenía).

## 3. Repositorio, ramas y staging

- Clon local: `D:\Avada\PAM-refactor\PAM`. Rama de trabajo: **`refactor`**.
- Ramas: `main` = producción (**no se toca**; el refactor solo entra con un pull request que acepte Hana), `antigua` = copia congelada de `main` del 2/11/2026 (`b1dedad`), `refactor` = desarrollo.
- `origin` empuja a **dos sitios**: el repo de Hana y el fork del usuario. El fork publica la rama `refactor` en **https://claudilahozbosch.github.io/PAM/** (staging). Tiene que ser otra cuenta de GitHub: las webs de una misma cuenta comparten dominio y, por tanto, `localStorage`; un staging en la cuenta de Hana vería y podría romper los datos de los jugadores.
- Foro de pruebas: **https://test-forito.foroactivo.com**, cuenta TEST con el personaje de prueba **Elena Whitlock** (ficha `/t5-elena-whitlock`, bóveda `/t8-boveda-999-elena-whitlock`, Registro de Canjes `/t6-registro-de-canjes-de-test`).
- Subir: `GCM_INTERACTIVE=never GIT_TERMINAL_PROMPT=0 git push origin refactor`. Si falla el fork (error transitorio de credenciales), reintentar más tarde y comprobar con `git ls-remote`. **Nunca** pedir ni escribir contraseñas.
- `main` no ha cambiado desde `b1dedad`. **Desde la fase 8a**, un cambio de Hana en el `index.html` de `main` no se puede fusionar solo: hay que llevarlo a mano a su archivo de `js/paginas/pam/`, `css/pam.css` o `data/`.

## 4. Mapa de archivos

```
index.html                 PAM: solo el HTML de la página (197 líneas). Antes, 9.496.
panel.html                 El panel «Mi PJ» (página de PAM que el agente mete en un iframe dentro del foro).
pam-mi-pj.user.js          Mi PJ ANTIGUO, sin tocar (referencia de las pruebas; en la publicación lo sustituye el agente).
pam-inspector-canjes.user.js  Inspector ANTIGUO, sin tocar (ídem).
agente/pam-agente.user.js  El agente nuevo (975 líneas, @name «PAM · Agente (staging)», versión 0.6.0).
css/pam.css               Estilos de PAM (sacados de index.html, sin cambios).
css/registro.css          Estilos del Registro de Roles y del Coloreador (van dentro de su Shadow DOM; 8b).
css/mipj.css              Estilos del panel Mi PJ (sacados del script antiguo por scripts/extraer-css-mipj.py).
data/
  sistema.json            Atributos, habilidades, ventajas, precios, requisitos… una sola vez y con los nombres oficiales.
  arcanos.json            Compendio de arcanos (lo usan PAM, el panel y el Inspector).
  arcanos-calculadora.json, empleos-foro.txt
  foros.json              Configuración de cada foro: registro de canjes, grupos, desarrolladores, foros de ficha,
                          perfil de pruebas, actividad (sueldos, biblioteca), sellos. Editable a mano.
  cierres-oficial.json    Frases que cierran un oficial (R09). Editable a mano; si queda mal, solo deja de detectar cierres.
js/core/                  texto (esc, normalizar…), fechas (F15), Almacen (F11, F14), huella, dom.
js/datos/                 Sistema (data/sistema.json), Compendio (arcanos), cargar (fetch con versión).
js/modelos/               Personaje (id foro+tema), Ficha (ParteFicha, EntradaDesconocida), Trasfondo, Arcano, Boveda,
                          RegistroRoles (validarRegistro: F08).
js/lectores/              LectorFicha (ficha por partes), PartesFicha (partesVigentes: F01/F05), LectorTrasfondo (F02),
                          LectorTema, LectorBoveda (leerSaldos único), LectorPerfil, FechaForo (R09).
js/bbcode/                Etiquetas (bloques y etiquetas de una línea), EditorFicha (editor por bloques y por mensaje).
js/reglas/                Lógica pura, sin leer ni escribir: Combate, Canjes (texto de la petición y respuesta),
                          CambiosFicha (N07), RevisorBoveda, Misiones, Sueldo, Oficiales.
js/servicios/             Hablan con el foro a través del agente: FichaDelForo, BovedaDelForo, ActividadDelForo,
                          BibliotecaDelForo, CanjesDelForo, MiPj, MigracionLegado (lee los datos antiguos, no borra).
js/servicios/agente/      protocolo.js (el contrato) y ClienteAgente.js (postMessage con id y respuesta).
js/paginas/panel/         El panel Mi PJ: main.js, MiPjPanel.js (moduloMiPJ portado), CanjesPanel.js, BibliotecaPanel.js.
js/paginas/pam/           El código ANTIGUO de PAM repartido (fase 8a). Scripts clásicos, no módulos:
                          tabla-canjes, revisor, portada, temas, foro-antiguo.
js/paginas/registro/      Fase 8b: el Registro de Roles y el Coloreador como módulos. main.js (montar), RegistroRoles.js
                          (las pestañas, mismo código), Coloreador.js (+N08), datos.js (listas fijas), deseos.js
                          (datos de la lista de deseos desde los oficiales, 0.6.1) + deseosExtra.js (lo que solo tenía
                          la lista antigua), importarExcel.js (F09), plantilla.html.
js/pam/                   Lo nuevo dentro de PAM:
  arranque.js             Arranca PAM (datos, páginas, nube, puente con el foro, editor nuevo).
  tema-inicial.js         Pone el tema guardado antes de pintar (sin parpadeo).
  main.js                 Si hay agente, crea el controlador.
  ControladorForo.js      Única puerta de entrada de lo que llega del foro.
  PamActual.js            Único archivo que conoce las funciones internas de las páginas antiguas (adaptador).
  CanjesPam.js            Pastilla de canjes en PAM, preparar la petición, cerrar el canje.
  EditorPam.js            «Código para el foro» con el editor nuevo (N07, 0.5.3).
  ui/Puerta.js, ui/estilosPuerta.js   La puerta Aceptar / Denegar dentro de PAM, con el aspecto de la de Mi PJ.
js/nube/                  Sesión con código: pendiente.js (lista ÚNICA de prefijos, script clásico al principio),
                          Nube.js (cifrado y Firestore, F10), Sesion.js (UI copiada), main.js.
js/inspector/             Revision (copiada del Inspector antiguo por script), Tabla (de data/*.json, F12),
                          Inspector, InspectorUI, estilosInspector.
scripts/
  versionar.mjs           Pone ?v=<versión> en todas las direcciones. OBLIGATORIO en cada versión.
  generar-datos.mjs       Generó data/ desde el index.html antiguo (fase 1).
  claves-datos.mjs, extraer-css-mipj.py
tests/                    node:test + jsdom (ver §8).
```

## 5. Cómo funciona ahora

### 5.1 PAM (`index.html`)

1. En el `<head>`: `js/nube/pendiente.js` (aplica, todo o nada, los datos traídos de la nube antes de que nadie lea el `localStorage`), `js/pam/tema-inicial.js` y `css/pam.css`.
2. Al final del `<body>`: **un solo** `<script type="module" src="js/pam/arranque.js?v=…">`.
3. `arranque.js` (`arrancar({doc, fetch, importar})`):
   - trae `data/empleos-foro.txt` y `data/arcanos.json` y los deja como `<script id="empleos-foro">` y `<script id="arcanos-data">`, donde los buscan las páginas antiguas;
   - trae `data/sistema.json` y deja en `window.PAM_EDITOR` el editor nuevo (si falla, solo avisa en consola y PAM usa el antiguo);
   - carga las páginas en el orden original (`PAGINAS = tabla-canjes, revisor, registro, portada, temas, foro-antiguo`). Las de `js/paginas/pam/` son scripts clásicos con `async=false`: se ejecutan en orden y comparten variables globales como cuando estaban en un solo `<script>`. Las que ya son módulos (`MODULOS`, desde la 8b el `registro`) se importan en su sitio y se montan con `montar(ventana, {traer})`; las clásicas se cargan por tandas entre módulo y módulo;
   - después importa `js/nube/main.js` y `js/pam/main.js`;
   - si algo no se puede traer, pinta arriba `.pam-arranque-error`: «No se pudo cargar una parte de PAM (…). Probá recargar la página.».
   - Se ejecuta solo salvo que `globalThis.__pamSinArranque` (lo usan las pruebas).
4. `js/pam/main.js` saluda al agente (`hola`, tres intentos: 0, 1,5 y 4 s). Si no hay agente o el protocolo no es 1, no hace nada y PAM funciona como siempre. Si lo hay, crea `ControladorForo` con `PamActual` y vigila: oficiales llegados de la Biblioteca, la pastilla de canjes, la importación de la ficha.

**Capas dentro de PAM** (diseño pedido por el usuario):
`agente (foro)` → `ControladorForo` (única entrada, comprueba y enseña la puerta) → `CanjesPam` / lógica → `PamActual` (único que toca las páginas antiguas, por sus funciones `window.pamFicha`, `window.rrBoveda`, `window.rrOficiales`, `window.pamCanjes`, `window.showSection`, nunca pulsando botones). En las fases 8b–8e, al reescribir una página se cambia `PamActual` y lo demás sigue igual.

### 5.2 El panel Mi PJ dentro del foro

- El agente crea un `<iframe>` transparente con `panel.html?foro=<origen>&v=<versión>` de PAM, del tamaño exacto que ocupa el panel (`panel.tamano`). Si el panel no pide tamaño en 15 s, el agente enseña al menos la pastilla «✦ Mi PJ» (nunca queda invisible).
- `js/paginas/panel/main.js` lee la configuración (`data/foros.json`, `sistema.json`, arcanos), crea los servicios y pinta `MiPjPanel` (el `moduloMiPJ` del script antiguo portado: mismo HTML, textos, temas y acceso rápido), con las tarjetas de Canjes, Biblioteca, Inspector.
- **Por qué así:** Chrome separa el `localStorage` de un iframe de otro dominio, así que el panel no ve lo que PAM tiene guardado. Lo que tiene que pasar de un lado a otro va por el almacén del agente (Tampermonkey, no particionado). Comprobado en Chrome real (pruebas A–G de la prueba de concepto, 3/11/2026).
- Lo que el panel guarda para sí (`mipj.*`, preferencias) queda en el almacenamiento del iframe; con el Mi PJ antiguo tampoco iba a la nube.

### 5.3 Protocolo agente ⇄ PAM (`js/servicios/agente/protocolo.js`, versión 1)

Mensajes `postMessage`: petición `{ pam: 1, de, id, tipo, datos }`, respuesta `{ pam: 1, de, re: id, ok, resultado | error }`. El agente solo acepta mensajes del origen de PAM; PAM solo acepta agentes en los foros de `FOROS`.

| Tipo | Dirección | Qué hace |
|---|---|---|
| `hola` | PAM → agente | Versión del agente, protocolo, foro, cuenta `{id, nombre}`, ruta, tamaño de ventana y `hash` con el que se abrió la página (`#escriba-…`, que el agente quita de la dirección). |
| `foro.leer {ruta}` | PAM → agente | Lee una página del foro con la sesión del jugador. Solo rutas del propio foro. |
| `foro.ir {ruta}` | PAM → agente | Lleva la pestaña del foro a otra ruta del mismo foro. |
| `foro.puerta {titulo, explicacion, avisos, pasos, enlaceFinal?}` | PAM → agente | La puerta del Escriba (Aceptar / Modificar / Denegar) con varios pasos `publicar` o `editar`, diferencias por mensaje, «enlace del paso n», pasos `omitido`, anti-duplicados (busca el mensaje propio antes de publicar). Devuelve el estado de cada paso. |
| `foro.publicar`, `foro.editar` | PAM → agente | La misma puerta con un solo paso. |
| `almacen.leer/guardar {clave, valor}` | PAM → agente | Almacén de Tampermonkey, solo claves `pam.*`, máximo 2 MB. |
| `almacen.legado` | PAM → agente | Todo lo que guardaba el Mi PJ antiguo (mismo almacén) para pasarlo al formato nuevo. |
| `panel.tamano`, `panel.tema` | PAM → agente | Tamaño del iframe; tema de las puertas. |
| `foro.oficial` | PAM → agente | Pinta la barra «Este oficial» en el tema de un oficial. |
| `inspector.pintar / quitar` | PAM → agente | Pinta (limpio de scripts, en una caja propia) la barra y la revisión del Inspector bajo cada pedido. |
| `pam.abrir {hash, mensaje?}`, `pam.enviar` | PAM → agente | Abre PAM en otra pestaña y le reenvía un mensaje hasta que conteste («Enviar a PAM»: el receptor de `index.html` solo acepta datos que vengan del origen del foro). |
| `editor.revisar {texto, ruta}` | agente → PAM | «Antes de publicar»: PAM revisa el texto del editor del foro (bóveda) y devuelve avisos. |
| `ventana.cambio` | agente → PAM | Cambió el tamaño de la ventana del foro. |
| `pam.cierre {hecho}` | agente → PAM | La pestaña de PAM terminó de cerrar el canje (`escribaCierre`). |
| `inspector.accion`, `oficial.cuarto`, `oficial.abierta` | agente → PAM | Clics en la caja del Inspector y en la barra «Este oficial». |

Claves de paso en el almacén del agente: `pam.oficiales` (Biblioteca → PAM), `pam.peticion`, `pam.aprobacion` (canjes), `pam.cuentas.<foro>.<id>` (peticiones de cada cuenta; las antiguas `cuentas.<foro>.<id>` se copian la primera vez).

### 5.4 Flujo de un canje (fase 6b, con N07)

1. **En PAM** (`CanjesPam.js`): el jugador llena el carrito de la Tabla de Canjes. La pastilla de canjes lleva a «Preparar el canje»: PAM guarda `previa = fichaEnMemoria()`, ejecuta «Traer de la calculadora» y calcula `cambiosFicha = cambiosDeCanje(plantilla.base || previa, ahora)` (`js/reglas/CambiosFicha.js`: el delta entre la ficha importada del foro y la ficha con el carrito, recortado). La petición (`pam.peticion`) lleva el texto, la bóveda preparada y `cambiosFicha`, no el código entero de la ficha.
2. **En el foro** (`CanjesPanel.js` + `CanjesDelForo.js`): la tarjeta «⚖ Canjes» publica la petición en el Registro de Canjes (puerta del agente) y encuentra la respuesta del Inspector.
3. **Aplicar el canje aprobado**: la puerta del agente con estos pasos: primer mensaje de la bóveda (grageas actuales y totales), el movimiento (con enlaces a petición y aprobación), **la ficha** y el aviso en la ficha. Para la ficha (`pasosFichaPorMensajes`): lee la ficha del foro **tal como está ahora**, todas sus partes (`leerFichaDelForo`), le aplica `aplicarCanje` (solo sube o añade, idempotente con `max`) y `EditorFicha`, y genera **un paso por cada mensaje que cambia**. Al final comprueba releyendo; lo que no queda va a los avisos. Lo que ya está hecho sale «Ya está igual»; lo imposible, «No se hará». Las peticiones antiguas (con `pet.ficha`) siguen el camino de antes.
4. **«Terminar en PAM»**: el agente deja `pam.aprobacion` y abre PAM; PAM cierra el canje (Bóveda), **vacía el carrito** (R08), marca la petición como cerrada y avisa a la pestaña del foro (`escribaCierre` → `pam.cierre`); el panel le reenvía los datos releídos (`pam.enviar`).

### 5.5 Dónde se guardan los datos

- **`localStorage` de PAM** (sin cookies). Claves de Hana sin cambios. Nueva desde 0.5.1: `grimorio.canjes` (estado de la Tabla de Canjes).
- **Sesión con código** (`PAM-XXXX-…`): foto de las claves con prefijo **`grimorio.`, `grimorioAvadense.`, `revisorEmpleos.`, `registro-roles-v1`, `cd_`** (menos `cd_bg`), cifrada en el navegador (AES-GCM, llave del código) y subida a Firestore `pam-avadense` cada 4 s y al cambiar de pestaña. La lista (`PRE`/`EXC`) está **una sola vez**, en `js/nube/pendiente.js`. **Norma:** todo dato nuevo del usuario va con uno de esos prefijos o no viajará. `tests/unit/sesion-codigo.test.mjs` comprueba que nadie copia la lista y que el código nuevo no escribe en el `localStorage` de PAM por su cuenta (solo las páginas antiguas, que están en la lista blanca `ANTIGUAS`).
- **Almacén de Tampermonkey** (`pam.*`): lo que va de paso entre el foro y PAM. No va a la nube y no tiene que ir.
- **Cuidado con el staging:** tiene su propio `localStorage`, pero un código de sesión real escribe en **la misma nube que producción**. Para probar, un código nuevo solo de pruebas.
- La Bóveda de PAM (Registro de Roles) guarda con 700 ms de retraso, aunque desde la 8b también al cerrar o esconder la página (F14): léela con `rrBoveda.get`, no del `localStorage`.
- Desde la 8b, el Registro y el Coloreador guardan con el `Almacen` (`Almacen.de(ventana)`). El Coloreador añade `cd_pj.<id>` (N08). `cd_bg` (fondo de la vista previa) se queda fuera de la sesión a propósito, como antes.

### 5.6 El Inspector (fase 6c)

- Pasa a PAM y al mismo agente. `Revision.js` es la revisión antigua copiada por script, con tres cambios: lee el foro con el agente, partes de la ficha con `partesVigentes` (F05), Puntos de Destino de dos cifras (F06) y el `leerSaldos` compartido (F17). `Tabla.js` arma la Tabla de Canjes desde `data/*.json` (F12) y la prueba comprueba que es idéntica, nombre por nombre, a la que sacaba de `index.html`.
- Quién lo ve: la tarjeta «🔍 Inspector de Canjes» del panel solo para el grupo Inspectores de Canjes y las cuentas de `desarrolladores` en `data/foros.json` (Hana Park, Mortimer Gaunt, Robert Stevenson); en el foro de pruebas, todas.
- Cambio visual aprobado: la pastilla «✦ Inspector» va abajo a la **izquierda** (tapaba la de Mi PJ).

## 6. Fases hechas

| Fase | Versión / commit | Contenido |
|---|---|---|
| Prueba de concepto | `85ca010` | Agente mínimo y panel en iframe. Probado en Chrome (A–G): el panel recibe los datos a través del agente. |
| 0–1 | `ebb4503` | Pruebas de caracterización (`tests/legado/cargarPam.mjs`). `data/sistema.json` generado de `index.html` y reconciliado con los documentos oficiales (Esquivar, Volar, Seducir…). `core/`: texto, fechas (F15), Almacen (F11, F14). |
| 2 | `6b331f5` | Modelos: Personaje (foro+tema, F03), Ficha por partes, Trasfondo con identidad, Arcano con descripción, Bóveda dentro del personaje, `validarRegistro` (F08). `MigracionLegado.leerLegado` (solo lee). |
| 3 | `e737f68`, `5beb0ab` | Lectores: ficha por partes (F01, F05), trasfondos (F02), PD (F06), rituales (R05), descripciones (R04). Validado con la ficha real de Irvin Giles (5 partes, 64/64 trasfondos). |
| 4 | `39056f2` | `EditorFicha`: por bloques y por mensaje (R01, R02, R03, R06, F04/F07). Cada cambio se valida releyendo y con equilibrio de etiquetas; si no cuadra, se deshace y va a «a mano». |
| 5a–5d | 0.2.0–0.3.5 | Agente definitivo y panel servido por PAM con el aspecto antiguo (0.3.0); versionado anti-caché (0.3.1); revisión de bóveda antes de publicar (5b); roles, misiones, sueldo, oficiales, R09, R10 (5c, 0.3.4 con `cierres-oficial.json`); Biblioteca de oficiales (5d). |
| 6a | 0.3.6 | «Enviar a PAM», tema y oficiales a PAM (`pam.abrir`; `FOROS_PRUEBA`). Primera versión de `ControladorForo` / `PamActual` / `Puerta`. |
| 6b·1–3 | 0.3.7–0.3.9 | Canjes: pastilla y preparar en PAM, carrito N04; tarjeta, petición y respuesta en el foro; aplicar y «Terminar en PAM». |
| 6c | 0.4.0 | Inspector de Canjes en PAM (F05, F06, F12, F17 parcial). |
| 7 | 0.4.1 | Sesión con código fuera de `index.html`: F10 (precondición `updateTime`), F11 (todo o nada). Mismo documento en Firestore: convive con el PAM de `main`. |
| 8a | 0.5.0 | `index.html` repartido en archivos sin cambiar el código (§5.1). |
| R08 | 0.5.1 | La Tabla de Canjes se guarda; el carrito se vacía al cerrar el canje. |
| N07 | 0.5.2, 0.5.3 | Canjes editan la ficha mensaje a mensaje con el editor nuevo; «Código para el foro» de Mi Ficha con el editor nuevo. |
| 8b | 0.6.0 | Registro de Roles y Coloreador como módulos (`js/paginas/registro/`), separados por piezas: estilos, HTML, listas fijas, datos de la lista de deseos e Importar Excel en sus archivos; las pestañas con el mismo código. F14, F09, N08, F15 (fechas de ejemplo). Quitado el modo «Guardado en tu cuenta» (código que solo funcionaba en otra aplicación). |

## 7. Correcciones (resumen; el detalle está en `PENDIENTES.md`)

| ID | Qué fallaba | Cómo quedó | Dónde | Prueba |
|---|---|---|---|---|
| F01 | Mi PJ leía solo el primer mensaje de la ficha. | Ficha por partes: los mensajes seguidos del dueño al principio del tema. | `PartesFicha.partesVigentes`, `LectorFicha` | `lector-ficha`, `ficha-real-local` |
| F02 | Trasfondos «Tipo NIVEL: categoría» descartados sin aviso. | Se leen todos los formatos. | `LectorTrasfondo` | `trasfondos` |
| F03 | Personaje por nombre («Irvin Giles.» ≠ «Irvin Giles»). | Por foro + tema; el nombre solo sugiere. | `Personaje`, `asociarPersonaje` | `modelos`, `ficha-del-foro` |
| F04/F07 | Los canjes editaban siempre el primer mensaje; niveles «número + nombre» no encajaban. | Cada dato sabe su mensaje; se edita solo ese. | `EditorFicha`, `CanjesDelForo` | `editor`, `canjes-ficha-mensajes` |
| F05 | El Inspector tomaba como ficha cualquier mensaje largo del dueño. | La misma regla que F01. | `Revision.js` | `inspector` |
| F06 | «Puntos de Destino: 13» se leía como 1. | Número completo. | `LectorFicha`, `Revision.js` | `inspector` |
| F08 | El color del Registro de Roles entraba sin escapar al importar (inyección). | `validarRegistro()` comprueba cada valor. | `modelos/RegistroRoles.js` | `modelos` |
| F10 | Dos dispositivos se pisaban en la nube. | Guardado con versión; si otro guardó, aviso «Traer / Guardar los de acá». | `js/nube/Nube.js` | `sesion-nube` |
| F11 | Traer de la nube borraba todo antes de escribir; fallo a medias = estado parcial. | Todo o nada; si no cabe, queda como estaba y avisa. | `Almacen.restaurar`, `js/nube/pendiente.js` | `core`, `sesion-nube` |
| F12 | El Inspector ejecutaba trozos de `index.html` con `new Function()`. | Tabla desde `data/*.json`. | `js/inspector/Tabla.js` | `inspector-tabla` |
| F13 | Mi PJ manejaba PAM pulsando sus botones. | Agente + protocolo + `PamActual`. | `js/pam/` | `pam-controlador`, `canjes-pam` |
| F15 | Fecha en UTC (día anterior de madrugada). | Día local. | `core/fechas.js` | `core`, `fechas-argentina` |
| F17 (parcial) | `leerSaldos` copiado en Mi PJ e Inspector; CSS repetido. | Un solo `leerSaldos`; estilos de PAM en `css/pam.css`. Queda ordenar el CSS (8e). | `LectorBoveda` | `boveda` |
| R01 | Línea nueva fuera de su desplegable o `[/spoiler]` duplicado. | Dentro del bloque, antes de cierres ajenos. | `EditorFicha` | `editor`, `codigo-foro` |
| R02 | Quitar el último elemento se llevaba el `[/spoiler]`. | Los cierres se quedan; bloque vacío con «-». | `EditorFicha` | `editor`, `codigo-foro` |
| R03 | Arcanos nuevos del mismo nivel en orden inverso. | En orden. | `EditorFicha` | `editor`, `codigo-foro` |
| R04 | Arcanos nuevos sin descripción. | El lector guarda la descripción de todos. | `LectorFicha` | `lector-ficha` |
| R05 | Rituales «Nombre \| Latín» renombrados y luego no encontrados. | Nombre como en la ficha, enlace al Compendio por id. | `LectorFicha`, `Compendio` | `lector-ficha` |
| R06 | «Otros» (idiomas, trasfondos, ventajas, especializaciones, talentos, títulos) siempre a mano, y «Agregado» aunque quedara mal. | Se hacen solos y se comprueban releyendo. | `EditorFicha`, `CambiosFicha` | `editor`, `codigo-foro` |
| R07 | Datos del sistema duplicados con nombres distintos; tres listas de personajes. | `Sistema` único; `leerLegado` une por id. Las páginas antiguas de PAM aún usan sus datos (8c). | `datos/Sistema.js`, `MigracionLegado` | `datos` |
| R08 | La Tabla de Canjes no se guardaba (la bóveda llegaba a 0). | `grimorio.canjes` (viaja con la sesión); carrito vacío al cerrar un canje. | `tabla-canjes.js` («buscar R08»), `PamActual.vaciarCarrito` | `canjes-guardado` |
| R09 | Oficiales cerrados salían abiertos con fechas sin año. | Año por el día de la semana; cierres por frases de `data/cierres-oficial.json`. | `FechaForo`, `reglas/Oficiales` | `actividad` |
| R10 | (Mejora) ocultar un oficial. | ✕ como en «Te toca responder». | `MiPjPanel` | `actividad` |
| N04 | Carrito de trasfondos: duplicados y subidas sin juntar. | Nivel actual de ficha + carrito; subidas juntas; orden fijo. | `tabla-canjes.js` («buscar N04») | `carrito-n04` |
| N07 | Los canjes y «Código para el foro» usaban el «Personalizada» antiguo (R01–R03, F04/F07). | Editor nuevo en los dos (§5.4, §5.1). | `CambiosFicha`, `CanjesDelForo`, `EditorPam`, `revisor.js` («buscar N07») | `canjes-ficha-mensajes`, `codigo-foro` |

| F14 | El Registro de Roles guardaba a los 0,7 s y no al cerrar la página: se podía perder el último cambio. | Guarda con el almacén, también al cerrar o esconder la página. | `js/paginas/registro/main.js`, `Almacen` | `registro` |
| F09 | «Importar desde Excel» usaba SheetJS 0.18.5 (dos fallos de seguridad conocidos). | SheetJS 0.20.3 de cdn.sheetjs.com. | `js/paginas/registro/importarExcel.js` | `registro` |
| N08 | El Coloreador tenía una sola configuración para todos los personajes. | Recuerda la última de cada personaje de Mi Ficha (`cd_pj.<id>`). | `js/paginas/registro/Coloreador.js` | `registro` |

| R07 (lista de deseos) | La lista de deseos del Registro tenía su propia copia de los datos del sistema, distinta de la oficial (nombres, orden, faltaban 5 objetos avanzados y 3 legendarios). | Sale de los datos oficiales y de los inventados del Compendio; lo que solo tenía ella, de `deseosExtra.js`. Nada se pierde. | `js/paginas/registro/deseos.js` | `registro` |

**Sin corregir:** F16 (8d), F17 resto (8e), R07 en las páginas de PAM (8c), N01, N03, y las mejoras N02, N05, N06 (ver §11).

## 8. Cambios dentro del código antiguo de Hana

Las páginas de `js/paginas/pam/` son el código de `index.html` **copiado por script sin tocar una letra** (fase 8a), salvo estos cambios, todos marcados con un comentario y anunciados en la cabecera del archivo:

| Archivo | Cambio | Por qué |
|---|---|---|
| `foro-antiguo.js` | `FOROS_PRUEBA = ["https://test-forito.foroactivo.com"]` también puede mandar «Datos del foro → PAM» (siempre con Aceptar / Denegar). | Probar en el foro de pruebas (6a). |
| `revisor.js` | `window.pamFicha` gana `traerCalculadora`, `llevarCalculadora`, `codigoPersonal` (aditivas: lo que hacen los botones). | Que los canjes no pulsen botones (F13, 6b). |
| `revisor.js` | `actualizarCodigo` usa `window.PAM_EDITOR` si está; si no o si falla, el antiguo (`actualizarCodigoAntiguo`). | N07 (0.5.3). |
| `registro-roles.js` (desde la 8b, `js/paginas/registro/RegistroRoles.js`) | `window.rrBoveda` gana `preparar` y `cerrar` (aditivas). | Canjes (6b). |
| `js/paginas/registro/` | Lo que cambia respecto al código antiguo está marcado con «8b» en cada archivo: la ventana se recibe como parámetro (`const window = w, document = w.document…`, para poder montarlo en las pruebas), guardado con el almacén, fechas locales, sin el modo «Guardado en tu cuenta», SheetJS nuevo y N08. | Fase 8b. |
| `tabla-canjes.js` | Carrito de trasfondos (N04); guardado `grimorio.canjes` y `window.pamCanjes.vaciarCarrito` (R08). | 6b·1 y 0.5.1. |
| `index.html` | Solo HTML; los `<script>` y el `<style>` pasan a archivos (8a). | Fase 8a. |

**Cambios visibles para el usuario en todo el refactor:** pastilla del Inspector a la izquierda; el mensaje de error de arranque; el comportamiento del carrito (N04) y que la Tabla de Canjes se recuerde (R08); el texto de la nota de «Preparar el canje»; al aplicar un canje, un paso de la puerta por cada mensaje de la ficha que cambia (antes, un solo paso con el código «Personalizada»). La tarjeta de canjes, las puertas y el flujo petición → aprobación → aplicar → terminar ya existían en Mi PJ, con el mismo aspecto y los mismos textos. Nada más debería verse distinto: si ves una diferencia no listada, es un error.

## 9. Pruebas

```
cd tests && npm install   # la primera vez
npm test                  # 221 pruebas: 220 pasan, 1 se salta (la de la ficha real de Irvin, sin la variable)
PAM_FICHA_IRVIN="C:\ruta\Irvin Giles.htm" npm test   # con la ficha real (no está ni puede estar en el repo)
```

- `unit/`: piezas nuevas sueltas. `caracterizacion/`: comparan lo nuevo con el código antiguo real. `agente/`: el agente en jsdom.
- **`tests/legado/montarPam.mjs` (`pamEntero()`)** vuelve a juntar `index.html` + `css/pam.css` + `data/` + `js/paginas/pam/*` en el HTML único de antes. Lo usan `cargarPam`, `inspector`, `inspector-tabla` y `canjes-pam`.
- **`tests/legado/cargarPam.mjs`** carga ese PAM en jsdom y expone `global(expr)` y `ficha(expr)` (evalúa dentro del IIFE de Mi Ficha). Hace falta un `requestAnimationFrame` falso y `cerrarPam()`, o node no termina.
- **`arranque.test.mjs`** arranca PAM desde los archivos (con un `ResourceLoader` que sirve el disco en una URL `https://jesleytherabbit-prog.github.io/PAM/`, porque jsdom con `file:` no tiene `localStorage`) y junto, con `Date.now` fijo y `Math.random` determinista, y compara la página, lo que PAM deja para el foro y cinco secciones. También que exista `PAM_EDITOR`.
- **Desde la 8b, `tests/legado/abrirPam.mjs`** (`abrir('archivos'|'junto', {antes})`, `pagina`, `igual`): abre PAM nuevo y antiguo con los mismos datos; en «archivos» monta de verdad los módulos de páginas (en Node, con la ventana de jsdom: por eso los módulos de páginas reciben la ventana como parámetro y no tocan globales). **`tests/legado/paginas/`** guarda las copias congeladas de las páginas reescritas (hoy `registro-roles.js`), que `montarPam.mjs` usa para el PAM antiguo. **`registro.test.mjs`** compara las pestañas del Registro y el Coloreador (con datos de ejemplo y con un registro guardado), al usarlos y lo guardado.
- **`panel-mipj.test.mjs`** ejecuta el `pam-mi-pj.user.js` antiguo entero en jsdom con los mismos datos y compara el HTML del panel.
- **`tests/fixtures/actividad/foro.mjs`** y `profeta.mjs`: un foro inventado que leen el script antiguo y PAM.
- **`tests/legado/sin-version.mjs`**: hook de `node --import` para cargar módulos con `?v=`.
- **Fixtures:** solo recortadas, sin tokens ni cabeceras, de personajes con permiso (Mortimer, en `tests/fixtures/fichas/mortimer-compacta.bbcode`) o inventados (`varias-partes.json`). **Nunca** `Irvin Giles.htm` (lleva tokens de sesión y es de otro jugador).
- **Banco local** (fuera del repo): `node D:\Avada\PAM-refactor\banc\servidor.mjs D:\Avada\PAM-refactor\PAM 8765` sirve un foro falso con el agente real (constantes cambiadas) y PAM en `/PAM/index.html`. Sirve para ver en un navegador real lo que jsdom no ve (iframes, tamaños, caché). Un archivo `romper` al lado simula un módulo roto.
- Límite conocido: el editor no se ha probado con el BBCode real de una ficha de varias partes (solo Mortimer, una parte, y la inventada de cinco).

## 10. Cómo se publica una versión en la rama

1. Subir `@version` y `VERSION` en `agente/pam-agente.user.js`.
2. `node scripts/versionar.mjs`: pone esa versión en imports, CSS, datos, páginas de `arranque.js` (`const V`), `index.html`, `panel.html` y la URL del iframe. **Sin esto, GitHub Pages (caché de 10 min) mezcla módulos de dos versiones y el panel no arranca.**
3. `sed -i s/<vieja>/<nueva>/g tests/agente/agente.test.mjs`.
4. `cd tests && npm test`.
5. Actualizar `PENDIENTES.md` (y `REFACTOR.md` si cambia el plan), commit en castellano, push a los dos remotos.
6. Actualizar la guía de pruebas del usuario en `poc-agente/PROVES-*.md` si cambia lo que tiene que probar.

## 11. Próximos pasos (en orden)

1. **Pruebas manuales del usuario en Chrome** con el agente 0.6.0 (staging + test-forito): `PROVES-5c`, `6b1`, `6b3` (canje entero con Elena), `6c`, `7` (con un código de sesión nuevo de pruebas, dos ventanas), `8a` y `8b`. Las de 5a, 5b, 5d y 6a ya pasaron. Lo que salga, se corrige antes de seguir.
2. ~~Fase 8b~~ hecha (0.6.0).
3. **Fase 8c · Revisor de Empleos y Mi Ficha:** separar por piezas como la 8b (copia congelada en `tests/legado/paginas/`, módulo con `montar(ventana, {traer})`, prueba que compara las pestañas con `tests/legado/abrirPam.mjs`); usar `data/sistema.json` y los lectores compartidos (**R07** en la parte de PAM); el «Personalizada» antiguo puede desaparecer cuando el nuevo esté probado. (La lista de deseos del Registro ya usa los datos oficiales desde la 0.6.1.)
4. **Fase 8d · Tabla de Canjes y Compendio:** que no repinte todo por cualquier cambio (**F16**).
5. **Fase 8e · Portada, temas y CSS:** estilos por página y sin repetir (**F17**); `PamActual` pasa a las páginas nuevas.
6. **N03** («Tus otras cuentas»): no mostrar cuentas inactivas ni temas cerrados. Antes, **mirar en el foro real** cómo marca una cuenta inactiva y un tema cerrado; no suponerlo.
7. **N01** (reglas de Firestore: que no se pueda listar ni borrar documentos ajenos): solo con permiso de Hana; no tocar ni sondear su Firestore sin él.
8. Mejoras apuntadas: **N05** (icono animado mientras escanea la Biblioteca: cambio visual pedido), **N02** (más listas editables en `data/`), **N06** (escaneo por partes, por decidir tras medir).
9. Revisar si el editor puede trabajar con el HTML publicado de una ficha, y probarlo con el BBCode de una ficha real de varias partes.

### Para publicar en `main` (al final)

- Pull request de `refactor` a `main`, que acepta Hana. Antes, llevar a la rama lo que Hana haya cambiado en `main`.
- El agente pasa a `pam-mi-pj.user.js` con el **mismo `@name` y `@namespace` que Mi PJ** y un `@version` mayor: Tampermonkey lo actualiza solo y conserva los datos (el panel los migra con `almacen.legado`). Cambiar `PAM.origen` del staging a la web de Hana y quitar el `@match` del staging.
- **Por hacer:** que PAM avise «actualizá el script» si el agente es de otra versión (hoy, si el protocolo no coincide, simplemente no hace nada).
- Los Inspectores tienen que **desinstalar el script antiguo del Inspector** (si no, verán dos barras).
- Marcha atrás: «Revert» del pull request; la migración no borra datos antiguos.

## 12. Trampas conocidas

- **jsdom no ve problemas de navegador real** (iframes, tamaños, caché, ventanas). Antes de subir cambios de interfaz, mirarlo en el banco local.
- **Caché de GitHub Pages:** si olvidas `versionar.mjs`, el panel puede quedar invisible para los jugadores durante 10 minutos.
- **El navegador integrado de la app no abre ventanas nuevas:** «Enviar a PAM» y «Terminar en PAM» solo se pueden probar en Chrome.
- **Heredocs y `node -e` en la shell se comen las barras invertidas** de las expresiones regulares: editar archivos con la herramienta de edición, no con heredocs.
- **El lector no detecta por sí solo una línea fuera de su spoiler** (no reinicia la sección al cerrar un spoiler): revisar el BBCode generado a ojo además de releerlo.
- `EditorFicha` inserta en orden alfabético dentro de cada grupo: tenerlo en cuenta en las expectativas de las pruebas.
- El código antiguo de las páginas es global y compartido: no lo conviertas en módulo hasta su subfase de la fase 8, y cuando lo hagas, mira qué espera `PamActual`.

## 13. Normas de trabajo con este usuario

- **Contraseñas:** nunca pedirlas ni escribirlas; el usuario inicia sesión él mismo.
- **Foro:** solo lectura con la cuenta del usuario. Nada se publica ni se edita sin una orden explícita. No ejecutar código externo en la pestaña del foro con sesión.
- **Las pruebas en Chrome las hace el usuario.** Se le prepara una guía `PROVES-*.md` (en catalán). El navegador integrado solo para el banco local.
- **`main` no se toca.** La Firestore de Hana tampoco sin permiso.
- **Cambios visuales:** proponerlos antes. **Diagnosticar** la causa antes de cambiar de enfoque.
- Ir **por partes**, explicar y consultar antes de cambios grandes; marcar cada arreglo en `PENDIENTES.md` con su prueba y su commit.
