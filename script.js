/* TNT Velocity Preview
 * Simulates primed TNT movement and TNT-to-TNT explosion knockback (Bedrock formula)
 * with 2D (side/top) and 3D views, presets, and video recording. No dependencies. */
const $=i=>document.getElementById(i),cv=$('c');let g=cv.getContext('2d'),ovr=null,NOGRID=false;
let mode='2d',ents=[],ghosts=[],rings=[],tick=0,playing=false,acc=0,nid=1,W=300,H=300,logB=3,lines=[],rec=null,BD=false,vblob=null,vname='',presets=[],draft=[];
let v2='side';const camT={x:0,y:0,s:24},C2=()=>v2==='top'?camT:cam2;
const cam2={x:0,y:4,s:24},cam3={yaw:.7,pit:.45,d:32,tx:0,ty:3,tz:0};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),f2=v=>(+v).toFixed(2);
function log(s){lines.push(s);if(lines.length>60)lines.shift();const l=$('log');l.textContent=lines.join('\n');l.scrollTop=l.scrollHeight}

function explode(e){
  const ex=e.x,ey=e.y+.06125,ez=e.z,hit=[],bed=$('km').value==='bedrock',PW=4;
  rings.push({x:ex,y:ey,z:ez,t:0,R:bed?2*PW:4});e.dead=true;
  for(const o of ents){
    if(o===e||o.dead)continue;
    // identical origin (same X, Y, Z as the exploding TNT)?
    const same=Math.abs(o.x-e.x)<1e-6&&Math.abs(o.y-e.y)<1e-6&&Math.abs(o.z-e.z)<1e-6;
    const dx=o.x-ex,dy=o.y-ey,dz=o.z-ez,l=Math.hypot(dx,dy,dz);   // explosion center -> the TNT's feet
    if(!l&&!same)continue;
    // Bedrock: (1 - (distance - width/2) / (2*power)) * exposure; exposure = 1 (no blocks in the way)
    // Custom: linear falloff, max 4 b/s, range 4 blocks
    const k=bed?1-(l-.49)/(2*PW):(1-l/4)*4/20;
    if(k<=0)continue;
    // Direction: an identical origin is pushed straight up (+Y); any other TNT follows the explosion sphere,
    // i.e. the vector from the explosion center to the TNT's feet, even if it is only slightly offset
    const ux=same?0:dx/l,uy=same?1:dy/l,uz=same?0:dz/l;
    o.vx+=ux*k;o.vy+=uy*k;o.vz+=uz*k;hit.push([o,ux*k,uy*k,uz*k]);
  }
  if(logB-->0){
    log('#'+e.id+' exploded @ ('+f2(ex)+', '+f2(ey)+', '+f2(ez)+') -> '+hit.length+' TNT affected');
    hit.slice(0,3).forEach(h=>log('   #'+h[0].id+' dv(b/s)=('+f2(h[1]*20)+', '+f2(h[2]*20)+', '+f2(h[3]*20)+')'));
  }
}
const UNIT={t:1,s:1/20,m:1/1200,h:1/72000}; // blocks per tick for 1 B/t, B/s, B/m, B/h
function spawn(p){
  const d3=(p.m||mode)==='3d'||v2==='top',n=clamp(p.n|0||1,1,500),z0=d3?p.z:0,out=[];
  const side=Math.ceil(d3?Math.cbrt(n):Math.sqrt(n)),uf=UNIT[p.vu]||1,sv0=(+p.vx||0)*uf,sv1=(+p.vy||0)*uf,sv2=d3?(+p.vz||0)*uf:0;
  for(let i=0;i<n;i++){
    let x=p.x,y=p.y,z=z0;
    if(p.lay==='c'&&n>1){
      const ix=i%side,iy=d3?Math.floor(i/side)%side:Math.floor(i/side),iz=d3?Math.floor(i/side/side):0;
      x+=ix-(side-1)/2;y+=iy;if(d3)z+=iz-(side-1)/2;
    }
    const e={id:nid++,x,y,z,vx:sv0,vy:sv1,vz:sv2,fuse:p.fuse,trail:[x,y,z],dead:false};
    if(p.mom){const a=Math.random()*Math.PI*2;e.vx+=.02*Math.cos(a);e.vy+=.2;e.vz+=d3?.02*Math.sin(a):0}
    ents.push(e);out.push(e);spawnLog.push({x:e.x,y:e.y,z:e.z,vx:e.vx,vy:e.vy,vz:e.vz,fuse:e.fuse});
  }
  logB=3;
  const inst=out.filter(e=>e.fuse<=0&&!e.dead);
  if($('eo').value==='simul')inst.forEach(e=>{e.dead=true});
  inst.forEach(e=>explode(e));
  sweep();
}
function sweep(){
  ents.forEach(e=>{if(e.dead&&e.trail.length>3)ghosts.push(e.trail)});
  ents=ents.filter(e=>!e.dead);
  if(ghosts.length>400)ghosts.splice(0,ghosts.length-400);
}
const AIR=.98,GROUND=.4,BOUNCE=-.5; // TNT: air drag 0.98 per tick (gravity 0.04), ground friction 0.4
function step(){
  logB=3;
  const floor=$('of').checked,simul=$('eo').value==='simul',boom=[];
  for(const e of ents.slice()){
    if(e.dead)continue;
    e.vy-=.04;e.x+=e.vx;e.y+=e.vy;e.z+=e.vz;
    let og=false;
    if(floor&&e.y<0){e.y=0;e.vy=0;og=true}
    e.vx*=AIR;e.vy*=AIR;e.vz*=AIR;
    if(og){e.vx*=GROUND;e.vz*=GROUND;e.vy*=BOUNCE}
    e.trail.push(e.x,e.y,e.z);if(e.trail.length>1200)e.trail.splice(0,3);
    if(--e.fuse<=0){if(simul)boom.push(e);else explode(e)}
  }
  // "All at once": every TNT whose fuse ended this tick explodes together; they are removed first so they do not push each other
  if(boom.length){boom.forEach(e=>{e.dead=true});boom.forEach(e=>explode(e))}
  sweep();tick++;
  rings.forEach(r=>r.t++);rings=rings.filter(r=>r.t<12);
}

// ---- projection ----
function T(x,y,z){
  if(mode==='2d'){const C=C2();return v2==='top'?[W/2+(x-C.x)*C.s,H/2+(z-C.y)*C.s,C.s,1]:[W/2+(x-C.x)*C.s,H/2-(y-C.y)*C.s,C.s,1]}
  const c=cam3,cy=Math.cos(c.yaw),sy=Math.sin(c.yaw),cp=Math.cos(c.pit),sp=Math.sin(c.pit);
  const px=x-c.tx,py=y-c.ty,pz=z-c.tz,x1=px*cy-pz*sy,z1=px*sy+pz*cy;
  const y2=py*cp+z1*sp,z2=-py*sp+z1*cp,dep=Math.max(c.d+z2,.05),f=Math.min(W,H)*1.1/dep;
  return[W/2+x1*f,H/2-y2*f,f,dep];
}
function line(a,b){g.beginPath();g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1]);g.stroke()}
function css(n){return ovr?ovr[n]:getComputedStyle(document.documentElement).getPropertyValue(n).trim()}

