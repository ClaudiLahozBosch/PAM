# Errores y pendientes

Lista única de lo que se sabe que falla o que conviene mejorar en PAM, Mi PJ e Inspector de Canjes.
Fuentes: la auditoría técnica del 2/11/2026 (IDs **F01–F17**) y las revisiones con fichas reales de Mortimer y Fimbulvetr (IDs **R01–R10**).
Todo lo marcado como «comprobado» se ha verificado contra el código de `main` del 2/11/2026 (commit `b1dedad`).

**Qué significa la columna «Cuándo»**
- **Ya**: arreglo pequeño y seguro que conviene subir a `main` antes del refactor.
- **Refactor (fase N)**: se arregla dentro de la reorganización; arreglarlo antes sería trabajo doble.
- **Después**: menor; se apunta para más adelante.

## Arreglos rápidos (antes del refactor)

| ID | Problema | Dónde | Por qué ya |
|---|---|---|---|
| F06 | El Inspector lee «Puntos de Destino: 13» como **1**: la expresión captura un solo dígito. | `pam-inspector-canjes.user.js`, `fichaPD()` | 3 · ✔ el lector compartido lee el número completo (prueba con 13). El Inspector actual sigue con el error hasta que use este lector (fase 5) |
| F08 | Al importar un código del Registro de Roles, el color (`tono`) entra sin escapar en el HTML. Un código manipulado que alguien comparta podría ejecutar código dentro de PAM y leer lo guardado, incluido el código de sesión de la nube. | `index.html`, `case"import"` y plantillas con `t-${p.tono}` | ✔ fase 2 · `validarRegistro()` comprueba cada valor al importar (colores, listas, enlaces, `__proto__`), con prueba |

## Dentro del refactor

