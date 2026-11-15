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
    const dx=o.x-ex,dy=o.y-ey,dz=o.z-ez,l=Math.hypot(dx,dy,dz);
    if(!l)continue;
    // Bedrock: (1 - (distance - width/2) / (2*power)) * exposure; exposure = 1 (no blocks in the way)
    // Custom: linear falloff, max 4 b/s, range 4 blocks
    const k=bed?1-(l-.49)/(2*PW):(1-l/4)*4/20;
    if(k<=0)continue;
    o.vx+=dx/l*k;o.vy+=dy/l*k;o.vz+=dz/l*k;hit.push([o,dx/l*k,dy/l*k,dz/l*k]);
  }
  if(logB-->0){
    log('#'+e.id+' exploded @ ('+f2(ex)+', '+f2(ey)+', '+f2(ez)+') -> '+hit.length+' TNT affected');
    hit.slice(0,3).forEach(h=>log('   #'+h[0].id+' dv(b/s)=('+f2(h[1]*20)+', '+f2(h[2]*20)+', '+f2(h[3]*20)+')'));
  }
}
function spawn(p){
  const d3=(p.m||mode)==='3d'||v2==='top',n=clamp(p.n|0||1,1,500),z0=d3?p.z:0,out=[];
  const side=Math.ceil(d3?Math.cbrt(n):Math.sqrt(n));
  for(let i=0;i<n;i++){
    let x=p.x,y=p.y,z=z0;
    if(p.lay==='c'&&n>1){
      const ix=i%side,iy=d3?Math.floor(i/side)%side:Math.floor(i/side),iz=d3?Math.floor(i/side/side):0;
      x+=ix-(side-1)/2;y+=iy;if(d3)z+=iz-(side-1)/2;
    }
    const e={id:nid++,x,y,z,vx:0,vy:0,vz:0,fuse:p.fuse,trail:[x,y,z],dead:false};
    if(p.mom){const a=Math.random()*Math.PI*2,c=Math.cos(a),s=Math.sin(a);e.vx=.4*c-.4*s;e.vy=.2;e.vz=d3?.4*s+.4*c:0}
    ents.push(e);out.push(e);
  }
  logB=3;
  out.forEach(e=>{if(e.fuse<=0&&!e.dead)explode(e)});
  sweep();
}
function sweep(){
  ents.forEach(e=>{if(e.dead&&e.trail.length>3)ghosts.push(e.trail)});
  ents=ents.filter(e=>!e.dead);
  if(ghosts.length>400)ghosts.splice(0,ghosts.length-400);
}
function step(){
  logB=3;
  const floor=$('of').checked;
  for(const e of ents.slice()){
    if(e.dead)continue;
    e.vy-=.04;e.x+=e.vx;e.y+=e.vy;e.z+=e.vz;
    let og=false;
    if(floor&&e.y<0){e.y=0;e.vy=0;og=true}
    e.vx*=.98;e.vy*=.98;e.vz*=.98;
    if(og){e.vx*=.7;e.vz*=.7;e.vy*=-.5}
    e.trail.push(e.x,e.y,e.z);if(e.trail.length>1200)e.trail.splice(0,3);
    if(--e.fuse<=0)explode(e);
  }
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
  g.lineWidth=1;g.font='10px system-ui';g.fillStyle=css('--mut');
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
    g.strokeStyle=css('--mut');g.lineWidth=2;line([0,Y],[W,Y]);
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
  if(bg!=='theme')ovr=dark?{'--gr':'rgba(255,255,255,.1)','--gm':'rgba(255,255,255,.25)','--mut':'#aaaaaa','--gd':'rgba(190,150,90,.25)'}:{'--gr':'rgba(0,0,0,.08)','--gm':'rgba(0,0,0,.2)','--mut':'#555555','--gd':'rgba(120,90,50,.2)'};
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
function updAt(){const s=mode==='2d'&&v2==='side';$('az').hidden=s;$('atl').textContent=s?'X, Y':'X, Y, Z'}
function setV2(v){v2=v;$('v2s').classList.toggle('on',v==='side');$('v2t').classList.toggle('on',v==='top');updAt()}
$('v2s').onclick=()=>setV2('side');$('v2t').onclick=()=>setV2('top');
$('b2').onclick=()=>setMode('2d');$('b3').onclick=()=>setMode('3d');
$('fs').onchange=()=>{$('fn').disabled=$('fs').value==='n'};
function params(){
  return{x:+$('ax').value||0,y:+$('ay').value||0,z:+$('az').value||0,n:+$('cnt').value||1,
    fuse:$('fs').value==='n'?80:Math.max(0,($('fn').value|0)),mom:$('mom').value==='true',lay:$('lay').value,m:mode};
}
$('sp').onclick=()=>spawn(params());
function reset(){if(rec)stopRecord();ents=[];ghosts=[];rings=[];tick=0;lines=[];$('log').textContent=''}
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
  catch(e){const c=e&&e.code;log(c==='unavailable'?'Saving files is not available in this view. Copy the preset text from the box, or open the page in a regular browser.':'Save failed: '+(c||'unknown error'));return false}
}
function pickMime(alpha){
  if(!window.MediaRecorder)return null;
  return(alpha?['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm']:['video/mp4;codecs=avc1.42E01E','video/mp4','video/webm;codecs=vp9','video/webm']).find(m=>MediaRecorder.isTypeSupported(m))||null;
}
function startRecord(){
  if(rec)return;
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
    mom:!!it.mom,lay:it.lay==='c'?'c':'s',m:it.m==='3d'?'3d':'2d'};
}
function itxt(it){
  const pos=[it.x,it.y].concat(it.z?[it.z]:[]).join(', ');
  return '('+pos+') '+(it.fuse===80?'Normal':'Tick '+it.fuse)+' x'+it.n+(it.n>1?(it.lay==='c'?' cube':' stacked'):'')+(it.mom?' momentum':'');
}
function mkBtn(t,fn){const b=document.createElement('button');b.textContent=t;b.onclick=fn;return b}
function renderP(){
  const D=$('dl');D.innerHTML='';
  if(!draft.length){const m=document.createElement('div');m.className='mut';m.textContent='Draft is empty. Fill in the form and press "+ Preset".';D.append(m)}
  draft.forEach((it,i)=>{
    const r=document.createElement('div'),sp=document.createElement('span');r.className='it';sp.textContent=(i+1)+'. '+itxt(it);
    r.append(sp,mkBtn('x',()=>{draft.splice(i,1);renderP()}));D.append(r);
  });
  const L=$('pls');L.innerHTML='';
  presets.forEach((pr,i)=>{
    const r=document.createElement('div'),sp=document.createElement('span'),bx=document.createElement('span');
    r.className='it';bx.className='b';sp.textContent=pr.name+' ('+pr.items.length+')';
    bx.append(mkBtn('Play',()=>runPreset(pr,false)),mkBtn('Record',()=>runPreset(pr,true)),mkBtn('Edit',()=>{draft=pr.items.map(q=>({...q}));$('pn').value=pr.name;renderP()}),mkBtn('Delete',()=>{presets.splice(i,1);saveP();renderP()}));
    r.append(sp,bx);L.append(r);
  });
}
function runPreset(pr,r){
  reset();
  pr.items.forEach(it=>spawn({...it,m:mode}));
  r?startRecord():setPlaying(true);
}
$('ad').onclick=()=>{const q=params();if(q.m==='2d'&&v2!=='top')q.z=0;draft.push(q);renderP()};
$('ps').onclick=()=>{
  if(!draft.length){log('Draft is empty');return}
  const nm=$('pn').value.trim().slice(0,60)||'Preset '+(presets.length+1),ix=presets.findIndex(q=>q.name===nm),pv={name:nm,items:draft.slice()};ix>=0?presets[ix]=pv:presets.push(pv);
  draft=[];$('pn').value='';saveP();renderP();
};
$('pe').onclick=()=>{
  if(!presets.length){log('No presets yet');return}
  const t=JSON.stringify({app:'tnt-velocity',v:1,presets},null,1);$('pt').value=t;dl('tnt-preset.txt',t);
};
$('pi').onclick=()=>$('pf').click();
async function impText(t){
  try{
    const o=JSON.parse(t),arr=Array.isArray(o)?o:o.presets;let n=0;
    if(!Array.isArray(arr))throw 0;
    arr.forEach(pr=>{
      if(!pr||!Array.isArray(pr.items))return;
      const items=pr.items.map(clean).filter(Boolean);
      if(items.length){presets.push({name:String(pr.name||'Imported').slice(0,60),items});n++}
    });
    saveP();renderP();log('Imported '+n+' preset(s)');
  }catch(err){log('Invalid preset text')}
}
$('pf').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(f)impText(await f.text())};
$('pt2').onclick=()=>impText($('pt').value);
renderP();

