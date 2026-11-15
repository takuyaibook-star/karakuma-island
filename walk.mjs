import {MAP,initialState,advance,scaleFor,characterHeight,screenToWorld,areaAt,clampX} from './model.mjs';
import {canStand,exitAt} from './terrain.mjs';
import {findPath} from './navigation.mjs';
import {setupMusic} from './music.mjs';
import {drawForestSign} from './decor.mjs';
const canvas=document.querySelector('#walk'),ctx=canvas.getContext('2d');
const place=document.querySelector('#place'),clock=document.querySelector('#clock'),loading=document.querySelector('#loading');
let state=initialState(),width=390,height=844,dpr=1,last=0,phase=0,ready=false,pointer=null,noticeUntil=0,lastPlace='',lastClock='',lastExit='';
const keys=new Set();let joystick={x:0,y:0},joyPointer=null;
const background=new Image(),bear=new Image();let bearBounds;
const tiles=[{id:'west',left:0,right:560,visibleLeft:0,fade:0,roadTop:764,roadBottom:1122,referenceHeight:1426},{id:'home',left:432,right:1140,visibleLeft:480,fade:80,roadTop:690,roadBottom:917,referenceHeight:1304},{id:'grove',left:803,right:1780,visibleLeft:1060,fade:80,roadTop:687,roadBottom:948,referenceHeight:1313},{id:'forest',left:1532,right:2172,visibleLeft:1670,fade:110,roadTop:784,roadBottom:1046,referenceHeight:1477}].map(t=>({...t,image:new Image()}));
function resize(){const rect=canvas.getBoundingClientRect();width=rect.width;height=rect.height;dpr=Math.min(devicePixelRatio||1,3);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';}
if(typeof ResizeObserver==='function')new ResizeObserver(resize).observe(canvas);else window.addEventListener('resize',resize);
resize();
let loadedImages=0;
function load(image,url){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{image.onload=image.onerror=null;reject(Error('画像の読み込みに時間がかかっています。通信状態を確認して再試行してください。'));},45000);image.onload=()=>{clearTimeout(timer);loadedImages++;window.__islandBoot?.progress(`画像を読み込んでいます… ${loadedImages}/6`);resolve();};image.onerror=()=>{clearTimeout(timer);reject(Error('画像を読み込めませんでした。通信状態を確認して再試行してください。'));};image.src=url;});}
function alphaBounds(image){const c=document.createElement('canvas');c.width=image.naturalWidth;c.height=image.naturalHeight;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(image,0,0);const data=x.getImageData(0,0,c.width,c.height).data;let minX=c.width,minY=c.height,maxX=-1,maxY=-1;for(let y=0;y<c.height;y++)for(let px=0;px<c.width;px++)if(data[(y*c.width+px)*4+3]>32){minX=Math.min(minX,px);minY=Math.min(minY,y);maxX=Math.max(maxX,px);maxY=Math.max(maxY,y);}if(maxX<minX)throw Error('キャラ画像を読み込めませんでした。');return{x:minX,y:minY,width:maxX-minX+1,height:maxY-minY+1};}
function notify(text,seconds=2.5){document.querySelector('#notice').textContent=text;noticeUntil=performance.now()+seconds*1000;}
function inputVector(){let x=Number(keys.has('arrowright')||keys.has('d'))-Number(keys.has('arrowleft')||keys.has('a')),y=Number(keys.has('arrowdown')||keys.has('s'))-Number(keys.has('arrowup')||keys.has('w'));return x||y?{x,y}:joystick;}
const stick=document.querySelector('#stick'),knob=document.querySelector('#knob');
function releaseStick(){joystick={x:0,y:0};joyPointer=null;knob.style.transform='translate(0px,0px)';stick.classList.remove('active');}
function stop(){keys.clear();releaseStick();state.target=null;state.path=[];state.moving=false;pointer=null;}
function reset(){stop();state=initialState();phase=0;lastExit='';notify('おうちの前から、もう一度');canvas.focus();}
function findSeam(oldData,newData,w,h){
 const previous=new Float64Array(w),current=new Float64Array(w),parent=new Int16Array(w*h);
 for(let y=0;y<h;y++){for(let x=0;x<w;x++){const i=(y*w+x)*4;let cost=0;for(let k=0;k<3;k++)cost+=(oldData[i+k]-newData[i+k])**2;cost+=Math.abs(x-w/2)*.2;
  let best=x;if(y){for(let j=Math.max(0,x-1);j<=Math.min(w-1,x+1);j++)if(previous[j]<previous[best])best=j;}
  current[x]=cost+(y?previous[best]:0);parent[y*w+x]=best;}
  previous.set(current);
 }
 let x=0;for(let j=1;j<w;j++)if(previous[j]<previous[x])x=j;const seam=new Int16Array(h);for(let y=h-1;y>=0;y--){seam[y]=x;x=parent[y*w+x];}return seam;
}
function prepareTiles(){
 const composite=document.createElement('canvas');composite.width=MAP.width;composite.height=MAP.height;const previous=composite.getContext('2d',{willReadFrequently:true});previous.drawImage(background,0,0,MAP.width,MAP.height);
 for(const t of tiles){
  const c=document.createElement('canvas');c.width=t.image.naturalWidth;c.height=t.image.naturalHeight;const g=c.getContext('2d'),vertical=c.height/MAP.height,src=[0,t.roadTop/t.referenceHeight*t.image.naturalHeight,t.roadBottom/t.referenceHeight*t.image.naturalHeight,t.image.naturalHeight],dst=[0,420,520,MAP.height];
  for(let band=0;band<3;band++)g.drawImage(t.image,0,src[band],c.width,src[band+1]-src[band],0,dst[band]*vertical,c.width,(dst[band+1]-dst[band])*vertical);
  if(t.fade){
   const candidate=document.createElement('canvas');candidate.width=MAP.width;candidate.height=MAP.height;const q=candidate.getContext('2d',{willReadFrequently:true});q.drawImage(c,t.left,0,t.right-t.left,MAP.height);
   const left=Math.round(t.visibleLeft),w=Math.round(t.fade),a=previous.getImageData(left,0,w,MAP.height).data,b=q.getImageData(left,0,w,MAP.height).data,seam=findSeam(a,b,w,MAP.height);
   const mask=document.createElement('canvas');mask.width=c.width;mask.height=c.height;const m=mask.getContext('2d');m.beginPath();for(let y=0;y<MAP.height;y++){const x=(left+seam[y]-t.left)/(t.right-t.left)*c.width;if(y)m.lineTo(x,y*vertical);else m.moveTo(x,0);}m.lineTo(c.width,c.height);m.lineTo(c.width,0);m.closePath();m.fillStyle='#000';m.fill();
   g.globalCompositeOperation='destination-in';g.drawImage(mask,0,0);g.globalCompositeOperation='source-over';
  }
  t.render=c;previous.drawImage(c,t.left,0,t.right-t.left,MAP.height);
 }
}
function drawBackground(originX,originY,scale){
 ctx.drawImage(background,originX,originY,MAP.width*scale,MAP.height*scale);
 for(const t of tiles){const x=originX+t.left*scale,w=(t.right-t.left)*scale;if(x>width||x+w<0)continue;ctx.drawImage(t.render,x,originY,w,MAP.height*scale);}
}
function draw(){
 ctx.clearRect(0,0,width,height);if(!ready)return;
 const scale=scaleFor(width,height),originX=width/2-state.cameraX*scale,originY=height*.7-state.cameraY*scale;
 drawBackground(originX,originY,scale);
 ctx.save();ctx.translate(originX,originY);ctx.scale(scale,scale);drawForestSign(ctx);ctx.restore();
 const x=width/2+(state.x-state.cameraX)*scale,y=height*.7+(state.y-state.cameraY)*scale;
 const bodyHeight=characterHeight(width,height),bodyWidth=bodyHeight*bearBounds.width/bearBounds.height;
 const bounce=state.moving?Math.sin(phase*2)*1.6:0,lean=state.moving?Math.sin(phase)*.012:0;
 ctx.fillStyle='#7250303b';ctx.beginPath();ctx.ellipse(x,y-1,bodyWidth*.32,bodyHeight*.045,0,0,Math.PI*2);ctx.fill();ctx.save();ctx.translate(x,y+bounce);ctx.rotate(lean);ctx.drawImage(bear,bearBounds.x,bearBounds.y,bearBounds.width,bearBounds.height,-bodyWidth/2,-bodyHeight,bodyWidth,bodyHeight);ctx.restore();
 const name=exitAt(state)?.name??areaAt(state.x);if(name!==lastPlace){place.textContent=name;lastPlace=name;}
 const seconds=Math.floor(state.walkingTime),text=`歩いた時間 ${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;if(text!==lastClock){clock.textContent=text;lastClock=text;}
 document.querySelector('#notice').classList.toggle('visible',performance.now()<noticeUntil);canvas.dataset.ready='true';
}
function frame(now){const dt=Math.min((now-last)/1000||0,.05);last=now;if(ready){const before={x:state.x,y:state.y};state=advance(state,inputVector(),dt,width,height);if(state.moving){phase+=Math.hypot(state.x-before.x,state.y-before.y)/MAP.speed*8;document.querySelector('#hint').classList.add('faded');}const exit=exitAt(state);if(exit&&exit.name!==lastExit)notify(`${exit.name}の先は準備中です`);lastExit=exit?.name??'';draw();}requestAnimationFrame(frame);}
window.addEventListener('keydown',e=>{if(e.target.matches('button,input'))return;const key=e.key.toLowerCase();if(['arrowleft','arrowright','arrowup','arrowdown','a','d','w','s'].includes(key)){e.preventDefault();keys.add(key);}});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
function updateSwipe(dx,dy){const norm=Math.hypot(dx,dy),ratio=norm>38?38/norm:1,x=dx*ratio,y=dy*ratio;joystick=norm<6?{x:0,y:0}:{x:x/38,y:y/38};knob.style.transform=`translate(${x}px,${y}px)`;}
canvas.addEventListener('pointerdown',e=>{if(pointer||!ready)return;canvas.focus();const rect=canvas.getBoundingClientRect(),localX=e.clientX-rect.left,localY=e.clientY-rect.top;pointer={id:e.pointerId,x:e.clientX,y:e.clientY,localX,localY,canSwipe:localY>=height*.5,swiping:false};state.target=null;state.path=[];canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(!pointer||pointer.id!==e.pointerId||!pointer.canSwipe)return;const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;if(Math.hypot(dx,dy)>8)pointer.swiping=true;if(pointer.swiping){joyPointer=e.pointerId;stick.style.left=`${Math.max(62,Math.min(width-62,pointer.localX))}px`;stick.style.top=`${Math.max(62,Math.min(height-62,pointer.localY))}px`;stick.classList.add('active');updateSwipe(dx,dy);}});
canvas.addEventListener('pointerup',e=>{if(!pointer||pointer.id!==e.pointerId)return;const p=pointer;pointer=null;if(p.swiping){releaseStick();return;}if(Math.hypot(e.clientX-p.x,e.clientY-p.y)>12)return;const rect=canvas.getBoundingClientRect(),point=screenToWorld(e.clientX-rect.left,e.clientY-rect.top,state,width,height),path=findPath(state,point);state.path=path;state.target=state.path.shift()??null;if(!state.target)notify('歩ける道の上を選んでください');});
for(const event of ['pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{if(pointer?.id===e.pointerId){pointer=null;releaseStick();}});
document.querySelector('#reset').addEventListener('click',reset);
setupMusic(document.querySelector('#bgm'),document.querySelector('#music'),notify,()=>canvas.focus());
Promise.all([load(background,'./assets/background.png'),load(bear,'./assets/bear-front.png'),...tiles.map(t=>load(t.image,`./assets/tile-${t.id}-soft.png`))]).then(()=>{window.__islandBoot?.progress('マップを準備しています…');bearBounds=alphaBounds(bear);prepareTiles();ready=true;if(window.__islandBoot)window.__islandBoot.ready();else loading.hidden=true;canvas.focus();}).catch(e=>{if(window.__islandBoot)window.__islandBoot.fail(e.message);else loading.textContent=e.message;});
requestAnimationFrame(frame);