| ID | Problema | Estado | Fase |
|---|---|---|---|
| F01 | Mi PJ lee solo el **primer mensaje** de la ficha; en fichas de varias partes se pierden atributos, magia y trasfondos (dos funciones, `leerFicha` en las dos mitades del script). | comprobado | ✔ fase 3 · `partesVigentes()` + `LectorFicha` por partes; Mi PJ lo usará en la fase 5 |
| F02 | El lector de trasfondos de PAM no reconoce el orden «Tipo NIVEL: categoría» (`Biblioteca V: Arcanismo.`, `Informantes III: Contrabandistas (Zacharias Hayes).`) y los descarta sin avisar. Los formatos «Biblioteca — Medicina — Heridas mágicas III» sí funcionan. | comprobado con el código real | ✔ fase 3 · `LectorTrasfondo`: los cinco ejemplos y los formatos antiguos, con prueba contra el lector antiguo |
| F03 | El personaje se identifica por el **nombre**: «Irvin Giles.» y «Irvin Giles» no coinciden y se crea otro; el parecido «Hana» ↔ «Hana Park» puede confundir personajes. | comprobado | ✔ fases 2–3 · `Personaje` (foro + tema) y `asociarPersonaje()`: por tema; por nombre solo como sugerencia |
| F04/F07 | Al aplicar un canje se edita siempre el **primer mensaje**, aunque el dato esté en otro (en Irvin los trasfondos están en el 339216). La actualización de niveles busca «nombre + número» y no encaja con «número + nombre». | comprobado | ✔ fases 3–4 · cada dato sabe su mensaje y `EditorFicha` edita solo ese (prueba con cinco partes) |
| F05 | El Inspector toma como partes de la ficha los mensajes del dueño de más de 800 caracteres: mezcla la ficha vigente con canjes antiguos. | comprobado | ✔ fase 3 · el mismo lector para todos: la ficha son los mensajes seguidos del dueño al principio del tema; lo demás es historial. El Inspector lo usará en la fase 5 |
| F09 | La importación de Excel usa SheetJS `xlsx@0.18.5` (CVE-2023-30533 y CVE-2024-22363). Riesgo práctico bajo: solo afecta al abrir un archivo manipulado. | comprobado | 8 · actualizar (cdn.sheetjs.com) o quitar si ya no se usa |
| F10 | La sesión en la nube guarda con `PATCH` sin comprobar la versión: dos dispositivos a la vez pueden pisarse. | comprobado | 7 · usar la precondición `updateTime` de Firestore |
| F11 | Al traer datos de la nube se borra todo lo local antes de escribir lo nuevo y los errores se tragan; si falla a medias, queda un estado parcial (se puede volver a traer de la nube). | comprobado | ✔ fase 1 · `Almacen.restaurar()` todo o nada, con prueba |
| F12 | El Inspector descarga `index.html` y ejecuta trozos con `new Function()` para leer precios y requisitos. Frágil: cualquier cambio de formato lo rompe. | comprobado | 1 · ✔ datos en `data/sistema.json`; 5 · que el Inspector los use en vez de ejecutar `index.html` |
| F13 | Mi PJ maneja PAM pulsando botones y leyendo su pantalla (`#f-parse`, `#dlg-ta`, `#bovForm`…). | comprobado | 5 · agente y protocolo (prueba de concepto ya hecha) |
| F14 | El Registro de Roles guarda con 700 ms de retraso y no guarda al cerrar la página. | comprobado | ✔ fase 1 · `Almacen.guardarLuego()` + `vigilarSalida()`, con prueba |
| F15 | `fechaISO()` usa la fecha UTC: entre medianoche y la 1-2 h (hora de Madrid) da el día anterior. | comprobado | ✔ fase 1 · `core/fechas.js`: día local de cada usuario (pruebas con hora de Madrid y de Buenos Aires) |
| F16 | `renderAll()` vuelve a pintar toda la Tabla de Canjes por cualquier cambio. | comprobado | 8 · páginas |
| F17 | Versiones distintas en un mismo script (`@version 1.7.1` y `mipj-1.7.2`), CSS repetido y `leerSaldos()` copiado en Mi PJ y en el Inspector. | comprobado | 8 · se resuelve al ordenar |
| R01 | Editor personalizado: una línea nueva detrás de la última de una lista (`…[/spoiler]`) queda fuera del desplegable; sin `[b]`, o en trasfondos, duplica el `[/spoiler]` y rompe todo lo que viene detrás. | comprobado (Mortimer) | ✔ fase 4 · la línea nueva va dentro del bloque, antes de los cierres que no son suyos, también si el bloque está en una sola línea |
| R02 | Editor personalizado: quitar el último elemento de una lista se lleva el `[/spoiler]`. | comprobado | ✔ fase 4 · al quitar, los cierres se quedan; un bloque vacío queda con «-» |
| R03 | Varios arcanos nuevos del mismo nivel quedan en **orden inverso**. | comprobado | ✔ fase 4 · cada nueva va tras la anterior del mismo grupo |
| R04 | Los arcanos nuevos salen sin descripción: al leer la ficha se descarta la descripción de los arcanos oficiales. | comprobado | ✔ fase 3 · el lector guarda la descripción de todos los arcanos (55/55 en Mortimer; antes 1) |
| R05 | Los rituales «Nombre \| Latín» se renombran «Nombre (Latín)» y luego no se encuentran ni para añadir ni para quitar. | comprobado | ✔ fase 3 · el nombre queda como en la ficha («Nombre | Latín») y se enlaza al Compendio por id |
| R06 | La pestaña «Otros» (idiomas, trasfondos nuevos, ventajas, especializaciones, talentos, títulos) queda siempre para hacer a mano, y PAM dice «Agregado» aunque la línea quede mal puesta. | comprobado | ✔ fase 4 · idiomas, trasfondos, ventajas, especializaciones, talentos y títulos; cada cambio se comprueba releyendo la ficha y, si no queda bien, se deshace y va a «a mano» |
| R07 | Datos del sistema duplicados con nombres distintos («Esquivar»/«Esquiva», «Volar»/«Vuelo», «Seducir»/«Seducción»), unidos por una tabla de traducción; tres listas de personajes distintas. | comprobado | ✔ fases 1–2 · datos unificados (`Sistema`) y una sola lista de personajes (`leerLegado` une fichas y Registro por id) |
| R08 | La bóveda llega siempre a 0 al mandar desde el foro: «Grageas disponibles» de la Tabla de Canjes no se guarda. | comprobado | 2 · ✔ `Boveda` dentro del `Personaje`; 6 · que la Tabla de Canjes la use |

## Después

