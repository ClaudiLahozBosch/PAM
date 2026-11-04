// @ts-nocheck
// Registro de Roles (fase 8b): el mismo código que estaba en index.html (copia congelada en
// tests/legado/paginas/registro-roles.js), como módulo. Lo que cambia, marcado con «8b»:
//   · las listas fijas e «Importar desde Excel» están en sus archivos (datos.js, importarExcel.js); los estilos en
//     css/registro.css y el HTML en plantilla.html;
//   · 8c: los datos de la lista de deseos («Canjes futuros») son los oficiales (deseos.js, los recibe como `deseos`);
//   · guarda con el almacén (js/core/Almacen.js): igual que antes, pero también al cerrar o esconder la página (F14);
//   · las fechas de ejemplo, con el día de aquí y no el de Greenwich (F15);
//   · sin el modo «Guardado en tu cuenta», que solo funcionaba dentro de otra aplicación (nunca en PAM).
// Recibe la ventana: así las pruebas lo montan en una página de prueba junto al antiguo y comparan.
import { TIPOS, ESTADOS, CASA_HEX, TURNOS, TONOS, OF_EST, GEST, KEY, SKINS, FLOR, DIV, BOV_LINKS, PRIO, WCATS, TRATO } from './datos.js?v=0.6.4';
import { loadXLSX, norm, compact, pad, parseWorkbook } from './importarExcel.js?v=0.6.4';
import { fechaISO as fechaLocalISO } from '../../core/fechas.js?v=0.6.4';
import { montarColoreador } from './Coloreador.js?v=0.6.4';

/**
 * @param {Window} w la ventana de PAM
 * @param {{ css: string, html: string, almacen: import('../../core/Almacen.js').Almacen,
 *   deseos: ReturnType<typeof import('./deseos.js').crearDatosDeseos> }} o
 */