function grid2(){
  const C=C2(),top=v2==='top',s=C.s,L=C.x-W/2/s,Rr=C.x+W/2/s,B=C.y-H/2/s,Tp=C.y+H/2/s;
  const st=[1,2,5,10,20,50,100,200,500,1000,2000,5000,10000],gs=st.find(v=>v*s>=14)||10000,ls=st.find(v=>v*s>=46)||10000;
  g.lineWidth=1;g.font='10px system-ui';g.fillStyle=css('--gt');
  for(let x=Math.ceil(L/gs)*gs;x<=Rr;x+=gs){
    const X=T(x,0,0)[0];g.strokeStyle=x%ls===0?css('--gm'):css('--gr');line([X,0],[X,H]);
    if(x%ls===0)g.fillText(x,X+2,H-4);
  }
  for(let y=Math.ceil(B/gs)*gs;y<=Tp;y+=gs){
    const Y=top?T(0,0,y)[1]:T(0,y,0)[1];g.strokeStyle=y%ls===0?css('--gm'):css('--gr');line([0,Y],[W,Y]);
    if(y%ls===0)g.fillText((top?'z ':'')+y,3,Y-2);
  }
  if(!top&&$('of').checked){
    const Y=T(0,0,0)[1];g.fillStyle=css('--gd');g.fillRect(0,Y,W,H-Y);
    g.strokeStyle=css('--gt');g.lineWidth=2;line([0,Y],[W,Y]);
  }
}
function grid3(){
  const N=20,stp=[1,2,5,10,20,50,100,200,500,1000,2000].find(v=>v*20>=cam3.d*.7)||2000,cx=Math.round(cam3.tx/stp)*stp,cz=Math.round(cam3.tz/stp)*stp,AX=Math.max(10,stp);
  if($('of').checked){
    g.lineWidth=1;g.strokeStyle=css('--gr');
    for(let i=-N;i<=N;i++){
      const a=T(cx+i*stp,0,cz-N*stp),b=T(cx+i*stp,0,cz+N*stp),c=T(cx-N*stp,0,cz+i*stp),d=T(cx+N*stp,0,cz+i*stp);
      if(a[3]>.5&&b[3]>.5)line(a,b);if(c[3]>.5&&d[3]>.5)line(c,d);
    }
  }
  g.lineWidth=2;g.font='bold 12px system-ui';
  [['#e05555',[AX,0,0],'X'],['#4fb35a',[0,AX,0],'Y'],['#4d8fe0',[0,0,AX],'Z']].forEach(a=>{
    const o=T(0,0,0),p=T(...a[1]);g.strokeStyle=g.fillStyle=a[0];line(o,p);g.fillText(a[2],p[0]+4,p[1]-4);
  });
}
function trail(t,alpha,col){
  if(t.length<6)return;
  g.globalAlpha=alpha;g.strokeStyle=col;g.lineWidth=1.5;g.beginPath();
  for(let i=0;i<t.length;i+=3){const p=T(t[i],t[i+1],t[i+2]);i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1])}
  g.stroke();g.globalAlpha=1;
}
function arrow(a,b){
  const dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy);if(l<5)return;
  line(a,b);const u=Math.atan2(dy,dx);
  g.beginPath();g.moveTo(b[0],b[1]);g.lineTo(b[0]-7*Math.cos(u-.4),b[1]-7*Math.sin(u-.4));
  g.lineTo(b[0]-7*Math.cos(u+.4),b[1]-7*Math.sin(u+.4));g.closePath();g.fill();
}
const TEXDATA={top:'textures/tnt_top.png',side:'textures/tnt_side.png',bottom:'textures/tnt_bottom.png'};
const TX={};
for(const n in TEXDATA){const i=new Image();i.src=TEXDATA[n];TX[n]=i}
let noTex=false,TAINT=false;
const texOK=i=>!noTex&&i&&i.complete&&i.naturalWidth>0;
function drawFace(f){
  const q=f.q,im=TX[f.t];
  g.beginPath();q.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();
  if(texOK(im)){
    const n=im.naturalWidth;let o,xa,ya;
    if(f.t==='side'){if(f.fl){o=q[2];xa=q[3];ya=q[1]}else{o=q[3];xa=q[2];ya=q[0]}}
    else{o=q[0];xa=q[1];ya=q[3]}
    g.save();g.clip();g.imageSmoothingEnabled=false;
    g.transform((xa[0]-o[0])/n,(xa[1]-o[1])/n,(ya[0]-o[0])/n,(ya[1]-o[1])/n,o[0],o[1]);
    g.drawImage(im,0,0);
    if(f.k<1){g.fillStyle='rgba(0,0,0,'+(1-f.k)+')';g.fillRect(0,0,n,n)}
    g.restore();
  }else{g.fillStyle='#d63a2a';g.fill()}
  if(BD){g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=1;g.stroke()}
}
function cubes(){
  const c=cam3,cp=Math.cos(c.pit),sp=Math.sin(c.pit),cy=Math.cos(c.yaw),sy=Math.sin(c.yaw);
  const cx=c.tx-c.d*cp*sy,cyy=c.ty+c.d*sp,cz=c.tz-c.d*cp*cy,h=.49,all=[];
  const D=[[0,0,-1,.8,'side',1],[0,0,1,.8,'side',0],[-1,0,0,.62,'side',0],[1,0,0,.95,'side',1],[0,1,0,1,'top',0],[0,-1,0,.5,'bottom',0]];
  for(const e of ents){
    if(T(e.x,e.y+.5,e.z)[3]<.6)continue;
    const x0=e.x-h,x1=e.x+h,z0=e.z-h,z1=e.z+h,y0=e.y,y1=e.y+.98;
    const dx=cx-e.x,dy=cyy-(e.y+h),dz=cz-e.z;
    const C=[
      [[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0]],
      [[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]],
      [[x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0]],
      [[x1,y0,z0],[x1,y0,z1],[x1,y1,z1],[x1,y1,z0]],
      [[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1]],
      [[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1]]
    ];
    for(let i=0;i<6;i++){
      const d=D[i];
      if(d[0]*dx+d[1]*dy+d[2]*dz<=h)continue;
      const q=C[i].map(v=>T(v[0],v[1],v[2]));
      all.push({q,k:d[3],t:d[4],fl:d[5],d:(q[0][3]+q[1][3]+q[2][3]+q[3][3])/4});
    }
  }
  all.sort((a,b)=>b.d-a.d);
  all.forEach(drawFace);
}
function draw(){
  BD=$('ob').checked;const dpr=window.devicePixelRatio||1,r=cv.getBoundingClientRect();
  W=r.width;H=r.height;
  if(cv.width!==Math.round(W*dpr)||cv.height!==Math.round(H*dpr)){cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr)}
  g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,W,H);
  scene();hud();if(rec)recFrame();
}
function scene(){
  if(!NOGRID){mode==='2d'?grid2():grid3()}
  if($('ot').checked){ghosts.forEach(t=>trail(t,.3,'#d98a2b'));ents.forEach(e=>trail(e.trail,.8,'#d98a2b'))}
  rings.forEach(r=>{
    const p=T(r.x,r.y,r.z);g.strokeStyle='#f0a030';g.globalAlpha=.5*(1-r.t/12);g.lineWidth=2;
    g.beginPath();g.arc(p[0],p[1],(r.R||4)*p[2],0,7);g.stroke();g.globalAlpha=1;
  });
  const L=ents.map(e=>({e,p:T(e.x,e.y,e.z)}));
  if(mode==='3d')L.sort((a,b)=>b.p[3]-a.p[3]);
  if(mode==='2d'&&v2==='top')L.sort((a,b)=>a.e.y-b.e.y);
  const arrows=$('oa').checked;
  if(mode==='3d')cubes();
  L.forEach(({e,p})=>{
    if(mode==='3d')return;
    const w=Math.max(.98*p[2],3);
    if(v2==='top'){if(texOK(TX.top)){g.save();g.imageSmoothingEnabled=false;g.drawImage(TX.top,p[0]-w/2,p[1]-w/2,w,w);g.restore()}else{g.fillStyle='#c9c5bb';g.fillRect(p[0]-w/2,p[1]-w/2,w,w)}if(BD){g.strokeStyle='rgba(0,0,0,.5)';g.lineWidth=1;g.strokeRect(p[0]-w/2,p[1]-w/2,w,w)}return}
    if(texOK(TX.side)){g.save();g.imageSmoothingEnabled=false;g.drawImage(TX.side,p[0]-w/2,p[1]-w,w,w);g.restore();if(BD){g.strokeStyle='rgba(0,0,0,.5)';g.lineWidth=1;g.strokeRect(p[0]-w/2,p[1]-w,w,w)}return}
    g.fillStyle='#d63a2a';g.fillRect(p[0]-w/2,p[1]-w,w,w);
    g.fillStyle='#f2efe8';g.fillRect(p[0]-w/2,p[1]-w*.66,w,w*.33);
    if(BD){g.strokeStyle='rgba(0,0,0,.55)';g.lineWidth=1;g.strokeRect(p[0]-w/2,p[1]-w,w,w)}
  });
  if(arrows){
    g.strokeStyle=g.fillStyle='#2f7bd9';g.lineWidth=1.5;
    ents.forEach(e=>{
      if(Math.hypot(e.vx,e.vy,e.vz)<.01)return;
      arrow(T(e.x,e.y+.49,e.z),T(e.x+e.vx*6,e.y+.49+e.vy*6,e.z+e.vz*6));
    });
  }
}
function hud(){
  $('hud').textContent=(rec?'REC  |  ':'')+(playing?'':'PAUSE  |  ')+'Tick '+tick+'  |  TNT '+ents.length+'  |  max v '+f2(ents.reduce((m,e)=>Math.max(m,Math.hypot(e.vx,e.vy,e.vz)),0)*20)+' b/s'+($('oa').checked?'  |  arrow = velocity x6':'');
}
const RBG={white:['#ffffff',0],black:['#000000',1],green:['#00ff00',0]};
function recFrame(){
  const bg=rec.bg,Lg=Math.min(W,H),og=g,oW=W,oH=H,Rg=rec.g;
  let col=null,dark=false;
  if(bg==='theme')col=css('--cv');else if(RBG[bg]){col=RBG[bg][0];dark=!!RBG[bg][1]}
  Rg.setTransform(1,0,0,1,0,0);Rg.clearRect(0,0,1024,1024);
  if(col){Rg.fillStyle=col;Rg.fillRect(0,0,1024,1024)}
  Rg.setTransform(1024/Lg,0,0,1024/Lg,0,0);
  g=Rg;W=H=Lg;NOGRID=bg==='transparent';noTex=TAINT;
  if(bg!=='theme')ovr=dark?{'--gr':'rgba(255,255,255,.1)','--gm':'rgba(255,255,255,.25)','--gt':'#aaaaaa','--gd':'rgba(190,150,90,.25)'}:{'--gr':'rgba(0,0,0,.08)','--gm':'rgba(0,0,0,.2)','--gt':'#555555','--gd':'rgba(120,90,50,.2)'};
  try{scene()}finally{ovr=null;NOGRID=false;noTex=false;g=og;W=oW;H=oH}
}
function fit(){
  const pts=[];
  ents.forEach(e=>{pts.push([e.x,e.y,e.z]);for(let i=0;i<e.trail.length;i+=3)pts.push([e.trail[i],e.trail[i+1],e.trail[i+2]])});
  ghosts.forEach(t=>{for(let i=0;i<t.length;i+=3)pts.push([t[i],t[i+1],t[i+2]])});
  if(!pts.length)return;
  const mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9];
  pts.forEach(p=>p.forEach((v,i)=>{mn[i]=Math.min(mn[i],v);mx[i]=Math.max(mx[i],v)}));
  const c=mn.map((v,i)=>(v+mx[i])/2),ext=Math.max(mx[0]-mn[0],mx[1]-mn[1],mx[2]-mn[2],6);
  {const C=C2(),vy=v2==='top'?2:1;C.x=c[0];C.y=c[vy];C.s=clamp(Math.min(W/(mx[0]-mn[0]+6),H/(mx[vy]-mn[vy]+6)),.05,120)}
  cam3.tx=c[0];cam3.ty=c[1];cam3.tz=c[2];cam3.d=clamp(ext*2+8,6,5000);
}

