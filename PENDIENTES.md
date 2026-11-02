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
| F06 | El Inspector lee «Puntos de Destino: 13» como **1**: la expresión captura un solo dígito. | `pam-inspector-canjes.user.js`, `fichaPD()` | Da veredictos erróneos sin avisar. Es un carácter: `(\d)` → `(\d+)`. |
| F08 | Al importar un código del Registro de Roles, el color (`tono`) entra sin escapar en el HTML. Un código manipulado que alguien comparta podría ejecutar código dentro de PAM y leer lo guardado, incluido el código de sesión de la nube. | `index.html`, `case"import"` y plantillas con `t-${p.tono}` | Es de seguridad y se corrige en pocas líneas: al importar, aceptar solo los colores de la lista. |

## Dentro del refactor

| ID | Problema | Estado | Fase |
|---|---|---|---|
| F01 | Mi PJ lee solo el **primer mensaje** de la ficha; en fichas de varias partes se pierden atributos, magia y trasfondos (dos funciones, `leerFicha` en las dos mitades del script). | comprobado | 3 · lectores del foro |
| F02 | El lector de trasfondos de PAM no reconoce el orden «Tipo NIVEL: categoría» (`Biblioteca V: Arcanismo.`, `Informantes III: Contrabandistas (Zacharias Hayes).`) y los descarta sin avisar. Los formatos «Biblioteca — Medicina — Heridas mágicas III» sí funcionan. | comprobado con el código real | 3 · lectores del foro |
| F03 | El personaje se identifica por el **nombre**: «Irvin Giles.» y «Irvin Giles» no coinciden y se crea otro; el parecido «Hana» ↔ «Hana Park» puede confundir personajes. | comprobado | 2 · modelos (id = foro + tema) |
| F04/F07 | Al aplicar un canje se edita siempre el **primer mensaje**, aunque el dato esté en otro (en Irvin los trasfondos están en el 339216). La actualización de niveles busca «nombre + número» y no encaja con «número + nombre». | comprobado | 4 · editor de BBCode por bloques y por mensaje |
| F05 | El Inspector toma como partes de la ficha los mensajes del dueño de más de 800 caracteres: mezcla la ficha vigente con canjes antiguos. | comprobado | 3 · un solo lector para todos |
| F09 | La importación de Excel usa SheetJS `xlsx@0.18.5` (CVE-2023-30533 y CVE-2024-22363). Riesgo práctico bajo: solo afecta al abrir un archivo manipulado. | comprobado | 8 · actualizar (cdn.sheetjs.com) o quitar si ya no se usa |
| F10 | La sesión en la nube guarda con `PATCH` sin comprobar la versión: dos dispositivos a la vez pueden pisarse. | comprobado | 7 · usar la precondición `updateTime` de Firestore |
| F11 | Al traer datos de la nube se borra todo lo local antes de escribir lo nuevo y los errores se tragan; si falla a medias, queda un estado parcial (se puede volver a traer de la nube). | comprobado | 1 · almacén con copia de seguridad y verificación |
| F12 | El Inspector descarga `index.html` y ejecuta trozos con `new Function()` para leer precios y requisitos. Frágil: cualquier cambio de formato lo rompe. | comprobado | 1 · datos del sistema en JSON |
| F13 | Mi PJ maneja PAM pulsando botones y leyendo su pantalla (`#f-parse`, `#dlg-ta`, `#bovForm`…). | comprobado | 5 · agente y protocolo (prueba de concepto ya hecha) |
| F14 | El Registro de Roles guarda con 700 ms de retraso y no guarda al cerrar la página. | comprobado | 1 · almacén |
| F15 | `fechaISO()` usa la fecha UTC: entre medianoche y la 1-2 h (hora de Madrid) da el día anterior. | comprobado | 1 · utilidades de fecha |
| F16 | `renderAll()` vuelve a pintar toda la Tabla de Canjes por cualquier cambio. | comprobado | 8 · páginas |
| F17 | Versiones distintas en un mismo script (`@version 1.7.1` y `mipj-1.7.2`), CSS repetido y `leerSaldos()` copiado en Mi PJ y en el Inspector. | comprobado | 8 · se resuelve al ordenar |
| R01 | Editor personalizado: una línea nueva detrás de la última de una lista (`…[/spoiler]`) queda fuera del desplegable; sin `[b]`, o en trasfondos, duplica el `[/spoiler]` y rompe todo lo que viene detrás. | comprobado (Mortimer) | 4 |
| R02 | Editor personalizado: quitar el último elemento de una lista se lleva el `[/spoiler]`. | comprobado | 4 |
| R03 | Varios arcanos nuevos del mismo nivel quedan en **orden inverso**. | comprobado | 4 |
| R04 | Los arcanos nuevos salen sin descripción: al leer la ficha se descarta la descripción de los arcanos oficiales. | comprobado | 2 |
| R05 | Los rituales «Nombre \| Latín» se renombran «Nombre (Latín)» y luego no se encuentran ni para añadir ni para quitar. | comprobado | 3 |
| R06 | La pestaña «Otros» (idiomas, trasfondos nuevos, ventajas, especializaciones, talentos, títulos) queda siempre para hacer a mano, y PAM dice «Agregado» aunque la línea quede mal puesta. | comprobado | 4 |
| R07 | Datos del sistema duplicados con nombres distintos («Esquivar»/«Esquiva», «Volar»/«Vuelo», «Seducir»/«Seducción»), unidos por una tabla de traducción; tres listas de personajes distintas. | comprobado | 1–2 |
| R08 | La bóveda llega siempre a 0 al mandar desde el foro: «Grageas disponibles» de la Tabla de Canjes no se guarda. | comprobado | 2 · la bóveda sale del personaje |

## Después

| ID | Problema | Notas |
|---|---|---|
| R09 | «Oficiales en curso»: roles cerrados salen abiertos si la cuenta muestra las fechas sin año (preferencia «D j M - G:i»); el año se supone el actual. | Avisar del formato y deducir el año por el día de la semana o el orden de los mensajes; detectar cierres («¡AVISO!… cerrado», «Ficha final de la aventura»). Encaja en la fase 3 si da tiempo. |
| R10 | Botón ✕ en «Oficiales en curso» para ocultar un rol hasta volver a escribir en él. | Mejora pedida; fácil una vez esté el panel en PAM. |
| N01 | Firestore: confirmar que las reglas no permiten **listar** ni borrar documentos ajenos. | Los datos van cifrados con el código de sesión (bien hecho); esto es solo para evitar vandalismo. No se ha probado contra el servidor. |

## Cómo se trabaja cada punto

1. Antes de arreglar, una prueba automática que falle con el caso real (fichas recortadas y sin datos de sesión: la página guardada de un tema contiene tokens que no deben subirse a un repositorio público).
2. El arreglo.
3. La prueba pasa y se marca aquí como hecho, con el commit.