export function montarRegistro(w, { css, html, almacen, deseos }) {
/* 8c: los datos de la lista de deseos, de los oficiales (deseos.js) */
const { ATRS, ATR_COST, HABS, HAB_LV, HAB_COST, ARTE_COST, ROM, TRAS_T, TRAS_CAT, VENT, VENT_COST, ESP_R, ARC_NV, ARC, ARC_REQ, LISTAS, IDI_MAG, IDI_LV, ASIG, CALIF } = deseos;
/* 8b: lo del navegador sale de la ventana que se recibe (en PAM, la misma) */
const window = w, document = w.document, navigator = w.navigator, alert = (...a) => w.alert(...a), MutationObserver = w.MutationObserver,
  requestAnimationFrame = (...a) => w.requestAnimationFrame(...a), URL = w.URL, FileReader = w.FileReader, Image = w.Image, Node = w.Node,
  Math = w.Math, Date = w.Date, setTimeout = (...a) => w.setTimeout(...a), clearTimeout = (...a) => w.clearTimeout(...a);
const host=document.getElementById("rr-host");
const RR=host.attachShadow({mode:"open"});
RR.__extraCss=1;RR.innerHTML='<style>'+css+'</style>'+html; /* 8b: css/registro.css y plantilla.html */
const syncSkin=()=>{host.dataset.skin=document.documentElement.dataset.skin||"avadense";};
syncSkin(); new MutationObserver(()=>{syncSkin(); if(window.rrRender) try{window.rrRender();}catch(e){}}).observe(document.documentElement,{attributes:true,attributeFilter:["data-skin"]});

(()=>{
const skinOf=()=>SKINS.find(k=>k.id===document.documentElement.dataset.skin)||{id:"avadense",nombre:"Avadense",orn:"✦",fx:["✦","☾","✧","✨"]};
const safeUrl=u=>{u=String(u||"").trim();if(!u)return"";if(!/^https?:\/\//i.test(u))u="https://"+u;try{const x=new URL(u);return /^https?:$/.test(x.protocol)?x.href:"";}catch(_){return"";}};
function linkCell(v,attr){const u=safeUrl(v);return `<div class="link-cell"><input class="cell" ${attr} value="${esc(v||"")}" placeholder="pegá el enlace" aria-label="Enlace">${u?`<a class="go" href="${esc(u)}" target="_blank" rel="noopener" title="Abrir el tema" aria-label="Abrir enlace">↗</a>`:""}</div>`;}
let fxFor=null, skinsOpen=false;
function applySkin(){ renderPumpkins(); }
const uid=()=>Math.random().toString(36).slice(2,9);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const find=(list,v)=>list.find(x=>x[0]===v)||list[0];

function ejemplo(){
  const fj=[{id:uid(),nombre:"💰 Sueldo mensual",monto:125},{id:uid(),nombre:"📰 Columna en el periódico",monto:75}];
  return {v:1,ejemplo:true,owner:"",skin:"pastel",
    personajes:[
      {id:uid(),nombre:"Personaje 1",emoji:"🌿",tono:"mint",wishCfg:{esp:1},wish:[{id:uid(),cat:"talento",n:"Aparecerse",g:200,pl:0,req:"Poder 2 y 17 años",prio:"alta",hecho:false},{id:uid(),cat:"atributo",n:"Poder 2 → 3",g:400,pl:0,req:"Necesitás el límite de STAT a 3",prio:"alta",hecho:false},{id:uid(),cat:"hechizo",n:"Hechizo intermedio: Expelliarmus",g:300,pl:0,req:"Necesitás un arcano básico por cada intermedio",prio:"media",hecho:false},{id:uid(),cat:"objeto",n:"Objeto avanzado: Capa de Invisibilidad",g:600,pl:0,req:"",prio:"baja",hecho:false}],boveda:{ini:35,tot:27314,act:35,plt:0,pla:0,l1:"https://hp-avada-kedavra.foroactivo.com/t35871-boveda-990#677949",l2:"https://hp-avada-kedavra.foroactivo.com/t35871p60-boveda-990#734794",l3:"https://hp-avada-kedavra.foroactivo.com/t35871p60-boveda-990#716416",delta:"+125",enl:""},
       roles:[
        {id:uid(),nombre:"Entre jardines (ejemplo)",con:"Nombre del compañero",color:"#3B6E8C",con2:"Otro PJ",color2:"#C0587E",dos:true,tipo:"Libre",fecha:"Marzo 2033",estado:"Contestado",limite:"",enlace:"https://hp-avada-kedavra.foroactivo.com"},
        {id:uid(),nombre:"Trama grupal (ejemplo)",con:"Grupal",color:"",tipo:"Grupal",fecha:"Agosto 2033",estado:"Sin Contestar",limite:fechaISO(2)},
        {id:uid(),nombre:"Rol oficial (ejemplo)",con:"Otro personaje",color:"#9B4A5F",tipo:"Oficial",fecha:"Octubre 2033",estado:"Terminado",limite:""}],
       ganancias:[{id:uid(),concepto:"💰 Sueldo mensual",monto:0,fijo:fj[0].id,estado:"Cobrado"},{id:uid(),concepto:"⭐ Puntos",monto:90,fijo:"",estado:"Cobrado"},{id:uid(),concepto:"✨ Extras",monto:20,fijo:"",estado:"Sin Cobrar"}]},
      {id:uid(),nombre:"Personaje 2",emoji:"🦊",tono:"terra",
       roles:[{id:uid(),nombre:"Una misión (ejemplo)",con:"Grupal",color:"",tipo:"Misión",fecha:"",estado:"Pausado",limite:fechaISO(-1)}],
       ganancias:[{id:uid(),concepto:"📚 Clases",monto:40,fijo:"",estado:"Sin Cobrar"},{id:uid(),concepto:"📰 Periódico",monto:0,fijo:fj[1].id,estado:"Cobrado"}]}],
    fijos:fj,
    turnos:{tarifas:{rapido:25,normal:20,lento:15,falta:20},
      misiones:[{id:uid(),nombre:"Misión de ejemplo",faltasMaster:0,n:12,t:["Rápido","Rápido","Normal","Rápido","Normal","Lento"]}]},
    oficiales:[{id:uid(),nombre:"Título del oficial (ejemplo)",relacion:"Tema / trama",fecha:"2029-03-21",estado:"Disponible"},{id:uid(),nombre:"Otro oficial (ejemplo)",relacion:"San Mungo",fecha:"2029-06-14",estado:"Ocupado"}]};
}
function vacio(){return {v:1,ejemplo:false,owner:S.owner||"",skin:S.skin||"pastel",personajes:[nuevoPj("Mi personaje","🌷","lilac")],fijos:[{id:uid(),nombre:"💰 Sueldo mensual",monto:125}],turnos:{tarifas:{rapido:25,normal:20,lento:15,falta:20},misiones:[]},oficiales:[]};}
function nuevoPj(n,e,t){return {id:uid(),nombre:n,emoji:e,tono:t,roles:[],ganancias:[{id:uid(),concepto:"💰 Sueldo mensual",monto:0,fijo:"",estado:"Sin Cobrar"},{id:uid(),concepto:"⭐ Puntos",monto:0,fijo:"",estado:"Sin Cobrar"}]};}

let S=ejemplo();
let tab="inicio", pjSel=null;
function fechaISO(d){return fechaLocalISO(d,new Date());} /* F15 (8b): el día de aquí, no el de Greenwich */

/* ---------- guardado ---------- */
function loadLocal(){const d=almacen.leer(KEY,null);return d&&d.personajes?d:null;}
/* F14 (8b): con el almacén; si se cierra o se esconde la página antes de los 700 ms, se guarda igual (vigilarSalida) */
function save(){almacen.guardarLuego(KEY,S,700);}
function saveYa(){almacen.guardar(KEY,S);}
function setStatus(){
  const el=RR.getElementById("status");
  el.innerHTML='<span class="dot local"></span><span>Guardando en este navegador</span>';
}

/* ---------- utilidades ---------- */
function toast(m){const t=RR.getElementById("toast");t.textContent=m;t.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>t.hidden=true,2200);}
let linkOpen=null;
function tituloRol(r){const u=safeUrl(r.enlace);
  return `<div class="tit"><input class="cell" data-f="nombre" value="${esc(r.nombre)}" aria-label="Nombre de rol" placeholder="Nombre del rol (podés pegar el enlace acá)">${u?`<a class="go-tab" href="${esc(u)}" target="_blank" rel="noopener" title="Abrir el rol en el foro">↗ Ir al rol</a>`:""}<button class="ghost lnk-btn${linkOpen===r.id?" on":""}" data-act="lnk" title="${u?"Cambiar el enlace del rol":"Agregar el enlace del rol"}" aria-label="${u?"Cambiar enlace":"Agregar enlace"}" aria-expanded="${linkOpen===r.id}">🔗</button></div>${linkOpen===r.id?`<div class="lnk-edit"><input class="cell" data-f="enlace" value="${esc(r.enlace||"")}" placeholder="Pegá el enlace del tema en el foro" aria-label="Enlace del rol"><button class="ghost" data-act="lnkOk">Listo</button></div>`:""}`;}
function conRow(nombre,color,fN,fC,ph,extra){const has=/^#[0-9a-f]{6}$/i.test(color||"");
  return `<div class="con-p"><label class="wheel${has?"":" unset"}" title="Elegir color"><input type="color" data-f="${fC}" value="${has?color:"#ffffff"}" aria-label="Color de ${ph}"></label><input class="cell" data-f="${fN}" value="${esc(nombre||"")}" aria-label="${ph}" placeholder="${ph}"${has?` style="color:${color}"`:""}>${extra||""}</div>`;}
function migrar(){S.personajes.forEach(p=>p.roles.forEach(r=>{if(r.casa!==undefined){if(!r.color){const k=String(r.casa).toLowerCase().replace("ex-","");r.color=CASA_HEX[k]||"";}delete r.casa;}}));}
function opts(list,v){return list.map(([n,,e])=>`<option value="${esc(n)}"${n===v?" selected":""}>${e?e+" ":""}${esc(n||"— casa —")}</option>`).join("");}
function chipSel(list,v,attrs){const t=find(list,v)[1];return `<select class="cell chip t-${t}" ${attrs}>${opts(list,v)}</select>`;}
function chip(list,v,txt){const [n,t,e]=find(list,v);return `<span class="chip-s t-${t}">${e} ${esc(txt??n)}</span>`;}
function hoy(){const d=new Date();d.setHours(0,0,0,0);return d;}
function limEstado(r){if(!r.limite||r.estado==="Terminado")return"";const d=new Date(r.limite+"T00:00:00");const diff=(d-hoy())/864e5;if(diff<0)return"over";if(diff<=3)return"soon";return"";}
function cuenta(pj){const c={};ESTADOS.forEach(([n])=>c[n]=0);pj.roles.forEach(r=>c[r.estado]=(c[r.estado]||0)+1);return c;}
function montoG(g){if(g.fijo){const f=S.fijos.find(x=>x.id===g.fijo);return f?+f.monto||0:0;}return +g.monto||0;}
function totalPj(pj){let cob=0,pend=0;pj.ganancias.forEach(g=>{const m=montoG(g);g.estado==="Cobrado"?cob+=m:pend+=m;});return {cob,pend};}
function pjById(id){return S.personajes.find(p=>p.id===id);}
function armDelete(btn,fn){if(btn.dataset.armed){fn();return;}btn.dataset.armed="1";const old=btn.innerHTML;btn.textContent="¿Borrar?";btn.classList.add("warn");setTimeout(()=>{if(btn.isConnected){delete btn.dataset.armed;btn.innerHTML=old;btn.classList.remove("warn");}},3000);}

/* ---------- vistas ---------- */
const V={};
V.inicio=()=>{
  const filas=S.personajes.map(p=>{const c=cuenta(p),g=totalPj(p);return `<tr>
    <td><span class="chip-s t-${p.tono}">${esc(p.emoji)} ${esc(p.nombre)}</span></td>
    ${ESTADOS.map(([n])=>`<td class="num">${n==="Sin Contestar"&&c[n]>0?`<span class="chip-s t-rose">${c[n]}</span>`:c[n]}</td>`).join("")}
    <td class="num">${p.roles.length}</td><td class="num">${g.cob}</td></tr>`;}).join("");
  const tot=ESTADOS.map(([n])=>S.personajes.reduce((a,p)=>a+cuenta(p)[n],0));
  const totR=S.personajes.reduce((a,p)=>a+p.roles.length,0), totG=S.personajes.reduce((a,p)=>a+totalPj(p).cob,0);
  const alerts=[];S.personajes.forEach(p=>p.roles.forEach(r=>{const l=limEstado(r);if(l)alerts.push({p,r,l});}));
  alerts.sort((a,b)=>a.r.limite.localeCompare(b.r.limite));
  return `
  ${moodCard()}
  ${S.ejemplo?`<div class="banner"><span>🌱 Estás viendo datos de ejemplo. Editalos encima o empezá con la plantilla en blanco.</span><span class="row"><button data-act="toImport">📥 Importar mi Excel</button><button data-act="keep">Usar el ejemplo</button><button class="primary" data-act="blank">Empezar en blanco</button></span></div>`:""}
  <section style="display:grid;gap:10px"><h2>🧺 Resumen por personaje</h2>
  <div class="tbl-wrap"><table><thead><tr><th>Personaje</th>${ESTADOS.map(([n,,e])=>`<th class="num">${e} ${n}</th>`).join("")}<th class="num">📚 Total</th><th class="num">🍬 Grageas del mes</th></tr></thead>
  <tbody>${filas||`<tr><td colspan="7" class="empty">Todavía no hay personajes. Creá uno en la pestaña Personajes.</td></tr>`}</tbody>
  <tfoot><tr><td>✨ Total</td>${tot.map(x=>`<td class="num">${x}</td>`).join("")}<td class="num">${totR}</td><td class="num">${totG}</td></tr></tfoot></table></div></section>
  <section style="display:grid;gap:10px"><h2>⏳ Fechas límite</h2>
  ${alerts.length?`<div class="alerts">${alerts.map(({p,r,l})=>`<div class="alert ${l==="over"?"t-rose":"t-peach"}"><strong>${l==="over"?"⌛ Vencido":"⏳ Pronto"}</strong><span>${safeUrl(r.enlace)?`<a class="rlink" href="${esc(safeUrl(r.enlace))}" target="_blank" rel="noopener">${esc(r.nombre)}</a>`:esc(r.nombre)}</span><span class="small">· ${esc(p.emoji)} ${esc(p.nombre)} · ${fmtFecha(r.limite)}</span></div>`).join("")}</div>`
   :`<p class="muted small" style="margin:0">Nada vencido ni por vencer en los próximos 3 días. Las fechas límite se cargan en cada rol.</p>`}
  </section>
  <section style="display:grid;gap:10px"><h2>🎨 Leyenda de colores</h2>
  <div class="legend">
    <div><div class="lbl">🏷️ Tipo de rol</div><div class="chips">${TIPOS.map(([n])=>chip(TIPOS,n)).join("")}</div></div>
    <div><div class="lbl">🌤️ Estado</div><div class="chips">${ESTADOS.map(([n])=>chip(ESTADOS,n)).join("")}<span class="chip-s t-rose">⌛ Límite vencido</span><span class="chip-s t-peach">⏳ Límite ≤ 3 días</span></div></div>
    <div><div class="lbl">🎨 Color de cada compañero</div><p class="small muted" style="margin:0">Tocá la ruedita al lado del nombre en «Con» para elegirle un color. Con «+ PJ» sumás un segundo compañero con su propio color.</p></div>
  </div></section>`;
};
function fmtFecha(iso){if(!iso)return"";const [y,m,d]=iso.split("-");return `${d}/${m}/${y}`;}

V.personajes=()=>{
  if(!pjSel||!pjById(pjSel))pjSel=S.personajes[0]?.id||null;
  const p=pjById(pjSel);
  const sel=`<div class="row between"><div class="pjs">${S.personajes.map(x=>`<button class="pj-tab c-${x.tono}" aria-pressed="${x.id===pjSel}" data-act="pj" data-id="${x.id}">${esc(x.emoji)} ${esc(x.nombre)}</button>`).join("")}</div><button class="primary" data-act="addPj">+ Personaje</button></div>`;
  if(!p)return sel+`<p class="empty">Agregá tu primer personaje para empezar a anotar sus roles.</p>`;
  const c=cuenta(p);
  const filas=p.roles.map(r=>{const l=limEstado(r);return `<tr data-rid="${r.id}">
    <td class="wide" data-l="📖 Nombre de rol">${tituloRol(r)}</td>
    <td data-l="💌 Con"><div class="con">${conRow(r.con,r.color,"con","color","Con quién",r.dos?"":`<button class="ghost add2" data-act="add2" title="Sumar otro PJ a este rol" aria-label="Sumar otro PJ">+ PJ</button>`)}${r.dos?conRow(r.con2,r.color2,"con2","color2","Otro PJ",`<button class="ghost" data-act="del2" title="Quitar este PJ" aria-label="Quitar segundo PJ">✕</button>`):""}</div></td>
    <td data-l="🏷️ Tipo">${chipSel(TIPOS,r.tipo,'data-f="tipo" aria-label="Tipo de rol"')}</td>
    <td data-l="🗓️ Fecha"><input class="cell" style="min-width:8rem" data-f="fecha" value="${esc(r.fecha)}" aria-label="Fecha" placeholder="Fecha en el rol"></td>
    <td data-l="🌤️ Estado">${chipSel(ESTADOS,r.estado,'data-f="estado" aria-label="Estado"')}</td>
    <td data-l="⏳ Fecha límite" class="${l?"lim-"+l:""}"><input type="date" class="cell" data-f="limite" value="${esc(r.limite)}" aria-label="Fecha límite"></td>
    <td class="del"><button class="ghost" data-act="delRol" aria-label="Borrar rol">✕</button></td></tr>`;}).join("");
  return sel+`
  <div class="pj-head t-${p.tono}">
    <input class="emo" data-pf="emoji" value="${esc(p.emoji)}" aria-label="Emoji" maxlength="4">
    <input data-pf="nombre" value="${esc(p.nombre)}" aria-label="Nombre del personaje">
    <div class="swatches" role="group" aria-label="Color">${TONOS.map(t=>`<button class="sw t-${t}" style="background:var(--${t}-fg)" aria-label="${t}" aria-pressed="${t===p.tono}" data-act="tono" data-t="${t}"></button>`).join("")}</div>
    <span style="flex:1"></span>
    <span class="small muted" title="El personaje se borra desde el selector de personajes de arriba">Se borra desde Mi Ficha</span>
  </div>
  <div class="counts">${ESTADOS.map(([n,t,e])=>`<span class="c-${t}">${e} ${n}: <strong>${c[n]}</strong></span>`).join("")}</div>
  <div class="tbl-wrap"><table class="stack"><thead><tr><th style="width:29%">📖 Nombre de rol</th><th style="width:23%">💌 Con</th><th style="width:11%">🏷️ Tipo</th><th style="width:11%">🗓️ Fecha</th><th style="width:12%">🌤️ Estado</th><th style="width:12%">⏳ Límite</th><th style="width:36px"></th></tr></thead>
  <tbody>${filas||`<tr><td colspan="8" class="empty">Sin roles todavía.</td></tr>`}</tbody></table></div>
  <div><button data-act="addRol">+ Agregar rol</button></div>`;
};

V.turnos=()=>{
  const T=S.turnos,tf=T.tarifas;
  const filas=T.misiones.map(m=>{
    const n=Math.max(1,Math.min(40,+m.n||12));const t=Array.from({length:n},(_,i)=>m.t[i]||"Sin Postear");
    const k=x=>t.filter(y=>y===x).length;
    const r=k("Rápido"),no=k("Normal"),le=k("Lento"),fi=k("Falta Injustificada");
    const g=r*tf.rapido+no*tf.normal+le*tf.lento+(+m.faltasMaster||0)*tf.falta;
    return `<tr data-mid="${m.id}">
      <td><input class="cell" style="min-width:10rem;font-weight:600" data-mf="nombre" value="${esc(m.nombre)}" aria-label="Misión o jugador"></td>
      <td class="num"><strong>${g}</strong></td><td class="num">${r+no+le}</td>
      <td class="num"><input class="cell num" type="number" min="0" data-mf="faltasMaster" value="${+m.faltasMaster||0}" aria-label="Faltas del master"></td>
      <td class="num">${fi?`<span class="chip-s t-rose">${fi}</span>`:0}</td>
      <td class="num">${r}</td><td class="num">${no}</td><td class="num">${le}</td>
      <td><div class="turn-grid">${t.map((x,i)=>{const [nm,tt,e]=find(TURNOS,x);return `<button class="tc ${tt==="sin"?"s-sin":"t-"+tt}" data-act="turn" data-i="${i}" title="T${i+1}: ${nm} (clic para cambiar)" aria-label="Turno ${i+1}: ${nm}">${e}</button>`;}).join("")}</div></td>
      <td class="num"><input class="cell num" type="number" min="1" max="40" data-mf="n" value="${n}" aria-label="Cantidad de turnos" style="width:5ch"></td>
      <td><button class="ghost" data-act="delMis" aria-label="Borrar">✕</button></td></tr>`;}).join("");
  return `<div class="row between"><h2>🎮 Control de turnos</h2><button class="primary" data-act="addMis">+ Misión</button></div>
  <p class="muted small" style="margin:0">Tocá cada casilla para cambiar el estado del turno: ${TURNOS.map(([n,t,e])=>`<span class="chip-s ${t==="sin"?"":"t-"+t}">${e} ${n}</span>`).join(" ")}. Las grageas se calculan solas con las tarifas.</p>
  <div class="tbl-wrap"><table><thead><tr><th>🧙 Misión / jugador</th><th class="num">🍬 Grageas</th><th class="num">🔁 Turnos</th><th class="num">🚫 Faltas master</th><th class="num">😢 Mis faltas</th><th class="num">⚡</th><th class="num">🌸</th><th class="num">🐌</th><th>🎲 Turnos</th><th class="num">Nº</th><th></th></tr></thead>
  <tbody>${filas||`<tr><td colspan="11" class="empty">Sin misiones. Agregá una para llevar sus turnos.</td></tr>`}</tbody></table></div>
  <section style="display:grid;gap:8px;max-width:420px"><h3>💰 Tarifas · grageas por turno</h3>
  <div class="tbl-wrap"><table><tbody>
   ${[["rapido","⚡ Rápido"],["normal","🌸 Normal"],["lento","🐌 Lento"],["falta","🚫 Falta del master"]].map(([k,l])=>`<tr><td>${l}</td><td class="num"><input class="cell num" type="number" min="0" data-tf="${k}" value="${tf[k]}" aria-label="${l}"></td></tr>`).join("")}
  </tbody></table></div></section>`;
};

let ofFiltro="todos", ofQ="";
const ofPasa=o=>ofFiltro==="todos"||(ofFiltro==="fav"?!!o.fav:o.estado===ofFiltro);
V.oficiales=()=>{
  const c=x=>S.oficiales.filter(o=>o.estado===x).length, nf=S.oficiales.filter(o=>o.fav).length;
  const chipF=(k,t,n)=>`<button class="of-f${ofFiltro===k?" on":""}" data-act="ofF" data-k="${k}">${t} <strong>${n}</strong></button>`;
  return `<div class="row between"><h2>🎀 Posibles oficiales</h2><button class="primary" data-act="addOf">+ Oficial</button></div>
  <div class="of-bar">${chipF("todos","Todos",S.oficiales.length)}${chipF("Disponible","🌸 Disponibles",c("Disponible"))}${chipF("Ocupado","💌 Ocupados",c("Ocupado"))}${chipF("fav","★ Favoritos",nf)}
    <input class="of-q" type="search" placeholder="Buscar oficial, relación…" value="${esc(ofQ)}" aria-label="Buscar oficial"></div>
  <p class="small muted" style="margin:4px 0 10px">Con Mi PJ podés traer los sucesos de El Profeta desde la Biblioteca de oficiales del foro.</p>
  <div class="tbl-wrap"><table class="stack"><thead><tr><th style="width:36px"></th><th style="width:32%">🎓 Oficial</th><th style="width:21%">💌 Relación</th><th style="width:12%">🗓️ Fecha</th><th style="width:13%">🌤️ Estado</th><th style="width:16%">🔗 Enlace</th><th style="width:36px"></th></tr></thead><tbody>
  ${S.oficiales.map(o=>`<tr data-oid="${o.id}" data-q="${esc(norm([o.nombre,o.relacion,o.fecha].join(" ")))}"${ofPasa(o)&&(!ofQ||norm([o.nombre,o.relacion,o.fecha].join(" ")).includes(norm(ofQ)))?"":" hidden"}>
    <td class="of-st"><button class="ghost of-star${o.fav?" on":""}" data-act="ofFav" aria-label="${o.fav?"Quitar de favoritos":"Marcar como favorito"}" title="${o.fav?"Quitar de favoritos":"Marcar como favorito"}">★</button></td>
    <td class="wide" data-l="🎓 Oficial"><input class="cell" style="min-width:14rem;font-weight:600" data-of="nombre" value="${esc(o.nombre)}" aria-label="Oficial"></td>
    <td data-l="💌 Relación"><input class="cell" style="min-width:10rem" data-of="relacion" value="${esc(o.relacion)}" aria-label="Relación"></td>
    <td data-l="🗓️ Fecha"><input class="cell" style="min-width:8rem" data-of="fecha" value="${esc(o.fecha)}" aria-label="Fecha" placeholder="AAAA-MM-DD o texto"></td>
    <td data-l="🌤️ Estado">${chipSel(OF_EST,o.estado,'data-of="estado" aria-label="Estado"')}</td>
    <td data-l="🔗 Enlace">${linkCell(o.enlace,'data-of="enlace"')}</td>
    <td class="del"><button class="ghost" data-act="delOf" aria-label="Borrar">✕</button></td></tr>`).join("")||`<tr><td colspan="7" class="empty">Anotá acá los oficiales que te interesan.</td></tr>`}
  </tbody></table><p class="empty of-nada" hidden>No hay oficiales con este filtro.</p></div>`;
};
function ofBuscar(){
  const t=norm(ofQ); let vis=0;
  panel.querySelectorAll("tr[data-oid]").forEach(tr=>{const o=S.oficiales.find(x=>x.id===tr.dataset.oid);const ok=o&&ofPasa(o)&&(!t||tr.dataset.q.includes(t));tr.hidden=!ok;if(ok)vis++;});
  const n=panel.querySelector(".of-nada"); if(n) n.hidden=!!vis||!S.oficiales.length;
}
V.ganancias=()=>{
  const total=S.personajes.reduce((a,p)=>a+totalPj(p).cob,0), pend=S.personajes.reduce((a,p)=>a+totalPj(p).pend,0);
  const fOpts=v=>`<option value="">Monto propio</option>`+S.fijos.map(f=>`<option value="${f.id}"${f.id===v?" selected":""}>${esc(f.nombre)}</option>`).join("");
  return `<div class="row between" style="align-items:end"><div><h2>🍯 Ganancias mensuales</h2><p class="muted small" style="margin:0">Solo suma lo que está marcado como cobrado.</p></div>
  <div style="text-align:right"><div class="big">${total} <span class="small muted">grageas</span></div><div class="small muted">${pend} sin cobrar</div></div></div>
  <div class="row"><button data-act="resetMes">↺ Nuevo mes (todo a «Sin Cobrar»)</button></div>
  <div class="gan-grid">${S.personajes.map(p=>{const g=totalPj(p);return `<div class="card" data-pid="${p.id}">
    <div class="card-h t-${p.tono}"><span>${esc(p.emoji)} ${esc(p.nombre)}</span><span>🧾 ${g.cob}</span></div>
    <div style="overflow-x:auto"><table><tbody>${p.ganancias.map(x=>`<tr data-gid="${x.id}">
      <td><input class="cell" data-gf="concepto" value="${esc(x.concepto)}" aria-label="Concepto" style="min-width:8rem"></td>
      <td><select class="cell" data-gf="fijo" aria-label="Pago fijo" style="font-size:.8rem;color:var(--muted);max-width:8rem">${fOpts(x.fijo)}</select></td>
      <td class="num">${x.fijo?`<span style="padding:0 6px">${montoG(x)}</span>`:`<input class="cell num" type="number" min="0" data-gf="monto" value="${+x.monto||0}" aria-label="Grageas">`}</td>
      <td>${chipSel(GEST,x.estado,'data-gf="estado" aria-label="Estado"')}</td>
      <td><button class="ghost" data-act="delG" aria-label="Borrar">✕</button></td></tr>`).join("")}</tbody></table></div>
    <div style="padding:8px 10px"><button class="ghost" style="color:var(--accent)" data-act="addG">+ Concepto</button></div></div>`;}).join("")||`<p class="empty">Creá un personaje primero.</p>`}</div>
  <section style="display:grid;gap:8px;max-width:460px"><h3>💳 Pagos fijos</h3><p class="muted small" style="margin:0">Montos que se repiten (sueldo, columnas…). Elegilos en un concepto y se actualizan solos.</p>
  <div class="tbl-wrap"><table><tbody>${S.fijos.map(f=>`<tr data-fid="${f.id}"><td><input class="cell" data-ff="nombre" value="${esc(f.nombre)}" aria-label="Pago fijo"></td><td class="num"><input class="cell num" type="number" min="0" data-ff="monto" value="${+f.monto||0}" aria-label="Monto"></td><td><button class="ghost" data-act="delF" aria-label="Borrar">✕</button></td></tr>`).join("")||`<tr><td class="empty">Sin pagos fijos.</td></tr>`}</tbody></table></div>
  <div><button data-act="addF">+ Pago fijo</button></div></section>`;
};

/* ---------- bóveda ---------- */
/* divisor de enlaces: solo símbolos de texto (el foro no acepta emojis) */
const divisor=()=>DIV[skinOf().id]||"✦";
function bovEnlaces(b){const d=divisor(),u=x=>String(x||"").trim();const parts=[];
  if(u(b.pet))parts.push(`[url=${u(b.pet)}]Petición[/url]`);if(u(b.ace))parts.push(`[url=${u(b.ace)}]Aceptación[/url]`);
  u(b.enl).split(/\n+/).map(x=>x.trim()).filter(Boolean).forEach(x=>parts.push(/^https?:\/\//i.test(x)?`[url=${x}]Enlace[/url]`:x));
  return parts.join(` ${d} `);}
const num=v=>{const n=parseInt(String(v??"").replace(/[^\d-]/g,""),10);return isNaN(n)?0:n;};
const signo=n=>(n>=0?"+":"")+n;
function bov(p){if(!p.boveda)p.boveda={ini:0,tot:0,act:0,plt:0,pla:0,l1:"",l2:"",l3:"",delta:"",enl:""};return p.boveda;}
function bovCalc(b){const d=num(b.delta);return {ini:num(b.act),d,act:num(b.act)+d,tot:num(b.tot)+Math.max(d,0)};}
function bovApplyOtro(bb){const at=new Date().toISOString(),limpiar=()=>{bb.enl="";bb.pet="";bb.ace="";};bb.log=bb.log||[];
  if(bb.tipo==="pl"){const c=bovCalcPL(bb);if(!c.d){toast("Escribí cuántos Puntos Legendarios se añaden o quitan");return false;}
    bb.log.unshift({id:uid(),at,kind:"pl",pl0:num(bb.pla),plt0:num(bb.plt),ini:c.ini,d:c.d,act:c.act,tot:c.tot,enl:bovEnlaces(bb),pet:String(bb.pet||"").trim(),ace:String(bb.ace||"").trim()});
    bb.pla=c.act;bb.plt=c.tot;bb.pdelta="";limpiar();toast(`Bóveda actualizada: ${c.act} Puntos Legendarios`);}
  else{const txt=String(bb.inv||"").trim();if(!txt){toast("Escribí qué se añade o se quita del inventario");return false;}
    bb.log.unshift({id:uid(),at,kind:"inv",txt,ini:num(bb.act),d:0,act:num(bb.act),tot:num(bb.tot),enl:bovEnlaces(bb),pet:String(bb.pet||"").trim(),ace:String(bb.ace||"").trim()});
    bb.inv="";limpiar();toast("Inventario anotado en los movimientos");}
  if(bb.log.length>150)bb.log.length=150;return true;}
function bovCalcPL(b){const d=num(b.pdelta);return {ini:num(b.pla),d,act:num(b.pla)+d,tot:num(b.plt)+Math.max(d,0)};}
function bovCodes(b){const T=b.tipo||"gr";
  if(T==="pl"){const c=bovCalcPL(b),enl=bovEnlaces(b);
    const form=`{Puntos Legendarios iniciales» ${c.ini}\n{Puntos Legendarios que se añaden/quitan» ${signo(c.d)}\n{Puntos Legendarios actuales» ${c.act}\n{Puntos Legendarios totales» ${c.tot}\n{Enlaces» ${enl}`;
    const html=`<div class="scaja-content"><span class="scaja-form">{Puntos Legendarios iniciales»</span> ${c.ini}\n<span class="scaja-form">{Puntos Legendarios que se añaden/quitan»</span> ${signo(c.d)}\n<span class="scaja-form">{Puntos Legendarios actuales»</span> ${c.act}\n<span class="scaja-form">{Puntos Legendarios totales»</span> ${c.tot}\n<span class="scaja-form">{Enlaces»</span> ${enl}\n</div>`;
    return {c,form,html};}
  if(T==="inv"){const enl=bovEnlaces(b),txt=String(b.inv||"").trim();
    const form=`{Nuevo inventario» ${txt}\n{Enlaces» ${enl}`;
    const html=`<div class="scaja-content"><span class="scaja-form">{Nuevo inventario»</span> ${txt}\n<span class="scaja-form">{Enlaces»</span> ${enl}\n</div>`;
    return {c:null,form,html};}
  return bovCodesGr(b);}
function bovCodesGr(b){const c=bovCalc(b),enl=bovEnlaces(b);
  const form=`{Grageas iniciales» ${c.ini}\n{Grageas que se añaden/quitan» ${signo(c.d)}\n{Grageas actuales» ${c.act}\n{Grageas totales» ${c.tot}\n{Enlaces» ${enl}`;
  const html=`<div class="scaja-content"><span class="scaja-form">{Grageas iniciales»</span> ${c.ini}\n<span class="scaja-form">{Grageas que se añaden/quitan»</span> ${signo(c.d)}\n<span class="scaja-form">{Grageas actuales»</span> ${c.act}\n<span class="scaja-form">{Grageas totales»</span> ${c.tot}\n<span class="scaja-form">{Enlaces»</span> ${enl}\n</div>`;
  return {c,form,html};}
function bovPrevT(b,c){const T=b.tipo||"gr";if(T==="inv")return "";if(T==="pl")return `<span>${c.ini}</span><span class="op ${c.d<0?"neg":"pos"}">${signo(c.d)}</span><span>=</span><strong>${c.act}</strong><span class="muted small">PL · totales ${c.tot}</span>${c.act<0?`<span class="small" style="color:var(--rose-fg)">⚠ no te alcanzan los Puntos Legendarios</span>`:""}`;return bovPrev(c);}
function updateBovCode(){const p=pjById(pjSel);if(!p||tab!=="boveda")return;const bb0=bov(p),{c,form,html}=bovCodes(bb0);
  const a=RR.getElementById("bovForm"),h=RR.getElementById("bovHtml");if(a)a.value=form;if(h)h.value=html;
  const pv=RR.getElementById("bovPrev");if(pv)pv.innerHTML=bovPrevT(bb0,c);}
function bovPrev(c){return `<span>${c.ini}</span><span class="op ${c.d<0?"neg":"pos"}">${signo(c.d)}</span><span>=</span><strong>${c.act}</strong><span class="muted small">· totales ${c.tot}</span>${c.act<0?`<span class="small" style="color:var(--rose-fg)">⚠ no te alcanzan las grageas</span>`:""}`;}
function fmtAt(iso){try{const d=new Date(iso);return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;}catch(_){return"";}}
function bovLog(b){const L=b.log||[];
  return `<section class="bov-log-wrap"><div class="row between"><h3>📜 Últimos movimientos</h3><div class="row">${L.length?`<button data-act="bovUndo" title="Vuelve los números a como estaban antes del último movimiento">↶ Deshacer el último</button>`:""}<button class="ghost" data-act="bovAddLog" title="Agregar una línea de nota al registro">+ nota</button></div></div>
  <div class="bov-log" role="log" aria-label="Últimos movimientos">${L.length?L.map((e,i)=>`<div class="lg${i===0?" last":""}" data-lid="${e.id}">
    <span class="lg-t">[${esc(fmtAt(e.at))}]</span>
    ${e.nota!==undefined?`<input class="lg-nota" data-lf="nota" value="${esc(e.nota)}" aria-label="Nota">`:e.kind==="inv"?`<span class="lg-inv">Inventario: ${esc(e.txt)}</span>`:`${e.kind==="pl"?`<span class="lg-k">PL</span>`:""}<span class="lg-n">${e.ini}</span><span class="lg-d ${e.d<0?"neg":"pos"}">${signo(e.d)}</span><span class="lg-a">→ ${e.act}</span><span class="lg-tot">tot ${e.tot}</span>`}
    <span class="lg-l">${[["Petición",e.pet],["Aceptación",e.ace]].filter(x=>safeUrl(x[1])).map(([l,u])=>`<a href="${esc(safeUrl(u))}" target="_blank" rel="noopener">${l}</a>`).join(` <span class="lg-sep">${esc(divisor())}</span> `)}</span>
    <button class="ghost lg-x" data-act="bovDelLog" data-id="${e.id}" aria-label="Borrar movimiento">✕</button></div>`).join(""):`<div class="lg empty-log">&gt; Todavía no hay movimientos. Cuando toques «Ya lo publiqué», queda anotado acá.</div>`}</div></section>`;}
V.boveda=()=>{
  if(!pjSel||!pjById(pjSel))pjSel=S.personajes[0]?.id||null;
  const p=pjById(pjSel);const f=FLOR[skinOf().id]||"✿";
  const sel=`<div class="pjs">${S.personajes.map(x=>`<button class="pj-tab c-${x.tono}" aria-pressed="${x.id===pjSel}" data-act="pj" data-id="${x.id}">${esc(x.emoji)} ${esc(x.nombre)}</button>`).join("")}</div>`;
  if(!p)return `<h2>🏦 Bóveda</h2><p class="empty">Creá un personaje primero.</p>`;
  const b=bov(p),{c,form,html}=bovCodes(b),cob=totalPj(p).cob;
  const line=(k,l)=>`<label class="bov-l" for="bv-${k}"><span class="flor" aria-hidden="true">${f}</span><span class="bov-lbl">${l}:</span><input class="cell num bov-n" type="number" id="bv-${k}" data-bf="${k}" value="${num(b[k])}"></label>`;
  return `<div class="row between"><h2>🏦 Bóveda</h2>${sel}</div>
  <div class="bov-grid">
    <section class="bov-card t-${p.tono}">
      <div class="bov-h">${esc(p.emoji)} ${esc(p.nombre)}</div>
      <div class="bov-g">${line("ini","Grageas Iniciales")}${line("tot","Grageas Totales")}${line("act","Grageas Actuales")}</div>
      <div class="bov-g">${line("plt","Puntos Legendarios Totales")}${line("pla","Puntos Legendarios Actuales")}</div>
    </section>
    <section class="bov-links"><h3>🔗 Ir a la bóveda</h3>
      ${BOV_LINKS.map(([k,l])=>{const u=safeUrl(b[k]);return `<div class="bov-link"><span class="bov-lbl">${l}</span><div class="tit"><input class="cell" data-bf="${k}" value="${esc(b[k]||"")}" placeholder="Pegá el enlace" aria-label="Enlace: ${l}">${u?`<a class="go-tab" href="${esc(u)}" target="_blank" rel="noopener">↗ Ir</a>`:""}</div></div>`;}).join("")}
    </section>
  </div>
  <section class="bov-tx"><h3>🧾 Actualizar la bóveda</h3>
    <div class="bov-tipo" role="group" aria-label="Qué se actualiza">${[["gr","Grageas"],["pl","Puntos Legendarios"],["inv","Inventario"]].map(([k,l])=>`<button data-act="bovTipo" data-t="${k}" aria-pressed="${(b.tipo||"gr")===k}">${l}</button>`).join("")}</div>
    ${(b.tipo||"gr")==="gr"?`
    <div class="row" style="align-items:end;gap:12px">
      <label class="bov-f" for="bv-delta"><span class="lbl">Grageas que se añaden/quitan</span><input class="cell bov-d" id="bv-delta" data-bf="delta" value="${esc(b.delta||"")}" placeholder="+125 o -40" inputmode="numeric"></label>
      ${cob?`<button data-act="bovCob">Usar lo cobrado del mes (+${cob})</button>`:""}
      <div class="bov-prev" id="bovPrev" aria-live="polite">${bovPrevT(b,c)}</div>
    </div>
    `:(b.tipo==="pl")?`<div class="row" style="align-items:end;gap:12px"><label class="bov-f" for="bv-pdelta"><span class="lbl">Puntos Legendarios que se añaden/quitan</span><input class="cell bov-d" id="bv-pdelta" data-bf="pdelta" value="${esc(b.pdelta||"")}" placeholder="+3 o -10" inputmode="numeric"></label><div class="bov-prev" id="bovPrev" aria-live="polite">${bovPrevT(b,c)}</div></div><p class="small muted" style="margin:0">Tenés ${num(b.pla)} Puntos Legendarios actuales y ${num(b.plt)} totales (arriba, en la tarjeta del personaje).</p>`:`<label class="bov-f" for="bv-inv"><span class="lbl">Nuevo inventario: lo que se añade o se quita</span><textarea class="cell bov-enl" id="bv-inv" data-bf="inv" rows="3" placeholder="Ej.: + Capa de viaje encantada · − Poción multijugos (usada)">${esc(b.inv||"")}</textarea></label>`}
    <div class="bov-enls">
      <label class="bov-f" for="bv-pet"><span class="lbl">Enlace de la petición</span><input class="cell bov-u" id="bv-pet" data-bf="pet" value="${esc(b.pet||"")}" placeholder="Pegá el enlace de la petición"></label>
      <label class="bov-f" for="bv-ace"><span class="lbl">Enlace de la aceptación</span><input class="cell bov-u" id="bv-ace" data-bf="ace" value="${esc(b.ace||"")}" placeholder="Pegá el enlace de la aceptación"></label>
    </div>
    <label class="bov-f" for="bv-enl"><span class="lbl">Otros enlaces o texto (opcional, uno por línea)</span><textarea class="cell bov-enl" id="bv-enl" data-bf="enl" rows="2" placeholder="Si hay más enlaces, van acá">${esc(b.enl||"")}</textarea></label>
    <p class="small muted" style="margin:0">Divisor entre enlaces: <strong class="bov-div">${esc(divisor())}</strong> (cambia con el tema). Queda así: <code>[url=…]Petición[/url] ${esc(divisor())} [url=…]Aceptación[/url]</code></p>
    <div class="bov-codes">
      <div><div class="row between"><span class="lbl">Formulario</span><button data-act="copyTxt" data-t="bovForm">Copiar</button></div><textarea class="code-box" id="bovForm" readonly rows="6" aria-label="Formulario">${esc(form)}</textarea></div>
      <div><div class="row between"><span class="lbl">Código para la bóveda</span><button class="primary" data-act="copyTxt" data-t="bovHtml">Copiar código</button></div><textarea class="code-box" id="bovHtml" readonly rows="6" aria-label="Código de la bóveda">${esc(html)}</textarea></div>
    </div>
    <div class="row"><button class="primary" data-act="bovApply">✓ Ya lo publiqué: ${(b.tipo||"gr")==="inv"?"anotarlo":"actualizar mis números"}</button><span class="small muted">${(b.tipo||"gr")==="inv"?"Queda anotado en Últimos movimientos y se limpia el formulario.":"Iniciales pasa a ser lo que tenías, Actuales y Totales se actualizan, y se limpia la transacción. Lo que gastás no resta de Totales."}</span></div>
  </section>
  ${bovLog(b)}`;
};

/* ---------- futuros canjes (wish list) ---------- */
let wd={cat:"atributo",prio:"media"};
const allHabs=()=>Object.values(HABS).flat();
const range=(a,b,c)=>{let g=0;for(let l=a+1;l<=b;l++)g+=c[l]||0;return g;};
function wOpt(v,list,lab){return list.map((x,i)=>{const val=Array.isArray(x)?x[0]:x;const t=lab?lab(x,i):(Array.isArray(x)?x[0]:x);return `<option value="${esc(val)}"${String(val)===String(v)?" selected":""}>${esc(t)}</option>`;}).join("");}
function numOpts(v,from,to,lab){let h="";for(let i=from;i<=to;i++)h+=`<option value="${i}"${+v===i?" selected":""}>${esc(lab?lab(i):i)}</option>`;return h;}
function wf(lbl,inner,cls){return `<label class="wf${cls?" "+cls:""}"><span class="lbl">${lbl}</span>${inner}</label>`;}
function wsel(k,opts){return `<select class="cell wsel" data-wd="${k}">${opts}</select>`;}
function winp(k,ph,type){return `<input class="cell wsel" data-wd="${k}" value="${esc(wd[k]??"")}" placeholder="${esc(ph||"")}"${type?` type="${type}" min="0"`:""}>`;}
function grouped(cat){return Object.entries(LISTAS[cat]).map(([g,items])=>`<optgroup label="${esc(g)}">${items.map(x=>`<option value="${esc(x[0])}"${wd.item===x[0]?" selected":""}>${esc(x[0])} · ${x[1]}${x[2]?" + "+x[2]+" PL":""}</option>`).join("")}</optgroup>`).join("");}
function findItem(cat,n){for(const items of Object.values(LISTAS[cat]))for(const x of items)if(x[0]===n)return x;return null;}
function wDefaults(){const d=wd,c=d.cat;
  if(c==="atributo"){d.atr??=ATRS[0];d.de??=0;d.a??=Math.min(8,+d.de+1);}
  if(c==="habilidad"){d.hab??="Atletismo";d.de??=0;d.a??=1;}
  if(c==="trasfondo"){d.tt??=TRAS_T[0];d.tc??="General";d.de??=0;d.a??=1;}
  if(c==="ventaja"){d.vt??=VENT[0];d.de??=0;d.a??=1;}
  if(c==="especializacion"){d.er??=ESP_R[0];d.en??=1;}
  if(["hechizo","pocion","ritual","objeto"].includes(c)){if(d.nv===undefined||(c!=="hechizo"&&+d.nv===0))d.nv=1;}
  if(["talento","arma","raza","quidditch","legendario"].includes(c)){if(!d.item||!findItem(c,d.item))d.item=Object.values(LISTAS[c])[0][0][0];}
  if(c==="idioma"){d.it??="Mágico";d.de??=0;d.a??=1;}
  if(c==="titulo"){d.tk??="EXTASIS";d.as??=ASIG[0];d.ca??=CALIF[0];}
  if(c==="destino"){d.dk??="pd";}
}
function wCompute(p){const d=wd,c=d.cat;wDefaults();
  if(c==="atributo"){const de=+d.de,a=+d.a;if(a<=de)return null;return {n:`${d.atr} ${de} → ${a}`,g:range(de,a,ATR_COST),pl:a>=8?17:0,req:(a>=8?"Al 8 requiere Veteranía Legendaria. ":"")+(a>5?"Pasar de 5 requiere Talentoso":"Necesitás el límite de STAT a "+a)};}
  if(c==="habilidad"){const de=+d.de,a=+d.a;if(a<=de)return null;const arte=d.hab==="Arte/Artesanía";return {n:`${d.hab}: ${HAB_LV[de]} → ${HAB_LV[a]}`,g:range(de,a,arte?ARTE_COST:HAB_COST),pl:a>=5?7:0,req:a>=5?"Requiere Maestro y Veteranía Legendaria":a>=4?"Maestro requiere el Talentoso de su atributo":""};}
  if(c==="trasfondo"){const de=+d.de,a=+d.a;if(a<=de)return null;const esp=d.tc==="Específico";const base=l=>l<=5?(esp?50:100)*l:0;let g=0,pl=0;for(let l=de+1;l<=a;l++){g+=base(l);}if(a>=6){g+=esp?300:600;pl=esp?3:6;}
    const cat=String(d.tcat||"").trim();return {n:`${d.tt} ${d.tc}${cat?" > "+cat:""} ${ROM[de]} → ${ROM[a]}`,g,pl,req:a>=6?"Nivel VI es legendario: requiere tenerlo al V":""};}
  if(c==="ventaja"){const de=+d.de,a=+d.a;if(a<=de)return null;return {n:`${d.vt} ${ROM[de]} → ${ROM[a]}`,g:range(de,a,VENT_COST),pl:a>=4?10:0,req:a>=4?"Nivel IV es legendario: requiere tenerla al III":""};}
  if(c==="especializacion"){const ya=+(p.wishCfg?.esp||0),pend=(p.wish||[]).filter(w=>w.cat==="especializacion"&&!w.hecho).length,n=ya+pend+1;return {n:`${d.er} ${d.en}`,g:150*n,pl:0,req:`Sería tu ${n}ª especialización${+d.en>1?" · requiere "+d.er+" "+(d.en-1):""}`};}
  if(["hechizo","pocion","ritual","objeto"].includes(c)){const nv=+d.nv,lista=ARC[c][nv]||[];const nm=d.nm&&(lista.includes(d.nm)||d.nm==="__otro")?d.nm:lista[0];d.nm=nm;const nombre=nm==="__otro"?String(d.libre||"").trim():nm;if(!nombre)return null;
    const tipo={hechizo:"Hechizo",pocion:"Poción",ritual:"Ritual",objeto:"Objeto"}[c];const leg=nv===4;
    const base=leg?(c==="objeto"?"Reliquia Legendaria: requiere Veteranía Legendaria y diseñarla con Sistemas":"Arcano Legendario: requiere Veteranía Legendaria y diseñarlo con Sistemas"):c==="pocion"?`Requiere Pociones ${HAB_LV[nv]}`:c==="ritual"?`Requiere Rituales ${HAB_LV[nv]}`:(c==="hechizo"&&nv>=2?`Necesitás un arcano ${ARC_NV[nv-1][0].toLowerCase()} por cada ${ARC_NV[nv][0].toLowerCase()}`:"");
    const extra=ARC_REQ[nm]||"";const req=[extra,base].filter(Boolean).join(" · ");
    return {n:`${tipo} ${ARC_NV[nv][0].toLowerCase()}: ${nombre}`,g:ARC_NV[nv][1],pl:leg?30:0,req};}
  if(["talento","arma","raza","quidditch","legendario"].includes(c)){const x=findItem(c,d.item);if(!x)return null;const extra=String(d.det||"").trim();return {n:x[0]+(extra?" ("+extra+")":""),g:x[1],pl:x[2]||0,req:x[3]||""};}
  if(c==="idioma"){const de=+d.de,a=+d.a;if(a<=de)return null;const mag=d.it==="Mágico";const nom=mag?(d.im||IDI_MAG[0]):(String(d.il||"").trim()||"Idioma muggle");return {n:`${nom}: ${IDI_LV[de]} → ${IDI_LV[a]}`,g:(a-de)*(mag?100:50),pl:0,req:mag?"Explicar en la historia quién te lo enseña":""};}
  if(c==="titulo"){const i=CALIF.indexOf(d.ca);if(d.tk==="TIMOs")return {n:`TIMOs: ${d.ca}`,g:[50,100,150][i],pl:0,req:"Curso mínimo: 6.º"};return {n:`EXTASIS ${d.as}: ${d.ca}`,g:[30,60,90][i],pl:0,req:"Etapa mínima: Joven"};}
  if(c==="destino"){const k=d.dk;if(k==="pd")return {n:"Punto de Destino",g:1000,pl:0,req:"Máximo uno por año de veteranía"};
    if(k==="lim")return {n:`+1 al límite de ${d.atr||ATRS[0]}`,g:500,pl:0,req:"Máximo dos por año; sin diferencias de 2 entre límites"};
    if(k==="tal")return {n:`Talentoso en ${d.atr||ATRS[0]}`,g:1000,pl:0,req:"Todos los límites a 5"};
    if(k==="pro")return {n:`Proeza de ${d.hab||"Atletismo"}`,g:300,pl:3,req:"+9 entre Habilidad y STAT; tantas como Puntos de Destino"};}
  if(c==="otro"){const nm=String(d.libre||"").trim();if(!nm)return null;return {n:nm,g:num(d.g),pl:num(d.pl),req:""};}
  return null;}
function wForm(p){const d=wd,c=d.cat;wDefaults();let f="";
  const atrSel=k=>wsel(k,wOpt(d[k]||ATRS[0],ATRS));
  const habSel=k=>`<select class="cell wsel" data-wd="${k}">${Object.entries(HABS).map(([a,hs])=>`<optgroup label="${a}">${hs.map(h=>`<option${(d[k]||"Atletismo")===h?" selected":""}>${h}</option>`).join("")}</optgroup>`).join("")}</select>`;
  if(c==="atributo")f=wf("Atributo",atrSel("atr"))+wf("Lo tenés en",wsel("de",numOpts(d.de,0,7)))+wf("Lo querés en",wsel("a",numOpts(d.a,1,8,i=>i===8?"8 (legendario)":i)));
  if(c==="habilidad")f=wf("Habilidad",habSel("hab"))+wf("La tenés en",wsel("de",numOpts(d.de,0,4,i=>HAB_LV[i])))+wf("La querés en",wsel("a",numOpts(d.a,1,5,i=>HAB_LV[i])));
  if(c==="trasfondo")f=wf("Trasfondo",wsel("tt",wOpt(d.tt,TRAS_T)))+wf("Clase",wsel("tc",wOpt(d.tc,["General","Específico"])))+wf("Categoría",`<input class="cell wsel" data-wd="tcat" list="dl-cat" value="${esc(d.tcat||"")}" placeholder="Ej.: Política > Azkaban"><datalist id="dl-cat">${TRAS_CAT.map(x=>`<option value="${esc(x)}">`).join("")}</datalist>`)+wf("Lo tenés en",wsel("de",numOpts(d.de,0,5,i=>ROM[i])))+wf("Lo querés en",wsel("a",numOpts(d.a,1,6,i=>i===6?"VI (legendario)":ROM[i])));
  if(c==="ventaja")f=wf("Ventaja",wsel("vt",wOpt(d.vt,VENT)))+wf("La tenés en",wsel("de",numOpts(d.de,0,3,i=>ROM[i])))+wf("La querés en",wsel("a",numOpts(d.a,1,4,i=>i===4?"IV (legendaria)":ROM[i])));
  if(c==="especializacion")f=wf("Rama",wsel("er",wOpt(d.er,ESP_R)))+wf("Nivel",wsel("en",numOpts(d.en,1,3)))+wf("¿Cuántas especializaciones tenés ya?",`<input class="cell wsel" type="number" min="0" max="21" data-wcfg="esp" value="${+(p.wishCfg?.esp||0)}">`);
  if(["hechizo","pocion","ritual","objeto"].includes(c)){const niv=ARC_NV.map((x,i)=>[i,x]).filter(([i])=>(ARC[c][i]||[]).length);const lista=ARC[c][+d.nv]||[];
    f=wf("Nivel",`<select class="cell wsel" data-wd="nv">${niv.map(([i,x])=>`<option value="${i}"${+d.nv===i?" selected":""}>${x[0]} · ${x[1]}${i===4?" + 30 PL":""}</option>`).join("")}</select>`)+wf("Nombre",`<select class="cell wsel" data-wd="nm">${lista.map(n=>`<option${d.nm===n?" selected":""}>${esc(n)}</option>`).join("")}<option value="__otro"${d.nm==="__otro"?" selected":""}>Otro (lo escribo yo)…</option></select>`,"grow")+(d.nm==="__otro"?wf("¿Cuál?",winp("libre","Nombre")):"");}
  if(["talento","arma","raza","quidditch","legendario"].includes(c))f=wf("Canje",`<select class="cell wsel" data-wd="item">${grouped(c)}</select>`,"grow")+wf("Detalle (opcional)",winp("det",c==="arma"?"Ej.: daga de plata":"Ej.: hipogrifo, posición…"));
  if(c==="idioma")f=wf("Tipo",wsel("it",wOpt(d.it,["Mágico","Muggle"])))+(d.it==="Muggle"?wf("Idioma",winp("il","Ej.: Francés")):wf("Idioma",wsel("im",wOpt(d.im||IDI_MAG[0],IDI_MAG))))+wf("Lo tenés en",wsel("de",numOpts(d.de,0,2,i=>IDI_LV[i])))+wf("Lo querés en",wsel("a",numOpts(d.a,1,3,i=>IDI_LV[i])));
  if(c==="titulo")f=wf("Título",wsel("tk",wOpt(d.tk,["EXTASIS","TIMOs"])))+(d.tk==="EXTASIS"?wf("Asignatura",wsel("as",wOpt(d.as,ASIG)),"grow"):"")+wf("Calificación",wsel("ca",wOpt(d.ca,CALIF)));
  if(c==="destino")f=wf("Canje",wsel("dk",[["pd","Punto de Destino · 1000"],["lim","+1 al límite de un STAT · 500"],["tal","Talentoso · 1000"],["pro","Proeza · 300 + 3 PL"]].map(([v,t])=>`<option value="${v}"${d.dk===v?" selected":""}>${t}</option>`).join("")),"grow")+(d.dk==="lim"||d.dk==="tal"?wf("Atributo",atrSel("atr")):"")+(d.dk==="pro"?wf("Habilidad",habSel("hab")):"");
  if(c==="otro")f=wf("Qué es",winp("libre","Ej.: Objeto Inventado — Reloj de arena"),"grow")+wf("Grageas",winp("g","0","number"))+wf("Puntos Legendarios",winp("pl","0","number"));
  return f;}
function wPreview(p){const r=wCompute(p);return r?`<span class="wp-n">${esc(r.n)}</span><strong class="wp-g">${r.g} <small>grageas</small></strong>${r.pl?`<strong class="wp-pl">+ ${r.pl} <small>PL</small></strong>`:""}${r.req?`<span class="wp-req">⚠ ${esc(r.req)}</span>`:""}`:`<span class="muted small">Elegí un nivel mayor al que ya tenés.</span>`;}
function wishCalc(p){const b=bov(p),have=num(b.act),havePl=num(b.pla);const pend=(p.wish||[]).filter(w=>!w.hecho).sort((a,b)=>PRIO.findIndex(x=>x[0]===a.prio)-PRIO.findIndex(x=>x[0]===b.prio));
  let cg=0,cp=0;const ok={};pend.forEach(w=>{cg+=num(w.g);cp+=num(w.pl);ok[w.id]={cg,cp,alc:cg<=have&&cp<=havePl};});
  const tot={g:cg,pl:cp};const by={};PRIO.forEach(([k])=>{by[k]=pend.filter(w=>w.prio===k).reduce((a,w)=>a+num(w.g),0);});return {have,havePl,pend,ok,tot,by};}
V.canjes=()=>{
  if(!pjSel||!pjById(pjSel))pjSel=S.personajes[0]?.id||null;
  const p=pjById(pjSel);
  const sel=`<div class="pjs">${S.personajes.map(x=>`<button class="pj-tab c-${x.tono}" aria-pressed="${x.id===pjSel}" data-act="pj" data-id="${x.id}">${esc(x.emoji)} ${esc(x.nombre)}</button>`).join("")}</div>`;
  if(!p)return `<h2>🎁 Futuros canjes</h2><p class="empty">Creá un personaje primero.</p>`;
  p.wish=p.wish||[];p.wishCfg=p.wishCfg||{esp:0};
  const k=wishCalc(p),falta=Math.max(0,k.tot.g-k.have),pct=k.tot.g?Math.min(100,Math.round(k.have/k.tot.g*100)):100,faltaPl=Math.max(0,k.tot.pl-k.havePl);
  const row=w=>{const o=k.ok[w.id];const pr=PRIO.find(x=>x[0]===w.prio)||PRIO[1];return `<div class="wi${w.hecho?" done":""}" data-wid="${w.id}" style="--pc:var(--${pr[2]}-fg)">
    <select class="cell chip t-${pr[2]} wprio" data-wfield="prio" aria-label="Prioridad">${PRIO.map(([v,l,,ic])=>`<option value="${v}"${w.prio===v?" selected":""}>${ic} ${l}</option>`).join("")}</select>
    <div class="wi-t"><span class="wi-n">${esc(w.n)}</span>${w.req?`<span class="wi-req">${esc(w.req)}</span>`:""}</div>
    <span class="wi-g">${num(w.g)}<small> g</small>${num(w.pl)?`<br><span class="wi-pl">${num(w.pl)} PL</span>`:""}</span>
    <span class="wi-s">${w.hecho?`<span class="chip-s t-lilac">✓ canjeado</span>`:o.alc?`<span class="chip-s t-mint">✓ te alcanza</span>`:`<span class="chip-s t-gray" title="Grageas acumuladas en orden de prioridad">faltan ${Math.max(0,o.cg-k.have)}</span>`}</span>
    <span class="wi-a">${w.hecho?`<button class="ghost" data-act="wUndo" title="Volver a la lista">↶</button>`:`<button class="ghost" data-act="wBov" title="Marcar como canjeado y cargar el gasto en la Bóveda">→ Bóveda</button><button class="ghost" data-act="wDone" title="Marcar como canjeado">✓</button>`}<button class="ghost lg-x" data-act="wDel" aria-label="Quitar">✕</button></span></div>`;};
  const pend=k.pend,hechos=p.wish.filter(w=>w.hecho);
  return `<div class="row between"><h2>🎁 Futuros canjes</h2>${sel}</div>
  <section class="w-sum">
    <div class="w-big"><span class="lbl">Necesitás</span><strong>${k.tot.g}</strong><small>grageas${k.tot.pl?` + ${k.tot.pl} PL`:""}</small></div>
    <div class="w-big"><span class="lbl">Tenés en la bóveda</span><strong>${k.have}</strong><small>grageas · ${k.havePl} PL</small></div>
    <div class="w-big ${falta?"neg":"pos"}"><span class="lbl">${falta?"Te faltan":"¡Te alcanza todo!"}</span><strong>${falta}</strong><small>grageas${faltaPl?` y ${faltaPl} PL`:""}</small></div>
    <div class="w-bar" role="img" aria-label="Tenés el ${pct}% de lo que necesitás"><i style="width:${pct}%"></i><span>${pct}%</span></div>
    <div class="w-prio">${PRIO.map(([v,l,t,ic])=>`<span class="chip-s t-${t}">${ic} ${l}: <strong>${k.by[v]}</strong> g</span>`).join("")}</div>
  </section>
  <section class="w-add"><h3>✚ Agregar a la lista</h3>
    <div class="w-form">${wf("¿Qué querés canjear?",`<select class="cell wsel" data-wd="cat">${WCATS.map(([v,l])=>`<option value="${v}"${wd.cat===v?" selected":""}>${l}</option>`).join("")}</select>`)}${wForm(p)}</div>
    <div class="row" style="justify-content:space-between;align-items:center;gap:12px">
      <div class="w-prev" id="wPrev" aria-live="polite">${wPreview(p)}</div>
      <div class="row"><span class="lbl" style="margin-right:2px">Prioridad</span>${PRIO.map(([v,l,t,ic])=>`<button class="pr-b t-${t}" aria-pressed="${wd.prio===v}" data-act="wPrio" data-v="${v}">${ic} ${l}</button>`).join("")}<button class="primary" data-act="wAdd">Agregar</button></div>
    </div>
  </section>
  <section class="w-list">${pend.length?pend.map(row).join(""):`<p class="empty">Tu lista está vacía. Agregá lo que querés canjear y te digo cuántas grageas necesitás.</p>`}</section>
  ${hechos.length?`<details class="w-done"><summary>Ya canjeados (${hechos.length})</summary>${hechos.map(row).join("")}</details>`:""}
  <p class="small muted" style="margin:0">Los precios salen de la lista de canjes del foro. Los arcanos con ✦ son inventados por usuarios del foro. «Te alcanza» suma en orden de prioridad (alta, media, baja) contra las grageas actuales de la Bóveda.</p>`;
};

V.coloreador=()=>"";
V.copia=()=>importView()+`<h2>💾 Copia de seguridad</h2>
  <p style="margin:0;max-width:62ch">Tu registro se guarda en este navegador. Si cambiás de dispositivo o borrás los datos del navegador, se pierde. Copiá el código de vez en cuando y guardalo donde quieras; pegándolo acá lo recuperás.</p>
  <div style="display:grid;gap:8px"><textarea class="code-box" id="exp" readonly aria-label="Código del registro">${esc(JSON.stringify(S))}</textarea><div><button class="primary" data-act="copy">Copiar código</button></div></div>
  <div style="display:grid;gap:8px"><h3>Cargar un código</h3><textarea class="code-box" id="imp" placeholder="Pegá acá el código de tu registro" aria-label="Pegar código"></textarea><div class="row"><button data-act="import">Cargar</button><span class="small muted">Reemplaza todo lo que hay ahora.</span></div></div>
  <details><summary>Borrar todo</summary><p class="small muted">Vuelve a la plantilla en blanco.</p><button class="warn" data-act="wipe">Borrar todo</button></details>`;


/* ---------- ánimo ---------- */
function pendientes(){const out=[];let venc=0,total=0;S.personajes.forEach(p=>p.roles.forEach(r=>{total++;if(r.estado==="Sin Contestar")out.push({p,r});if(limEstado(r)==="over")venc++;}));return {out,venc,total};}
function moodState(){const {out,venc,total}=pendientes();if(!total)return{m:"zen",out,venc,total};if(!out.length)return{m:"happy",out,venc,total};if(out.length>=3||venc)return{m:"cry",out,venc,total};return{m:"sad",out,venc,total};}
const pick=a=>a[Math.floor(Math.random()*a.length)];
let frase={};
function faceSVG(m){
  const eyes={
    happy:'<path d="M30 46 q7 -9 14 0" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><path d="M56 46 q7 -9 14 0" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>',
    sad:'<path d="M29 43 l12 -5" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M71 43 l-12 -5" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="37" cy="51" r="5.5" fill="currentColor"/><circle cx="63" cy="51" r="5.5" fill="currentColor"/><circle cx="39" cy="49" r="1.8" fill="var(--surface)"/><circle cx="65" cy="49" r="1.8" fill="var(--surface)"/>',
    cry:'<path d="M28 44 q9 6 16 0" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><path d="M56 44 q9 6 16 0" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>',
    zen:'<path d="M30 49 h13" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><path d="M57 49 h13" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>'}[m];
  const mouth={happy:'<path d="M38 62 q12 16 24 0 z" fill="currentColor"/><path d="M44 68 q6 5 12 0" fill="var(--rose-fg)" opacity=".8"/>',
    sad:'<path d="M40 71 q10 -9 20 0" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>',
    cry:'<path d="M37 74 q13 -16 26 0 q-13 -5 -26 0 z" fill="currentColor"/>',
    zen:'<path d="M43 67 q7 4 14 0" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>'}[m];
  const tears=m==="sad"?'<path class="tear" d="M64 58 q-3 6 0 8 q3 -2 0 -8z" fill="var(--sky-fg)"/>':m==="cry"?'<path class="tear" d="M33 50 q-4 8 0 11 q4 -3 0 -11z" fill="var(--sky-fg)"/><path class="tear b" d="M67 50 q-4 8 0 11 q4 -3 0 -11z" fill="var(--sky-fg)"/><path class="tear b" d="M30 52 q-4 8 0 11 q4 -3 0 -11z" fill="var(--sky-fg)"/><path class="tear" d="M70 52 q-4 8 0 11 q4 -3 0 -11z" fill="var(--sky-fg)"/>':"";
  const extra=m==="happy"?'<text x="86" y="20" font-size="14">✨</text><text x="2" y="30" font-size="11">💖</text>':m==="cry"?'<text x="72" y="10" font-size="22">🌧️</text>':m==="zen"?'<text x="78" y="18" font-size="12">💤</text>':"";
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="54" r="40" fill="var(--surface)" stroke="currentColor" stroke-width="3.5"/>${m!=="zen"?'<ellipse cx="27" cy="62" rx="7" ry="4" fill="var(--rose-fg)" opacity=".28"/><ellipse cx="73" cy="62" rx="7" ry="4" fill="var(--rose-fg)" opacity=".28"/>':""}${eyes}${mouth}${tears}${extra}</svg>`;
}
function moodCard(){
  if(S.moodOff)return"";
  const st=moodState(),t=TRATO[S.trato],n=st.out.length;
  if(!frase[st.m+n])frase[st.m+n]=st.m==="happy"?pick(["Tus compañeros de rol te adoran.","Cero roles esperando. El foro está en paz gracias a vos.","Todo al día. Andá a tomarte un té, te lo ganaste.","Ni un rol pendiente. Sos el ejemplo del foro."])
    :st.m==="sad"?pick(["Los roles no se contestan solos…","Alguien está refrescando el tema esperando tu respuesta.","Un postcito y volvemos a ser felices.","Tu compañero de rol está mirando la ventana, esperándote."])
    :st.m==="cry"?pick(["Hay gente esperando. Mucha gente. La carita no aguanta más.","Esto ya es un abandono de roles. La carita llora.","Tus personajes te extrañan. Volvé.","La pila de roles crece y la carita se deshace."]):"Cuando anotes tus roles, acá te voy a contar cómo vas.";
  let big,sub=frase[st.m+n];
  if(st.m==="happy")big=t?`good ${t.w} ✨`:"good… ¿girl? ¿boy? ¿person?";
  else if(st.m==="sad")big=`${n===1?"Te falta 1 rol":"Te faltan "+n+" roles"} 🥺`;
  else if(st.m==="cry")big=`${n?n+(n===1?" rol sin contestar":" roles sin contestar"):"Fechas vencidas"} 😭`;
  else big="Todo tranqui por acá";
  if(st.m==="happy")sub=(t?`Contestaste todo, ${t.reina}. `:"Contestaste todo. ")+sub;
  if(st.venc)sub+=` (${st.venc===1?"1 fecha límite vencida":st.venc+" fechas límite vencidas"})`;
  const rain=st.m==="cry"?`<div class="mood-rain">${Array.from({length:22},(_,i)=>`<i style="left:${(i*4.7+Math.random()*3)%100}%;animation-duration:${.7+Math.random()*.7}s;animation-delay:${-Math.random()}s"></i>`).join("")}</div>`:"";
  const spk=st.m==="happy"?Array.from({length:7},()=>`<span class="sparkle" style="left:${Math.random()*96}%;top:${Math.random()*85}%;animation-delay:${-Math.random()*1.8}s">${pick(["✦","✨","⭐","💖"])}</span>`).join(""):"";
  return `<section class="mood ${st.m}${S.trato?"":" ask"}" aria-live="polite">${rain}${spk}<button class="mood-x" data-act="moodOff" aria-label="Ocultar la carita" title="Ocultar (la carita de arriba la vuelve a mostrar)">✕</button>
    <button class="face" data-act="face" aria-label="Carita">${faceSVG(st.m)}</button>
    <div class="mood-txt"><p class="mood-big${st.m==="happy"?" wiggle":""}">${esc(big)}</p><p class="mood-sub">${esc(sub)}</p>
    ${n?`<div class="pend">${st.out.slice(0,8).map(({p,r})=>`<button data-act="goPj" data-id="${p.id}">${esc(p.emoji)} ${esc(r.nombre||"(sin nombre)")}</button>`).join("")}${n>8?`<span class="small">y ${n-8} más</span>`:""}</div>`:""}</div>
    <div class="trato"><span class="q">${S.trato?"Te trato como:":"Antes que nada: ¿cómo querés que te trate?"}</span>${Object.entries(TRATO).map(([k,v])=>`<button data-act="trato" data-k="${k}" aria-pressed="${S.trato===k}"><span>${v.e} ${v.l}</span></button>`).join("")}</div>
  </section>`;
}
let lastMood=null;
function updateMood(){
  const st=moodState();
  RR.getElementById("miniFace").textContent={happy:"🥰",sad:"🥺",cry:"😭",zen:"🙂"}[st.m];
  if(lastMood&&lastMood!=="happy"&&st.m==="happy"&&!S.moodOff)party(true);
  lastMood=st.m;
}
function party(big){
  const box=RR.getElementById("party");const k=skinOf();
  const em=[...k.fx,"🎉","✨","💖","⭐"];
  const n=big?60:28;let h="";
  for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,d=120+Math.random()*(big?520:300);h+=`<span style="--x:${Math.cos(a)*d|0}px;--y:${Math.sin(a)*d*.8|0}px;--r:${(Math.random()*720-360)|0}deg;--d:${1.2+Math.random()*1.2}s;--s:${16+Math.random()*22|0}px">${pick(em)}</span>`;}
  box.innerHTML=h;clearTimeout(party.t);party.t=setTimeout(()=>box.innerHTML="",2600);
  if(big){const t=TRATO[S.trato];toast(t?`GOOD ${t.w.toUpperCase()} 🎉`:"¡Todo contestado! 🎉");}
}

/* ---------- render y eventos ---------- */
const panel=RR.getElementById("panel");
function render(){
  syncPam();
  migrar();
  applySkin();
  updateMood();
  RR.getElementById("owner").value=S.owner||"";
  RR.querySelectorAll("#tabs a").forEach(a=>a.setAttribute("aria-current",a.dataset.tab===tab?"page":"false"));
  const isCol=tab==="coloreador";panel.hidden=isCol;RR.getElementById("coloreador").hidden=!isCol;
  panel.innerHTML=V[tab]();
  requestAnimationFrame(()=>renderPumpkins());
}
function go(t){if(!V[t])t="inicio";tab=t;render();}
/* Pestañas sin depender del # de la dirección (algunas vistas embebidas lo bloquean) */
function nav(t){if(window.rrNav)window.rrNav(t);else go(t);}
RR.getElementById("tabs").addEventListener("click",e=>{const a=e.target.closest("a[data-tab]");if(!a)return;e.preventDefault();nav(a.dataset.tab);});

/* calabazas (solo Gothic Horror) */
function renderPumpkins(){const L=RR.getElementById("pumpkins");if(!L)return;const on=skinOf().id==="terror";const list=on?(S.pumpkins||[]):[];
  L.style.height=on?Math.max(document.documentElement.scrollHeight,w.innerHeight)+"px":"0px";
  L.innerHTML=list.map((q,i)=>`<button class="pk" data-i="${i}" title="Tocala para sacarla" aria-label="Calabaza" style="left:${q.x}%;top:${q.y}%;font-size:${q.s}px;--rot:${q.r}deg">🎃</button>`).join("");}
RR.getElementById("pumpkins").addEventListener("click",e=>{const b=e.target.closest(".pk");if(!b)return;S.pumpkins.splice(+b.dataset.i,1);save();applySkin();});
w.addEventListener("resize",()=>renderPumpkins());
RR.getElementById("skins").addEventListener("click",e=>{if(e.target.closest("[data-skt]")){skinsOpen=!skinsOpen;applySkin();return;}const pk=e.target.closest("[data-pk]");if(pk){S.pumpkins=S.pumpkins||[];
  if(pk.dataset.pk==="add"){for(let i=0;i<6;i++)S.pumpkins.push({x:+(Math.random()*94+1).toFixed(1),y:+(Math.random()*92+3).toFixed(1),s:22+Math.round(Math.random()*24),r:Math.round(Math.random()*40-20)});if(S.pumpkins.length>60)S.pumpkins=S.pumpkins.slice(-60);toast("🎃 ¡Calabazas! Tocá una para sacarla");}
  else{S.pumpkins=[];toast("Calabazas barridas 🧹");}
  save();applySkin();return;}const b=e.target.closest("[data-skin]");if(!b)return;S.skin=b.dataset.skin;skinsOpen=false;save();render();toast("Tema: "+skinOf().nombre);});
RR.getElementById("miniFace").addEventListener("click",()=>{if(S.moodOff){S.moodOff=false;save();toast("La carita volvió 🙂");}nav("inicio");});
RR.getElementById("owner").addEventListener("input",e=>{S.owner=e.target.value;save();});

function ctx(el){
  const tr=el.closest("[data-rid],[data-mid],[data-oid],[data-gid],[data-fid]");
  const card=el.closest("[data-pid]");
  return {tr,card};
}
function setField(el){
  const {tr,card}=ctx(el); let v=el.value;
  if(el.type==="number")v=+v||0;
  const p=pjById(pjSel);
  if(el.dataset.f&&p){const r=p.roles.find(x=>x.id===tr.dataset.rid);if(r)r[el.dataset.f]=v;}
  else if(el.dataset.pf&&p){p[el.dataset.pf]=v;if(el.dataset.pf==="nombre"&&p.pamId&&window.pamPjs)window.pamPjs.renombrar(p.pamId,v);}
  else if(el.dataset.mf){const m=S.turnos.misiones.find(x=>x.id===tr.dataset.mid);if(m)m[el.dataset.mf]=v;}
  else if(el.dataset.tf){S.turnos.tarifas[el.dataset.tf]=v;}
  else if(el.dataset.of){const o=S.oficiales.find(x=>x.id===tr.dataset.oid);if(o)o[el.dataset.of]=v;}
  else if(el.dataset.gf){const pj=pjById(card.dataset.pid);const g=pj&&pj.ganancias.find(x=>x.id===tr.dataset.gid);if(g)g[el.dataset.gf]=v;}
  else if(el.dataset.lf){const pj=pjById(pjSel);const lid=el.closest("[data-lid]")?.dataset.lid;const e=pj&&(bov(pj).log||[]).find(x=>x.id===lid);if(e)e[el.dataset.lf]=el.value;else return false;}
  else if(el.dataset.bf){const pj=pjById(pjSel);if(!pj)return false;const k=el.dataset.bf;bov(pj)[k]=["delta","pdelta","inv","enl","pet","ace","l1","l2","l3"].includes(k)?el.value:num(el.value);}
  else if(el.dataset.ff){const f=S.fijos.find(x=>x.id===tr.dataset.fid);if(f)f[el.dataset.ff]=v;}
  else return false;
  return true;
}
/* Pegar un enlace en el título del rol lo guarda como enlace */
panel.addEventListener("paste",e=>{const el=e.target;if(!el.matches||!el.matches('[data-f="nombre"]'))return;
  const txt=(e.clipboardData||window.clipboardData)?.getData("text")?.trim()||"";if(!/^https?:\/\/\S+$/i.test(txt))return;
  const tr=el.closest("[data-rid]"),p=pjById(pjSel),r=p&&tr&&p.roles.find(x=>x.id===tr.dataset.rid);if(!r)return;
  e.preventDefault();r.enlace=txt;linkOpen=null;save();render();toast("Enlace guardado: tocá «↗ Ir al rol» para abrirlo");});
panel.addEventListener("input",e=>{if(e.target.matches(".of-q")){ofQ=e.target.value;ofBuscar();}});
panel.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.matches('[data-f="enlace"]')){e.preventDefault();e.target.blur();linkOpen=null;render();}});
panel.addEventListener("input",e=>{if(e.target.dataset.bf&&setField(e.target)){save();updateBovCode();return;}if(e.target.type==="color"){const t=e.target.closest(".con-p")?.querySelector("input.cell");if(t)t.style.color=e.target.value;e.target.parentElement.classList.remove("unset");}if(e.target.matches("input"))if(setField(e.target))save();});
panel.addEventListener("change",e=>{if(e.target.dataset&&e.target.dataset.bf&&!["l1","l2","l3"].includes(e.target.dataset.bf))return;if(e.target.matches("input,select")){if(setField(e.target)){save();render();}}});

panel.addEventListener("click",e=>{
  const b=e.target.closest("[data-act]");if(!b)return;
  const a=b.dataset.act,{tr,card}=ctx(b),p=pjById(pjSel);
  const done=()=>{save();render();};
  switch(a){
    case"keep":S.ejemplo=false;return done();
    case"trato":{S.trato=b.dataset.k;save();render();const t=TRATO[S.trato];if(moodState().m==="happy")party(true);else toast(`Anotado: ${t.e} ${t.l}`);return;}
    case"lnk":{const id=tr.dataset.rid;linkOpen=linkOpen===id?null:id;render();panel.querySelector(`[data-rid="${id}"] [data-f="enlace"]`)?.focus();return;}
    case"lnkOk":linkOpen=null;return render();
    case"add2":{const r=p.roles.find(x=>x.id===tr.dataset.rid);r.dos=true;if(r.con2===undefined){r.con2="";r.color2="";}done();panel.querySelector(`[data-rid="${r.id}"] [data-f="con2"]`)?.focus();return;}
    case"del2":{const r=p.roles.find(x=>x.id===tr.dataset.rid);r.dos=false;r.con2="";r.color2="";return done();}
    case"wPrio":wd.prio=b.dataset.v;return render();
    case"wAdd":{const r=wCompute(p);if(!r){toast("Completá los datos del canje");return;}p.wish=p.wish||[];p.wish.push({id:uid(),cat:wd.cat,n:r.n,g:r.g,pl:r.pl,req:r.req,prio:wd.prio,hecho:false,at:new Date().toISOString()});toast(`Agregado: ${r.n} (${r.g} grageas)`);return done();}
    case"wDel":{const id=b.closest("[data-wid]").dataset.wid;return armDelete(b,()=>{p.wish=p.wish.filter(x=>x.id!==id);done();});}
    case"wDone":case"wUndo":{const w=p.wish.find(x=>x.id===b.closest("[data-wid]").dataset.wid);if(w){w.hecho=a==="wDone";if(w.hecho)toast("¡Canjeado! ✨");}return done();}
    case"wBov":{const w=p.wish.find(x=>x.id===b.closest("[data-wid]").dataset.wid);if(!w)return;w.hecho=true;const bb=bov(p);bb.delta="-"+num(w.g);bb.enl=w.n;save();toast(`Cargué -${num(w.g)} en la Bóveda${num(w.pl)?` · acordate de descontar ${num(w.pl)} PL`:""}`);return nav("boveda");}
    case"moodOff":S.moodOff=true;toast("Carita oculta. Tocá la carita de arriba para traerla");return done();
    case"toImport":return nav("copia");
    case"impReplace":case"impAdd":{if(!pendingImport)return;applyImport(pendingImport,a==="impReplace");pendingImport=null;return done();}
    case"impCancel":pendingImport=null;return render();
    case"face":{const m=moodState().m;if(m==="happy")party(false);else{b.classList.remove("shake");void b.offsetWidth;b.classList.add("shake");toast(pick(m==="cry"?["No me toques, estoy llorando 😭","Contestá un rol y se me pasa","*sollozos en BBCode*"]:m==="sad"?["🥺 un postcito nomás…","Te espero acá","¿Y si contestás uno ahora?"]:["Anotá un rol y hablamos"]));}return;}
    case"goPj":pjSel=b.dataset.id;return nav("personajes");
    case"blank":S=vacio();pjSel=null;toast("Plantilla en blanco lista");return done();
    case"pj":{pjSel=b.dataset.id;const rp=pjById(pjSel);if(rp&&rp.pamId&&window.pamPjs)window.pamPjs.cambiar(rp.pamId);return render();}
    case"addPj":if(window.pamPjs){window.pamPjs.nuevoUI();toast("Ponele nombre en Mi Ficha: su registro y su bóveda se crean solos");return;}{const t=TONOS[S.personajes.length%TONOS.length];const n=nuevoPj("Nuevo personaje","✨",t);S.personajes.push(n);pjSel=n.id;save();return nav("personajes");}
    case"tono":p.tono=b.dataset.t;return done();
    case"delPj":return armDelete(b,()=>{S.personajes=S.personajes.filter(x=>x.id!==p.id);pjSel=null;done();toast("Personaje borrado");});
    case"addRol":p.roles.push({id:uid(),nombre:"",con:"",color:"",tipo:"Libre",fecha:"",estado:"Sin Contestar",limite:"",enlace:""});done();
      {const ins=panel.querySelectorAll('[data-f="nombre"]');ins[ins.length-1]?.focus();}return;
    case"delRol":return armDelete(b,()=>{p.roles=p.roles.filter(x=>x.id!==tr.dataset.rid);done();});
    case"addMis":S.turnos.misiones.push({id:uid(),nombre:"Nueva misión",faltasMaster:0,n:12,t:[]});return done();
    case"delMis":return armDelete(b,()=>{S.turnos.misiones=S.turnos.misiones.filter(x=>x.id!==tr.dataset.mid);done();});
    case"turn":{const m=S.turnos.misiones.find(x=>x.id===tr.dataset.mid),i=+b.dataset.i;const cur=TURNOS.findIndex(x=>x[0]===(m.t[i]||"Sin Postear"));m.t[i]=TURNOS[(cur+1)%TURNOS.length][0];save();render();
      panel.querySelector(`[data-mid="${m.id}"] [data-i="${i}"]`)?.focus();return;}
    case"ofF":ofFiltro=b.dataset.k;render();ofBuscar();return;
    case"ofFav":{const o=S.oficiales.find(x=>x.id===tr.dataset.oid);if(o){o.fav=!o.fav;save();render();ofBuscar();}return;}
    case"addOf":S.oficiales.push({id:uid(),nombre:"",relacion:"",fecha:"",estado:"Disponible",enlace:""});return done();
    case"delOf":return armDelete(b,()=>{S.oficiales=S.oficiales.filter(x=>x.id!==tr.dataset.oid);done();});
    case"addG":{const pj=pjById(card.dataset.pid);pj.ganancias.push({id:uid(),concepto:"",monto:0,fijo:"",estado:"Sin Cobrar"});return done();}
    case"delG":{const pj=pjById(card.dataset.pid);pj.ganancias=pj.ganancias.filter(x=>x.id!==tr.dataset.gid);return done();}
    case"addF":S.fijos.push({id:uid(),nombre:"Nuevo pago",monto:0});return done();
    case"delF":return armDelete(b,()=>{const id=tr.dataset.fid;S.fijos=S.fijos.filter(x=>x.id!==id);S.personajes.forEach(pj=>pj.ganancias.forEach(g=>{if(g.fijo===id)g.fijo="";}));done();});
    case"resetMes":S.personajes.forEach(pj=>pj.ganancias.forEach(g=>g.estado="Sin Cobrar"));toast("Mes nuevo: todo sin cobrar");return done();
    case"copyTxt":{const ta=RR.getElementById(b.dataset.t);if(!ta)return;const fb=()=>{ta.focus();ta.select();toast("Seleccionado: copialo con Ctrl+C");};
      try{navigator.clipboard.writeText(ta.value).then(()=>toast("Copiado ✨"),fb);}catch(_){fb();}return;}
    case"bovTipo":{bov(p).tipo=b.dataset.t;return done();}
    case"bovUndo":{const bb=bov(p),e=bb.log&&bb.log[0];if(!e)return;if(e.kind==="pl"){bb.pla=e.pl0;bb.plt=e.plt0;bb.log.shift();toast("Deshecho: volviste a "+e.pl0+" Puntos Legendarios");return done();}if(e.kind==="inv"){bb.log.shift();toast("Deshecho el último movimiento de inventario");return done();}bb.ini=e.ini0;bb.act=e.act0;bb.tot=e.tot0;bb.log.shift();toast("Deshecho: volviste a "+e.act0+" grageas");return done();}
    case"bovDelLog":return armDelete(b,()=>{const bb=bov(p);bb.log=(bb.log||[]).filter(x=>x.id!==b.dataset.id);done();});
    case"bovAddLog":{const bb=bov(p);bb.log=bb.log||[];bb.log.unshift({id:uid(),at:new Date().toISOString(),ini0:num(bb.ini),act0:num(bb.act),tot0:num(bb.tot),ini:num(bb.act),d:0,act:num(bb.act),tot:num(bb.tot),enl:"",nota:"Nota",pet:"",ace:""});return done();}
    case"bovCob":{const bb=bov(p);bb.delta="+"+totalPj(p).cob;return done();}
    case"bovApply":{const bb=bov(p);if((bb.tipo||"gr")!=="gr"){if(bovApplyOtro(bb))done();return;}const c=bovCalc(bb);if(!c.d){toast("Escribí cuántas grageas se añaden o quitan");return;}const d0=new Date();bb.log=bb.log||[];bb.log.unshift({id:uid(),at:d0.toISOString(),ini0:num(bb.ini),act0:num(bb.act),tot0:num(bb.tot),ini:c.ini,d:c.d,act:c.act,tot:c.tot,enl:bovEnlaces(bb),pet:String(bb.pet||"").trim(),ace:String(bb.ace||"").trim()});if(bb.log.length>150)bb.log.length=150;
      bb.ini=c.ini;bb.act=c.act;bb.tot=c.tot;bb.delta="";bb.enl="";bb.pet="";bb.ace="";toast(`Bóveda actualizada: ${c.act} grageas`);return done();}
    case"copy":{const ta=RR.getElementById("exp");const ok=()=>toast("Código copiado");
      try{navigator.clipboard.writeText(ta.value).then(ok,()=>{ta.select();toast("Seleccionado: copialo con Ctrl+C");});}catch(_){ta.select();toast("Seleccionado: copialo con Ctrl+C");}return;}
    case"import":{try{const d=JSON.parse(RR.getElementById("imp").value.trim());if(!d||!Array.isArray(d.personajes))throw 0;S=d;S.ejemplo=false;pjSel=null;toast("Registro cargado");done();}catch(_){toast("Ese código no es válido: revisá que esté completo");}return;}
    case"wipe":return armDelete(b,()=>{S=vacio();pjSel=null;done();toast("Registro en blanco");});
  }
});


/* ---------- importar desde Excel ---------- */
let pendingImport=null, impError="";

function applyImport(r,reemplazar){
  if(reemplazar){S.personajes=[];S.oficiales=[];S.turnos.misiones=[];S.fijos=[];}
  const usados=new Set(S.personajes.map(p=>p.tono));let ti=0;
  r.personajes.forEach(p=>{
    const ya=S.personajes.find(x=>compact(x.nombre)===compact(p.nombre));
    if(ya&&!reemplazar){ya.roles.push(...p.roles);if(p.ganancias.length)ya.ganancias=p.ganancias;return;}
    while(usados.has(TONOS[ti%TONOS.length])&&ti<TONOS.length)ti++;
    p.tono=TONOS[ti%TONOS.length];usados.add(p.tono);ti++;
    if(!p.ganancias.length)p.ganancias=[{id:uid(),concepto:"💰 Sueldo mensual",monto:0,fijo:"",estado:"Sin Cobrar"}];
    S.personajes.push(p);
  });
  S.oficiales.push(...r.oficiales);S.turnos.misiones.push(...r.misiones);
  if(r.tarifas)Object.assign(S.turnos.tarifas,r.tarifas);
  r.fijos.forEach(f=>{const ya=S.fijos.find(x=>compact(x.nombre)===compact(f.nombre));if(ya){ya.monto=f.monto;S.personajes.forEach(p=>p.ganancias.forEach(g=>{if(g.fijo===f.id)g.fijo=ya.id;}));}else S.fijos.push(f);});
  S.ejemplo=false;pjSel=null;
  const n=r.personajes.reduce((a,p)=>a+p.roles.length,0);
  toast(`Importado: ${r.personajes.length} personajes, ${n} roles ✨`);
}
async function handleFile(file){
  if(!file)return;impError="";pendingImport=null;
  if(!/\.(xlsx|xlsm|xls|ods)$/i.test(file.name)){impError="Ese archivo no es un Excel. Subí un .xlsx (también sirve .xls u .ods).";return render();}
  try{
    toast("Leyendo tu Excel…");
    const X=await loadXLSX(window);const buf=await file.arrayBuffer();
    const wb=X.read(buf,{type:"array"});const r=parseWorkbook(wb,X,uid);r.archivo=file.name;
    if(!r.personajes.length&&!r.oficiales.length&&!r.misiones.length)impError="No encontré hojas de roles. Cada personaje tiene que tener su hoja con una columna «Nombre de rol».";
    else pendingImport=r;
  }catch(e){impError="No pude leer el archivo. Probá guardarlo de nuevo como .xlsx y volvé a subirlo.";}
  render();
}
function importView(){
  const r=pendingImport;
  const resumen=r?`<div class="imp-sum"><h3>📄 ${esc(r.archivo)}</h3><ul>
    ${r.personajes.map(p=>`<li>${esc(p.emoji)} <strong>${esc(p.nombre)}</strong>: ${p.roles.length} ${p.roles.length===1?"rol":"roles"}${p.ganancias.length?` · ${p.ganancias.length} conceptos de ganancias`:""}</li>`).join("")}
    ${r.oficiales.length?`<li>🎀 ${r.oficiales.length} posibles oficiales</li>`:""}
    ${r.misiones.length?`<li>🎮 ${r.misiones.length} ${r.misiones.length===1?"misión":"misiones"} en el control de turnos${r.tarifas?" + tarifas":""}</li>`:""}
    ${r.fijos.length?`<li>💳 ${r.fijos.length} pagos fijos</li>`:""}
    ${r.avisos.length?`<li class="muted">Hojas que no reconocí y salteé: ${r.avisos.map(esc).join(", ")}</li>`:""}
  </ul><p class="small muted" style="margin:0">El color de cada compañero no viene en el Excel: elegilo después con la ruedita de cada rol.</p>
  <div class="row"><button class="primary" data-act="impReplace">Reemplazar mi registro</button><button data-act="impAdd">Sumar a lo que tengo</button><button class="ghost" data-act="impCancel">Cancelar</button></div></div>`:"";
  return `<section style="display:grid;gap:12px"><h2>📥 Importar desde Excel</h2>
  <p style="margin:0;max-width:62ch">Subí tu planilla de roles. Leo una hoja por personaje (con las columnas Nombre de rol, Con, Tipo de Rol, Fecha, Estado y Fecha Límite), y si están, también Posibles Oficiales, Control de turnos y Ganancias Mensuales.</p>
  <label class="drop" id="drop" for="xlsxIn"><span style="font-size:2rem">📂</span><strong>Elegí tu archivo .xlsx</strong><span class="small muted">o arrastralo hasta acá</span><input type="file" id="xlsxIn" accept=".xlsx,.xlsm,.xls,.ods"></label>
  ${impError?`<div class="alert t-rose">${esc(impError)}</div>`:""}${resumen}</section>`;
}
panel.addEventListener("change",e=>{if(e.target.id==="xlsxIn")handleFile(e.target.files[0]);});
panel.addEventListener("dragover",e=>{const d=e.target.closest("#drop");if(d){e.preventDefault();d.classList.add("over");}});
panel.addEventListener("dragleave",e=>{const d=e.target.closest("#drop");if(d)d.classList.remove("over");});
panel.addEventListener("drop",e=>{const d=e.target.closest("#drop");if(d){e.preventDefault();d.classList.remove("over");handleFile(e.dataTransfer.files[0]);}});

/* eventos de la wish list */
function wUpdPrev(){const p=pjById(pjSel),el=RR.getElementById("wPrev");if(p&&el)el.innerHTML=wPreview(p);}
panel.addEventListener("change",e=>{const t=e.target,p=pjById(pjSel);
  if(t.dataset.wd){const k=t.dataset.wd;if(k==="cat"){wd={cat:t.value,prio:wd.prio};}else{wd[k]=t.value;if(k==="de"&&+wd.a<=+wd.de)wd.a=+wd.de+1;if(k==="nv"){wd.nm="";}}render();return;}
  if(t.dataset.wcfg&&p){p.wishCfg=p.wishCfg||{};p.wishCfg[t.dataset.wcfg]=num(t.value);save();wUpdPrev();return;}
  if(t.dataset.wfield&&p){const w=(p.wish||[]).find(x=>x.id===t.closest("[data-wid]").dataset.wid);if(w){w[t.dataset.wfield]=t.value;save();render();}return;}
});
panel.addEventListener("input",e=>{const t=e.target,p=pjById(pjSel);
  if(t.dataset.wd&&t.tagName==="INPUT"){wd[t.dataset.wd]=t.value;wUpdPrev();}
  if(t.dataset.wcfg&&p){p.wishCfg=p.wishCfg||{};p.wishCfg[t.dataset.wcfg]=num(t.value);save();wUpdPrev();}
});

const loc=loadLocal(); if(loc)S=loc;
/* ---- personajes conectados con Mi Ficha: cada ficha tiene su registro, ganancias, bóveda y futuros canjes ---- */
const nrm=x=>String(x||"").normalize("NFD").replace(/[̀-ͯ]/g,"").trim().toLowerCase();
let sincronizando=false;
function syncPam(){
  const Pm=window.pamPjs; if(!Pm||sincronizando) return false;
  sincronizando=true; let ch=false, sel=false;
  try{
    if(S.ejemplo){ const v=vacio(); v.personajes=[]; v.owner=S.owner||""; S=v; ch=true; }
    const L=Pm.lista(), ids=new Set(L.map(x=>x.id));
    const antes=S.personajes.length;
    S.personajes=S.personajes.filter(r=>!r.pamId||ids.has(r.pamId));           /* se borró la ficha: se borra su registro */
    if(S.personajes.length!==antes) ch=true;
    const libres=()=>Pm.lista().filter(x=>!S.personajes.some(r=>r.pamId===x.id));
    S.personajes.filter(r=>!r.pamId).forEach(r=>{                             /* registros viejos: se unen a su ficha */
      let m=libres().find(x=>x.nombre&&nrm(x.nombre)===nrm(r.nombre))||libres().find(x=>x.nombre&&r.nombre&&(nrm(x.nombre).startsWith(nrm(r.nombre)+" ")||nrm(r.nombre).startsWith(nrm(x.nombre)+" ")));
      if(!m){ const v=libres().find(x=>!x.nombre); if(v){ m=v; Pm.renombrar(v.id,r.nombre); } }
      r.pamId = m ? m.id : Pm.crear(r.nombre); ch=true;
    });
    const L2=Pm.lista();
    L2.forEach(x=>{ let r=S.personajes.find(y=>y.pamId===x.id);
      if(!r){ r=nuevoPj(x.nombre||"Sin nombre","✨",TONOS[S.personajes.length%TONOS.length]); r.pamId=x.id; S.personajes.push(r); ch=true; }
      const n=x.nombre||"Sin nombre"; if(r.nombre!==n){ r.nombre=n; ch=true; } });
    if(S.personajes.map(r=>r.pamId).join()!==L2.map(x=>x.id).join()){
      S.personajes.sort((a,b)=>L2.findIndex(x=>x.id===a.pamId)-L2.findIndex(x=>x.id===b.pamId)); ch=true; }
    const act=S.personajes.find(r=>r.pamId===Pm.activa());
    if(act && pjSel!==act.id){ pjSel=act.id; sel=true; }
    if(ch) save();
  } finally { sincronizando=false; }
  return ch||sel;
}
window.rrSync = () => { syncPam(); };
window.rrBoveda = {
  get: pamId => { syncPam(); const r=S.personajes.find(x=>x.pamId===pamId); return r ? Object.assign({nombre:r.nombre}, bov(r)) : null; },
  set: (pamId, v) => { syncPam(); const r=S.personajes.find(x=>x.pamId===pamId); if(!r) return false; const b=bov(r);
    ["ini","tot","act","plt","pla"].forEach(k=>{ if(v[k]!==undefined && v[k]!==null && v[k]!=="") b[k]=num(v[k]); });
    ["l1","l2","l3"].forEach(k=>{ if(v[k]) b[k]=v[k]; });
    b.foro = Object.assign({}, b.foro||{}, {leido:v.leido||"", url:v.url||""});
    pjSel=r.id; save(); if(panel.innerHTML) render(); return true; },
  /* canjes (Mi PJ): deja preparado un movimiento de grageas y devuelve sus códigos (lo que sale en «Formulario» y «Código para la bóveda») */
  preparar: (pamId, v) => { syncPam(); const r=S.personajes.find(x=>x.pamId===pamId||x.id===pamId); if(!r) return null; const b=bov(r);
    b.tipo="gr"; ["delta","pet","ace"].forEach(k=>{ if(v[k]!==undefined) b[k]=String(v[k]); });
    pjSel=r.id; save(); if(panel.innerHTML) render(); const {c,form,html}=bovCodesGr(b); return {form, html, c, divisor:divisor()}; },
  /* canjes (Mi PJ): «Ya lo publiqué: actualizar mis números» con los enlaces del canje; devuelve las grageas actuales */
  cerrar: (pamId, v) => { syncPam(); const r=S.personajes.find(x=>x.pamId===pamId||x.id===pamId); if(!r) return null; const bb=bov(r);
    bb.tipo="gr"; ["delta","pet","ace"].forEach(k=>{ if(v && v[k]!==undefined) bb[k]=String(v[k]); });
    const c=bovCalc(bb); if(!c.d) return {act:num(bb.act), sinCambio:true};
    bb.log=bb.log||[]; bb.log.unshift({id:uid(),at:new Date().toISOString(),ini0:num(bb.ini),act0:num(bb.act),tot0:num(bb.tot),ini:c.ini,d:c.d,act:c.act,tot:c.tot,enl:bovEnlaces(bb),pet:String(bb.pet||"").trim(),ace:String(bb.ace||"").trim()}); if(bb.log.length>150)bb.log.length=150;
    bb.ini=c.ini;bb.act=c.act;bb.tot=c.tot;bb.delta="";bb.enl="";bb.pet="";bb.ace="";
    pjSel=r.id; save(); if(panel.innerHTML) render(); return {act:c.act}; }
};
syncPam();
document.addEventListener("pam:pjs",()=>{ if(syncPam() && panel.innerHTML) render(); });
/* Biblioteca de oficiales (Mi PJ) → Posibles oficiales. clave = tema#mensaje del suceso */
const ofClave=u=>{const m=String(u||"").match(/\/t(\d+)[^#\s]*(?:#(\d+))?/);return m?("t"+m[1]+"#"+(m[2]||"")):"";};
function ofPlan(items,estados){
  syncPam();
  const nuevos=[],cambios=[],porClave=new Map(S.oficiales.filter(o=>ofClave(o.enlace)).map(o=>[ofClave(o.enlace),o]));
  (items||[]).forEach(it=>{const k=ofClave(it.enlace);const o=k&&porClave.get(k)||S.oficiales.find(x=>norm(x.nombre)===norm(it.nombre)&&it.nombre);
    if(!o){if(!nuevos.some(n=>ofClave(n.enlace)===k))nuevos.push(it);return;}
    if(it.fav&&!o.fav)cambios.push({o,fav:true});});
  Object.entries(estados||{}).forEach(([k,e])=>{const o=porClave.get(k);if(o&&o.estado!==e&&!cambios.some(c=>c.o===o&&c.estado))cambios.push({o,estado:e,antes:o.estado});});
  return {nuevos,cambios};
}
window.rrOficiales={
  lista:()=>JSON.parse(JSON.stringify(S.oficiales)),
  previa:(items,estados)=>{const p=ofPlan(items,estados);return {nuevos:p.nuevos.map(x=>({nombre:x.nombre,relacion:x.relacion,fav:!!x.fav})),cambios:p.cambios.map(c=>({nombre:c.o.nombre,estado:c.estado||"",antes:c.antes||"",fav:!!c.fav}))};},
  aplicar:(items,estados)=>{
    const p=ofPlan(items,estados);
    if(S.ejemplo){S.oficiales=S.oficiales.filter(o=>!/\(ejemplo\)/i.test(o.nombre));S.ejemplo=false;}
    p.nuevos.forEach(it=>S.oficiales.push({id:uid(),nombre:it.nombre||"",relacion:it.relacion||"",fecha:it.fecha||"",estado:it.estado||"Disponible",enlace:it.enlace||"",fav:!!it.fav}));
    p.cambios.forEach(c=>{if(c.fav)c.o.fav=true;if(c.estado)c.o.estado=c.estado;});
    save();if(panel.innerHTML)render();
    return {nuevos:p.nuevos.length,cambios:p.cambios.length};
  }
};
window.rrGo=t=>{if(t!==tab||!panel.innerHTML)go(t);};window.rrTab=()=>tab;window.rrRender=()=>render();
go(window.__rrStart||"inicio");
setStatus();
})();

montarColoreador(RR, w, { almacen });
}