| ID | Problema | Notas |
|---|---|---|
| R09 | «Oficiales en curso»: roles cerrados salen abiertos si la cuenta muestra las fechas sin año (preferencia «D j M - G:i»); el año se supone el actual. | Avisar del formato y deducir el año por el día de la semana o el orden de los mensajes; detectar cierres («¡AVISO!… cerrado», «Ficha final de la aventura»). Encaja en la fase 3 si da tiempo. **✔ fase 5c:** el año sale del día de la semana (el año más reciente, sin pasarse de hoy, en que ese día cae en ese día de la semana); un oficial es «cerrado» si uno de sus tres últimos mensajes es «¡AVISO! … cerrado» o «Ficha final de la aventura». Sin aviso del formato: con el día de la semana ya no hace falta. Las frases de cierre están en **`data/cierres-oficial.json`** (se editan a mano, sin tocar código; el archivo explica cómo). Si el archivo queda mal escrito, Mi PJ sigue funcionando y solo deja de detectar cierres. |
| R10 | Botón ✕ en «Oficiales en curso» para ocultar un rol hasta volver a escribir en él. | Mejora pedida; fácil una vez esté el panel en PAM. **✔ fase 5c:** el mismo ✕ que en «Te toca responder»; vuelve a salir cuando tu último mensaje en el oficial es otro. |
| N01 | Firestore: confirmar que las reglas no permiten **listar** ni borrar documentos ajenos. | Los datos van cifrados con el código de sesión (bien hecho); esto es solo para evitar vandalismo. No se ha probado contra el servidor. |
| N02 | Más listas editables a mano, como `data/cierres-oficial.json` (pedido el 3/11/2026). | Revisar qué otras listas fijas del código cambian con el foro y pasarlas a `data/` con su explicación, para editarlas sin tocar código. Candidatas (sin decidir): subforos que no son de rol (`noRol`, ya en `foros.json`), cuentas que no cobran en oficiales (Tramas), nombres de los Dados Mágicos, frases de inspector del sueldo (correcto / corregir), palabras de plazo de las misiones, cómo se reconoce un tema de oficial o de misión, topes de los oficiales, sellos de ficha. Mismo criterio: si el archivo queda mal escrito, Mi PJ sigue funcionando. |
| N03 | «Tus otras cuentas» enseña misiones de una cuenta desactivada, y temas que ya terminaron (visto el 3/11/2026 en el Mi PJ actual, con Tyr Johnson Windstorm: «El Color de la Libertad», «La Batalla de Blackpool», «The Hunt», todas «sin plazo escrito»). | Dos problemas. **1)** Cuenta inactiva: lo de otras cuentas sale de la última vez que se entró con cada una (`mipj.cuentas` + `mipj.<uid>`), aunque el PJ ya no esté activo. Hay que detectar si el PJ está inactivo y no mostrarlo; falta ver cómo lo marca el foro (¿grupo, rango, perfil?), sin suponerlo. **2)** Temas cerrados: nunca debería salir un tema cerrado, ni en misiones ni en roles ni en oficiales. Ver cómo marca el foro un tema cerrado (icono de candado en las listas, falta del botón responder en el tema…) y comprobarlo con temas reales. Además, hoy las misiones de otras cuentas «sin plazo escrito» no caducan nunca (el filtro solo descarta las que vencieron hace más de 3 días). |
| N04 | Tabla de Canjes: con los trasfondos, el carrito deja añadir lo mismo dos veces y no junta las subidas (visto el 3/11/2026 en el PAM actual). Ejemplo: con «Informantes Académicos 0 → I» en el carrito, deja volver a elegir 0 → I, y deja 0 → II; si después se añade I → II, quedan dos líneas separadas (0 → I y I → II). | Comprobado en `index.html`: en `trasfAdder` (línea ~5155), tras «Agregar» el formulario vuelve a 0 → I para cualquier trasfondo, no mira el carrito ni guarda desde qué nivel sale (`meta` sin `from`). Stats, habilidades y ventajas sí avanzan el nivel actual (línea ~5121). Dentro de cada categoría las líneas salen en el orden en que se añadieron (solo las categorías tienen orden fijo, `CAT_ORDER`). **Lo que se quiere:** 1) el nivel actual sale solo, del nivel de la ficha más lo que ya hay en el carrito, y no deja elegir un nivel que ya se tiene o ya está en el carrito; 2) dos subidas de lo mismo se juntan en una sola línea (0 → II) con el coste recalculado; 3) el carrito final, siempre en el mismo orden: por categoría y, dentro, alfabético. Va con la fase 6 (canjes). **✔ fase 6b·1:** en los trasfondos, el nivel actual sale de la ficha («Llevar a la calculadora» guarda sus niveles) y del carrito, y no deja elegir uno que ya se tiene; dos subidas seguidas de lo mismo se juntan en una línea con el coste recalculado (también estadísticas, habilidades y ventajas); el carrito y el texto para copiar, por categoría y en orden alfabético (los arcanos, por tipo y nivel y después alfabético). |
| N05 | Biblioteca de oficiales: el escaneo tarda mucho y solo se ve el texto del progreso (pedido el 3/11/2026, **se hará**). | Un icono pequeño mientras carga: idealmente un pergamino o un libro con una lupa animada, en pixel art estilo Stardew Valley, hasta que termine. Es un cambio visual pedido por el usuario. Va en `js/paginas/panel/BibliotecaPanel.js`, junto al texto de `#log`; con el tema «pixel» o con cualquier tema. |
| N06 | Biblioteca de oficiales: no leerlo todo de golpe (idea a más largo plazo, **por decidir**). | Hoy cada escaneo lee el índice de El Profeta, vuelve a leer las 3 últimas ediciones (las demás salen de la caché), lee la Lista de Roleos y comprueba cada rol abierto (1 o 2 páginas por rol), con 250 ms de pausa y 4 lecturas a la vez. Idea: guardar en caché el listado inicial (sucesos y lista) y comprobar el estado real solo de los roles de lo que se está viendo (el filtro o la página de la tabla), según se necesite. Antes de decidir: medir qué parte tarda más con datos reales. |
| N07 | Los canjes siguen usando el código «Personalizada» de PAM (decisión del usuario del 3/11/2026, fase 6b): PAM regenera el código entero de la ficha y en el foro se edita **un solo mensaje**, como antes. Así todo se cambia en PAM y no en el script. | Quedan, por tanto, los errores del «Personalizada» antiguo en los canjes: R01, R02, R03 (líneas fuera de su desplegable, cierres que se van, orden inverso) y F04/F07 (siempre el primer mensaje, aunque el dato esté en otro). El editor nuevo de la fase 4 (`js/bbcode/EditorFicha.js`) ya los resuelve, por mensaje y comprobando cada cambio. **Para más adelante (refactor o corrección):** que el «Personalizada» de PAM use ese editor, sin cambiar el reparto (todo en PAM). |

