// @ts-nocheck
// Mi Ficha, Controlador de stats y Revisor de Empleos (fase 8c): el mismo código que estaba en index.html (copia
// congelada en tests/legado/paginas/revisor.js), como módulo. Lo que cambia, marcado con «8c»:
//   · los datos fijos, la ficha vacía y de ejemplo, y el lector de empleos están en sus archivos (datos.js, modelo.js,
//     empleos.js);
//   · lo que usa de la Tabla de Canjes (el carrito, los precios…) llega por window.pamTabla (TC.…), no por variables
//     compartidas: un módulo no las ve en las pruebas;
//   · guarda con el almacén (js/core/Almacen.js), con las mismas claves y el mismo formato.
// Recibe la ventana: así las pruebas lo montan en una página de prueba junto al antiguo y comparan.
import { RANKS, RANK_SHORT, SKILL_LV, SKILL_NAME, ATTRS, ART, SKILLS, ALL_SKILLS, BG_TYPES, ADVS, cats, SUELDOS, SK_MAP } from './datos.js?v=0.6.9';
import { ETAPAS, ESP_RAMAS, IDIOMA_NIV, VINC, emptyFicha, normFicha, exampleFicha } from './modelo.js?v=0.6.9';
import { A, S, sanador, parseEmpleosDSL } from './empleos.js?v=0.6.9';

/**
 * @param {Window} w la ventana de PAM
 * @param {{ almacen: import('../../core/Almacen.js').Almacen }} o
 */
