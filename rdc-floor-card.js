// ═══════════════════════════════════════════════════════════
//  RDC Floor Card  v8.0  – design identique screenshot étage
// ═══════════════════════════════════════════════════════════

function deepClone(o){
  if(o===null||typeof o!=='object') return o;
  if(Array.isArray(o)){const a=[];for(let i=0;i<o.length;i++)a.push(deepClone(o[i]));return a;}
  const r={};for(const k of Object.keys(o))r[k]=deepClone(o[k]);return r;
}
function esc(s){return String(s??'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

const CATS=[
  {key:"temperatures",label:"Températures",icon:"mdi:thermometer",      color:"#38bdf8",rgb:"56,189,248"},
  {key:"ouvertures",  label:"Fenêtres",    icon:"mdi:window-closed",    color:"#f59e0b",rgb:"245,158,11"},
  {key:"prises",      label:"Prises",      icon:"mdi:power-socket-eu",  color:"#a78bfa",rgb:"167,139,250"},
  {key:"eclairages",  label:"Lumières",    icon:"mdi:lightbulb-outline", color:"#fde68a",rgb:"253,230,138"},
  {key:"volets",      label:"Volets",      icon:"mdi:roller-shade",     color:"#94a3b8",rgb:"148,163,184"},
  {key:"securite",    label:"Sécurité",    icon:"mdi:shield-home-outline",color:"#f87171",rgb:"248,113,113"},
  {key:"serveur",     label:"Serveurs",    icon:"mdi:server",           color:"#818cf8",rgb:"129,140,248"},
];

// ── State helpers ──────────────────────────────────────────
function isOn(s){return s==="on"||s==="open"||s==="unlocked";}

function resolveIcon(id,state,attr={}){
  const d=id.split(".")[0],s=String(state||"").toLowerCase();
  if(d==="light") return s==="on"?"mdi:lightbulb":"mdi:lightbulb-outline";
  if(d==="switch"||d==="input_boolean") return s==="on"?"mdi:toggle-switch":"mdi:toggle-switch-off-outline";
  if(d==="cover"){
    const cl=attr?.device_class||"";
    if(cl==="shutter"||id.includes("volet")) return s==="open"?"mdi:roller-shade":"mdi:roller-shade-closed";
    if(cl==="window"||id.includes("fenetre")||id.includes("window")) return s==="open"?"mdi:window-open":"mdi:window-closed";
    if(cl==="door"||id.includes("porte")) return s==="open"?"mdi:door-open":"mdi:door-closed";
    if(cl==="gate"||id.includes("portail")) return s==="open"?"mdi:gate-open":"mdi:gate";
    return s==="open"?"mdi:window-open":"mdi:window-closed";
  }
  if(d==="binary_sensor"){
    const cl=attr?.device_class||"";
    if(cl==="window"||cl==="door") return s==="on"?"mdi:window-open":"mdi:window-closed";
    if(cl==="motion") return s==="on"?"mdi:motion-sensor":"mdi:motion-sensor-off";
    if(cl==="smoke") return "mdi:smoke-detector";
    return s==="on"?"mdi:circle":"mdi:circle-outline";
  }
  if(d==="sensor"){
    const cl=attr?.device_class||"";
    if(cl==="temperature") return "mdi:thermometer";
    if(cl==="humidity") return "mdi:water-percent";
    return "mdi:chart-line";
  }
  if(d==="camera") return "mdi:cctv";
  if(d==="lock")   return s==="locked"?"mdi:lock":"mdi:lock-open-outline";
  return attr?.icon||"mdi:circle-medium";
}

function battInfo(pct){
  const p=parseFloat(pct);
  if(isNaN(p)) return {icon:"mdi:battery-unknown",color:"#64748b"};
  if(p>=80) return {icon:"mdi:battery",color:"#94a3b8"};
  if(p>=50) return {icon:"mdi:battery-60",color:"#94a3b8"};
  if(p>=30) return {icon:"mdi:battery-40",color:"#f59e0b"};
  if(p>=15) return {icon:"mdi:battery-20",color:"#f87171"};
  return {icon:"mdi:battery-alert",color:"#ef4444"};
}
function findBatt(id,hass){
  if(!hass) return null;
  const base=id.split(".")[1]||"";
  for(const c of[`sensor.${base}_battery`,`sensor.${base}_batterie`,`sensor.${base}_battery_level`]){if(hass.states[c])return c;}
  const pfx=base.split("_")[0];
  for(const[eid,st]of Object.entries(hass.states)){
    if(eid.split(".")[0]!=="sensor")continue;
    if(st.attributes?.device_class!=="battery")continue;
    if((eid.split(".")[1]||"").startsWith(pfx))return eid;
  }
  return null;
}
function findHumid(id,hass){
  if(!hass) return null;
  const base=id.split(".")[1]||"";
  const cands=[
    `sensor.${base.replace(/temp(erature)?/i,"humidity")}`,
    `sensor.${base.replace(/temp(erature)?/i,"humidite")}`,
    `sensor.${base}_humidity`,`sensor.${base}_humidite`,
  ];
  for(const c of cands){if(hass.states[c])return c;}
  const pfx=base.split("_")[0];
  for(const[eid,st]of Object.entries(hass.states)){
    if(eid.split(".")[0]!=="sensor")continue;
    if(st.attributes?.device_class!=="humidity")continue;
    if((eid.split(".")[1]||"").startsWith(pfx))return eid;
  }
  return null;
}
function tempColor(t){
  const n=parseFloat(t);if(isNaN(n))return"#38bdf8";
  if(n<=16)return"#93c5fd";if(n<=20)return"#34d399";
  if(n<=23)return"#6ee7b7";if(n<=26)return"#f59e0b";
  if(n<=30)return"#f97316";return"#f87171";
}
function humidColor(v){
  const h=parseFloat(v);if(isNaN(h))return"#38bdf8";
  if(h<30)return"#93c5fd";if(h<45)return"#34d399";
  if(h<60)return"#6ee7b7";if(h<75)return"#fbbf24";return"#f87171";
}

function srvIcon(item){
  if(item.icon)return item.icon;
  const n=((item.label||"")+" "+(item.entity||"")).toLowerCase();
  if(n.match(/status|etat/))return"mdi:heart-pulse";
  if(n.match(/cpu|processor/))return"mdi:chip";
  if(n.match(/ram|memory/))return"mdi:memory";
  if(n.match(/nvme/))return"mdi:expansion-card";
  if(n.match(/disk|disque|hdd|ssd|c:|d:|e:|f:/))return"mdi:harddisk";
  if(n.match(/temp/))return"mdi:thermometer";
  if(n.match(/upload/))return"mdi:upload-network";
  if(n.match(/download/))return"mdi:download-network";
  if(n.match(/fan/))return"mdi:fan";
  if(n.match(/uptime/))return"mdi:clock-check-outline";
  if(n.match(/process/))return"mdi:format-list-checks";
  return"mdi:gauge";
}

// ═══════════════════════════════════════════════════════════
class RdcFloorCard extends HTMLElement{
  constructor(){
    super();this.attachShadow({mode:"open"});
    this._tab="temperatures";this._cfg={};this._hass=null;
    this._blobs={};this._timers=[];this._lbTimer=null;this._lbKey=null;
  }
  static getConfigElement(){return document.createElement("rdc-floor-card-editor");}
  static getStubConfig(){
    return{title:"Rez de Chaussée",temperatures:[],ouvertures:[],prises:[],eclairages:[],volets:[],securite:[],serveur:[]};
  }
  setConfig(c){
    this._cfg={title:"Rez de Chaussée",...c};
    CATS.forEach(cat=>{if(!this._cfg[cat.key])this._cfg[cat.key]=[];});
    // compatibility: eclairages might exist
  }
  set hass(h){
    const first=!this._hass;
    this._hass=h;
    if(first||!this._rendered) this._render();
    else this._patch();
  }
  connectedCallback(){this._render();}
  disconnectedCallback(){this._kill();}
  getCardSize(){return 4;}
  _kill(){this._timers.forEach(t=>clearInterval(t));this._timers=[];Object.values(this._blobs).forEach(u=>{try{URL.revokeObjectURL(u);}catch(e){}});}

  _openMoreInfo(id){this.dispatchEvent(new CustomEvent("hass-more-info",{detail:{entityId:id},bubbles:true,composed:true}));}

  // ── Camera ─────────────────────────────────────────────
  // ── Load camera — 3 méthodes en cascade ─────────────────
  async _loadCam(id, img, spin, off){
    if(!this._hass || !img) return;

    const ok   = () => { img.style.opacity="1"; if(spin) spin.style.display="none"; if(off) off.style.display="none"; };
    const fail = (reason) => {
      console.warn("[RDC cam] FAIL:", id, reason);
      img.style.opacity="0"; if(spin) spin.style.display="none"; if(off) off.style.display="flex";
    };

    const st  = this._hass.states[id];
    const tok = st?.attributes?.access_token;

    // — Base URL —
    let base = window.location.origin;
    try{
      const u = this._hass.hassUrl?.("");
      if(u && u.startsWith("http")) base = u.replace(/\/$/, "");
    }catch(_){}

    console.log("[RDC cam] id:", id, "| tok:", tok ? tok.slice(0,8)+"…" : "none", "| base:", base);

    // Méthode A : WebSocket callApi (plus fiable, même auth que la session)
    try{
      const data = await this._hass.callApi("GET", `camera_proxy/${id}`);
      // callApi renvoie du JSON pour les endpoints JSON, mais camera_proxy renvoie binary
      // Si ça marche, on continue, sinon on passe à B
    }catch(_){}

    // Méthode B : img.src avec token (méthode officielle HA)
    if(tok){
      console.log("[RDC cam] Méthode B: token url");
      img.onload  = ok;
      img.onerror = () => {
        console.warn("[RDC cam] Méthode B échouée, essai C");
        _methodC();
      };
      img.src = `${base}/api/camera_proxy/${id}?token=${tok}&_t=${Date.now()}`;
      return;
    }

    _methodC();

    async function _methodC(){
      // Méthode C : fetch avec credentials
      try{
        console.log("[RDC cam] Méthode C: fetch credentials");
        const r = await fetch(`${base}/api/camera_proxy/${id}?_t=${Date.now()}`, {
          credentials:"include", cache:"no-store"
        });
        console.log("[RDC cam] Méthode C status:", r.status);
        if(!r.ok) throw new Error(`HTTP ${r.status}`);
        const blob = await r.blob();
        const burl = URL.createObjectURL(blob);
        img.onload  = ok;
        img.onerror = () => fail("blob url error");
        img.src     = burl;
      }catch(e){
        fail(e.message);
      }
    }
  }
  async _openLb(id){
    this._closeLb();
    const st=this._hass?.states[id],name=st?.attributes?.friendly_name||id.split(".")[1].replace(/_/g," ");
    const lb=document.createElement("div");lb.id="rdc-lb";
    lb.style.cssText="position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .2s;";
    lb.innerHTML=`<style>
#rdc-sc{position:absolute;inset:0;background:rgba(0,0,0,.85);backdrop-filter:blur(10px);}
#rdc-bx{position:relative;z-index:1;width:min(600px,calc(100vw - 24px));background:#0f172a;border:1px solid #1e293b;border-radius:20px;overflow:hidden;transform:scale(.9);transition:transform .28s cubic-bezier(.34,1.4,.64,1);}
#rdc-bx.pop{transform:scale(1);}
#lb-bar{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;background:#020617;border-bottom:1px solid #1e293b;}
.lb-l{display:flex;align-items:center;gap:10px;}.lb-dot{width:10px;height:10px;border-radius:50%;background:#34d399;box-shadow:0 0 10px #34d399;animation:lp 2s infinite;}
@keyframes lp{0%,100%{transform:scale(1);}50%{transform:scale(.55);opacity:.4;}}
.lb-name{font-size:1rem;font-weight:700;color:#fff;font-family:sans-serif;}
.lb-r{display:flex;gap:8px;}
.lb-btn{width:36px;height:36px;border-radius:10px;background:#1e293b;border:1px solid #334155;cursor:pointer;color:#64748b;display:flex;align-items:center;justify-content:center;}
.lb-btn ha-icon{--mdc-icon-size:18px;}
.lb-btn:hover{background:#334155;color:#fff;}
#lb-body{background:#000;line-height:0;position:relative;min-height:80px;}
#lb-img{width:100%;display:block;max-height:60vh;object-fit:contain;opacity:0;transition:opacity .3s;}
#lb-sp{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#000;}
.sp{width:40px;height:40px;border:3px solid #1e293b;border-top-color:#34d399;border-radius:50%;animation:sr .7s linear infinite;}
@keyframes sr{to{transform:rotate(360deg);}}
#lb-ns{display:none;height:140px;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#334155;font-family:sans-serif;}
#lb-ns ha-icon{--mdc-icon-size:40px;}
#lb-foot{padding:12px 18px;background:#020617;border-top:1px solid #1e293b;display:flex;justify-content:space-between;}
.lb-ts{font-size:.75rem;color:#334155;font-family:sans-serif;}
.lb-live{display:flex;align-items:center;gap:6px;font-size:.75rem;font-weight:700;color:#34d399;font-family:sans-serif;}
.lb-ld{width:6px;height:6px;border-radius:50%;background:#34d399;animation:lp 1.5s infinite;}
</style>
<div id="rdc-sc"></div>
<div id="rdc-bx">
  <div id="lb-bar"><div class="lb-l"><span class="lb-dot"></span><span class="lb-name">${name}</span></div>
  <div class="lb-r"><button class="lb-btn" id="lb-rf"><ha-icon icon="mdi:refresh"></ha-icon></button><button class="lb-btn" id="lb-cx"><ha-icon icon="mdi:close"></ha-icon></button></div></div>
  <div id="lb-body"><div id="lb-sp"><div class="sp"></div></div><img id="lb-img" src="" alt="${name}"/><div id="lb-ns"><ha-icon icon="mdi:camera-off-outline"></ha-icon><span>Signal indisponible</span></div></div>
  <div id="lb-foot"><span class="lb-ts">Rafraîchissement · 5s</span><div class="lb-live"><span class="lb-ld"></span>LIVE</div></div>
</div>`;
    const img=lb.querySelector("#lb-img"),spin=lb.querySelector("#lb-sp"),ns=lb.querySelector("#lb-ns");
    const load=()=>this._loadCam(id,img,spin,ns);
    lb.querySelector("#rdc-sc").addEventListener("click",()=>this._closeLb());
    lb.querySelector("#lb-cx").addEventListener("click",()=>this._closeLb());
    lb.querySelector("#lb-rf").addEventListener("click",()=>{spin.style.display="flex";img.style.opacity="0";ns.style.display="none";load();});
    this._lbKey=e=>{if(e.key==="Escape")this._closeLb();};
    document.addEventListener("keydown",this._lbKey);
    this._lbTimer=setInterval(load,5000);this._timers.push(this._lbTimer);
    this.shadowRoot.appendChild(lb);
    requestAnimationFrame(()=>{lb.style.opacity="1";requestAnimationFrame(()=>lb.querySelector("#rdc-bx").classList.add("pop"));});
    await load();
  }
  _closeLb(){
    if(this._lbTimer){clearInterval(this._lbTimer);this._timers=this._timers.filter(t=>t!==this._lbTimer);this._lbTimer=null;}
    if(this._lbKey){document.removeEventListener("keydown",this._lbKey);this._lbKey=null;}
    const lb=this.shadowRoot.querySelector("#rdc-lb");if(!lb)return;
    lb.style.opacity="0";lb.querySelector("#rdc-bx")?.classList.remove("pop");setTimeout(()=>lb.remove(),260);
  }

  // ── Summary stat cards (sobres, pas d'animation) ─────────
  _summary(){
    return CATS.filter(c=>c.key!=="serveur").map(cat=>{
      const items=(this._cfg[cat.key]||[]);
      if(!items.length) return "";
      let active=0;
      items.forEach(e=>{
        const id=typeof e==="string"?e:e.entity,st=this._hass?.states[id];
        if(st&&isOn(st.state)) active++;
      });
      const total=items.length;
      const lbl=this._cfg[`label_${cat.key}`]||cat.label;
      const col=active>0?cat.color:"#334155";
      const countStr=cat.key==="temperatures"?`${total}`:active>0?`${active}/${total}`:`0/${total}`;
      const borderCol=active>0?cat.color+"55":"#1e293b";
      return `<div class="spill" data-tab="${cat.key}" style="border-color:${borderCol}">
        <div class="spill-icon"><ha-icon icon="${cat.icon}" style="color:${col};--mdc-icon-size:18px"></ha-icon></div>
        <div class="spill-body">
          <span class="spill-count" style="color:${col}">${countStr}</span>
          <span class="spill-lbl">${lbl}</span>
        </div>
      </div>`;
    }).join("");
  }

  // ── Pro gauge serveur ─────────────────────────────────
  _proGauge(item){
    const st=this._hass?.states[item.entity];if(!st)return"";
    const val=parseFloat(st.state)||0,mn=parseFloat(item.min??0),mx=parseFloat(item.max??100);
    const np=Math.min(1,Math.max(0,(val-mn)/(mx-mn)));
    const unit=item.unit||st.attributes?.unit_of_measurement||"%";
    const lbl=item.label||st.attributes?.friendly_name||item.entity.split(".")[1].replace(/_/g," ");
    const segs=item.segments||[{from:0,color:"#818cf8"},{from:65,color:"#f59e0b"},{from:85,color:"#ef4444"}];
    const isDisk=((item.label||"")+(item.entity||"")).toLowerCase().match(/disk|disque|hdd|ssd|nvme|c:|d:|e:|f:/);
    const isFree=((item.entity||"")+(item.label||"")).toLowerCase().match(/libre|free/);
    let col;if(isDisk||isFree){const up=isFree?(100-np*100):(np*100);col=up>=95?"#ef4444":up>=85?"#f59e0b":"#34d399";}
    else{col=segs[0].color;for(const s of segs){if((np*100)>=s.from)col=s.color;}}
    const dv=isNaN(val)?(st.state||"–"):unit==="%"?`${(np*100).toFixed(0)}%`:unit==="°C"?`${val.toFixed(1)}°C`:`${val.toFixed(1)} ${unit}`;
    const CX=60,CY=65,R=48,SW=9,AS=135,AW=270,fc=2*Math.PI*R,tl=(AW/360)*fc,vl=np*tl;
    const uid=item.entity.replace(/[^a-zA-Z0-9]/g,"_"),gid=`g_${uid}`;
    const gs=segs.map(s=>`<stop offset="${(s.from/100*tl/fc*100).toFixed(1)}%" stop-color="${s.color}"/>`).join("")+`<stop offset="100%" stop-color="${segs[segs.length-1].color}"/>`;
    const na=np*AW*Math.PI/180,ni=R-SW/2-2,no=R+2;
    const nx1=CX+ni*Math.cos(na),ny1=CY+ni*Math.sin(na),nx2=CX+no*Math.cos(na),ny2=CY+no*Math.sin(na);
    const ticks=segs.slice(1).map(s=>{const a=(s.from/100)*AW*Math.PI/180;return`<line x1="${(CX+(R-SW/2-1)*Math.cos(a)).toFixed(2)}" y1="${(CY+(R-SW/2-1)*Math.sin(a)).toFixed(2)}" x2="${(CX+(R+SW/2+1)*Math.cos(a)).toFixed(2)}" y2="${(CY+(R+SW/2+1)*Math.sin(a)).toFixed(2)}" stroke="#0f172a" stroke-width="1.5"/>`;}).join("");
    const doff=(fc*(1-(AS-90)/360)).toFixed(2),sR=AS*Math.PI/180,eR=(AS+AW)*Math.PI/180,lR=R+SW/2+6;
    return`<div class="pgwrap entity-item" data-entity="${item.entity}">
<svg class="pgsvg" viewBox="0 0 120 90" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="${gid}" gradientUnits="userSpaceOnUse" x1="${CX-R}" y1="${CY}" x2="${CX+R}" y2="${CY}">${gs}</linearGradient><filter id="fw${uid}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur in="SourceGraphic" stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="#1e3050" stroke-width="${SW}" stroke-dasharray="${tl.toFixed(2)} ${(fc-tl).toFixed(2)}" stroke-dashoffset="${doff}"/>
<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="url(#${gid})" stroke-width="${SW}" stroke-linecap="round" stroke-dasharray="${vl.toFixed(2)} ${(fc-vl).toFixed(2)}" stroke-dashoffset="${doff}" filter="url(#fw${uid})" style="transition:stroke-dasharray .8s ease"/>
<g transform="rotate(${AS} ${CX} ${CY})">${ticks}<line x1="${nx1.toFixed(2)}" y1="${ny1.toFixed(2)}" x2="${nx2.toFixed(2)}" y2="${ny2.toFixed(2)}" stroke="rgba(255,255,255,.85)" stroke-width="1.5" stroke-linecap="round"/></g>
<circle cx="${CX}" cy="${CY}" r="2.5" fill="#1e3050" stroke="rgba(255,255,255,.6)" stroke-width="1"/>
<text x="${CX}" y="${CY-8}" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="700" fill="${col}">${dv}</text>
<text x="${(CX+lR*Math.cos(sR)).toFixed(1)}" y="${(CY+lR*Math.sin(sR)).toFixed(1)}" text-anchor="middle" font-family="sans-serif" font-size="6.5" fill="#475569">${mn}</text>
<text x="${(CX+lR*Math.cos(eR)).toFixed(1)}" y="${(CY+lR*Math.sin(eR)).toFixed(1)}" text-anchor="middle" font-family="sans-serif" font-size="6.5" fill="#475569">${mx}</text>
</svg>
<div class="pglbl"><ha-icon icon="${srvIcon(item)}" style="color:${col};--mdc-icon-size:13px"></ha-icon><span>${lbl}</span></div>
</div>`;
  }

  // ── Serveur renderer ──────────────────────────────────
  _renderSrv(){
    const items=this._cfg.serveur||[];
    if(!items.length)return`<div class="empty">🖥️<div>Aucun serveur configuré</div></div>`;
    const groups={};
    items.forEach(item=>{if(typeof item==="string")return;const s=item.server||"Serveur";if(!groups[s])groups[s]=[];groups[s].push(item);});

    const getCol=(item,pct,segs)=>{
      const n=((item.label||"")+(item.entity||"")).toLowerCase();
      const isDisk=n.match(/disk|disque|hdd|ssd|nvme|c:|d:|e:|f:|stockage/),isFree=n.match(/libre|free/);
      if(isDisk||isFree){const up=isFree?(100-pct):pct;return up>=95?"#ef4444":up>=85?"#f59e0b":"#34d399";}
      let col=segs[0].color;for(const s of segs){if(pct>=s.from)col=s.color;} return col;
    };

    const rStat=(item)=>{
      if(!item.entity)return"";
      const st=this._hass?.states[item.entity];if(!st)return"";
      const val=parseFloat(st.state)||0,pct=Math.min(100,Math.max(0,val));
      const unit=item.unit||st.attributes?.unit_of_measurement||"";
      const lbl=item.label||st.attributes?.friendly_name||item.entity.split(".")[1].replace(/_/g," ");
      const segs=item.segments||[{from:0,color:"#818cf8"},{from:65,color:"#f59e0b"},{from:85,color:"#ef4444"}];
      const n=((item.label||"")+(item.entity||"")).toLowerCase();
      let col=getCol(item,pct,segs);
      let sv=isNaN(val)?(st.state||"–"):unit==="%"?`${pct.toFixed(0)}%`:unit==="°C"?`${val.toFixed(1)}°C`:`${val.toFixed(1)} ${unit}`;
      const dom=item.entity.split(".")[0];

      // Binary sensor → Online/Offline animé
      if(dom==="binary_sensor"){
        const online=st.state==="on"; col=online?"#34d399":"#ef4444";
        return`<div class="srv-stat entity-item" data-entity="${item.entity}" style="border-color:${col}33;background:${col}08">
          <div class="srv-stat-top"><ha-icon icon="${srvIcon(item)}" style="color:${col};--mdc-icon-size:16px"></ha-icon><span class="srv-sl">${lbl}</span></div>
          <div class="srv-sv" style="color:${col};display:flex;align-items:center;gap:6px">
            <span class="s-dot-live" style="background:${col};box-shadow:0 0 6px ${col};animation:srvPulse ${online?"2":"4"}s ease-out infinite"></span>
            ${online?"Online":"Offline"}
          </div>
        </div>`;
      }

      // Uptime
      if(n.match(/uptime/)){
        const m=parseFloat(st.state),u=st.attributes?.unit_of_measurement||"";
        if(!isNaN(m)){const tot=u==="h"?m*60:u==="s"?m/60:m,d=Math.floor(tot/1440),h=Math.floor((tot%1440)/60),mn=Math.floor(tot%60);sv=d>0?`${d}j ${h}h`:h>0?`${h}h ${mn}m`:`${mn}m`;}
        col="#34d399";
        return`<div class="srv-stat entity-item" data-entity="${item.entity}">
          <div class="srv-stat-top"><ha-icon icon="mdi:clock-check-outline" style="color:${col};--mdc-icon-size:16px"></ha-icon><span class="srv-sl">${lbl}</span></div>
          <div class="srv-sv" style="color:${col}">${sv}</div>
        </div>`;
      }

      // Disque libre → ring SVG
      if(n.match(/libre|free/) && st){
        const fv=parseFloat(st.state),fu=st.attributes?.unit_of_measurement||"GB",mG=parseFloat(item.max||1000);
        const usedPct=isNaN(fv)?50:Math.max(0,100-fv/mG*100);
        col=usedPct>=95?"#ef4444":usedPct>=85?"#f59e0b":"#34d399";
        const arcLen=(usedPct/100*94.2).toFixed(1);
        return`<div class="srv-stat entity-item" data-entity="${item.entity}" style="flex-direction:row;gap:10px;align-items:center">
          <svg viewBox="0 0 36 36" style="width:36px;height:36px;flex-shrink:0">
            <circle cx="18" cy="18" r="15" fill="none" stroke="#1a2840" stroke-width="4"/>
            <circle cx="18" cy="18" r="15" fill="none" stroke="${col}" stroke-width="4"
              stroke-dasharray="${arcLen} 94.2" stroke-dashoffset="23.6" stroke-linecap="round"
              style="transition:stroke-dasharray .9s ease"/>
            <text x="18" y="22" text-anchor="middle" font-size="7.5" font-weight="700" fill="${col}">${usedPct.toFixed(0)}%</text>
          </svg>
          <div style="display:flex;flex-direction:column;gap:2px;min-width:0">
            <span class="srv-sl">${lbl}</span>
            <span class="srv-sv" style="color:${col};font-size:.85rem">${isNaN(fv)?"–":`${fv.toFixed(0)} ${fu}`}</span>
          </div>
        </div>`;
      }

      // Processus → mini barres animées
      if(n.match(/process|processus/)){
        const cnt=parseInt(st.state)||0;
        const bars=Array.from({length:Math.min(cnt,10)},(_,ci)=>
          `<div class="s-proc-bar" style="height:${4+Math.random()*10|0}px;animation-delay:${(ci*0.13).toFixed(2)}s"></div>`
        ).join("");
        return`<div class="srv-stat entity-item" data-entity="${item.entity}">
          <div class="srv-stat-top"><ha-icon icon="mdi:format-list-checks" style="color:#818cf8;--mdc-icon-size:16px"></ha-icon><span class="srv-sl">${lbl}</span></div>
          <div class="srv-sv" style="color:#818cf8">${st.state}</div>
          <div class="s-proc-bars">${bars}</div>
        </div>`;
      }

      // Générique
      return`<div class="srv-stat entity-item" data-entity="${item.entity}">
        <div class="srv-stat-top"><ha-icon icon="${srvIcon(item)}" style="color:${col};--mdc-icon-size:16px"></ha-icon><span class="srv-sl">${lbl}</span></div>
        <div class="srv-sv" style="color:${col}">${sv}</div>
      </div>`;
    };

    const rBar=(item)=>{
      if(!item.entity)return"";
      const st=this._hass?.states[item.entity];if(!st)return"";
      const val=parseFloat(st.state)||0,pct=Math.min(100,Math.max(0,val));
      const unit=item.unit||st.attributes?.unit_of_measurement||"";
      const lbl=item.label||st.attributes?.friendly_name||item.entity.split(".")[1].replace(/_/g," ");
      const segs=item.segments||[{from:0,color:"#818cf8"},{from:65,color:"#f59e0b"},{from:85,color:"#ef4444"}];
      const col=getCol(item,pct,segs);
      const dv=isNaN(val)?(st.state||"–"):unit==="%"?`${pct.toFixed(0)}%`:unit==="°C"?`${val.toFixed(1)}°C`:`${val.toFixed(1)} ${unit}`;
      const barStyle=pct>65
        ?`linear-gradient(90deg,${segs[0]?.color||"#818cf8"},${col} ${pct}%);background-size:200% 100%;animation:barFlow 2s linear infinite`
        :col;
      return`<div class="srv-bar entity-item" data-entity="${item.entity}">
        <div class="bar-info">
          <div style="display:flex;align-items:center;gap:6px">
            <ha-icon icon="${srvIcon(item)}" style="color:${col};--mdc-icon-size:14px"></ha-icon>
            <span style="font-size:.72rem;color:#8aaac8">${lbl}</span>
          </div>
          <span style="color:${col};font-weight:700;font-size:.75rem">${dv}</span>
        </div>
        <div class="bar-track" style="position:relative">
          <div class="bar-fill" style="width:${unit==="%"?pct:0}%;background:${barStyle};transition:width .9s cubic-bezier(.4,0,.2,1)"></div>
          ${pct>85?`<div style="position:absolute;inset:0;border-radius:99px;background:${col}22;animation:coreFlash 1s ease-in-out infinite"></div>`:""}
        </div>
      </div>`;
    };

    const entries=Object.entries(groups);
    const blocks=entries.map(([nm,its])=>{
      const g=its.filter(i=>i.type==="gauge");
      const b=its.filter(i=>!i.type||i.type==="bar");
      const s=its.filter(i=>i.type==="stat");
      return`<div class="srv-block" style="position:relative;overflow:hidden">
        <div class="srv-scan-line"></div>
        <div class="srv-title">
          <span class="srv-dot" style="background:var(--tc);animation:srvPulse 2.5s ease-out infinite"></span>
          ${nm}
        </div>
        ${g.length?`<div class="pgauges">${g.map(i=>this._proGauge(i)).join("")}</div>`:""}
        ${b.length?`<div class="srv-bars">${b.map(rBar).join("")}</div>`:""}
        ${s.length?`<div class="srv-stats">${s.map(rStat).join("")}</div>`:""}
      </div>`;
    });
    return entries.length>=2?`<div class="srv-cols">${blocks.join("")}</div>`:blocks.join("");
  }

  _tempTile(e,i=0){
    const id=typeof e==="string"?e:e.entity;if(!id)return"";
    const lbl=(typeof e==="object"&&e.label)||null;
    const st=this._hass?.states[id];if(!st)return"";
    const name=lbl||st.attributes.friendly_name||id.split(".")[1].replace(/_/g," ");
    const tempVal=parseFloat(st.state);
    const tempStr=isNaN(tempVal)?st.state:`${tempVal.toFixed(1)}°C`;
    const tCol=tempColor(tempVal);
    const tRgbMap={"#93c5fd":"147,197,253","#60a5fa":"96,165,250","#34d399":"52,211,153","#6ee7b7":"110,231,183","#fbbf24":"251,191,36","#f59e0b":"245,158,11","#f97316":"249,115,22","#f87171":"248,113,113"};
    const tRgb=tRgbMap[tCol]||"52,211,153";
    const battAttr=st.attributes.battery_level??st.attributes.battery;
    const autoBId=findBatt(id,this._hass);
    const autoBSt=autoBId?this._hass?.states[autoBId]:null;
    const battPct=battAttr!=null?battAttr:(autoBSt?parseFloat(autoBSt.state):null);
    const bInfo=battPct!=null&&!isNaN(battPct)?battInfo(battPct):null;
    const humId=findHumid(id,this._hass);
    const humSt=humId?this._hass?.states[humId]:null;
    const humVal=humSt?parseFloat(humSt.state):null;
    const humC=humVal!=null&&!isNaN(humVal)?humidColor(humVal):"#38bdf8";
    const humStr=humVal!=null&&!isNaN(humVal)?`${humVal.toFixed(0)}%`:null;
    const humRing=humStr?(()=>{
      const r=18,circ=2*Math.PI*r,arc=(humVal/100)*(270/360)*circ;
      return `<svg viewBox="0 0 44 44" style="width:44px;height:44px">
        <circle cx="22" cy="22" r="${r}" fill="none" stroke="#1e293b" stroke-width="4"
          stroke-dasharray="${((270/360)*circ).toFixed(1)} ${circ.toFixed(1)}" stroke-dashoffset="${(circ*0.625).toFixed(1)}" stroke-linecap="round"/>
        <circle cx="22" cy="22" r="${r}" fill="none" stroke="${humC}" stroke-width="4"
          stroke-dasharray="${arc.toFixed(1)} ${circ.toFixed(1)}" stroke-dashoffset="${(circ*0.625).toFixed(1)}" stroke-linecap="round"/>
        <text x="22" y="22" text-anchor="middle" dominant-baseline="middle" font-size="8" font-weight="700" fill="${humC}">${humVal.toFixed(0)}%</text>
        <text x="22" y="31" text-anchor="middle" font-size="5" fill="#334155">HUM</text>
      </svg>`;
    })():"";
    return`<div class="tile tile-temp entity-item" data-entity="${id}"
      style="--tc:${tCol};--trgb:${tRgb};animation:fadeSlideIn .35s ease both;animation-delay:${(i||0)*0.07}s">
  <div class="tt-bg"><div class="tt-orb" style="background:radial-gradient(circle,${tCol}30 0%,transparent 70%);animation:tt-pulse ${6+(i||0)}s ease-in-out infinite;"></div></div>
  <div class="tt-header">
    <div class="tt-name-row"><ha-icon icon="mdi:thermometer" style="color:${tCol};--mdc-icon-size:15px"></ha-icon><span class="tt-name">${name}</span></div>
    ${bInfo?`<span class="tt-batt-badge" style="color:${bInfo.color}"><ha-icon icon="${bInfo.icon}" style="--mdc-icon-size:12px"></ha-icon>${Math.round(battPct)}%</span>`:""}
  </div>
  <div class="tt-value-wrap"><span class="tt-val" data-id="${id}" style="color:${tCol};text-shadow:0 0 30px ${tCol}88">${tempStr}</span></div>
  ${humStr?`<div class="tt-footer">${humRing}</div>`:""}
</div>`;
  }

  // ── Camera tile ───────────────────────────────────────────
  _camTile(e){
    const id=typeof e==="string"?e:e.entity;if(!id)return"";
    const lbl=(typeof e==="object"&&e.label)||null;
    const st=this._hass?.states[id];
    const name=lbl||st?.attributes?.friendly_name||id.split(".")[1].replace(/_/g," ");
    const cat=CATS.find(c=>c.key===this._tab)||CATS[0];
    const uid=id.replace(/\./g,"_");
    return`<div class="cam-card" style="grid-column:span 2">
  <div class="cam-top">
    <div class="cam-tl">
      <ha-icon icon="mdi:cctv" style="color:#34d399;--mdc-icon-size:15px"></ha-icon>
      <span class="cam-nm">${name}</span>
    </div>
    <div class="cam-live"><span class="live-d"></span>LIVE</div>
  </div>
  <div class="cam-frame" style="height:220px;width:100%" data-cam="${id}">
    <div class="cam-scan"></div>
    <div class="cam-spin" data-id="${id}"><div class="sp-r"></div></div>
    <img class="cam-img" data-id="${id}" src="" alt="${name}"
         style="width:100%;height:100%;object-fit:cover;opacity:0;display:block;position:absolute;inset:0;transition:opacity .35s;"/>
    <div class="cam-off" data-id="${id}"
         style="display:none;position:absolute;inset:0;z-index:1;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:#4e6a8a;font-size:.72rem;background:#0f172a;">
      <ha-icon icon="mdi:camera-off-outline" style="--mdc-icon-size:30px;opacity:.35"></ha-icon>
      <span>Indisponible</span>
    </div>
    <div class="cam-ov"><div class="cam-pill"><ha-icon icon="mdi:fullscreen" style="--mdc-icon-size:13px"></ha-icon> Agrandir</div></div>
  </div>
</div>`;
  }

  _tile(e,i=0){
    const id=typeof e==="string"?e:e.entity;if(!id)return"";
    // Camera gets its own tile
    if(id.split(".")[0]==="camera") return this._camTile(e);
    const lbl=(typeof e==="object"&&e.label)||null;
    const st=this._hass?.states[id];if(!st)return"";
    const d=id.split(".")[0];
    const name=lbl||st.attributes.friendly_name||id.split(".")[1].replace(/_/g," ");
    const active=isOn(st.state);
    const cat=CATS.find(c=>c.key===this._tab)||CATS[0];
    const sv=this._tab==="ouvertures"||(d==="binary_sensor"&&["door","window"].includes(st.attributes?.device_class||""))||d==="cover"
      ?(isOn(st.state)?"Ouvert":"Fermé")
      :st.state+(st.attributes?.unit_of_measurement?" "+st.attributes.unit_of_measurement:"");
    // Battery for ouvertures
    const battAttr=st.attributes.battery_level??st.attributes.battery;
    const autoBId=this._tab==="ouvertures"?findBatt(id,this._hass):null;
    const autoBSt=autoBId?this._hass?.states[autoBId]:null;
    const battPct=battAttr!=null?battAttr:(autoBSt?parseFloat(autoBSt.state):null);
    const bInfo=battPct!=null&&!isNaN(battPct)?battInfo(battPct):null;
    const battHtml=bInfo?`<span class="batt" style="color:${bInfo.color}"><ha-icon icon="${bInfo.icon}" style="--mdc-icon-size:14px"></ha-icon>${Math.round(battPct)}%</span>`:"";
    // Indicateur ouverture
    const isOuvTile=this._tab==="ouvertures"||d==="cover"||(d==="binary_sensor"&&["door","window"].includes(st.attributes?.device_class||""));
    const openIndicator=isOuvTile?`<div class="open-ind">
      <div class="open-ind-bar" style="width:${active?100:8}%;background:${active?cat.color:"#1e293b"};transition:width .5s cubic-bezier(.34,1.3,.64,1)"></div>
    </div>`:"";

    // Tuile éclairage
    const isLight=this._tab==="eclairages";
    if(isLight){
      const brightness=st.attributes?.brightness?Math.round(st.attributes.brightness/2.55):null;
      const warmth=active?"rgba(245,158,11,.14)":"transparent";
      const rays=active?Array.from({length:8},(_,ri)=>{
        const angle=ri*45, delay=(ri*0.12).toFixed(2);
        const len=12+Math.random()*6|0;
        return `<div class="l-ray" style="transform:rotate(${angle}deg);animation-delay:${delay}s">
          <div class="l-ray-line" style="height:${len}px"></div>
        </div>`;
      }).join(""):"";
      const sparks=active?Array.from({length:4},(_,si)=>{
        const left=20+si*18, delay=(si*0.4).toFixed(1), dur=(1.5+si*0.3).toFixed(1);
        return `<div class="l-spark" style="left:${left}%;animation-duration:${dur}s;animation-delay:${delay}s"></div>`;
      }).join(""):"";
      return`<div class="tile ${active?"active l-active":""} entity-item" data-entity="${id}"
        style="--tc:${cat.color};--trgb:${cat.rgb};animation:fadeSlideIn .35s ease both;animation-delay:${(i||0)*0.05}s;${active?"animation:fadeSlideIn .35s ease both,warmBreath 4s ease-in-out infinite":""};">
        <!-- Particules flottantes -->
        <div class="l-sparks">${sparks}</div>
        <!-- Icône avec rayons -->
        <div class="l-icon-wrap">
          ${active?`<div class="l-rays">${rays}</div>`:""}
          <div class="l-halo" style="opacity:${active?.7:0}"></div>
          <ha-icon icon="${resolveIcon(id,st.state,st.attributes)}" style="--mdc-icon-size:28px;color:${active?cat.color:"#334155"};position:relative;z-index:2;transition:color .4s;${active?"filter:drop-shadow(0 0 8px "+cat.color+")":""}"></ha-icon>
        </div>
        <!-- Texte -->
        <div class="tile-text">
          <div class="name">${name}</div>
          <div class="state-row">
            <span style="font-weight:${active?700:400};color:${active?cat.color:"#64748b"}">${sv}</span>
            ${brightness!=null&&active?`<span class="l-bright">☀ ${brightness}%</span>`:""}
          </div>
          ${active?`<div class="l-bar-track"><div class="l-bar-fill" style="width:${brightness||100}%"></div></div>`:""}
        </div>
      </div>`;
    }

    // Tuile prise : anneau + onde électrique
    const isPrise=this._tab==="prises";
    if(isPrise){
      // Onde sinusoïdale SVG
      const wavePts=Array.from({length:9},(_,i)=>`${i*14},${12+Math.sin(i*0.9)*(active?5:2)}`).join(" ");
      const wave2Pts=Array.from({length:9},(_,i)=>`${i*14},${12+Math.sin(i*0.9+1.5)*(active?4:1.5)}`).join(" ");
      return`<div class="tile ${active?"active p-active":""} entity-item" data-entity="${id}"
        style="--tc:${cat.color};--trgb:${cat.rgb};animation:fadeSlideIn .35s ease both;animation-delay:${(i||0)*0.05}s;${active?`animation:fadeSlideIn .35s ease both,elecFlicker 4s ease-in-out ${i*0.8}s infinite`:"animation:fadeSlideIn .35s ease both"}">
        <div class="p-icon-wrap">
          ${active?`<div class="p-ring"></div><div class="p-pop"></div>`:""}
          <ha-icon icon="${resolveIcon(id,st.state,st.attributes)}" style="--mdc-icon-size:26px;color:${active?cat.color:"#334155"};position:relative;z-index:2;transition:color .3s"></ha-icon>
        </div>
        <div class="tile-text">
          <div class="name">${name}</div>
          <div class="state-row"><span style="font-weight:${active?700:400};color:${active?cat.color:"#64748b"}">${sv}</span>${battHtml}</div>
          ${active?`<svg class="p-wave" viewBox="0 0 112 24" preserveAspectRatio="none">
            <polyline points="${wavePts}" fill="none" stroke="${cat.color}" stroke-width="1.5" stroke-linecap="round" opacity=".5" style="animation:elecWave 1.2s ease-in-out infinite"/>
            <polyline points="${wave2Pts}" fill="none" stroke="${cat.color}" stroke-width="1" stroke-linecap="round" opacity=".3" style="animation:elecWave 1.2s ease-in-out .4s infinite"/>
          </svg>`:""}
        </div>
      </div>`;
    }

    return`<div class="tile ${active?"active":""} entity-item" data-entity="${id}" style="--tc:${cat.color};animation:fadeSlideIn .35s ease both;animation-delay:${(i||0)*0.05}s">
  <ha-icon icon="${resolveIcon(id,st.state,st.attributes)}" style="--mdc-icon-size:28px;color:${active?cat.color:"#64748b"};transition:color .3s"></ha-icon>
  <div class="tile-text">
    <div class="name">${name}</div>
    <div class="state-row"><span style="font-weight:${active?700:400}">${sv}</span>${battHtml}</div>
    ${openIndicator}
  </div>
</div>`;
  }


  // ── Mise à jour légère sans re-render ─────────────────────
  _patch(){
    if(!this._hass||!this.shadowRoot) return;
    // Update summary pills
    const pills=this.shadowRoot.querySelector(".pills");
    if(pills) pills.innerHTML=this._summary();
    // Rewire pill clicks
    this.shadowRoot.querySelectorAll(".spill[data-tab]").forEach(b=>
      b.addEventListener("click",()=>{this._tab=b.dataset.tab;this._render();})
    );
    // Update tab counts
    const cats=CATS.map(c=>({...c,label:this._cfg[`label_${c.key}`]||c.label}));
    cats.forEach(cat=>{
      const tab=this.shadowRoot.querySelector(`.tab[data-tab="${cat.key}"]`);
      if(!tab) return;
      let active=0;
      (this._cfg[cat.key]||[]).forEach(e=>{
        const id=typeof e==="string"?e:e.entity,st=this._hass?.states[id];
        if(st&&isOn(st.state)) active++;
      });
      const total=(this._cfg[cat.key]||[]).length;
      const cnt=tab.querySelector(".tab-cnt");
      if(cnt) cnt.textContent=cat.key==="temperatures"?total:active>0?`${active} / ${total}`:`0 / ${total}`;
    });
    // Update tile states within current tab
    if(this._tab==="temperatures"){
      (this._cfg.temperatures||[]).forEach(e=>{
        const id=typeof e==="string"?e:e.entity;
        const st=this._hass?.states[id]; if(!st) return;
        const val=parseFloat(st.state),col=tempColor(val);
        const el=this.shadowRoot.querySelector(`.tt-val[data-id="${id}"]`);
        if(el){el.textContent=isNaN(val)?st.state:`${val.toFixed(2)}°C`;el.style.color=col;}
      });
    } else if(this._tab!=="serveur"){
      (this._cfg[this._tab]||[]).forEach(e=>{
        const id=typeof e==="string"?e:e.entity;
        const st=this._hass?.states[id]; if(!st) return;
        const tile=this.shadowRoot.querySelector(`.tile.entity-item[data-entity="${id}"]`);
        if(!tile) return;
        const active=isOn(st.state);
        tile.classList.toggle("active",active);
        const ico=tile.querySelector("ha-icon");
        if(ico){
          const cat=CATS.find(c=>c.key===this._tab)||CATS[0];
          ico.setAttribute("icon",resolveIcon(id,st.state,st.attributes));
          ico.style.color=active?cat.color:"#64748b";
        }
        const sr=tile.querySelector(".state-row span");
        if(sr) sr.textContent=this._tab==="ouvertures"?(isOn(st.state)?"Ouvert":"Fermé"):(st.state+(st.attributes?.unit_of_measurement?" "+st.attributes.unit_of_measurement:""));
      });
    }
  }

  // ── Render ────────────────────────────────────────────
  _render(){
    if(!this._hass||!this._cfg)return;
    this._rendered=true;
    // Stop old cam timers before re-render
    this._timers.forEach(t=>clearInterval(t)); this._timers=[];
    const cats=CATS.map(c=>({...c,label:this._cfg[`label_${c.key}`]||c.label}));
    const cat=cats.find(c=>c.key===this._tab)||cats[0];
    const items=this._cfg[this._tab]||[];

    this.shadowRoot.innerHTML=`<style>
:host{display:block;font-family:sans-serif;}
*{box-sizing:border-box;margin:0;padding:0;}
.card{width:100%;background:#020617;border-radius:28px;padding:24px;color:white;}
/* Title */
.title{font-size:1.8rem;font-weight:800;margin-bottom:16px;}
/* Summary stat cards */
.pills{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:20px;}
.spill{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;background:#0d1828;border:1px solid #1e293b;cursor:pointer;transition:background .2s,transform .15s;min-width:0;}
.spill:hover{background:#162032;transform:translateY(-1px);}
.spill-icon{flex-shrink:0;}
.spill-body{display:flex;flex-direction:column;gap:1px;min-width:0;}
.spill-count{font-size:1rem;font-weight:800;line-height:1;}
.spill-lbl{font-size:.62rem;color:#475569;font-weight:600;text-transform:uppercase;letter-spacing:.04em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.spill-sep{display:none;}
/* Tabs */
.tabs{display:flex;gap:10px;margin-bottom:20px;overflow-x:auto;scrollbar-width:none;flex-wrap:wrap;}
.tabs::-webkit-scrollbar{display:none;}
.tab{display:flex;align-items:center;gap:8px;padding:16px 20px;border-radius:12px;cursor:pointer;border:none;color:#94a3b8;background:#1e293b;font-size:.95rem;font-weight:600;font-family:inherit;transition:.2s;white-space:nowrap;}
.tab:hover{background:#334155;}
.tab.on{background:var(--tc);color:#020617;font-weight:800;background-image:linear-gradient(90deg,transparent 0%,rgba(255,255,255,.15) 50%,transparent 100%);background-size:200% 100%;animation:shimmer 2.5s ease infinite;}
.tab.on ha-icon{color:#020617;}
.tab ha-icon{--mdc-icon-size:18px;}
.tab-cnt{background:rgba(0,0,0,.2);border-radius:99px;padding:3px 10px;font-size:.95rem;font-weight:700;}
.tab.on .tab-cnt{background:rgba(0,0,0,.25);color:#020617;}
/* Grid */
/* Animations globales */
@keyframes fadeSlideIn{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
@keyframes pulseGlow{0%,100%{box-shadow:0 0 8px rgba(var(--tc-rgb,100,116,139),.15);}50%{box-shadow:0 0 18px rgba(var(--tc-rgb,100,116,139),.4);}}
@keyframes countUp{from{opacity:0;transform:scale(.7);}to{opacity:1;transform:scale(1);}}
@keyframes shimmer{0%{background-position:-200% 0;}100%{background-position:200% 0;}}
@keyframes breathe{0%,100%{transform:scale(1);}50%{transform:scale(1.08);}}
@keyframes slideRight{from{width:0;}to{width:var(--w,100%);}}
@keyframes elecRing{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}
@keyframes elecWave{0%,100%{transform:scaleY(1);}25%{transform:scaleY(1.4);}75%{transform:scaleY(.6);}}
@keyframes elecPop{0%{transform:scale(1);opacity:.8;}50%{transform:scale(1.6);opacity:.3;}100%{transform:scale(2.2);opacity:0;}}
@keyframes elecFlicker{0%,100%{opacity:1;}45%{opacity:.9;}50%{opacity:.6;}55%{opacity:.95;}}
@keyframes lightRay{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}
@keyframes lightPulse{0%,100%{transform:scale(1);opacity:.4;}50%{transform:scale(1.3);opacity:.15;}}
@keyframes sparkFloat{0%{transform:translateY(0) scale(1);opacity:.8;}100%{transform:translateY(-28px) scale(0);opacity:0;}}
@keyframes lightOn{from{opacity:0;transform:scale(.6);}to{opacity:1;transform:scale(1);}}
@keyframes warmBreath{0%,100%{box-shadow:0 0 12px rgba(245,158,11,.2);}50%{box-shadow:0 0 28px rgba(245,158,11,.5),0 0 50px rgba(245,158,11,.1);}}
@keyframes srvPulse{0%,100%{transform:scale(1);opacity:1;}50%{transform:scale(1.5);opacity:0;}}
@keyframes srvScan{0%{transform:translateY(-100%);}100%{transform:translateY(100vh);}}
@keyframes srvBlink{0%,100%{opacity:1;}49%{opacity:1;}50%{opacity:.3;}99%{opacity:.3;}}
@keyframes barFlow{0%{background-position:0% 50%;}100%{background-position:200% 50%;}}
@keyframes coreFlash{0%,100%{opacity:.4;}50%{opacity:1;}}
@keyframes gaugeNeedle{from{stroke-dasharray:0 ${2*3.14159*48};}to{stroke-dasharray:var(--vl) ${2*3.14159*48};}}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;}
/* Generic tile */
.tile{background:#1e293b;padding:18px;border-radius:18px;display:flex;align-items:center;gap:14px;cursor:pointer;border:1.5px solid transparent;transition:transform .2s,background .25s,border-color .25s,box-shadow .25s;}
.tile:hover{transform:translateY(-3px);background:#253347;box-shadow:0 8px 24px rgba(0,0,0,.35);}
.tile.active{border-color:var(--tc);background:rgba(var(--tc-rgb,100,116,139),.1);box-shadow:0 0 20px rgba(var(--tc-rgb,100,116,139),.15);animation:pulseGlow 6s ease-in-out infinite;}
.tile.active:hover{transform:translateY(-3px);box-shadow:0 8px 28px rgba(var(--tc-rgb,100,116,139),.25);}
.tile-text{flex:1;min-width:0;}
.name{font-weight:700;font-size:1rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.state-row{display:flex;justify-content:space-between;align-items:center;color:#94a3b8;font-size:.875rem;margin-top:4px;}
.batt{display:flex;align-items:center;gap:3px;font-size:.78rem;}
/* Temperature tile */
/* Temperature tile */
.tile-temp{
  padding:0;border-radius:18px;cursor:pointer;
  border:1.5px solid rgba(var(--trgb,52,211,153),.25);
  background:linear-gradient(145deg,rgba(var(--trgb,52,211,153),.12),#0d1828 60%);
  transition:transform .2s,box-shadow .3s,border-color .3s;
  flex-direction:column;display:flex;overflow:hidden;position:relative;
  box-shadow:0 0 0 0 rgba(var(--trgb,52,211,153),0);
  min-height:160px;
}
.tile-temp:hover{
  transform:translateY(-4px);
  box-shadow:0 12px 32px rgba(0,0,0,.5),0 0 20px rgba(var(--trgb,52,211,153),.2);
}
/* Orbe de fond animé */
.tt-bg{position:absolute;inset:0;pointer-events:none;overflow:hidden;}
.tt-orb{position:absolute;width:160%;height:160%;top:-30%;left:-30%;opacity:.6;}
@keyframes tt-pulse{0%,100%{transform:scale(1);opacity:.5;}50%{transform:scale(1.15);opacity:.8;}}
/* Header */
.tt-header{display:flex;justify-content:space-between;align-items:center;padding:14px 14px 0;position:relative;z-index:1;}
.tt-name-row{display:flex;align-items:center;gap:5px;min-width:0;}
.tt-name{font-weight:700;font-size:.82rem;color:#c8dff0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.tt-batt-badge{display:flex;align-items:center;gap:3px;font-size:.65rem;font-weight:700;flex-shrink:0;opacity:.8;}
/* Valeur */
.tt-value-wrap{flex:1;display:flex;align-items:center;justify-content:center;position:relative;z-index:1;padding:8px 0;}
.tt-val{font-size:2rem;font-weight:800;line-height:1;letter-spacing:-.04em;transition:color .5s,text-shadow .5s;}
/* Footer humidité */
.tt-footer{display:flex;justify-content:center;padding:0 14px 12px;position:relative;z-index:1;}
/* Server */
.srv-cols{display:grid;grid-template-columns:1fr 1fr;gap:20px;}
.srv-block{background:#0f172a;border-radius:20px;padding:20px;border:1px solid #1e293b;}
.srv-hdr{font-weight:800;font-size:.9rem;color:#94a3b8;text-transform:uppercase;margin-bottom:15px;display:flex;align-items:center;gap:10px;}
.dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;box-shadow:0 0 8px currentColor;}
.pgauges{display:flex;flex-direction:row;flex-wrap:nowrap;gap:6px;margin-bottom:12px;}
.pgwrap{display:flex;flex-direction:column;align-items:center;gap:2px;flex:1;min-width:0;max-width:90px;cursor:pointer;}
.pgsvg{width:100%;max-width:80px;height:auto;}
.pglbl{display:flex;align-items:center;gap:4px;font-size:.7rem;font-weight:600;color:#475569;}
.srv-bars{display:flex;flex-direction:column;gap:10px;}
.srv-bar{cursor:pointer;}
.bar-info{display:flex;justify-content:space-between;align-items:center;font-size:.85rem;color:#94a3b8;margin-bottom:5px;}
.bar-track{height:8px;background:#1e293b;border-radius:4px;overflow:hidden;}
.bar-fill{height:100%;border-radius:4px;animation:slideRight .9s cubic-bezier(.4,0,.2,1) both;}
.srv-stats{display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:8px;margin-top:10px;}
.srv-stat{background:#0f172a;border:1px solid #1e293b;border-radius:14px;padding:12px 10px 10px;display:flex;flex-direction:column;gap:7px;cursor:pointer;transition:all .2s;}
.srv-stat:hover{background:#1e293b;border-color:#334155;transform:translateY(-1px);}
.s-status-dot{display:inline-block;width:8px;height:8px;border-radius:50%;flex-shrink:0;}
.s-cores{display:flex;gap:3px;flex-wrap:wrap;margin-top:2px;}
.s-core{width:6px;height:12px;border-radius:2px;background:#818cf8;animation:coreFlash 1.2s ease-in-out infinite;}
.bar-danger-flash{position:absolute;inset:0;border-radius:99px;}
.srv-stat-top{display:flex;align-items:center;gap:7px;}
.srv-sv{font-size:1rem;font-weight:700;line-height:1;letter-spacing:-.01em;}
.srv-sl{font-size:.72rem;color:#64748b;font-weight:600;text-transform:capitalize;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
/* Camera tile — classes identiques à exterieur-card */
.cam-card{background:#1e293b;border-radius:18px;overflow:hidden;display:flex;flex-direction:column;transition:border-color .2s;}
.cam-card:hover{border-color:#334155;}
.cam-top{display:flex;align-items:center;justify-content:space-between;padding:9px 14px;background:#0f172a;border-bottom:1px solid #1e293b;}
.cam-tl{display:flex;align-items:center;gap:7px;}
.cam-nm{font-size:.76rem;font-weight:600;color:#fff;text-transform:capitalize;}
.cam-live{display:flex;align-items:center;gap:5px;font-size:.64rem;font-weight:700;color:#34d399;letter-spacing:.04em;}
.live-d{width:8px;height:8px;border-radius:50%;background:#34d399;box-shadow:0 0 10px #34d399;animation:livd 1.5s infinite;}
@keyframes livd{0%{transform:scale(1);box-shadow:0 0 10px #34d399;}50%{transform:scale(.55);opacity:.35;box-shadow:0 0 4px #34d399;}100%{transform:scale(1);box-shadow:0 0 10px #34d399;}}
.cam-frame{position:relative;cursor:pointer;line-height:0;background:#0f172a;overflow:hidden;}
.cam-spin{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#0f172a;z-index:2;}
.sp-r{width:26px;height:26px;border:2px solid #1e293b;border-top-color:#34d399;border-radius:50%;animation:sr .7s linear infinite;}
@keyframes sr{to{transform:rotate(360deg);}}
.cam-scan{position:absolute;left:0;right:0;height:2px;top:0;background:linear-gradient(90deg,transparent,rgba(52,211,153,.5),transparent);animation:sc 4s ease-in-out infinite;pointer-events:none;z-index:4;}
@keyframes sc{0%{top:0;opacity:1;}90%{top:100%;opacity:.1;}100%{top:100%;opacity:0;}}
.cam-ov{position:absolute;inset:0;z-index:3;display:flex;align-items:flex-end;justify-content:flex-end;padding:10px;background:linear-gradient(to top,rgba(0,0,0,.5),transparent 45%);opacity:0;transition:opacity .2s;}
.cam-frame:hover .cam-ov{opacity:1;}
.cam-pill{display:flex;align-items:center;gap:5px;padding:5px 11px;border-radius:99px;background:rgba(0,0,0,.6);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.15);color:#fff;font-size:.70rem;font-weight:600;}
.cam-pill ha-icon{--mdc-icon-size:13px;}
/* Content animation */
#tab-content{animation:fadeSlideIn .3s ease both;}

/* Éclairage */
.l-icon-wrap{position:relative;width:46px;height:46px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.l-halo{position:absolute;inset:-8px;border-radius:50%;background:radial-gradient(circle,rgba(245,158,11,.5) 0%,transparent 70%);animation:lightPulse 3s ease-in-out infinite;pointer-events:none;}
.l-rays{position:absolute;inset:-16px;animation:lightRay 8s linear infinite;}
.l-ray{position:absolute;top:50%;left:50%;width:2px;transform-origin:bottom center;display:flex;justify-content:center;}
.l-ray-line{width:1.5px;background:linear-gradient(to top,rgba(245,158,11,.6),transparent);border-radius:2px;margin-bottom:20px;animation:lightPulse 2s ease-in-out infinite;}
.l-sparks{position:absolute;bottom:8px;left:0;right:0;height:30px;pointer-events:none;overflow:hidden;}
.l-spark{position:absolute;bottom:0;width:3px;height:3px;border-radius:50%;background:#fbbf24;box-shadow:0 0 4px #f59e0b;animation:sparkFloat 1.8s ease-out infinite;}
.l-active{background:linear-gradient(145deg,rgba(245,158,11,.12),#0d1828 65%) !important;}
.l-bright{font-size:.68rem;color:#f59e0b;font-weight:600;}
.l-bar-track{height:3px;background:#1e293b;border-radius:99px;overflow:hidden;margin-top:5px;}
.l-bar-fill{height:100%;background:linear-gradient(90deg,#f59e0b,#fde68a);border-radius:99px;transition:width .8s ease;}

/* Prise électrique */
.p-icon-wrap{position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.p-ring{position:absolute;inset:-6px;border-radius:50%;border:2px solid var(--tc);opacity:.7;animation:elecRing 2s linear infinite;}
.p-ring::after{content:'';position:absolute;inset:3px;border-radius:50%;border:1px dashed var(--tc);opacity:.4;animation:elecRing 3s linear reverse infinite;}
.p-pop{position:absolute;inset:0;border-radius:50%;border:2px solid var(--tc);animation:elecPop 2s ease-out infinite;}
.p-wave{width:100%;height:24px;display:block;margin-top:4px;overflow:visible;}
.p-active{background:linear-gradient(145deg,rgba(var(--trgb,167,139,250),.12),#0d1828);}

/* Indicateur ouverture */
.open-ind{height:4px;background:#111c2e;border-radius:99px;overflow:hidden;margin-top:6px;}
.open-ind-bar{height:100%;border-radius:99px;}


/* Serveur animations */
.srv-scan-line{position:absolute;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(129,140,248,.5),transparent);animation:srvScan 5s ease-in-out infinite;pointer-events:none;z-index:0;top:0;}
.s-dot-live{display:inline-block;width:8px;height:8px;border-radius:50%;flex-shrink:0;}
.s-proc-bars{display:flex;align-items:flex-end;gap:2px;height:16px;margin-top:2px;}
.s-proc-bar{width:5px;border-radius:2px;background:#818cf8;animation:coreFlash 1.1s ease-in-out infinite;}

/* Empty */
.empty{padding:60px 20px;text-align:center;color:#334155;font-size:1.1rem;display:flex;flex-direction:column;align-items:center;gap:12px;}
</style>
<div class="card" style="--tc:${cat.color}">
  <div class="title">${this._cfg.title}</div>
  <div class="pills">${this._summary()}</div>
  <div class="tabs">
    ${cats.filter(c=>c.key!=="serveur"||(this._cfg.serveur||[]).length>0).map(c=>{
      const cnt=(this._cfg[c.key]||[]).length;
      if(!cnt&&c.key!=="serveur")return"";
      let active=0;
      (this._cfg[c.key]||[]).forEach(e=>{const id=typeof e==="string"?e:e.entity,st=this._hass?.states[id];if(st&&isOn(st.state))active++;});
      const cntLabel=c.key==="temperatures"?cnt:active>0?`${active} / ${cnt}`:`0 / ${cnt}`;
      return`<button class="tab ${c.key===this._tab?"on":""}" data-tab="${c.key}" style="${c.key===this._tab?`--tc:${c.color}`:""}">
        <ha-icon icon="${c.icon}"></ha-icon>
        <span>${this._cfg[`label_${c.key}`]||c.label}</span>
        <span class="tab-cnt">${cntLabel}</span>
      </button>`;
    }).join("")}
  </div>
  <div class="content" id="tab-content">
    ${this._tab==="serveur"
      ?this._renderSrv()
      :!items.length
        ?`<div class="empty">📋<div>Aucune entité — ajoutez via l'éditeur</div></div>`
        :`<div class="grid">${this._tab==="temperatures"?items.map((e,i)=>this._tempTile(e,i)).join(""):items.map((e,i)=>this._tile(e,i)).join("")}</div>`
    }
  </div>
</div>`;

    this.shadowRoot.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>{this._tab=b.dataset.tab;this._render();}));
    this.shadowRoot.querySelectorAll(".spill[data-tab]").forEach(b=>b.addEventListener("click",()=>{this._tab=b.dataset.tab;this._render();}));
    this.shadowRoot.querySelectorAll(".entity-item").forEach(el=>{
      el.addEventListener("click",()=>{
        const id=el.dataset.entity;if(!id)return;
        const d=id.split(".")[0];
        if(["light","switch","input_boolean","fan"].includes(d)){this._hass.callService(d,"toggle",{entity_id:id});return;}
        if(d==="cover"){const st=this._hass.states[id];this._hass.callService("cover",isOn(st.state)?"close_cover":"open_cover",{entity_id:id});return;}
        this._openMoreInfo(id);
      });
    });
    // Camera: click sur [data-cam] → lightbox (identique exterieur-card)
    this.shadowRoot.querySelectorAll("[data-cam]").forEach(b=>
      b.addEventListener("click",()=>this._openLb(b.dataset.cam))
    );
    // Camera: load thumbnails (sélecteurs identiques à exterieur-card)
    const cams=(this._cfg[this._tab]||[]).filter(e=>(typeof e==="string"?e:e.entity)?.split(".")[0]==="camera");
    cams.forEach(e=>{
      const id=typeof e==="string"?e:e.entity;
      const img =this.shadowRoot.querySelector(`img.cam-img[data-id="${id}"]`);
      const spin=this.shadowRoot.querySelector(`.cam-spin[data-id="${id}"]`);
      const off =this.shadowRoot.querySelector(`.cam-off[data-id="${id}"]`);
      if(img) this._loadCam(id,img,spin,off);
    });
    if(cams.length){
      const t=setInterval(()=>{
        cams.forEach(e=>{
          const id=typeof e==="string"?e:e.entity;
          const img=this.shadowRoot.querySelector(`img.cam-img[data-id="${id}"]`);
          const spin=this.shadowRoot.querySelector(`.cam-spin[data-id="${id}"]`);
          const off=this.shadowRoot.querySelector(`.cam-off[data-id="${id}"]`);
          if(img) this._loadCam(id,img,spin,off);
        });
      },5000);
      this._timers.push(t);
    }
  }
}

// ═══════════════════════════════════════════════════════════
//  ÉDITEUR
// ═══════════════════════════════════════════════════════════
class RdcFloorCardEditor extends HTMLElement{
  constructor(){super();this.attachShadow({mode:"open"});this._localConfig=null;this._isTyping=false;this._lastFocusId=null;this._lastPos=0;this._sec="general";}
  setConfig(c){this._localConfig=deepClone(c);if(!this._isTyping)this._render();}
  set hass(h){this._hass=h;if(!this._isTyping)this._render();}
  _dispatch(){this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:deepClone(this._localConfig)},bubbles:true,composed:true}));}
  _update(e){
    const id=e.target.dataset.id,val=e.target.value;
    this._lastFocusId=id;try{this._lastPos=e.target.selectionStart??0;}catch(_){}
    const cfg=this._localConfig;if(!cfg)return;
    if(id==="title")cfg.title=val;
    else if(id?.startsWith("tl-"))cfg[`label_${id.slice(3)}`]=val;
    else if(id?.startsWith("lbl-")){const[,cat,i]=id.split("-");const list=cfg[cat]||[];const item=list[+i];if(item!==undefined){list[+i]=typeof item==="string"?{entity:item,label:val}:{...item,label:val};cfg[cat]=list;}}
    else if(id?.startsWith("cp-")){const parts=id.split("-");const cat=parts[1],i=+parts[2],prop=parts.slice(3).join("-");const list=cfg[cat]||[];const item=list[i];if(item!==undefined){list[i]=typeof item==="string"?{entity:item,[prop]:val}:{...item,[prop]:val};cfg[cat]=list;}}
    else if(id?.startsWith("sp-")){const parts=id.split("-");const i=+parts[1],prop=parts.slice(2).join("-");const list=cfg.serveur||[];if(list[i]!==undefined){list[i]=typeof list[i]==="string"?{entity:list[i],[prop]:val}:{...list[i],[prop]:val};cfg.serveur=list;}}
    clearTimeout(this._saveTimer);this._saveTimer=setTimeout(()=>this._dispatch(),400);
  }
  _add(cat){
    const inp=this.shadowRoot.querySelector(`#inp-${cat}`);
    const id=inp?.value?.trim();if(!id)return;
    const list=this._localConfig[cat]||[];
    if(!list.some(e=>(typeof e==="string"?e:e.entity)===id)){
      list.push(cat==="serveur"?{entity:id,server:"Serveur",label:"",type:"bar"}:{entity:id,label:""});
      this._localConfig[cat]=list;this._dispatch();
    }
    inp.value="";this._lastFocusId=null;this._render();
  }
  _remove(cat,i){const l=this._localConfig[cat]||[];l.splice(i,1);this._localConfig[cat]=l;this._lastFocusId=null;this._dispatch();this._render();}
  _move(cat,i,dir){const l=this._localConfig[cat]||[];const j=i+dir;if(j<0||j>=l.length)return;[l[i],l[j]]=[l[j],l[i]];this._localConfig[cat]=l;this._lastFocusId=null;this._dispatch();this._render();}
  _erow(cat,item,i){
    const id=typeof item==="string"?item:item.entity,lbl=typeof item==="object"?(item.label||""):"";
    const isCam=(id||"").split(".")[0]==="camera";
    return`<div class="erow"><div class="etop"><span class="eid">${esc(id)}</span><div class="acts"><button class="ib" data-mv="${cat}" data-i="${i}" data-d="-1"><ha-icon icon="mdi:chevron-up"></ha-icon></button><button class="ib" data-mv="${cat}" data-i="${i}" data-d="1"><ha-icon icon="mdi:chevron-down"></ha-icon></button><button class="ib del" data-rm="${cat}" data-i="${i}"><ha-icon icon="mdi:delete-outline"></ha-icon></button></div></div><div class="lrow"><span class="ltag">Label</span><input data-id="lbl-${cat}-${i}" value="${esc(lbl)}" placeholder="Nom affiché"/></div>${isCam?`<div class="cdims"><div><span class="ltag">Hauteur</span><input data-id="cp-${cat}-${i}-cam_height" value="${esc(typeof item==="object"&&item.cam_height||"")}" placeholder="200px"/></div><div><span class="ltag">Largeur</span><input data-id="cp-${cat}-${i}-cam_width" value="${esc(typeof item==="object"&&item.cam_width||"")}" placeholder="100%"/></div></div>`:""}</div>`;
  }
  _srow(item,i){
    const id=typeof item==="object"?item.entity||"":item,srv=typeof item==="object"?item.server||"":"",lbl=typeof item==="object"?item.label||"":"",typ=typeof item==="object"?item.type||"bar":"bar";
    return`<div class="erow"><div class="etop"><span class="eid">${esc(id)}</span><div class="acts"><button class="ib" data-mv="serveur" data-i="${i}" data-d="-1"><ha-icon icon="mdi:chevron-up"></ha-icon></button><button class="ib" data-mv="serveur" data-i="${i}" data-d="1"><ha-icon icon="mdi:chevron-down"></ha-icon></button><button class="ib del" data-rm="serveur" data-i="${i}"><ha-icon icon="mdi:delete-outline"></ha-icon></button></div></div><div class="lrow"><span class="ltag">Serveur</span><input data-id="sp-${i}-server" value="${esc(srv)}" placeholder="Proxmox HA / Windows"/></div><div class="lrow"><span class="ltag">Label</span><input data-id="sp-${i}-label" value="${esc(lbl)}" placeholder="CPU, RAM..."/></div><div class="lrow"><span class="ltag">Type</span><select data-id="sp-${i}-type"><option value="bar" ${typ==="bar"?"selected":""}>Barre</option><option value="gauge" ${typ==="gauge"?"selected":""}>Jauge</option><option value="stat" ${typ==="stat"?"selected":""}>Valeur</option></select></div></div>`;
  }
  _render(){
    if(!this.shadowRoot||!this._localConfig)return;
    const cfg=this._localConfig,sec=this._sec;
    this.shadowRoot.innerHTML=`<style>
:host{font-family:sans-serif;display:block;background:#fff;color:#111;overflow-y:auto;}
*{box-sizing:border-box;margin:0;padding:0;}
.ed{padding:16px 0 24px;}
.nav{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px;padding-bottom:14px;border-bottom:2px solid #e5e7eb;}
.nb{display:flex;align-items:center;gap:6px;padding:10px 16px;border-radius:10px;border:2px solid #e5e7eb;background:#f9fafb;font-size:1rem;font-weight:600;color:#374151;cursor:pointer;font-family:inherit;transition:all .15s;}
.nb ha-icon{--mdc-icon-size:18px;}
.nc{background:#e5e7eb;border-radius:99px;padding:2px 8px;font-size:.8rem;color:#6b7280;font-weight:700;}
.nb:hover{border-color:#9ca3af;background:#f3f4f6;}
.nb.on{background:rgba(var(--trgb),.1);border-color:rgba(var(--trgb),.5);color:var(--tc);font-weight:700;}
.nb.on .nc{background:rgba(var(--trgb),.2);color:var(--tc);}
.panel{display:none;}.panel.on{display:block;}
.field{margin-bottom:18px;}
.field label{display:block;font-size:1rem;font-weight:700;color:#111;margin-bottom:7px;}
input,select{width:100%;padding:12px 14px;background:#fff;border:2px solid #d1d5db;border-radius:10px;color:#111;font-size:1rem;font-family:inherit;outline:none;transition:border-color .15s;}
input:focus,select:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,.1);}
input::placeholder{color:#9ca3af;}
.elist{display:flex;flex-direction:column;gap:8px;margin-bottom:12px;}
.erow{background:#f9fafb;border:2px solid #e5e7eb;border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:9px;}
.etop{display:flex;align-items:center;gap:10px;}
.eid{flex:1;font-size:.9rem;color:#111;font-weight:600;word-break:break-all;}
.acts{display:flex;gap:4px;flex-shrink:0;}
.ib{width:32px;height:32px;border-radius:8px;background:#fff;border:2px solid #e5e7eb;cursor:pointer;color:#6b7280;display:flex;align-items:center;justify-content:center;transition:all .12s;}
.ib ha-icon{--mdc-icon-size:15px;}
.ib:hover{background:#f3f4f6;border-color:#9ca3af;color:#111;}
.ib.del:hover{border-color:#fca5a5;background:#fff5f5;color:#ef4444;}
.lrow{display:flex;align-items:center;gap:8px;}
.ltag{font-size:.88rem;font-weight:700;color:#374151;white-space:nowrap;flex-shrink:0;min-width:60px;}
.lrow input,.lrow select{flex:1;}
.cdims{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.cdims .ltag{display:block;margin-bottom:4px;min-width:unset;}
.addrow{display:flex;gap:8px;position:sticky;bottom:0;background:#fff;padding-top:10px;padding-bottom:2px;}
.addrow input{flex:1;}
.addbtn{display:flex;align-items:center;gap:6px;padding:12px 18px;border-radius:10px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;color:#fff;font-size:1rem;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap;}
.addbtn ha-icon{--mdc-icon-size:16px;}
.addbtn:hover{transform:translateY(-1px);}
.hint{font-size:.85rem;color:#9ca3af;margin-top:6px;font-style:italic;}
.sep{height:1px;background:#e5e7eb;margin:16px 0;}
.slb{font-size:.9rem;font-weight:700;color:#374151;margin-bottom:6px;display:block;}
</style>
<div class="ed">
<div class="nav">
  <button class="nb ${sec==="general"?"on":""}" data-s="general" style="--tc:#6366f1;--trgb:99,102,241"><ha-icon icon="mdi:tune"></ha-icon>Général</button>
  ${CATS.map(c=>`<button class="nb ${sec===c.key?"on":""}" data-s="${c.key}" style="--tc:${c.color};--trgb:${c.rgb}"><ha-icon icon="${c.icon}"></ha-icon>${esc(cfg[`label_${c.key}`]||c.label)}<span class="nc">${(cfg[c.key]||[]).length}</span></button>`).join("")}
</div>
<div class="panel ${sec==="general"?"on":""}">
  <div class="field"><label>Titre</label><input data-id="title" value="${esc(cfg.title||"")}" placeholder="Rez de Chaussée"/></div>
  <div class="sep"></div>
  <div class="field"><label>Renommer les onglets</label>
    ${CATS.map(c=>`<div style="margin-bottom:10px;"><span class="slb">${c.label}</span><input data-id="tl-${c.key}" value="${esc(cfg[`label_${c.key}`]||"")}" placeholder="${esc(c.label)}"/></div>`).join("")}
  </div>
</div>
${CATS.filter(c=>c.key!=="serveur").map(cat=>`
<div class="panel ${sec===cat.key?"on":""}">
  <div class="field"><label>${esc(cfg[`label_${cat.key}`]||cat.label)}</label>
    <div class="elist">${(cfg[cat.key]||[]).map((item,i)=>this._erow(cat.key,item,i)).join("")}</div>
    <div class="addrow">
      <input id="inp-${cat.key}" placeholder="${cat.key==="temperatures"?"sensor.temperature_salon":cat.key==="ouvertures"?"binary_sensor.fenetre_salon":cat.key==="eclairages"?"light.salon":cat.key==="prises"?"switch.prise_bureau":cat.key==="securite"?"alarm_control_panel.maison":"cover.volet_salon"}"/>
      <button class="addbtn" data-add="${cat.key}"><ha-icon icon="mdi:plus"></ha-icon>Ajouter</button>
    </div>
    <div class="hint">Entity_id complet puis Entrée ou Ajouter.</div>
  </div>
</div>`).join("")}
<div class="panel ${sec==="serveur"?"on":""}">
  <div class="field"><label>Serveurs</label>
    <div class="elist">${(cfg.serveur||[]).map((item,i)=>this._srow(item,i)).join("")}</div>
    <div class="addrow">
      <input id="inp-serveur" placeholder="sensor.proxmox_cpu"/>
      <button class="addbtn" data-add="serveur"><ha-icon icon="mdi:plus"></ha-icon>Ajouter</button>
    </div>
    <div class="hint">Entity_id puis renseignez Serveur, Label et Type.</div>
  </div>
</div>
</div>`;
    this.shadowRoot.querySelectorAll("input,select").forEach(el=>{
      el.addEventListener("focus",()=>{this._isTyping=true;clearTimeout(this._typingTimer);});
      el.addEventListener("blur",()=>{this._typingTimer=setTimeout(()=>{this._isTyping=false;},300);});
      el.addEventListener("input",e=>this._update(e));
      if(el.tagName==="SELECT")el.addEventListener("change",e=>this._update(e));
    });
    this.shadowRoot.querySelectorAll(".nb[data-s]").forEach(b=>b.addEventListener("click",()=>{this._sec=b.dataset.s;this._lastFocusId=null;this._render();}));
    this.shadowRoot.querySelectorAll("[data-add]").forEach(b=>{b.addEventListener("click",()=>this._add(b.dataset.add));this.shadowRoot.querySelector(`#inp-${b.dataset.add}`)?.addEventListener("keydown",e=>{if(e.key==="Enter")this._add(b.dataset.add);});});
    this.shadowRoot.querySelectorAll("[data-rm]").forEach(b=>b.addEventListener("click",()=>this._remove(b.dataset.rm,+b.dataset.i)));
    this.shadowRoot.querySelectorAll("[data-mv]").forEach(b=>b.addEventListener("click",()=>this._move(b.dataset.mv,+b.dataset.i,+b.dataset.d)));
    if(this._lastFocusId){const el=this.shadowRoot.querySelector(`[data-id="${this._lastFocusId}"]`);if(el){el.focus();try{el.setSelectionRange(this._lastPos,this._lastPos);}catch(_){}}}
  }
}

customElements.define("rdc-floor-card",RdcFloorCard);
customElements.define("rdc-floor-card-editor",RdcFloorCardEditor);
window.customCards=window.customCards||[];
if(!window.customCards.find(c=>c.type==="rdc-floor-card"))
  window.customCards.push({type:"rdc-floor-card",name:"RDC Floor Card",description:"v8 · Design screenshot étage · Temp batterie humidité",preview:true});
console.info("%c RDC-FLOOR-CARD %c v8.0 ","background:#6366f1;color:#fff;font-weight:800;padding:2px 8px;border-radius:4px 0 0 4px","background:#020617;color:#475569;padding:2px 8px;border-radius:0 4px 4px 0");