// ---- UI ----
function setMode(m){
  mode=m;$('b2').classList.toggle('on',m==='2d');$('b3').classList.toggle('on',m==='3d');
  $('sv').hidden=m!=='2d';updAt();
}
function updAt(){const s=mode==='2d'&&v2==='side';$('az').hidden=s;$('vz').hidden=s;$('atl').textContent=s?'X, Y':'X, Y, Z';$('vl').textContent=s?'X, Y':'X, Y, Z'}
function setV2(v){v2=v;$('v2s').classList.toggle('on',v==='side');$('v2t').classList.toggle('on',v==='top');updAt()}
$('v2s').onclick=()=>setV2('side');$('v2t').onclick=()=>setV2('top');
$('b2').onclick=()=>setMode('2d');$('b3').onclick=()=>setMode('3d');
$('fs').onchange=()=>{$('fn').disabled=$('fs').value==='n'};
function params(){
  return{x:+$('ax').value||0,y:+$('ay').value||0,z:+$('az').value||0,n:+$('cnt').value||1,
    fuse:$('fs').value==='n'?80:Math.max(0,($('fn').value|0)),mom:$('mom').value==='true',lay:$('lay').value,m:mode,
    vx:+$('vx').value||0,vy:+$('vy').value||0,vz:+$('vz').value||0,vu:$('vu').value};
}
$('sp').onclick=()=>spawn(params());
let spawnLog=[]; // start state of every TNT spawned since the last reset (what the .mcstructure save uses)
function reset(){if(rec)stopRecord();spawnLog=[];ents=[];ghosts=[];rings=[];tick=0;lines=[];$('log').textContent=''}
$('rs').onclick=reset;
$('ex').onclick=()=>{
  reset();
  spawn({x:2,y:.5,z:0,n:1,fuse:80,mom:false,lay:'s'});
  spawn({x:0,y:1,z:0,n:1,fuse:0,mom:false,lay:'s'});
  fit();
};
$('pl').onclick=()=>setPlaying(!playing);$('rc').onclick=()=>rec?stopRecord():startRecord();
$('st').onclick=()=>step();
function centerCam(){
  if(mode==='3d'){cam3.tx=cam3.ty=cam3.tz=0}
  else if(v2==='top'){camT.x=0;camT.y=0}
  else{cam2.x=0;cam2.y=0}
}
$('fit').onclick=fit;$('cc').onclick=centerCam;
const ptr=new Map();let pd=0;
const pdist=()=>{const a=[...ptr.values()];return a.length<2?0:Math.hypot(a[0][0]-a[1][0],a[0][1]-a[1][1])};
function zoom(k){mode==='2d'?C2().s=clamp(C2().s*k,.05,200):cam3.d=clamp(cam3.d/k,4,5000)}
cv.onpointerdown=e=>{cv.setPointerCapture(e.pointerId);ptr.set(e.pointerId,[e.clientX,e.clientY]);pd=pdist()};
let panMode=false;
$('pm').onclick=()=>{panMode=!panMode;$('pm').textContent=panMode?'Drag: Pan':'Drag: Rotate';$('pm').classList.toggle('on',panMode)};
function pan(dx,dy){
  if(mode==='2d'){const C=C2();C.x-=dx/C.s;C.y+=(v2==='top'?-1:1)*dy/C.s;return}
  const c=cam3,k=c.d/(Math.min(W,H)*1.1),cy=Math.cos(c.yaw),sy=Math.sin(c.yaw),cp=Math.cos(c.pit),sp=Math.sin(c.pit);
  c.tx+=(-cy*dx+sp*sy*dy)*k;c.ty+=cp*dy*k;c.tz+=(sy*dx+sp*cy*dy)*k;
}
cv.oncontextmenu=e=>e.preventDefault();
cv.onpointermove=e=>{
  const p=ptr.get(e.pointerId);if(!p)return;
  const dx=e.clientX-p[0],dy=e.clientY-p[1];ptr.set(e.pointerId,[e.clientX,e.clientY]);
  if(ptr.size>=2){const d=pdist();if(pd)zoom(d/pd);pd=d;pan(dx/2,dy/2)}
  else if(mode==='2d'||panMode||e.shiftKey||(e.buttons&6))pan(dx,dy);
  else{cam3.yaw+=dx*.008;cam3.pit=clamp(cam3.pit+dy*.008,-1.5,1.5)}
};
cv.onpointerup=cv.onpointercancel=e=>{ptr.delete(e.pointerId);pd=0};
cv.onwheel=e=>{e.preventDefault();zoom(e.deltaY<0?1.1:1/1.1)};