export function montarRevisor(w, { almacen }) {
/* 8c: lo del navegador sale de la ventana que se recibe (en PAM, la misma); lo de la Tabla de Canjes, de window.pamTabla */
const window = w, document = w.document, navigator = w.navigator, Blob = w.Blob, URL = w.URL, CustomEvent = w.CustomEvent,
  fetch = (...a) => w.fetch(...a), Response = w.Response, DecompressionStream = w.DecompressionStream, Math = w.Math, Date = w.Date,
  setTimeout = (...a) => w.setTimeout(...a), clearTimeout = (...a) => w.clearTimeout(...a), atob = s => w.atob(s), btoa = s => w.btoa(s);
const TC = w.pamTabla || {};

/* ============ Persistencia ============ */
const K_F='revisorEmpleos.ficha', K_J='revisorEmpleos.jobs', K_UI='revisorEmpleos.ui';
/* 8c: con el almacén (js/core/Almacen.js), mismas claves */
function load(k,fb){ const v=almacen.leerTexto(k); try{ return v?JSON.parse(v):fb; }catch(e){ return fb; } }
function save(k,v){ almacen.guardar(k,v); }
let ficha = load(K_F,null) || emptyFicha();
const EMPLEOS_FORO = (()=>{ try{ return parseEmpleosDSL(document.getElementById('empleos-foro').textContent); }catch(e){ console.error(e); return []; } })();

const K_FS='revisorEmpleos.foroVistos';
let jobs = load(K_J,null);
(function(){
  const seen = new Set(load(K_FS,[]));
  if(!jobs){ jobs = JSON.parse(JSON.stringify(EMPLEOS_FORO)); }
  else {
    // quitar el ejemplo antiguo de Sanador si no se tocó
    jobs = jobs.filter(j=>!(j.id==='sanador' && JSON.stringify(j)===JSON.stringify(sanador())));
    const have = new Set(jobs.map(j=>j.id));
    EMPLEOS_FORO.forEach(j=>{ if(!have.has(j.id) && !seen.has(j.id)) jobs.push(JSON.parse(JSON.stringify(j))); });
  }
  save(K_FS, EMPLEOS_FORO.map(j=>j.id).concat([...seen].filter(id=>!EMPLEOS_FORO.some(j=>j.id===id))));
})();
let ui = Object.assign({tab:'empleos', job:null, target:{}, edit:null, q:'', f:''}, load(K_UI,{}));
// normalizar ficha cargada
ficha = normFicha(ficha);
/* ---- varias fichas (una por personaje) ---- */
const K_PJS='grimorio.personajes';
const newPjId=()=>'pj'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
let pjs = load(K_PJS,null);
if(!pjs || !Array.isArray(pjs.lista) || !pjs.lista.length){
  pjs={activa:null, lista:[{id:newPjId(), ficha}]};   // migra la ficha que ya estaba guardada
  pjs.activa=pjs.lista[0].id;
}
pjs.lista.forEach(p=>p.ficha=normFicha(p.ficha));
function pjActivo(){ return pjs.lista.find(p=>p.id===pjs.activa) || pjs.lista[0]; }
ficha = pjActivo().ficha; pjs.activa = pjActivo().id;
function syncPj(){ const p=pjActivo(); if(p) p.ficha=ficha; }
let saveT; function persist(){ clearTimeout(saveT); saveT=setTimeout(()=>{ syncPj(); save(K_PJS,pjs); save(K_F,ficha); save(K_J,jobs); save(K_UI,ui); },150); }
function flushSave(){ clearTimeout(saveT); syncPj(); save(K_PJS,pjs); save(K_F,ficha); save(K_J,jobs); save(K_UI,ui); }

/* ============ Utilidades ============ */
const ROOT = document.getElementById('re-app');
const $ = s => ROOT.querySelector(s);
const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm = s => String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').trim().toLowerCase();
const num = v => { const n=parseFloat(v); return isNaN(n)?0:n; };
const encode = o => btoa(unescape(encodeURIComponent(JSON.stringify(o))));
const decode = s => JSON.parse(decodeURIComponent(escape(atob(s.trim()))));
function toast(m){ const t=$('#toast'); t.textContent=m; t.classList.add('on'); setTimeout(()=>t.classList.remove('on'),1600); }
async function copy(txt){ try{ await navigator.clipboard.writeText(txt); toast('Copiado'); }catch(e){ openDlg('Copia este texto','',txt,null); } }

/* ============ Motor de cálculo ============ */
function valueOf(c){
  if(c.k==='attr') return num(ficha.attrs[c.a]);
  if(c.k==='adv') return num(ficha.adv[c.v]);
  if(c.k==='skill'){
    if(c.s===ART){
      const list = c.sp ? ficha.artes.filter(x=>norm(x.n)===norm(c.sp)) : ficha.artes;
      return list.reduce((m,x)=>Math.max(m,num(x.v)),0);
    }
    return num(ficha.skills[c.s]);
  }
  if(c.k==='bestskill'){
    const vals=[]; (SKILLS[c.a]||[]).forEach(s=>{ if(s===ART) ficha.artes.forEach(x=>vals.push(num(x.v))); else vals.push(num(ficha.skills[s])); });
    vals.sort((a,b)=>b-a); return vals[(c.n||1)-1]||0;
  }
  if(c.k==='arc'){
    return (ficha.arcanos||[]).filter(a=>{
      if(c.type && a.type!==c.type) return false;
      if(c.tier==='tot') return ['bas','int','ava'].includes(a.tier);
      return a.tier===c.tier;
    }).length;
  }
  if(c.k==='bg'){
    let m=0;
    ficha.bgs.forEach(b=>{
      if(norm(b.t)!==norm(c.t)) return;
      if(c.c!=='*' && norm(b.c)!==norm(c.c)) return;
      const e=c.e||'';
      if(e===''){ if(norm(b.e)!=='') return; }
      else if(e==='*'){ if(norm(b.e)==='') return; }
      else if(norm(b.e)!==norm(e)) return;
      m=Math.max(m,num(b.v));
    });
    return m;
  }
  return 0;
}
const need = (c,r) => { let m=0; for(let i=0;i<r;i++) m=Math.max(m,num(c.th[i])); return m; };
function condReach(c){ const v=valueOf(c); let r=0; for(let i=1;i<=5;i++){ if(v>=need(c,i)) r=i; else break; } return r; }
function optReach(o){ return o.length ? Math.min(...o.map(condReach)) : 5; }
function reqReach(q){ return q.opts.length ? Math.max(...q.opts.map(optReach)) : 5; }
function jstate(j){ return ficha.jobState[j.id] || (ficha.jobState[j.id]={roles:0,years:0,checks:{}}); }
const ETAPA_ORD=['Infante','Adolescente','Joven','Adulto','Experimentado','Veterano'];
function autoCheck(c){
  const m=String(c.t||'').match(/^Etapa(?: m[ií]nima)?:?\s*(Infante|Adolescente|Joven|Adulto|Experimentado|Veterano)\.?$/i);
  if(!m) return null;
  const need=ETAPA_ORD.findIndex(x=>norm(x)===norm(m[1])), have=ETAPA_ORD.indexOf(ficha.d&&ficha.d.etapa);
  return have>=0 && have>=need;
}
function checkOK(c,i,st){ const a=autoCheck(c); return a===null ? !!st.checks[i] : a; }
function evaluate(j){
  const st=jstate(j);
  const rows=j.reqs.map(q=>({q,r:reqReach(q)}));
  let lvl = j.reqs.length ? Math.min(5,...rows.map(x=>x.r)) : 0;
  const numLvl=lvl;
  (j.checks||[]).forEach((c,i)=>{ if(!checkOK(c,i,st) && lvl>=c.desde){ lvl=Math.max(0,c.desde-1); } });
  const okM = num(st.roles)>=8 || num(st.years)>=1, okL = num(st.roles)>=24 || num(st.years)>=3;
  if(lvl>=4 && !okM) lvl=3;
  if(lvl>=5 && !okL) lvl=4;
  return {lvl,numLvl,rows,okM,okL,st};
}
function missingFor(j,ev,r){
  const out=[];
  ev.rows.forEach(({q,r:qr})=>{
    if(qr>=r) return;
    // escoger la alternativa con menor déficit total
    let best=null;
    q.opts.forEach(o=>{
      const items=o.map(c=>({c,v:valueOf(c),n:need(c,r)})).filter(x=>x.v<x.n);
      const tot=items.reduce((s,x)=>s+(x.n-x.v),0);
      if(!best||tot<best.tot) best={items,tot};
    });
    best && best.items.forEach(x=>out.push({kind:kindName(x.c),label:condLabel(x.c),have:x.v,need:x.n,c:x.c,alt:q.opts.length>1}));
  });
  (j.checks||[]).forEach((c,i)=>{ if(!checkOK(c,i,ev.st) && c.desde<=r) out.push({kind:autoCheck(c)===null?'Manual':'Ficha',label:c.t,manual:true}); });
  if(r>=4 && !ev.okM) out.push({kind:'Antigüedad',label:'1 año ininterrumpido en el puesto u 8 roles de empleo cobrados',manual:true});
  if(r>=5 && !ev.okL) out.push({kind:'Antigüedad',label:'3 años ininterrumpidos en el puesto o 24 roles de empleo cobrados',manual:true});
  return out;
}

/* ---- Empleo → Tabla de Canjes: arma las subidas que faltan con su precio ---- */
function planCanjes(miss){
  const items=[], skip=[], RN=['0','I','II','III','IV','V','VI'];
  const dentroCarrito = (kind,name,to) => typeof TC.state!=='undefined' && TC.state.cart.some(i=>i.meta&&i.meta.kind===kind&&i.meta.name===name&&num(i.meta.to)>=to);
  const grupoDe = sk => Object.keys(TC.SKILL_GROUPS).find(g=>TC.SKILL_GROUPS[g].includes(sk)) || '';
  miss.forEach(m=>{
    if(m.manual || !m.c) return;
    const c=m.c, a=num(m.have), t=num(m.need);
    if(t<=a) return;
    if(c.k==='attr'){
      if(dentroCarrito('stat',c.a,t)) return;
      const cost=TC.costoSubida(TC.STAT_ACUM,a,t), pl=(t===8&&a<8)?17:0;
      items.push({cat:'ESTADÍSTICAS', line:`${c.a}: ${a} → ${t} — ${TC.precioTexto(cost,pl)}${pl?' (Atributo Legendario)':''}`, cost, pl,
        meta:{kind:'stat', name:c.a, from:a, to:t, notes:TC.statNotes(c.a,a,t)}, set:()=>{ TC.state.statsBase[c.a]=t; TC.state.statsTarget[c.a]=Math.min(t+1,8); }, txt:`${c.a} ${a} → ${t}`});
      return;
    }
    if(c.k==='skill' || c.k==='bestskill'){
      let sk = c.s;
      if(c.k==='bestskill'){                                   /* sube la habilidad del atributo que tenés más alta */
        const cand=(SKILLS[c.a]||[]).filter(x=>x!==ART).map(x=>({x,v:num(ficha.skills[x])})).sort((p,q)=>q.v-p.v);
        const e=cand[(c.n||1)-1]; if(!e){ skip.push(m.label); return; } sk=e.x;
      }
      if(sk===ART){ skip.push(m.label+' (elegí cuál en Habilidades › Arte/Artesanía)'); return; }
      const name = SK_BACK[sk] || sk;
      if(!(name in TC.state.skillsBase)){ skip.push(m.label); return; }
      if(dentroCarrito('skill',name,t)) return;
      const cost=TC.costoSubida(TC.SKILL_ACUM,a,t), pl=(t===5&&a<5)?7:0;
      items.push({cat:'HABILIDADES', line:`${name}: ${TC.SKILL_LVL[a]} → ${TC.SKILL_LVL[t]} — ${TC.precioTexto(cost,pl)}${pl?' (Habilidad Legendaria)':''}`, cost, pl,
        meta:{kind:'skill', name, from:a, to:t, notes:TC.skillNotes(grupoDe(name),a,t)}, set:()=>{ TC.state.skillsBase[name]=t; TC.state.skillsTarget[name]=Math.min(t+1,5); }, txt:`${name} ${TC.SKILL_LVL[a]} → ${TC.SKILL_LVL[t]}`});
      return;
    }
    if(c.k==='adv'){
      if(!(c.v in TC.state.ventBase) || t>3){ skip.push(m.label); return; }
      if(dentroCarrito('vent',c.v,t)) return;
      const cost=TC.costoSubida(TC.VENT_ACUM,a,t);
      items.push({cat:'VENTAJAS', line:`${c.v}: ${TC.VENT_LABELS[c.v][a]} → ${TC.VENT_LABELS[c.v][t]} — ${TC.fmt(cost)} grageas`, cost, pl:0,
        meta:{kind:'vent', name:c.v, from:a, to:t}, set:()=>{ TC.state.ventBase[c.v]=t; TC.state.ventTarget[c.v]=Math.min(t+1,3); }, txt:`${c.v} ${a} → ${t}`});
      return;
    }
    if(c.k==='bg'){
      let cat=c.c, esp=c.e||'';
      if(cat==='*' || esp==='*'){                              /* «cualquier categoría»: usa el que ya tenés más alto */
        const mine=ficha.bgs.filter(b=>norm(b.t)===norm(c.t) && (cat==='*'||norm(b.c)===norm(cat)) && (esp==='*'?!!b.e:!b.e)).sort((p,q)=>num(q.v)-num(p.v))[0];
        if(!mine){ skip.push(m.label+' (elegí la categoría en Trasfondos y Ventajas)'); return; }
        cat=mine.c; esp=esp?mine.e:'';
      }
      const nombre = esp ? `${c.t} ${cat} > ${esp}` : `${c.t} ${cat}`;
      if(dentroCarrito('trasf',nombre,t)) return;
      const cost=TC.costoSubida(esp?TC.TESP_ACUM:TC.TGEN_ACUM,a,t);
      items.push({cat:'TRASFONDOS', line:`${nombre}: ${RN[a]} → ${RN[t]} — ${TC.fmt(cost)} grageas`, cost, pl:0,
        meta:{kind:'trasf', name:nombre, tipo:c.t, cat, esp, to:t}, set:()=>{}, txt:`${nombre} ${RN[a]} → ${RN[t]}`});
      return;
    }
    if(c.k==='arc'){ skip.push(m.label+' (elegí cuáles en el Compendio Arcano)'); return; }
    skip.push(m.label);
  });
  return {items, skip, cost:items.reduce((x,i)=>x+i.cost,0), pl:items.reduce((x,i)=>x+i.pl,0)};
}
function llevarACanjes(j, tg, miss){
  if(typeof TC.state==='undefined' || typeof TC.addToCart!=='function'){ toast('No encuentro la Tabla de Canjes'); return; }
  const P=planCanjes(miss);
  if(!P.items.length){ toast(P.skip.length ? 'Lo que falta no se puede canjear directo: '+P.skip.join(' · ') : 'Ya está todo en el carrito'); return; }
  P.items.forEach(it=>{ TC.addToCart(it.cat, it.line, it.cost, it.pl, null, Object.assign({empleo:`${j.nombre} (${RANKS[tg]})`}, it.meta)); it.set(); });
  if(typeof TC.renderAll==='function') TC.renderAll();
  if(window.showSection) window.showSection('canjes');
  try{ if(typeof TC.activateTab==='function') TC.activateTab('carrito'); }catch(e){}
  const extra = P.skip.length ? ` Falta elegir a mano: ${P.skip.join(' · ')}.` : '';
  setTimeout(()=>alertaCanjes(`Agregué al carrito ${P.items.length} subida${P.items.length>1?'s':''} para ${j.nombre} (${RANKS[tg]}): ${TC.fmt(P.cost)} grageas${P.pl?` y ${P.pl} PL`:''}.${extra}`), 60);
}
function alertaCanjes(msg){
  let el=document.getElementById('canjesAviso');
  const host=document.getElementById('sec-canjes'); if(!host) return;
  if(!el){ el=document.createElement('div'); el.id='canjesAviso'; el.className='canjes-aviso'; host.insertBefore(el, host.querySelector('.tabs')); }
  el.innerHTML=`<span>${esc(msg)}</span><button aria-label="Cerrar aviso">✕</button>`;
  el.querySelector('button').onclick=()=>el.remove();
}
function kindName(c){ return {attr:'Atributo',skill:'Habilidad',bestskill:'Habilidad',bg:'Trasfondo',adv:'Ventaja',arc:'Arcanos'}[c.k]||''; }
const ARC_TIER={bas:'básicos',int:'intermedios',ava:'avanzados',tot:'totales'};
const ARC_TYPE={'':'',hechizo:'hechizos',pocion:'pociones',ritual:'rituales',objeto:'objetos'};
function condLabel(c){
  if(c.k==='attr') return c.a;
  if(c.k==='adv') return c.v;
  if(c.k==='skill') return c.s===ART ? (c.sp?`Arte/Artesanía (${c.sp})`:'Arte/Artesanía (cualquiera)') : c.s;
  if(c.k==='bestskill') return (c.n>1?`${c.n}ª mejor habilidad de ${c.a}`:`Mejor habilidad de ${c.a}`);
  if(c.k==='arc') return `${c.type?ARC_TYPE[c.type][0].toUpperCase()+ARC_TYPE[c.type].slice(1):'Arcanos'} ${ARC_TIER[c.tier]||c.tier}`;
  if(c.k==='bg'){ const cat=c.c==='*'?'cualquier categoría':c.c; const e=c.e==='*'?'cualquier específica':c.e; return `${c.t} · ${cat}${e?' > '+e:''}`; }
  return '';
}
const isSkill = c => c.k==='skill'||c.k==='bestskill';
const fmtVal = (c,v) => isSkill(c) ? `${SKILL_NAME[v]||v}` : String(v);
const reqLabel = q => q.opts.map(o=>o.map(condLabel).join(' + ')).join('  ó  ');

/* ============ Tabs ============ */
ROOT.querySelectorAll('nav.re-tabs button').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
$('#jl-q').oninput=e=>{ ui.q=e.target.value; persist(); renderEmpleos(); };
$('#jl-f').onchange=e=>{ ui.f=e.target.value; persist(); renderEmpleos(); };
function setTab(t){
  ui.tab=t; persist();
  ROOT.querySelectorAll('nav.re-tabs button').forEach(b=>b.setAttribute('aria-selected',b.dataset.tab===t));
  ROOT.querySelectorAll('.re-panel').forEach(p=>p.classList.toggle('on',p.id==='p-'+t));
  if(t==='empleos') renderEmpleos();
  if(t==='editor') renderEditor();
  if(t==='control'){ ctrlRes=null; renderControl(); }
}
function renderWho(){ $('#who').innerHTML = ficha.nombre ? `Ficha cargada: <b>${esc(ficha.nombre)}</b>` : 'Sin ficha cargada'; }

/* ============ Panel: Empleos ============ */
function renderEmpleos(){
  renderWho();
  if(!jobs.length){ $('#joblist').innerHTML=''; $('#jobdetail').innerHTML='<div class="card empty">No hay empleos. Crea uno en el Editor de empleos.</div>'; return; }
  if(!jobs.find(j=>j.id===ui.job)) ui.job=jobs[0].id;
  const qv=$('#jl-q'), fv=$('#jl-f');
  if(qv.value!==ui.q) qv.value=ui.q||''; fv.value=ui.f||'';
  const q=norm(ui.q);
  let lastG=null, shown=0;
  const html = jobs.map(j=>{
    if(q && !norm(j.nombre+' '+(j.grupo||'')).includes(q)) return '';
    if(ui.f==='foro' && j.fuente!=='foro') return '';
    if(ui.f==='mios' && j.fuente==='foro') return '';
    const ev=evaluate(j);
    if(ui.f==='ok' && ev.numLvl<1) return '';
    const nx=Math.min(5,ev.lvl+1);
    const miss = ev.lvl<5 ? missingFor(j,ev,nx).length : 0;
    const g=j.grupo||'Mis empleos'; let head='';
    if(g!==lastG){ head=`<div class="jl-group">${esc(g)}</div>`; lastG=g; }
    shown++;
    return head+`<button class="jobbtn" data-id="${esc(j.id)}" aria-current="${j.id===ui.job}">
      <span class="row"><span class="n">${esc(j.nombre||'Sin nombre')}</span><span class="spacer"></span><span class="badge r${ev.lvl}">${RANKS[ev.lvl]}</span></span>
      <span class="s">${ev.lvl>=5?'Nivel máximo alcanzado':`Para ${RANKS[nx]}: falta${miss===1?'':'n'} ${miss} requisito${miss===1?'':'s'}`}</span>
    </button>`;
  }).join('');
  $('#joblist').innerHTML = html || '<div class="muted small" style="padding:8px">Ningún empleo coincide.</div>';
  $('#jl-count').textContent = `${shown} de ${jobs.length} empleos`;
  ROOT.querySelectorAll('.jobbtn').forEach(b=>b.onclick=()=>{ ui.job=b.dataset.id; persist(); renderEmpleos(); });
  renderJob(jobs.find(j=>j.id===ui.job));
}
function renderJob(j){
  if(!j){ $('#jobdetail').innerHTML=''; return; }
  const ev=evaluate(j);
  let tg = ui.target[j.id]; if(!tg || tg<=0) tg=Math.min(5,ev.lvl+1); if(ev.lvl>=5) tg=5;
  const miss = missingFor(j,ev,tg);
  const pay = SUELDOS[j.sueldo];
  const st=ev.st;
  let h = `<div class="card">
    <div class="row"><h2 style="margin:0">${esc(j.nombre||'Sin nombre')}</h2><span class="badge r${ev.lvl}">${RANKS[ev.lvl]}</span><span class="spacer"></span>
      <button class="btn sm" id="j-copy">Copiar resumen</button></div>
    ${ev.numLvl>ev.lvl?`<div class="small" style="margin-top:6px">Por tus números llegas a <b>${RANKS[ev.numLvl]}</b>; te frenan los requisitos de abajo que se marcan a mano o la antigüedad.</div>`:''}
    ${j.grupo?`<div class="grp" style="margin-top:4px">${esc(j.grupo)}</div>`:''}
    <div class="muted small" style="margin-top:4px">${j.sueldo?`Sueldo ${esc(j.sueldo)}`:'Sueldo sin definir'}${j.unico?' · Puesto único':''}</div>
    ${j.desc?`<p class="jobdesc">${esc(j.desc)}</p>`:''}
    ${j.notas?`<p class="jobnotes">${esc(j.notas)}</p>`:''}
    <div class="ladder">${[1,2,3,4,5].map(r=>`<div class="step ${r<=ev.lvl?'got':''} ${r===tg?'target':''}" data-r="${r}" role="button" tabindex="0">
      <div class="t">${RANKS[r]}</div><div class="p">${pay?pay[r-1]+' grageas':'&nbsp;'}</div></div>`).join('')}</div>
    <h3 style="margin-top:14px">${ev.lvl>=tg?`Ya cumples ${RANKS[tg]}`:`Para ${RANKS[tg]} te falta${miss.length===1?'':'n'} ${miss.length} requisito${miss.length===1?'':'s'}`}</h3>
    ${ev.lvl>=tg ? `<div class="allgood">Tienes todo lo necesario para ${RANKS[tg]}${tg<5?'. Toca un nivel más alto para ver qué sigue.':'.'}</div>` :
      `<ul class="missing">${miss.map(m=>`<li><span class="k">${esc(m.kind)}</span><span>${esc(m.label)}${m.alt?' <span class="alt">(la opción más cercana)</span>':''}</span>
        <span class="d">${m.manual?(m.kind==='Ficha'?'Según tu etapa':'Marcar a mano'):`${esc(fmtVal(m.c,m.have))} → ${esc(fmtVal(m.c,m.need))} (+${m.need-m.have})`}</span></li>`).join('')}</ul>`
      + (()=>{ const pl=planCanjes(miss); return pl.items.length ? `<div class="to-canjes"><button class="btn" id="j-tocanjes">Llevar a la Tabla de Canjes</button><span class="small muted">Suma al carrito ${pl.items.length} subida${pl.items.length>1?'s':''}: <b>${TC.fmt(pl.cost)} grageas</b>${pl.pl?` y ${pl.pl} PL`:''}.${pl.skip.length?` Lo demás (${esc(pl.skip.join(' · '))}) se elige a mano.`:''}</span></div>` : (pl.skip.length ? `<div class="to-canjes"><span class="small muted">Lo que falta no se canjea directo desde acá: ${esc(pl.skip.join(' · '))}.</span></div>` : ''); })()}
  </div>`;
  // checks + antigüedad
  h += `<div class="card"><h3>Requisitos que se marcan a mano</h3><div class="checks">
    ${(j.checks||[]).map((c,i)=>{ const a=autoCheck(c); return a===null
      ? `<label><input type="checkbox" data-ck="${i}" ${st.checks[i]?'checked':''}><span>${esc(c.t)} <span class="muted small">(desde ${RANKS[c.desde]})</span></span></label>`
      : `<label><input type="checkbox" disabled ${a?'checked':''}><span>${esc(c.t)} <span class="muted small">(automático: tu ficha dice ${esc(ficha.d.etapa||'sin etapa')})</span></span></label>`; }).join('') || '<p class="muted small" style="margin:0">Este empleo no tiene requisitos manuales.</p>'}
    </div>
    <div class="seniority"><b class="small">Antigüedad (Maestro y Legendario)</b>
      <label class="small">Roles de empleo cobrados <input type="number" min="0" id="j-roles" value="${num(st.roles)}"></label>
      <label class="small">Años ininterrumpidos <input type="number" min="0" id="j-years" value="${num(st.years)}"></label>
    </div></div>`;
  // tabla
  h += `<div class="card"><h3>Todos los requisitos</h3><div class="tablewrap"><table class="req">
    <thead><tr><th class="l">Requisito</th><th>Tienes</th>${[1,2,3,4,5].map(r=>`<th>${RANK_SHORT[r]}</th>`).join('')}<th>Alcanzas</th></tr></thead><tbody>
    ${ev.rows.map(({q,r})=>{
      // usar la mejor opción para mostrar
      let bo=q.opts[0], br=-1; q.opts.forEach(o=>{ const x=optReach(o); if(x>br){br=x;bo=o;} });
      return bo.map((c,ci)=>{ const v=valueOf(c); const cr=condReach(c);
        return `<tr>
        <td class="l"><span class="kind">${kindName(c)}</span>${esc(condLabel(c))}${ci===0&&q.opts.length>1?`<div class="alt">Alternativas: ${esc(reqLabel(q))}</div>`:''}</td>
        <td class="c"><b>${esc(fmtVal(c,v))}</b></td>
        ${[1,2,3,4,5].map(i=>`<td class="c ${v>=need(c,i)?'ok':'no'} ${i===tg?'tg':''}">${num(c.th[i-1])}</td>`).join('')}
        <td><span class="badge r${cr}">${RANKS[cr]}</span></td></tr>`; }).join('');
    }).join('') || `<tr><td colspan="8" class="empty">Este empleo no tiene requisitos cargados.</td></tr>`}
    </tbody></table></div></div>`;
  $('#jobdetail').innerHTML=h;
  ROOT.querySelectorAll('.step').forEach(s=>{ const go=()=>{ ui.target[j.id]=+s.dataset.r; persist(); renderJob(j); }; s.onclick=go; s.onkeydown=e=>{ if(e.key==='Enter'||e.key===' '){e.preventDefault();go();} }; });
  ROOT.querySelectorAll('[data-ck]').forEach(c=>c.onchange=()=>{ st.checks[c.dataset.ck]=c.checked; persist(); renderEmpleos(); });
  $('#j-roles').onchange=e=>{ st.roles=num(e.target.value); persist(); renderEmpleos(); };
  $('#j-years').onchange=e=>{ st.years=num(e.target.value); persist(); renderEmpleos(); };
  const tcb=$('#j-tocanjes'); if(tcb) tcb.onclick=()=>llevarACanjes(j,tg,miss);
  $('#j-copy').onclick=()=>{
    let t=`[b]${j.nombre}[/b] — nivel alcanzado: [b]${RANKS[ev.lvl]}[/b]${ficha.nombre?` (${ficha.nombre})`:''}\n`;
    if(ev.lvl>=tg) t+=`Cumplo todos los requisitos de ${RANKS[tg]}.`;
    else { t+=`Para [b]${RANKS[tg]}[/b] me falta:\n`; t+=miss.map(m=>`• ${m.label}${m.manual?'':`: ${fmtVal(m.c,m.have)} → ${fmtVal(m.c,m.need)} (+${m.need-m.have})`}`).join('\n'); }
    copy(t);
  };
}

/* ============ Panel: Ficha ============ */
const BONUS = [0,1,2,4,7,9];
const LV_IDX = v => Math.min(4, num(v));             // 1 Novato … 4 Maestro (para Herbivicus, etc.)
let fichaTab = almacen.leerTexto('grimorio.fichaTab') || 'datos'; /* 8c: con el almacén (texto suelto, como antes) */
function opts(list,sel){ return list.map(x=>`<option ${x===sel?'selected':''}>${esc(x)}</option>`).join(''); }
function lvOpts(sel,max=5){ return SKILL_LV.slice(0,max+1).map((x,i)=>`<option value="${i}" ${+sel===i?'selected':''}>${x}</option>`).join(''); }
const getP = p => p==='nombre' ? ficha.nombre : p.split('.').reduce((o,k)=>o?o[k]:'', ficha);
function setP(p,v){ if(p==='nombre'){ ficha.nombre=v; return; } const ks=p.split('.'); let o=ficha; ks.slice(0,-1).forEach(k=>o=o[k]); o[ks[ks.length-1]]=v; }
const SIN_ETAPA = {pa:0,u:0,h:0,lim:'',none:true};
const etapaOf = () => ETAPAS[ficha.d.etapa] || SIN_ETAPA;
const hasArc = n => ficha.arcanos.some(a=>norm(a.name)===norm(n));
const sk = s => num(ficha.skills[s]);

/* ---- cálculos de combate y puntos ---- */
/* Reglas del Sistema Avadense + Calculadora de Stats de Combate (raza, objetos y pociones de escena) */
let combOpt = {warlock:null, herbivicus:null, fuerza:0, actividad:false, lic:false};
function modsFicha(){
  const r = norm(ficha.d.raza||'').replace(/[^a-z]/g,'');
  return { semiD:r.includes('semiduend'), semiG:r.includes('semigigant'),
    carstein:hasArc('Anillo de los Carstein'), warlockObj:hasArc('Armadura de Warlock'),
    maletin:hasArc('Maletín del pocionista inquieto'), bisu:hasArc('Bisutería Arcana'), herbiObj:hasArc('Herbivicus'),
    herbicida:hasArc('Poción herbicida'), vitae:hasArc('Planta Vitae'), solucion:hasArc('Solución del ritualista'), altar:hasArc('Altar del ritualista') };
}
function combate(opt){
  opt = Object.assign({}, opt===undefined ? {warlock:combOpt.warlock} : opt);
  const A=ficha.attrs, E=etapaOf(), b=s=>BONUS[sk(s)]||0, M=modsFicha();
  const warl = (opt.warlock===null||opt.warlock===undefined) ? false : !!opt.warlock && M.warlockObj;
  const fz = num(opt.fuerza), act = opt.actividad?1:0, L4 = opt.lic?4:0;
  const P=num(A['Percepción']), V=num(A.Vigor)+fz, D=num(A.Destreza), W=num(A.Voluntad), Po=num(A.Poder);
  const vUmb = M.semiD ? Math.floor(V/2) : V;
  const vPA = M.carstein ? 0 : vUmb*(M.semiG?3:1);
  const extra = (n,l) => n ? ` ${n>0?'+':'−'} ${Math.abs(n)} (${l})` : '';
  const ini = P + b('Iniciativa') + L4 - (warl?2:0) + act;
  const atkF = V + b('Pelea') + L4 + (M.semiG?2:0);
  const def = 5 + D + b('Esquiva') + L4 - (warl?2:0) + act;
  const atkM = Po + b('Duelo');
  const r = x => Math.round(x);
  const luchaFx = (atkF + def - 5 + ini)/3, luchaMx = (atkM + def - 5 + ini)/3;
  const pa = (E.pa + vPA + W) * (opt.lic?2:1), umbral = E.u + vUmb + L4, heridas = E.h + W + (opt.lic?2:0);
  const vigTxt = fz ? `Vigor (${num(A.Vigor)} + ${fz} poción)` : `Vigor (${num(A.Vigor)})`;
  const t = {
    ini: `Percepción (${P}) + Iniciativa (${b('Iniciativa')})` + extra(-(warl?2:0),'Armadura de Warlock') + extra(act,'Poción de actividad') + extra(L4,'Licantropía'),
    atkF: `${vigTxt} + Pelea (${b('Pelea')})` + extra(M.semiG?2:0,'Semigigante') + extra(L4,'Licantropía'),
    luchaF: `(Ataque Físico (${atkF}) + Defensa (${def}) - 5 + Iniciativa (${ini})) / 3`,
    atkM: `Poder (${Po}) + Duelo (${b('Duelo')})`,
    luchaM: `(Ataque Mágico (${atkM}) + Defensa (${def}) - 5 + Iniciativa (${ini})) / 3`,
    def: `5 + Destreza (${D}) + Esquiva (${b('Esquiva')})` + extra(-(warl?2:0),'Armadura de Warlock') + extra(act,'Poción de actividad') + extra(L4,'Licantropía'),
    pa: (opt.lic?'(':'') + (E.none ? 'Base (sin etapa) + ' : `Base (${E.pa}) + `) + (M.carstein ? `Vigor (0, Anillo de los Carstein)` : M.semiG ? `Vigor × 3 (${vPA}, Semigigante)` : M.semiD ? `Vigor ÷ 2 (${vPA}, Semiduende)` : vigTxt) + ` + Voluntad (${W})` + (opt.lic?') × 2 (Licantropía)':''),
    umbral: (E.none ? 'Base (sin etapa) + ' : `Base (${E.u}) + `) + (M.semiD ? `Vigor ÷ 2 (${vUmb}, Semiduende)` : vigTxt) + extra(L4,'Licantropía'),
    heridas: (E.none ? 'Base (sin etapa)' : `Base (${E.h})`) + ` + Voluntad (${W})` + extra(opt.lic?2:0,'Licantropía')
  };
  return { ini, atkF, def, atkM, luchaF:r(luchaFx), luchaM:r(luchaMx), luchaFx, luchaMx, pa, umbral, heridas, E, t, M, warl };
}
function puntos(opt){
  opt = Object.assign({herbivicus:combOpt.herbivicus}, opt||{});
  const M=modsFicha();
  const P=num(ficha.attrs.Poder), bp=BONUS[sk('Pociones')]||0, br=BONUS[sk('Rituales')]||0;
  let pp = P + bp, ppTxt = [`Poder (${P})`, `Pociones (${bp})`];
  if(M.maletin){ pp *= 2; ppTxt = [`(${ppTxt.join(' + ')}) × 2 (Maletín del pocionista inquieto)`]; }
  const herb = LV_IDX(sk('Herbología')), rit = LV_IDX(sk('Rituales'));
  const herbiOn = M.herbiObj && (opt.herbivicus===null||opt.herbivicus===undefined ? true : !!opt.herbivicus);
  if(herbiOn && herb){ pp += herb; ppTxt.push(`${herb} (Herbivicus)`); }
  if(M.herbicida && herb){ pp += herb; ppTxt.push(`${herb} (Poción Herbicida)`); }
  if(M.vitae && rit){ pp += rit; ppTxt.push(`${rit} (Planta Vitae)`); }
  let pr = P + br, prTxt = [`Poder (${P})`, `Rituales (${br})`];
  if(M.bisu){ pr = P + br*2; prTxt = [`Poder (${P})`, `Rituales (${br}) × 2 (Bisutería Arcana)`]; }
  if(M.solucion && bp){ pr += bp; prTxt.push(`${bp} (Solución del ritualista)`); }
  const art = LV_IDX(ficha.artes.reduce((m,x)=>Math.max(m,num(x.v)),0));
  if(M.altar && art){ pr += art; prTxt.push(`${art} (Altar del ritualista)`); }
  return {pp, ppTxt:ppTxt.join(' + '), pr, prTxt:prTxt.join(' + ')};
}

/* ---- para Mi PJ (script del foro): cada ficha con sus stats ya calculados ---- */
window.pamRapido = function(){
  const prev = ficha, RN = ['','I','II','III','IV','V'];
  const uno = p => {
    ficha = p.ficha;
    try{
      const c = combate({warlock:combOpt.warlock}), q = puntos(), E = etapaOf();
      const comb = {Iniciativa:c.ini, 'Ataque Físico':c.atkF, 'Ataque Mágico':c.atkM, Defensa:c.def, 'Lucha Física':c.luchaF, 'Lucha Mágica':c.luchaM};
      if(!E.none){ comb.PAs = c.pa; comb['Umbral de heridas'] = c.umbral; comb.Heridas = c.heridas; }
      const skills = {}; ALL_SKILLS.filter(x=>x!==ART).forEach(x=>{ skills[x] = num(ficha.skills[x]); });
      return { id:p.id, nombre:(ficha.nombre||'').trim(), raza:ficha.d.raza||'', etapa:ficha.d.etapa||'',
        attrs: Object.fromEntries(ATTRS.map(a=>[a, num(ficha.attrs[a])])), skills,
        artes: (ficha.artes||[]).filter(x=>x && x.n).map(x=>({n:x.n, nv:num(x.v)})),
        combate: comb, puntos: {pociones:q.pp, rituales:q.pr, destino:num(ficha.extra && ficha.extra.pd)},
        trasf: (ficha.bgs||[]).filter(b=>b && b.t && num(b.v)).map(b=>({t:[b.t,b.c,b.e].filter(Boolean).join(' › '), v:RN[num(b.v)]||String(b.v), nota:b.nota||'', esp:!!b.e})),
        bgs: (ficha.bgs||[]).filter(b=>b && b.t && num(b.v)).map(b=>({t:b.t, c:b.c||'', e:b.e||'', v:num(b.v), nota:b.nota||''})),
        adv: Object.fromEntries(ADVS.map(a=>[a, num(ficha.adv && ficha.adv[a])])) };
    } finally { ficha = prev; }
  };
  try { return { v:1, activa:pjs.activa, lista:pjs.lista.map(uno) }; } finally { ficha = prev; }
};
/* ---- cabecera ---- */
function renderHead(){
  renderWho();
  document.dispatchEvent(new CustomEvent('pam:pjs'));
  const x=ficha.extra;
  $('#fx-photo').innerHTML = x.foto ? `<img src="${esc(x.foto)}" alt="">` : '<span>✦</span>';
  $('#fx-kicker-v').textContent = x.kicker || '';
  $('#fx-name-v').textContent = ficha.nombre || 'Sin nombre';
  const sub = [x.ocupacion, ficha.d.casa, ficha.d.edad ? ficha.d.edad+' años' : '', ficha.d.etapa].filter(Boolean);
  $('#fx-sub-v').textContent = sub.join(' ‧ ');
}

/* ---- pestañas de la ficha ---- */
function renderFicha(){ setTimeout(pintarPjs,0); return renderFicha_(); }
function renderFicha_(){
  renderHead();
  ROOT.querySelectorAll('#fx-tabs button').forEach(b=>b.classList.toggle('on', b.dataset.ft===fichaTab));
  const body=$('#fx-body');
  const R = {datos:renderDatos, desc:renderDesc, caract:renderCaract, magia:renderMagia, otros:renderOtros, codigo:renderCodigo}[fichaTab] || renderDatos;
  body.innerHTML = R();
  bindFicha(body);
  if(fichaTab==='caract') refreshCalc();
  if(fichaTab==='otros') renderBgs();
  if(fichaTab==='codigo') bindCodigo(body);
}
ROOT.querySelectorAll('#fx-tabs button').forEach(b=>b.onclick=()=>{ fichaTab=b.dataset.ft; almacen.guardarTexto('grimorio.fichaTab',fichaTab); renderFicha(); });

const fld = (p,label,o={}) => `<label class="fx-f${o.wide?' wide':''}"><span>${label}</span>${o.area
  ? `<textarea class="ft" data-p="${p}" rows="${o.rows||4}" placeholder="${esc(o.ph||'')}">${esc(getP(p))}</textarea>`
  : `<input type="text" data-p="${p}" value="${esc(getP(p))}" placeholder="${esc(o.ph||'')}">`}</label>`;

function renderDatos(){
  return `<div class="card"><h2>Cabecera</h2>
      <p class="muted small" style="margin-top:-4px">Lo que se ve arriba de la ficha. Son opcionales.</p>
      <div class="fx-grid">${fld('extra.ocupacion','Ocupación / cargo',{ph:'Ej.: Sanadora en San Mungo'})}${fld('extra.kicker','Nombre en su idioma / apodo',{ph:'Ej.: 박하나'})}${fld('extra.foto','URL de la imagen',{ph:'https://…',wide:true})}</div></div>
    <div class="card"><h2>Datos</h2>
      <div class="fx-grid">
        ${fld('nombre','Nombre y Apellido')}${fld('d.avatar','Avatar / PB')}${fld('d.multicuenta','Multicuenta',{wide:true})}
        <div class="fx-sep"></div>
        ${fld('d.nacimiento','Lugar de Nacimiento')}${fld('d.residencia','Lugar de Residencia')}${fld('d.clase','Clase Social')}
        <div class="fx-sep"></div>
        ${fld('d.fechaNac','Fecha de Nacimiento',{ph:'dd/mm/aaaa'})}${fld('d.edad','Edad')}
        <label class="fx-f"><span>Etapa</span><select data-p="d.etapa"><option value="" ${ficha.d.etapa?'':'selected'}>Sin etapa</option>${opts(Object.keys(ETAPAS),ficha.d.etapa)}</select></label>
        <div class="fx-sep"></div>
        ${fld('d.orientacion','Orientación Sexual')}${fld('d.sangre','Tipo de Sangre')}${fld('d.raza','Raza')}
        <div class="fx-sep"></div>
        ${fld('d.casa','Casa')}${fld('d.curso','Curso')}${fld('d.faccion','Facción')}${fld('d.quidditch','Equipo de Quidditch',{wide:true})}
      </div></div>`;
}
function renderDesc(){
  return `<div class="card"><h2>Descripción</h2><div class="fx-grid one">
      ${fld('desc.fisica','Descripción Física',{area:1,rows:5})}${fld('desc.psico','Descripción Psicológica',{area:1,rows:5})}
    </div><div class="fx-grid">
      ${fld('desc.fuerte','Punto Fuerte',{area:1,rows:2})}${fld('desc.debil','Punto Débil',{area:1,rows:2})}
      ${fld('desc.gustos','Gustos / Aficiones',{area:1,rows:2})}${fld('desc.fobias','Fobias / manías',{area:1,rows:2})}
    </div><div class="fx-grid one">
      ${fld('desc.historia','Historia',{area:1,rows:12})}${fld('desc.familia','Familia',{area:1,rows:5,ph:'Nombre — Parentesco — Ocupación'})}${fld('desc.mascota','Mascota')}
    </div></div>`;
}
function renderCaract(){
  const E=etapaOf();
  return `<div class="card"><div class="row"><h2 style="margin:0">Atributos</h2><span class="spacer"></span>
      <label class="fx-f inline"><span>Límites</span><input type="text" data-p="extra.limites" value="${esc(ficha.extra.limites)}" placeholder="${esc(E.lim||'Ej.: Cuatro al 4')}" style="width:220px"></label></div>
      <div class="grid-attrs" style="margin-top:10px">${ATTRS.map(a=>`<div class="attr"><label for="at-${a}">${a}</label><input type="number" min="0" max="9" id="at-${a}" data-at="${a}" value="${num(ficha.attrs[a])}"></div>`).join('')}</div></div>
    <div class="card"><h2>Habilidades</h2>
      <p class="muted small" style="margin-top:-4px">Desentrenado (+0) · Novato (+1) · Competente (+2) · Experto (+4) · Maestro (+7) · Legendario (+9)</p>
      <div class="grid-skills">${ATTRS.map(a=>`<div class="sgroup"><h4>${a}</h4>${SKILLS[a].map(s=>{
        if(s===ART) return ficha.artes.map((x,i)=>`<div class="skill art"><input type="text" data-artn="${i}" value="${esc(x.n)}" placeholder="Arte/Artesanía (cuál)"><select data-artv="${i}">${lvOpts(x.v)}</select><button class="btn sm ghost danger" data-artx="${i}" aria-label="Quitar">×</button></div>`).join('')
          + `<div class="skill"><span class="muted small">Arte / Artesanía</span><button class="btn sm" id="f-addart">+ Añadir</button></div>`;
        return `<div class="skill"><label for="sk-${s}">${s}</label><select id="sk-${s}" data-sk="${s}">${lvOpts(ficha.skills[s])}</select></div>`;
      }).join('')}</div>`).join('')}</div></div>
    <div class="card"><div class="row"><h2 style="margin:0">Combate</h2><span class="spacer"></span><span class="muted small">Se calcula solo con tus atributos, habilidades y Etapa (<b id="fx-etapa"></b>).</span></div>
      <div class="fx-calc" id="fx-combat"></div></div>
    <div class="card"><h2>Puntos</h2><div class="fx-calc" id="fx-pts"></div>
      <div class="fx-grid" style="margin-top:12px">
        <label class="fx-f"><span>Puntos de Destino</span><input type="number" min="0" data-p="extra.pd" value="${num(ficha.extra.pd)}"></label>
        ${fld('extra.pdPerdida','Pérdida de Puntos de Destino',{ph:'-'})}
      </div></div>`;
}
function refreshCalc(){
  const c=combate(), p=puntos(), A=ficha.attrs, b=s=>BONUS[sk(s)]||0;
  const box=$('#fx-combat'); if(!box) return;
  $('#fx-etapa').textContent = ficha.d.etapa || 'sin etapa: elegila en Datos';
  const row=(l,f,v)=>`<div class="fx-crow"><span class="l">${l}</span><span class="f">${f}</span><b>${v}</b></div>`;
  box.innerHTML = [
    row('Iniciativa',c.t.ini,c.ini),
    row('Ataque Físico',c.t.atkF,c.atkF),
    row('Lucha Física',c.t.luchaF.replace(' - 5',' − 5'),c.luchaF),
    row('Ataque Mágico',c.t.atkM,c.atkM),
    row('Lucha Mágica',c.t.luchaM.replace(' - 5',' − 5'),c.luchaM),
    row('Defensa',c.t.def,c.def),
    row('PAs',c.t.pa,c.pa),
    row('Umbral de heridas',c.t.umbral,c.umbral),
    row('Heridas',c.t.heridas,c.heridas)
  ].join('');
  $('#fx-pts').innerHTML = row('Puntos de Pociones',p.ppTxt,p.pp) + row('Puntos de Rituales',p.prTxt,p.pr);
}

/* ---- magia ---- */
const MG_TYPES = [
  {k:'hechizo', l:'Hechizos', fuente:'Hechizos'}, {k:'pocion', l:'Pociones', fuente:'Pociones'},
  {k:'ritual', l:'Rituales', fuente:'Rituales'}, {k:'objeto', l:'Objetos / Armas', fuente:'Objetos'},
  {k:'quidditch', l:'Quidditch'}, {k:'especial', l:'Especiales'}
];
const MG_TIERS = {hechizo:['dom','bas','int','ava','leg'], pocion:['bas','int','ava','leg'], ritual:['bas','int','ava','leg'], objeto:['bas','int','ava','leg'], quidditch:['bas','int','ava'], especial:['']};
function tierLbl(type,t,pl){
  if(!t) return pl?'Especiales':'Especial';
  if(t==='leg') return pl?'Legendarios':'Legendario';
  const fem = type==='pocion';
  const m={dom:['Doméstico','Domésticos'],bas:['Básico','Básicos'],int:['Intermedio','Intermedios'],ava:['Avanzado','Avanzados']}[t];
  const f={bas:['Básica','Básicas'],int:['Intermedia','Intermedias'],ava:['Avanzada','Avanzadas']}[t];
  return (fem&&f?f:m)[pl?1:0];
}
function compOptions(type,tier){
  const T = MG_TYPES.find(x=>x.k===type);
  if(!T.fuente || typeof TC.ARCANOS==='undefined') return '';
  const list = TC.ARCANOS.filter(a=>a.fuente===T.fuente && a.tier===tier && !hasArc(a.calcName));
  const of=list.filter(a=>a.origen==='Oficial'), inv=list.filter(a=>a.origen!=='Oficial');
  const o = a=>`<option value="${esc(a.calcName)}">${esc(a.calcName)}${a.origen!=='Oficial'&&a.autor?' · '+esc(a.autor.nombre):''}</option>`;
  return (of.length?`<optgroup label="Oficiales">${of.map(o).join('')}</optgroup>`:'') + (inv.length?`<optgroup label="Inventados">${inv.map(o).join('')}</optgroup>`:'');
}
function arcDesc(type,name){
  if(typeof TC.DESC==='undefined') return '';
  const a = TC.DESC[type+'|'+name] || (typeof TC.ARCANOS!=='undefined' && TC.ARCANOS.find(x=>norm(x.calcName)===norm(name)));
  return a ? a.texto.slice(0,220)+(a.texto.length>220?'…':'') : '';
}
function renderMagia(){
  const st = ficha._mgUi || (ficha._mgUi = {});
  return `<p class="muted small" style="margin:0 0 12px">Elegí tus arcanos del Compendio (incluye los inventados) o escribí uno que no esté, como recompensas de misión. Herbivicus, Poción Herbicida, Planta Vitae, el Maletín del pocionista y la Bisutería Arcana ya suman a tus Puntos de Pociones y Rituales.</p>`
  + MG_TYPES.map(T=>{
    const items = ficha.arcanos.map((a,i)=>({...a,i})).filter(a=>a.type===T.k);
    const tiers = MG_TIERS[T.k];
    const selT = st[T.k] && tiers.includes(st[T.k]) ? st[T.k] : (tiers.includes('bas') ? 'bas' : tiers[0]);
    const comp = compOptions(T.k, selT);
    const groups = tiers.concat(['']).filter((t,ix,arr)=>arr.indexOf(t)===ix).map(t=>{
      const g = items.filter(a=>(a.tier||'')===t); if(!g.length) return '';
      return `<div class="mg-group"><h4>${tierLbl(T.k,t,true)}</h4>${g.map(a=>`<div class="mg-item" title="${esc(arcDesc(T.k,a.name))}"><span class="mg-n">✦ ${esc(a.name)}</span>${a.nota?`<span class="mg-note">${esc(a.nota)}</span>`:''}<button class="btn sm ghost danger" data-mgx="${a.i}" aria-label="Quitar">×</button></div>`).join('')}</div>`;
    }).join('');
    return `<div class="card"><div class="row"><h2 style="margin:0">${T.l}</h2><span class="muted small">${items.length}</span></div>
      ${groups || '<p class="muted small">Todavía no cargaste ninguno.</p>'}
      <div class="mg-add" data-type="${T.k}">
        ${tiers.length>1||tiers[0]?`<select class="mg-tier">${tiers.map(t=>`<option value="${t}" ${t===selT?'selected':''}>${tierLbl(T.k,t)}</option>`).join('')}</select>`:''}
        ${comp?`<select class="mg-pick"><option value="">— Elegir del Compendio —</option>${comp}</select>`:''}
        <input type="text" class="mg-custom" placeholder="${comp?'…u otro (escribir)':'Nombre'}">
        <input type="text" class="mg-nota" placeholder="Nota (opcional)">
        <button class="btn sm primary mg-addbtn">Agregar</button>
      </div></div>`;
  }).join('');
}

/* ---- otros ---- */
function renderOtros(){
  const talOpts = (typeof TC.TALENTOS!=='undefined' ? [...new Set(TC.TALENTOS.map(t=>t.n))] : []);
  return `<div class="card"><div class="row"><h2 style="margin:0">Idiomas</h2><span class="spacer"></span><button class="btn sm" id="f-addid">+ Idioma</button></div>
      ${ficha.idiomas.map((x,i)=>`<div class="fx-line"><input type="text" data-l="idiomas.${i}.n" value="${esc(x.n)}" placeholder="Idioma"><select data-l="idiomas.${i}.nivel">${opts(IDIOMA_NIV,x.nivel)}</select><input type="text" class="grow" data-l="idiomas.${i}.nota" value="${esc(x.nota||'')}" placeholder="Nota (opcional)"><button class="btn sm ghost danger" data-lx="idiomas.${i}">×</button></div>`).join('') || '<p class="muted small">Sin idiomas cargados.</p>'}</div>
    <div class="card">
      <div class="row"><h2>Trasfondos</h2><span class="spacer"></span><button class="btn sm" id="f-addbg">+ Añadir trasfondo</button></div>
      <p class="muted small" style="margin-top:0">Deja la específica vacía para un trasfondo general. Ej.: Biblioteca · Medicina (general) y Biblioteca · Medicina &gt; Heridas mágicas (específica) van en dos filas.</p>
      <div id="f-bgs"></div></div>
    <div class="card"><h2>Ventajas</h2>
      <div class="adv">${ADVS.map(a=>`<div class="attr"><label for="ad-${a}">${a}</label><input type="number" min="0" max="4" id="ad-${a}" data-ad="${a}" value="${num(ficha.adv[a])}"></div>`).join('')}</div></div>
    <div class="card"><h2>Especializaciones</h2>
      <div class="adv">${ESP_RAMAS.map(r=>`<div class="attr"><label>${r}</label><select data-p="esp.${r}">${[0,1,2,3].map(n=>`<option value="${n}" ${num(ficha.esp[r])===n?'selected':''}>${n?r+' '+['','I','II','III'][n]:'—'}</option>`).join('')}</select></div>`).join('')}</div></div>
    <div class="card"><div class="row"><h2 style="margin:0">Talentos</h2><span class="spacer"></span><button class="btn sm" id="f-addtal">+ Talento</button></div>
      <datalist id="dl-tal">${talOpts.map(t=>`<option value="${esc(t)}">`).join('')}</datalist>
      ${ficha.talentos.map((x,i)=>`<div class="fx-line"><input type="text" list="dl-tal" data-l="talentos.${i}.n" value="${esc(x.n)}" placeholder="Talento"><input type="text" class="grow" data-l="talentos.${i}.nota" value="${esc(x.nota||'')}" placeholder="Detalle (criatura, arcano, PNJ…)"><button class="btn sm ghost danger" data-lx="talentos.${i}">×</button></div>`).join('') || '<p class="muted small">Sin talentos cargados.</p>'}</div>
    <div class="card"><div class="row"><h2 style="margin:0">Lazos, Uniones y Vínculos</h2><span class="spacer"></span><button class="btn sm" id="f-addvin">+ Agregar</button></div>
      ${ficha.vinculos.map((x,i)=>`<div class="fx-line"><select data-l="vinculos.${i}.tipo">${opts(VINC,x.tipo)}</select><input type="text" data-l="vinculos.${i}.pj" value="${esc(x.pj)}" placeholder="Personaje"><input type="text" class="grow" data-l="vinculos.${i}.nota" value="${esc(x.nota||'')}" placeholder="Nota"><button class="btn sm ghost danger" data-lx="vinculos.${i}">×</button></div>`).join('') || '<p class="muted small">Sin lazos cargados.</p>'}</div>
    <div class="card"><h2>Títulos académicos</h2>${fld('titulos','Uno por línea',{area:1,rows:4,ph:'TIMO — Extraordinario\nEXTASIS de Herbología — Extraordinario'})}</div>
    <div class="card"><h2>Notas</h2>${fld('otros','Cualquier otra cosa de la ficha',{area:1,rows:3,ph:'Objetos inventados, recompensas, aclaraciones…'})}</div>`;
}
function renderBgs(){
  const box=$('#f-bgs'); if(!box) return;
  if(!ficha.bgs.length){ box.innerHTML='<p class="muted small">Todavía no cargaste trasfondos.</p>'; return; }
  box.innerHTML=`<div class="bgrow bghead"><span>Tipo</span><span>Categoría general</span><span>Específica (opcional)</span><span>Nivel</span><span></span></div>`+
  ficha.bgs.map((b,i)=>{ const C=cats(b.t); const catList=Object.keys(C); if(b.c && !catList.includes(b.c)) catList.push(b.c);
    return `<div class="bgrow">
      <select data-bt="${i}" aria-label="Tipo">${opts(BG_TYPES,b.t)}</select>
      <select data-bc="${i}" aria-label="Categoría">${opts(catList,b.c)}</select>
      <input type="text" list="dl-${i}" data-be="${i}" value="${esc(b.e)}" placeholder="— general —" aria-label="Específica">
      <datalist id="dl-${i}">${(C[b.c]||[]).map(x=>`<option value="${esc(x)}">`).join('')}</datalist>
      <input type="number" min="0" max="6" data-bv="${i}" value="${num(b.v)}" aria-label="Nivel">
      <button class="btn sm ghost danger" data-bx="${i}" aria-label="Quitar">×</button>
      <input type="text" class="bgnote" data-bn="${i}" value="${esc(b.nota||'')}" placeholder="Nota (opcional): de dónde viene, qué cubre…"></div>`; }).join('');
  box.querySelectorAll('[data-bt]').forEach(s=>s.onchange=()=>{ const b=ficha.bgs[+s.dataset.bt]; b.t=s.value; const C=cats(b.t); if(!C[b.c]){ b.c=Object.keys(C)[0]; b.e=''; } persist(); renderBgs(); });
  box.querySelectorAll('[data-bc]').forEach(s=>s.onchange=()=>{ const b=ficha.bgs[+s.dataset.bc]; b.c=s.value; b.e=''; persist(); renderBgs(); });
  box.querySelectorAll('[data-be]').forEach(s=>s.oninput=()=>{ ficha.bgs[+s.dataset.be].e=s.value.trim(); persist(); });
  box.querySelectorAll('[data-bv]').forEach(s=>s.oninput=()=>{ ficha.bgs[+s.dataset.bv].v=num(s.value); persist(); });
  box.querySelectorAll('[data-bn]').forEach(s=>s.oninput=()=>{ ficha.bgs[+s.dataset.bn].nota=s.value; persist(); });
  box.querySelectorAll('[data-bx]').forEach(s=>s.onclick=()=>{ ficha.bgs.splice(+s.dataset.bx,1); persist(); renderBgs(); });
}

/* ---- eventos ---- */
function bindFicha(body){
  body.querySelectorAll('[data-p]').forEach(i=>{
    const ev = i.tagName==='SELECT' ? 'onchange' : 'oninput';
    i[ev]=()=>{ let v=i.value; if(i.type==='number' || /^esp\./.test(i.dataset.p)) v=num(v); setP(i.dataset.p,v); persist();
      if(['nombre','extra.ocupacion','extra.kicker','extra.foto','d.casa','d.edad','d.etapa'].includes(i.dataset.p)) renderHead();
      if(i.dataset.p==='d.etapa') refreshCalc(); };
  });
  body.querySelectorAll('[data-l]').forEach(i=>{
    const ev = i.tagName==='SELECT' ? 'onchange' : 'oninput';
    i[ev]=()=>{ const [k,ix,f]=i.dataset.l.split('.'); ficha[k][+ix][f]=i.value; persist(); };
  });
  body.querySelectorAll('[data-lx]').forEach(b=>b.onclick=()=>{ const [k,ix]=b.dataset.lx.split('.'); ficha[k].splice(+ix,1); persist(); renderFicha(); });
  body.querySelectorAll('[data-at]').forEach(i=>i.oninput=()=>{ ficha.attrs[i.dataset.at]=num(i.value); persist(); refreshCalc(); });
  body.querySelectorAll('[data-ad]').forEach(i=>i.oninput=()=>{ ficha.adv[i.dataset.ad]=num(i.value); persist(); });
  body.querySelectorAll('[data-sk]').forEach(i=>i.onchange=()=>{ ficha.skills[i.dataset.sk]=+i.value; persist(); refreshCalc(); });
  body.querySelectorAll('[data-artn]').forEach(i=>i.oninput=()=>{ ficha.artes[+i.dataset.artn].n=i.value; persist(); });
  body.querySelectorAll('[data-artv]').forEach(i=>i.onchange=()=>{ ficha.artes[+i.dataset.artv].v=+i.value; persist(); });
  body.querySelectorAll('[data-artx]').forEach(i=>i.onclick=()=>{ ficha.artes.splice(+i.dataset.artx,1); persist(); renderFicha(); });
  const q=s=>body.querySelector(s);
  if(q('#f-addart')) q('#f-addart').onclick=()=>{ ficha.artes.push({n:'',v:1}); persist(); renderFicha(); };
  if(q('#f-addbg')) q('#f-addbg').onclick=()=>{ ficha.bgs.push({t:'Biblioteca',c:'Medicina',e:'',v:1,nota:''}); persist(); renderBgs(); };
  if(q('#f-addid')) q('#f-addid').onclick=()=>{ ficha.idiomas.push({n:'',nivel:'Bajo',nota:''}); persist(); renderFicha(); };
  if(q('#f-addtal')) q('#f-addtal').onclick=()=>{ ficha.talentos.push({n:'',nota:''}); persist(); renderFicha(); };
  if(q('#f-addvin')) q('#f-addvin').onclick=()=>{ ficha.vinculos.push({tipo:'Vínculo',pj:'',nota:''}); persist(); renderFicha(); };
  body.querySelectorAll('[data-mgx]').forEach(b=>b.onclick=()=>{ ficha.arcanos.splice(+b.dataset.mgx,1); persist(); renderFicha(); });
  body.querySelectorAll('.mg-add').forEach(box=>{
    const type=box.dataset.type, tSel=box.querySelector('.mg-tier');
    if(tSel) tSel.onchange=()=>{ (ficha._mgUi=ficha._mgUi||{})[type]=tSel.value; renderFicha(); };
    box.querySelector('.mg-addbtn').onclick=()=>{
      const pick=box.querySelector('.mg-pick'), cus=box.querySelector('.mg-custom'), nota=box.querySelector('.mg-nota').value.trim();
      const name=(pick&&pick.value) || cus.value.trim();
      if(!name){ (cus||pick).focus(); return; }
      if(hasArc(name)){ toast('Ese arcano ya está en la ficha'); return; }
      ficha.arcanos.push({type, tier: tSel?tSel.value:'', name, nota}); persist(); renderFicha();
    };
  });
}

/* ---- barra de acciones ---- */
$('#f-example').onclick=()=>{ if(!confirmReplace()) return; const js=ficha.jobState; ficha=exampleFicha(); ficha.jobState=js||{}; persist(); renderFicha(); toast('Ficha de Hana Park cargada'); };
$('#f-reset').onclick=()=>{ if(!confirmReplace()) return; ficha=emptyFicha(); persist(); renderFicha(); };
function confirmReplace(){ const has = ficha.nombre || ficha.bgs.length || ficha.arcanos.length; return !has || window.confirm('Esto reemplaza la ficha que tienes cargada. ¿Seguir?'); }
$('#f-export').onclick=()=>{ const c=Object.assign({},ficha); delete c._mgUi; openDlg('Código de tu ficha','Guárdalo o pásalo: con "Importar código" se recupera la ficha en cualquier navegador.',encode(c),null); };
$('#f-import').onclick=()=>openDlg('Importar código','Pega el código de una ficha exportada desde esta página, o el código del Lector de Fichas (AVK1… o AK…).','',txt=>{
  if(esCodigoLector(txt)){ importarCodigoLector(txt); return; }
  ficha=normFicha(decode(txt)); persist(); renderFicha(); toast('Ficha importada');
},'Importar');
$('#f-parse').onclick=()=>openDlg('Importar ficha del foro','Abrí tu ficha en el foro, entrá a «Editar», copiá TODO el contenido del mensaje (Ctrl+A, Ctrl+C) y pegalo acá. También sirve el texto copiado de la ficha publicada. Se reemplaza la ficha que tengas cargada.','',txt=>{
  if(!txt.trim()) throw new Error('vacío');
  if(esCodigoLector(txt)){ importarCodigoLector(txt); return; }
  const p=parseFichaForo(txt); const js=ficha.jobState;
  ficha=normFicha(p.ficha); ficha.jobState=js||{};
  if(esCodigoForo(txt)) guardarPlantilla(txt, ficha);
  persist(); fichaTab='datos'; renderFicha();
  toast(`Ficha importada: ${p.resumen}${esCodigoForo(txt)?' · tu código quedó guardado en «Código para el foro»':''}`);
},'Importar');
$('#f-bb').onclick=()=>{ fichaTab='codigo'; almacen.guardarTexto('grimorio.fichaTab',fichaTab); renderFicha(); };

/* ============ Código del Lector de Fichas (AVK1… / AK…) → Mi Ficha ============ */
const LECTOR_FB = { key:'AIzaSyCzTfW6c4OltResFNP6FJ5-MV36Bz7iI74', proyecto:'trackerdefichas' };
const esCodigoLector = t => { const s=String(t||'').trim(); return /^AVK[01]\./.test(s) || /^AK\d{5}$/.test(s.toUpperCase().replace(/[^A-Z0-9]/g,'')); };
async function leerCodigoLector(t){
  t = String(t||'').trim();
  const corto = t.toUpperCase().replace(/[^A-Z0-9]/g,'');
  if(/^AK\d{5}$/.test(corto)){
    const r = await fetch(`https://firestore.googleapis.com/v1/projects/${LECTOR_FB.proyecto}/databases/(default)/documents/fichas/${corto}?key=${LECTOR_FB.key}`);
    if(r.status===404) throw new Error('No hay ninguna ficha con el código '+corto);
    if(!r.ok) throw new Error('Firebase respondió '+r.status);
    t = (await r.json()).fields.ficha.stringValue;
  }
  const [pre, cuerpo] = t.split('.');
  const bytes = Uint8Array.from(atob(cuerpo.replace(/-/g,'+').replace(/_/g,'/')), c=>c.charCodeAt(0));
  if(pre==='AVK0') return JSON.parse(new TextDecoder().decode(bytes));
  const buf = await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer();
  const d = JSON.parse(new TextDecoder().decode(buf));
  return Array.isArray(d) ? d[0] : d;
}
/* Traduce el JSON del Lector al formato de Mi Ficha */
function fichaDesdeLector(L){
  const f = emptyFicha(), N = s => norm(s).replace(/[^a-z0-9]/g,'');
  const buscar = (lista, k) => lista.find(x => N(x) === N(k));
  const RANGO = {0:0,1:1,2:2,4:3,7:4,9:5};
  const rango = b => RANGO[b] ?? (b>=9?5:b>=7?4:b>=4?3:b>=2?2:b>=1?1:0);
  f.nombre = L.personaje || '';
  /* datos */
  const D = L.datos || {};
  const DMAP = {avatar:'avatar', multicuenta:'multicuenta', lugar_nacimiento:'nacimiento', residencia:'residencia', clase_social:'clase', fecha_nacimiento:'fechaNac',
    edad:'edad', orientacion:'orientacion', sangre:'sangre', casa:'casa', curso:'curso', faccion:'faccion', quidditch:'quidditch'};
  Object.entries(DMAP).forEach(([k,v]) => { if(D[k]) f.d[v] = D[k]; });
  f.d.etapa = Object.keys(ETAPAS).find(e => norm(D.etapa||'').includes(norm(e))) || '';
  if(L.raza && L.raza.nombre) f.d.raza = L.raza.nombre;
  const T = L.textos || {};
  if(T.descripcion_fisica) f.desc.fisica = T.descripcion_fisica;
  if(T.descripcion_psicologica) f.desc.psico = T.descripcion_psicologica;
  if(T.historia) f.desc.historia = T.historia;
  if(T.familia) f.desc.familia = T.familia;
  if(D.punto_fuerte) f.desc.fuerte = D.punto_fuerte;
  if(D.punto_debil) f.desc.debil = D.punto_debil;
  if(D.gustos) f.desc.gustos = D.gustos;
  if(D.fobias) f.desc.fobias = D.fobias;
  if(D.mascota) f.desc.mascota = D.mascota;
  if(D.empleo) f.extra.ocupacion = D.empleo;
  if(L.limites) f.extra.limites = L.limites;
  const P = L.puntos || {};
  if(Number.isFinite(P.destino)) f.extra.pd = P.destino;
  if(P.perdida_destino != null) f.extra.pdPerdida = String(P.perdida_destino);
  /* atributos y habilidades */
  Object.entries(L.atributos || {}).forEach(([k,v]) => { const a = buscar(ATTRS,k); if(a) f.attrs[a] = v; });
  Object.values(L.habilidades || {}).forEach(grupo => Object.entries(grupo).forEach(([k,h]) => {
    if(h.bono == null) return;
    const art = (h.nombre||'').match(/Arte\s*\/\s*Artesan[ií]a\s*\(([^)]+)\)/i);
    if(art || /^artesania_/.test(k)){ { const n = art ? art[1].trim() : k.replace(/^artesania_/,'').replace(/_/g,' '); f.artes.push({n: n.charAt(0).toUpperCase()+n.slice(1), v: rango(h.bono)}); } return; }
    const s = buscar(ALL_SKILLS.filter(x=>x!==ART), h.nombre||k) || buscar(ALL_SKILLS.filter(x=>x!==ART), k);
    if(s) f.skills[s] = rango(h.bono);
  }));
  /* arcanos */
  const TIER = {domesticos:'dom', basicos:'bas', intermedios:'int', avanzados:'ava', legendarios:'leg'};
  const nota = x => [x.detalle, x.descripcion].filter(Boolean).join(' — ');
  const agregar = (type, tier, x) => {
    const name = x.nombre || ''; if(!name) return;
    const hit = typeof findArcano==='function' ? findArcano(name, type) : null;
    const nm = hit ? hit.calcName : name;
    if(f.arcanos.some(a => norm(a.name)===norm(nm))) return;
    f.arcanos.push({type: tier==='' && type==='objeto' ? 'especial' : type, tier: hit && tier!=='' ? hit.tier : tier, name: nm, nota: hit ? '' : nota(x)});
  };
  [['hechizos','hechizo'],['pociones','pocion'],['rituales','ritual'],['objetos','objeto'],['quidditch','quidditch']].forEach(([k,type]) =>
    Object.entries(L[k] || {}).forEach(([sub, lista]) => (lista||[]).forEach(x => agregar(type, TIER[sub] ?? (type==='objeto' ? '' : 'bas'), x))));
  (L.armas || []).forEach(x => agregar('objeto', '', x));
  /* trasfondos (generales y específicos), ventajas, especializaciones */
  (L.trasfondos || []).concat(L.trasfondos_especificos || []).forEach(t => {
    if(!t.tipo || !t.general) return;
    f.bgs.push({t: t.tipo, c: t.general, e: t.especifica || '', v: t.nivel || 1, nota: [t.identidad ? 'Identidad alternativa: '+t.identidad : '', t.descripcion || ''].filter(Boolean).join(' — ')});
  });
  (L.ventajas || []).forEach(v => { const a = buscar(ADVS, v.nombre||''); if(!a) return;
    const n = typeof v.nivel==='number' ? v.nivel : (/1|primera/i.test(v.nivel) ? 3 : /2|segunda/i.test(v.nivel) ? 2 : /3|tercera/i.test(v.nivel) ? 1 : num(v.nivel));
    f.adv[a] = Math.max(f.adv[a]||0, n); });
  Object.entries(L.especializaciones || {}).forEach(([k,v]) => { const r = buscar(ESP_RAMAS, k.replace(/_/g,' ')); if(r) f.esp[r] = v; });
  /* idiomas */
  const NIV = {nativo:'Nativo', natal:'Nativo', alto:'Alto', fluido:'Alto', avanzado:'Alto', medio:'Medio', intermedio:'Medio', bajo:'Bajo', basico:'Bajo'};
  (L.idiomas || []).forEach(x => { if(x.idioma) f.idiomas.push({n: x.idioma, nivel: NIV[norm(x.nivel||'')] || 'Bajo', nota: x.descripcion || ''}); });
  /* talentos y lazos */
  Object.values(L.talentos || {}).flat().forEach(x => {
    const n = x.nombre || ''; const tipo = VINC.find(v => norm(v)===norm(n));
    if(tipo) f.vinculos.push({tipo, pj: x.detalle || '', nota: x.descripcion || ''});
    else if(n) f.talentos.push({n, nota: x.detalle || ''});
  });
  /* títulos y proezas */
  f.titulos = (L.titulos || []).map(t => [t.examen, t.materia].filter(Boolean).join(' ') + (t.calificacion ? ': ' + t.calificacion : '')).join('\n');
  if((L.proezas || []).length) f.otros = 'Proezas: ' + L.proezas.map(p => p.habilidad).join(', ');
  return f;
}
/* .txt o .json del Lector: un código suelto, o la lista que descarga «Escanear todas» */
function codigosDeArchivo(texto){
  const t = String(texto||'').trim();
  if(t.startsWith('{')){ try{ const j = JSON.parse(t); return (j.fichas||[]).filter(x=>x.codigo).map(x=>({n:x.personaje||'Sin nombre', c:x.codigo_completo||x.codigo})); }catch(e){} }
  const filas = [];
  t.split(/\r?\n/).forEach(l => {
    const cods = l.match(/AVK[01]\.[A-Za-z0-9_-]+/g);
    if(!cods) return;
    const nombre = l.split('\t')[0].trim();
    filas.push({n: /^AVK/.test(nombre) ? 'Ficha '+(filas.length+1) : nombre, c: cods[cods.length-1]});   // si hay dos, el último es el completo
  });
  return filas;
}
$('#f-lector-txt').onclick = () => { const i = $('#f-lector-file'); i.value = ''; i.click(); };
$('#f-lector-file').onchange = async e => {
  const file = e.target.files && e.target.files[0]; if(!file) return;
  const lista = codigosDeArchivo(await file.text());
  if(!lista.length){ toast('Ese archivo no tiene códigos del Lector'); return; }
  let elegido = lista[0];
  if(lista.length > 1){
    const q = window.prompt(`El archivo tiene ${lista.length} fichas. Escribí el nombre (o parte) del personaje:`, ficha.nombre || '');
    if(q == null) return;
    const hits = lista.filter(x => norm(x.n).includes(norm(q)));
    if(!hits.length){ toast('No encontré a «'+q+'» en el archivo'); return; }
    if(hits.length > 1){
      const idx = window.prompt('Hay varios:\n' + hits.slice(0,20).map((x,i)=>`${i+1}. ${x.n}`).join('\n') + '\n\nEscribí el número:', '1');
      elegido = hits[num(idx)-1]; if(!elegido) return;
    } else elegido = hits[0];
  }
  if(!confirmReplace()) return;
  importarCodigoLector(elegido.c);
};
async function importarCodigoLector(txt){
  toast('Cargando ficha…');
  try{
    const L = await leerCodigoLector(txt);
    if(!L || typeof L!=='object') throw new Error('El código no trae una ficha');
    const js = ficha.jobState, plant = ficha.plantilla;
    ficha = normFicha(fichaDesdeLector(L)); ficha.jobState = js || {}; if(plant) ficha.plantilla = plant;
    persist(); fichaTab = 'datos'; renderFicha();
    const sinTextos = !L.textos;
    const sinEsp = !('trasfondos_especificos' in L);
    if(sinEsp) setTimeout(()=>toast('Ese código es de una versión vieja del Lector y no trae trasfondos específicos: generalo de nuevo'), 3500);
    toast(`Ficha de ${ficha.nombre || 'sin nombre'} cargada: ${ficha.arcanos.length} arcanos, ${ficha.bgs.length} trasfondos${sinTextos ? ' · era el código de juego: usá el código completo para traer descripciones e historia' : ''}`);
  }catch(e){ console.error(e); toast('No se pudo cargar: ' + (e.message || e)); }
}

