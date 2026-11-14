// @ts-nocheck
// Kit de temas (fase 8e): el mismo código que estaba en index.html (copia congelada en tests/legado/paginas/), como módulo.
// Lo que cambia, marcado con «8e»: guarda el tema y las calabazas con el almacén (mismas claves y formato).
// Recibe la ventana: así las pruebas lo montan en una página de prueba junto al antiguo y comparan.
import { Almacen } from '../../core/Almacen.js?v=2.1.3';
/** @param {Window} w la ventana de PAM */
export async function montar(w) {
const almacen = Almacen.de(w);
const window = w, document = w.document, Math = w.Math;
const SKINS=[{id:"avadense",nombre:"Avadense",desc:"El original: noche y pergamino",sw:"linear-gradient(135deg,#171a2b,#A96879 55%,#B49768)",fx:[]},

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
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
let cur="avadense", open=false, fxFor=null, pks=[];
cur=almacen.leerTexto("grimorio.tema")||"avadense"; pks=almacen.leer("grimorio.calabazas",[])||[]; /* 8e: con el almacén (el tema es texto suelto, como antes) */
const skin=()=>SKINS.find(k=>k.id===cur)||SKINS[0];
function aplicar(id){
  if(id){ cur=id; almacen.guardarTexto("grimorio.tema",cur); }
  const k=skin(); document.documentElement.dataset.skin=k.id;
  const W=document.getElementById("themeWrap");
  if(W) W.innerHTML=`<button class="theme-btn" data-tt aria-expanded="${open}" aria-haspopup="true" title="Cambiar tema de colores"><i style="background:${k.sw}"></i>${esc(k.nombre)} <span class="car">${open?"▴":"▾"}</span></button>`
   +`<div class="theme-list" role="menu"${open?"":" hidden"}>`+SKINS.map(x=>`<button class="theme-opt" role="menuitemradio" data-skin-id="${x.id}" aria-pressed="${x.id===k.id}"><i style="background:${x.sw}"></i><span>${esc(x.nombre)}${x.desc?`<small>${esc(x.desc)}</small>`:""}</span></button>`).join("")
   +(k.id==="terror"?`<div class="pk-bar"><button data-pk="add">Agregar calabazas</button>${pks.length?`<button data-pk="clear">Quitarlas</button>`:""}</div>`:"")+`</div>`;
  if(fxFor!==k.id){ fxFor=k.id; const fx=document.getElementById("fx"); if(fx){ let s=""; if(k.fx.length) for(let i=0;i<16;i++){ const e=k.fx[i%k.fx.length]; s+=`<span style="left:${(i*6.3+Math.random()*5)%100}%;--y:${Math.random()*90}%;--sz:${12+Math.random()*14}px;--dur:${18+Math.random()*16}s;--del:${-Math.random()*30}s;--dx:${(Math.random()*80-40)|0}px">${e}</span>`; } fx.innerHTML=s; } }
  pintarPk();
}
function pintarPk(){ const L=document.getElementById("pumpkins"); if(!L) return; const on=skin().id==="terror";
  L.style.height=on?Math.max(document.documentElement.scrollHeight,w.innerHeight)+"px":"0px";
  L.innerHTML=(on?pks:[]).map((q,i)=>`<button class="pk" data-i="${i}" aria-label="Quitar calabaza" style="left:${q.x}%;top:${q.y}%;font-size:${q.s}px;--rot:${q.r}deg">🎃</button>`).join(""); }
const savePk=()=>{ almacen.guardar("grimorio.calabazas",pks); };
document.addEventListener("click",e=>{
  if(e.target.closest("[data-tt]")){ open=!open; aplicar(); return; }
  const b=e.target.closest(".theme-opt"); if(b){ open=false; aplicar(b.dataset.skinId); return; }
  const pk=e.target.closest("[data-pk]"); if(pk){ if(pk.dataset.pk==="add") for(let i=0;i<6;i++) pks.push({x:+(Math.random()*94+1).toFixed(1),y:+(Math.random()*92+3).toFixed(1),s:22+Math.round(Math.random()*24),r:Math.round(Math.random()*40-20)}); else pks=[]; savePk(); aplicar(); return; }
  const c=e.target.closest(".pk"); if(c){ pks.splice(+c.dataset.i,1); savePk(); pintarPk(); return; }
  if(open && !e.target.closest("#themeWrap")){ open=false; aplicar(); }
});
document.addEventListener("keydown",e=>{ if(e.key==="Escape"&&open){ open=false; aplicar(); } });
w.addEventListener("resize",pintarPk);
window.aplicarTema=aplicar;
aplicar();

}
