// @ts-nocheck
// Tabla de Canjes y Compendio (fase 8d): el mismo código que estaba en index.html (copia congelada en
// tests/legado/paginas/tabla-canjes.js), como módulo. Lo que cambia, marcado con «8d»:
//   · guarda con el almacén (js/core/Almacen.js), con la misma clave (grimorio.canjes);
//   · R07: los datos del sistema (precios, habilidades, arcanos, talentos…) le llegan de data/*.json (datos.js);
//   · sus variables ya no son de toda la página: lo que usan Mi Ficha y la portada está en window.pamTabla.
// Recibe la ventana: así las pruebas lo montan en una página de prueba junto al antiguo y comparan.

/**
 * @param {Window} w la ventana de PAM
 * @param {{ almacen: import('../../core/Almacen.js').Almacen, datos: ReturnType<typeof import('./datos.js').datosTabla> }} o
 */
export function montarTabla(w, { almacen, datos }) {
/* 8d: lo del navegador sale de la ventana que se recibe (en PAM, la misma) */
const window = w, document = w.document, navigator = w.navigator, Math = w.Math, Date = w.Date,
  setTimeout = (...a) => w.setTimeout(...a), clearTimeout = (...a) => w.clearTimeout(...a), showSection = (...a) => w.showSection(...a);
/* =========================================================
   DATOS: desde la 8d (R07) salen de data/*.json (js/paginas/canjes/datos.js), los mismos que usa el Inspector;
   antes estaban escritos aquí. Mismos nombres y misma forma.
   ========================================================= */
const { STATS, SKILL_GROUPS, ALL_SKILLS, SKILL_LVL, ROMAN, STAT_ACUM, SKILL_ACUM, ARTE_ACUM, TGEN_ACUM, TESP_ACUM, VENT_ACUM, ARTES, ARTESANIAS, ESPEC_RAMAS, TIPOS_TRASF, VENTAJAS, VENT_LABELS, EXTASIS_ASIG, NOTAS, TIMOS_PRECIO, EXTASIS_PRECIO, IDIOMAS_MAGICOS, IDIOMA_NIVEL, RAZAS, ARMA_BASE, MATERIALES, RUNE_CHAINS, RUNE_LVL, RUNE_PRICE, ARC, ARCANOS, ARC_BY_ID, DESC, ARC_TYPES, TIER, TALENTOS, PROEZAS, LINK_REGISTRO, VETERANIA, LEGENDARIAS, CONOCIMIENTO_CATEGORIAS, SOCIAL_CATEGORIAS } = datos;
const catsFor = tipo => tipo==="Biblioteca" ? CONOCIMIENTO_CATEGORIAS : SOCIAL_CATEGORIAS;
const runeName = (chain,l) => chain==="Venite" ? "Runa Venite" : `Runa ${chain} ${RUNE_LVL[l]}`;
/* =========================================================
   UTILIDADES
   ========================================================= */
const esc = s => String(s ?? "").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt = n => Number(n).toLocaleString("es-ES");
const precioTexto = (p,pl)=> pl>0 ? `${fmt(p)} grageas y ${pl} Puntos Legendarios` : `${fmt(p)} grageas`;
const costoSubida = (acum,a,b)=> b<=a ? 0 : (acum[b]||0)-(acum[a]||0);
function optionsHtml(list, sel){
  return list.map(o=>{
    const [v,l,dis] = Array.isArray(o) ? o : [o,o,false];
    return `<option value="${esc(v)}" ${String(v)===String(sel)?"selected":""} ${dis?"disabled":""}>${esc(l)}</option>`;
  }).join("");
}
function priceHtml(cost, pl){
  if(cost<=0 && !pl) return `<div class="buy-preview zero">—</div>`;
  return `<div class="buy-preview">${fmt(cost)} gr${pl?` <span class="pl-tag">+${pl} PL</span>`:""}</div>`;
}

/* =========================================================
   ESTADO
   ========================================================= */
function newArma(n){ return {nombre:`Arma ${n}`, base:"no", mats:{}, runas:{}}; }
function makeInitialState(){
  const st = {
    disponibles:0, plDisponibles:0, pdActuales:0,
    cart:[],                       // {id, cat, line, cost, pl, key, meta}
    statsBase:{}, statsTarget:{}, skillsBase:{}, skillsTarget:{},
    ventBase:{}, ventTarget:{}, espOwned:{}, espTarget:{},
    arcOwned:{hechizo:{bas:0,int:0,ava:0}, pocion:{bas:0,int:0,ava:0}, ritual:{bas:0,int:0,ava:0}},
    ui:{}, armas:[newArma(1)]
  };
  STATS.forEach(s=>{st.statsBase[s]=0; st.statsTarget[s]=1;});
  ALL_SKILLS.forEach(s=>{st.skillsBase[s]=0; st.skillsTarget[s]=1;});
  VENTAJAS.forEach(v=>{st.ventBase[v]=0; st.ventTarget[v]=1;});
  ESPEC_RAMAS.forEach(r=>{st.espOwned[r]=0; st.espTarget[r]=1;});
  return st;
}
let state = makeInitialState();
let uid = 1;
/* R08: lo de la Tabla de Canjes (grageas disponibles, carrito, niveles, armas) se guarda en este navegador y, por
   empezar por «grimorio.», viaja con la sesión con código. Antes se perdía al recargar PAM. */
const K_CANJES = "grimorio.canjes";
function guardarCanjes(){ almacen.guardar(K_CANJES, state); } /* 8d: con el almacén, misma clave */
(function cargarCanjes(){
  let g = null;
  g = almacen.leer(K_CANJES, null); /* 8d: con el almacén */
  if(!g || typeof g!=="object" || Array.isArray(g)) return;
  const st = makeInitialState(), obj = v => v && typeof v==="object" && !Array.isArray(v);
  Object.keys(g).forEach(k=>{
    if(!(k in st)) st[k] = g[k];                                   // p. ej. bgsBase (lo pone «Llevar a la calculadora»)
    else if(obj(st[k]) && obj(g[k])) Object.assign(st[k], g[k]);
    else if(Array.isArray(st[k]) ? Array.isArray(g[k]) : typeof st[k]===typeof g[k]) st[k] = g[k];
  });
  if(!st.armas.length) st.armas = [newArma(1)];
  state = st;
  uid = state.cart.reduce((m,i)=>Math.max(m, Number(i.id)||0), 0) + 1;
  document.getElementById("inpDisponibles").value = state.disponibles;
  document.getElementById("inpPL").value = state.plDisponibles;
})();
w.addEventListener("pagehide", guardarCanjes);
document.addEventListener("visibilitychange", ()=>{ if(document.visibilityState==="hidden") guardarCanjes(); });
/* R08: al cerrar un canje en PAM (Mi PJ), lo comprado ya está en la ficha: el carrito y las armas quedan vacíos */
window.pamCanjes = { vaciarCarrito(){ state.cart = []; state.armas = [newArma(1)]; renderAll(); } };
const ui =(k,def)=>{ if(!(k in state.ui)) state.ui[k]=def; return state.ui[k]; };

function addToCart(cat, line, cost, pl=0, key=null, meta={}){
  state.cart.push({id:uid++, cat, line, cost, pl, key, meta});
}
/* N04: una subida de lo mismo que ya está en el carrito (que termina donde empieza esta) se junta con ella en una
   sola línea («0 → II» en vez de «0 → I» y «I → II»). Devuelve el nivel desde el que sale la subida juntada. */
function fusionarSubida(kind, name, desde){
  const prev = state.cart.find(i=>i.meta && i.meta.kind===kind && i.meta.name===name && i.meta.to===desde && i.meta.from!=null);
  if(!prev) return desde;
  state.cart = state.cart.filter(i=>i!==prev);
  return prev.meta.from;
}
/* N04: el carrito, siempre en el mismo orden: por categoría y, dentro, alfabético (los arcanos, por tipo y nivel y después alfabético) */
const ordenAlfabetico = (x,y)=> x.line.localeCompare(y.line, "es", {sensitivity:"base", numeric:true});
function itemsOrdenados(cat){
  const items = state.cart.filter(i=>i.cat===cat).slice();
  if(cat==="ARCANOS"){
    const order = {hechizo:0,pocion:1,ritual:2,objeto:3}, to = {dom:0,bas:1,int:2,ava:3};
    return items.sort((a,b)=> order[a.meta.type]-order[b.meta.type] || to[a.meta.tier]-to[b.meta.tier] || ordenAlfabetico(a,b));
  }
  return items.sort(ordenAlfabetico);
}
/* N04: el nivel que ya tenés de un trasfondo: el de la ficha (al «Llevar a la calculadora») o el del carrito */
const nivelTrasfondo = nombre => Math.max(Number((state.bgsBase||{})[nombre])||0, 0, ...state.cart.filter(i=>i.meta && i.meta.kind==="trasf" && i.meta.name===nombre).map(i=>Number(i.meta.to)||0));
function removeItem(id){
  const it = state.cart.find(i=>i.id===id);
  if(!it) return;
  let ids = [id];
  const m = it.meta||{};
  // quitar un nivel de especialización quita también los superiores de esa rama
  if(it.cat==="ESPECIALIZACIONES" && !m.suelta){
    ids = state.cart.filter(i=>i.cat==="ESPECIALIZACIONES" && !i.meta.suelta && i.meta.rama===m.rama && i.meta.nivel>=m.nivel).map(i=>i.id);
  }
  // devolver el nivel base si era la última subida
  if(m.kind==="stat" && state.statsBase[m.name]===m.to){ state.statsBase[m.name]=m.from; state.statsTarget[m.name]=m.to; }
  if(m.kind==="skill" && state.skillsBase[m.name]===m.to){ state.skillsBase[m.name]=m.from; state.skillsTarget[m.name]=m.to; }
  if(m.kind==="vent" && state.ventBase[m.name]===m.to){ state.ventBase[m.name]=m.from; state.ventTarget[m.name]=m.to; }
  state.cart = state.cart.filter(i=>!ids.includes(i.id));
  renderAll();
}
const cartBy = (fn)=> state.cart.filter(fn);
const countKey = key => state.cart.filter(i=>i.key===key).length;
const pdTotal = ()=> state.pdActuales + countKey("pd");

/* ---------- especializaciones sumatorias ---------- */
const espOwnedTotal = ()=> ESPEC_RAMAS.reduce((s,r)=>s+state.espOwned[r],0);
const espGuiadas = ()=> state.cart.filter(i=>i.cat==="ESPECIALIZACIONES" && !i.meta.suelta);
const espLevel = r => Math.max(
  state.espOwned[r] + espGuiadas().filter(i=>i.meta.rama===r).length,
  ...state.cart.filter(i=>i.cat==="ESPECIALIZACIONES" && i.meta.suelta && i.meta.rama===r).map(i=>i.meta.nivel), 0);
function syncEspec(){
  let n = espOwnedTotal();
  const perRama = {};
  espGuiadas().forEach(i=>{
    const r = i.meta.rama;
    perRama[r] = (perRama[r]||0) + 1;
    i.meta.nivel = state.espOwned[r] + perRama[r];
    n++;
    i.cost = 150*n;
    i.line = `${r} ${i.meta.nivel} (${n}ª especialización) — ${fmt(i.cost)} grageas`;
  });
  // si alguna rama quedó por encima de 3 (cambiaste lo que ya tenías), se recorta
  state.cart = state.cart.filter(i=> i.cat!=="ESPECIALIZACIONES" || i.meta.suelta || i.meta.nivel<=3);
}

/* ---------- recordatorios ---------- */
const ARC_NAMES = new Set(Object.values(ARC).flatMap(t=>Object.values(t).flat().map(a=>a.name)));
function prettyReq(r){
  const m = r.match(/^(.+) (\d)$/);
  if(m && ALL_SKILLS.includes(m[1])) return `${m[1]} ${SKILL_LVL[+m[2]]}`;
  return r;
}
function reminderFor(r, ctx="canje"){
  const what = ctx==="arcano" ? "canjear este arcano" : ctx==="talento" ? "canjear este talento" : "usar este canje";
  if(ARC_NAMES.has(r)) return `Recuerda que necesitas el arcano ${r} para ${what}.`;
  return `Recuerda que necesitas ${prettyReq(r)} para ${what}.`;
}
const ART = {
  hechizo:{un:"un hechizo", uno:"uno"}, pocion:{un:"una poción", uno:"una"}, ritual:{un:"un ritual", uno:"uno"}
};
function tierReminders(type, tier, extra=0){
  if(type==="objeto" || !ART[type]) return [];
  const f = ARC_TYPES[type].fem, w = t=> f ? TIER[t].f : TIER[t].m, out = [];
  if(tier==="int" && arcCount(type,"bas") < arcCount(type,"int")+extra)
    out.push(`Recuerda que necesitas ${ART[type].un} ${w("bas")} por cada ${w("int")} para obtener ${ART[type].uno} ${w("int")}.`);
  if(tier==="ava" && arcCount(type,"int") < arcCount(type,"ava")+extra)
    out.push(`Recuerda que necesitas ${ART[type].un} ${w("int")} por cada ${w("ava")} para obtener ${ART[type].uno} ${w("ava")}.`);
  return out;
}
/* reqs pendientes (no cumplidas en el carrito) + notas fijas */
function remindersOf(meta){
  const out = [];
  (meta.reqs||[]).forEach(r=>{ if(reqStatus(r)!=="ok") out.push(reminderFor(r, meta.ctx)); });
  if(meta.kind==="arcano") out.push(...tierReminders(meta.type, meta.tier));
  (meta.notes||[]).forEach(n=>out.push(n));
  return out;
}
function reminderHtml(list){
  if(!list.length) return "";
  return `<div class="rem-list">${list.map(t=>`<div class="rem">⚑ ${esc(t)}</div>`).join("")}</div>`;
}
/* chips ✓ para lo cumplido + recordatorios para lo pendiente */
function reqBlock(reqs, ctx, extra=[]){
  const ok = (reqs||[]).filter(r=>reqStatus(r)==="ok");
  const pend = (reqs||[]).filter(r=>reqStatus(r)!=="ok").map(r=>reminderFor(r,ctx));
  return (ok.length?`<div class="req-line">${ok.map(r=>`<span class="req-chip ok" title="En el carrito / cumplido">✓ ${esc(prettyReq(r))}</span>`).join("")}</div>`:"")
    + reminderHtml([...pend, ...extra]);
}
const reqNote = txt => txt ? `Recuerda que ${txt.replace(/^Requiere /,"necesitas ").replace(/\.$/,"")} para usar este canje.` : null;

/* ---------- requisitos ---------- */
const SPEC_RE = /^(Combatiente|Encantador|Hechicero|Jugador de Quidditch|Magizoólogo|Mago Oscuro|Medimago) (\d)/;
function inCartName(name){
  return state.cart.some(i=> i.meta && (i.meta.name===name || i.meta.talent===name));
}
function reqStatus(r){
  let m = r.match(SPEC_RE);
  if(m) return espLevel(m[1]) >= +m[2] ? "ok" : "bad";
  m = r.match(/^(.+) (\d)$/);
  if(m && STATS.includes(m[1])) return state.statsBase[m[1]] >= +m[2] ? "ok" : "bad";
  if(m && ALL_SKILLS.includes(m[1])) return state.skillsBase[m[1]] >= +m[2] ? "ok" : "bad";
  if(inCartName(r)) return "ok";
  return "check";
}
function reqChips(reqs){
  if(!reqs || !reqs.length) return "";
  return `<div class="req-line">${reqs.map(r=>{
    const s = reqStatus(r);
    const icon = s==="ok" ? "✓" : s==="bad" ? "✕" : "?";
    const tip = s==="ok" ? "Cumplido" : s==="bad" ? "No cumplido según lo cargado en la calculadora" : "Verificá que ya lo tengas en tu ficha";
    return `<span class="req-chip ${s}" title="${tip}">${icon} ${esc(r)}</span>`;
  }).join("")}</div>`;
}

/* ---------- totales ---------- */
function weaponCalc(w){
  let cost = w.base==="compra" ? ARMA_BASE : 0, slots = 0, used = 0, maxLvl = 0;
  const lines = [], warns = [], rems = [];
  if(w.base==="compra") lines.push(`Arma física — ${ARMA_BASE} grageas`);
  MATERIALES.forEach(m=>{
    const s = w.mats[m.n] || "no";
    if(s!=="no") slots += m.slots;
    if(s==="compra"){ cost += m.p; lines.push(`Material: ${m.n} — ${m.p} grageas`); }
    if(s!=="no" && m.req && (w.mats[m.req]||"no")==="no") rems.push(`Recuerda que necesitas ${m.req} para canjear ${m.n}.`);
  });
  RUNE_CHAINS.forEach(c=>{
    const r = w.runas[c.n] || {tiene:0, hasta:0};
    const top = Math.max(r.tiene, r.hasta);
    used += top;
    for(let l=r.tiene+1; l<=r.hasta; l++){
      cost += RUNE_PRICE[l]; maxLvl = Math.max(maxLvl,l);
      lines.push(`${runeName(c.n,l)} — ${RUNE_PRICE[l]} grageas`);
    }
  });
  if(used > slots) warns.push(`Faltan huecos de runa: usás ${used} y el arma tiene ${slots}.`);
  if(maxLvl && espLevel("Combatiente") < maxLvl) rems.push(`Recuerda que necesitas Combatiente ${maxLvl} para canjear runas de ese nivel.`);
  return {cost, slots, used, lines, warns, rems};
}
const armasCost = ()=> state.armas.reduce((s,w)=>s+weaponCalc(w).cost,0);
const cartTotal = ()=> state.cart.reduce((s,i)=>s+i.cost,0);
const totalGastado = ()=> cartTotal() + armasCost();
const plTotal = ()=> state.cart.reduce((s,i)=>s+(i.pl||0),0);
const catTotal = cat => state.cart.filter(i=>i.cat===cat).reduce((s,i)=>s+i.cost,0);

/* =========================================================
   LEDGER
   ========================================================= */
function renderLedger(){
  const g = totalGastado(), r = state.disponibles - g;
  document.getElementById("valGastadas").textContent = fmt(g);
  const re = document.getElementById("valRestantes");
  re.textContent = fmt(r); re.parentElement.classList.toggle("negative", r<0);
  document.getElementById("valCartQuick").textContent = `${state.cart.length} ítem(s) · ${fmt(g)} gr`;
  const pr = state.plDisponibles - plTotal();
  const pe = document.getElementById("valPLRestantes");
  pe.textContent = fmt(pr); pe.parentElement.classList.toggle("negative", pr<0);
  guardarCanjes(); // R08: todo cambio de la Tabla de Canjes termina aquí
}
document.getElementById("inpDisponibles").addEventListener("input", e=>{ state.disponibles = Number(e.target.value)||0; renderLedger(); });
document.getElementById("inpPL").addEventListener("input", e=>{ state.plDisponibles = Number(e.target.value)||0; renderLedger(); });
document.getElementById("cartQuickNav").addEventListener("click", ()=>{ showSection("canjes"); activateTab("carrito"); });
const resetBtn = document.getElementById("resetAllBtn");
let resetArmed = false, resetT = null;
resetBtn.addEventListener("click", ()=>{
  if(!resetArmed){
    resetArmed = true; resetBtn.textContent = "¿Seguro? Tocá de nuevo"; resetBtn.style.color = "var(--bad)";
    clearTimeout(resetT); resetT = setTimeout(()=>{ resetArmed=false; resetBtn.textContent="Reiniciar todo"; resetBtn.style.color=""; },3500);
    return;
  }
  clearTimeout(resetT); resetArmed=false; resetBtn.textContent="Reiniciar todo"; resetBtn.style.color="";
  state = makeInitialState();
  document.getElementById("inpDisponibles").value = 0;
  document.getElementById("inpPL").value = 0;
  renderAll();
});

/* =========================================================
   PESTAÑAS
   ========================================================= */
const TABS = [
  {id:"stats", label:"Estadísticas"},
  {id:"skills", label:"Habilidades"},
  {id:"especial", label:"Especializaciones"},
  {id:"trasfondos", label:"Trasfondos y Ventajas"},
  {id:"talentos", label:"Talentos"},
  {id:"arcanos", label:"Arcanos"},
  {id:"armas", label:"Armas"},
  {id:"formacion", label:"Formación e Idiomas"},
  {id:"raza", label:"Raza"},
  {id:"veterania", label:"Veteranía"},
  {id:"legendarias", label:"Legendarias"},
  {id:"carrito", label:"Carrito", cart:true},
  {id:"resumen", label:"Texto para copiar"}
];
const RENDERERS = {};
let activeTab = "stats";
function activateTab(id){
  activeTab = id;
  document.querySelectorAll(".tab-btn").forEach(b=>b.classList.toggle("active", b.dataset.tab===id));
  document.querySelectorAll(".panel").forEach(p=>p.classList.toggle("active", p.id==="panel-"+id));
}
function buildTabs(){
  const bar = document.getElementById("tabBar"), content = document.getElementById("tabContent");
  TABS.forEach((t,i)=>{
    const b = document.createElement("button");
    b.className = "tab-btn"+(i===0?" active":"")+(t.cart?" cart-tab":"");
    b.textContent = t.label; b.dataset.tab = t.id;
    b.addEventListener("click", ()=>activateTab(t.id));
    bar.appendChild(b);
    const p = document.createElement("div");
    p.className = "panel"+(i===0?" active":""); p.id = "panel-"+t.id;
    content.appendChild(p);
  });
  // borrar ítems desde cualquier lista
  content.addEventListener("click", e=>{
    const b = e.target.closest("[data-remove]");
    if(b) removeItem(Number(b.dataset.remove));
  });
}
function renderAll(){
  syncEspec();
  // conservar el scroll al re-renderizar
  const y = window.scrollY;
  Object.values(RENDERERS).forEach(fn=>fn());
  renderLedger();
  window.scrollTo(0,y);
}
function head(panelId, title, sub, pill){
  const p = document.getElementById("panel-"+panelId);
  p.innerHTML = `<h2 class="section-title">${title}${pill!==undefined?` <span class="subtotal-pill">${pill}</span>`:""}</h2>${sub?`<p class="section-sub">${sub}</p>`:""}`;
  return p;
}
function chipList(items, empty){
  const d = document.createElement("div");
  d.className = "chip-list";
  if(!items.length){ d.innerHTML = `<div class="empty-note">${empty}</div>`; return d; }
  d.innerHTML = items.map(i=>`<div class="chip"><div class="chip-main"><span>${esc(i.line)}</span>${reminderHtml(remindersOf(i.meta||{}))}</div><button class="chip-remove" data-remove="${i.id}" title="Quitar">✕</button></div>`).join("");
  return d;
}

/* ---------- fila nivel actual → nuevo ---------- */
function levelRow({max, actual, target, label=l=>String(l), cost, pl=0, onActual, onTarget, onAdd, btn="Agregar"}){
  const w = document.createElement("div");
  w.className = "buy-row";
  const o = sel => { let s=""; for(let l=0;l<=max;l++) s+=`<option value="${l}" ${l===sel?"selected":""}>${esc(label(l))}</option>`; return s; };
  w.innerHTML = `<div class="field"><label>Nivel actual</label><select class="la">${o(actual)}</select></div>
    <div class="arrow">→</div>
    <div class="field"><label>Nivel nuevo</label><select class="lt">${o(target)}</select></div>
    ${priceHtml(cost,pl)}
    <button class="btn" ${cost>0?"":"disabled"}>${btn}</button>`;
  w.querySelector(".la").addEventListener("change", e=>onActual(Number(e.target.value)));
  w.querySelector(".lt").addEventListener("change", e=>onTarget(Number(e.target.value)));
  w.querySelector("button").addEventListener("click", ()=>{ if(cost>0) onAdd(); });
  return w;
}

/* =========================================================
   ESTADÍSTICAS
   ========================================================= */
function statNotes(s,a,t){
  const n = [];
  if(t>5 && t<8 && !talentosoFor(s)) n.push(`Recuerda que necesitas el Talentoso de ${s} (límite 7) para usar este canje.`);
  else if(t>4 && t<8 && a<5) n.push(`Recuerda que necesitas tener el límite de ${s} en ${Math.min(t,5)} para usar este canje.`);
  if(t===8) n.push("Recuerda que necesitas Veteranía Legendaria para usar este canje (Atributo Legendario).");
  return n;
}
function skillNotes(stat,a,t){
  const n = [];
  if(t>=4 && a<4 && !talentosoFor(stat)) n.push(`Recuerda que necesitas el Talentoso de ${stat} para usar este canje (nivel Maestro).`);
  if(t===5) n.push("Recuerda que necesitas Veteranía Legendaria para usar este canje (Habilidad Legendaria).");
  return n;
}
RENDERERS.stats = function(){
  const p = head("stats","Estadísticas",
    "Elegí el nivel actual del atributo y el nivel al que lo subís; el coste es acumulativo. Subir al 8 es el <b>Atributo Legendario</b> y suma automáticamente sus 17 Puntos Legendarios.",
    `En el carrito: <b>${fmt(catTotal("ESTADÍSTICAS"))}</b> gr`);
  const g = document.createElement("div"); g.className = "grid-3";
  STATS.forEach(s=>{
    const a = state.statsBase[s], t = Math.max(state.statsTarget[s], a);
    const cost = costoSubida(STAT_ACUM,a,t), pl = (t===8 && a<8) ? 17 : 0;
    const c = document.createElement("div"); c.className = "card";
    c.innerHTML = `<div class="card-row"><span class="card-name">${s}</span></div>`;
    c.appendChild(levelRow({max:8, actual:a, target:t, cost, pl,
      label:l=> l===8 ? "8 · Legendario" : String(l),
      onActual:v=>{ state.statsBase[s]=v; if(state.statsTarget[s]<=v) state.statsTarget[s]=Math.min(v+1,8); renderAll(); },
      onTarget:v=>{ state.statsTarget[s]=v; renderAll(); },
      onAdd:()=>{
        const d = fusionarSubida("stat", s, a), c2 = costoSubida(STAT_ACUM,d,t), pl2 = (t===8 && d<8) ? 17 : 0;
        addToCart("ESTADÍSTICAS", `${s}: ${d} → ${t} — ${precioTexto(c2,pl2)}${pl2?" (Atributo Legendario)":""}`, c2, pl2, null, {kind:"stat", name:s, from:d, to:t, notes:statNotes(s,d,t)});
        state.statsBase[s]=t; state.statsTarget[s]=Math.min(t+1,8); renderAll();
      }}));
    if(cost>0) c.insertAdjacentHTML("beforeend", reminderHtml(statNotes(s,a,t)));
    g.appendChild(c);
  });
  p.appendChild(g);
};

/* =========================================================
   HABILIDADES (+ Arte / Artesanía múltiple)
   ========================================================= */
function talentosoFor(stat){ return state.cart.some(i=>i.key==="talentoso" && i.meta.detalle===stat); }
RENDERERS.skills = function(){
  const p = head("skills","Habilidades",
    "Niveles: Novato (+1), Competente (+2), Experto (+4), Maestro (+7) y Legendario (+9). Maestro requiere el Talentoso del atributo; Legendario suma 7 Puntos Legendarios y requiere Veteranía Legendaria.",
    `En el carrito: <b>${fmt(catTotal("HABILIDADES"))}</b> gr`);
  Object.entries(SKILL_GROUPS).forEach(([stat, skills])=>{
    const cat = document.createElement("div"); cat.className = "skill-cat";
    cat.innerHTML = `<div class="cat-head"><h3>${stat}</h3></div>`;
    const g = document.createElement("div"); g.className = "grid-3";
    skills.forEach(name=>{
      const a = state.skillsBase[name], t = Math.max(state.skillsTarget[name], a);
      const cost = costoSubida(SKILL_ACUM,a,t), pl = (t===5 && a<5) ? 7 : 0;
      const c = document.createElement("div"); c.className = "card";
      c.innerHTML = `<div class="card-row"><span class="card-name">${name}</span></div>`;
      c.appendChild(levelRow({max:5, actual:a, target:t, cost, pl,
        label:l=> l===0 ? "0" : `${l} · ${SKILL_LVL[l]}`,
        onActual:v=>{ state.skillsBase[name]=v; if(state.skillsTarget[name]<=v) state.skillsTarget[name]=Math.min(v+1,5); renderAll(); },
        onTarget:v=>{ state.skillsTarget[name]=v; renderAll(); },
        onAdd:()=>{
          const d = fusionarSubida("skill", name, a), c2 = costoSubida(SKILL_ACUM,d,t), pl2 = (t===5 && d<5) ? 7 : 0;
          addToCart("HABILIDADES", `${name}: ${SKILL_LVL[d]} → ${SKILL_LVL[t]} — ${precioTexto(c2,pl2)}${pl2?" (Habilidad Legendaria)":""}`, c2, pl2, null, {kind:"skill", name, from:d, to:t, notes:skillNotes(stat,d,t)});
          state.skillsBase[name]=t; state.skillsTarget[name]=Math.min(t+1,5); renderAll();
        }}));
      if(cost>0) c.insertAdjacentHTML("beforeend", reminderHtml(skillNotes(stat,a,t)));
      g.appendChild(c);
    });
    cat.appendChild(g);
    if(stat==="Voluntad") cat.appendChild(renderArteAdder());
    p.appendChild(cat);
  });
};
function renderArteAdder(){
  const box = document.createElement("div");
  box.className = "card"; box.style.marginTop = "14px";
  const spec = ui("arteSpec","Pintura"), extra = ui("arteExtra","");
  const nombre = spec==="Instrumento musical" ? `Instrumento musical: ${extra||"X"}` : spec;
  const kind = ARTESANIAS.includes(spec) ? "Artesanía" : "Arte";
  const full = `${kind} (${nombre})`;
  const prevTo = Math.max(0, ...state.cart.filter(i=>i.meta.kind==="arte" && i.meta.name===full).map(i=>i.meta.to));
  const a = Math.max(ui("arteA",0), prevTo), t = Math.max(ui("arteT",1), a);
  const cost = costoSubida(ARTE_ACUM,a,t), pl = (t===5 && a<5) ? 7 : 0;
  box.innerHTML = `<div class="card-row"><span class="card-name">Arte / Artesanía</span><span class="card-cost">38 · 75 · 125 · 200 · 375</span></div>
    <p class="perk-desc" style="margin-top:6px">Podés tener varias especialidades: agregá cada una por separado (Pintura, Forja, Canto…). Cuesta la mitad que una habilidad normal.</p>
    <div class="buy-row">
      <div class="field"><label>Especialidad</label><select class="as">
        <optgroup label="Artes">${optionsHtml(ARTES,spec)}</optgroup>
        <optgroup label="Artesanías">${optionsHtml(ARTESANIAS,spec)}</optgroup></select></div>
      ${spec==="Instrumento musical"?`<div class="field"><label>Instrumento</label><input type="text" class="ax" placeholder="Ej.: Violín" value="${esc(extra)}"></div>`:""}
      <div class="field"><label>Nivel actual</label><select class="la">${optionsHtml([0,1,2,3,4,5].map(l=>[l,l?`${l} · ${SKILL_LVL[l]}`:"0"]),a)}</select></div>
      <div class="arrow">→</div>
      <div class="field"><label>Nivel nuevo</label><select class="lt">${optionsHtml([0,1,2,3,4,5].map(l=>[l,l?`${l} · ${SKILL_LVL[l]}`:"0"]),t)}</select></div>
      ${priceHtml(cost,pl)}
      <button class="btn" ${cost>0?"":"disabled"}>Agregar</button>
    </div>`;
  if(cost>0) box.insertAdjacentHTML("beforeend", reminderHtml(skillNotes("Voluntad",a,t)));
  box.querySelector(".as").addEventListener("change", e=>{ state.ui.arteSpec=e.target.value; state.ui.arteA=0; state.ui.arteT=1; renderAll(); });
  const ax = box.querySelector(".ax"); if(ax) ax.addEventListener("change", e=>{ state.ui.arteExtra=e.target.value; renderAll(); });
  box.querySelector(".la").addEventListener("change", e=>{ state.ui.arteA=+e.target.value; if(state.ui.arteT<=state.ui.arteA) state.ui.arteT=Math.min(state.ui.arteA+1,5); renderAll(); });
  box.querySelector(".lt").addEventListener("change", e=>{ state.ui.arteT=+e.target.value; renderAll(); });
  box.querySelector("button.btn").addEventListener("click", ()=>{
    if(cost<=0) return;
    addToCart("HABILIDADES", `${full}: ${SKILL_LVL[a]} → ${SKILL_LVL[t]} — ${precioTexto(cost,pl)}${pl?" (Habilidad Legendaria)":""}`, cost, pl, null, {kind:"arte", name:full, from:a, to:t, notes:skillNotes("Voluntad",a,t)});
    state.ui.arteA = t; state.ui.arteT = Math.min(t+1,5); renderAll();
  });
  box.appendChild(chipList(state.cart.filter(i=>i.meta.kind==="arte"), "Todavía no agregaste ninguna especialidad de Arte / Artesanía."));
  return box;
}

/* =========================================================
   ESPECIALIZACIONES (precio sumatorio)
   ========================================================= */
RENDERERS.especial = function(){
  const owned = espOwnedTotal(), inCart = espGuiadas().length, total = owned+inCart;
  const p = head("especial","Especializaciones",
    `El precio depende de <b>cuántas especializaciones tenés en total</b>, sumando todas las ramas: la 1ª cuesta 150, la 2ª 300, la 3ª 450… (+150 cada una, máximo 21). Dentro de cada rama se compran en orden (para Hechicero 2 necesitás Hechicero 1).`,
    `En el carrito: <b>${fmt(catTotal("ESPECIALIZACIONES"))}</b> gr`);

  /* --- compra rápida de UNA especialización --- */
  const t0 = document.createElement("div"); t0.className = "cart-section-title"; t0.textContent = "Comprar una sola especialización";
  p.appendChild(t0);
  const sr = ui("espSRama", ESPEC_RAMAS[0]), sn = ui("espSNivel", 1), sp = ui("espSPrev", 0);
  const sCost = 150*(sp+1);
  const sd = document.createElement("div"); sd.className = "adder";
  const sNotes = sn>1 ? [`Recuerda que necesitas ${sr} ${sn-1} para canjear ${sr} ${sn}.`] : [];
  sd.innerHTML = `<div class="field"><label>Rama</label><select class="sr">${optionsHtml(ESPEC_RAMAS, sr)}</select></div>
    <div class="field"><label>Nivel</label><select class="sn">${optionsHtml([1,2,3].map(l=>[l,`${sr} ${l}`]), sn)}</select></div>
    <div class="field"><label>¿Cuántas especializaciones tenés ya? (todas las ramas)</label><input type="number" min="0" max="20" class="sp" value="${sp}"></div>
    <div class="field"><label>Sería tu</label><div class="buy-preview" style="text-align:left">${sp+1}ª</div></div>
    ${priceHtml(sCost,0)}
    <button class="btn" ${sp>=21?"disabled":""}>Agregar</button>
    ${sNotes.length?`<div class="field" style="flex-basis:100%">${reminderHtml(sNotes)}</div>`:""}`;
  sd.querySelector(".sr").addEventListener("change", e=>{ state.ui.espSRama=e.target.value; renderAll(); });
  sd.querySelector(".sn").addEventListener("change", e=>{ state.ui.espSNivel=+e.target.value; renderAll(); });
  sd.querySelector(".sp").addEventListener("change", e=>{ state.ui.espSPrev=Math.min(20,Math.max(0,+e.target.value||0)); renderAll(); });
  sd.querySelector("button.btn").addEventListener("click", ()=>{
    addToCart("ESPECIALIZACIONES", `${sr} ${sn} (${sp+1}ª especialización) — ${fmt(sCost)} grageas`, sCost, 0, null,
      {rama:sr, nivel:sn, suelta:true, notes:sNotes});
    state.ui.espSPrev = sp+1; renderAll();
  });
  p.appendChild(sd);
  p.insertAdjacentHTML("beforeend", `<div class="note-text">Si comprás varias seguidas, el contador sube solo (la siguiente ya cuenta la anterior).</div>`);

  /* --- calculadora por ramas --- */
  const t1 = document.createElement("div"); t1.className = "cart-section-title";
  t1.innerHTML = `O calcular por ramas <span class="mini-sum">tenés ${owned} · ${inCart} en carrito · la próxima cuesta ${fmt(150*(total+1))} gr</span>`;
  p.appendChild(t1);
  p.insertAdjacentHTML("beforeend", `<p class="section-sub" style="margin-top:0">Indicá el nivel que ya tenés en cada rama y hasta dónde querés subir: se calcula el número de cada especialización y su precio.</p>`);
  const g = document.createElement("div"); g.className = "grid-3";
  ESPEC_RAMAS.forEach(r=>{
    const lvlNow = espLevel(r);
    const tgt = Math.min(3, Math.max(state.espTarget[r], lvlNow+1));
    let cost = 0; const k = lvlNow<3 ? tgt - lvlNow : 0;
    for(let j=1;j<=k;j++) cost += 150*(total+j);
    const c = document.createElement("div"); c.className = "card";
    const inC = espGuiadas().filter(i=>i.meta.rama===r).length;
    c.innerHTML = `<div class="card-row"><span class="card-name">${r}</span><span class="card-cost">${inC?`+${inC} en carrito`:""}</span></div>
      <div class="buy-row">
        <div class="field"><label>Ya tenés</label><select class="eo">${optionsHtml([0,1,2,3],state.espOwned[r])}</select></div>
        <div class="arrow">→</div>
        <div class="field"><label>Subir hasta</label><select class="et" ${lvlNow>=3?"disabled":""}>${optionsHtml([1,2,3].filter(l=>l>lvlNow).map(l=>[l,`${r} ${l}`]),tgt)}</select></div>
        ${priceHtml(cost,0)}
        <button class="btn" ${k>0?"":"disabled"}>Agregar</button>
      </div>`;
    c.querySelector(".eo").addEventListener("change", e=>{ state.espOwned[r]=+e.target.value; renderAll(); });
    const et = c.querySelector(".et"); if(et) et.addEventListener("change", e=>{ state.espTarget[r]=+e.target.value; renderAll(); });
    c.querySelector("button.btn").addEventListener("click", ()=>{
      if(total + k > 21) return;
      for(let j=0;j<k;j++) addToCart("ESPECIALIZACIONES","",0,0,null,{rama:r, nivel:0});
      state.espTarget[r] = Math.min(3, tgt+1);
      renderAll();
    });
    g.appendChild(c);
  });
  p.appendChild(g);
  const t = document.createElement("div"); t.className = "cart-section-title"; t.textContent = "En el carrito";
  p.appendChild(t);
  p.appendChild(chipList(cartBy(i=>i.cat==="ESPECIALIZACIONES"), "Aún no agregaste especializaciones. (Si quitás un nivel, se quitan también los superiores de esa rama y se recalculan los precios.)"));
  if(espGuiadas().length && state.cart.some(i=>i.meta.suelta)) p.insertAdjacentHTML("beforeend", `<div class="warn-text">Estás usando los dos modos a la vez: revisá que los números de especialización (1ª, 2ª…) no se pisen entre sí.</div>`);
};

/* =========================================================
   TRASFONDOS Y VENTAJAS
   ========================================================= */
RENDERERS.trasfondos = function(){
  const p = head("trasfondos","Trasfondos y Ventajas",
    "Los trasfondos siempre se expresan con su nombre completo: el General es <b>Tipo + Categoría</b> (ej. <i>Informantes Política</i>) y el Específico <b>Tipo + Categoría &gt; Específico</b> (ej. <i>Informantes Política &gt; Azkaban</i>). Podés tener todos los que quieras. El nivel VI es una Característica Legendaria.",
    `En el carrito: <b>${fmt(catTotal("TRASFONDOS")+catTotal("VENTAJAS"))}</b> gr`);
  p.appendChild(trasfAdder("gen"));
  p.appendChild(trasfAdder("esp"));
  p.appendChild(chipList(cartBy(i=>i.cat==="TRASFONDOS"), "Aún no agregaste trasfondos."));

  const vt = document.createElement("div"); vt.className = "cart-section-title"; vt.textContent = "Ventajas (100 · 300 · 600, acumulables)";
  p.appendChild(vt);
  const g = document.createElement("div"); g.className = "grid-2";
  VENTAJAS.forEach(v=>{
    const a = state.ventBase[v], t = Math.max(state.ventTarget[v], a), cost = costoSubida(VENT_ACUM,a,t);
    const c = document.createElement("div"); c.className = "card";
    c.innerHTML = `<div class="card-row"><span class="card-name">${v}</span></div>`;
    c.appendChild(levelRow({max:3, actual:a, target:t, cost, label:l=>VENT_LABELS[v][l],
      onActual:x=>{ state.ventBase[v]=x; if(state.ventTarget[v]<=x) state.ventTarget[v]=Math.min(x+1,3); renderAll(); },
      onTarget:x=>{ state.ventTarget[v]=x; renderAll(); },
      onAdd:()=>{
        const d = fusionarSubida("vent", v, a), c2 = costoSubida(VENT_ACUM,d,t);
        addToCart("VENTAJAS", `${v}: ${VENT_LABELS[v][d]} → ${VENT_LABELS[v][t]} — ${fmt(c2)} grageas`, c2, 0, null, {kind:"vent", name:v, from:d, to:t});
        state.ventBase[v]=t; state.ventTarget[v]=Math.min(t+1,3); renderAll();
      }}));
    g.appendChild(c);
  });
  p.appendChild(g);
  p.insertAdjacentHTML("beforeend", `<div class="note-text">La Ventaja IV (legendaria) está en la pestaña Legendarias.</div>`);
};
function trasfAdder(kind){
  const esp = kind==="esp", pre = "tr"+kind;
  const tipo = ui(pre+"Tipo","Biblioteca");
  const cats = catsFor(tipo);
  let cat = ui(pre+"Cat", Object.keys(cats)[0]); if(!cats[cat]){ cat = Object.keys(cats)[0]; state.ui[pre+"Cat"]=cat; }
  let sp = ui(pre+"Sp", cats[cat][0]); if(!cats[cat].includes(sp)){ sp = cats[cat][0]; state.ui[pre+"Sp"]=sp; }
  const nombre = esp ? `${tipo} ${cat} > ${sp}` : `${tipo} ${cat}`;
  const base = nivelTrasfondo(nombre);
  if(state.ui[pre+"Nom"]!==nombre){ state.ui[pre+"Nom"]=nombre; state.ui[pre+"A"]=base; state.ui[pre+"T"]=Math.min(base+1,5); }
  const a = Math.max(ui(pre+"A",0), base), t = a>=5 ? a : Math.max(ui(pre+"T",1), a+1);
  const cost = costoSubida(esp?TESP_ACUM:TGEN_ACUM, a, t);
  const d = document.createElement("div"); d.className = "adder";
  d.innerHTML = `<div class="field" style="flex-basis:100%"><label>${esp?"Trasfondo específico (50 · 100 · 150 · 200 · 250)":"Trasfondo general (100 · 200 · 300 · 400 · 500)"}</label></div>
    <div class="field"><label>Tipo</label><select class="ft">${optionsHtml(TIPOS_TRASF,tipo)}</select></div>
    <div class="field"><label>Categoría</label><select class="fc">${optionsHtml(Object.keys(cats),cat)}</select></div>
    ${esp?`<div class="field"><label>Específico</label><select class="fs">${optionsHtml(cats[cat],sp)}</select></div>`:""}
    <div class="field"><label>Actual</label><select class="la">${optionsHtml([0,1,2,3,4,5].filter(l=>l>=base).map(l=>[l,ROMAN[l]]),a)}</select></div>
    <div class="arrow">→</div>
    <div class="field"><label>Nuevo</label><select class="lt">${optionsHtml([0,1,2,3,4,5].filter(l=>l>a).map(l=>[l,ROMAN[l]]),t)}</select></div>
    ${priceHtml(cost,0)}
    <button class="btn" ${cost>0?"":"disabled"}>Agregar</button>`;
  d.querySelector(".ft").addEventListener("change", e=>{ state.ui[pre+"Tipo"]=e.target.value; renderAll(); });
  d.querySelector(".fc").addEventListener("change", e=>{ state.ui[pre+"Cat"]=e.target.value; renderAll(); });
  const fs = d.querySelector(".fs"); if(fs) fs.addEventListener("change", e=>{ state.ui[pre+"Sp"]=e.target.value; renderAll(); });
  d.querySelector(".la").addEventListener("change", e=>{ state.ui[pre+"A"]=+e.target.value; if(state.ui[pre+"T"]<=+e.target.value) state.ui[pre+"T"]=Math.min(+e.target.value+1,5); renderAll(); });
  d.querySelector(".lt").addEventListener("change", e=>{ state.ui[pre+"T"]=+e.target.value; renderAll(); });
  d.querySelector("button.btn").addEventListener("click", ()=>{
    if(cost<=0) return;
    const d = fusionarSubida("trasf", nombre, a), c2 = costoSubida(esp?TESP_ACUM:TGEN_ACUM, d, t);
    addToCart("TRASFONDOS", `${nombre}: ${ROMAN[d]} → ${ROMAN[t]} — ${fmt(c2)} grageas`, c2, 0, null, {kind:"trasf", name:nombre, tipo, cat, esp:esp?sp:"", from:d, to:t});
    state.ui[pre+"A"]=t; state.ui[pre+"T"]=Math.min(t+1,5); renderAll();
  });
  return d;
}

/* =========================================================
   TALENTOS
   ========================================================= */
function horrocruxPrice(n){ return {p:1500+500*(n-1), pl:15+5*(n-1)}; }
function arcSelectOptions(type, sel){
  let html = "";
  ARC_TYPES[type].tiers.filter(t=>t!=="dom").forEach(t=>{
    html += `<optgroup label="${TIER[t].pl}">${optionsHtml(ARC[type][t].map(a=>a.name), sel)}</optgroup>`;
  });
  const customs = state.cart.filter(i=>i.meta.kind==="arcano" && i.meta.type===type && i.meta.custom).map(i=>i.meta.name);
  if(customs.length) html += `<optgroup label="Inventados / otros">${optionsHtml(customs, sel)}</optgroup>`;
  return html;
}
const LAZO_NIV = ["Nada","Lazo","Unión","Vínculo"];
function lazoRow(){
  const pj = ui("lazoPJ",""), a = ui("lazoA",0); let t = ui("lazoT",1); if(t<=a) t = a+1;
  const cost = 50*(t-a);
  const incl = LAZO_NIV.slice(a+1,t+1).join(" + ");
  const row = document.createElement("div"); row.className = "tal-row";
  row.innerHTML = `<div class="tal-name">Lazo / Unión / Vínculo<span class="tal-price">50 gr cada nivel</span>
      <div class="note-text" style="margin-top:4px">Cada nivel cuesta 50: un Vínculo desde cero son 150 (Lazo + Unión + Vínculo).</div>
      ${reminderHtml(["Recuerda que el otro PJ también tiene que canjearlo.", ...(a>0?[`Recuerda que necesitas tener ya el ${LAZO_NIV[a]} con ese PJ para usar este canje.`]:[])])}</div>
    <input type="text" class="lp" placeholder="PJ vinculado" value="${esc(pj)}">
    <select class="la">${optionsHtml([0,1,2].map(l=>[l,`Ya tenés: ${LAZO_NIV[l]}`]),a)}</select>
    <select class="lt">${optionsHtml([1,2,3].filter(l=>l>a).map(l=>[l,LAZO_NIV[l]]),t)}</select>
    <span class="tal-price">${cost} gr</span>
    <button class="btn small">Agregar</button>`;
  const lp = row.querySelector(".lp");
  lp.addEventListener("input", e=>state.ui.lazoPJ=e.target.value);
  row.querySelector(".la").addEventListener("change", e=>{ state.ui.lazoA=+e.target.value; renderAll(); });
  row.querySelector(".lt").addEventListener("change", e=>{ state.ui.lazoT=+e.target.value; renderAll(); });
  row.querySelector("button").addEventListener("click", ()=>{
    const n = lp.value.trim();
    if(!n){ lp.focus(); lp.classList.add("shake"); setTimeout(()=>lp.classList.remove("shake"),500); return; }
    addToCart("TALENTOS", `${LAZO_NIV[t]} con ${n}${t-a>1?` (${incl})`:""} — ${cost} grageas`, cost, 0, null,
      {kind:"lazo", talent:LAZO_NIV[t], detalle:n, notes:[`Recuerda que ${n} también tiene que canjear ${LAZO_NIV[t]==="Unión"?"la":"el"} ${LAZO_NIV[t]}.`]});
    state.ui.lazoPJ=""; state.ui.lazoA=0; state.ui.lazoT=1; renderAll();
  });
  return row;
}
RENDERERS.talentos = function(){
  const tot = state.cart.filter(i=>i.cat==="TALENTOS");
  const totPL = tot.reduce((s,i)=>s+i.pl,0);
  const p = head("talentos","Talentos",
    "Los talentos de arcano (Predilecto, Raudo, Virtuoso) se eligen sobre un arcano concreto desde el desplegable; si el arcano es parte de una cadena, el talento tiene que tenerse también sobre los anteriores de la cadena. Varios talentos se pueden canjear más de una vez.",
    `En el carrito: <b>${fmt(catTotal("TALENTOS"))}</b> gr${totPL?` · <b>${totPL}</b> PL`:""}`);
  const groups = [...new Set(TALENTOS.map(t=>t.g))];
  groups.forEach(gname=>{
    const tt = document.createElement("div"); tt.className = "cart-section-title"; tt.textContent = gname;
    p.appendChild(tt);
    const list = document.createElement("div"); list.className = "tal-list";
    TALENTOS.filter(t=>t.g===gname).forEach(t=>{
      if(t.field==="lazo"){ list.appendChild(lazoRow()); return; }
      const count = state.cart.filter(i=>i.meta.talent===t.n).length;
      const key = "tal_"+t.n;
      let fieldHtml = "", price = t.p, pl = t.pl||0;
      if(t.field==="text") fieldHtml = `<input type="text" class="tf" placeholder="${esc(t.ph||"")}" value="${esc(ui(key,""))}">`;
      else if(t.field && t.field.startsWith("arc:")) fieldHtml = `<select class="tf">${arcSelectOptions(t.field.slice(4), ui(key,""))}</select>`;
      else if(t.field==="horrocrux"){
        const n = ui(key, 1);
        fieldHtml = `<select class="tf">${optionsHtml([1,2,3,4,5,6,7].map(k=>[k,`${k}º Horrocrux`]), n)}</select>`;
        ({p:price, pl} = horrocruxPrice(Number(n)));
      }
      const blocked = !t.multi && count>0;
      const row = document.createElement("div"); row.className = "tal-row";
      row.innerHTML = `<div class="tal-name">${esc(t.n)}<span class="tal-price">${fmt(price)} gr${pl?` <span class="pl-tag">+${pl} PL</span>`:""}</span>${reqBlock(t.req,"talento")}</div>
        ${fieldHtml}
        <button class="btn small" ${blocked?"disabled":""}>${blocked?"En el carrito":"Agregar"}</button>
        ${count && t.multi?`<span class="perk-count">×${count}</span>`:""}`;
      const tf = row.querySelector(".tf");
      if(tf) tf.addEventListener("change", e=>{ state.ui[key]=e.target.value; if(t.field==="horrocrux") renderAll(); });
      if(tf && tf.tagName==="SELECT" && !state.ui[key]) state.ui[key]=tf.value;
      row.querySelector("button").addEventListener("click", ()=>{
        if(blocked) return;
        let det = tf ? String(tf.value||"").trim() : "";
        if(t.field==="horrocrux") det = `${det}º`;
        if(t.field && t.field!=="horrocrux" && !det){ tf.focus(); tf.classList.add("shake"); setTimeout(()=>tf.classList.remove("shake"),500); return; }
        if(t.multi && det && state.cart.some(i=>i.meta.talent===t.n && i.meta.detalle===det)) return;
        const reqs = [...(t.req||[])], notes = [];
        if(t.field && t.field.startsWith("arc:")){
          reqs.push(det);
          const a = findArc(t.field.slice(4), det);
          if(a && a.reqs.some(r=>ARC_NAMES.has(r))) notes.push(`Recuerda que necesitas tener ${t.n} también sobre los arcanos anteriores de la cadena de ${det} (${a.reqs.filter(r=>ARC_NAMES.has(r)).join(", ")}).`);
        }
        addToCart("TALENTOS", `${t.n}${det?` (${det})`:""} — ${precioTexto(price,pl)}`, price, pl, null, {talent:t.n, detalle:det, reqs, ctx:"talento", notes});
        if(t.field==="text") state.ui[key]="";
        renderAll();
      });
      list.appendChild(row);
      // avisos de límite por PD
      if(t.pdLimit && count > pdTotal()) list.insertAdjacentHTML("beforeend", `<div class="warn-text">${t.n}: sólo puede adquirirse tantas veces como tus Puntos de Destino (${pdTotal()}).</div>`);
    });
    if(gname==="Sociales"){
      const lz = state.cart.filter(i=>i.meta.kind==="lazo").length;
      if(lz > pdTotal()) list.insertAdjacentHTML("beforeend", `<div class="warn-text">La suma de tus Lazos, Uniones y Vínculos (${lz} en el carrito) no puede superar tus Puntos de Destino (${pdTotal()}). Cargá tus PD en la pestaña Veteranía.</div>`);
    }
    p.appendChild(list);
  });
  const tt = document.createElement("div"); tt.className = "cart-section-title"; tt.textContent = "En el carrito";
  p.appendChild(tt);
  p.appendChild(chipList(tot, "Aún no agregaste talentos."));
};

/* =========================================================
   ARCANOS (con desplegable)
   ========================================================= */
const tierWord = (type,t)=> ARC_TYPES[type].fem ? TIER[t].f : TIER[t].m;
function arcCount(type, tier){
  return (state.arcOwned[type]?.[tier]||0) + state.cart.filter(i=>i.meta.kind==="arcano" && i.meta.type===type && i.meta.tier===tier).length;
}
function findArc(type, name){
  for(const t of Object.keys(ARC[type])){ const a = ARC[type][t].find(x=>x.name===name); if(a) return a; }
  return null;
}
RENDERERS.arcanos = function(){
  const arcs = state.cart.filter(i=>i.cat==="ARCANOS");
  const p = head("arcanos","Arcanos",
    "Elegí el nivel y el arcano desde el desplegable: así queda escrito con su nombre en el texto final. Para cada intermedio necesitás al menos un básico y para cada avanzado al menos un intermedio, <b>contando cada tipo por separado</b> (los objetos se compran en cualquier orden). Pociones y rituales piden la habilidad a Novato / Competente / Experto según su nivel.",
    `En el carrito: <b>${fmt(catTotal("ARCANOS"))}</b> gr · ${arcs.length} arcano(s)`);
  Object.entries(ARC_TYPES).forEach(([type, T])=>{
    const sec = document.createElement("div"); sec.className = "arc-section";
    const items = arcs.filter(i=>i.meta.type===type);
    sec.innerHTML = `<div class="cart-section-title">${T.label} <span class="mini-sum">${fmt(items.reduce((s,i)=>s+i.cost,0))} gr</span></div>`;
    // ya poseídos (para la regla de proporción)
    if(type!=="objeto"){
      const o = document.createElement("div"); o.className = "owned-row";
      o.innerHTML = `<span>${T.label} que ya tenés en la ficha:</span>` + ["bas","int","ava"].map(t=>
        `<label>${TIER[t].pl} <input type="number" min="0" data-t="${t}" value="${state.arcOwned[type][t]}"></label>`).join("");
      o.insertAdjacentHTML("beforeend", `<button class="btn ghost small" data-fromficha title="Usar los arcanos cargados en Mi Ficha">Contar desde mi ficha</button>`);
      o.querySelectorAll("input").forEach(inp=>inp.addEventListener("change", e=>{ state.arcOwned[type][e.target.dataset.t] = Math.max(0, +e.target.value||0); renderAll(); }));
      o.querySelector("[data-fromficha]").addEventListener("click", ()=>{ const f = window.grimorioFicha && window.grimorioFicha(); if(!f) return;
        ["bas","int","ava"].forEach(t=>{ state.arcOwned[type][t] = f.arcanos.filter(a=>a.type===type && a.tier===t).length; }); renderAll(); });
      sec.appendChild(o);
    }
    // selector
    const tier = ui("arcTier_"+type, T.tiers.includes("bas")?"bas":T.tiers[0]);
    const list = ARC[type][tier];
    const inCartNames = new Set(items.map(i=>i.meta.name));
    let sel = ui("arcSel_"+type, "");
    if(sel!=="__otro" && (!list.find(a=>a.name===sel) || inCartNames.has(sel) || fichaTieneArc(sel))){
      const first = list.find(a=>!inCartNames.has(a.name) && !fichaTieneArc(a.name));
      sel = first ? first.name : "__otro"; state.ui["arcSel_"+type] = sel;
    }
    const arc = list.find(a=>a.name===sel);
    const custom = ui("arcCustom_"+type, "");
    const price = TIER[tier].price;
    const d = document.createElement("div"); d.className = "adder";
    d.innerHTML = `<div class="field"><label>Nivel</label><select class="at">${optionsHtml(T.tiers.map(t=>[t,`${T.sing} ${tierWord(type,t)} (${TIER[t].price})`]),tier)}</select></div>
      <div class="field grow"><label>${T.sing}</label><select class="an">${arcOptGroups(list, inCartNames, sel)}<option value="__otro" ${sel==="__otro"?"selected":""}>Otro / inventado (escribir)…</option></select></div>
      ${sel==="__otro"?`<div class="field grow"><label>Nombre</label><input type="text" class="ac" placeholder="Nombre del arcano" value="${esc(custom)}"></div>`:""}
      ${priceHtml(price,0)}
      <button class="btn">Agregar</button>`;
    sec.appendChild(d);
    const reqs = [...(arc?arc.reqs:[])];
    if(T.skill && TIER[tier].gate) reqs.unshift(`${T.skill} ${TIER[tier].gate}`);
    const preview = reqBlock(reqs, "arcano", tierReminders(type, tier, 1));
    if(preview) d.insertAdjacentHTML("beforeend", `<div class="field" style="flex-basis:100%">${preview}</div>`);
    if(arc && arc.inv) d.insertAdjacentHTML("beforeend", `<div class="field" style="flex-basis:100%">${reminderHtml([invNote(arc.autor)])}</div>`);
    const dsc = arc && DESC[type+"|"+arc.name];
    if(dsc) d.insertAdjacentHTML("beforeend", `<details class="arc-desc"><summary>Ver descripción de ${esc(arc.name)}</summary>${descBody(dsc)}</details>`);
    d.querySelector(".at").addEventListener("change", e=>{ state.ui["arcTier_"+type]=e.target.value; state.ui["arcSel_"+type]=""; renderAll(); });
    d.querySelector(".an").addEventListener("change", e=>{ state.ui["arcSel_"+type]=e.target.value; renderAll(); });
    const ac = d.querySelector(".ac"); if(ac) ac.addEventListener("input", e=>{ state.ui["arcCustom_"+type]=e.target.value; });
    d.querySelector("button.btn").addEventListener("click", ()=>{
      const isCustom = sel==="__otro";
      const name = isCustom ? (state.ui["arcCustom_"+type]||"").trim() : sel;
      if(!name){ if(ac){ ac.focus(); ac.classList.add("shake"); setTimeout(()=>ac.classList.remove("shake"),500);} return; }
      if(!addArcanoToCart(type, tier, name, {custom:isCustom, reqs, inv:!!(arc&&arc.inv), autor:arc&&arc.autor})) return;
      if(isCustom) state.ui["arcCustom_"+type] = "";
      state.ui["arcSel_"+type] = "";
      renderAll();
    });
    // avisos
    // ordenados por nivel
    const order = {dom:0,bas:1,int:2,ava:3};
    sec.appendChild(chipList(items.slice().sort((x,y)=>order[x.meta.tier]-order[y.meta.tier]), `Aún no agregaste ${T.label.toLowerCase()}.`));
    p.appendChild(sec);
  });
};


/* ---------- helpers compartidos arcanos / compendio ---------- */
const invNote = autor => `Arcano inventado por ${autor}: confirmá con su autor o con Sistemas que podés canjearlo.`;
/* ¿El personaje activo (Mi Ficha) ya tiene este arcano? */
const _arcKey = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
function fichaTieneArc(...names){
  try{ const f = window.grimorioFicha && window.grimorioFicha(); if(!f || !f.arcanos) return false;
    const ks = names.flatMap(n=>String(n||'').split('|')).map(_arcKey).filter(Boolean);
    return f.arcanos.some(a=>ks.includes(_arcKey(a.name))); }catch(e){ return false; }
}
function fichaNombrePJ(){ try{ const f=window.grimorioFicha&&window.grimorioFicha(); return (f&&f.nombre)||'tu personaje'; }catch(e){ return 'tu personaje'; } }
function arcOptGroups(list, inCartNames, sel){
  const opt = a => { const own = fichaTieneArc(a.name); return [a.name, inCartNames.has(a.name)?`${a.name} ✓ en carrito`:own?`${a.name} ✓ ya lo tenés`:(a.inv?`${a.name} · ${a.autor}`:a.name), inCartNames.has(a.name)||own]; };
  const of = list.filter(a=>!a.inv), inv = list.filter(a=>a.inv);
  return `<optgroup label="Oficiales">${optionsHtml(of.map(opt),sel)}</optgroup>` + (inv.length?`<optgroup label="Inventados por jugadores">${optionsHtml(inv.map(opt),sel)}</optgroup>`:"");
}
function arcInCart(type, name){ return state.cart.some(i=>i.meta.kind==="arcano" && i.meta.type===type && i.meta.name===name); }
function addArcanoToCart(type, tier, name, o={}){
  if(arcInCart(type,name)) return false;
  if(fichaTieneArc(name) && !window.confirm(`${fichaNombrePJ()} ya tiene «${name}» en su ficha. ¿Agregarlo al carrito igual?`)) return false;
  const T = ARC_TYPES[type], price = TIER[tier].price;
  addToCart("ARCANOS", `${T.sing} ${tierWord(type,tier)}: ${name}${o.inv?" (inventado)":""} — ${price} grageas`, price, 0, null,
    {kind:"arcano", type, tier, name, custom:!!o.custom, inv:!!o.inv, reqs:[...(o.reqs||[])], ctx:"arcano", notes:o.inv?[invNote(o.autor)]:[]});
  return true;
}
function compReqs(a){
  const f = findArc(a.type, a.calcName);
  const reqs = [...(f?f.reqs:[])];
  const T = ARC_TYPES[a.type];
  if(T.skill && TIER[a.tier] && TIER[a.tier].gate) reqs.unshift(`${T.skill} ${TIER[a.tier].gate}`);
  return reqs;
}
function descBody(a, q="", hl=false){
  const H = t => hl ? compHL(t,q) : esc(t);
  return `${a.requisito?`<p class="cmp-req">${esc(a.requisito)}</p>`:""}
    <div class="cmp-body">${a.texto.split(/\n+/).filter(t=>t.trim()).map(t=>`<p${/^\s*[•—]/.test(t)?' class="bullet"':""}>${H(t.trim())}</p>`).join("")}</div>
    ${a.autor?`<p class="cmp-author">Creado por <a href="${esc(a.autor.url)}" target="_blank" rel="noopener">${esc(a.autor.nombre)}</a></p>`:""}`;
}

/* =========================================================
   COMPENDIO ARCANO
   ========================================================= */
const COMP = {q:"", fuente:new Set(), nivel:new Set(), origen:new Set(), cat:new Set(), open:new Set(), inName:true, inText:true, built:false};
const C_FUENTES = ["Hechizos","Pociones","Rituales","Objetos"];
const C_NIVELES = [["dom","Doméstico"],["bas","Básico"],["int","Intermedio"],["ava","Avanzado"],["leg","Legendario"]];
const C_CATS = ["Combate","Utilidad","Sanación","Ultraje","Contrahechizo"];
const cnorm = s => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
function compHL(text, q){
  if(!q) return esc(text);
  const nq = cnorm(q), nt = cnorm(text); let out="", i=0, idx;
  while((idx = nt.indexOf(nq,i)) !== -1){ out += esc(text.slice(i,idx)) + "<mark>" + esc(text.slice(idx, idx+q.length)) + "</mark>"; i = idx+q.length; }
  return out + esc(text.slice(i));
}
function compSnippet(text, q){
  const cut = t => t.length>160 ? t.slice(0,160)+"…" : t;
  if(!q || !COMP.inText) return cut(text);
  const idx = cnorm(text).indexOf(cnorm(q));
  if(idx===-1) return cut(text);
  const s = Math.max(0, idx-60), e = Math.min(text.length, idx+q.length+100);
  return (s>0?"…":"") + text.slice(s,e) + (e<text.length?"…":"");
}
function compMatch(a, q){
  if(COMP.fuente.size && !COMP.fuente.has(a.fuente)) return false;
  if(COMP.nivel.size && !COMP.nivel.has(a.tier)) return false;
  if(COMP.origen.size && !COMP.origen.has(a.origen)) return false;
  if(COMP.cat.size && ![...COMP.cat].every(c=>a.categorias.includes(c))) return false;
  if(!q) return true;
  const nq = cnorm(q);
  return (COMP.inName && cnorm(a.nombre).includes(nq)) || (COMP.inText && cnorm(a.texto).includes(nq)) || (a.autor && cnorm(a.autor.nombre).includes(nq));
}
function buildCompendio(){
  const p = head("compendio","Compendio Arcano",
    `Todos los hechizos, pociones, rituales y objetos del Sistema Avadense, oficiales e inventados. Buscá por nombre o por lo que hace, abrí la descripción completa y agregalo al carrito desde acá mismo.`,
    `${ARCANOS.length} arcanos`);
  const box = document.createElement("div"); box.className = "cmp-wrap";
  const chips = (key, list) => list.map(([v,l])=>`<button class="cmp-chip" data-k="${key}" data-v="${esc(v)}">${esc(l)}</button>`).join("");
  const cnt = f => ARCANOS.filter(f).length;
  box.innerHTML = `
    <div class="cmp-search"><input type="text" id="cmpQ" placeholder="Invocá un arcano por su nombre o por lo que hace…" autocomplete="off"><span class="ic">⚝</span></div>
    <div class="cmp-scope"><span class="mini-lbl">Buscar en</span>
      <button class="cmp-tick active" data-scope="inName">Nombre</button>
      <button class="cmp-tick active" data-scope="inText">Descripción</button></div>
    <div class="cmp-filters">
      <div class="cmp-row"><span class="mini-lbl">Tipo</span>${chips("fuente", C_FUENTES.map(f=>[f,`${f} (${cnt(a=>a.fuente===f)})`]))}</div>
      <div class="cmp-row"><span class="mini-lbl">Nivel</span>${chips("nivel", C_NIVELES)}</div>
      <div class="cmp-row"><span class="mini-lbl">Origen</span>${chips("origen", [["Oficial",`Oficiales (${cnt(a=>a.origen==="Oficial")})`],["Inventado",`Inventados (${cnt(a=>a.origen!=="Oficial")})`]])}</div>
      <div class="cmp-row"><span class="mini-lbl">Efecto</span>${chips("cat", C_CATS.map(c=>[c,`${c} (${cnt(a=>a.categorias.includes(c))})`]))}</div>
    </div>
    <div class="cmp-meta"><span id="cmpCount"></span><button class="cmp-clear" id="cmpClear">limpiar filtros</button></div>
    <div id="cmpResults"></div>`;
  p.appendChild(box);
  let deb;
  box.querySelector("#cmpQ").addEventListener("input", e=>{ clearTimeout(deb); const v=e.target.value; deb=setTimeout(()=>{ COMP.q=v; compResults(); },90); });
  box.querySelectorAll(".cmp-tick").forEach(b=>b.addEventListener("click", ()=>{
    const k=b.dataset.scope, other = k==="inName"?"inText":"inName";
    if(COMP[k] && !COMP[other]) return;
    COMP[k] = !COMP[k]; b.classList.toggle("active", COMP[k]); compResults();
  }));
  box.querySelectorAll(".cmp-chip").forEach(b=>b.addEventListener("click", ()=>{
    const set = COMP[b.dataset.k], v = b.dataset.v;
    set.has(v) ? set.delete(v) : set.add(v); b.classList.toggle("active", set.has(v)); compResults();
  }));
  box.querySelector("#cmpClear").addEventListener("click", ()=>{
    ["fuente","nivel","origen","cat"].forEach(k=>COMP[k].clear()); COMP.q=""; COMP.inName=COMP.inText=true;
    box.querySelector("#cmpQ").value=""; box.querySelectorAll(".cmp-chip").forEach(b=>b.classList.remove("active"));
    box.querySelectorAll(".cmp-tick").forEach(b=>b.classList.add("active")); compResults();
  });
  box.querySelector("#cmpResults").addEventListener("click", e=>{
    if(e.target.closest("a")) return;
    const add = e.target.closest("[data-add]");
    if(add){
      e.stopPropagation();
      const a = ARC_BY_ID[add.dataset.add];
      if(a.tier==="leg"){ showSection("canjes"); activateTab("legendarias"); return; }
      addArcanoToCart(a.type, a.tier, a.calcName, {reqs:compReqs(a), inv:a.origen!=="Oficial", autor:a.autor&&a.autor.nombre});
      renderAll(); return;
    }
    const card = e.target.closest(".cmp-card"); if(!card) return;
    const id = card.dataset.id;
    COMP.open.has(id) ? COMP.open.delete(id) : COMP.open.add(id);
    card.classList.toggle("open");
  });
  COMP.built = true;
}
const C_TONE = {Hechizos:"h", Pociones:"p", Rituales:"r", Objetos:"o"};
function compResults(){
  const q = COMP.q.trim();
  const list = ARCANOS.filter(a=>compMatch(a,q)).sort((x,y)=>x.nombre.localeCompare(y.nombre,"es"));
  document.getElementById("cmpCount").innerHTML = q ? `<b>${list.length}</b> resultado${list.length!==1?"s":""} para «${esc(q)}»` : `<b>${list.length}</b> arcano${list.length!==1?"s":""}`;
  const res = document.getElementById("cmpResults");
  if(!list.length){ res.innerHTML = `<div class="empty-note">Ningún grimorio guarda registro de tal arcano.</div>`; return; }
  res.innerHTML = list.map(a=>{
    const T = ARC_TYPES[a.type], inC = a.tier!=="leg" && arcInCart(a.type, a.calcName), inv = a.origen!=="Oficial";
    const nivelLbl = a.tier==="leg" ? "✦ Legendario" : (T.fem ? TIER[a.tier].f : TIER[a.tier].m).replace(/^./,c=>c.toUpperCase());
    const btn = a.tier==="leg"
      ? `<button class="btn ghost small" data-add="${a.id}" title="Se canjea como Característica Legendaria">Ver Legendarias</button>`
      : inC ? `<button class="btn small" disabled>✓ En el carrito</button>`
      : fichaTieneArc(a.calcName, a.nombre) ? `<button class="btn small owned" disabled title="${esc(fichaNombrePJ())} ya lo tiene en su ficha">✓ Ya lo tenés</button>`
            : `<button class="btn small ${inv?"arcane":""}" data-add="${a.id}">Agregar · ${TIER[a.tier].price} gr</button>`;
    const reqs = a.tier!=="leg" ? reqBlock(compReqs(a), "arcano", inv?[invNote(a.autor?a.autor.nombre:"su autor")]:[]) : "";
    return `<div class="cmp-card${COMP.open.has(a.id)?" open":""}${a.tier==="leg"?" legend":""}" data-id="${a.id}">
      <div class="cmp-head">
        <div class="cmp-main">
          <p class="cmp-name">${COMP.inName?compHL(a.nombre,q):esc(a.nombre)}</p>
          <div class="cmp-tags"><span class="cmp-tag t-${C_TONE[a.fuente]}">${a.fuente}</span><span class="cmp-tag lvl">${nivelLbl}</span>${inv?`<span class="cmp-tag inv">Inventado</span>`:""}${a.categorias.map(c=>`<span class="cmp-tag">${c}</span>`).join("")}</div>
          <p class="cmp-snip">${COMP.inText?compHL(compSnippet(a.texto,q),q):esc(compSnippet(a.texto,""))}</p>
        </div>
        <div class="cmp-act">${btn}<span class="cmp-x">✛</span></div>
      </div>
      <div class="cmp-full">${reqs}${descBody(a, q, COMP.inText)}</div>
    </div>`;
  }).join("");
}
RENDERERS.compendio = function(){ if(!COMP.built) buildCompendio(); compResults(); };

/* =========================================================
   ARMAS
   ========================================================= */
RENDERERS.armas = function(){
  const p = head("armas","Armas",
    "Arma física 100 gr (5 PAs de daño base, sin huecos). Cada material da huecos de runa (sólo uno de cada tipo por arma). Las runas de una cadena se compran nivel por nivel, pero sólo ocupa hueco la más alta (Mínima 1, Media 2, Máxima 3). Requieren Combatiente 1 / 2 / 3.",
    `Subtotal: <b>${fmt(armasCost())}</b> gr`);
  state.armas.forEach((w, idx)=>{
    const calc = weaponCalc(w);
    const card = document.createElement("div"); card.className = "weapon-card";
    card.innerHTML = `<div class="weapon-head">
        <input type="text" class="wn" value="${esc(w.nombre)}" placeholder="Nombre / descripción del arma">
        <span class="mini-sum">${fmt(calc.cost)} gr</span>
        ${state.armas.length>1?`<button class="btn ghost small wdel">Quitar arma</button>`:""}
      </div>
      <div class="buy-row" style="margin-top:6px"><div class="field"><label>Arma física (100 gr)</label>
        <select class="wb">${optionsHtml([["no","— (no canjeo armas)"],["compra","Comprar (arma nueva)"],["tiene","Ya la tiene"]], w.base)}</select></div></div>`;
    const cols = document.createElement("div"); cols.className = "weapon-cols";
    const mc = document.createElement("div"); mc.className = "weapon-col";
    mc.innerHTML = `<h4>Materiales</h4>` + MATERIALES.map(m=>`<div class="check-row"><label>${m.n}<small> · ${m.slots} hueco${m.slots>1?"s":""}${m.req?` · req. ${m.req}`:""}</small></label>
      <span class="price">${m.p} gr</span><select data-mat="${esc(m.n)}">${optionsHtml([["no","—"],["tiene","Ya lo tiene"],["compra","Comprar"]], w.mats[m.n]||"no")}</select></div>`).join("");
    const rc = document.createElement("div"); rc.className = "weapon-col";
    rc.innerHTML = `<h4>Runas (50 · 150 · 300)</h4>` + RUNE_CHAINS.map(c=>{
      const r = w.runas[c.n] || {tiene:0,hasta:0};
      const lv = Array.from({length:c.max+1},(_,l)=>[l, l? (c.n==="Venite"?"Venite":RUNE_LVL[l]) : "—"]);
      return `<div class="check-row"><label>${c.n}<small> · potencia con ${c.arc}</small></label>
        <span class="mini-lbl">tiene</span><select data-rt="${c.n}">${optionsHtml(lv, r.tiene)}</select>
        <span class="mini-lbl">compra hasta</span><select data-rh="${c.n}">${optionsHtml(lv.filter(([l])=>l===0||l>r.tiene), r.hasta)}</select></div>`;
    }).join("");
    cols.appendChild(mc); cols.appendChild(rc); card.appendChild(cols);
    card.insertAdjacentHTML("beforeend", `<div class="weapon-summary"><span>Huecos disponibles: <b>${calc.slots}</b></span>
      <span>Huecos usados: <b class="${calc.used>calc.slots?"slots-bad":"slots-ok"}">${calc.used}</b></span>
      <span>Combatiente: <b>${espLevel("Combatiente")}</b></span></div>`);
    calc.warns.forEach(x=> card.insertAdjacentHTML("beforeend", `<div class="warn-text">${esc(x)}</div>`));
    card.insertAdjacentHTML("beforeend", reminderHtml(calc.rems));
    card.querySelector(".wn").addEventListener("change", e=>{ w.nombre = e.target.value; renderAll(); });
    card.querySelector(".wb").addEventListener("change", e=>{ w.base = e.target.value; renderAll(); });
    const del = card.querySelector(".wdel"); if(del) del.addEventListener("click", ()=>{ state.armas.splice(idx,1); renderAll(); });
    card.querySelectorAll("[data-mat]").forEach(s=>s.addEventListener("change", e=>{ w.mats[e.target.dataset.mat]=e.target.value; renderAll(); }));
    card.querySelectorAll("[data-rt]").forEach(s=>s.addEventListener("change", e=>{
      const r = w.runas[e.target.dataset.rt] ||= {tiene:0,hasta:0}; r.tiene = +e.target.value; if(r.hasta<=r.tiene) r.hasta=0; renderAll(); }));
    card.querySelectorAll("[data-rh]").forEach(s=>s.addEventListener("change", e=>{
      const r = w.runas[e.target.dataset.rh] ||= {tiene:0,hasta:0}; r.hasta = +e.target.value; renderAll(); }));
    p.appendChild(card);
  });
  const add = document.createElement("button"); add.className = "btn ghost"; add.textContent = "+ Agregar otra arma";
  add.addEventListener("click", ()=>{ state.armas.push(newArma(state.armas.length+1)); renderAll(); });
  p.appendChild(add);
};

/* =========================================================
   FORMACIÓN E IDIOMAS
   ========================================================= */
RENDERERS.formacion = function(){
  const p = head("formacion","Formación e Idiomas",
    "Los títulos no son acumulativos: se paga directamente la nota que canjeás. Los idiomas sí van por niveles (Bajo → Medio → Alto): 50 gr por nivel si es muggle y 100 si es mágico.",
    `En el carrito: <b>${fmt(catTotal("TÍTULOS ACADÉMICOS")+catTotal("IDIOMAS"))}</b> gr`);
  const t1 = document.createElement("div"); t1.className = "cart-section-title"; t1.textContent = "TIMOs (curso mínimo: 6º)";
  p.appendChild(t1);
  const timo = ui("timoNota", NOTAS[0]);
  const a = document.createElement("div"); a.className = "adder";
  a.innerHTML = `<div class="field grow"><label>Calificación</label><select class="tn">${optionsHtml(NOTAS.map((n,i)=>[n,`${n} (${TIMOS_PRECIO[i]})`]), timo)}</select></div>
    <button class="btn">Agregar</button>`;
  a.querySelector(".tn").addEventListener("change", e=>state.ui.timoNota=e.target.value);
  a.querySelector(".btn").addEventListener("click", ()=>{
    const n = state.ui.timoNota, c = TIMOS_PRECIO[NOTAS.indexOf(n)];
    addToCart("TÍTULOS ACADÉMICOS", `TIMOs: ${n} — ${c} grageas`, c, 0, "timos", {name:"TIMOs", notes:["Recuerda que necesitas estar como mínimo en 6º curso para usar este canje."]});
    renderAll();
  });
  p.appendChild(a);
  const t2 = document.createElement("div"); t2.className = "cart-section-title"; t2.textContent = "EXTASIS (etapa mínima: Joven) — por asignatura";
  p.appendChild(t2);
  const ea = ui("extAsig", EXTASIS_ASIG[0]), en = ui("extNota", NOTAS[0]);
  const b = document.createElement("div"); b.className = "adder";
  b.innerHTML = `<div class="field grow"><label>Asignatura</label><select class="ea">${optionsHtml(EXTASIS_ASIG, ea)}</select></div>
    <div class="field"><label>Calificación</label><select class="en">${optionsHtml(NOTAS.map((n,i)=>[n,`${n} (${EXTASIS_PRECIO[i]})`]), en)}</select></div>
    <button class="btn">Agregar</button>`;
  b.querySelector(".ea").addEventListener("change", e=>state.ui.extAsig=e.target.value);
  b.querySelector(".en").addEventListener("change", e=>state.ui.extNota=e.target.value);
  b.querySelector(".btn").addEventListener("click", ()=>{
    const s = state.ui.extAsig, n = state.ui.extNota, c = EXTASIS_PRECIO[NOTAS.indexOf(n)];
    if(state.cart.some(i=>i.meta.name===`EXTASIS ${s}`)) return;
    addToCart("TÍTULOS ACADÉMICOS", `EXTASIS de ${s}: ${n} — ${c} grageas`, c, 0, null, {name:`EXTASIS ${s}`, notes:["Recuerda que necesitas estar como mínimo en la etapa Joven para usar este canje."]});
    renderAll();
  });
  p.appendChild(b);
  if(countKey("timos")>1) p.insertAdjacentHTML("beforeend", `<div class="warn-text">Hay más de un TIMOs en el carrito: los TIMOs son un único título.</div>`);
  p.appendChild(chipList(cartBy(i=>i.cat==="TÍTULOS ACADÉMICOS"), "Sin títulos en el carrito."));

  const t3 = document.createElement("div"); t3.className = "cart-section-title"; t3.textContent = "Idiomas";
  p.appendChild(t3);
  const nombre = ui("idNombre",""), tipo = ui("idTipo","Muggle");
  const ia = ui("idA",0); let it = ui("idT",1); if(it<=ia) it = ia+1;
  const step = tipo==="Mágico" ? 100 : 50, cost = Math.max(0, it-ia)*step;
  const c = document.createElement("div"); c.className = "adder";
  c.innerHTML = `<div class="field grow"><label>Idioma</label><input type="text" class="in" list="idiomasList" placeholder="Ej.: Francés, Pársel…" value="${esc(nombre)}">
      <datalist id="idiomasList">${IDIOMAS_MAGICOS.map(x=>`<option value="${x}">`).join("")}<option value="Inglés"><option value="Francés"><option value="Alemán"><option value="Español"><option value="Italiano"><option value="Coreano"><option value="Japonés"><option value="Ruso"></datalist></div>
    <div class="field"><label>Tipo</label><select class="itp">${optionsHtml(["Muggle","Mágico"], tipo)}</select></div>
    <div class="field"><label>Nivel actual</label><select class="la">${optionsHtml([0,1,2].map(l=>[l,IDIOMA_NIVEL[l]]), ia)}</select></div>
    <div class="arrow">→</div>
    <div class="field"><label>Nivel nuevo</label><select class="lt">${optionsHtml([1,2,3].filter(l=>l>ia).map(l=>[l,IDIOMA_NIVEL[l]]), it)}</select></div>
    ${priceHtml(cost,0)}
    <button class="btn" ${cost>0?"":"disabled"}>Agregar</button>`;
  c.querySelector(".in").addEventListener("change", e=>{
    state.ui.idNombre = e.target.value;
    if(IDIOMAS_MAGICOS.some(m=>m.toLowerCase()===e.target.value.trim().toLowerCase())) state.ui.idTipo = "Mágico";
    renderAll();
  });
  c.querySelector(".itp").addEventListener("change", e=>{ state.ui.idTipo=e.target.value; renderAll(); });
  c.querySelector(".la").addEventListener("change", e=>{ state.ui.idA=+e.target.value; if(state.ui.idT<=state.ui.idA) state.ui.idT=state.ui.idA+1; renderAll(); });
  c.querySelector(".lt").addEventListener("change", e=>{ state.ui.idT=+e.target.value; renderAll(); });
  c.querySelector("button.btn").addEventListener("click", ()=>{
    const n = (c.querySelector(".in").value||"").trim();
    if(!n){ c.querySelector(".in").focus(); return; }
    addToCart("IDIOMAS", `${n} (${tipo.toLowerCase()}): ${IDIOMA_NIVEL[ia]} → ${IDIOMA_NIVEL[it]} — ${cost} grageas`, cost, 0, null, {name:n, notes:[
      ...(ia>0?[`Recuerda que necesitas tener ya ${n} a nivel ${IDIOMA_NIVEL[ia]} para usar este canje.`]:[]),
      ...(tipo==="Mágico"?["Recuerda que necesitas explicar en tu historia quién te enseñó este idioma mágico."]:[])]});
    state.ui.idNombre=""; state.ui.idA=0; state.ui.idT=1; renderAll();
  });
  p.appendChild(c);
  p.insertAdjacentHTML("beforeend", `<div class="note-text">Todos los PJs empiezan con un idioma nativo gratis. Los idiomas mágicos requieren explicar en la historia quién te los enseñó.</div>`);
  p.appendChild(chipList(cartBy(i=>i.cat==="IDIOMAS"), "Sin idiomas en el carrito."));
};

/* =========================================================
   RAZA
   ========================================================= */
RENDERERS.raza = function(){
  const p = head("raza","Raza",
    "Por defecto todos los PJs son humanos (0 grageas). Las razas sólo pueden canjearse una vez y la mayoría únicamente durante la creación del personaje. La Licantropía es compatible con cualquier raza.",
    `En el carrito: <b>${fmt(catTotal("RAZA"))}</b> gr`);
  const g = document.createElement("div"); g.className = "grid-2";
  RAZAS.forEach(r=>{
    const inC = state.cart.some(i=>i.meta.name===r.n);
    const c = document.createElement("div"); c.className = "card";
    c.innerHTML = `<div class="card-row"><span class="card-name">${r.n}</span><span class="card-cost">${r.p} gr</span></div>
      <p class="perk-desc">${r.nota}</p><div class="buy-row"><button class="btn" ${inC?"disabled":""}>${inC?"En el carrito":"Agregar"}</button></div>`;
    c.querySelector("button").addEventListener("click", ()=>{
      addToCart("RAZA", `${r.n} — ${r.p} grageas`, r.p, 0, null, {name:r.n, raza:r.n!=="Licantropía", notes:[`Recuerda: ${r.nota}`]});
      renderAll();
    });
    g.appendChild(c);
  });
  p.appendChild(g);
  if(state.cart.filter(i=>i.meta.raza).length>1) p.insertAdjacentHTML("beforeend", `<div class="warn-text">Hay más de una raza en el carrito: un PJ sólo puede tener una (la Licantropía aparte).</div>`);
  p.appendChild(chipList(cartBy(i=>i.cat==="RAZA"), "Humano (sin coste)."));
};

/* =========================================================
   VETERANÍA / LEGENDARIAS
   ========================================================= */
function buildPerkCard(item, category, legend){
  const card = document.createElement("div");
  card.className = "card perk-card"+(legend?" legend":"");
  const count = countKey(item.key);
  card.innerHTML = `<div class="perk-head"><h3>${item.nombre}</h3><span class="perk-price">${fmt(item.price)} gr${item.pl?` <span class="pl">+ ${item.pl} PL</span>`:""}</span></div>
    ${item.req?`<div class="perk-req">${item.req}</div>`:""}
    <p class="perk-desc">${item.desc}</p>
    ${item.limit?`<div class="perk-limit">${item.limit}</div>`:""}`;
  const f = item.field;
  let fh = "";
  if(f?.type==="select") fh = `<div class="field"><label>${f.label}</label><select class="pd">${optionsHtml(f.options,"")}</select></div>`;
  else if(f?.type==="text") fh = `<div class="field"><label>${f.label}</label><input type="text" class="pd" placeholder="${esc(f.ph||"")}"></div>`;
  else if(f?.type==="proeza") fh = `<div class="field"><label>Proeza</label><select class="pd">${Object.entries(PROEZAS).map(([s,l])=>`<optgroup label="${s}">${l.map(n=>`<option value="${esc(n)} (${s})">${esc(n)}</option>`).join("")}</optgroup>`).join("")}</select></div>`;
  else if(f?.type==="limite") fh = `<div class="field"><label>STAT</label><select class="pd">${optionsHtml(STATS,"")}</select></div>
     <div class="field"><label>Límite</label><select class="pl2">${optionsHtml([1,2,3,4].map(l=>[l,`${l} → ${l+1}`]),"")}</select></div>`;
  const row = document.createElement("div"); row.className = "buy-row";
  row.innerHTML = `${fh}<button class="btn ${legend?"arcane":""}">Agregar</button><span class="perk-count">${count?`En el carrito: ${count}`:""}</span>`;
  card.appendChild(row);
  if(item.maxPerYear && count>item.maxPerYear) card.insertAdjacentHTML("beforeend", `<div class="warn-text">Tenés ${count} en el carrito y el máximo es ${item.maxPerYear} por año de veteranía (ignoralo si canjeás varios años acumulados).</div>`);
  if(item.key==="proeza" && count>pdTotal()) card.insertAdjacentHTML("beforeend", `<div class="warn-text">${count} Proeza(s) y ${pdTotal()} Punto(s) de Destino (contando los del carrito): sólo podés tener tantas Proezas como PDs.</div>`);
  row.querySelector("button").addEventListener("click", ()=>{
    const det = row.querySelector(".pd");
    let d = det ? det.value.trim() : "";
    if(f?.type==="limite") d = `${d}: límite ${row.querySelector(".pl2").value} → ${+row.querySelector(".pl2").value+1}`;
    if(f?.type==="text" && !d && !/Opcional/.test(f.ph||"")){ det.focus(); return; }
    addToCart(category, `${item.nombre}${d?` (${d})`:""} — ${precioTexto(item.price,item.pl)}`, item.price, item.pl, item.key,
      {detalle: f?.type==="select" ? det.value : d,
       notes:[reqNote(item.req), legend?"Recuerda que necesitas Veteranía Legendaria para usar este canje.":null].filter(Boolean)});
    renderAll();
  });
  return card;
}
RENDERERS.veterania = function(){
  const pl = state.cart.filter(i=>i.cat==="VETERANÍA").reduce((s,i)=>s+i.pl,0);
  const p = head("veterania","Veteranía",
    "Proezas, Puntos de Destino, ampliación de límites y Talentoso. Cargá abajo los Puntos de Destino que ya tenés: se usan para controlar Proezas, talentos Inventados y Lazos/Uniones/Vínculos.",
    `En el carrito: <b>${fmt(catTotal("VETERANÍA"))}</b> gr${pl?` · <b>${pl}</b> PL`:""}`);
  const b = document.createElement("div"); b.className = "info-banner";
  b.innerHTML = `→ Las grageas de veteranía deben solicitarse en el <a href="${LINK_REGISTRO}" target="_blank" rel="noopener">Registro de Veteranía</a>.
    <div class="pd-field"><b>Puntos de Destino que ya posees:</b> <input type="number" min="0" id="pdActualesInp" value="${state.pdActuales}"> <span>(total con el carrito: ${pdTotal()})</span></div>`;
  p.appendChild(b);
  b.querySelector("input").addEventListener("change", e=>{ state.pdActuales = Math.max(0,+e.target.value||0); renderAll(); });
  const l = document.createElement("div"); l.className = "perk-list";
  VETERANIA.forEach(it=>l.appendChild(buildPerkCard(it,"VETERANÍA",false)));
  p.appendChild(l);
};
RENDERERS.legendarias = function(){
  const pl = state.cart.filter(i=>i.cat==="LEGENDARIAS").reduce((s,i)=>s+i.pl,0);
  const p = head("legendarias","Características Legendarias",
    "",
    `En el carrito: <b>${fmt(catTotal("LEGENDARIAS"))}</b> gr · <b>${pl}</b> PL`);
  const b = document.createElement("div"); b.className = "info-banner";
  b.innerHTML = `Son rasgos de la ficha que pueden desarrollarse por encima de los límites convencionales. <b>No pueden adquirirse hasta que el PJ tenga una Veteranía Legendaria</b> (una cada tres años en el foro) y, además de grageas, cuestan Puntos Legendarios.<br><br>
    ✦ El <b>Atributo Legendario</b> (1.750 gr + 17 PL) se compra subiendo el atributo a 8 en Estadísticas, y la <b>Habilidad Legendaria</b> (750 gr + 7 PL; Arte 375 gr + 7 PL) subiendo la habilidad a Legendario en Habilidades: los PL se suman solos.<br>
    ✦ Los talentos Hechizo/Poción/Ritual Predilecto, Raudo, Virtuoso e Inventado, Conjurar sin Varita y Horrocrux también cuestan PL (pestaña Talentos).`;
  p.appendChild(b);
  const l = document.createElement("div"); l.className = "perk-list";
  LEGENDARIAS.forEach(it=>l.appendChild(buildPerkCard(it,"LEGENDARIAS",true)));
  p.appendChild(l);
};

/* =========================================================
   CARRITO
   ========================================================= */
const CAT_ORDER = ["ESTADÍSTICAS","HABILIDADES","ESPECIALIZACIONES","TRASFONDOS","VENTAJAS","TALENTOS","ARCANOS","TÍTULOS ACADÉMICOS","IDIOMAS","RAZA","VETERANÍA","LEGENDARIAS"];
RENDERERS.carrito = function(){
  const p = head("carrito","Carrito","Todo lo que agregaste en las pestañas. Revisá la suma y, cuando estés conforme, llevala al texto para el foro.");
  const hero = document.createElement("div"); hero.className = "cart-hero";
  hero.innerHTML = `<div><div class="cart-total-lbl">Total del canje</div>
      <div class="cart-total-num">${fmt(totalGastado())} grageas</div>
      ${plTotal()?`<div class="cart-total-lbl" style="margin-top:6px;color:var(--arcane-bright);">+ ${plTotal()} Puntos Legendarios</div>`:""}</div>
    <button class="btn arcane">Llevar al texto →</button>`;
  hero.querySelector("button").addEventListener("click", ()=>activateTab("resumen"));
  p.appendChild(hero);
  const allRem = [...new Set([...state.cart.flatMap(i=>remindersOf(i.meta||{}).map(r=>`${i.line.split(" — ")[0]}: ${r}`)),
    ...state.armas.flatMap(w=>weaponCalc(w).cost?weaponCalc(w).rems.map(r=>`${w.nombre}: ${r}`):[])])];
  if(allRem.length){
    const rb = document.createElement("div"); rb.className = "info-banner";
    rb.innerHTML = `<b>Antes de pedir el canje, revisá en tu ficha:</b>${reminderHtml(allRem)}`;
    p.appendChild(rb);
  }
  let any = false;
  CAT_ORDER.forEach(cat=>{
    const items = itemsOrdenados(cat);
    if(!items.length) return;
    any = true;
    const t = document.createElement("div"); t.className = "cart-section-title";
    t.innerHTML = `${cat.charAt(0)+cat.slice(1).toLowerCase()} <span class="mini-sum">${fmt(catTotal(cat))} gr${items.some(i=>i.pl)?` · ${items.reduce((s,i)=>s+i.pl,0)} PL`:""}</span>`;
    p.appendChild(t);
    p.appendChild(chipList(items,""));
  });
  state.armas.forEach(w=>{
    const c = weaponCalc(w); if(!c.cost) return; any = true;
    const t = document.createElement("div"); t.className = "cart-section-title";
    t.innerHTML = `Arma: ${esc(w.nombre)} <span class="mini-sum">${fmt(c.cost)} gr</span>`;
    p.appendChild(t);
    p.insertAdjacentHTML("beforeend", `<div class="chip-list">${c.lines.map(l=>`<div class="chip"><span>${esc(l)}</span></div>`).join("")}</div><div class="note-text">Las armas se editan en su pestaña.</div>`);
  });
  if(!any) p.insertAdjacentHTML("beforeend", `<div class="empty-note">El carrito está vacío.</div>`);
};

/* =========================================================
   TEXTO PARA COPIAR
   ========================================================= */
function buildSummary(){
  const out = [];
  const H = t=>out.push({h:true, t}), L = t=>out.push({t}), B = ()=>out.push({t:""});
  CAT_ORDER.forEach(cat=>{
    const items = itemsOrdenados(cat);
    if(!items.length) return;
    H(cat==="LEGENDARIAS" ? "CARACTERÍSTICAS LEGENDARIAS" : cat);
    items.forEach(i=>L(i.line)); B();
  });
  state.armas.forEach(w=>{
    const c = weaponCalc(w); if(!c.cost) return;
    H(`ARMA — ${w.nombre.toUpperCase()}`); c.lines.forEach(L); B();
  });
  if(!out.length){ L("Todavía no seleccionaste ningún canje."); B(); }
  else B();
  out.push({total:true, t:`Total: ${fmt(totalGastado())} grageas${plTotal()?` y ${plTotal()} Puntos Legendarios`:""}.`});
  return out;
}
RENDERERS.resumen = function(){
  const p = head("resumen","Texto para copiar","Todo lo del carrito ya redactado, con los arcanos por su nombre y el cálculo hecho. Copialo y pegalo en tu petición de canje.");
  const lines = buildSummary();
  while(lines.length>1 && lines[lines.length-2].t==="" && lines[lines.length-3]?.t==="") lines.splice(lines.length-2,1);
  const plain = lines.map(l=>l.t).join("\n");
  const tb = document.createElement("div"); tb.className = "summary-toolbar";
  tb.innerHTML = `<button class="btn">Copiar texto</button><span class="copy-status">Copiado ✓</span>`;
  p.appendChild(tb);
  const box = document.createElement("div"); box.className = "summary-box";
  box.innerHTML = lines.map(l=> l.h ? `<span class="sec-heading">${esc(l.t)}</span>` : l.total ? `<span class="sec-total">${esc(l.t)}</span>` : esc(l.t)).join("\n");
  p.appendChild(box);
  tb.querySelector("button").addEventListener("click", ()=>{
    const ok = ()=>{ const s = tb.querySelector(".copy-status"); s.classList.add("show"); setTimeout(()=>s.classList.remove("show"),1600); };
    if(navigator.clipboard?.writeText) navigator.clipboard.writeText(plain).then(ok).catch(()=>{ fallbackCopy(plain); ok(); });
    else { fallbackCopy(plain); ok(); }
  });
};
function fallbackCopy(text){
  const ta = document.createElement("textarea"); ta.value = text; ta.style.position="fixed"; ta.style.opacity="0";
  document.body.appendChild(ta); ta.select(); try{ document.execCommand("copy"); }catch(e){} ta.remove();
}

/* ---------- chispitas al agregar ---------- */
const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
document.addEventListener("click", e=>{
  const btn = e.target.closest(".btn");
  if(!btn || btn.disabled || btn.classList.contains("ghost") || reduceMotion) return;
  const glyphs = ["✦","✧","⋆","·"];
  for(let k=0;k<7;k++){
    const sp = document.createElement("span"); sp.className = "sparkle"; sp.textContent = glyphs[k%4];
    const ang = (Math.PI*2*k)/7 + Math.random()*0.5, dist = 22 + Math.random()*20;
    sp.style.left = e.clientX+"px"; sp.style.top = e.clientY+"px";
    sp.style.setProperty("--dx", Math.cos(ang)*dist+"px"); sp.style.setProperty("--dy", Math.sin(ang)*dist+"px");
    if(btn.classList.contains("arcane") || k%3===0) sp.style.color = "var(--arcane-bright)";
    document.body.appendChild(sp); setTimeout(()=>sp.remove(), 800);
  }
}, true);

buildTabs();
document.getElementById("re-mount").innerHTML = document.getElementById("re-template").innerHTML;
renderAll();

/* 8c: lo que Mi Ficha y el Revisor de Empleos (js/paginas/revisor/, ya un módulo) usan de esta página. Un módulo no ve
   las variables de un script normal en las pruebas, así que se las pasa este objeto, siempre al día (state cambia). */
window.pamTabla = {
  get state(){ return state; },
  get SKILL_GROUPS(){ return SKILL_GROUPS; }, get SKILL_LVL(){ return SKILL_LVL; }, get STAT_ACUM(){ return STAT_ACUM; },
  get SKILL_ACUM(){ return SKILL_ACUM; }, get TGEN_ACUM(){ return TGEN_ACUM; }, get TESP_ACUM(){ return TESP_ACUM; },
  get VENT_ACUM(){ return VENT_ACUM; }, get VENT_LABELS(){ return VENT_LABELS; }, get ARCANOS(){ return ARCANOS; },
  get DESC(){ return DESC; }, get TALENTOS(){ return TALENTOS; }, get COMP(){ return COMP; },
  fmt: (...a) => fmt(...a), precioTexto: (...a) => precioTexto(...a), costoSubida: (...a) => costoSubida(...a),
  addToCart: (...a) => addToCart(...a), espLevel: (...a) => espLevel(...a), activateTab: (...a) => activateTab(...a),
  renderAll: (...a) => renderAll(...a), statNotes: (...a) => statNotes(...a), skillNotes: (...a) => skillNotes(...a),
  compResults: (...a) => compResults(...a)
};

}
