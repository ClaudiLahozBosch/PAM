# Rama `refactor`: PAM por módulos y Mi PJ como agente mínimo

Esta rama es para preparar una versión reorganizada de PAM y de «Mi PJ» sin tocar la que está en uso.
**Nada de lo que hay aquí se publica en tu web:** GitHub Pages sigue sirviendo solo `main`, y `main` no cambia.

> **Resumen fácil de leer:** [`RESUMEN-REFACTOR.html`](https://claudilahozbosch.github.io/PAM/RESUMEN-REFACTOR.html) (qué cambió, qué se arregló y qué falta, sin tecnicismos).
> **Para una IA que vaya a trabajar en la rama:** [`GUIA-AGENTES.md`](GUIA-AGENTES.md) (todo el detalle técnico).

## Las tres ramas

| Rama | Qué es | ¿Se toca? |
|---|---|---|
| `main` | **La web de verdad** (jesleytherabbit-prog.github.io/PAM). Lo que entra aquí lo ven todos al momento. | Como siempre: tú subes archivos aquí. El refactor solo entra con un pull request que tú aceptes. |
| `antigua` | Copia de cómo estaba `main` el 2 de noviembre de 2026, antes de empezar el refactor. | **No.** Es solo para consultar o para volver atrás si hiciera falta. |
| `refactor` | Donde se va haciendo la versión nueva. | Sí, aquí se trabaja. No se publica en tu web. |

## Dónde se prueba (staging)

La rama `refactor` se publica en una copia aparte: **https://claudilahozbosch.github.io/PAM/** (fork en la cuenta de Claudi). Las pruebas del foro se hacen en el foro de pruebas test-forito.

Tiene que ser en otra cuenta. En GitHub Pages, todas las webs de una misma cuenta comparten dominio (`jesleytherabbit-prog.github.io`) y, por tanto, comparten los datos guardados en el navegador. Una versión de pruebas en tu cuenta vería, y podría estropear, las fichas que los jugadores tienen guardadas en PAM. En otra cuenta, los datos quedan totalmente separados.

## Qué hay ahora en la rama

- Tus archivos (`index.html`, `pam-mi-pj.user.js`, `pam-inspector-canjes.user.js`), tal cual están en `main`.
- `poc-agente/`: una prueba de concepto pequeña (unas 650 líneas en total) para comprobar en Chrome la idea central antes de reorganizar nada.
- Este documento.

## La idea

1. **PAM pasa a ser varios archivos (módulos de JavaScript)** en vez de uno de 9.500 líneas. Sin herramientas ni compilación: GitHub Pages los sirve tal cual y se pueden seguir subiendo desde la web.
2. **Todo lo que se pueda pasa de los scripts a PAM.** El script que instalan los jugadores (y también el del Inspector) queda como un «agente» que solo hace lo que PAM no puede hacer desde su dominio:
   - leer páginas del foro con la sesión del jugador (solo rutas del propio foro);
   - publicar o editar, siempre después de su propia ventana Aceptar / Modificar / Denegar;
   - guardar datos compartidos entre el foro y PAM (almacén de Tampermonkey);
   - mostrar el panel de PAM dentro del foro (un iframe);
   - pasarle a PAM el texto del editor del foro para que lo revise antes de enviar.
3. **Un protocolo de mensajes pequeño y con número de versión** reemplaza a `window.pamFicha`, `pamPjs`, `rrBoveda`, `rrSync`, etc. El agente no sabe nada de fichas ni de canjes. Las correcciones llegan a todos al publicar PAM, sin reinstalar el script.

Algunos ejemplos de lo que motiva el cambio:
- los datos del sistema están dos veces y con nombres distintos («Esquivar» / «Esquiva», «Volar» / «Vuelo»…);
- hay tres listas de personajes;
- `esc` está definida siete veces;
- unas 460 líneas de Mi PJ manejan PAM tocando su página por dentro (`#panel-resumen .summary-box`, `#bovForm`…).

## Estructura propuesta

```
index.html        PAM completo        panel.html   panel de Mi PJ dentro del foro
css/              estilos por página
data/             sistema.json (atributos, habilidades, precios… una sola vez), arcanos.json
js/core/          router, eventos, almacén con versión y migración, utilidades de DOM y texto
js/modelos/       Personaje, Arcano, Trasfondo, Canje, Boveda, Empleo
js/reglas/        Precios, Combate, Requisitos (lógica pura, con pruebas)
js/servicios/     personajes y bóveda, BBCode (lector y plantillas, editor personalizado por bloques),
                  agente (protocolo), lectores del foro, sincronización en la nube
js/paginas/       una clase por pantalla: Inicio, MiFicha, TablaCanjes, Compendio, Empleos, Registro…
agente/           el script mínimo para Tampermonkey
tests/            pruebas automáticas con node + jsdom
```

## Lo que añade la auditoría del 2/11/2026

La auditoría técnica (17 hallazgos, todos comprobados contra el código) coincide con esta propuesta y la completa. La lista de errores y cuándo se arregla cada uno está en [`PENDIENTES.md`](PENDIENTES.md). De la auditoría se adopta:

- **El Inspector de Canjes entra también en el refactor.** Usará el mismo lector de fichas y las mismas reglas que PAM, a través del mismo agente; no tendrá un lector propio.
- **Los datos del sistema, en JSON** (`data/sistema.json`): el Inspector y cualquier herramienta los leen sin ejecutar código.
- **Reglas del núcleo:**
  1. Un personaje se identifica por **foro + número de tema** de su ficha; el nombre es solo lo que se muestra.
  2. Una ficha tiene **una o varias partes** (mensajes). De cada una se guarda el número de mensaje, la sección, el BBCode original y una huella para saber si alguien la cambió.
  3. Lo que no se entiende **se conserva y se marca para revisar**; nunca desaparece ni se convierte en «nivel 0».
  4. Un canje es una lista de operaciones con identificador. Un reintento no duplica mensajes, gastos ni avisos.
  5. Cada edición va **al mensaje concreto** que contiene el dato, con vista previa de los cambios. Se cancela si el mensaje cambió desde que se leyó.
- **No se adopta (por ahora): Vite y TypeScript con compilación.** Obligarían a compilar antes de publicar y a usar GitHub Actions, y ya no se podría subir desde la web como ahora. Los módulos sin compilar y los tipos en comentarios (JSDoc) dan casi lo mismo sin ese coste. Si más adelante hace falta, se puede añadir sin rehacer nada.

## Cómo conviven el PAM antiguo y el nuevo

- Durante las fases 0 a 4 (datos, núcleo, modelos, lectores, editor), **`index.html` no se toca**. El código nuevo se escribe aparte (`data/`, `js/`) y no lo usa ninguna página todavía.
- Las pruebas de `tests/caracterizacion/` cargan el `index.html` antiguo y comprueban que el código nuevo da los mismos resultados. Las únicas diferencias permitidas son los errores corregidos, anotados en cada prueba.
- A partir de la fase 5, las páginas nuevas (primero el panel de Mi PJ) empiezan a usar ese código. El `index.html` antiguo se sustituye al final, cuando todo esté portado.

## Fases

Cada fase se prueba en el staging y en test-forito, y solo entonces se propone para `main`.

| Fase | Contenido |
|---|---|
| 0 | Pruebas automáticas con fichas reales recortadas (Irvin, Mortimer, Mark…), sin datos de sesión. |
| 1 | Datos del sistema en JSON y núcleo: almacén con copia de seguridad, guardado inmediato y fechas locales. |
| 2 | Modelos: Personaje (id foro + tema), ficha por partes, trasfondo con identidad, bóveda dentro del personaje. |
| 3 | Lectores del foro dentro de PAM, uno solo para Mi PJ y el Inspector: fichas de varios mensajes, trasfondos, puntos de destino, historial. |
| 4 | Editor de BBCode por bloques y por mensaje (el «Personalizada» nuevo). |
| 5 | Agente y panel de Mi PJ servido por PAM. |
| 6 | Flujo de canjes: petición, aprobación, aplicar; reanudable y sin duplicados. |
| 7 | Sincronización con la nube con control de versiones. |
| 8 | Resto de páginas, estilos y dependencias. |

## Lo que llega del foro a PAM (`js/pam/`)

Antes, el script «Mi PJ» manejaba PAM desde fuera: pulsaba sus botones y leía su pantalla (F13). Ahora lo hace PAM, por capas, como un controlador de una API:

- `index.html` solo tiene **una línea más** al final (`<script type="module" src="js/pam/main.js">`). PAM se ve y funciona igual. Si el script no está instalado, esa línea no hace nada.
- `js/pam/ControladorForo.js` es **la única puerta de entrada** de lo que llega del foro a través del agente (hoy, los oficiales de la Biblioteca; en la fase 6b, las peticiones de canje). Lo comprueba y lo enseña en la puerta Aceptar / Denegar de siempre (`js/pam/ui/Puerta.js`, el mismo aspecto que en el foro).
- `js/pam/PamActual.js` es **el único archivo que conoce `index.html` por dentro** (`rrOficiales`, `showSection`…). Cuando las páginas de PAM se reescriban (fase 8), se cambia este archivo y lo demás sigue igual.

## Los canjes en el foro (fase 6b·2)

La tarjeta «⚖ Canjes» del panel, publicar la petición en el Registro de Canjes y encontrar la respuesta del Inspector, como Mi PJ (mismos textos, mismas páginas, misma tarjeta):

- `js/reglas/Canjes.js`: el texto de la petición, los avisos y qué dice la respuesta (sin leer ni escribir nada).
- `js/servicios/CanjesDelForo.js`: lee el registro y los grupos de Inspectores y publica a través del agente (su puerta Aceptar / Modificar / Denegar). Las peticiones de cada cuenta se guardan en el almacén del agente, `pam.cuentas.<foro>.<id>`; las del Mi PJ antiguo (`cuentas.<foro>.<id>`) se copian la primera vez.
- `js/paginas/panel/CanjesPanel.js`: la tarjeta. Al llegar desde PAM con `#escriba-publicar`, el agente lo dice en `hola` (y lo quita de la dirección) y la puerta se abre sola; al publicar, el agente lleva la página al mensaje nuevo (`foro.ir`).
- El registro de cada foro está en `data/foros.json` (`registroCanjes`, `grupos`). Sin registro, la tarjeta solo explica cómo pedir un canje.

Aplicar el canje y cerrarlo en PAM (fase 6b·3), también como Mi PJ:

- «Aplicar el canje» abre la puerta del agente con cuatro pasos: el primer mensaje de la bóveda (grageas actuales y totales), el movimiento (el código que preparó PAM, con los enlaces de la petición y la aprobación), la ficha y el aviso en la ficha. **La ficha, desde la 0.5.2 (N07):** al preparar el canje, PAM apunta qué cambia (su ficha como se importó del foro y con el carrito, `js/reglas/CambiosFicha.js`); al aplicarlo, el panel lee la ficha del foro como está ahora, todas sus partes, le aplica eso con el editor por mensajes (`js/bbcode/EditorFicha.js`) y edita **solo los mensajes que cambian** (un paso por mensaje). Lo que se cambió en el foro después de importarla no se pisa, y lo que el editor no puede hacer solo sale en los avisos. Ya no hace falta el modelo «Personalizada». Las peticiones preparadas antes se aplican como entonces. **Desde la 0.5.3** la pestaña «Código para el foro» de Mi Ficha (modo «Personalizada») usa el mismo editor (`js/pam/EditorPam.js`, que `js/pam/arranque.js` deja en `window.PAM_EDITOR`; si no está, el antiguo). Lo que no se puede hacer sale «No se hará»; lo que ya está hecho, «Ya está igual» (un reintento no repite nada).
- Al terminar, la misma puerta ofrece «Terminar en PAM»: se deja `pam.aprobacion` y el agente abre PAM. PAM cierra el canje (su pastilla, como en la 6b·1), marca la petición como cerrada y avisa a la pestaña del foro (`escribaCierre`); el agente se lo pasa al panel (`pam.cierre`) y el panel le manda a esa misma pestaña los datos ya releídos (`pam.enviar`). Es el canal oficial en los dos foros (Mi PJ, en el de pruebas, iba por su almacén).

## El Inspector de Canjes (fase 6c)

El script aparte «PAM · Inspector de Canjes» pasa a PAM y al mismo agente que Mi PJ. Se ve igual (la barra «Inspector» debajo de cada pedido, la caja de la revisión, la pastilla y el panel con la respuesta), y revisa igual:

- `js/inspector/Revision.js`: la revisión del Inspector antiguo copiada por un script (leer el pedido, reconocer cada canje y su precio, compararlo con la ficha y la bóveda, armar la respuesta). Cambios: lee el foro con el agente, F05 (partes de la ficha), F06 (Puntos de Destino de dos cifras) y el `leerSaldos` de Mi PJ (F17).
- `js/inspector/Tabla.js`: la Tabla de Canjes sale de `data/*.json`, con la misma forma que cuando se ejecutaba un trozo de `index.html` (F12).
- `js/inspector/Inspector.js` e `InspectorUI.js`: PAM lee la página del registro, revisa y arma el HTML; el agente lo pinta (en una caja propia, con el tema de Mi PJ, y limpio de scripts), le devuelve los clics y hace «Copiar» y «Pegar en la respuesta rápida» (en el editor del foro, sin enviar).
- **Quién lo ve:** en el panel Mi PJ aparece la tarjeta «🔍 Inspector de Canjes» (activar o desactivar el modo Inspector) solo para las cuentas del grupo de Inspectores de Canjes y las de `desarrolladores` en `data/foros.json` (Hana Park, Mortimer Gaunt, Robert Stevenson); en el foro de pruebas, para todas. Con el modo activo, en el Registro de Canjes cada pedido tiene su barra.
- Cambio visual: la pastilla «✦ Inspector» va abajo a la **izquierda** (abajo a la derecha está la de Mi PJ y se tapaban).
- Al publicar esta versión, los Inspectores tienen que desinstalar el script antiguo del Inspector (si no, verían dos barras).

«Enviar a PAM» usa la ventana «Datos del foro → PAM» que ya tiene `index.html`: el agente abre PAM desde el foro y le pasa los datos, porque esa ventana solo acepta datos que vengan del foro. En la rama `refactor` acepta también el foro de pruebas (`FOROS_PRUEBA`), siempre con Aceptar / Denegar.

## Las páginas de PAM (fase 8)

**8a (hecha): `index.html` repartido en archivos, sin cambiar el código.** PAM se ve y funciona igual; `index.html` pasa de 9.300 líneas a 200 (solo el HTML de la página).

| Antes, dentro de `index.html` | Ahora |
|---|---|
| Los estilos (`<style>`) | `css/pam.css` |
| Los empleos del foro y los arcanos | `data/empleos-foro.txt` y `data/arcanos.json`: los mismos archivos que ya usan el panel de Mi PJ y el Inspector. Ya no están dos veces. |
| Datos del sistema, Tabla de Canjes y Compendio | `js/paginas/pam/tabla-canjes.js` (desde la 8d, `js/paginas/canjes/`; los datos, de `data/`) |
| Revisor de Empleos: Empleos, Mi Ficha, Controlador y Editor | `js/paginas/pam/revisor.js` (desde la 8c, `js/paginas/revisor/`) |
| Registro de Roles y Coloreador de Diálogos | `js/paginas/pam/registro-roles.js` (desde la 8b, `js/paginas/registro/`) |
| Portada y navegación | `js/paginas/pam/portada.js` |
| Temas | `js/paginas/pam/temas.js` |
| Datos del foro → PAM (lo que manda el Mi PJ antiguo) | `js/paginas/pam/foro-antiguo.js` |

- `js/pam/arranque.js` trae los datos y carga las páginas en el mismo orden que antes. Después carga `js/nube/main.js` y `js/pam/main.js`. Si algo no se puede traer, avisa arriba: «No se pudo cargar una parte de PAM (…). Probá recargar la página.».
- `js/pam/tema-inicial.js` pone el tema elegido antes de pintar. Sin él, al cargar se vería un momento el tema Avadense, porque las páginas ahora se cargan un poco más tarde.
- Los archivos de `js/paginas/pam/` son el código de antes, copiado por un script y sin tocar una letra. Las pruebas lo comprueban así:
  - `tests/legado/montarPam.mjs` lo vuelve a juntar en un solo HTML;
  - `tests/caracterizacion/arranque.test.mjs` arranca PAM de las dos maneras y compara la página, lo que PAM deja para el foro (`pamFicha`, `rrBoveda`…) y cinco secciones.
- No cambia ninguna clave del `localStorage`.

**Después, una página cada vez** (decisión del 4/11/2026: «separar por piezas»). Cada página pasa a una carpeta de módulos: los estilos, el HTML, los datos fijos y los cálculos salen a sus archivos; las pantallas mantienen el mismo código que pinta el HTML, así se ve exactamente igual. Se arreglan sus errores pendientes. Las pruebas montan la página nueva y la antigua (una copia congelada en `tests/legado/paginas/`) con los mismos datos y comparan lo que se ve, lo que hace al usarla y lo que guarda.

**8b (hecha, 0.6.0): Registro de Roles y Coloreador**, en `js/paginas/registro/`:

| Archivo | Qué tiene |
|---|---|
| `main.js` | Trae los estilos y el HTML y lo monta. `js/pam/arranque.js` lo carga en el mismo sitio que antes (después de Mi Ficha, antes de la portada). |
| `RegistroRoles.js` | Las pestañas del Registro (Resumen, Roles, Turnos, Posibles oficiales, Ganancias, Bóveda, Canjes futuros, Importar y copia), `window.rrBoveda`, `rrOficiales`, `rrSync`… como antes. |
| `Coloreador.js` | El Coloreador de Diálogos. |
| `datos.js` | Listas fijas: tipos de rol, estados, turnos, colores, temas… |
| `deseos.js` y `deseosExtra.js` | Los datos de la lista de deseos («Canjes futuros»). Desde la 0.6.1 salen de los oficiales (`data/sistema.json`, los arcanos de la calculadora y los inventados del Compendio); lo que solo tenía la lista antigua (el Quidditch, «Evolución de Trasfondos», algunos requisitos) está en `deseosExtra.js` y sigue saliendo. |
| `importarExcel.js` | «Importar desde Excel». |
| `plantilla.html` y `css/registro.css` | El HTML y los estilos del Registro. |

- **F14:** guarda con el almacén: lo pendiente se guarda al cerrar o esconder la página (antes se perdía si se cerraba antes de 0,7 s).
- **F09:** SheetJS 0.20.3, de cdn.sheetjs.com.
- **N08:** el Coloreador recuerda lo de cada personaje (`cd_pj.<id>`).
- Se quitó el modo «Guardado en tu cuenta», que solo funcionaba dentro de otra aplicación y en PAM nunca se activaba. Las claves guardadas son las mismas (`registro-roles-v1`, `cd_…`) más `cd_pj.<id>`, que viaja con la sesión con código.

**Lo que queda:**

- **0.6.1 · Lista de deseos del Registro con los datos oficiales** (decisión del 4/11/2026): mismos nombres y orden que la Tabla de Canjes y la ficha; aparecen la Capa de Invisibilidad y los legendarios que faltaban; no se pierde nada de lo que tenía.
- **8c · Revisor de Empleos y Mi Ficha.** Primera parte hecha (0.6.2): `js/paginas/revisor/`, separado por piezas como el Registro:
  - `Revisor.js` tiene las pantallas, con el mismo código: Mi Ficha, el Controlador de stats, el Revisor y el Editor de empleos.
  - `datos.js` (rangos, habilidades, trasfondos, sueldos), `modelo.js` (la ficha vacía y la de ejemplo) y `empleos.js` (el lector de los empleos del foro).
  - Lo que Mi Ficha usa de la Tabla de Canjes (el carrito, los precios…) ya no son variables compartidas: la Tabla lo ofrece en `window.pamTabla`.
  - Guarda con el almacén, con las mismas claves y el mismo formato.
  - Su HTML sigue en `index.html` y sus estilos en `css/pam.css`.

  Segunda parte (0.6.3, R07): los datos de Mi Ficha salen de `data/sistema.json` (`datos.js`, que los rellena al arrancar). Son los mismos que tenía, más «Gobierno mágico de (X país)» en Política, que le faltaba.
- **8d (hecha) · Tabla de Canjes y Compendio**, en `js/paginas/canjes/`:
  - 0.6.4: `Tabla.js`, el mismo código como módulo. Guarda con el almacén. Lo que usan Mi Ficha y la portada está en `window.pamTabla`.
  - 0.6.5 (R07): los datos salen de `data/*.json` (`datos.js`, igual que el Inspector). Cambian «Personal no-docente», el orden alfabético de los tipos de trasfondo y «Arte/Artesanía» en las Proezas.
  - 0.6.6 (F16): al cambiar algo se pinta lo que se ve, y las demás pestañas al abrirlas. El Compendio se arma la primera vez que se abre.
  - El carrito de trasfondos (N04) ya estaba desde la 6b·1, y que la Tabla se guarde al recargar (R08) desde la 0.5.1.
- **8e · Portada, temas y lo que quede:** los estilos repartidos por página y sin repetir (F17), y `js/pam/PamActual.js` cambiado a las páginas nuevas.

## Dónde guarda PAM los datos (y la sesión con código)

- **En el navegador**, siempre: el `localStorage` de la página de PAM. Sin cookies.
- **En la nube**, si el usuario abre una «Sesión con código» (`PAM-XXXX-…`): PAM hace una foto de las claves del `localStorage` que empiezan por **`grimorio.`, `grimorioAvadense.`, `revisorEmpleos.`, `registro-roles-v1` o `cd_`** (menos `cd_bg`), la cifra en el navegador con una llave que sale del código y la sube a Firestore (`pam-avadense`). Sube los cambios cada 4 s y al cambiar de pestaña.
- **Norma del refactor:** todo dato del usuario que PAM tenga que conservar va en una clave con uno de esos prefijos, o no viajará con la sesión. Desde la fase 7 la lista (`PRE`/`EXC`) está **una sola vez**, en `js/nube/pendiente.js`: si hace falta un prefijo nuevo, se añade ahí. La prueba `tests/unit/sesion-codigo.test.mjs` comprueba que nadie más la copia y que el código nuevo no escribe en el `localStorage` de PAM por su cuenta.
- **Hoy (fase 6b):** el código nuevo no escribe nada propio en el `localStorage` de PAM. Los canjes cambian la ficha y la Bóveda con las funciones de PAM (`pamFicha`, `rrBoveda`), que guardan en `grimorio.*` y `registro-roles-v1`: entran en la sesión. Lo que va de paso entre el foro y PAM (`pam.*`) lo guarda el agente en Tampermonkey y no tiene que ir a la nube. Las preferencias del panel de Mi PJ (`mipj.*`) están en el almacenamiento del panel dentro del foro, que Chrome separa del de PAM; con el Mi PJ antiguo tampoco iban a la nube.
- **Fase 7 (la nube):** el código de la sesión salió de `index.html` (que ahora solo tiene dos líneas: `js/nube/pendiente.js` al principio y `js/nube/main.js` al final), con el mismo aspecto y los mismos textos:
  - `js/nube/Nube.js`: el código, el cifrado y Firestore. **F10:** cada guardado lleva la versión de la nube que conoce (`currentDocument.updateTime` de Firestore). Si otro dispositivo guardó por medio, Firestore lo rechaza, no se pisa nada y sale el aviso de siempre («Traer los de la nube» / «Guardar los de acá»). Una sesión abierta con el PAM de antes (sin versión) primero mira la nube.
  - `js/nube/pendiente.js`: la lista y, al cargar, los datos traídos de la nube. **F11:** todo o nada; si no caben, el navegador queda como estaba, se avisa y no se guarda lo de este navegador encima (pregunta).
  - `js/nube/Sesion.js`: el botón ☁, la caja de la portada y el guardado automático (copiados por un script).
  - El documento en Firestore es el mismo (mismos campos, mismo cifrado): las sesiones de antes se siguen trayendo, y el PAM de `main` y el de la rama conviven (el de `main` no mira la versión).
- **Fase 8** (páginas): al cambiar cómo guarda PAM, mantener esta norma o cambiar la foto a la vez, y comprobar que una sesión vieja se sigue pudiendo traer. La 8a no cambia ninguna clave: solo mueve el código a `js/paginas/pam/`. La 8b guarda con el almacén y las mismas claves; la única nueva, `cd_pj.<id>` (N08), empieza por `cd_` y viaja con la sesión (prueba `registro.test.mjs`).
- **Staging:** el PAM de pruebas tiene su propio `localStorage`, pero si se carga en él un código de sesión, escribe en **la misma copia de la nube** que el PAM de verdad. Para probar, un código nuevo solo de pruebas.

## Cómo se publica una versión

1. Subir el número en `agente/pam-agente.user.js` (`@version` y `VERSION`).
2. `node scripts/versionar.mjs`: pone esa versión en todas las direcciones del panel y de PAM (imports, CSS, datos, las páginas que carga `js/pam/arranque.js` y la página que abre el agente). Así el navegador nunca mezcla archivos de dos versiones: GitHub Pages los guarda 10 minutos, y si `main.js` fuera nuevo y otro módulo viejo, el panel no arrancaría.
3. Pasar las pruebas (`cd tests && npm test`) y subir.

Si aun así el panel no arranca, el agente enseña la pastilla «✦ Mi PJ» a los 15 segundos (nunca queda invisible).

## Prueba de concepto (`poc-agente/`)

- `agente/pam-agente-poc.user.js`: el agente «PAM · Agente (staging)». Solo funciona en test-forito y en el staging; no se mezcla con tu «Mi PJ».
- `web/index.html`: hace de PAM abierto normal.
- `web/panel.html`: el panel dentro del foro.
- Pruebas locales: `cd poc-agente/tests && npm install && npm test` (30 de 30 correctas).

La duda principal es de Chrome. Un iframe de otro dominio guarda sus datos aparte, así que el panel dentro del foro no ve directamente lo que PAM tiene guardado. La solución prevista es que se lo pase el agente. Hay que comprobarlo en Chrome real.

## Cómo afecta a `main` mientras dure

- Puedes seguir trabajando como siempre (subir archivos a `main` desde la web). La rama no lo impide ni lo cambia.
- Lo que cambies en `main` habrá que llevarlo también a la rama. **Desde la fase 8a (4/11/2026) `index.html` está repartido en archivos en la rama**: un cambio en el `index.html` de `main` ya no pasa solo, hay que llevarlo a mano a su archivo de `js/paginas/pam/`, `css/pam.css` o `data/`. Hasta esa fecha `main` no había cambiado desde que empezó la rama. Si cambias algo de PAM en `main`, avisa para pasarlo.
- Por eso conviene hacerlo **por fases cortas que vuelvan a `main` pronto**, en vez de una rama larga que se aleje: por ejemplo, primero sacar los datos y añadir pruebas; luego los lectores del foro; luego el panel…

## Cómo se publicaría

1. **Probar sin afectar a nadie.** Todo se prueba antes en el staging (otra cuenta, otros datos) y en test-forito. Lo que no está probado ahí no se propone para `main`.
2. **Publicar.** Un pull request de `refactor` a `main`. Al aceptarlo, GitHub Pages actualiza la web en uno o dos minutos. El script nuevo va en la misma dirección (`pam-mi-pj.user.js`), con el mismo `@name` y `@namespace` y un `@version` mayor. Así Tampermonkey lo actualiza solo (por defecto lo comprueba una vez al día) y conserva los datos del jugador.
3. **Transición.** Durante ese día habrá gente con PAM nuevo y script viejo. PAM detecta la versión del agente y avisa «actualiza el script». Mientras tanto, mantiene el receptor antiguo del foro.
4. **Marcha atrás.** Se revierte el pull request con el botón «Revert» de GitHub y la web vuelve a la versión anterior en un minuto. Como la migración no borra los datos antiguos, nadie pierde nada.
5. **Caché.** GitHub Pages guarda los archivos hasta 10 minutos. Para que nadie mezcle módulos viejos y nuevos, los imports llevarán la versión (`?v=…`).
