// @ts-nocheck
// Lista de deseos del Registro de Roles: lo que la lista antigua tenía y los datos oficiales (data/sistema.json y el
// Compendio) no tienen. Sigue saliendo en la lista (decisión del 4/11/2026: unificar sin perder nada).
// Generado por un script a partir de la lista antigua (tests/legado/paginas/datosDeseos.js); se puede editar a mano.

/** Números romanos de los niveles. */
export const ROM = ["—","I","II","III","IV","V","VI"];

/** Quidditch: maniobras y equipo (no están en data/sistema.json). [nombre, grageas, puntos legendarios, requisito] */
export const QUIDDITCH = {
 "Maniobras": [
  [
   "Maniobra doméstica",
   25
  ],
  [
   "Maniobra básica",
   75,
   0,
   "Jugador de Quidditch 1"
  ],
  [
   "Maniobra intermedia",
   250,
   0,
   "Jugador de Quidditch 2"
  ],
  [
   "Maniobra avanzada",
   500,
   0,
   "Jugador de Quidditch 2"
  ]
 ],
 "Escobas": [
  [
   "Escoba básica (Nimbus 1000, Barredora 7…)",
   100
  ],
  [
   "Escoba intermedia (Nimbus 2000/2001, Saeta de Fuego…)",
   200
  ],
  [
   "Escoba avanzada (Saeta de Fuego Suprema, Saeta de Trueno VII)",
   300
  ]
 ],
 "Protecciones": [
  [
   "Yelmo de Whisp",
   100
  ],
  [
   "Brazales de Whisp",
   200
  ],
  [
   "Pechera de Whisp",
   300
  ]
 ],
 "Guantes": [
  [
   "Guantes de Todoroki",
   100
  ],
  [
   "Agarraderas de Llewellyn",
   200
  ],
  [
   "Magnetos de Weasley",
   300
  ]
 ],
 "Bates": [
  [
   "Golpeabludgers de Quigley",
   100
  ],
  [
   "Quebrantahuesos de Draganov",
   200
  ],
  [
   "Lucesfuera de Jones",
   300
  ]
 ]
};

/** Canjes legendarios que no están en data/sistema.json. */
export const LEGENDARIAS = [["Evolución de Trasfondos",0,5,"Esperar un año entre canjes"]];

/** Arma: el nombre del canje del arma y los grupos de runas, con el requisito de cada nivel. */
export const ARMA = { nombre: "Arma física", runas: [null,
  { grupo: "Runas básicas (1 espacio)", req: "Combatiente 1" },
  { grupo: "Runas intermedias (2 espacios)", req: "Runa Mínima y Combatiente 2" },
  { grupo: "Runas avanzadas (3 espacios)", req: "Runa Media y Combatiente 3" }] };

/** Requisitos escritos en la lista antigua que los datos oficiales no tienen (por canje). */
export const REQUISITOS = {
 "talento": {
  "Lazo / Unión / Vínculo": "Unión requiere Lazo; Vínculo requiere Unión"
 },
 "raza": {
  "Licantropía": "Explicarlo en la historia de la ficha"
 },
 "legendario": {
  "Arcano Legendario": "Diseñarlo con Sistemas",
  "Reliquia Legendaria": "Diseñarla con Sistemas"
 }
};

/** Requisitos de arcanos escritos en la lista antigua que el Compendio no tiene. */
export const REQUISITOS_ARCANOS = {
 "PARA": "requiere de 5 turnos o en su defecto 30 minutos para recargar su energía.",
 "Polvo peruano de oscuridad instantánea": "requiere de vientos fuertes, y no basta con un hechizo de disipación).",
 "S.C.R.O.L.L.": "requiere de flujo mágico personal, por lo que la distancia de alcance de sus mensajes depende de cada persona,",
 "Saco de piel de Moke": "requiere de una tirada de latrocinio a dificultad 21.",
 "Tatuaje Arcano": "requieren de canalización continua (como barreras mágicas), si se usan desde el tatuaje tienen la misma proble",
 "Ritual de castigo menor | Damnum Minoris": "requiere acción alguna en combate, pero no se podrá realizar dos veces al mismo objetivo en menos de 24 horas ",
 "Oppugno": "requieren una postura demasiado estática que causará un penalizador de -1 a la Defensa del conjurador.",
 "Expelliarmus": "requiere renunciar a usar talentos de combate en el turno siguiente.",
 "Transfiguración humana absoluta | Alter Humanus": "Requiere Transfiguratio Mayoris."
};