function setPlaying(v){playing=v;$('pl').textContent=v?'Pause':'Play'}
function anchorSave(name,data){
  const bl=data instanceof Blob?data:new Blob([data],{type:'text/plain'});
  const u=URL.createObjectURL(bl),a=document.createElement('a');
  a.href=u;a.download=name;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(u),4000);return true;
}
async function dl(name,data){
  if(!(window.claude&&window.claude.use))return anchorSave(name,data);
  try{const d=await claude.use('downloads');if(!d)return anchorSave(name,data);
    await d.save({filename:name,data});return true}
  catch(e){const c=e&&e.code;log(c==='rejected_extension'?'This view cannot save '+(name.indexOf('.')>=0?'.'+name.split('.').pop():'this kind of')+' files. Open the page in a regular browser to export it, or copy the text from the box.':c==='unavailable'?'Saving files is not available in this view. Copy the preset text from the box, or open the page in a regular browser.':'Save failed: '+(c||'unknown error'));return false}
}
function pickMime(alpha){
  if(!window.MediaRecorder)return null;
  return(alpha?['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm']:['video/mp4;codecs=avc1.42E01E','video/mp4','video/webm;codecs=vp9','video/webm']).find(m=>MediaRecorder.isTypeSupported(m))||null;
}
function startRecord(){
  if(rec)return;
  if(view!=='chamber')go('chamber');
  if(!ents.length){log('No TNT to record');return}
  const bg=$('rb').value,mime=pickMime(bg==='transparent');if(!mime){log('This browser does not support video recording'+(bg==='transparent'?' with transparency (needs webm)':''));return}
  try{const tc=document.createElement('canvas').getContext('2d');tc.drawImage(TX.side,0,0);tc.getImageData(0,0,1,1)}catch(e){TAINT=true;log('Textures are blocked by the browser (file://); recording without textures. Use a local server to record with textures.')}
  const rcv=document.createElement('canvas');rcv.width=rcv.height=1024;
  let mr;try{mr=new MediaRecorder(rcv.captureStream(60),{mimeType:mime,videoBitsPerSecond:12e6})}catch(e){log('Could not start recording');return}
  const r={mr,ch:[],mime,t0:tick,to:0,bg,cv:rcv,g:rcv.getContext('2d')};
  mr.ondataavailable=e=>{if(e.data&&e.data.size)r.ch.push(e.data)};
  mr.onstop=()=>finishRecord(r);
  rec=r;$('vs').innerHTML='';setPlaying(false);
  $('rc').textContent='Stop';$('rc').classList.add('on');
  mr.start(200);
  r.to=setTimeout(()=>{if(rec===r)setPlaying(true)},600);
}
function stopRecord(){
  if(!rec)return;const r=rec;rec=null;clearTimeout(r.to);setPlaying(false);
  $('rc').textContent='Record';$('rc').classList.remove('on');
  if(r.mr.state!=='inactive')r.mr.stop();
}
async function finishRecord(r){
  if(!r.ch.length)return;
  const ext=r.mime.indexOf('mp4')>=0?'mp4':'webm';
  vblob=new Blob(r.ch,{type:'video/'+ext});vname='tnt-record.'+ext;
  const b=document.createElement('button');b.textContent='Save video ('+ext+')';b.onclick=()=>dl(vname,vblob);
  const v=document.createElement('video');v.controls=true;v.playsInline=true;v.style.cssText='width:100%;margin-top:8px;border-radius:8px';v.src=URL.createObjectURL(vblob);$('vs').innerHTML='';$('vs').append(b,v);
  if(ext==='webm')log('This browser can only record webm, not mp4');
  dl(vname,vblob);
}