/* ============ Panel: Editor ============ */
function curEdit(){ let j=jobs.find(x=>x.id===ui.edit); if(!j){ j=jobs[0]; ui.edit=j?j.id:null; } return j; }
function newCond(k='attr'){
  const th=[0,0,0,0,0];
  if(k==='attr') return {k,a:'Inteligencia',th};
  if(k==='skill') return {k,s:'Medicina',sp:'',th};
  if(k==='bestskill') return {k,a:'Inteligencia',th};
  if(k==='bg') return {k,t:'Biblioteca',c:'Medicina',e:'',th};
  if(k==='adv') return {k,v:'Fama',th};
  if(k==='arc') return {k,tier:'bas',type:'',th};
}
function condEditor(c,qi,oi,ci){
  const id=`${qi}-${oi}-${ci}`;
  let f=`<select data-ck-kind="${id}" aria-label="Tipo de requisito">${[['attr','Atributo'],['skill','Habilidad'],['bestskill','Mejor habilidad de…'],['bg','Trasfondo'],['adv','Ventaja'],['arc','Arcanos (cantidad)']].map(([v,l])=>`<option value="${v}" ${c.k===v?'selected':''}>${l}</option>`).join('')}</select>`;
  if(c.k==='attr'||c.k==='bestskill') f+=`<select data-cf="a" data-id="${id}">${opts(ATTRS,c.a)}</select>`;
  if(c.k==='bestskill') f+=`<select data-cf="n" data-id="${id}" aria-label="Posición">${[1,2,3].map(n=>`<option value="${n}" ${(c.n||1)===n?'selected':''}>${n===1?'la mejor':n+'ª mejor'}</option>`).join('')}</select>`;
  if(c.k==='arc'){ f+=`<select data-cf="tier" data-id="${id}">${Object.entries(ARC_TIER).map(([v,l])=>`<option value="${v}" ${c.tier===v?'selected':''}>${l}</option>`).join('')}</select>`; f+=`<select data-cf="type" data-id="${id}"><option value="" ${!c.type?'selected':''}>de cualquier tipo</option>${['hechizo','pocion','ritual','objeto'].map(v=>`<option value="${v}" ${c.type===v?'selected':''}>${ARC_TYPE[v]}</option>`).join('')}</select>`; }
  if(c.k==='skill'){ f+=`<select data-cf="s" data-id="${id}" data-rr="1">${opts(ALL_SKILLS,c.s)}</select>`; if(c.s===ART) f+=`<input type="text" data-cf="sp" data-id="${id}" value="${esc(c.sp||'')}" placeholder="cuál (vacío = cualquiera)" style="width:170px">`; }
  if(c.k==='adv') f+=`<select data-cf="v" data-id="${id}">${opts(ADVS,c.v)}</select>`;
  if(c.k==='bg'){
    const C=cats(c.t);
    f+=`<select data-cf="t" data-id="${id}" data-rr="1">${opts(BG_TYPES,c.t)}</select>`;
    f+=`<select data-cf="c" data-id="${id}" data-rr="1"><option value="*" ${c.c==='*'?'selected':''}>(cualquier categoría)</option>${opts(Object.keys(C),c.c)}</select>`;
    f+=`<input type="text" list="edl-${id}" data-cf="e" data-id="${id}" value="${esc(c.e||'')}" placeholder="específica (vacío = general, * = cualquiera)" style="width:230px"><datalist id="edl-${id}"><option value="*">${(C[c.c]||[]).map(x=>`<option value="${esc(x)}">`).join('')}</datalist>`;
  }
  f+=`<span class="th">${[0,1,2,3,4].map(i=>`<input type="number" min="0" max="${c.k==='arc'?99:9}" data-th="${i}" data-id="${id}" value="${num(c.th[i])}" aria-label="${RANKS[i+1]}" title="${RANKS[i+1]}">`).join('')}
     <button class="btn sm ghost danger" data-cx="${id}" aria-label="Quitar condición">×</button></span>`;
  return `<div class="cond">${f}</div>`;
}
function renderEditor(){
  const sel=$('#e-pick'); const j=curEdit();
  const groups=[]; jobs.forEach(x=>{ const g=x.grupo||'Mis empleos'; let G=groups.find(y=>y.g===g); if(!G){ G={g,l:[]}; groups.push(G); } G.l.push(x); });
  sel.innerHTML=groups.map(G=>`<optgroup label="${esc(G.g)}">${G.l.map(x=>`<option value="${esc(x.id)}" ${j&&x.id===j.id?'selected':''}>${esc(x.nombre||'Sin nombre')}</option>`).join('')}</optgroup>`).join('');
  const body=$('#e-body');
  if(!j){ body.innerHTML='<div class="card empty">No hay empleos. Crea uno nuevo.</div>'; return; }
  body.innerHTML=`<div class="card"><h2>Datos del empleo</h2><div class="formgrid">
      <label>Nombre<input type="text" id="e-nombre" value="${esc(j.nombre)}"></label>
      <label>Categoría de sueldo<select id="e-sueldo"><option value="">Sin definir</option>${opts(Object.keys(SUELDOS),j.sueldo)}</select></label>
      <label>Grupo<input type="text" id="e-grupo" list="e-grupos" value="${esc(j.grupo||'')}" placeholder="Mis empleos"><datalist id="e-grupos">${[...new Set(jobs.map(x=>x.grupo).filter(Boolean))].map(g=>`<option value="${esc(g)}">`).join('')}</datalist></label>
      <label>Notas<input type="text" id="e-notas" value="${esc(j.notas||'')}"></label>
      <label style="grid-column:1/-1">Descripción<textarea id="e-desc" rows="2" style="width:100%">${esc(j.desc||'')}</textarea></label>
      <label style="flex-direction:row;align-items:center;gap:8px;margin-top:22px"><input type="checkbox" id="e-unico" ${j.unico?'checked':''}> Puesto único</label>
    </div></div>
    <div class="card"><div class="row"><h2 style="margin:0">Requisitos numéricos</h2><span class="spacer"></span><button class="btn sm primary" id="e-addreq">+ Requisito</button></div>
      <p class="muted small">Cada requisito lleva los 5 umbrales (Novato, Competente, Experto, Maestro, Legendario). Usa <b>+ y</b> cuando una opción exige dos cosas juntas, y <b>+ ó</b> cuando hay alternativas (p. ej. Vigor + Pelea ó Poder + Duelo).</p>
      <div class="th-lab"><span>Nov.</span><span>Comp.</span><span>Exp.</span><span>Maes.</span><span>Leg.</span><span style="width:30px"></span></div>
      ${j.reqs.map((q,qi)=>`<div class="reqcard">
        ${q.opts.map((o,oi)=>`${oi?'<div class="or">— Ó —</div>':''}<div class="opt">${o.map((c,ci)=>`${ci?'<span class="and">y además</span>':''}${condEditor(c,qi,oi,ci)}`).join('')}
          <div class="row"><button class="btn sm ghost" data-andadd="${qi}-${oi}">+ y</button></div></div>`).join('')}
        <div class="row" style="margin-top:8px"><button class="btn sm" data-oradd="${qi}">+ ó (alternativa)</button><span class="spacer"></span>
          <button class="btn sm ghost" data-up="${qi}" ${qi===0?'disabled':''} aria-label="Subir">↑</button>
          <button class="btn sm ghost" data-down="${qi}" ${qi===j.reqs.length-1?'disabled':''} aria-label="Bajar">↓</button>
          <button class="btn sm ghost danger" data-qx="${qi}">Eliminar requisito</button></div>
      </div>`).join('') || '<p class="muted">Sin requisitos todavía.</p>'}
    </div>
    <div class="card"><div class="row"><h2 style="margin:0">Requisitos manuales</h2><span class="spacer"></span><button class="btn sm" id="e-addck">+ Requisito manual</button></div>
      <p class="muted small">TIMOs, ÉXTASIS, idiomas, arcanos, roles de reclutamiento… El usuario los marca con una casilla. "Desde" es el nivel a partir del cual se exige.</p>
      ${(j.checks||[]).map((c,i)=>`<div class="cond"><input type="text" data-ckt="${i}" value="${esc(c.t)}" style="flex:1;min-width:200px"><label class="small">Desde <select data-ckd="${i}">${[1,2,3,4,5].map(r=>`<option value="${r}" ${c.desde===r?'selected':''}>${RANKS[r]}</option>`).join('')}</select></label><button class="btn sm ghost danger" data-ckx="${i}" aria-label="Quitar">×</button></div>`).join('<div style="height:6px"></div>')}
    </div>`;
  const P=s=>{ const [a,b,c]=s.split('-').map(Number); return j.reqs[a].opts[b][c]; };
  const rerender=()=>{ persist(); renderEditor(); };
  $('#e-nombre').oninput=e=>{ j.nombre=e.target.value; persist(); sel.options[sel.selectedIndex].text=j.nombre||'Sin nombre'; };
  $('#e-sueldo').onchange=e=>{ j.sueldo=e.target.value; persist(); };
  $('#e-notas').oninput=e=>{ j.notas=e.target.value; persist(); };
  $('#e-grupo').onchange=e=>{ j.grupo=e.target.value.trim(); persist(); renderEditor(); };
  $('#e-desc').oninput=e=>{ j.desc=e.target.value; persist(); };
  $('#e-unico').onchange=e=>{ j.unico=e.target.checked; persist(); };
  $('#e-addreq').onclick=()=>{ j.reqs.push({opts:[[newCond('attr')]]}); rerender(); };
  $('#e-addck').onclick=()=>{ (j.checks=j.checks||[]).push({t:'',desde:1}); rerender(); };
  body.querySelectorAll('[data-ck-kind]').forEach(s=>s.onchange=()=>{ const [a,b,c]=s.dataset.ckKind.split('-').map(Number); const old=j.reqs[a].opts[b][c]; const n=newCond(s.value); n.th=old.th; j.reqs[a].opts[b][c]=n; rerender(); });
  body.querySelectorAll('[data-cf]').forEach(s=>{ const ev=s.tagName==='SELECT'?'onchange':'oninput'; s[ev]=()=>{ const c=P(s.dataset.id); c[s.dataset.cf]=s.dataset.cf==='n'?+s.value:(s.value.trim?s.value.trim():s.value); if(s.dataset.cf==='t'){ if(c.c!=='*'&&!cats(c.t)[c.c]){ c.c=Object.keys(cats(c.t))[0]; } c.e=''; } if(s.dataset.cf==='c') c.e=''; persist(); if(s.dataset.rr) renderEditor(); }; });
  body.querySelectorAll('[data-th]').forEach(s=>s.oninput=()=>{ P(s.dataset.id).th[+s.dataset.th]=num(s.value); persist(); });
  body.querySelectorAll('[data-cx]').forEach(s=>s.onclick=()=>{ const [a,b,c]=s.dataset.cx.split('-').map(Number); const q=j.reqs[a]; q.opts[b].splice(c,1); if(!q.opts[b].length) q.opts.splice(b,1); if(!q.opts.length) j.reqs.splice(a,1); rerender(); });
  body.querySelectorAll('[data-andadd]').forEach(s=>s.onclick=()=>{ const [a,b]=s.dataset.andadd.split('-').map(Number); j.reqs[a].opts[b].push(newCond('skill')); rerender(); });
  body.querySelectorAll('[data-oradd]').forEach(s=>s.onclick=()=>{ j.reqs[+s.dataset.oradd].opts.push([newCond('attr')]); rerender(); });
  body.querySelectorAll('[data-qx]').forEach(s=>s.onclick=()=>{ j.reqs.splice(+s.dataset.qx,1); rerender(); });
  body.querySelectorAll('[data-up]').forEach(s=>s.onclick=()=>{ const i=+s.dataset.up; [j.reqs[i-1],j.reqs[i]]=[j.reqs[i],j.reqs[i-1]]; rerender(); });
  body.querySelectorAll('[data-down]').forEach(s=>s.onclick=()=>{ const i=+s.dataset.down; [j.reqs[i+1],j.reqs[i]]=[j.reqs[i],j.reqs[i+1]]; rerender(); });
  body.querySelectorAll('[data-ckt]').forEach(s=>s.oninput=()=>{ j.checks[+s.dataset.ckt].t=s.value; persist(); });
  body.querySelectorAll('[data-ckd]').forEach(s=>s.onchange=()=>{ j.checks[+s.dataset.ckd].desde=+s.value; persist(); });
  body.querySelectorAll('[data-ckx]').forEach(s=>s.onclick=()=>{ j.checks.splice(+s.dataset.ckx,1); rerender(); });
}
const newId=()=>'j'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
$('#e-pick').onchange=e=>{ ui.edit=e.target.value; persist(); renderEditor(); };
$('#e-new').onclick=()=>{ const j={id:newId(),nombre:'Nuevo empleo',grupo:'Mis empleos',sueldo:'',unico:false,notas:'',desc:'',reqs:[],checks:[]}; jobs.push(j); ui.edit=j.id; persist(); renderEditor(); };
$('#e-dup').onclick=()=>{ const j=curEdit(); if(!j) return; const c=JSON.parse(JSON.stringify(j)); c.id=newId(); c.nombre=j.nombre+' (copia)'; c.fuente=''; c.grupo='Mis empleos'; jobs.push(c); ui.edit=c.id; persist(); renderEditor(); };
$('#e-del').onclick=()=>{ const j=curEdit(); if(!j||!window.confirm(`¿Eliminar "${j.nombre}"?`)) return; jobs=jobs.filter(x=>x!==j); ui.edit=null; persist(); renderEditor(); };
$('#e-restore').onclick=()=>{
  if(!window.confirm('¿Restaurar todos los empleos del foro? Vuelven a su versión original los que hayas editado o borrado. Tus empleos propios se mantienen.')) return;
  const mine=jobs.filter(x=>x.fuente!=='foro' && !EMPLEOS_FORO.some(f=>f.id===x.id));
  jobs=JSON.parse(JSON.stringify(EMPLEOS_FORO)).concat(mine); ui.edit=jobs[0]&&jobs[0].id; persist(); renderEditor(); toast(`${EMPLEOS_FORO.length} empleos del foro restaurados`);
};
$('#e-export').onclick=()=>{ const j=curEdit(); if(j) openDlg(`Código de "${j.nombre}"`,'Pásaselo a otros jugadores: lo cargan con "Importar empleo".',encode({tipo:'empleo',...j}),null); };
$('#e-import').onclick=()=>openDlg('Importar empleo','Pega el código de un empleo exportado.','',txt=>{
  const j=decode(txt); if(!j||!Array.isArray(j.reqs)) throw new Error('bad'); delete j.tipo;
  if(jobs.find(x=>x.id===j.id)) j.id=newId(); j.checks=j.checks||[]; if(j.fuente==='foro'){ j.fuente=''; } if(!j.grupo) j.grupo='Mis empleos'; jobs.push(j); ui.edit=j.id; persist(); renderEditor(); toast('Empleo importado');
},'Importar');


