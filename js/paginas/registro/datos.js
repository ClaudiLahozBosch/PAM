// @ts-nocheck
// Registro de Roles: listas fijas (tipos de rol, estados, turnos, colores, temas…). Copiadas tal cual del Registro
// antiguo (fase 8b). Solo datos: se pueden cambiar sin tocar el código.
export const TIPOS=[["Oficial","terra","🎓"],["Acontecimiento","sage","🎉"],["Gesta","gold","⚔️"],["Evento","lilac","🎪"],["Misión","sage","🗺️"],["Clases","sky","📚"],["Libre","sand","🌼"],["Grupal","gray","👥"]];
export const ESTADOS=[["Sin Contestar","rose","📪"],["Contestado","mint","✅"],["Pausado","peach","⏸️"],["Terminado","lilac","🏁"]];
export const CASA_HEX={"slytherin":"#3F5B41","ravenclaw":"#3B6E8C","hufflepuff":"#8A6A1F","gryffindor":"#9B4A5F"}; /* solo para pasar datos viejos (casas) a colores */
export const TURNOS=[["Sin Postear","sin","·"],["Rápido","mint","⚡"],["Normal","lilac","🌸"],["Lento","sky","🐌"],["Falta Justificada","peach","FJ"],["Falta Injustificada","rose","FI"]];
export const TONOS=["mint","sky","terra","gold","lilac","rose","sage","peach","sand","gray"];
export const OF_EST=[["Disponible","mint","🌸"],["Ocupado","rose","💌"]];
export const GEST=[["Cobrado","mint","✓"],["Sin Cobrar","peach","…"]];
export const KEY="registro-roles-v1";
export const SKINS=[
 {id:"pastel",nombre:"Pastel Core",orn:"🌷",sw:"linear-gradient(135deg,#D9F0E4,#E7DCF5 50%,#F7D6E0)",fx:["🌷","🌿","🍬","🌼","🧺"]},
 {id:"magic",nombre:"Magic Girl",orn:"🦋",sw:"linear-gradient(135deg,#6B62AE,#9B80A5 50%,#D6A6B9)",fx:["🦋","✦","🌙","💎","🌸","🫧","✨","🎀"]},
 {id:"terror",nombre:"Gothic Horror",orn:"🕯️",sw:"linear-gradient(135deg,#241C29,#4A2638 50%,#8A3D4F)",fx:["🕯️","🥀","🦇","🕸️","🩸","🗝️","🌙"]},
 {id:"neutro",nombre:"Elegant Minimal",orn:"✦",sw:"linear-gradient(135deg,#F4F0EA,#B8AEA5 50%,#3F3D3B)",fx:["🪶","✦","🤍","🌾","🕯️"]},
 {id:"magico",nombre:"Enchanted Fantasy",orn:"🔮",sw:"linear-gradient(135deg,#201B3A,#8065A5 55%,#E4D19A)",fx:["✨","💫","🔮","🌙","🪶","🦋","💎","🍄"]},
 {id:"pixel",nombre:"Pixel Core",orn:"⭐",sw:"linear-gradient(135deg,#9B527A,#71936B 50%,#F0CF88)",fx:["⭐","🍄","🌸","💎","🧪","🪙","✨","🍓"]},
 {"id": "peony", "nombre": "Peony Garden", "orn": "🌸", "sw": "linear-gradient(135deg,#9DAA85,#D8C595 35%,#E6AEA4 70%,#8E5963)", "fx": ["🌸", "🌷", "🍃", "🌼"]},
 {"id": "matcha", "nombre": "Matcha Latte", "orn": "🍵", "sw": "linear-gradient(135deg,#ABBF9B,#E4CDB0 45%,#A2663C 75%,#3F1D0E)", "fx": ["🍵", "☕", "🥛", "🍃", "🧋"]},
 {"id": "lotus", "nombre": "Lotus Pond", "orn": "🪷", "sw": "linear-gradient(135deg,#0F2E23,#798F53 40%,#C88582 70%,#1B5B65)", "fx": ["🪷", "✨", "🍃", "💧", "🌸"]},
 {"id": "buttercup", "nombre": "Buttercup Morning", "orn": "🌼", "sw": "linear-gradient(135deg,#FFF2B2,#FFE08A 40%,#A8C6E7 70%,#7FA8D6)", "fx": ["🌼", "☁️", "☀️", "🧺", "🌾"]},
 {"id": "velvet", "nombre": "Velvet Library", "orn": "📚", "sw": "linear-gradient(135deg,#1A0D0E,#45171B 35%,#733438 65%,#D5BCB5)", "fx": ["📚", "🕯️", "🥀", "🗝️", "📜"]},
 {"id": "berries", "nombre": "Winter Berries", "orn": "🍒", "sw": "linear-gradient(135deg,#0B2224,#336269 40%,#93D4D8 70%,#941D1D)", "fx": ["🍒", "❄️", "🍃", "🫐"]},
 {"id": "tealplum", "nombre": "Teal & Plum", "orn": "🍷", "sw": "linear-gradient(135deg,#0F4448 0 50%,#7A2A5A 50% 100%)", "fx": ["🍷", "🌺", "🕯️", "📕", "🫖"]},
 {"id": "bubble", "nombre": "Bubble Dream", "orn": "🫧", "sw": "linear-gradient(135deg,#102B53,#4E7AB1 40%,#CEB5D4 70%,#7D9FC0)", "fx": ["🫧", "✨", "💫", "🫧", "💜"]}];

/* bóveda: el adorno de cada tema y el divisor de enlaces (solo símbolos de texto: el foro no acepta emojis) */
export const FLOR=Object.assign({pastel:"✿",magic:"✧",terror:"†",neutro:"❦",magico:"✶",pixel:"◆"},{"peony": "❀", "matcha": "✿", "lotus": "✾", "buttercup": "❁", "velvet": "❦", "berries": "✱", "tealplum": "❦", "bubble": "✧"});
export const DIV=Object.assign({pastel:"✿",magic:"✧",terror:"†",neutro:"✦",magico:"✶",pixel:"◆"},{"peony": "❀", "matcha": "·", "lotus": "✾", "buttercup": "❁", "velvet": "❧", "berries": "✱", "tealplum": "◆", "bubble": "✧"});
export const BOV_LINKS=[["l1","Primer post"],["l2","Último post"],["l3","Última corrección"]];

/* lista de deseos: prioridades y categorías */
export const PRIO=[["alta","Alta","rose","▲"],["media","Media","peach","●"],["baja","Baja","mint","▼"]];
export const WCATS=[["atributo","💪 Atributo"],["habilidad","🎯 Habilidad"],["trasfondo","📚 Trasfondo"],["ventaja","👑 Ventaja"],["especializacion","🎓 Especialización"],["hechizo","🪄 Hechizo"],["pocion","⚗️ Poción"],["ritual","🕯️ Ritual"],["objeto","💎 Objeto mágico"],["arma","⚔️ Arma o runa"],["talento","✨ Talento"],["idioma","🗣️ Idioma"],["titulo","📜 Título académico"],["quidditch","🧹 Quidditch"],["raza","🧬 Raza"],["destino","⭐ Destino, límites y proezas"],["legendario","🌟 Otras legendarias"],["otro","✏️ Otro (lo escribís vos)"]];

/* la carita de la portada: cómo te trata */
export const TRATO={chica:{w:"girl",e:"👧",l:"Chica",reina:"reina"},chico:{w:"boy",e:"👦",l:"Chico",reina:"rey"},persona:{w:"person",e:"🌟",l:"Indefinido",reina:"leyenda"}};