// ---- preset ----
try{presets=JSON.parse(localStorage.getItem('tntp')||'[]')}catch(e){presets=[]}
const saveP=()=>{try{localStorage.setItem('tntp',JSON.stringify(presets))}catch(e){}};
const num=(v,d)=>Number.isFinite(+v)?+v:d;
function clean(it){
  if(!it||typeof it!=='object')return null;
  return{x:num(it.x,0),y:num(it.y,0),z:num(it.z,0),n:clamp(num(it.n,1)|0,1,500),fuse:Math.max(0,num(it.fuse,80)|0),
    mom:!!it.mom,lay:it.lay==='c'?'c':'s',m:it.m==='3d'?'3d':'2d',
    vx:num(it.vx,0),vy:num(it.vy,0),vz:num(it.vz,0),vu:['t','s','m','h'].includes(it.vu)?it.vu:'t'};
}
function velTxt(it){
  if(!(it.vx||it.vy||it.vz))return '';
  return ' v('+[it.vx||0,it.vy||0].concat(it.vz?[it.vz]:[]).join(', ')+') B/'+(it.vu||'t');
}
function itxt(it){
  const pos=[it.x,it.y].concat(it.z?[it.z]:[]).join(', ');
  return '('+pos+') '+(it.fuse===80?'Normal':'Tick '+it.fuse)+' x'+it.n+(it.n>1?(it.lay==='c'?' cube':' stacked'):'')+(it.mom?' momentum':'')+velTxt(it);
}
function mkBtn(t,fn){const b=document.createElement('button');b.textContent=t;b.onclick=fn;return b}
const safeName=s=>s.replace(/[^a-z0-9_-]+/gi,'_').replace(/^_+|_+$/g,'')||'preset';
function renderP(){
  const D=$('dl');D.innerHTML='';
  if(!draft.length){const m=document.createElement('div');m.className='mut';m.textContent='Draft is empty. Fill in the form and press "+ Preset".';D.append(m)}
  draft.forEach((it,i)=>{
    const r=document.createElement('div'),sp=document.createElement('span');r.className='it';sp.textContent=(i+1)+'. '+itxt(it);
    r.append(sp,mkBtn('Remove',()=>{draft.splice(i,1);renderP()}));D.append(r);
  });
  const L=$('pls');L.innerHTML='';
  if(!presets.length){const m=document.createElement('div');m.className='mut';m.textContent='No saved presets yet.';L.append(m)}
  presets.forEach((pr,i)=>{
    const card=document.createElement('div'),head=document.createElement('div'),nm=document.createElement('b'),ct=document.createElement('span');
    const btns=document.createElement('div'),menu=document.createElement('div');
    card.className='pcard';head.className='pc-head';btns.className='pc-btns';menu.className='pc-menu';menu.hidden=true;
    nm.textContent=pr.name;ct.className='mut';ct.textContent=pr.items.reduce((s,it)=>s+(it.n||1),0)+' TNT';head.append(nm,ct);
    const play=mkBtn('Play',()=>runPreset(pr,false));play.classList.add('pri');
    const more=mkBtn('More',()=>{menu.hidden=!menu.hidden;more.classList.toggle('on',!menu.hidden)});
    btns.append(play,mkBtn('Record',()=>runPreset(pr,true)),more);
    const del=mkBtn('Delete',()=>{ // tap twice to confirm
      if(del.dataset.arm){presets.splice(i,1);saveP();renderP();return}
      del.dataset.arm='1';del.textContent='Tap again to delete';
      setTimeout(()=>{if(del.isConnected){delete del.dataset.arm;del.textContent='Delete'}},3000);
    });del.classList.add('danger');
    menu.append(mkBtn('Load',()=>loadPreset(pr)),mkBtn('Save to .mcstructure',()=>exportPreset(pr)),
      mkBtn('Edit',()=>{draft=pr.items.map(q=>({...q}));$('pn').value=pr.name;renderP()}),
      mkBtn('Export .tntpreset',()=>exportPresets([pr],safeName(pr.name))),del);
    card.append(head,btns,menu);L.append(card);
  });
}
// ---- .mcstructure export (Bedrock structure file: little-endian NBT, no header) ----
const NT={byte:1,short:2,int:3,long:4,float:5,string:8,list:9,comp:10};
function nbtBytes(root){
  // Growable byte buffer; big constant int lists (the block layers) are written without building huge JS arrays
  let buf=new Uint8Array(1<<16),len=0;const dv=new DataView(new ArrayBuffer(8)),enc=new TextEncoder();
  const need=n=>{if(len+n>buf.length){let c=buf.length;while(c<len+n)c*=2;const nb=new Uint8Array(c);nb.set(buf.subarray(0,len));buf=nb}};
  const w8=v=>{need(1);buf[len++]=v&255};
  const wn=(n,fn)=>{fn();need(n);for(let i=0;i<n;i++)buf[len++]=dv.getUint8(i)};
  const w16=v=>wn(2,()=>dv.setInt16(0,v,true)),w32=v=>wn(4,()=>dv.setInt32(0,v,true));
  const w64=v=>wn(8,()=>dv.setBigInt64(0,BigInt(v),true)),wf=v=>wn(4,()=>dv.setFloat32(0,v,true));
  const ws=s=>{const e=enc.encode(s);w16(e.length);need(e.length);buf.set(e,len);len+=e.length};
  const pay=(t,v)=>{
    if(t==='byte')w8(v);else if(t==='short')w16(v);else if(t==='int')w32(v);else if(t==='long')w64(v);
    else if(t==='float')wf(v);else if(t==='string')ws(v);
    else if(t==='list'){
      if(v.fill!==undefined){ // list of `count` identical ints
        w8(NT[v.of]);w32(v.count);dv.setInt32(0,v.fill,true);
        const b0=dv.getUint8(0),b1=dv.getUint8(1),b2=dv.getUint8(2),b3=dv.getUint8(3);
        need(4*v.count);for(let i=0;i<v.count;i++){buf[len++]=b0;buf[len++]=b1;buf[len++]=b2;buf[len++]=b3}
      }else{w8(NT[v.of]);w32(v.v.length);v.v.forEach(x=>pay(v.of,x))}
    }
    else{for(const k in v){w8(NT[v[k].t]);ws(k);pay(v[k].t,v[k].v)}w8(0)}
  };
  w8(10);ws('');pay('comp',root);
  return buf.subarray(0,len);
}
const nI=v=>({t:'int',v}),nS=v=>({t:'string',v}),nL=(of,v)=>({t:'list',v:{of,v}}),nC=v=>({t:'comp',v});
// ts: [{x,y,z,vx,vy,vz,fuse}] with velocity in blocks/tick. Builds an air-only structure holding one primed TNT entity per entry.
function buildMcstructure(ts){
  const mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9];
  ts.forEach(t=>[t.x,t.y,t.z].forEach((v,i)=>{mn[i]=Math.min(mn[i],v);mx[i]=Math.max(mx[i],v)}));
  const sh=mn.map(v=>v<0?-Math.floor(v):0),size=mx.map((v,i)=>Math.max(1,Math.floor(v+sh[i])+1)),vol=size[0]*size[1]*size[2];
  if(vol>4500000)return{error:'Structure is too large to export (over 4,500,000 blocks of volume; 128 x 256 x 128 is the largest that fits).'};
  const rnd=()=>(BigInt(Math.floor(Math.random()*2147483648))<<BigInt(32))|BigInt(Math.floor(Math.random()*4294967296));
  let clamped=0;
  const ents=ts.map(t=>{
    const f=Math.min(127,Math.max(0,t.fuse|0));if(f!==(t.fuse|0))clamped++;
    return{identifier:nS('minecraft:tnt'),Pos:nL('float',[t.x+sh[0],t.y+sh[1],t.z+sh[2]]),Motion:nL('float',[t.vx,t.vy,t.vz]),
      Rotation:nL('float',[0,0]),Fuse:{t:'byte',v:f},UniqueID:{t:'long',v:rnd()},FallDistance:{t:'float',v:0},
      OnGround:{t:'byte',v:0},Fire:{t:'short',v:0},Invulnerable:{t:'byte',v:0}};
  });
  const root={format_version:nI(1),size:nL('int',size),
    structure:nC({
      block_indices:nL('list',[{of:'int',fill:0,count:vol},{of:'int',fill:-1,count:vol}]),
      entities:nL('comp',ents),
      palette:nC({default:nC({block_palette:nL('comp',[{name:nS('minecraft:air'),states:nC({}),version:nI(17959425)}]),block_position_data:nC({})})})
    }),
    structure_world_origin:nL('int',[0,0,0])};
  return{bytes:nbtBytes(root),count:ts.length,size,shift:sh,clamped};
}
// Writes the file and logs what was saved
function saveMcs(res,file,label){
  if(res.error){log(res.error);return}
  const msg=['Saved '+res.count+' TNT ('+label+'), structure size '+res.size.join('x')];
  if(res.shift.some(v=>v))msg.push('positions shifted by ('+res.shift.join(', ')+') to stay non-negative');
  if(res.clamped)msg.push(res.clamped+' fuse value(s) capped at 127 (Bedrock Fuse limit)');
  if(res.size[0]*res.size[1]*res.size[2]>500000)msg.push('large structure: the file is '+(res.bytes.length/1e6).toFixed(1)+' MB and takes longer to load in the game');
  log(msg.join('; '));
  dl(file,new Blob([res.bytes],{type:'application/octet-stream'}));
}
// "Save current state to .mcstructure": the start state of every TNT spawned since the last reset
// (position, initial velocity = Velocity plus the rolled Spawn Momentum, and fuse). Play does not matter.
function exportScene(){
  if(!spawnLog.length){log('No TNT to save. Spawn some TNT first.');return}
  saveMcs(buildMcstructure(spawnLog.map(t=>({...t}))),'tnt-scene.mcstructure','start state');
}
// Expands one preset item into individual TNT start states (same layout and velocity rules as spawn)
function expandItem(it,d3){
  const n=clamp(it.n|0||1,1,500),side=Math.ceil(d3?Math.cbrt(n):Math.sqrt(n)),uf=UNIT[it.vu]||1,out=[];
  for(let i=0;i<n;i++){
    let x=it.x,y=it.y,z=d3?it.z:0;
    if(it.lay==='c'&&n>1){
      const ix=i%side,iy=d3?Math.floor(i/side)%side:Math.floor(i/side),iz=d3?Math.floor(i/side/side):0;
      x+=ix-(side-1)/2;y+=iy;if(d3)z+=iz-(side-1)/2;
    }
    let vx=(+it.vx||0)*uf,vy=(+it.vy||0)*uf,vz=d3?(+it.vz||0)*uf:0;
    if(it.mom){const a=Math.random()*Math.PI*2;vx+=.02*Math.cos(a);vy+=.2;vz+=d3?.02*Math.sin(a):0}
    out.push({x,y,z,vx,vy,vz,fuse:it.fuse});
  }
  return out;
}
// "Save to .mcstructure" on a preset: built straight from the preset's data, no Load needed
function exportPreset(pr){
  const d3=mode==='3d'||v2==='top',ts=[];
  pr.items.forEach(it=>expandItem(it,d3).forEach(t=>ts.push(t)));
  if(!ts.length){log('This preset has no TNT.');return}
  const base=pr.name.replace(/[^a-z0-9_-]+/gi,'_').replace(/^_+|_+$/g,'')||'preset';
  saveMcs(buildMcstructure(ts),base+'.mcstructure','from preset "'+pr.name+'"');
}
$('sm').onclick=exportScene;
// Spawns a preset into the scene and leaves it paused (so it can be saved or inspected first)
function loadPreset(pr){reset();setPlaying(false);pr.items.forEach(it=>spawn({...it,m:mode}))}
function runPreset(pr,r){
  reset();
  pr.items.forEach(it=>spawn({...it,m:mode}));
  r?startRecord():setPlaying(true);
}
$('ad').onclick=()=>{const q=params();if(q.m==='2d'&&v2!=='top'){q.z=0;q.vz=0}draft.push(q);renderP()};
$('ps').onclick=()=>{
  if(!draft.length){log('Draft is empty');return}
  const nm=$('pn').value.trim().slice(0,60)||'Preset '+(presets.length+1),ix=presets.findIndex(q=>q.name===nm),pv={name:nm,items:draft.slice()};ix>=0?presets[ix]=pv:presets.push(pv);
  draft=[];$('pn').value='';saveP();renderP();
};
// ---- .tntpreset files: JSON with a "tnt" list per preset ----
const UT={t:'bpt',s:'bps',m:'bpm',h:'bph'},TU={bpt:'t',bps:'s',bpm:'m',bph:'h'};
function toTnt(it){
  return{position:[it.x,it.y,it.z||0],amount:it.n,layout:it.lay==='c'?'cube':'stack',momentum:!!it.mom,fuse:it.fuse,
    velocity:{value:[it.vx||0,it.vy||0,it.vz||0],type:UT[it.vu]||'bpt'}};
}
function fromTnt(t){
  if(!t||typeof t!=='object')return null;
  const p=Array.isArray(t.position)?t.position:[],v=t.velocity&&typeof t.velocity==='object'?t.velocity:{},vv=Array.isArray(v.value)?v.value:[];
  return clean({x:p[0],y:p[1],z:p[2],n:t.amount,lay:t.layout==='cube'?'c':'s',mom:t.momentum,fuse:t.fuse,vx:vv[0],vy:vv[1],vz:vv[2],vu:TU[v.type]||'t',m:'3d'});
}
function exportPresets(list,base){
  if(!list.length){log('No presets yet');return}
  const t=JSON.stringify({format:'tntpreset',version:1,presets:list.map(pr=>({name:pr.name,tnt:pr.items.map(toTnt)}))},null,2);
  $('pt').value=t;dl(base+'.tntpreset',t);
}
$('pe').onclick=()=>exportPresets(presets,'tnt-presets');
$('pi').onclick=()=>$('pf').click();
// Accepts .tntpreset ("tnt" lists), a single {name, tnt} object, and the older "items" format
function parsePresets(text){
  const o=JSON.parse(text),arr=Array.isArray(o)?o:Array.isArray(o.presets)?o.presets:[o],out=[];
  arr.forEach(pr=>{
    if(!pr||typeof pr!=='object')return;
    const items=(Array.isArray(pr.tnt)?pr.tnt.map(fromTnt):Array.isArray(pr.items)?pr.items.map(clean):[]).filter(Boolean);
    if(items.length)out.push({name:String(pr.name||'Imported').slice(0,60),items});
  });
  return out;
}
function impText(t){
  try{
    const got=parsePresets(t);if(!got.length)throw 0;
    got.forEach(p=>{const ix=presets.findIndex(q=>q.name===p.name);ix>=0?presets[ix]=p:presets.push(p)});
    saveP();renderP();log('Imported '+got.length+' preset(s)');
  }catch(err){log('Invalid preset text')}
}
$('pf').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(f)impText(await f.text())};
$('pt2').onclick=()=>impText($('pt').value);
// ---- menu drawer, views (Chamber / Guide) and themes ----
const drawerEl=$('drawer'),backEl=$('dback');
function openMenu(o){drawerEl.classList.toggle('open',o);backEl.classList.toggle('open',o)}
$('mb').onclick=()=>openMenu(true);$('dclose').onclick=()=>openMenu(false);backEl.onclick=()=>openMenu(false);
let view='chamber';
function showView(v){
  view=v==='guide'?'guide':'chamber';
  $('view-chamber').hidden=view!=='chamber';$('view-guide').hidden=view!=='guide';$('vsegs').hidden=view!=='chamber';
  $('nv-home').classList.toggle('on',view==='chamber');$('nv-guide').classList.toggle('on',view==='guide');
  openMenu(false);if(view==='guide')window.scrollTo(0,0);
}
function go(v){showView(v);const h='#'+(v==='guide'?'guide':'chamber');if(location.hash!==h){try{location.hash=h}catch(e){}}}
$('nv-home').onclick=()=>go('chamber');$('nv-guide').onclick=()=>go('guide');
addEventListener('hashchange',()=>showView(location.hash==='#guide'?'guide':'chamber'));
document.querySelectorAll('[data-go]').forEach(b=>{b.onclick=()=>{const t=$(b.dataset.go);if(t)t.scrollIntoView({behavior:'smooth',block:'start'})}});

