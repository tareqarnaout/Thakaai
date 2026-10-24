import * as THREE from 'three';
import { SVGLoader } from './vendor/three/SVGLoader.js';
import { FontLoader } from './vendor/three/FontLoader.js';
import { TextGeometry } from './vendor/three/TextGeometry.js';
import { mergeGeometries } from './vendor/three/BufferGeometryUtils.js';

const overlay = document.querySelector('#dimension');
const canvas = document.querySelector('#dimension-canvas');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let renderer, scene, camera, content, room, treeGroup, target, postScene, postCamera, postMaterial;
let font, serif, active = false, progress = 0, yaw = 0, pitch = 0, aimX = 0, aimY = 0, zoom = 1;
let pointer = { x: innerWidth / 2, y: innerHeight * .7 }, frame = 0, builtWidth = 0, builtHeight = 0;
let meshes = [], crystals = [], lastTime = 0, renderedFrames = 0, rebuildTimer = null, needsBuild = true;

const U = { tDiffuse: { value: null }, uTime: { value: 0 }, uProgress: { value: 0 }, uReduced: { value: reduced ? 1 : 0 }, uResolution: {value: new THREE.Vector2(innerWidth, innerHeight)} };

function disposeGroup(group) {
  if (!group) return;
  group.traverse(o => { if(o.geometry)o.geometry.dispose(); if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{if(m.map)m.map.dispose();m.dispose();});} });
  group.removeFromParent();
}
function lineGeometry(points, color, opacity = .23) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  return new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({color, transparent: true, opacity}));
}
function makeRoom() {
  disposeGroup(room); room = new THREE.Group(); scene.add(room);
  const w=innerWidth,h=innerHeight,segments=[];
  for(let x=-2400;x<=2400;x+=100)segments.push(new THREE.Vector3(x,h,-720),new THREE.Vector3(x,-document.body.scrollHeight-800,-720));
  for(let y=h;y>=-document.body.scrollHeight-800;y-=100)segments.push(new THREE.Vector3(-2400,y,-720),new THREE.Vector3(2400,y,-720));
  room.add(lineGeometry(segments,0x866a9a,.22));
  const tunnel = new THREE.Group(); tunnel.name='tunnel'; room.add(tunnel);
  for(const y of [-h*.65,h*.8]){
    const points=[];
    for(let x=-2400;x<=2400;x+=120)points.push(new THREE.Vector3(x,y,-1900),new THREE.Vector3(x,y,1200));
    for(let z=-1900;z<=1200;z+=120)points.push(new THREE.Vector3(-2400,y,z),new THREE.Vector3(2400,y,z));
    tunnel.add(lineGeometry(points,0x9e73ad,.22));
  }
  const starPositions=[];
  for(let i=0;i<320;i++)starPositions.push(Math.sin(i*43.17)*w*1.8,Math.cos(i*19.7)*h*2,-1300+(i*47%2200));
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(starPositions,3));
  room.add(new THREE.Points(g,new THREE.PointsMaterial({color:0xe0b96d,size:1.8,transparent:true,opacity:.65,sizeAttenuation:true})));
}
function addWord(text, rect, style, isHeading, index, isGold, panelText) {
  if (!text.trim() || !rect.width || !rect.height) return;
  const family = style.fontFamily.toLowerCase();
  const useSerif=family.includes('instrument')||family.includes('georgia');
  const size = parseFloat(style.fontSize);
  const cleanText=text.replace(/’/g,"'").replace(/—|–/g,'-').replace(/↗|↓|↑|✧|⊹|×/g,'+');
  const selectedFont=useSerif?serif:font;
  const geometry=isHeading?new TextGeometry(cleanText,{font:selectedFont,size,depth:Math.max(14,size*.43),curveSegments:5,bevelEnabled:false}):new THREE.ShapeGeometry(selectedFont.generateShapes(cleanText,size),2);
  geometry.computeBoundingBox();const box=geometry.boundingBox;
  if(!box||!Number.isFinite(box.max.x)||box.max.x-box.min.x<.001){geometry.dispose();return;}
  const group=new THREE.Group();
  const shapeWidth=box.max.x-box.min.x;
  group.scale.x=rect.width/shapeWidth;
  group.scale.y=(useSerif ? .85 : .72);
  geometry.translate(-box.min.x,0,0);
  const color=panelText?0x2b1733:isGold?0xffd58d:(isHeading?0xfff0ff:0xe1c9ed);
  if(isHeading){
    const fill=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:0x120d19,transparent:true,opacity:.88,side:THREE.DoubleSide}));
    group.add(fill);
    group.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry,30),new THREE.LineBasicMaterial({color,transparent:true,opacity:.85})));
  }else{
    group.add(new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color,transparent:true,opacity:.8,side:THREE.DoubleSide})));
  }
  const lineHeight=rect.height;
  group.position.set(rect.left-innerWidth/2,innerHeight/2-(rect.top+scrollY)-lineHeight*.78,0);
  const scatter=panelText?8:isHeading?Math.sin(index*17.34)*14:Math.sin(index*6.7)*17-10;
  group.userData.z=scatter;group.userData.isHeading=isHeading;
  content.add(group);meshes.push(group);
}
function collectText() {
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let node,index=0;
  while(node=walker.nextNode()){
    const el=node.parentElement;
    if(!node.textContent.trim()||!el||!el.closest('main,.header,footer')||el.closest('canvas,script,style,dialog,.brand-crop,.mini-art,.about-symbol,.footer-brand,.menu-toggle'))continue;
    const style=getComputedStyle(el);if(style.display==='none'||style.visibility==='hidden'||!el.getClientRects().length)continue;
    if(el.closest('[aria-hidden="true"]'))continue;
    const heading=el.closest('h1,h2,h3');
    const isHero=!!el.closest('h1');
    const ranges=isHero?[...node.textContent.matchAll(/\S/g)]:[...node.textContent.matchAll(/\S+/g)];
    for(const match of ranges){
      const range=document.createRange();range.setStart(node,match.index);range.setEnd(node,match.index+match[0].length);
      const rect=range.getBoundingClientRect();
      const isGold=!!el.closest('em')||el.classList.contains('eyebrow')||el.closest('.cta');
      addWord(match[0],rect,style,!!heading,index++,isGold,!!el.closest('.button.primary,.nav-contact,.cta-circle'));
    }
  }
}
function batchText(){
  const buckets=new Map();
  for(const group of meshes){
    group.position.z=group.userData.z;group.scale.z=1;group.updateMatrix();
    for(const child of group.children){
      const material=child.material,key=(child.isLineSegments?'line':'fill')+material.color.getHexString()+material.opacity;
      if(!buckets.has(key))buckets.set(key,{line:child.isLineSegments,geometries:[],material:material.clone()});
      const geometry=child.geometry.clone().applyMatrix4(group.matrix);
      // Only positions are needed by these unlit materials; normalize attributes for merging.
      for(const name of Object.keys(geometry.attributes))if(name!=='position')geometry.deleteAttribute(name);
      buckets.get(key).geometries.push(geometry.index?geometry.toNonIndexed():geometry);
    }
    disposeGroup(group);
  }
  for(const {line,geometries,material} of buckets.values()){
    const merged=mergeGeometries(geometries,false);geometries.forEach(g=>g.dispose());
    if(merged)content.add(line?new THREE.LineSegments(merged,material):new THREE.Mesh(merged,material));
  }
  meshes=[];
}
function addRulesAndPanels() {
  document.querySelectorAll('.header,.hero-bottom,.solution-row,.steps article,.sound-visual,.capabilities-strip,.signal-footer').forEach(el=>{
    const r=el.getBoundingClientRect();if(!r.width)return;
    const x=r.left-innerWidth/2,y=innerHeight/2-r.top-scrollY;
    const points=[new THREE.Vector3(x,y,-35),new THREE.Vector3(x+r.width,y,-35)];
    if(el.matches('.sound-visual,.solution-row'))points.push(new THREE.Vector3(x,y-r.height,-35),new THREE.Vector3(x+r.width,y-r.height,-35));
    content.add(lineGeometry(points,0x9b77ab,.4));
  });
  document.querySelectorAll('.button.primary,.nav-contact,.cta-circle').forEach(el=>{
    const r=el.getBoundingClientRect();if(!r.width)return;
    const panel=new THREE.Mesh(new THREE.BoxGeometry(r.width,r.height,14),new THREE.MeshBasicMaterial({color:0xc9a356}));
    panel.position.set(r.left+r.width/2-innerWidth/2,innerHeight/2-r.top-scrollY-r.height/2,-24);
    content.add(panel);
  });
}
function addLogo(){
  const el=document.querySelector('.brand-crop'),r=el.getBoundingClientRect();
  const image=document.querySelector('.brand-crop img');
  if(!image.complete)return;
  const c=document.createElement('canvas');c.width=800;c.height=280;const ctx=c.getContext('2d');
  // Frame the supplied primary lockup; use the same source as the ordinary header.
  ctx.drawImage(image,258,225,955,340,0,0,800,280);
  const data=ctx.getImageData(0,0,800,280);for(let i=0;i<data.data.length;i+=4){let brightness=(data.data[i]+data.data[i+1]+data.data[i+2])/3;data.data[i+3]=Math.max(0,Math.min(255,(250-brightness)*2));}
  ctx.putImageData(data,0,0);
  const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;
  const plane=new THREE.Mesh(new THREE.PlaneGeometry(r.width,r.height),new THREE.MeshBasicMaterial({map,color:0xe6caf4,transparent:true,side:THREE.DoubleSide}));
  plane.position.set(r.left+r.width/2-innerWidth/2,innerHeight/2-r.top-scrollY-r.height/2,15);content.add(plane);
}
function addTree(){
  const art=window.thakaaiArtwork;if(!art)return;
  const r=document.querySelector('#tree').getBoundingClientRect(),layout=art.layout(r.width,r.height),scale=layout.scale;
  treeGroup=new THREE.Group();treeGroup.position.set(r.left+layout.x-innerWidth/2,innerHeight/2-r.top-scrollY-layout.y,12);
  treeGroup.scale.set(scale,-scale,scale);
  const paths=new SVGLoader().parse(art.svg).paths;
  for(const path of paths){
    const style=path.userData.style,node=path.userData.node;
    const kind=node.getAttribute('data-kind'),z=parseFloat(node.getAttribute('data-depth'))||8;
    const isGold=style.fill==='#c9a052'||style.stroke==='#c9a052';
    const mesh=style.fill&&style.fill!=='none'?art.surfaceMeshes.find(m=>m.d===node.getAttribute('d')):art.strokeMeshes.find(m=>m.d===node.getAttribute('d'));
    if(mesh){
      const positions=[];for(const [a,b] of mesh.edges)for(const id of [a,b]){const p=mesh.points[id];positions.push(p.x-423,p.y-390,z+p.z);}
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
      treeGroup.add(new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:isGold?0xf0c977:style.fill==='#a27cab'?0xc5a4dc:0xbb91d7,transparent:true,opacity:isGold?.85:.7})));
      if(mesh.outline){
        const boundary=new THREE.BufferGeometry().setFromPoints([...mesh.outline,mesh.outline[0]].map(p=>new THREE.Vector3(p.x-423,p.y-390,z)));
        treeGroup.add(new THREE.Line(boundary,new THREE.LineBasicMaterial({color:isGold?0xffdf9d:0xd9b6ee,transparent:true,opacity:.75})));
      }
    }else if(kind==='vein'){
      for(const sub of path.subPaths){
        const points=sub.getPoints(26).map(p=>new THREE.Vector3(p.x-423,p.y-390,36));
        const geometry=new THREE.BufferGeometry().setFromPoints(points);
        treeGroup.add(new THREE.Line(geometry,new THREE.LineBasicMaterial({color:style.stroke==='#fff2cd'?0xffdc90:0xb68bd2,transparent:true,opacity:.6})));
      }
    }
  }
  content.add(treeGroup);
}
function addSignal(){
  const el=document.querySelector('#signal'),r=el.getBoundingClientRect();
  if(!r.width)return;
  const positions=[];for(let i=0;i<95;i++){const x=r.left+20+i*(r.width-40)/95-innerWidth/2,y=innerHeight/2-r.top-scrollY-r.height/2;
  const a=(.2+Math.abs(Math.sin(i*2.13))*.8)*(.35+.5*Math.sin(i*.13)**4)*r.height*.6;positions.push(new THREE.Vector3(x,y-a/2,35),new THREE.Vector3(x,y+a/2,35));}
  content.add(lineGeometry(positions,0xdbb675,.9));
}
function build(){
  disposeGroup(content);content=new THREE.Group();scene.add(content);meshes=[];crystals=[];
  collectText();batchText();addRulesAndPanels();addLogo();addTree();addSignal();
  for(let i=0;i<20;i++){
    const obj=new THREE.Mesh(new THREE.TetrahedronGeometry(5+i%4*2),new THREE.MeshBasicMaterial({color:i%3?0xd6ac55:0xb283ca,wireframe:i%3===0}));
    obj.position.set(Math.sin(i*14.7)*innerWidth*.9,innerHeight/2-(i*277%document.body.scrollHeight),60+i%5*85);
    obj.userData.base=obj.position.y;content.add(obj);crystals.push(obj);
  }
  makeRoom();builtWidth=innerWidth;builtHeight=document.body.scrollHeight;needsBuild=false;
}
function resize(){
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight,false);
  target.setSize(Math.round(innerWidth*renderer.getPixelRatio()),Math.round(innerHeight*renderer.getPixelRatio()));
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();U.uResolution.value.set(innerWidth,innerHeight);
  needsBuild=true;clearTimeout(rebuildTimer);
  if(active)rebuildTimer=setTimeout(()=>{if(active&&font&&serif)build();},180);
}
function portal(){
  if(progress>.998){overlay.style.clipPath='none';return;}
  const x=pointer.x,y=pointer.y,r=Math.hypot(Math.max(x,innerWidth-x),Math.max(y,innerHeight-y))*1.25;
  const radius=(1-Math.pow(1-progress,2.2))*r,points=[];
  for(let i=0;i<64;i++){const a=i/64*Math.PI*2;const jitter=1+(Math.sin(i*17.3)*.12+(i%2?-.06:.06))*(1-progress);points.push(`${x+Math.cos(a)*radius*jitter}px ${y+Math.sin(a)*radius*jitter}px`);}
  overlay.style.clipPath=`polygon(${points.join(',')})`;
}
function tick(time){
  frame=requestAnimationFrame(tick);if(document.hidden)return;
  const dt=Math.min(.05,(time-(lastTime||time))/1000);lastTime=time;
  if(!active&&progress<=0)return;
  if(!content||!room)return;
  const duration=reduced?.08:.65;progress=THREE.MathUtils.clamp(progress+(active?1:-1)*dt/duration,0,1);
  portal();U.uProgress.value=progress;U.uTime.value=time*.001;
  const strength=1-Math.pow(1-progress,3);
  yaw=THREE.MathUtils.damp(yaw,active?aimX*.65:0,7,dt);
  pitch=THREE.MathUtils.damp(pitch,active?aimY*.32:0,7,dt);
  const distance=innerHeight/(2*Math.tan(THREE.MathUtils.degToRad(45/2)))*(1+.14*strength)*zoom;
  const camYaw=yaw*strength,camPitch=pitch*strength;
  camera.position.set(Math.sin(camYaw)*Math.cos(camPitch)*distance,-scrollY+Math.sin(camPitch)*distance,Math.cos(camYaw)*Math.cos(camPitch)*distance);
  camera.lookAt(0,-scrollY,0);
  content.scale.z=Math.max(.001,strength);
  if(treeGroup)treeGroup.rotation.y=(reduced?0:Math.sin(time*.00014)*.08)*strength;
  const tunnel=room.getObjectByName('tunnel');if(tunnel)tunnel.position.y=-scrollY;
  crystals.forEach((obj,i)=>{obj.rotation.set(time*.00016+i,time*.00025+i,0);obj.position.y=obj.userData.base+(reduced?0:Math.sin(time*.0007+i)*10);});
  renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(postScene,postCamera);
  canvas.dataset.camera=`${camera.position.x.toFixed(1)},${camera.position.y.toFixed(1)},${camera.position.z.toFixed(1)}`;
  canvas.dataset.progress=progress.toFixed(2);
  canvas.dataset.frame=String(++renderedFrames);
}
async function init(){
  try{
    [font,serif]=await Promise.all(['sans','serif'].map(async n=>new FontLoader().parse(await(await fetch(`./vendor/three/${n}.json`)).json())));
    await document.fonts.ready;
    renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
    renderer.setClearColor(0x0a070f);renderer.outputColorSpace=THREE.SRGBColorSpace;
    scene=new THREE.Scene();scene.background=new THREE.Color(0x0a070f);scene.fog=new THREE.FogExp2(0x0a070f,.00022);
    camera=new THREE.PerspectiveCamera(45,innerWidth/innerHeight,2,9000);
    target=new THREE.WebGLRenderTarget(innerWidth,innerHeight);U.tDiffuse.value=target.texture;
    postScene=new THREE.Scene();postCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
    postMaterial=new THREE.ShaderMaterial({uniforms:U,vertexShader:`varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`,fragmentShader:`
      uniform sampler2D tDiffuse;uniform float uTime;uniform float uProgress;uniform float uReduced;uniform vec2 uResolution;varying vec2 vUv;
      void main(){vec2 uv=vUv;vec2 p=uv-.5;float transition=sin(uProgress*3.14159)*(1.-uReduced);float shift=.00065+transition*.003;
      vec2 warp=p*(1.+transition*.035*dot(p,p));vec2 coord=.5+warp;
      vec3 col;col.r=texture2D(tDiffuse,coord+vec2(shift,0.)).r;col.g=texture2D(tDiffuse,coord).g;col.b=texture2D(tDiffuse,coord-vec2(shift,0.)).b;
      vec3 bloom=(texture2D(tDiffuse,coord+vec2(.002,0.)).rgb+texture2D(tDiffuse,coord-vec2(.002,0.)).rgb+texture2D(tDiffuse,coord+vec2(0.,.002)).rgb+texture2D(tDiffuse,coord-vec2(0.,.002)).rgb)*.25;
      col+=bloom*.16;float scan=.96+.04*sin(uv.y*uResolution.y*3.14159);float vignette=1.-dot(p,p)*.85;float noise=fract(sin(dot(uv*uResolution,vec2(12.9898,78.233))+uTime*(1.-uReduced))*43758.5453);
      col=pow(col,vec3(.8));col*=scan*vignette;col+=(noise-.5)*.012;col*=1.+transition*.65;gl_FragColor=vec4(col,1.);
      }`});
    postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),postMaterial));
    resize();overlay.dataset.ready='true';canvas.dataset.renderer='webgl';
    document.body.classList.add('dimension-ready');
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();document.dispatchEvent(new CustomEvent('thakaai:dimension-unavailable'));});
    window.addEventListener('resize',resize);requestAnimationFrame(tick);
    if(document.body.classList.contains('in-dimension')){active=true;build();}
  }catch(error){console.warn('The 3D view could not start:',error);overlay.dataset.ready='unavailable';document.dispatchEvent(new CustomEvent('thakaai:dimension-unavailable'));}
}
document.addEventListener('thakaai:dimension',e=>{
  const wasActive=active;active=e.detail.active;
  if(active&&!wasActive){pointer={x:e.detail.x??innerWidth/2,y:e.detail.y??innerHeight*.7};zoom=1;aimX=0;aimY=0;if(renderer&&(needsBuild||builtWidth!==innerWidth||builtHeight!==document.body.scrollHeight)){clearTimeout(rebuildTimer);rebuildTimer=setTimeout(()=>{if(active)build();},20);}}
});
window.addEventListener('pointermove',e=>{if(!active)return;aimX=(e.clientX/innerWidth-.5)*2;aimY=(e.clientY/innerHeight-.5)*2;},{passive:true});
document.addEventListener('keydown',e=>{
  if(!active||e.target.closest('input,textarea,select'))return;
  if(e.key==='ArrowLeft'){aimX=Math.max(-1.5,aimX-.16);e.preventDefault();}if(e.key==='ArrowRight'){aimX=Math.min(1.5,aimX+.16);e.preventDefault();}
  if(e.key==='ArrowUp'){aimY=Math.min(1.5,aimY+.16);e.preventDefault();}if(e.key==='ArrowDown'){aimY=Math.max(-1.5,aimY-.16);e.preventDefault();}
  if(e.key==='+'||e.key==='=')zoom=Math.max(.65,zoom-.06);if(e.key==='-')zoom=Math.min(1.7,zoom+.06);
});
init();
