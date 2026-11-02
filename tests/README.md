# Pruebas

```
cd tests
npm install      # solo la primera vez (instala jsdom)
npm test
```

- `unit/`: piezas nuevas por separado (texto, fechas, almacén…).
- `caracterizacion/`: comparan el código nuevo con el PAM antiguo (`index.html`), cargado en jsdom por `legado/cargarPam.mjs`. Si una prueba de aquí falla, el código nuevo hace algo distinto del antiguo. Las diferencias a propósito (errores corregidos) están escritas en la propia prueba.
- `fixtures/`: fichas y páginas del foro de ejemplo.

## Fichas de ejemplo

Las fichas del foro solo las ven los miembros, y la página guardada de un tema lleva datos de la sesión (tokens). Aquí solo se suben:
- fragmentos **recortados** (solo el BBCode o el HTML de los mensajes que hacen falta);
- **sin** cabeceras, scripts del foro ni datos de la cuenta;
- de personajes cuyo dueño ha dado permiso, o inventados.