const TH=['light','dark','lightb','darkb','oreui','custom'],rootEl=document.documentElement;
const CUS_VARS=['--bg','--card','--fg','--mut','--btn','--btnt','--acc','--acc2','--acct','--cv','--gm','--gr','--gt','--gd','--line','--bw','--rad'];
const CUS_DEF={name:'My theme',colors:{main:'#f1efe9',panel:'#ffffff',text:'#1b1b19',mutedText:'#6a6862',button:'#ffffff',buttonText:'#1b1b19',
  accent:'#c8402e',accentText:'#ffffff',canvas:'#faf9f5',grid:'#bdbbb3',ground:'#e9e0d0'},border:{enabled:false,color:'#000000',width:1},radius:14};
const hexOk=s=>typeof s==='string'&&/^#[0-9a-f]{6}$/i.test(s);
const hx2=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const rgb2=a=>'#'+a.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
const mixHex=(a,b,t)=>{const A=hx2(a),B=hx2(b);return rgb2(A.map((v,i)=>v+(B[i]-v)*t))};
function cleanTheme(o){
  if(!o||typeof o!=='object'||!o.colors||typeof o.colors!=='object')return null;
  const d=JSON.parse(JSON.stringify(CUS_DEF)),c={},b=o.border&&typeof o.border==='object'?o.border:{};
  for(const k in d.colors)c[k]=hexOk(o.colors[k])?o.colors[k].toLowerCase():d.colors[k];
  const w=Math.round(+b.width),r=Math.round(+o.radius);
  return{name:String(o.name||'Imported theme').slice(0,40),colors:c,
    border:{enabled:!!b.enabled,color:hexOk(b.color)?b.color.toLowerCase():d.border.color,width:Number.isFinite(w)?clamp(w,0,4):1},
    radius:Number.isFinite(r)?clamp(r,0,24):14};
}
let custom;
try{custom=cleanTheme(JSON.parse(localStorage.getItem('tntCustom')||'null'))}catch(e){custom=null}
if(!custom)custom=JSON.parse(JSON.stringify(CUS_DEF));
const saveCustom=()=>{try{localStorage.setItem('tntCustom',JSON.stringify(custom))}catch(e){}};
function applyCustomVars(){
  const c=custom.colors,b=custom.border,set=(k,v)=>rootEl.style.setProperty(k,v);
  set('--bg',c.main);set('--card',c.panel);set('--fg',c.text);set('--mut',c.mutedText);set('--btn',c.button);set('--btnt',c.buttonText);
  set('--acc',c.accent);set('--acc2',mixHex(c.accent,'#000000',.15));set('--acct',c.accentText);
  set('--cv',c.canvas);set('--gm',c.grid);set('--gr',mixHex(c.grid,c.canvas,.55));set('--gt',c.grid);set('--gd',c.ground);
  set('--line',b.enabled?b.color:mixHex(c.text,c.panel,.82));set('--bw',(b.enabled?b.width:1)+'px');set('--rad',custom.radius+'px');
}
function applyTheme(name,save){
  if(!TH.includes(name))name='light';
  rootEl.setAttribute('data-theme',name);
  CUS_VARS.forEach(k=>rootEl.style.removeProperty(k));
  if(name==='custom')applyCustomVars();
  document.querySelectorAll('input[name=th]').forEach(r=>{r.checked=r.value===name});
  $('ced').hidden=name!=='custom';if(name==='custom')buildEditor();
  if(save){try{localStorage.setItem('tntTheme',name)}catch(e){}}
}
const COLOR_FIELDS=[['main','Main color'],['panel','Panel color'],['text','Text color'],['mutedText','Muted text color'],['button','Button color'],
  ['buttonText','Button text color'],['accent','Accent color'],['accentText','Accent text color'],['canvas','Canvas color'],['grid','Grid color'],['ground','Ground color']];