## Comprobado con la ficha real de Irvin Giles (3/11/2026)

Con la página guardada que usó la auditoría (no se sube: lleva datos de sesión), el lector nuevo:
- encuentra las **cinco partes** (337672, 339214–339217) aunque el sello de revisión esté entre la primera y la segunda, y deja fuera las actualizaciones («Ficha actualizada…»);
- lee los **64 de 64 trasfondos**, todos del mensaje 339216;
- lee **todos los arcanos**: el número de cada grupo coincide con el que la propia ficha pone en el encabezado («RITUALES BÁSICOS | 24»);
- lee los Puntos de Destino (13), atributos, habilidades, artes, idiomas, ventajas y especializaciones.

Pasarlo por la ficha real destapó y corrigió seis fallos que la ficha inventada no tenía: título de caja pegado a la primera línea (modelo extendido), sello entre partes, descripción en la misma línea del trasfondo, encabezados «▋ HECHIZOS:» y «… | 28:», viñetas «●» y una línea de trasfondo que se fundía con otra.

## Límite conocido del editor (fase 4)

El editor se ha probado con el BBCode real de Mortimer (una parte) y con una ficha inventada de cinco partes. La página de Irvin Giles que tenemos es el HTML que muestra el foro, no su BBCode, así que con su ficha real solo se ha probado el lector. Conviene probar el editor con el BBCode de alguna ficha real de varias partes cuando se pueda (lo puede sacar su dueño desde «Editar»).

**Por revisar (pedido el 4/11/2026):** el PAM antiguo también acepta el HTML de la página al importar una ficha. Ver si el editor puede trabajar con ese HTML (y, por tanto, probarse con la página de Irvin), o qué pierde: el HTML publicado no es el código que se edita (los `[b]`, `[spoiler]`… ya salen convertidos), así que lo que se publicara a partir de él cambiaría el código de la ficha.

## Cómo se trabaja cada punto

1. Antes de arreglar, una prueba automática que falle con el caso real (fichas recortadas y sin datos de sesión: la página guardada de un tema contiene tokens que no deben subirse a un repositorio público).
2. El arreglo.
3. La prueba pasa y se marca aquí como hecho, con el commit.
