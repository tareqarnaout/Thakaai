'use strict';
const $ = s => document.querySelector(s);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let dimensionOn = false, pinned = false, held = false;
const dimension = $('#dimension');
function setDimension(on, x, y) {
  if (x != null && !dimensionOn) { dimension.style.setProperty('--portal-x', x+'px'); dimension.style.setProperty('--portal-y', y+'px'); }
  dimensionOn=on;
  document.dispatchEvent(new CustomEvent('thakaai:dimension',{detail:{active:on,x,y}}));
  document.body.classList.toggle('in-dimension', on);
  if(!on&&dimension.contains(document.activeElement))$('#hold-button').focus({preventScroll:true});
  dimension.setAttribute('aria-hidden',String(!on));
  document.querySelectorAll('main,.header,footer').forEach(el=>{el.inert=on;});
  $('#hold-label').textContent=on?(pinned?'Exit the dimension':'Release to return'):'Hold + move to explore';
  $('#hold-button').setAttribute('aria-label',on?'Release or press Escape to return':'Hold to reveal the intelligence dimension');
  document.querySelectorAll('.dimension-toggle').forEach(b=>b.setAttribute('aria-pressed',String(on)));
  $('#dimension-status').textContent=on?'Page opened in 3D. Move the pointer or use arrow keys to look around. Release or press Escape to return.':'Company website visible.';
}
function finishHold(){if(held){held=false;if(!pinned)setDimension(false);}}
document.addEventListener('pointerdown', e=>{
  if(e.button!==0||document.querySelector('dialog[open]'))return;
  if(e.target.closest('a,input,select,textarea,button') && !e.target.closest('#hold-button'))return;
  if(e.pointerType==='touch'&&!e.target.closest('#hold-button'))return;
  if(e.target.closest('#hold-button')&&pinned){pinned=false;held=false;setDimension(false);return;}
  held=true;setDimension(true,e.clientX,e.clientY);
});
window.addEventListener('pointerup',finishHold);window.addEventListener('pointercancel',finishHold);window.addEventListener('blur',finishHold);
let pointerX=0,pointerY=0;
window.addEventListener('pointermove',e=>{pointerX=(e.clientX/innerWidth-.5);pointerY=(e.clientY/innerHeight-.5);},{passive:true});
document.querySelectorAll('.dimension-toggle').forEach(b=>b.addEventListener('click',e=>{pinned=!pinned;setDimension(pinned,e.clientX||innerWidth/2,e.clientY||innerHeight/2);}));
$('#hold-button').addEventListener('click',e=>{if(e.detail===0){pinned=!pinned;setDimension(pinned,innerWidth/2,innerHeight*.75);}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){pinned=false;held=false;setDimension(false);}if(e.code==='Space'&&!e.repeat&&!e.target.closest('input,textarea,select,button,a,dialog')){e.preventDefault();held=true;setDimension(true,innerWidth/2,innerHeight*.7);}});
document.addEventListener('keyup',e=>{if(e.code==='Space')finishHold();});
$('.menu-toggle').addEventListener('click',()=>{let open=$('.header').classList.toggle('menu-open');$('.menu-toggle').setAttribute('aria-expanded',String(open));$('.menu-toggle').setAttribute('aria-label',open?'Close navigation':'Open navigation');});
document.querySelectorAll('nav a').forEach(a=>a.addEventListener('click',()=>{$('.header').classList.remove('menu-open');$('.menu-toggle').setAttribute('aria-expanded','false');}));
const solutions={ai:{label:'01 / AI SOLUTIONS',title:'Intelligence that fits your business.',copy:'Explore where artificial intelligence can remove friction and help your team focus on the work that matters.',points:['Automate repetitive workflows and document processing.','Explore assistants grounded in your business knowledge.','Connect intelligence with the tools your team already uses.']},ml:{label:'02 / MACHINE LEARNING',title:'See the potential in your data.',copy:'Turn business data into focused models that help you recognise patterns and make better-informed decisions.',points:['Explore forecasting and predictive modelling.','Identify unusual patterns and emerging changes.','Evaluate models against your real business objectives.']},sound:{label:'03 / SOUND INTELLIGENCE',title:'Make sense of every signal.',copy:'Explore the information hidden in audio, from repeatable mechanical patterns to changes in an acoustic environment.',points:['Classify and compare sound events.','Explore acoustic anomaly detection for equipment.','Analyse speech and environmental sound for your use case.']}};
document.querySelectorAll('[data-solution]').forEach(b=>b.addEventListener('click',()=>{const s=solutions[b.dataset.solution];$('#detail-label').textContent=s.label;$('#detail-title').textContent=s.title;$('#detail-copy').textContent=s.copy;$('#detail-points').replaceChildren(...s.points.map(p=>{let li=document.createElement('li');li.textContent=p;return li;}));$('#detail-dialog').showModal();}));
document.querySelectorAll('.contact').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());pinned=false;setDimension(false);$('#contact-dialog').showModal();}));
document.querySelectorAll('.dialog-close').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
$('#enquiry-form').addEventListener('submit',e=>{e.preventDefault();let f=new FormData(e.target);const text=`THAKAAI — PROJECT BRIEF\n\nName: ${f.get('name')}\nWork email: ${f.get('email')}\nCompany: ${f.get('company')}\nArea of interest: ${f.get('interest')}\n\nThe challenge\n${f.get('challenge')}\n\nPrepared with thakaai. Intelligence, deeply rooted.\nThis brief has not been sent automatically.\n`;const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='thakaai-project-brief.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);$('#form-result').textContent='Your project brief is ready. Share the downloaded file with the Thakaai team.';});
$('#year').textContent=new Date().getFullYear();
// The normal and spatial views share the same logo-derived vector silhouette.
const treeArt=window.thakaaiArtwork;
const treePaths=treeArt.shapes.map(shape=>({...shape,path:new Path2D(shape.d)}));
function setupCanvas(canvas){const ctx=canvas.getContext('2d');let w=0,h=0;function resize(){const r=canvas.getBoundingClientRect();w=r.width;h=r.height;const d=Math.min(devicePixelRatio||1,1.7);canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);ctx.setTransform(d,0,0,d,0,0);}new ResizeObserver(resize).observe(canvas);resize();return{canvas,ctx,get w(){return w},get h(){return h}};}
const normal=setupCanvas($('#tree')),signal=setupCanvas($('#signal'));
function drawTree(v,time){
  const {ctx,w,h}=v;if(!w||!h)return;ctx.clearRect(0,0,w,h);
  const layout=treeArt.layout(w,h),scale=layout.scale;
  const float=reduceMotion?0:Math.sin(time*.0006)*2;
  ctx.save();ctx.translate(layout.x,layout.y+165*scale+float);
  const ground=ctx.createRadialGradient(0,0,0,0,0,130*scale);ground.addColorStop(0,'#4b295b0d');ground.addColorStop(1,'#4b295b00');
  ctx.scale(1,.15);ctx.fillStyle=ground;ctx.beginPath();ctx.arc(0,0,130*scale,0,Math.PI*2);ctx.fill();ctx.restore();
  ctx.save();ctx.translate(layout.x,layout.y+float);ctx.scale(scale,scale);ctx.translate(-423,-390);
  for(const shape of treePaths){
    const goldShape=shape.fill==='#c9a052'||shape.stroke==='#c9a052';
    const color=goldShape?'#a67c36':shape.fill==='#a27cab'?'#9374a2':'#57305f';
    const mesh=shape.fill!=='none'?treeArt.surfaceMeshes.find(m=>m.d===shape.d):treeArt.strokeMeshes.find(m=>m.d===shape.d);
    if(mesh){
      ctx.save();if(shape.fill!=='none')ctx.clip(shape.path);
      ctx.strokeStyle=color;ctx.lineWidth=shape.kind==='trunk'?.45:.5;ctx.globalAlpha=goldShape?.78:.62;ctx.beginPath();
      for(const [a,b] of mesh.edges){const p=mesh.points[a],q=mesh.points[b];ctx.moveTo(p.x+p.z*.08,p.y);ctx.lineTo(q.x+q.z*.08,q.y);}
      ctx.stroke();ctx.restore();
      if(shape.fill!=='none'){ctx.globalAlpha=.8;ctx.strokeStyle=color;ctx.lineWidth=.72;ctx.stroke(shape.path);}
    }else if(shape.kind==='vein'){
      ctx.globalAlpha=.55;ctx.strokeStyle=shape.stroke==='#fff2cd'?'#ac8039':'#795484';ctx.lineWidth=.65;ctx.stroke(shape.path);
    }
  }
  ctx.restore();
}
let signalType='machine';const signalProfiles={machine:['Mechanical rhythm','Repeating patterns.<br>Potential for early insights.'],environment:['Environmental texture','Layered acoustic events.<br>Context beyond the noise.'],voice:['Speech-like cadence','Dynamic vocal patterns.<br>Meaning within the signal.']};
document.querySelectorAll('[data-signal]').forEach(b=>b.addEventListener('click',()=>{signalType=b.dataset.signal;document.querySelectorAll('[data-signal]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});$('#signal-name').textContent=signalProfiles[signalType][0];$('#signal-detail').innerHTML=signalProfiles[signalType][1];}));
function drawSignal(t){const{ctx,w,h}=signal;ctx.clearRect(0,0,w,h);ctx.strokeStyle='#35223f0c';ctx.lineWidth=1;for(let i=1;i<8;i++){ctx.beginPath();ctx.moveTo(w*i/8,14);ctx.lineTo(w*i/8,h);ctx.stroke();}for(let i=1;i<5;i++){ctx.beginPath();ctx.moveTo(20,h*i/5);ctx.lineTo(w-20,h*i/5);ctx.stroke();}const count=Math.floor(w/5),time=reduceMotion?0:t*.0007;for(let i=0;i<count;i++){let x=i/count;let envelope=signalType==='machine'?.35+.5*Math.pow(Math.sin(x*13+time),4):signalType==='voice'?.12+.85*Math.pow(Math.sin(x*9-time),2)*Math.pow(Math.sin(x*17+1),2):.25+.4*Math.sin(x*3+time)**2+.2*Math.cos(x*29+time);let value=(.2+.8*Math.abs(Math.sin(i*2.13+time)))*envelope;let height=value*h*.66;ctx.fillStyle=i>count*.43&&i<count*.57?'#b7914d':'#644277';ctx.globalAlpha=.35+value*.6;ctx.fillRect(22+x*(w-44),h/2-height/2,2,height);}ctx.globalAlpha=1;ctx.strokeStyle='#b48a4355';ctx.beginPath();ctx.moveTo(w*.5,16);ctx.lineTo(w*.5,h-10);ctx.stroke();}
let lastFrame=0;function animate(t){requestAnimationFrame(animate);if(document.hidden||t-lastFrame<33)return;lastFrame=t;const top=normal.canvas.getBoundingClientRect();if(top.bottom>0&&top.top<innerHeight&&!dimensionOn)drawTree(normal,t);const sr=signal.canvas.getBoundingClientRect();if(sr.bottom>0&&sr.top<innerHeight)drawSignal(t);}requestAnimationFrame(animate);

$('#dimension-exit').addEventListener('click',()=>{pinned=false;held=false;setDimension(false);});
document.addEventListener('thakaai:dimension-unavailable',()=>{pinned=false;held=false;setDimension(false);$('#hold-label').textContent='3D view unavailable';$('#dimension-status').textContent='Your browser could not start the 3D view. The company website remains available.';$('#hold-button').disabled=true;document.querySelectorAll('.dimension-toggle').forEach(b=>b.disabled=true);});