function buildEditor(){
  const E=$('ced');E.innerHTML='';
  const mk=(tag,props)=>Object.assign(document.createElement(tag),props);
  const row=(label,el)=>{const d=mk('label',{className:'crow'}),s=mk('span',{textContent:label});d.append(s,el);E.append(d);return s};
  const changed=()=>{applyCustomVars();saveCustom()};
  row('Theme name',mk('input',{type:'text',value:custom.name,oninput(){custom.name=this.value.slice(0,40);saveCustom()}}));
  COLOR_FIELDS.forEach(([k,l])=>row(l,mk('input',{type:'color',value:custom.colors[k],oninput(){custom.colors[k]=this.value;changed()}})));
  const bc=mk('input',{type:'color',value:custom.border.color,disabled:!custom.border.enabled,oninput(){custom.border.color=this.value;changed()}});
  const bwIn=mk('input',{type:'range',min:0,max:4,step:1,value:custom.border.width,disabled:!custom.border.enabled});
  const be=mk('input',{type:'checkbox',checked:custom.border.enabled,onchange(){custom.border.enabled=this.checked;bc.disabled=bwIn.disabled=!this.checked;changed()}});
  row('Use border color (optional)',be);row('Border color',bc);
  const bwLabel=row('Border width: '+custom.border.width+' px',bwIn);
  bwIn.oninput=()=>{custom.border.width=+bwIn.value;bwLabel.textContent='Border width: '+bwIn.value+' px';changed()};
  const rIn=mk('input',{type:'range',min:0,max:24,step:1,value:custom.radius});
  const rLabel=row('Corner radius: '+custom.radius+' px',rIn);
  rIn.oninput=()=>{custom.radius=+rIn.value;rLabel.textContent='Corner radius: '+rIn.value+' px';changed()};
  const btns=mk('div',{className:'cbtns'});
  btns.append(mk('button',{textContent:'Export .tntheme',onclick:exportTheme}),mk('button',{textContent:'Import .tntheme',onclick:()=>$('thf').click()}),
    mk('button',{textContent:'Import from text',onclick:()=>importTheme($('tht').value)}),
    mk('button',{textContent:'Reset custom theme',onclick(){custom=JSON.parse(JSON.stringify(CUS_DEF));saveCustom();applyTheme('custom',true)}}));
  const ta=mk('textarea',{id:'tht',rows:4,placeholder:'Export fills this box. To import, paste theme text here and press Import from text.'});
  const fi=mk('input',{type:'file',id:'thf',hidden:true,onchange:async e=>{const f=e.target.files[0];e.target.value='';if(f)importTheme(await f.text())}});
  E.append(btns,ta,fi);
}
function exportTheme(){
  const t=JSON.stringify({format:'tntheme',version:1,name:custom.name,colors:custom.colors,border:custom.border,radius:custom.radius},null,2);
  $('tht').value=t;dl((custom.name.replace(/[^a-z0-9_-]+/gi,'_').replace(/^_+|_+$/g,'')||'theme')+'.tntheme',t);
}
function importTheme(text){
  try{const o=cleanTheme(JSON.parse(text));if(!o)throw 0;custom=o;saveCustom();applyTheme('custom',true);log('Theme imported: '+o.name)}
  catch(e){log('Invalid theme text')}
}
document.querySelectorAll('input[name=th]').forEach(r=>{r.onchange=()=>applyTheme(r.value,true)});
let savedTheme='light';try{savedTheme=localStorage.getItem('tntTheme')||'light'}catch(e){}
applyTheme(savedTheme,false);
showView(location.hash==='#guide'?'guide':'chamber');
renderP();

