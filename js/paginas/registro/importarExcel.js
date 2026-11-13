// @ts-nocheck
// Registro de Roles: «Importar desde Excel». Leer la planilla (SheetJS) y pasarla a personajes, roles, oficiales,
// turnos y ganancias. Copiado del Registro antiguo (fase 8b); cambia la versión de SheetJS (F09).
import { TIPOS, ESTADOS, TURNOS, OF_EST } from './datos.js?v=2.0.2';

/* F09: SheetJS 0.20.3, de su propia web (la 0.18.5 de cdnjs tiene dos fallos de seguridad y ya no se actualiza allí) */
export const XLSX_URL="https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";
export function loadXLSX(window){const document=window.document;return window.XLSX?Promise.resolve(window.XLSX):new Promise((ok,ko)=>{const sc=document.createElement("script");sc.src=XLSX_URL;sc.onload=()=>ok(window.XLSX);sc.onerror=()=>ko(new Error("No se pudo cargar el lector de Excel"));document.head.appendChild(sc);});}
export const norm=v=>String(v??"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9ñ ]+/g," ").replace(/\s+/g," ").trim();
export const compact=v=>norm(v).replace(/ /g,"");
export const firstEmoji=v=>{const m=String(v||"").match(/\p{Extended_Pictographic}(️|‍\p{Extended_Pictographic})*/u);return m?m[0]:"";};
export const cleanName=v=>String(v||"").replace(/\p{Extended_Pictographic}|️|‍/gu,"").trim();
export const pad=n=>String(n).padStart(2,"0");
/* SheetJS pierde el plano alto de los emojis en celdas de texto inline (U+1F337 → U+F337): se recuperan */
export const fixAstral=v=>typeof v==="string"?v.replace(/[\uF000-\uF8FF\uFADA-\uFAFF]/g,c=>String.fromCodePoint(c.charCodeAt(0)+0x10000)):v;
export function serialToDate(n){const d=new Date(Math.round((n-25569)*864e5));return {y:d.getUTCFullYear(),m:d.getUTCMonth()+1,d:d.getUTCDate()};}
export function asFecha(v){if(typeof v==="number"&&v>1000){const x=serialToDate(v);return `${pad(x.d)}/${pad(x.m)}/${x.y}`;}return String(v??"").trim();}
export function asISO(v){if(typeof v==="number"&&v>1000){const x=serialToDate(v);return `${x.y}-${pad(x.m)}-${pad(x.d)}`;}
  const s=String(v??"").trim();let m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);if(m)return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
  m=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);if(m)return `${m[3]}-${pad(m[2])}-${pad(m[1])}`;return "";}
export const matchList=(list,v,def)=>{const n=compact(v);if(!n)return def;const f=list.find(([x])=>compact(x)===n);return f?f[0]:def;};
export function colIndex(head,tests){for(const t of tests){const i=head.findIndex(h=>t(h));if(i>=0)return i;}return -1;}