/* ============ Importar ficha del foro ============ */
function cleanForo(raw){
  let t = String(raw).replace(/\r/g,'');
  t = t.replace(/<style[\s\S]*?<\/style>/gi,'').replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<!--[\s\S]*?-->/g,'');
  t = t.replace(/<summary[^>]*>/gi,'\n').replace(/<(br|\/div|\/p|\/li|\/summary|\/details|\/h\d|\/tr|\/label)\s*\/?>/gi,'\n').replace(/<[^>]+>/g,'');
  t = t.replace(/\[img[^\]]*\][\s\S]*?\[\/img\]/gi,'');
  t = t.replace(/\[spoiler=\s*(?:▋\s*)?([^\]]*)\]/gi,'\n$1\n').replace(/\[\/spoiler\]/gi,'\n');
  t = t.replace(/\[\/?(?:color|b|i|u|s|url|center|left|right|justify|size|font|spoiler|hide|quote|code|strike|sub|sup|table|tr|td|list|\*|flash|youtube|scroll|updown|blur|fade|rand|roll)(?:=[^\]]*)?\]/gi,'');
  t = t.replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'");
  return t.split('\n').map(l=>l.replace(/[ \t ]+/g,' ').trim()).join('\n').replace(/\n{3,}/g,'\n\n');
}
const LBL = {
  'nombre y apellido':'nombre','nombre':'nombre','avatar/pb':'d.avatar','avatar / pb':'d.avatar','avatar':'d.avatar','pb':'d.avatar','multicuenta':'d.multicuenta','multicuentas':'d.multicuenta',
  'lugar de nacimiento':'d.nacimiento','lugar de residencia':'d.residencia','residencia':'d.residencia','clase social':'d.clase',
  'fecha de nacimiento':'d.fechaNac','edad':'d.edad','etapa':'d.etapa','orientacion sexual':'d.orientacion','orientacion':'d.orientacion',
  'tipo de sangre':'d.sangre','sangre':'d.sangre','raza':'d.raza','casa':'d.casa','curso':'d.curso','faccion':'d.faccion','equipo de quidditch':'d.quidditch',
  'descripcion fisica':'desc.fisica','descripcion psicologica':'desc.psico','punto fuerte':'desc.fuerte','puntos fuertes':'desc.fuerte','punto debil':'desc.debil','puntos debiles':'desc.debil',
  'gustos/aficiones':'desc.gustos','gustos / aficiones':'desc.gustos','gustos':'desc.gustos','fobias/manias':'desc.fobias','fobias / manias':'desc.fobias','fobias':'desc.fobias',
  'historia':'desc.historia','familia':'desc.familia','mascota':'desc.mascota','mascotas':'desc.mascota',
  'atributos':'_attrs','habilidades':'_skills','combate':'_x','puntos de pociones':'_x','puntos de rituales':'_x',
  'puntos de destino':'extra.pd','perdida de puntos de destino':'extra.pdPerdida'
};
const SECT = {'HECHIZOS':'m:hechizo','POCIONES':'m:pocion','RITUALES':'m:ritual','OBJETOS/ARMAS':'m:objeto','OBJETOS / ARMAS':'m:objeto','OBJETOS':'m:objeto','ARMAS':'m:objeto','QUIDDITCH':'m:quidditch',
  'DOMESTICOS':'t:dom','DOMESTICAS':'t:dom','BASICOS':'t:bas','BASICAS':'t:bas','INTERMEDIOS':'t:int','INTERMEDIAS':'t:int','AVANZADOS':'t:ava','AVANZADAS':'t:ava','LEGENDARIOS':'t:leg','LEGENDARIAS':'t:leg','ESPECIALES':'t:',
  'IDIOMAS':'o:idiomas','TRASFONDOS':'o:bg','BIBLIOTECA':'o:bg','INFORMANTES':'o:bg','INFLUENCIA':'o:bg','SEGUIDORES':'o:bg','VENTAJAS':'o:adv','ESPECIALIZACIONES':'o:esp','ESPECIALIZACION':'o:esp',
  'TALENTOS':'o:tal','TITULOS ACADEMICOS':'o:tit','TITULOS':'o:tit','RAZA':'o:raza','MAGIA':'x','OTROS':'x','DATOS':'x','DESC.':'x','DESCRIPCION':'x','CARACT.':'x','CARACTERISTICAS':'x'};
const ROMAN_N = {I:1,II:2,III:3,IV:4,V:5,VI:6};
const LVWORD = {desentrenado:0,novato:1,competente:2,experto:3,maestro:4,legendario:5};
const SKILL_ALIAS = {'esquivar':'Esquiva','volar':'Vuelo','seducir':'Seducción'};
const up = s => norm(s).toUpperCase().replace(/:$/,'').trim();
function findArcano(name, type){
  if(typeof TC.ARCANOS==='undefined') return null;
  const n = norm(name).replace(/[^a-z0-9]/g,'');
  if(!n) return null;
  const keys = a => [a.calcName, ...a.nombre.split('|')].map(x=>norm(x).replace(/[^a-z0-9]/g,''));
  const hits = TC.ARCANOS.filter(a=>keys(a).includes(n));
  return hits.find(a=>a.type===type) || hits[0] || null;
}
/* Lee una línea de trasfondo con cualquiera de las formas habituales:
   «Biblioteca — Medicina — Heridas mágicas III: nota», «Biblioteca Medicina IV», «Biblioteca: Medicina (IV)»,
   «Trasfondo Biblioteca de Medicina nivel 4», «IV Biblioteca — Medicina», «Biblioteca — Medicina — Heridas mágicas: III — nota»,
   «Informantes Bajos fondos Ladrones II» (separa categoría y específico con la lista oficial). */