addEventListener('keydown',e=>{
  if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||e.ctrlKey||e.metaKey)return;
  const k=e.key.toLowerCase();
  if(k===' '){e.preventDefault();setPlaying(!playing)}
  else if(k==='s')step();else if(k==='r')$('rs').click();else if(k==='f')fit();else if(k==='c')centerCam();else if(k==='b')$('ob').click();
});
const SK=['oa','ot','of','ob','rb','sp1','km'];
try{const sv=JSON.parse(localStorage.getItem('tnts')||'{}');SK.forEach(i=>{if(i in sv){const el=$(i);if(el.type==='checkbox')el.checked=!!sv[i];else el.value=sv[i]}})}catch(e){}
SK.forEach(i=>$(i).addEventListener('change',()=>{try{const o={};SK.forEach(j=>{const el=$(j);o[j]=el.type==='checkbox'?el.checked:el.value});localStorage.setItem('tnts',JSON.stringify(o))}catch(e){}}));

let last=performance.now();
function loop(t){
  const dt=Math.min(t-last,200);last=t;
  if(playing){acc+=dt*parseFloat($('sp1').value);let n=0;while(acc>=50&&n++<20){step();acc-=50}if(acc>=50)acc=0}
  if(rec&&((playing&&!ents.length&&!rings.length)||tick-rec.t0>3000))stopRecord();
  draw();requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
