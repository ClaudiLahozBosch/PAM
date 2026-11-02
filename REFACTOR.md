# Rama `refactor`: PAM por módulos y Mi PJ como agente mínimo

Esta rama es para preparar una versión reorganizada de PAM y de «Mi PJ» sin tocar la que está en uso.
**Nada de lo que hay aquí se publica en tu web:** GitHub Pages sigue sirviendo solo `main`, y `main` no cambia.

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
2. **Todo lo que se pueda pasa del script a PAM.** El script que instalan los jugadores queda como un «agente» que solo hace lo que PAM no puede hacer desde su dominio:
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
data/             sistema.js (atributos, habilidades, precios… una sola vez), arcanos.json
js/core/          router, eventos, almacén con versión y migración, utilidades de DOM y texto
js/modelos/       Personaje, Arcano, Trasfondo, Canje, Boveda, Empleo
js/reglas/        Precios, Combate, Requisitos (lógica pura, con pruebas)
js/servicios/     personajes y bóveda, BBCode (lector y plantillas, editor personalizado por bloques),
                  agente (protocolo), lectores del foro, sincronización en la nube
js/paginas/       una clase por pantalla: Inicio, MiFicha, TablaCanjes, Compendio, Empleos, Registro…
agente/           el script mínimo para Tampermonkey
tests/            pruebas automáticas con node + jsdom
```

## Prueba de concepto (`poc-agente/`)

- `agente/pam-agente-poc.user.js`: el agente «PAM · Agente (staging)». Solo funciona en test-forito y en el staging; no se mezcla con tu «Mi PJ».
- `web/index.html`: hace de PAM abierto normal.
- `web/panel.html`: el panel dentro del foro.
- Pruebas locales: `cd poc-agente/tests && npm install && npm test` (30 de 30 correctas).

La duda principal es de Chrome. Un iframe de otro dominio guarda sus datos aparte, así que el panel dentro del foro no ve directamente lo que PAM tiene guardado. La solución prevista es que se lo pase el agente. Hay que comprobarlo en Chrome real.

## Cómo afecta a `main` mientras dure

- Puedes seguir trabajando como siempre (subir archivos a `main` desde la web). La rama no lo impide ni lo cambia.
- Lo que cambies en `main` habrá que llevarlo también a la rama. Mientras `index.html` siga siendo un solo archivo es automático. Cuando ya esté repartido en módulos, hay que pasarlo a mano.
- Por eso conviene hacerlo **por fases cortas que vuelvan a `main` pronto**, en vez de una rama larga que se aleje: por ejemplo, primero sacar los datos y añadir pruebas; luego los lectores del foro; luego el panel…

## Cómo se publicaría

1. **Probar sin afectar a nadie.** Todo se prueba antes en el staging (otra cuenta, otros datos) y en test-forito. Lo que no está probado ahí no se propone para `main`.
2. **Publicar.** Un pull request de `refactor` a `main`. Al aceptarlo, GitHub Pages actualiza la web en uno o dos minutos. El script nuevo va en la misma dirección (`pam-mi-pj.user.js`), con el mismo `@name` y `@namespace` y un `@version` mayor. Así Tampermonkey lo actualiza solo (por defecto lo comprueba una vez al día) y conserva los datos del jugador.
3. **Transición.** Durante ese día habrá gente con PAM nuevo y script viejo. PAM detecta la versión del agente y avisa «actualiza el script». Mientras tanto, mantiene el receptor antiguo del foro.
4. **Marcha atrás.** Se revierte el pull request con el botón «Revert» de GitHub y la web vuelve a la versión anterior en un minuto. Como la migración no borra los datos antiguos, nadie pierde nada.
5. **Caché.** GitHub Pages guarda los archivos hasta 10 minutos. Para que nadie mezcle módulos viejos y nuevos, los imports llevarán la versión (`?v=…`).