addEventListener('keydown',e=>{
  if(e.key==='Escape'){openMenu(false);return}
  if(view!=='chamber'||drawerEl.classList.contains('open'))return;
  if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||e.ctrlKey||e.metaKey)return;
  const k=e.key.toLowerCase();
  if(k===' '){e.preventDefault();setPlaying(!playing)}
  else if(k==='s')step();else if(k==='r')$('rs').click();else if(k==='f')fit();else if(k==='c')centerCam();else if(k==='b')$('ob').click();
});
const SK=['oa','ot','of','ob','rb','sp1','km','eo'];
try{const sv=JSON.parse(localStorage.getItem('tnts')||'{}');SK.forEach(i=>{if(i in sv){const el=$(i);if(el.type==='checkbox')el.checked=!!sv[i];else el.value=sv[i]}})}catch(e){}
SK.forEach(i=>$(i).addEventListener('change',()=>{try{const o={};SK.forEach(j=>{const el=$(j);o[j]=el.type==='checkbox'?el.checked:el.value});localStorage.setItem('tnts',JSON.stringify(o))}catch(e){}}));

let last=performance.now();
function loop(t){
  const dt=Math.min(t-last,200);last=t;
  if(playing){acc+=dt*parseFloat($('sp1').value);let n=0;while(acc>=50&&n++<20){step();acc-=50}if(acc>=50)acc=0}
  if(rec&&((playing&&!ents.length&&!rings.length)||tick-rec.t0>3000))stopRecord();
  if(view==='chamber')draw();requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Splash screen: rotating status messages; hidden once textures are ready (with a minimum display time)
(function(){
  const sp=$('splash');if(!sp)return;
  const sub=sp.querySelector('.sp-sub'),msgs=['Calculating Velocity...','Rendering TNT...','Loading Textures...','Igniting Fuses...','Computing Knockback...'];
  const t0=performance.now(),reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches,minMs=reduce?300:2000;
  let k=0;if(sub)sub.textContent=msgs[0];
  const iv=setInterval(()=>{k=(k+1)%msgs.length;if(sub)sub.textContent=msgs[k]},reduce?3000:420);
  const imgs=Object.values(TX).map(i=>i.complete?Promise.resolve():new Promise(r=>{i.onload=i.onerror=r}));
  const hide=()=>setTimeout(()=>{clearInterval(iv);if(sub)sub.textContent='Ready';sp.classList.add('hide');setTimeout(()=>sp.remove(),600)},Math.max(0,minMs-(performance.now()-t0)));
  Promise.race([Promise.all(imgs),new Promise(r=>setTimeout(r,5000))]).then(hide);
})();