export function parseWorkbook(wb,X,uid){
  const res={personajes:[],oficiales:[],misiones:[],tarifas:null,fijos:[],gan:[],avisos:[]};
  wb.SheetNames.forEach(name=>{
    const rows=X.utils.sheet_to_json(wb.Sheets[name],{header:1,raw:true,defval:""}).map(r=>r.map(fixAstral));
    const findHead=pred=>rows.findIndex(r=>r.some(c=>pred(norm(c))));
    let h=findHead(c=>c==="nombre de rol"||c==="nombre del rol");
    if(h>=0){
      const head=rows[h].map(norm);
      const ci={nombre:colIndex(head,[x=>x.startsWith("nombre")]),con:colIndex(head,[x=>x==="con"||x.startsWith("con ")]),
        tipo:colIndex(head,[x=>x.startsWith("tipo")]),lim:colIndex(head,[x=>x.includes("limite")]),
        fecha:colIndex(head,[x=>x==="fecha"]),estado:colIndex(head,[x=>x.startsWith("estado")]),enlace:colIndex(head,[x=>x.includes("enlace")||x.includes("link")])};
      const titulo=rows.slice(0,h).flat().find(c=>String(c).trim())||name;
      const pj={id:uid(),nombre:cleanName(name)||cleanName(titulo)||"Personaje",emoji:firstEmoji(titulo)||"✨",tono:"",roles:[],ganancias:[]};
      rows.slice(h+1).forEach(r=>{const nm=String(r[ci.nombre]??"").trim();if(!nm)return;
        pj.roles.push({id:uid(),nombre:nm,con:ci.con>=0?String(r[ci.con]??"").trim():"",color:"",
          tipo:ci.tipo>=0?matchList(TIPOS,r[ci.tipo],"Libre"):"Libre",fecha:ci.fecha>=0?asFecha(r[ci.fecha]):"",
          estado:ci.estado>=0?matchList(ESTADOS,r[ci.estado],"Sin Contestar"):"Sin Contestar",limite:ci.lim>=0?asISO(r[ci.lim]):"",
          enlace:ci.enlace>=0?String(r[ci.enlace]??"").trim():""});});
      res.personajes.push(pj);return;
    }
    h=findHead(c=>c==="oficial");
    if(h>=0&&rows[h].some(c=>norm(c).startsWith("relacion"))){
      const head=rows[h].map(norm);
      const ci={n:colIndex(head,[x=>x==="oficial"]),r:colIndex(head,[x=>x.startsWith("relacion")]),f:colIndex(head,[x=>x.startsWith("fecha")]),e:colIndex(head,[x=>x.startsWith("estado")]),l:colIndex(head,[x=>x.includes("enlace")||x.includes("link")])};
      rows.slice(h+1).forEach(r=>{const nm=String(r[ci.n]??"").trim();if(!nm)return;
        res.oficiales.push({id:uid(),nombre:nm,relacion:ci.r>=0?String(r[ci.r]??"").trim():"",fecha:ci.f>=0?(asISO(r[ci.f])||asFecha(r[ci.f])):"",estado:ci.e>=0?matchList(OF_EST,r[ci.e],"Disponible"):"Disponible",enlace:ci.l>=0?String(r[ci.l]??"").trim():""});});
      return;
    }
    h=findHead(c=>c==="jugador"||c==="mision");
    if(h>=0&&rows[h].some(c=>/^t\d+$/.test(compact(c)))){
      const head=rows[h].map(compact);
      const tcols=head.map((x,i)=>/^t\d+$/.test(x)?i:-1).filter(i=>i>=0);
      const fm=head.findIndex(x=>x.includes("faltasdelmaster")||x==="faltasmaster");
      for(let i=h+1;i<rows.length;i++){const r=rows[i];const nm=String(r[0]??"").trim();
        if(norm(nm).includes("tarifa"))break; if(!nm)continue;
        res.misiones.push({id:uid(),nombre:nm,faltasMaster:fm>=0?(+r[fm]||0):0,n:tcols.length||12,t:tcols.map(c=>matchList(TURNOS,r[c],"Sin Postear"))});}
      const tf={};rows.forEach(r=>{const k=norm(r[0]),v=r[1];if(typeof v!=="number")return;
        if(k==="rapido")tf.rapido=v;else if(k==="normal")tf.normal=v;else if(k==="lento")tf.lento=v;else if(k.startsWith("falta"))tf.falta=v;});
      if(Object.keys(tf).length)res.tarifas=tf;
      return;
    }
    let found=false;
    rows.forEach((r,ri)=>r.forEach((c,cj)=>{
      if(norm(c)==="grageas"&&cj>0&&typeof r[cj-1]==="string"&&/[a-z]/i.test(norm(r[cj-1]))&&norm(r[cj+1]).startsWith("estado")&&!norm(r[cj-1]).startsWith("total")){
        found=true;const blk={nombre:cleanName(r[cj-1]),emoji:firstEmoji(r[cj-1]),items:[]};
        for(let k=ri+1;k<rows.length;k++){const rr=rows[k],con=String(rr[cj-1]??"").trim();
          if(!con||norm(con).startsWith("total"))break;
          const v=rr[cj],e=rr[cj+1];blk.items.push({concepto:con,monto:typeof v==="number"?v:(+v||0),estado:compact(e)==="cobrado"?"Cobrado":"Sin Cobrar"});}
        res.gan.push(blk);
      }
      if(norm(c)==="pagos fijos"){found=true;for(let k=ri+1;k<rows.length;k++){const rr=rows[k],nm=String(rr[cj]??"").trim(),v=rr[cj+1];if(!nm||typeof v!=="number")break;res.fijos.push({id:uid(),nombre:nm,monto:v});}}
    }));
    if(!found&&!/^inicio$/i.test(norm(name))&&rows.some(r=>r.some(c=>String(c).trim())))res.avisos.push(name);
  });
  const ck=n=>compact(cleanName(n));
  res.gan.forEach(b=>{
    let pj=res.personajes.find(p=>ck(p.nombre)===ck(b.nombre))||res.personajes.find(p=>ck(p.nombre).startsWith(ck(b.nombre))||ck(b.nombre).startsWith(ck(p.nombre)));
    if(!pj){pj={id:uid(),nombre:b.nombre||"Personaje",emoji:b.emoji||"✨",tono:"",roles:[],ganancias:[]};res.personajes.push(pj);}
    pj.ganancias=b.items.map(it=>{const k=ck(it.concepto);const f=k&&res.fijos.find(f=>{const fk=ck(f.nombre);return fk===k||fk.startsWith(k)||k.startsWith(fk);});
      return f?{id:uid(),concepto:it.concepto,monto:0,fijo:f.id,estado:it.estado}:{id:uid(),concepto:it.concepto,monto:it.monto,fijo:"",estado:it.estado};});
  });
  return res;
}
