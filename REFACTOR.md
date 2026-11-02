# Rama `refactor`: PAM por módulos y Mi PJ como agente mínimo

Esta rama es para preparar una versión reorganizada de PAM y de «Mi PJ» sin tocar la que está en uso.
**Nada de lo que hay aquí se publica:** GitHub Pages sigue sirviendo solo `main`, y `main` no cambia.

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

- `agente/pam-agente-poc.user.js`: el agente (solo en el foro de pruebas test-forito).
- `web/index.html`: hace de PAM abierto normal.
- `web/panel.html`: el panel dentro del foro.
- Pruebas locales: `cd poc-agente/tests && npm install && npm test` (30 de 30 correctas).

La duda principal es de Chrome. Un iframe de otro dominio guarda sus datos aparte, así que el panel dentro del foro no ve directamente lo que PAM tiene guardado. La solución prevista es que se lo pase el agente. Hay que comprobarlo en Chrome real.

## Cómo afecta a `main` mientras dure

- Puedes seguir trabajando como siempre (subir archivos a `main` desde la web). La rama no lo impide ni lo cambia.
- Lo que cambies en `main` habrá que llevarlo también a la rama. Mientras `index.html` siga siendo un solo archivo es automático. Cuando ya esté repartido en módulos, hay que pasarlo a mano.
- Por eso conviene hacerlo **por fases cortas que vuelvan a `main` pronto**, en vez de una rama larga que se aleje: por ejemplo, primero sacar los datos y añadir pruebas; luego los lectores del foro; luego el panel…

## Cómo se publicaría

1. **Probar sin afectar a nadie.** Una copia de prueba en una carpeta de `main` (p. ej. `/PAM/beta/`) se publica en su propia dirección y el `index.html` actual sigue igual. Ojo: comparte dominio con PAM, así que **ve los mismos datos guardados**. La beta solo puede leer los datos antiguos y guardar los suyos con otro nombre; nunca debe borrar ni reescribir los de la versión en uso.
2. **Publicar.** Un pull request de `refactor` a `main`. Al aceptarlo, GitHub Pages actualiza la web en uno o dos minutos. El script nuevo va en la misma dirección (`pam-mi-pj.user.js`), con el mismo `@name` y `@namespace` y un `@version` mayor. Así Tampermonkey lo actualiza solo (por defecto lo comprueba una vez al día) y conserva los datos del jugador.
3. **Transición.** Durante ese día habrá gente con PAM nuevo y script viejo. PAM detecta la versión del agente y avisa «actualiza el script». Mientras tanto, mantiene el receptor antiguo del foro.
4. **Marcha atrás.** Se revierte el pull request con el botón «Revert» de GitHub y la web vuelve a la versión anterior en un minuto. Como la migración no borra los datos antiguos, nadie pierde nada.
5. **Caché.** GitHub Pages guarda los archivos hasta 10 minutos. Para que nadie mezcle módulos viejos y nuevos, los imports llevarán la versión (`?v=…`).