function leerTrasfondo(l){
  const LV = '(VI|V|IV|I{1,3}|[1-6])';
  l = String(l||'').replace(/^trasfondos?\s*(?:generales?|espec[ií]ficos?)?\s*[:—–\-]?\s*/i,'');
  let lvPre = null;
  const pre = l.match(new RegExp('^\\(?'+LV+'\\)?\\s*[—–\\-:.]?\\s+(?=Biblioteca|Informantes|Influencia|Seguidores)','i'));
  if(pre){ lvPre = pre[1]; l = l.slice(pre[0].length); }
  const m = l.match(/^(Biblioteca|Informantes|Influencia|Seguidores)\b\s*(?:—|–|-|:|·|>)?\s*(.+)$/i);
  if(!m) return null;
  const t = m[1].charAt(0).toUpperCase()+m[1].slice(1).toLowerCase();
  let rest = m[2].trim(), namePart, nota = '', lv = null;
  const ci = rest.indexOf(':');
  namePart = ci>=0 ? rest.slice(0,ci) : rest; nota = ci>=0 ? rest.slice(ci+1).trim() : '';
  const lvEnd = new RegExp('(?:\\s+|\\s*[—–\\-,(]\\s*)\\(?\\s*(?:nivel|niv\\.?|nv\\.?|lv\\.?)?\\s*'+LV+'\\s*\\)?\\s*\\.?\\s*$','i');
  let x = namePart.match(lvEnd);
  if(x && x.index>0){ lv = x[1]; namePart = namePart.slice(0, x.index); }
  else if(nota){
    x = nota.match(new RegExp('^\\(?\\s*(?:nivel|niv\\.?|nv\\.?|lv\\.?)?\\s*'+LV+'\\s*\\)?(?=$|[\\s.:,;—–\\-])\\s*[.:,;—–\\-]*\\s*','i'));
    if(x){ lv = x[1]; nota = nota.slice(x[0].length).trim(); }
  }
  if(!lv) lv = lvPre;
  if(!lv) return null;
  const v = ROMAN_N[String(lv).toUpperCase()] || num(lv);
  if(!v) return null;
  let parts = namePart.split(/\s*(?:—|–|>|·|\/|\s-\s)\s*/).map(s=>s.replace(/^(?:de|del|de la)\s+/i,'').trim()).filter(Boolean);
  if(!parts.length) return null;
  const C = cats(t), CK = Object.keys(C);
  const igual = (a,b)=>norm(a)===norm(b);
  /* «Bajos fondos Ladrones» sin separador: se separa con la lista oficial */
  if(parts.length===1){
    const c = CK.filter(k=>norm(parts[0]).startsWith(norm(k)+' ')).sort((a,b)=>b.length-a.length)[0];
    if(c){ const resto = parts[0].slice(c.length).trim().replace(/^(?:de|del)\s+/i,''); parts = [c, resto]; }
  }
  const c0 = CK.find(k=>igual(k,parts[0])) || parts[0];
  let e = parts.slice(1).join(' > ');
  if(e && C[c0]){ const e0 = C[c0].find(s=>igual(s,e)); if(e0) e = e0; }
  return {t, c:c0, e, v, nota: nota.replace(/^[—–\-\s]+/,'').trim()};
}
function parseFichaForo(raw){
  const f = emptyFicha(), T = cleanForo(raw), lines = T.split('\n');
  /* 1. campos con etiqueta */
  let cur=null, buf=[]; const got={};
  const flush=()=>{ if(cur && !(cur in got)){ const v=buf.join('\n').replace(/\n{3,}/g,'\n\n').trim(); if(v) got[cur]=v; } cur=null; buf=[]; };
  const labelRe = /^(?:[▋■▌█●•→\-]\s*)?([A-Za-zÁÉÍÓÚÜáéíóúüÑñ\/ ]{2,40}?)\s*:\s*(.*)$/;
  for(const ln of lines){
    const h = up(ln);
    if(SECT[h] !== undefined){ flush(); continue; }
    const m = ln.match(labelRe), key = m && LBL[norm(m[1]).replace(/\s+/g,' ').trim()];
    if(key){ flush(); cur=key; buf=[m[2]]; continue; }
    if(cur) buf.push(ln);
  }
  flush();
  Object.entries(got).forEach(([k,v])=>{
    if(k.startsWith('_')) return;
    if(k.startsWith('d.') || k==='nombre' || k==='extra.pd'){ v=v.split('\n')[0].trim(); }
    if(v==='-'||/^aqu[ií]$/i.test(v)) v='';
    if(k==='extra.pd') v=num((v.match(/\d+/)||[0])[0]);
    setPath(f,k,v);
  });
  const et = Object.keys(ETAPAS).find(e=>norm(f.d.etapa).includes(norm(e)));
  f.d.etapa = et || '';
  const lim = T.match(/L[ií]mites?\s*:\s*([^)\n]*)/i); if(lim && !/^_+$/.test(lim[1].trim())) f.extra.limites=lim[1].trim();
  /* 2. atributos */
  let aStart = T.search(/Atributos\s*:/i); if(aStart<0) aStart = T.search(/Atributos/i);
  let sStart = T.search(/Habilidades\s*:/i); if(sStart<0) sStart = T.search(/\bHabilidades\b/i);
  const aSeg = aStart>=0 ? T.slice(aStart, sStart>aStart ? sStart : aStart+600) : '';
  ATTRS.forEach(a=>{ const m=aSeg.match(new RegExp(a+'\\s*:\\s*\\+?\\s*(\\d+)','i')); if(m) f.attrs[a]=num(m[1]); });
  /* 3. habilidades */
  const sSeg = sStart>=0 ? T.slice(sStart) : T;
  const lvRe = '(Desentrenado|Novato|Competente|Experto|Maestro|Legendario)';
  Object.keys(f.skills).concat(Object.keys(SKILL_ALIAS)).forEach(s=>{
    const m = sSeg.match(new RegExp('(?:^|\\n|→)\\s*'+s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s*:\\s*'+lvRe,'i'));
    if(m){ const k = SKILL_ALIAS[norm(s)] || s; f.skills[k] = LVWORD[norm(m[1])]; }
  });
  /* artes / artesanías */
  const arts=[];
  const reP = new RegExp('(?:Arte\\s*\\/\\s*Artesan[ií]a|Artesan[ií]a|Arte)\\s*\\(([^)]*)\\)\\s*:\\s*'+lvRe,'gi'); let am;
  while((am=reP.exec(sSeg))){ const n=am[1].trim(); if(n && !/^_+$/.test(n)) arts.push({n, v:LVWORD[norm(am[2])]}); }
  const ai = sSeg.search(/Arte\s*\/\s*Artesan[ií]a\s*:\s*\n/i);
  if(ai>=0){
    const after = sSeg.slice(ai).split('\n').slice(1);
    for(const l of after){ const m=l.match(new RegExp('^→?\\s*([^:→]{2,40})\\s*:\\s*'+lvRe,'i')); if(!m) break;
      const n=m[1].trim(); if(Object.keys(f.skills).some(s=>norm(s)===norm(n))) break; arts.push({n, v:LVWORD[norm(m[2])]}); }
  }
  f.artes = arts;
  /* 4. secciones (magia y otros) */
  let mode=null, mType=null, mTier='bas', oSec=null; const talLines=[], titLines=[], idLines=[], razaLines=[];
  for(const ln of lines){
    const h = up(ln), s = SECT[h];
    if(s!==undefined){
      if(s.startsWith('m:')){ mode='m'; mType=s.slice(2); mTier = mType==='hechizo'?'dom':'bas'; }
      else if(s.startsWith('t:')){ if(mode==='m') mTier=s.slice(2); }
      else if(s.startsWith('o:')){ mode='o'; oSec=s.slice(2); }
      continue;
    }
    if(!ln) continue;
    if(mode==='m'){
      const bullet = /^[✦✧•\-–→*❖◆♦]/.test(ln);
      const l = ln.replace(/^[✦✧•\-–→*❖◆♦]\s*/,'');
      const ci = l.indexOf(':');
      let name = ci>0 && ci<80 ? l.slice(0,ci).trim() : (l.length<=60 ? l.trim() : '');
      if(!name) continue;
      const hit = findArcano(name, mType);
      if(!hit && !bullet) continue;
      if(!hit && ci<0 && l.length>60) continue;
      const type = mType==='objeto' && mTier==='' ? 'especial' : mType;
      const nm = hit ? hit.calcName : name;
      if(f.arcanos.some(a=>norm(a.name)===norm(nm))) continue;
      const tier = hit && type!=='especial' ? hit.tier : mTier;
      const nota = hit ? '' : (ci>0 ? l.slice(ci+1).trim().split(/(?<=\.)\s/)[0].slice(0,160) : '');
      f.arcanos.push({type, tier, name:nm, nota});
      continue;
    }
    if(mode==='o'){
      if(oSec==='raza') razaLines.push(ln);
      if(oSec==='idiomas') idLines.push(ln);
      if(oSec==='tal') talLines.push(ln);
      if(oSec==='tit' && !/^(\S )+\S$/.test(ln)) titLines.push(ln);
    }
  }
  /* idiomas */
  const idRe = /^[✦✧•\-–→*]?\s*([A-Za-zÁÉÍÓÚáéíóúÑñü' ]{2,30}?)\s*(?:—|–|-|:|\()\s*(Nativo|Bajo|Medio|Alto|Básico|Intermedio|Avanzado)\b[\)\.]?\s*(.*)$/i;
  const idMap = {basico:'Bajo',intermedio:'Medio',avanzado:'Alto'};
  (idLines.length?idLines:lines).forEach(l=>{ const m=l.match(idRe); if(!m) return;
    const nv = idMap[norm(m[2])] || m[2].charAt(0).toUpperCase()+m[2].slice(1).toLowerCase();
    if(!f.idiomas.some(x=>norm(x.n)===norm(m[1]))) f.idiomas.push({n:m[1].trim(), nivel:nv, nota:m[3].replace(/^[.:\-—\s]+/,'').trim()}); });
  /* trasfondos, ventajas, especializaciones (en toda la parte final) */
  /* desde el primer encabezado de la parte final (IDIOMAS, TRASFONDOS, BIBLIOTECA…), sin importar el orden */
  const heads = [/\n\s*IDIOMAS\b/i, /\n\s*TRASFONDOS?\b/i, /\n\s*BIBLIOTECA\s*\n/i, /\n\s*INFORMANTES\s*\n/i, /\n\s*INFLUENCIA\s*\n/i, /\n\s*SEGUIDORES\s*\n/i, /\n\s*VENTAJAS\b/i]
    .map(r=>T.search(r)).filter(i=>i>=0);
  const oIdx = heads.length ? Math.min(...heads) : 0;
  T.slice(oIdx).split('\n').forEach(l0=>{
    const l = l0.replace(/^[^A-Za-zÁÉÍÓÚáéíóúÑñ0-9]+/,'');
    const bg = leerTrasfondo(l); if(bg){ if(!f.bgs.some(x=>x.t===bg.t&&norm(x.c)===norm(bg.c)&&norm(x.e)===norm(bg.e))) f.bgs.push(bg); return; }
    let m;
    m = l.match(/^(Fama|Orden de Merl[ií]n|Patr[oó]n|Recursos)\s+(IV|I{1,3}|[1-4])\b/i);
    if(m){ const k = ADVS.find(a=>norm(a)===norm(m[1])); if(k) f.adv[k]=Math.max(f.adv[k], ROMAN_N[m[2]]||num(m[2])); return; }
    m = l.match(/^Orden de Merl[ií]n.*?(Primera|Segunda|Tercera)\s+clase/i);
    if(m){ f.adv['Orden de Merlín']=Math.max(f.adv['Orden de Merlín'], {primera:3,segunda:2,tercera:1}[norm(m[1])]); return; }
    m = l.match(/^(Combatiente|Encantador|Hechicero|Jugador de Quidditch|Magizo[oó]logo|Mago Oscuro|Medimago)\s+(I{1,3}|[1-3])\b/i);
    if(m){ const r = ESP_RAMAS.find(x=>norm(x)===norm(m[1])); if(r) f.esp[r]=Math.max(f.esp[r], ROMAN_N[m[2]]||num(m[2])); }
  });
  /* talentos y lazos */
  talLines.forEach(l0=>{
    const l = l0.replace(/^[✦✧•\-–→*]\s*/,'');
    let m = l.match(/^(Lazo|Uni[oó]n|V[ií]nculo)\s*(?:con)?\s*:?\s*(.+)$/i);
    if(m){ const [pj,...rest] = m[2].split(/\s+[—–-]\s+/); const tipo = VINC.find(v=>norm(v)===norm(m[1]))||'Vínculo';
      f.vinculos.push({tipo, pj:pj.trim(), nota:rest.join(' — ').trim()}); return; }
    m = l.match(/^((?:Objeto|Hechizo|Poci[oó]n|Ritual)\s+Inventad[oa])\s*(?::|—|–)?\s*(.+)$/i);
    if(m){ f.talentos.push({n:m[1], nota:m[2].trim()}); return; }
    const pi = l.search(/\s*[(:]|\s+[—–]\s+/);
    const n = (pi>0 ? l.slice(0,pi) : l).trim(); let nota = pi>0 ? l.slice(pi).replace(/^[\s:]+/,'').trim() : '';
    nota = nota.replace(/^[—–]\s*/,'').replace(/^\((.*)\)$/,'$1'); if(/^requiere/i.test(nota)) nota='';
    if(n && n.length<=60) f.talentos.push({n, nota});
  });
  f.titulos = titLines.join('\n');
  /* raza con canje (Semigigante, Semiduende, Semiveela, Metamorfomago): se toma de «Raza:» o de la sección RAZA */
  const RAZAS_C = [['semigigant','Semigigante'],['semiduend','Semiduende'],['semiveel','Semiveela'],['metamorfomag','Metamorfomago']];
  const razaDe = t => { const z = norm(t||'').replace(/[^a-z]/g,''); const h = RAZAS_C.find(([k])=>z.includes(k)); return h ? h[1] : null; };
  if(!razaDe(f.d.raza)){
    const cand = razaLines.concat(lines.filter(l=>/^\W*raza\s*:/i.test(l)).map(l=>l.replace(/^\W*raza\s*:/i,'')));
    for(const l of cand){ const rz = razaDe(l); if(rz){ f.d.raza = rz; break; } }
  }
  const img = String(raw).match(/<img[^>]+src="([^"]+)"/i); if(img) f.extra.foto = img[1];
  const nA=f.arcanos.length, nB=f.bgs.length;
  return {ficha:f, resumen:`${nA} arcano${nA!==1?'s':''}, ${nB} trasfondo${nB!==1?'s':''}, ${f.idiomas.length} idioma${f.idiomas.length!==1?'s':''}`};
}
function setPath(o,p,v){ if(p==='nombre'){ o.nombre=v; return; } const ks=p.split('.'); let x=o; ks.slice(0,-1).forEach(k=>x=x[k]); x[ks[ks.length-1]]=v; }

/* ============ Copiar ficha para el foro (BBCode, modelo oficial) ============ */
function fichaBBCode(){
  const C='#6B62AE', L=(l,v)=>`[color=${C}]▋ ${l}:[/color] ${v||'-'}`, A=(l,v)=>`[color=${C}]→ ${l}:[/color] ${v}`;
  const d=ficha.d, ds=ficha.desc, c=combate(), p=puntos();
  const out=[];
  out.push('[b]DATOS[/b]', L('Nombre y Apellido',ficha.nombre), L('Avatar/PB',d.avatar), L('Multicuenta',d.multicuenta), '',
    L('Lugar de Nacimiento',d.nacimiento), L('Lugar de Residencia',d.residencia), L('Clase Social',d.clase), '',
    L('Fecha de Nacimiento',d.fechaNac), L('Edad',d.edad), L('Etapa',d.etapa), '',
    L('Orientación Sexual',d.orientacion), L('Tipo de Sangre',d.sangre), L('Raza',d.raza), '',
    L('Casa',d.casa), L('Curso',d.curso), L('Facción',d.faccion), L('Equipo de Quidditch',d.quidditch), '');
  out.push('[b]DESC.[/b]', L('Descripción Física',ds.fisica), L('Descripción Psicológica',ds.psico), '',
    L('Punto Fuerte',ds.fuerte), L('Punto Débil',ds.debil), L('Gustos/Aficiones',ds.gustos), L('Fobias/manías',ds.fobias), '',
    L('Historia',ds.historia), L('Familia',ds.familia?'\n'+ds.familia:''), L('Mascota',ds.mascota), '');
  out.push('[b]CARACT.[/b]', `${L('Atributos','')} (Límites: ${ficha.extra.limites||etapaOf().lim||'____'})`.replace(': - (',': ('));
  ATTRS.forEach(a=>out.push(A(a,'+'+num(ficha.attrs[a]))));
  out.push('', L('Habilidades',''));
  ATTRS.forEach(a=>{ out.push(a.toUpperCase());
    SKILLS[a].forEach(s=>{
      if(s===ART){ if(ficha.artes.length){ out.push(A('Arte / Artesanía','')); ficha.artes.forEach(x=>out.push(`→ ${x.n||'___'}: ${SKILL_LV[num(x.v)]}`)); } else out.push(A('Arte / Artesanía (___)',SKILL_LV[0])); return; }
      out.push(A(s,SKILL_LV[sk(s)]));
    }); });
  const at=ficha.attrs, b=s=>BONUS[sk(s)]||0;
  out.push('', L('Combate',''),
    A('Iniciativa',`Percepción (${num(at['Percepción'])}) + Iniciativa (${b('Iniciativa')}) = [b]${c.ini}[/b]`),
    A('Ataque Físico',`Vigor (${num(at.Vigor)}) + Pelea (${b('Pelea')}) = [b]${c.atkF}[/b]`),
    A('Lucha Física',`(Ataque Físico (${c.atkF}) + Defensa (${c.def}) - 5 + Iniciativa (${c.ini})) / 3 = [b]${c.luchaF}[/b]`),
    A('Ataque Mágico',`Poder (${num(at.Poder)}) + Duelo (${b('Duelo')}) = [b]${c.atkM}[/b]`),
    A('Lucha Mágica',`(Ataque Mágico (${c.atkM}) + Defensa (${c.def}) - 5 + Iniciativa (${c.ini})) / 3 = [b]${c.luchaM}[/b]`),
    A('Defensa',`5 + Destreza (${num(at.Destreza)}) + Esquiva (${b('Esquiva')}) = [b]${c.def}[/b]`),
    A('PAs',`Base (${c.E.pa}) + Vigor (${num(at.Vigor)}) + Voluntad (${num(at.Voluntad)}) = [b]${c.pa}[/b]`),
    A('Umbral de heridas',`Base (${c.E.u}) + Vigor (${num(at.Vigor)}) = [b]${c.umbral}[/b]`),
    A('Heridas',`Base (${c.E.h}) + Voluntad (${num(at.Voluntad)}) = [b]${c.heridas}[/b]`), '',
    L('Puntos de Pociones',`${p.ppTxt} = [b]${p.pp}[/b]`), L('Puntos de Rituales',`${p.prTxt} = [b]${p.pr}[/b]`), '',
    L('Puntos de Destino',`[b]${num(ficha.extra.pd)}[/b]`), L('Pérdida de Puntos de Destino',ficha.extra.pdPerdida), '');
  out.push('[b]MAGIA[/b]');
  MG_TYPES.forEach(T=>{
    const items=ficha.arcanos.filter(a=>a.type===T.k); if(!items.length) return;
    out.push(`[b]${T.l.toUpperCase()}[/b]`);
    MG_TIERS[T.k].concat(['']).filter((t,i,a)=>a.indexOf(t)===i).forEach(t=>{
      const g=items.filter(a=>(a.tier||'')===t); if(!g.length) return;
      out.push(tierLbl(T.k,t,true).toUpperCase());
      g.forEach(a=>out.push(`[color=#AD9CBC]✦[/color] ${a.name}${a.nota?': '+a.nota:''}`));
    });
    out.push('');
  });
  out.push('[b]OTROS[/b]', `[b]RAZA:[/b] ${d.raza||'Humana'}`);
  if(ficha.idiomas.length){ out.push('[b]IDIOMAS:[/b]'); ficha.idiomas.forEach(x=>out.push(`✦ [b]${x.n} — ${x.nivel}[/b]${x.nota?'. '+x.nota:''}`)); }
  if(ficha.bgs.length){ out.push('[b]TRASFONDOS:[/b]'); ficha.bgs.forEach(x=>out.push(`[b]${x.t} — ${x.c}${x.e?' — '+x.e:''} ${['','I','II','III','IV','V','VI'][num(x.v)]||x.v}[/b]${x.nota?': '+x.nota:''}`)); }
  const adv=ADVS.filter(a=>num(ficha.adv[a])>0); if(adv.length){ out.push('[b]VENTAJAS:[/b]'); adv.forEach(a=>out.push(`[b]${a} ${['','I','II','III','IV'][num(ficha.adv[a])]}[/b]`)); }
  const esp=ESP_RAMAS.filter(r=>num(ficha.esp[r])>0); if(esp.length){ out.push('[b]ESPECIALIZACIONES:[/b]'); esp.forEach(r=>{ for(let i=1;i<=num(ficha.esp[r]);i++) out.push(`[b]${r} ${['','I','II','III'][i]}[/b]`); }); }
  if(ficha.talentos.length||ficha.vinculos.length){ out.push('[b]TALENTOS:[/b]'); ficha.talentos.forEach(x=>out.push(`[b]${x.n}${/inventad/i.test(x.n)&&x.nota?':':''}[/b]${x.nota?(/inventad/i.test(x.n)?' ':' — ')+x.nota:''}`)); ficha.vinculos.forEach(x=>out.push(`[b]${x.tipo}:[/b] ${x.pj}${x.nota?' — '+x.nota:''}`)); }
  if(ficha.titulos.trim()){ out.push('[b]TÍTULOS ACADÉMICOS:[/b]', ficha.titulos.trim()); }
  if(ficha.otros.trim()) out.push('', ficha.otros.trim());
  return out.join('\n');
}

/* ============ Calculadora <-> ficha ============ */
/* R07 (8c): la traducción de nombres (Esquivar → Esquiva…) sale de data/sistema.json (SK_MAP de datos.js) */
const SK_BACK = Object.fromEntries(Object.entries(SK_MAP).map(([k,v])=>[v,k]));
function traerCalculadora(){
  if(typeof TC.state==='undefined'){ toast('No encuentro la calculadora'); return; }
  ATTRS.forEach(a=>{ if(TC.state.statsBase[a]!==undefined) ficha.attrs[a]=Math.max(num(ficha.attrs[a]), TC.state.statsBase[a]); });
  Object.entries(TC.state.skillsBase).forEach(([s,v])=>{ const k=SK_MAP[s]||s; if(k in ficha.skills) ficha.skills[k]=Math.max(num(ficha.skills[k]),v); });
  Object.entries(TC.state.ventBase).forEach(([v,n])=>{ if(v in ficha.adv) ficha.adv[v]=Math.max(num(ficha.adv[v]),n); });
  if(typeof TC.espLevel==='function') ESP_RAMAS.forEach(r=>{ ficha.esp[r]=Math.max(num(ficha.esp[r]), Math.min(3, TC.espLevel(r))); });
  TC.state.cart.forEach(i=>{
    const m=i.meta||{};
    if(m.kind==='arte'){ const n=m.name.replace(/^(Arte|Artesanía) \((.*)\)$/,'$2'); const ex=ficha.artes.find(x=>norm(x.n)===norm(n)); if(ex) ex.v=Math.max(num(ex.v),m.to); else ficha.artes.push({n,v:m.to}); }
    if(m.kind==='trasf' && m.tipo){ const ex=ficha.bgs.find(b=>norm(b.t)===norm(m.tipo)&&norm(b.c)===norm(m.cat)&&norm(b.e)===norm(m.esp)); if(ex) ex.v=Math.max(num(ex.v),m.to); else ficha.bgs.push({t:m.tipo,c:m.cat,e:m.esp,v:m.to,nota:''}); }
    if(m.kind==='arcano' && !hasArc(m.name)) ficha.arcanos.push({type:m.type, tier:m.tier, name:m.name, nota:''});
    if(m.talent && m.kind!=='lazo' && !ficha.talentos.some(t=>norm(t.n)===norm(m.talent) && norm(t.nota)===norm(m.detalle||''))) ficha.talentos.push({n:m.talent, nota:m.detalle||''});
    if(m.kind==='lazo' && !ficha.vinculos.some(v=>norm(v.pj)===norm(m.detalle))) ficha.vinculos.push({tipo:m.talent, pj:m.detalle, nota:''});
    if(i.cat==='IDIOMAS'){ const nv=(i.line.match(/→ (\w+) —/)||[])[1]; const ex=ficha.idiomas.find(x=>norm(x.n)===norm(m.name)); if(ex){ if(nv) ex.nivel=nv; } else ficha.idiomas.push({n:m.name, nivel:nv||'Bajo', nota:''}); }
    if(i.cat==='TÍTULOS ACADÉMICOS'){ const t=i.line.split(' — ')[0]; if(!ficha.titulos.includes(t)) ficha.titulos=(ficha.titulos?ficha.titulos+'\n':'')+t; }
    if(i.cat==='RAZA' && m.raza) ficha.d.raza=m.name;
  });
  if(TC.state.pdActuales) ficha.extra.pd=Math.max(num(ficha.extra.pd), TC.state.pdActuales);
  persist(); renderFicha(); toast('Niveles traídos de la calculadora');
}
$('#f-sync').onclick=()=>traerCalculadora();
function llevarCalculadora(){
  if(typeof TC.state==='undefined'){ toast('No encuentro la calculadora'); return; }
  if(TC.state.cart.length && !window.confirm('Esto pone en la calculadora los niveles de tu ficha como «nivel actual». El carrito no se toca. ¿Seguir?')) return;
  ATTRS.forEach(a=>{ const v=Math.min(8,num(ficha.attrs[a])); TC.state.statsBase[a]=v; TC.state.statsTarget[a]=Math.min(v+1,8); });
  Object.keys(ficha.skills).forEach(s=>{ const k=SK_BACK[s]||s; if(k in TC.state.skillsBase){ const v=Math.min(5,num(ficha.skills[s])); TC.state.skillsBase[k]=v; TC.state.skillsTarget[k]=Math.min(v+1,5); } });
  ADVS.forEach(a=>{ if(a in TC.state.ventBase){ const v=Math.min(3,num(ficha.adv[a])); TC.state.ventBase[a]=v; TC.state.ventTarget[a]=Math.min(v+1,3); } });
  ESP_RAMAS.forEach(r=>{ if(r in TC.state.espOwned) TC.state.espOwned[r]=Math.min(3,num(ficha.esp[r])); });
  ['hechizo','pocion','ritual'].forEach(t=>['bas','int','ava'].forEach(tr=>{ TC.state.arcOwned[t][tr]=ficha.arcanos.filter(a=>a.type===t&&a.tier===tr).length; }));
  TC.state.pdActuales = num(ficha.extra.pd);
  TC.state.bgsBase = {}; (ficha.bgs||[]).forEach(b=>{ if(!b || !b.t) return; const n = b.e ? `${b.t} ${b.c} > ${b.e}` : `${b.t} ${b.c}`; TC.state.bgsBase[n] = Math.max(TC.state.bgsBase[n]||0, num(b.v)); });
  if(typeof TC.renderAll==='function') TC.renderAll();
  toast('Listo: tu ficha ya está cargada en la Tabla de Canjes');
}
$('#f-push').onclick=()=>llevarCalculadora();

/* ============ Diálogo ============ */
let dlgCb=null;
function openDlg(t,p,val,cb,okLabel){
  $('#dlg-t').textContent=t; $('#dlg-p').textContent=p; const ta=$('#dlg-ta'); ta.value=val; ta.readOnly=!cb;
  dlgCb=cb; const ok=$('#dlg-ok'); ok.textContent=cb?(okLabel||'Aceptar'):'Copiar';
  $('#dlg').showModal(); if(!cb){ ta.select(); }
}
$('#dlg-cancel').onclick=()=>$('#dlg').close();
$('#ct-ref-x').onclick=()=>$('#ct-ref').close();
$('#ct-ref').addEventListener('click', e=>{ if(e.target.id==='ct-ref') e.target.close(); });
$('#dlg-ok').onclick=()=>{
  const ta=$('#dlg-ta');
  if(!dlgCb){ copy(ta.value); return; }
  try{ dlgCb(ta.value); $('#dlg').close(); }catch(e){ toast('Ese código no es válido'); }
};

/* ============ Código de la ficha para el foro (compacta, extendida o personalizada) ============ */
const withF = (f, fn) => { const o = ficha; ficha = f; try { return fn(); } finally { ficha = o; } };
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];
function plantillaDe(f) { f.plantilla = f.plantilla || { modo: 'compacta', codigo: '', base: null }; return f.plantilla; }

/* ---- contenido común (el mismo texto que pide el Modelo de Ficha del foro) ---- */
function seccionesFicha(C) {
  const L = (l, v) => `[color=${C}]▋ ${l}:[/color] ${v || '-'}`, A = (l, v) => `[color=${C}]→ ${l}:[/color] ${v}`;
  const d = ficha.d, ds = ficha.desc, c = combate(), p = puntos(), at = ficha.attrs, b = s => BONUS[sk(s)] || 0;
  const S = {};
  S.datos = [L('Nombre y Apellido', ficha.nombre), L('Avatar/PB', d.avatar), L('Multicuenta', d.multicuenta), '',
    L('Lugar de Nacimiento', d.nacimiento), L('Lugar de Residencia', d.residencia), L('Clase Social', d.clase), '',
    L('Fecha de Nacimiento', d.fechaNac), L('Edad', d.edad), L('Etapa', d.etapa), '',
    L('Orientación Sexual', d.orientacion), L('Tipo de Sangre', d.sangre), L('Raza', d.raza), '',
    L('Casa', d.casa), L('Curso', d.curso), L('Facción', d.faccion), L('Equipo de Quidditch', d.quidditch)].join('\n');
  S.desc = [L('Descripción Física', ds.fisica), L('Descripción Psicológica', ds.psico), '',
    L('Punto Fuerte', ds.fuerte), L('Punto Débil', ds.debil), L('Gustos/Aficiones', ds.gustos), L('Fobias/manías', ds.fobias), '',
    L('Historia', ds.historia), L('Familia', ds.familia ? '\n' + ds.familia : ''), L('Mascota', ds.mascota)].join('\n');
  S.atributos = [`[color=${C}]▋ Atributos:[/color] (Límites: ${ficha.extra.limites || etapaOf().lim || '____'})`]
    .concat(ATTRS.map(a => A(a, '+' + num(at[a])))).join('\n');
  S.habs = {};
  ATTRS.forEach(a => {
    const out = [];
    SKILLS[a].forEach(s => {
      if (s === ART) {
        if (ficha.artes.length) ficha.artes.forEach(x => out.push(A(`Arte / Artesanía (${x.n || '___'})`, SKILL_LV[num(x.v)])));
        else out.push(A('Arte / Artesanía (___)', SKILL_LV[0]));
        return;
      }
      out.push(A(s, SKILL_LV[sk(s)]));
    });
    S.habs[a] = out.join('\n');
  });
  S.combate = [`[color=${C}]▋ Combate:[/color]`,
    A('Iniciativa', `${c.t.ini} = [b]${c.ini}[/b]`),
    A('Ataque Físico', `${c.t.atkF} = [b]${c.atkF}[/b]`),
    A('Lucha Física', `${c.t.luchaF} = [b]${c.luchaF}[/b]`),
    A('Ataque Mágico', `${c.t.atkM} = [b]${c.atkM}[/b]`),
    A('Lucha Mágica', `${c.t.luchaM} = [b]${c.luchaM}[/b]`),
    A('Defensa', `${c.t.def} = [b]${c.def}[/b]`),
    A('PAs', `${c.t.pa} = [b]${c.pa}[/b]`),
    A('Umbral de heridas', `${c.t.umbral} = [b]${c.umbral}[/b]`),
    A('Heridas', `${c.t.heridas} = [b]${c.heridas}[/b]`), '',
    L('Puntos de Pociones', `${p.ppTxt} = [b]${p.pp}[/b]`), L('Puntos de Rituales', `${p.prTxt} = [b]${p.pr}[/b]`), '',
    L('Puntos de Destino', `[b]${num(ficha.extra.pd)}[/b]`), L('Pérdida de Puntos de Destino', ficha.extra.pdPerdida)].join('\n');
  const arcList = k => {
    const items = ficha.arcanos.filter(a => a.type === k); if (!items.length) return '-';
    const out = [];
    (MG_TIERS[k] || ['']).concat(['']).filter((t, i, a) => a.indexOf(t) === i).forEach(t => {
      const g = items.filter(a => (a.tier || '') === t); if (!g.length) return;
      out.push(`[b]${tierLbl(k, t, true).toUpperCase()}[/b]`);
      g.forEach(a => out.push(`✦ ${a.name}${a.nota ? ': ' + a.nota : ''}`));
    });
    return out.join('\n');
  };
  S.hechizos = arcList('hechizo'); S.pociones = arcList('pocion'); S.rituales = arcList('ritual');
  S.objetos = [arcList('objeto'), ficha.arcanos.some(a => a.type === 'especial') ? arcList('especial') : ''].filter(x => x && x !== '-').join('\n\n') || '-';
  S.quidditch = arcList('quidditch');
  S.raza = d.raza || 'Humana';
  S.idiomas = ficha.idiomas.length ? ficha.idiomas.map(x => `✦ [b]${x.n} — ${x.nivel}[/b]${x.nota ? '. ' + x.nota : ''}`).join('\n') : '-';
  S.trasfondos = ficha.bgs.length ? ficha.bgs.map(x => `✦ [b]${x.t} — ${x.c}${x.e ? ' — ' + x.e : ''} ${ROMAN[num(x.v)] || x.v}[/b]${x.nota ? ': ' + x.nota : ''}`).join('\n') : '-';
  const adv = ADVS.filter(a => num(ficha.adv[a]) > 0);
  S.ventajas = adv.length ? adv.map(a => `✦ [b]${a} ${ROMAN[num(ficha.adv[a])]}[/b]`).join('\n') : '-';
  const esp = ESP_RAMAS.filter(r => num(ficha.esp[r]) > 0);
  S.esp = esp.length ? esp.map(r => `✦ [b]${r} ${ROMAN[num(ficha.esp[r])]}[/b]`).join('\n') : '-';
  const tal = ficha.talentos.map(x => `✦ [b]${x.n}[/b]${x.nota ? (/inventad/i.test(x.n) ? ': ' : ' — ') + x.nota : ''}`)
    .concat(ficha.vinculos.map(x => `✦ [b]${x.tipo}:[/b] ${x.pj}${x.nota ? ' — ' + x.nota : ''}`));
  S.talentos = tal.length ? tal.join('\n') : '-';
  S.titulos = ficha.titulos.trim() || '-';
  if (ficha.otros.trim()) S.titulos += '\n\n' + ficha.otros.trim();
  return S;
}

/* ---- Modelo compacto oficial ---- */
function codigoCompacto() {
  const C = '#7c623e', S = seccionesFicha(C);
  const foto = ficha.extra.foto || 'URL_IMAGEN_200X225_AQUÍ';
  const tab = (i, lab, cont) => `<div class="tabb"><input id="tabb-${i}" name="tabb-group-1"${i === 1 ? ' checked=""' : ''} type="radio"><label for="tabb-${i}"><font style="font: 12px Cinzel; font-weight: bold; text-transform: uppercase; color: #7c623e; padding: 10px; line-height: 18px; letter-spacing: 1px; border-bottom: 1px solid #7c623e;">${lab}</font></label><div class="contento">${cont}\n</div></div>`;
  const sp = (t, v) => `[spoiler=${t}]${v}[/spoiler]`;
  const caract = S.atributos + '\n\n' + `[color=${C}]▋ Habilidades:[/color]\n` + ATTRS.map(a => sp(a.toUpperCase(), S.habs[a])).join('\n') + '\n\n' + S.combate + '\n';
  const magia = [sp('HECHIZOS', S.hechizos), sp('POCIONES', S.pociones), sp('RITUALES', S.rituales), sp('OBJETOS/ARMAS', S.objetos), sp('QUIDDITCH', S.quidditch)].join('\n');
  const otros = [sp('RAZA', S.raza), sp('IDIOMAS', S.idiomas), sp('TRASFONDOS', S.trasfondos), sp('VENTAJAS', S.ventajas), sp('ESPECIALIZACIONES', S.esp), sp('TALENTOS', S.talentos), sp('TÍTULOS ACADÉMICOS', S.titulos)].join('\n');
  return `<center><div><div style="width: 580px; background-image: url('https://i.imgur.com/Kbj4Atj.jpg'); border: 0px none; border-radius: 0px 0px 10px 10px;"><div style="width: 540px; background-image: url('https://i.imgur.com/pe6iaP5.png'); border: 0px none; border-radius: 0px 0px 0px 0px;"><div style="font-family: Cinzel; color: #6d5737; font-size: 24px; width: 540px; text-align: center; letter-spacing: 1px;"><strong>Ficha de Personaje</strong></div><div style="width: 500px; padding: 20px;"><div id="imagen1" style="background: url('https://i.imgur.com/kbSLbwo.jpg');"><td><div class="imagen2" style="background: url('${foto}'); border: 1px solid #2C2C2C;"></div></td></tr></table></div><br>\n`
    + `<div class="tabss">${tab(1, 'Datos', S.datos)}${tab(2, 'Desc.', S.desc)}${tab(3, 'Caract.', caract)}${tab(4, 'Magia', magia)}${tab(5, 'Otros', otros)}</div></div>\n`
    + `<style>.tabss {position: relative; overflow: hidden; width: 500px; height: 500px; padding: 10px;} .tabb {float: left;} .tabb label {padding: 15px; margin-left: -3px; position: relative; text-align: center; width:100px; height:20px;} .tabb [type=radio] {display: none;} .contento {border:1px solid #2C2C2C;border-radius: 10px 10px 10px 10px; position: absolute; top: 60px; left: 0px; height: 420px; width: 470px; background: #121111; color:#797969; padding: 15px; outline: 1px solid #000;overflow: auto;font: 11px verdana;text-align: justify; line-height: 20px;} .tabb [type=radio]:checked ~ label { z-index: 2;} .tabb [type=radio]:checked ~ label ~ .contento {z-index: 1;} #imagen1 {width:500px; height: 250px; outline: 1px solid #2C2C2C; overflow: hidden;} .imagen2 {width:200px; height:225px; margin-left: 275px; margin-top: 10px; margin-bottom: 5px;}</style></div></div></div></center>`;
}

/* ---- Modelo extendido oficial (dos mensajes) ---- */
function codigoExtendido() {
  const C = '#7c623e', S = seccionesFicha(C);
  const head = `<center><div style="width: 580px; background-image: url('https://i.imgur.com/Kbj4Atj.jpg'); border: 0px none; border-radius: 0px 0px 10px 10px;"><div style="width: 540px; background-image: url('https://i.imgur.com/pe6iaP5.png'); border: 0px none; border-radius: 0px 0px 0px 0px;"><img style="display: inline;" class="" src="https://i.imgur.com/9wKwLj2.jpg" alt=""><div style="width: 500px; font-family: georgia; font-size: 14px; text-align: justify; line-height: 18px; padding-left: 5px; margin-top: 5px; color: #797969;">\n`;
  const box = (t, v) => `<span class="scaja-subtitle">${t}</span><div class="scaja-content" style="padding=2px; width: auto;">${v}\n</div>`;
  const sp = (t, v) => `[spoiler=▋ ${t}]${v}[/spoiler]`;
  const img = ficha.extra.foto || 'https://i.imgur.com/7Be0VDk.jpg';
  const frase = ficha.extra.frase || 'Frase que te caracterice';
  const p1 = head + `<span class="scaja-title">FICHA DE PERSONAJE\nAVADA KEDAVRA</span>\n\n[center][img]${img}[/img]\n[color=#797969][i]"${frase}"[/i][/color][/center]\n[hr]\n`
    + box('Datos Básicos', S.datos) + '\n\n' + box('{Descripciones»', S.desc) + '\n</div></div></div></center>';
  const habs = `[color=${C}]▋ Habilidades[/color]\n` + ATTRS.map(a => `[spoiler=${a.toUpperCase()}]${S.habs[a]}[/spoiler]`).join('\n');
  const p2 = head + box('Atributos', S.atributos) + '\n\n' + box('Habilidades', habs) + '\n\n' + box('Acceso rápido', S.combate) + '\n\n'
    + box('MAGIA', [sp('HECHIZOS', S.hechizos), sp('POCIONES', S.pociones), sp('RITUALES', S.rituales), sp('OBJETOS/ARMAS', S.objetos), sp('QUIDDITCH', S.quidditch)].join('\n')) + '\n\n'
    + box('CANJES', [sp('RAZA', S.raza), sp('IDIOMAS', S.idiomas), sp('TRASFONDOS', S.trasfondos), sp('VENTAJAS', S.ventajas), sp('ESPECIALIZACIONES', S.esp), sp('TALENTOS', S.talentos), sp('TÍTULOS ACADÉMICOS', S.titulos)].join('\n'))
    + '\n<div class="scaja-credit">FICHA DISEÑADA EXCLUSIVAMENTE PARA AVADA KEDAVRA</div>\n</div></div></div></center>';
  return [p1, p2];
}

/* ---- Ficha personalizada: se edita el código guardado sólo donde cambió algo ---- */
const reEsc = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const CLOSE = '(?:\\s*(?:\\[\\/(?:color|b|i|u|font|size)\\]|<\\/(?:span|b|strong|i|em|font)>))*';
const plain = s => String(s || '').replace(/\[[^\]]*\]/g, '').replace(/<[^>]*>/g, '').trim();
const BULLET = /^[\s✦•→\-*✿❀◆·❁✾✧▸►»]+/;
const lineKey = l => plain(l).replace(BULLET, '').trim();
const fichaClone = f => JSON.parse(JSON.stringify(f));

// campos de una línea / varias líneas
const CAMPOS = [
  ['nombre', 'Nombre y Apellido'], ['d.avatar', 'Avatar/PB'], ['d.avatar', 'Avatar'], ['d.multicuenta', 'Multicuentas?'],
  ['d.nacimiento', 'Lugar de Nacimiento'], ['d.residencia', 'Lugar de Residencia'], ['d.clase', 'Clase Social'],
  ['d.fechaNac', 'Fecha de Nacimiento'], ['d.edad', 'Edad'], ['d.etapa', 'Etapa'], ['d.orientacion', 'Orientación Sexual'],
  ['d.sangre', 'Tipo de Sangre'], ['d.raza', 'Raza'], ['d.casa', 'Casa'], ['d.curso', 'Curso'], ['d.faccion', 'Facción'],
  ['d.quidditch', 'Equipo de Quidditch'], ['desc.fuerte', 'Puntos? Fuertes?'], ['desc.debil', 'Puntos? Débil(?:es)?'],
  ['desc.gustos', 'Gustos ?\\/ ?Aficiones'], ['desc.fobias', 'Fobias ?\\/ ?[Mm]anías'], ['desc.mascota', 'Mascotas?'],
  ['extra.pdPerdida', 'Pérdida de Puntos de Destino']
];
const CAMPOS_LARGOS = [['desc.fisica', 'Descripción Física'], ['desc.psico', 'Descripción Psicológica'], ['desc.historia', 'Historia'], ['desc.familia', 'Familia']];
const getPath = (f, p) => p === 'nombre' ? f.nombre : p.split('.').reduce((o, k) => o ? o[k] : '', f);

/* N07: con el editor nuevo (js/pam/EditorPam.js, lo deja js/pam/arranque.js); si no está o falla, el de antes */
function actualizarCodigo(codigo, base, cur) {
  if (window.PAM_EDITOR) { try { return window.PAM_EDITOR.actualizar(codigo, base, cur); } catch (e) { console.warn('[PAM] editor nuevo del código, uso el de antes:', e); } }
  return actualizarCodigoAntiguo(codigo, base, cur);
}
function actualizarCodigoAntiguo(codigo, base, cur) {
  let code = String(codigo);
  const hechos = [], manual = [];
  const rep = (re, fn, what) => { let n = 0; code = code.replace(re, (...m) => { n++; return fn(...m); }); if (n) hechos.push(what); return n; };
  const valOk = v => String(v ?? '').trim();
  // 1. campos simples
  const vistos = new Set();
  CAMPOS.forEach(([p, lab]) => {
    if (vistos.has(p)) return;
    const a = valOk(getPath(base, p)), b = valOk(getPath(cur, p));
    if (a === b) return;
    const re = new RegExp(`(▋\\s*(?:${lab})\\s*:${CLOSE}[ \\t]*)([^\\n<]*?)([ \\t]*)(?=\\n|<|\\[\\/spoiler\\]|$)`, 'i');
    if (rep(re, (m, pre, v, sp) => pre + (b || '-') + sp, labelDe(p))) vistos.add(p);
    else if (!/Avatar$/.test(lab)) manual.push(`${labelDe(p)}: no encontré dónde va en tu código (nuevo valor: ${b || '-'})`);
  });
  // 2. campos largos (hasta la siguiente etiqueta ▋ o el cierre del bloque)
  CAMPOS_LARGOS.forEach(([p, lab]) => {
    const a = valOk(getPath(base, p)), b = valOk(getPath(cur, p));
    if (a === b) return;
    const re = new RegExp(`(▋\\s*${lab}\\s*:${CLOSE}[ \\t]*)([\\s\\S]*?)(?=\\n[^\\n]*▋|<\\/div>|\\[\\/spoiler\\]|<\\/details>|$)`, 'i');
    if (!rep(re, (m, pre, seg) => pre + mezclarLineas(seg, b || '-'), labelDe(p))) manual.push(`${labelDe(p)}: no la encontré en tu código`);
  });
  // 3. cabecera: foto, apodo, ocupación (se reemplaza el texto viejo exacto)
  [['extra.foto', 'Imagen'], ['extra.kicker', 'Nombre en su idioma'], ['extra.ocupacion', 'Ocupación'], ['extra.frase', 'Frase']].forEach(([p, l]) => {
    const a = valOk(getPath(base, p)), b = valOk(getPath(cur, p));
    if (a === b || !b) return;
    if (a.length >= 3 && code.includes(a)) { code = code.split(a).join(b); hechos.push(l); }
    else manual.push(`${l}: cambiala a mano (nuevo: ${b})`);
  });
  // límites
  if (valOk(base.extra.limites) !== valOk(cur.extra.limites) && cur.extra.limites)
    rep(/(Límites:\s*)([^)\n]*)(\))/i, (m, a, v, c) => a + cur.extra.limites + c, 'Límites');
  // 4. atributos
  ATTRS.forEach(at => {
    if (num(base.attrs[at]) === num(cur.attrs[at])) return;
    const re = new RegExp(`(→\\s*${reEsc(at)}\\s*:${CLOSE}[ \\t]*)([+-]?\\d*)`, 'i');
    if (!rep(re, (m, pre) => pre + '+' + num(cur.attrs[at]), at)) manual.push(`Atributo ${at}: no lo encontré`);
  });
  // 5. habilidades
  const LV = '(?:Desentrenad[oa]|Novat[oa]|Competente|Expert[oa]|Maestr[oa]|Legendari[oa])\\s*\\(\\+\\d+\\)(?:\\s*\\/[^\\n]*)?';
  Object.keys(cur.skills).forEach(s => {
    if (num(base.skills[s]) === num(cur.skills[s])) return;
    const re = new RegExp(`(→\\s*${reEsc(s)}\\s*:${CLOSE}[ \\t]*)(${LV})`, 'i');
    if (!rep(re, (m, pre) => pre + SKILL_LV[num(cur.skills[s])], s)) manual.push(`Habilidad ${s}: no la encontré`);
  });
  cur.artes.forEach(x => {
    const old = base.artes.find(y => norm(y.n) === norm(x.n));
    if (old && num(old.v) === num(x.v)) return;
    const re = new RegExp(`(→\\s*(?:Arte\\s*\\/\\s*Artesanía\\s*\\(\\s*)?${reEsc(x.n)}\\s*\\)?\\s*:${CLOSE}[ \\t]*)(${LV})`, 'i');
    if (!rep(re, (m, pre) => pre + SKILL_LV[num(x.v)], `Arte/Artesanía (${x.n})`)) manual.push(`Arte/Artesanía ${x.n}: agregala a mano (${SKILL_LV[num(x.v)]})`);
  });
  base.artes.forEach(x => { if (!cur.artes.some(y => norm(y.n) === norm(x.n))) manual.push(`Arte/Artesanía ${x.n}: la quitaste, borrala a mano`); });
  // 6. combate y puntos: se recalculan si cambió algo de lo que los compone
  const cB = withF(base, combate), cC = withF(cur, combate), pB = withF(base, puntos), pC = withF(cur, puntos);
  const C2 = cur.attrs, bb = s => BONUS[num(cur.skills[s])] || 0;
  const comb = [
    ['Iniciativa', `${cC.t.ini} = [b]${cC.ini}[/b]`, cB.t.ini !== cC.t.ini],
    ['Ataque Físico', `${cC.t.atkF} = [b]${cC.atkF}[/b]`, cB.t.atkF !== cC.t.atkF],
    ['Lucha Física', `${cC.t.luchaF} = [b]${cC.luchaF}[/b]`, cB.t.luchaF !== cC.t.luchaF],
    ['Ataque Mágico', `${cC.t.atkM} = [b]${cC.atkM}[/b]`, cB.t.atkM !== cC.t.atkM],
    ['Lucha Mágica', `${cC.t.luchaM} = [b]${cC.luchaM}[/b]`, cB.t.luchaM !== cC.t.luchaM],
    ['Defensa', `${cC.t.def} = [b]${cC.def}[/b]`, cB.t.def !== cC.t.def],
    ['PAs', `${cC.t.pa} = [b]${cC.pa}[/b]`, cB.t.pa !== cC.t.pa],
    ['Umbral de heridas', `${cC.t.umbral} = [b]${cC.umbral}[/b]`, cB.t.umbral !== cC.t.umbral],
    ['Heridas', `${cC.t.heridas} = [b]${cC.heridas}[/b]`, cB.t.heridas !== cC.t.heridas]
  ];
  const ci = code.search(/▋\s*Combate/i);
  if (ci >= 0) {
    let head = code.slice(0, ci), tail = code.slice(ci);
    comb.forEach(([l, v, changed]) => {
      if (!changed && !(cur.plantilla && cur.plantilla.forzarCombate)) return;
      const re = new RegExp(`(→\\s*${reEsc(l)}\\s*:${CLOSE}[ \\t]*)([^\\n<]*)`, 'i');
      let n = 0; tail = tail.replace(re, (m, pre) => { n++; return pre + v; });
      if (n) hechos.push(`Combate: ${l}`); else manual.push(`Combate ${l}: no lo encontré (${v.replace(/\[\/?b\]/g, '')})`);
    });
    code = head + tail;
  } else if (comb.some(x => x[2]) || (cur.plantilla && cur.plantilla.forzarCombate)) manual.push('Combate: no encontré el bloque «▋ Combate» para recalcularlo');
  const FZ = !!(cur.plantilla && cur.plantilla.forzarCombate);
  if (FZ || pB.pp !== pC.pp || pB.ppTxt !== pC.ppTxt) rep(/(▋\s*Puntos de Pociones\s*:(?:\s*(?:\[\/color\]|<\/span>|<\/b>))*[ \t]*)([^\n<]*)/i, (m, pre) => pre + `${pC.ppTxt} = [b]${pC.pp}[/b]`, 'Puntos de Pociones');
  if (FZ || pB.pr !== pC.pr || pB.prTxt !== pC.prTxt) rep(/(▋\s*Puntos de Rituales\s*:(?:\s*(?:\[\/color\]|<\/span>|<\/b>))*[ \t]*)([^\n<]*)/i, (m, pre) => pre + `${pC.prTxt} = [b]${pC.pr}[/b]`, 'Puntos de Rituales');
  if (num(base.extra.pd) !== num(cur.extra.pd)) rep(/(▋\s*Puntos de Destino\s*:(?:\s*(?:\[\/color\]|<\/span>|<\/b>))*[ \t]*)(?:\[b\])?\d+(?:\[\/b\])?/i, (m, pre) => pre + `[b]${num(cur.extra.pd)}[/b]`, 'Puntos de Destino');
  // 7. listas (arcanos, trasfondos, idiomas, talentos...): por líneas
  let lines = code.split('\n');
  const findLine = (name, from) => { const n = norm(name); for (let i = 0; i < lines.length; i++) { const k = norm(lineKey(lines[i])); if (k === n || k.startsWith(n + ':') || k.startsWith(n + ' :') || k.startsWith(n + ' —') || k.startsWith(n + ' -') || k.startsWith(n + '.')) return i; } return -1; };
  const cloneLine = (i, oldName, newText) => {
    const l = lines[i]; const at = l.indexOf(oldName);
    if (at < 0) return null;
    const suf = (l.match(/((?:\[\/\w+\]|<\/\w+>)\s*)+$/) || [''])[0];
    const pre = l.slice(0, at);
    // si el prefijo abre etiquetas que se cierran justo tras el nombre ([b]Nombre[/b]: nota), respetarlas
    const afterName = l.slice(at + oldName.length).match(/^((?:\[\/\w+\]|<\/\w+>)*)/)[1];
    return pre + newText.name + afterName + (newText.rest || '') + (afterName ? '' : suf);
  };
  // arcanos
  const kA = a => norm(a.name);
  const quitados = base.arcanos.filter(a => !cur.arcanos.some(b => kA(b) === kA(a)));
  const nuevos = cur.arcanos.filter(a => !base.arcanos.some(b => kA(b) === kA(a)));
  quitados.forEach(a => { const i = findLine(a.name); if (i >= 0) { lines.splice(i, 1); hechos.push(`Quitado: ${a.name}`); } else manual.push(`Arcano ${a.name}: lo quitaste, borralo a mano`); });
  nuevos.forEach(a => {
    const sib = [...cur.arcanos].reverse().find(b => b !== a && b.type === a.type && b.tier === a.tier && base.arcanos.some(x => kA(x) === kA(b)) && findLine(b.name) >= 0)
      || null;
    if (!sib) { manual.push(`Arcano nuevo ${a.name} (${tierLbl(a.type, a.tier)}): agregalo a mano, no encontré otro del mismo tipo y nivel`); return; }
    const i = findLine(sib.name);
    const nl = cloneLine(i, sib.name, { name: a.name, rest: a.nota ? ': ' + a.nota : '' });
    if (nl == null) { manual.push(`Arcano nuevo ${a.name}: agregalo a mano`); return; }
    lines.splice(i + 1, 0, nl); hechos.push(`Agregado: ${a.name}`);
  });
  cur.arcanos.forEach(a => { const o = base.arcanos.find(b => kA(b) === kA(a)); if (o && (o.tier !== a.tier || o.type !== a.type)) manual.push(`Arcano ${a.name}: cambió de tipo o nivel, movelo a mano`); });
  // trasfondos
  const kB = x => norm(`${x.t}|${x.c}|${x.e}`);
  const bgLine = x => { for (let i = 0; i < lines.length; i++) { const k = norm(lineKey(lines[i])); if (k.includes(norm(x.t)) && k.includes(norm(x.c)) && (x.e ? k.includes(norm(x.e)) : !/(—|>|-)\s*\S+\s+(i|ii|iii|iv|v|vi)\b.*(—|>|-)/.test(k)) && /\b(i|ii|iii|iv|v|vi)\b/.test(k)) { if (!x.e) { const tail = k.split(norm(x.c))[1] || ''; if (/^\s*(—|>|-)\s*[a-z]/.test(tail)) continue; } return i; } } return -1; };
  cur.bgs.forEach(x => {
    const o = base.bgs.find(y => kB(y) === kB(x));
    if (o && num(o.v) === num(x.v)) return;
    if (o) { const i = bgLine(o); if (i >= 0) { const l = lines[i]; const re = new RegExp(`(${reEsc(o.e || o.c)}[^IVX\\n]{0,12}?)\\b(${ROMAN[num(o.v)]})\\b`); if (re.test(l)) { lines[i] = l.replace(re, (m, a) => a + ROMAN[num(x.v)]); hechos.push(`Trasfondo ${x.t} ${x.c}${x.e ? ' > ' + x.e : ''}`); return; } } }
    if (!o) {
      const sibs = base.bgs.filter(y => cur.bgs.some(z => kB(z) === kB(y)));
      const sib = [...sibs].reverse().find(y => y.t === x.t && y.c === x.c) || [...sibs].reverse().find(y => y.t === x.t) || sibs[sibs.length - 1];
      const i = sib ? bgLine(sib) : -1;
      if (i >= 0) {
        const l = lines[i], st = l.indexOf(sib.t), rm = new RegExp(`\\b${ROMAN[num(sib.v)]}\\b`), rest = st >= 0 ? l.slice(st) : '', mm = rest.match(rm);
        if (st >= 0 && mm) {
          const seg = rest.slice(0, mm.index), sep = (seg.match(/\s(—|>|-|–)\s/) || [' — ', '—'])[1];
          const after = rest.slice(mm.index + mm[0].length).match(/^((?:\[\/\w+\]|<\/\w+>)*)/)[1];
          const txt = [x.t, x.c, x.e].filter(Boolean).join(` ${sep} `) + ' ' + ROMAN[num(x.v)];
          lines.splice(i + 1, 0, l.slice(0, st) + txt + after + (x.nota ? ': ' + x.nota : ''));
          hechos.push(`Agregado: ${x.t} ${x.c}${x.e ? ' > ' + x.e : ''}`); return;
        }
      }
    }
    manual.push(`Trasfondo ${x.t} — ${x.c}${x.e ? ' — ' + x.e : ''} ${ROMAN[num(x.v)]}: ${o ? 'cambialo' : 'agregalo'} a mano`);
  });
  base.bgs.forEach(x => { if (!cur.bgs.some(y => kB(y) === kB(x))) manual.push(`Trasfondo ${x.t} — ${x.c}${x.e ? ' — ' + x.e : ''}: lo quitaste, borralo a mano`); });
  // idiomas
  cur.idiomas.forEach(x => {
    const o = base.idiomas.find(y => norm(y.n) === norm(x.n));
    if (o && o.nivel === x.nivel) return;
    if (o) { const i = findLine(o.n); if (i >= 0 && lines[i].includes(o.nivel)) { lines[i] = lines[i].replace(o.nivel, x.nivel); hechos.push(`Idioma ${x.n}`); return; } }
    manual.push(`Idioma ${x.n} (${x.nivel}): ${o ? 'cambialo' : 'agregalo'} a mano`);
  });
  // ventajas y especializaciones
  ADVS.forEach(a => { if (num(base.adv[a]) !== num(cur.adv[a])) { const i = lines.findIndex(l => new RegExp(`${reEsc(a)}\\s+(I|II|III|IV|V)\\b`).test(plain(l))); if (i >= 0 && num(cur.adv[a]) > 0) { lines[i] = lines[i].replace(new RegExp(`(${reEsc(a)}\\s+)(I|II|III|IV|V)\\b`), (m, p) => p + ROMAN[num(cur.adv[a])]); hechos.push(a); } else manual.push(`Ventaja ${a} ${ROMAN[num(cur.adv[a])] || '(quitada)'}: a mano`); } });
  ESP_RAMAS.forEach(r => { if (num(base.esp[r]) !== num(cur.esp[r])) manual.push(`Especialización ${r}: ahora ${ROMAN[num(cur.esp[r])] || 'ninguna'}, revisala a mano`); });
  // talentos y vínculos
  cur.talentos.forEach(x => { if (!base.talentos.some(y => norm(y.n) === norm(x.n) && norm(y.nota) === norm(x.nota))) manual.push(`Talento ${x.n}${x.nota ? ' (' + x.nota + ')' : ''}: agregalo a mano`); });
  base.talentos.forEach(x => { if (!cur.talentos.some(y => norm(y.n) === norm(x.n))) manual.push(`Talento ${x.n}: lo quitaste, borralo a mano`); });
  cur.vinculos.forEach(x => { if (!base.vinculos.some(y => norm(y.pj) === norm(x.pj) && y.tipo === x.tipo)) manual.push(`${x.tipo} con ${x.pj}: agregalo a mano`); });
  if (norm(base.titulos) !== norm(cur.titulos)) manual.push('Títulos académicos: cambiaron, revisalos a mano');
  code = lines.join('\n');
  return { code, hechos: [...new Set(hechos)], manual };
}
// Junta el texto nuevo con el código viejo línea a línea: las líneas que no cambiaron conservan sus enlaces, colores e imágenes.
function mezclarLineas(seg, nuevo) {
  const nk = s => norm(plain(String(s).replace(/\[img[^\]]*\][\s\S]*?\[\/img\]/gi, '').replace(/<img[^>]*>/gi, ''))).replace(/\s+/g, ' ');
  const O = seg.split('\n'), N = nuevo.split('\n').filter(l => l.trim());
  const oi = O.map((l, i) => ({ l, i, k: nk(l) })).filter(x => x.k), nkN = N.map(nk);
  const n = oi.length, m = N.length, L = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = oi[i].k === nkN[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const match = new Map(); let i = 0, j = 0;
  while (i < n && j < m) { if (oi[i].k === nkN[j]) { match.set(oi[i].i, j); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++; }
  const out = []; let nj = 0;
  O.forEach((l, idx) => {
    const k = nk(l);
    if (!k) { out.push(l); return; }
    if (match.has(idx)) { const jj = match.get(idx); while (nj < jj) out.push(N[nj++]); out.push(l); nj = jj + 1; }
  });
  // lo nuevo que quedó al final va antes de las líneas vacías del cierre
  let tailBlank = []; while (out.length && !out[out.length - 1].trim()) tailBlank.unshift(out.pop());
  while (nj < m) out.push(N[nj++]);
  return out.concat(tailBlank).join('\n');
}
function labelDe(p) {
  const m = { nombre: 'Nombre y Apellido', 'd.avatar': 'Avatar/PB', 'd.multicuenta': 'Multicuenta', 'd.nacimiento': 'Lugar de Nacimiento', 'd.residencia': 'Lugar de Residencia', 'd.clase': 'Clase Social', 'd.fechaNac': 'Fecha de Nacimiento', 'd.edad': 'Edad', 'd.etapa': 'Etapa', 'd.orientacion': 'Orientación Sexual', 'd.sangre': 'Tipo de Sangre', 'd.raza': 'Raza', 'd.casa': 'Casa', 'd.curso': 'Curso', 'd.faccion': 'Facción', 'd.quidditch': 'Equipo de Quidditch', 'desc.fuerte': 'Punto Fuerte', 'desc.debil': 'Punto Débil', 'desc.gustos': 'Gustos/Aficiones', 'desc.fobias': 'Fobias/manías', 'desc.mascota': 'Mascota', 'extra.pdPerdida': 'Pérdida de Puntos de Destino', 'desc.fisica': 'Descripción Física', 'desc.psico': 'Descripción Psicológica', 'desc.historia': 'Historia', 'desc.familia': 'Familia' };
  return m[p] || p;
}
const esCodigoForo = t => /\[color=|\[spoiler|<div|<span|<center|\[b\]/i.test(t || '');
function guardarPlantilla(raw, baseFicha) {
  const P = plantillaDe(ficha);
  P.modo = 'personal'; P.codigo = raw; P.base = fichaClone(baseFicha); delete P.base.plantilla; delete P.base.jobState;
}

/* ---- pestaña «Código para el foro» ---- */
function renderCodigo() {
  const P = plantillaDe(ficha);
  const opt = (v, t, d) => `<label class="fc-opt${P.modo === v ? ' on' : ''}"><input type="radio" name="fc-modo" value="${v}" ${P.modo === v ? 'checked' : ''}><span><b>${t}</b><small>${d}</small></span></label>`;
  let h = `<div class="card"><h2>Código de la ficha para el foro</h2>
    <p class="muted small" style="margin-top:-4px">Elegí el modelo. Cada vez que cambies algo en la ficha, el código se actualiza solo: copialo y pegalo al editar tu ficha en el foro.</p>
    <div class="fc-opts">${opt('compacta', 'Compacta', 'El modelo oficial con pestañas (un solo mensaje).')}${opt('extendida', 'Extendida', 'El modelo oficial largo, en dos mensajes (parte 1 y parte 2).')}${opt('personal', 'Personalizada', 'Tu propio diseño: pegás tu código una vez y se edita sólo lo que cambies.')}</div></div>`;
  if (P.modo === 'compacta') {
    h += `<div class="card"><div class="row"><h3 style="margin:0">Modelo compacto</h3><span class="spacer"></span><button class="btn sm primary" data-fc-copy="0">Copiar código</button></div>
      <p class="muted small">La imagen sale del campo «URL de la imagen» (Datos › Cabecera), de 200 × 225.</p><textarea class="fc-out" readonly rows="12" data-fc-out="0">${esc(codigoCompacto())}</textarea></div>`;
  } else if (P.modo === 'extendida') {
    const [p1, p2] = codigoExtendido();
    h += `<div class="card"><label class="fx-f"><span>Frase que te caracterice</span><input type="text" data-p="extra.frase" value="${esc(ficha.extra.frase || '')}" placeholder="Frase que te caracterice"></label>
      <p class="muted small">La imagen sale del campo «URL de la imagen» (Datos › Cabecera).</p></div>
      <div class="card"><div class="row"><h3 style="margin:0">Parte 1 · Datos y descripción</h3><span class="spacer"></span><button class="btn sm primary" data-fc-copy="0">Copiar parte 1</button></div><textarea class="fc-out" readonly rows="9" data-fc-out="0">${esc(p1)}</textarea></div>
      <div class="card"><div class="row"><h3 style="margin:0">Parte 2 · Características, magia y canjes</h3><span class="spacer"></span><button class="btn sm primary" data-fc-copy="1">Copiar parte 2</button></div><textarea class="fc-out" readonly rows="9" data-fc-out="1">${esc(p2)}</textarea></div>`;
  } else {
    if (!P.codigo) {
      h += `<div class="card"><h3>Pegá el código de tu ficha</h3>
        <p class="muted small">En el foro, abrí tu ficha, tocá <b>Editar</b>, copiá todo el mensaje y pegalo acá. Se guarda para este personaje. Si es la primera vez, también podés cargar los datos de la ficha desde ese código.</p>
        <textarea id="fc-in" rows="10" placeholder="<div class=…>[color=…]▋ Nombre y Apellido:[/color] …"></textarea>
        <div class="row" style="margin-top:8px"><button class="btn sm primary" id="fc-save">Guardar mi código</button><button class="btn sm" id="fc-save-load">Guardar y cargar los datos en la ficha</button></div></div>`;
    } else {
      const r = actualizarCodigo(P.codigo, P.base || ficha, ficha);
      h += `<div class="card"><div class="row"><h3 style="margin:0">Tu código actualizado</h3><span class="spacer"></span><button class="btn sm primary" data-fc-copy="0">Copiar código</button></div>
        ${r.hechos.length ? `<p class="small fc-ok">Actualizado: ${r.hechos.map(esc).join(' · ')}</p>` : '<p class="small muted">Todavía no cambiaste nada desde que guardaste tu código: es igual al publicado.</p>'}
        ${r.manual.length ? `<div class="fc-warn"><b>Revisá a mano</b><ul>${r.manual.map(m => `<li>${esc(m)}</li>`).join('')}</ul></div>` : ''}
        <textarea class="fc-out" readonly rows="12" data-fc-out="0">${esc(r.code)}</textarea>
        <div class="row" style="margin-top:8px"><button class="btn sm" id="fc-publicado">Ya lo publiqué: guardar esta versión</button><span class="spacer"></span><button class="btn sm ghost" id="fc-ver">Ver código guardado</button><button class="btn sm ghost danger" id="fc-borrar">Reemplazar mi código</button></div>
        <textarea class="fc-out" readonly rows="8" id="fc-orig" hidden>${esc(P.codigo)}</textarea></div>`;
    }
  }
  return h;
}
function bindCodigo(body) {
  const P = plantillaDe(ficha);
  body.querySelectorAll('input[name=fc-modo]').forEach(r => r.onchange = () => { P.modo = r.value; persist(); renderFicha(); });
  body.querySelectorAll('[data-fc-copy]').forEach(b => b.onclick = () => copy(body.querySelector(`[data-fc-out="${b.dataset.fcCopy}"]`).value));
  const save = load => {
    const raw = body.querySelector('#fc-in').value; if (!raw.trim()) { toast('Pegá primero tu código'); return; }
    let parsed = null; try { parsed = normFicha(parseFichaForo(raw).ficha); } catch (e) { }
    if (load && parsed) { const js = ficha.jobState, pl = ficha.plantilla; ficha = normFicha(parsed); ficha.jobState = js || {}; ficha.plantilla = pl; }
    guardarPlantilla(raw, parsed && !load ? mezclaBase(parsed) : ficha);
    persist(); renderFicha(); toast('Código guardado para este personaje');
  };
  const s1 = body.querySelector('#fc-save'); if (s1) s1.onclick = () => save(false);
  const s2 = body.querySelector('#fc-save-load'); if (s2) s2.onclick = () => save(true);
  const pub = body.querySelector('#fc-publicado'); if (pub) pub.onclick = () => { const r = actualizarCodigo(P.codigo, P.base || ficha, ficha); P.forzarCombate = false; guardarPlantilla(r.code, ficha); persist(); renderFicha(); toast('Guardado como tu versión publicada'); };
  const ver = body.querySelector('#fc-ver'); if (ver) ver.onclick = () => { const t = body.querySelector('#fc-orig'); t.hidden = !t.hidden; };
  const del = body.querySelector('#fc-borrar'); if (del) del.onclick = () => { if (!window.confirm('¿Borrar el código guardado de este personaje para pegar uno nuevo?')) return; P.codigo = ''; P.base = null; persist(); renderFicha(); };
}
// Si guardás tu código sin cargar los datos, la base es lo que dice el código; lo que el código no tenga se toma de la ficha actual.
function mezclaBase(parsed) {
  const out = fichaClone(ficha); delete out.plantilla; delete out.jobState;
  const lleno = v => Array.isArray(v) ? v.length > 0 : (v !== '' && v !== null && v !== undefined);
  if (parsed.nombre) out.nombre = parsed.nombre;
  ['d', 'desc', 'extra'].forEach(g => Object.keys(parsed[g] || {}).forEach(k => { if (lleno(parsed[g][k])) out[g][k] = parsed[g][k]; }));
  const algoNum = o => Object.values(o || {}).some(v => num(v) > 0);
  ['attrs', 'skills', 'adv', 'esp'].forEach(g => { if (algoNum(parsed[g])) out[g] = Object.assign({}, out[g], parsed[g]); });
  ['artes', 'bgs', 'arcanos', 'idiomas', 'talentos', 'vinculos'].forEach(g => { if (lleno(parsed[g])) out[g] = parsed[g]; });
  if (parsed.titulos) out.titulos = parsed.titulos;
  return out;
}

/* ============ Controlador de stats de combate ============ */
const STATS_CTRL = [
  ['ini','Iniciativa'], ['atkF','Ataque Físico'], ['atkM','Ataque Mágico'], ['def','Defensa'],
  ['luchaF','Lucha Física'], ['luchaM','Lucha Mágica'], ['pa','PAs'], ['umbral','Umbral de heridas'],
  ['heridas','Heridas'], ['pp','Puntos de Pociones'], ['pr','Puntos de Rituales']
];
let ctrlTxt = '', ctrlRes = null;
const LVW = /\b(desentrenad|novat|competente|expert|maestr|legendari)/i;
function leerStatsEscritos(raw){
  const t = cleanForo(raw);
  const lines = t.split('\n').map(l=>l.trim()).filter(Boolean);
  const out = {};
  STATS_CTRL.forEach(([k,lab])=>{
    const re = new RegExp(`^[→▋•✦\\-*\\s]*${lab.replace(/ /g,'\\s+')}\\s*:\\s*(.*)$`, 'i');
    const cand = lines.map(l=>l.match(re)).filter(Boolean).map(m=>m[1]).filter(v=>!LVW.test(v) || /=/.test(v));
    if(!cand.length){ out[k]={found:false}; return; }
    const v = cand[0];
    const m = v.includes('=') ? v.split('=').pop().match(/-?\d+(?:[.,]\d+)?/) : (v.match(/-?\d+(?:[.,]\d+)?(?!.*\d)/));
    out[k] = m ? {found:true, val:parseFloat(m[0].replace(',','.')), txt:v} : {found:true, val:null, txt:v};
  });
  return out;
}
function esperados(){
  const c = combate(), p = puntos();
  return { ini:c.ini, atkF:c.atkF, atkM:c.atkM, def:c.def, luchaF:c.luchaF, luchaM:c.luchaM, pa:c.pa, umbral:c.umbral, heridas:c.heridas, pp:p.pp, pr:p.pr,
    _x:{luchaF:c.luchaFx, luchaM:c.luchaMx}, _t:Object.assign({}, c.t, {pp:p.ppTxt, pr:p.prTxt}) };
}
function renderControl(){
  const box = $('#ctrl-body'); if(!box) return;
  const c = combate(), p = puntos(), M = c.M, P = plantillaDe(ficha);
  const chip = (on,l) => on ? `<span class="ct-chip">${esc(l)}</span>` : '';
  const det = [chip(true,`Etapa: ${ficha.d.etapa||'sin etapa'}`), chip(true,`Raza: ${ficha.d.raza||'Humana'}`),
    chip(M.semiD,'Semiduende: Vigor ÷ 2 para PAs y Umbral'), chip(M.semiG,'Semigigante: +2 en tiradas de Vigor (incluido Ataque Físico), cada punto de Vigor da 3 PAs, no puede ser Derrotado aunque tenga PAs bajo 0'),
    chip(M.carstein,'Anillo de los Carstein'), chip(M.warlockObj,'Armadura de Warlock'), chip(M.maletin,'Maletín del pocionista inquieto'),
    chip(M.herbiObj,'Herbivicus'), chip(M.herbicida,'Poción herbicida'), chip(M.vitae,'Planta Vitae'), chip(M.bisu,'Bisutería Arcana'),
    chip(M.solucion,'Solución del ritualista'), chip(M.altar,'Altar del ritualista')].join('');
  const semiNota = M.semiG ? `<div class="ct-sum ok" style="margin-top:10px"><b>Semigigante.</b> Se aplican sus reglas: +2 a todas las tiradas de Vigor (el Ataque Físico ya lo incluye), cada punto de Vigor suma 3 PAs en vez de 1 y no puede ser Derrotado con arcanos como el Desmaius aunque sus PAs estén bajo cero. Recordá que la ficha tiene que tener el canje <b>Semigigante</b> (500 gr), obligatorio y exclusivo de esta raza.</div>` : '';
  const toggles = (M.warlockObj ? `<label class="ct-tg"><input type="checkbox" id="ct-warlock" ${combOpt.warlock?'checked':''}> La Armadura de Warlock está puesta (−2 Iniciativa y Defensa)</label>` : '')
    + (M.herbiObj ? `<label class="ct-tg"><input type="checkbox" id="ct-herbi" ${combOpt.herbivicus===false?'':'checked'}> Herbivicus activo (suma tu nivel de Herbología a Pociones)</label>` : '');
  const E = esperados();
  const tile = (k,l) => `<div class="ct-stat" title="${esc(E._t[k]||'')}"><span class="t">${l}</span><b>${E[k]}</b><small>${esc(E._t[k]||'')}</small></div>`;
  // escena
  const anyScene = num(combOpt.fuerza) || combOpt.actividad || combOpt.lic;
  let scene = '';
  if(anyScene){ const s = combate({warlock:combOpt.warlock, fuerza:combOpt.fuerza, actividad:combOpt.actividad, lic:combOpt.lic});
    scene = `<div class="ct-grid scene">${[['ini','Iniciativa'],['atkF','Ataque Físico'],['def','Defensa'],['luchaF','Lucha Física'],['luchaM','Lucha Mágica'],['pa','PAs'],['umbral','Umbral de heridas'],['heridas','Heridas']].map(([k,l])=>`<div class="ct-stat"><span class="t">${l}</span><b>${s[k]}</b><small>${esc(s.t[k]||'')}</small></div>`).join('')}</div>`; }
  // chequeo
  const fuente = P.codigo ? `<p class="small muted">Se revisa el código guardado en <b>Código para el foro</b>. Si querés revisar otra versión, pegala abajo.</p>` : `<p class="small muted">Pegá tu ficha (el código de «Editar» o el texto copiado de la ficha publicada).</p>`;
  let res = '';
  if(ctrlRes){
    const bad = ctrlRes.filter(r=>r.st==='mal').length, miss = ctrlRes.filter(r=>r.st==='falta').length, sinEt = ctrlRes.some(r=>r.st==='etapa');
    res = `<div class="ct-sum ${bad?'bad':'ok'}">${bad ? `${bad} stat${bad>1?'s':''} no coincide${bad>1?'n':''} con lo que debería tener tu ficha.` : 'Todo bien: los stats escritos coinciden con los de tu ficha.'}${miss?` ${miss} no los encontré escritos.`:''}${sinEt?' PAs, Umbral y Heridas dependen de la etapa: elegila en Mi Ficha › Datos para chequearlos.':''}</div>
      <div class="tablewrap"><table class="req ct-table"><thead><tr><th class="l">Stat</th><th>En tu ficha</th><th>Debería ser</th><th></th><th class="l">Cómo se calcula</th></tr></thead><tbody>
      ${ctrlRes.map(r=>`<tr class="${r.st}"><td class="l"><b>${r.l}</b></td><td>${r.st==='falta'?'—':esc(r.w)}</td><td><b>${r.st==='etapa'?'?':r.e}</b>${r.x!==undefined && !Number.isInteger(r.x)?`<div class="muted small">exacto: ${r.x.toFixed(2).replace('.',',')}</div>`:''}</td>
        <td>${r.st==='ok'?'<span class="badge r3">✓ Bien</span>':r.st==='redondeo'?'<span class="badge r2">≈ Redondeo</span>':r.st==='falta'?'<span class="badge">No está</span>':r.st==='etapa'?'<span class="badge r2">Falta la etapa</span>':'<span class="badge r0">✗ Revisar</span>'}</td>
        <td class="l small">${esc(r.f)}</td></tr>`).join('')}</tbody></table></div>
      ${bad && P.codigo && P.modo==='personal' ? `<div class="row" style="margin-top:10px"><button class="btn sm primary" id="ct-fix">Corregirlos en «Código para el foro»</button><span class="muted small">Se reescriben esas líneas con los valores correctos en tu código.</span></div>` : ''}
      ${bad && P.modo!=='personal' ? `<p class="small muted">Si usás el modelo Compacto o Extendido de «Código para el foro», el código ya sale con los valores correctos.</p>` : ''}`;
  }
  box.innerHTML = `<div class="card"><div class="row"><h2 style="margin:0">Lo que tiene en cuenta</h2><span class="spacer"></span><button class="ct-q" id="ct-ref-btn" title="Cómo se calcula cada stat y qué arcanos, objetos y razas lo cambian"><span>?</span>Referencias</button></div>
      <p class="muted small" style="margin-top:-4px">Sale de la ficha de <b>${esc(ficha.nombre||'tu personaje')}</b>: atributos, habilidades, etapa, raza y arcanos (pestaña Magia).</p>
      <div class="ct-chips">${det}${semiNota}</div>${toggles?`<div class="ct-tgs">${toggles}</div>`:''}</div>
    <div class="card"><h2>Stats que debería tener la ficha</h2><div class="ct-grid">${STATS_CTRL.map(([k,l])=>tile(k,l)).join('')}</div></div>
    <div class="card"><div class="row"><h2 style="margin:0">Chequeo de stats</h2><span class="spacer"></span><button class="btn primary" id="ct-run">Chequear stats</button></div>
      ${fuente}<textarea id="ct-in" rows="4" placeholder="(opcional) Pegá acá la ficha a revisar…">${esc(ctrlTxt)}</textarea>${res}</div>
    <div class="card"><h2>En escena <span class="muted small" style="font-weight:400">(no cambia tu ficha)</span></h2>
      <div class="ct-tgs">
        <label class="ct-tg">Poción de fuerza <select id="ct-fz">${[0,1,2,3].map(v=>`<option value="${v}" ${num(combOpt.fuerza)===v?'selected':''}>${v?'+'+v+' Vigor':'Ninguna'}</option>`).join('')}</select></label>
        <label class="ct-tg"><input type="checkbox" id="ct-act" ${combOpt.actividad?'checked':''}> Poción de actividad (+1 Defensa e Iniciativa)</label>
        <label class="ct-tg"><input type="checkbox" id="ct-lic" ${combOpt.lic?'checked':''}> Licantropía (sólo con el canje de licantropía)</label>
      </div>${scene || '<p class="small muted">Activá una poción o la licantropía para ver los stats de esa escena.</p>'}</div>`;
  const rr = () => { ctrlRes = ctrlRes ? null : null; renderControl(); };
  const w = $('#ct-warlock'); if(w) w.onchange = () => { combOpt.warlock = w.checked; ctrlRes && runCheck(); renderControl(); refreshIfFicha(); };
  const hb = $('#ct-herbi'); if(hb) hb.onchange = () => { combOpt.herbivicus = hb.checked; ctrlRes && runCheck(); renderControl(); refreshIfFicha(); };
  $('#ct-fz').onchange = e => { combOpt.fuerza = num(e.target.value); renderControl(); };
  $('#ct-act').onchange = e => { combOpt.actividad = e.target.checked; renderControl(); };
  $('#ct-lic').onchange = e => { combOpt.lic = e.target.checked; renderControl(); };
  $('#ct-in').oninput = e => { ctrlTxt = e.target.value; };
  $('#ct-run').onclick = () => { runCheck(); renderControl(); };
  $('#ct-ref-btn').onclick = abrirReferencias;
  const fx = $('#ct-fix'); if(fx) fx.onclick = () => { P.forzarCombate = true; persist(); fichaTab='codigo'; almacen.guardarTexto('grimorio.fichaTab','codigo'); if(window.showSection) window.showSection('ficha'); renderFicha(); toast('Listo: copiá el código corregido'); };
}

/* ---- Referencias: cómo se calcula cada stat y qué lo modifica ---- */
function abrirReferencias(){
  const M = modsFicha(), dl = $('#ct-ref'); if(!dl) return;
  const tuya = on => on ? ' <span class="ct-ref-mine">en tu ficha</span>' : '';
  const tabla = (cab, filas) => `<div class="tablewrap"><table class="req ct-ref-t"><thead><tr>${cab.map((c,i)=>`<th class="${i===cab.length-1?'l':'l'}">${c}</th>`).join('')}</tr></thead><tbody>${filas.map(f=>`<tr>${f.map((c,i)=>`<td class="l${i===0?' n':''}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const item = (nombre, on, txt, fuente) => `<li><b>${nombre}</b>${tuya(on)}: ${txt}${fuente?` <span class="muted">Fuente: ${fuente}.</span>`:''}</li>`;
  const et = ETAPAS[ficha.d.etapa] ? ficha.d.etapa : '';
  dl.querySelector('#ct-ref-body').innerHTML = `
    <p class="muted small" style="margin-top:0">Esto es lo que usa el Controlador para calcular los stats. Lo marcado <span class="ct-ref-mine">en tu ficha</span> ya se está aplicando a ${esc(ficha.nombre||'tu personaje')}.</p>
    <h4>✦ Cómo se calcula cada stat</h4>
    ${tabla(['Stat','Fórmula'], [
      ['Iniciativa','Percepción + bono de Iniciativa'],
      ['Ataque Físico','Vigor + bono de Pelea'],
      ['Ataque Mágico','Poder + bono de Duelo'],
      ['Defensa','5 + Destreza + bono de Esquiva'],
      ['Lucha Física','(Ataque Físico + Defensa − 5 + Iniciativa) ÷ 3'],
      ['Lucha Mágica','(Ataque Mágico + Defensa − 5 + Iniciativa) ÷ 3'],
      ['PAs','Base de la etapa + Vigor + Voluntad'],
      ['Umbral de heridas','Base de la etapa + Vigor'],
      ['Heridas','Base de la etapa + Voluntad'],
      ['Puntos de Pociones','Poder + bono de Pociones'],
      ['Puntos de Rituales','Poder + bono de Rituales']])}
    <p class="small" style="margin:8px 0 4px"><b>Bono de habilidad:</b> Desentrenado 0 · Novato 1 · Competente 2 · Experto 4 · Maestro 7 · Legendario 9.<br><b>Nivel</b> (para algunos arcanos): Novato 1 · Competente 2 · Experto 3 · Maestro 4.</p>
    ${tabla(['Etapa','PAs','Umbral','Heridas'], Object.keys(ETAPAS).map(k=>[`${esc(k)}${k===et?' <span class="ct-ref-mine">tu etapa</span>':''}`, ETAPAS[k].pa, ETAPAS[k].u, ETAPAS[k].h]))}
    <p class="muted small" style="margin:6px 0 0">Sin etapa elegida no se pueden calcular PAs, Umbral ni Heridas: elegila en Mi Ficha.</p>

    <h4>⚗ Arcanos de Pociones</h4>
    ${tabla(['Nombre','Habilidad','Escala','Qué hace'], [
      ['Poción herbicida'+tuya(M.herbicida),'Herbología','Nivel','Suma tu nivel de Herbología a los Puntos de Pociones. <span class="muted">Fuente: Pociones, básicas.</span>'],
      ['Planta Vitae (ritual)'+tuya(M.vitae),'Rituales','Nivel','Suma tu nivel de Rituales a los Puntos de Pociones. <span class="muted">Fuente: Rituales, intermedios.</span>']])}

    <h4>☾ Arcanos de Rituales</h4>
    ${tabla(['Nombre','Habilidad','Escala','Qué hace'], [
      ['Solución del ritualista (poción)'+tuya(M.solucion),'Pociones','Bono','Suma tu bono de Pociones a los Puntos de Rituales. <span class="muted">Fuente: Pociones, intermedias.</span>'],
      ['Altar del ritualista'+tuya(M.altar),'Artesanía','Nivel','Suma tu nivel en la artesanía con la que lo construiste (Albañilería, Alfarería, Carpintería, Forja o Ingeniería). <span class="muted">Fuente: Objetos, avanzados.</span>']])}

    <h4>✧ Efectos especiales</h4>
    <ul class="ct-ref-l">
      ${item('Maletín del pocionista inquieto', M.maletin, 'duplica tus Puntos de Pociones (Poder + Pociones) antes de sumar los arcanos.', 'Objetos, avanzados')}
      ${item('Herbivicus', M.herbiObj, 'si está activo, suma tu nivel de Herbología a los Puntos de Pociones. A cambio bloquea 1 Punto de Rituales, solo durante la aventura en la que lo declares; no se descuenta de la ficha. Lo prendés y apagás arriba, en «Lo que tiene en cuenta».', 'Rituales, básicos')}
      ${item('Bisutería Arcana', M.bisu, 'duplica tu habilidad de Rituales dentro de los Puntos de Rituales (Poder + Rituales × 2).', 'Objetos, intermedios')}
    </ul>

    <h4>❖ Raza y objetos que cambian la ficha</h4>
    <ul class="ct-ref-l">
      ${item('Anillo de los Carstein', M.carstein, 'el Vigor no suma PAs (PAs = base + Voluntad).', 'Objetos, intermedios')}
      ${item('Armadura de Warlock', M.warlockObj, '−2 a Iniciativa y Defensa mientras la tengas puesta (el daño que reduce no entra en el cálculo).', 'Objetos, intermedios')}
      ${item('Semiduende', M.semiD, 'el Vigor se divide entre dos (redondeando hacia abajo) para calcular PAs y Umbral de heridas.', 'Las Razas')}
      ${item('Semigigante', M.semiG, '+2 a todas las tiradas de Vigor (incluido Ataque Físico) y cada punto de Vigor suma 3 PAs en vez de 1. No puede ser Derrotado con arcanos como Desmaius aunque tenga los PAs bajo cero.', 'Las Razas')}
    </ul>

    <h4>⚡ Solo en escena <span class="muted small" style="font-weight:400">(no cambian tu ficha; se prueban en «En escena»)</span></h4>
    <ul class="ct-ref-l">
      ${item('Pociones de fuerza', false, 'culturista +1, semigigante +2 o gigante +3 de Vigor: cambian Ataque Físico, Lucha Física, PAs y Umbral durante la escena.', 'Pociones')}
      ${item('Poción de actividad', false, '+1 a Defensa e Iniciativa durante la escena.', 'Pociones, básicas')}
      ${item('Licantropía', false, '+4 a Iniciativa, Ataque Físico, Defensa y Umbral; los PAs se duplican y las Heridas suben 2. Solo con el canje de licantropía.', '')}
      ${item('Poción rejuvenecedora / envejecedora', false, 'usan la base de hasta dos etapas menos o más. Para verlo, cambiá la etapa en Mi Ficha.', 'Pociones')}
    </ul>`;
  dl.showModal();
  dl.querySelector('#ct-ref-body').scrollTop = 0;
}
function refreshIfFicha(){ try{ if(ui.tab==='ficha') renderFicha(); }catch(e){} }
function runCheck(){
  const P = plantillaDe(ficha);
  const src = ctrlTxt.trim() || P.codigo || '';
  if(!src){ toast('Pegá tu ficha para chequearla'); ctrlRes = null; return; }
  const W = leerStatsEscritos(src), E = esperados();
  ctrlRes = STATS_CTRL.map(([k,l])=>{
    const w = W[k], e = E[k], x = E._x[k];
    let st;
    if(!w.found || w.val===null) st = 'falta';
    else if(etapaOf().none && ['pa','umbral','heridas'].includes(k)) st = 'etapa';
    else if(w.val===e) st = 'ok';
    else if(x!==undefined && (w.val===Math.floor(x) || w.val===Math.ceil(x))) st = 'redondeo';
    else st = 'mal';
    return {k, l, w: w.found && w.val!==null ? String(w.val).replace('.',',') : '', e, x, st, f:E._t[k]||''};
  });
}

/* ============ Personajes (varias fichas) ============ */
const pjName = p => (p.ficha.nombre||'').trim() || 'Sin nombre';
function refreshAll(){ renderFicha(); renderWho(); if(ui.tab==='empleos') renderEmpleos(); if(ui.tab==='editor') renderEditor(); if(ui.tab==='control'){ ctrlRes=null; renderControl(); } pintarPjs(); try{ if(typeof TC.renderAll==='function') TC.renderAll(); if(typeof TC.COMP!=='undefined' && TC.COMP.built) TC.compResults(); }catch(e){} }
function cambiarPj(id){ flushSave(); pjs.activa=id; ficha=pjActivo().ficha; flushSave(); refreshAll(); toast(`Ficha de ${pjName(pjActivo())}`); }
function nuevoPj(base){ flushSave(); const f = base ? normFicha(JSON.parse(JSON.stringify(base))) : emptyFicha(); if(base){ f.nombre = (f.nombre||'Sin nombre')+' (copia)'; f.jobState={}; }
  const p={id:newPjId(), ficha:f}; pjs.lista.push(p); pjs.activa=p.id; ficha=f; flushSave(); fichaTab='datos'; refreshAll(); if(window.showSection) window.showSection('ficha'); }
function borrarPj(){ const p=pjActivo(); if(!window.confirm(`¿Eliminar a "${pjName(p)}"? Se borra su ficha y también sus roles, ganancias, bóveda y futuros canjes. No se puede deshacer.`)) return;
  pjs.lista=pjs.lista.filter(x=>x!==p); if(!pjs.lista.length) pjs.lista.push({id:newPjId(), ficha:emptyFicha()});
  pjs.activa=pjs.lista[0].id; ficha=pjs.lista[0].ficha; flushSave(); refreshAll(); toast('Ficha eliminada'); }
const pjFoto = f => (f.extra && /^https?:\/\//.test(f.extra.foto||'')) ? `style="background-image:url('${esc(f.extra.foto)}')"` : '';
let pjOpen=false;
function pintarPjs(){
  syncPj();
  setTimeout(()=>document.dispatchEvent(new CustomEvent('pam:pjs')),0);
  const W=document.getElementById('pjWrap');
  if(W){
    const a=pjActivo();
    W.innerHTML=`<button class="pj-btn" data-pjt aria-expanded="${pjOpen}" aria-haspopup="true" title="Cambiar de personaje"><i class="pj-av" ${pjFoto(a.ficha)}>${pjFoto(a.ficha)?'':'✦'}</i><span class="pj-n">${esc(pjName(a))}</span><span class="car">${pjOpen?'▴':'▾'}</span></button>`
      +`<div class="theme-list pj-list" role="menu"${pjOpen?'':' hidden'}><div class="pj-h">Mis personajes (${pjs.lista.length})</div>`
      +pjs.lista.map(p=>`<button class="theme-opt" role="menuitemradio" data-pj="${p.id}" aria-pressed="${p.id===a.id}"><i class="pj-av" ${pjFoto(p.ficha)}>${pjFoto(p.ficha)?'':'✦'}</i><span>${esc(pjName(p))}<small>${esc([p.ficha.extra&&p.ficha.extra.ocupacion, p.ficha.d&&p.ficha.d.etapa].filter(Boolean).join(' · ')||'Ficha vacía')}</small></span></button>`).join('')
      +`<div class="pk-bar"><button data-pja="new">+ Nuevo personaje</button><button data-pja="dup">Duplicar</button><button data-pja="del">Eliminar</button></div></div>`;
  }
  ['#pj-strip','#pj-strip2'].forEach(sel=>{ const S=$(sel);
  if(S){ S.innerHTML=`<span class="pj-lbl">Personaje</span>`+pjs.lista.map(p=>`<button class="pj-chip" data-pj="${p.id}" aria-pressed="${p.id===pjs.activa}"><i class="pj-av" ${pjFoto(p.ficha)}>${pjFoto(p.ficha)?'':'✦'}</i>${esc(pjName(p))}</button>`).join('')+`<button class="pj-chip add" data-pja="new">+ Nuevo personaje</button>`; }
  });
}
document.addEventListener('click',e=>{
  if(e.target.closest('[data-pjt]')){ pjOpen=!pjOpen; pintarPjs(); return; }
  const o=e.target.closest('[data-pj]'); if(o){ pjOpen=false; if(o.dataset.pj!==pjs.activa) cambiarPj(o.dataset.pj); else pintarPjs(); return; }
  const a=e.target.closest('[data-pja]'); if(a){ pjOpen=false; const k=a.dataset.pja; if(k==='new') nuevoPj(); else if(k==='dup') nuevoPj(ficha); else borrarPj(); return; }
  if(pjOpen && !e.target.closest('#pjWrap')){ pjOpen=false; pintarPjs(); }
});
document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&pjOpen){ pjOpen=false; pintarPjs(); } });
document.addEventListener('input',e=>{ if(e.target.closest && e.target.closest('#re-app') && /nombre|ocupacion|foto|etapa/.test(e.target.dataset.p||e.target.id||'')) { clearTimeout(window.__pjT); window.__pjT=setTimeout(pintarPjs,300); } });
w.addEventListener('beforeunload',flushSave);

/* ============ Inicio ============ */
renderFicha();
pintarPjs();
window.reSetTab = setTab;
window.grimorioFicha = () => ficha;
/* API para que el Registro de Roles / Bóveda use los mismos personajes que Mi Ficha */
window.pamFicha = {
  /* busca el personaje por nombre (exacto o «Hana» ↔ «Hana Park») */
  buscar: nombre => { const n=norm(nombre); if(!n) return null;
    const L=pjs.lista; const p=L.find(x=>norm(x.ficha.nombre)===n) || L.find(x=>{ const m=norm(x.ficha.nombre); return m && (m.startsWith(n+' ')||n.startsWith(m+' ')); });
    return p ? {id:p.id, nombre:pjName(p), activo:p.id===pjs.activa} : null; },
  activo: () => ({id:pjs.activa, nombre:pjName(pjActivo())}),
  asegurar: nombre => { const b=window.pamFicha.buscar(nombre); let id=b&&b.id;
    if(!id){ const vacio=pjs.lista.find(x=>!String(x.ficha.nombre||'').trim()); if(vacio){ id=vacio.id; vacio.ficha.nombre=nombre; } else { const f=emptyFicha(); f.nombre=nombre; const p={id:newPjId(), ficha:f}; pjs.lista.push(p); id=p.id; } flushSave(); }
    if(id!==pjs.activa){ flushSave(); pjs.activa=id; ficha=pjActivo().ficha; flushSave(); refreshAll(); }
    return id; },
  importar: (txt, nombre) => { const id=window.pamFicha.asegurar(nombre);
    const p=parseFichaForo(txt); const js=ficha.jobState; const plant=ficha.plantilla;
    ficha=normFicha(p.ficha); ficha.jobState=js||{}; if(!ficha.nombre) ficha.nombre=nombre;
    if(esCodigoForo(txt)) guardarPlantilla(txt, ficha); else if(plant) ficha.plantilla=plant;
    persist(); flushSave(); refreshAll(); return {id, resumen:p.resumen}; },
  /* canjes (Mi PJ): pasar el carrito a la ficha, como el botón «Traer de la calculadora» */
  traerCalculadora: () => traerCalculadora(),
  /* canjes (Mi PJ): poner la ficha en la Tabla de Canjes, como el botón «Llevar a la calculadora» */
  llevarCalculadora: () => llevarCalculadora(),
  /* canjes (Mi PJ): el código del foro actualizado en modo «Personalizada» (null si la ficha no lo tiene guardado) */
  codigoPersonal: () => { const P = plantillaDe(ficha); if (P.modo !== 'personal' || !P.codigo) return null;
    const r = actualizarCodigo(P.codigo, P.base || ficha, ficha);
    return { codigo: r.code, base: P.codigo, hechos: r.hechos.join(' · '), manual: r.manual.slice() }; }
};
window.pamPjs = {
  lista: () => pjs.lista.map(p=>({id:p.id, nombre:String(p.ficha.nombre||'').trim()})),
  activa: () => pjs.activa,
  cambiar: id => { if(id && id!==pjs.activa && pjs.lista.some(p=>p.id===id)) cambiarPj(id); },
  nuevoUI: () => nuevoPj(),
  crear: nombre => { const f=emptyFicha(); f.nombre=nombre||''; const p={id:newPjId(), ficha:f}; pjs.lista.push(p); flushSave(); setTimeout(pintarPjs,0); return p.id; },
  renombrar: (id, nombre) => { const p=pjs.lista.find(x=>x.id===id); if(!p) return; p.ficha.nombre=nombre; flushSave(); try{ renderHead(); }catch(e){} pintarPjs(); }
};
setTab(ui.tab||'empleos');
}
