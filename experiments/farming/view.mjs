import {setupMusic} from '../../music.mjs';
import {createFarm,act,advanceFarm,refillWater} from './farm.mjs';
import {WORLD,SPAWN,plotRect,plantingPoint,cropPlacement,canWalk,nearestPlot,nextAction,route,cameraView,SOURCE_SCALE,actionPosition,WATER_SOURCE,nearWater,returningToVillage} from './scene.mjs';
import {createEffects,harvestPose,HARVEST_MS} from './effects.mjs';
import {ownedItems} from './items.mjs';
import {readSave,writeSave,SAVE_KEY} from './storage.mjs';
const $=s=>document.querySelector(s),canvas=$('#farm'),ctx=canvas.getContext('2d'),message=$('#message'),action=$('#action'),summary=$('#harvest-summary'),preview=$('#colorful-preview'),overlay=$('#inventory-overlay');
let storage=null;try{storage=window.localStorage;}catch{}
const saved=storage?readSave(storage):{farm:createFarm(),canSave:false,error:'このブラウザでは保存できません。'};
let farm=saved.farm,canSave=saved.canSave,player={...SPAWN},path=[],ready=false,images,camera=null,last=0,walking=false,gesture=null,harvest=null,boxOpen=false,heldCan=farm.water===0,pouringUntil=0,transitioning=false,lastClock=0;
let bearBounds;const sprites=[],keys=new Set(),effects=createEffects(()=>$('#sfx-enabled').checked),stick=$('#stick'),knob=$('#knob');
function status(text){message.textContent=text;}
function persist(){if(canSave&&storage&&!writeSave(storage,farm)){canSave=false;status('保存できませんでした。空き容量やブラウザの設定を確認してください。');}}
function releaseStick(){gesture=null;stick.classList.remove('active');knob.style.transform='translate(0px,0px)';}
function halt(){keys.clear();releaseStick();path=[];walking=false;}
function viewport(){document.documentElement.style.setProperty('--game-height',`${window.visualViewport?.height||window.innerHeight}px`);camera=null;render();if(ready)updateAction();}
window.visualViewport?.addEventListener('resize',viewport);window.addEventListener('resize',viewport);
setupMusic($('#bgm'),$('#music'),status,()=>canvas.focus());
function workTarget(){if(farm.water<3&&nearWater(player))return {type:'well',tool:'refill',label:'水をくむ'};const i=nearestPlot(player);return i===null?null:{type:'plot',index:i,...nextAction(farm.cells[i])};}
function positionAction(){const v=camera||cameraView(player,canvas.clientWidth,canvas.clientHeight),p=actionPosition(player,v,canvas.clientWidth,canvas.clientHeight,action.offsetWidth||150,action.offsetHeight||54);$('.action-row').style.left=`${p.x}px`;$('.action-row').style.top=`${p.y}px`;}
function updateAction(){
 const t=workTarget();action.hidden=!ready||boxOpen||(!harvest&&!t);action.disabled=!!harvest||!!t?.waiting;
 if(harvest){action.textContent='収穫中…';action.setAttribute('aria-label','収穫中');positionAction();}
 else if(t){action.textContent=t.label;action.setAttribute('aria-label',t.type==='well'?t.label:`${t.label}（畑${t.index+1}${t.waiting?'・'+['種','芽','育ち中','収穫可'][farm.cells[t.index].plant.stage]:''}）`);positionAction();}
 summary.textContent=`収穫 ${farm.harvests}こ`;$('#water-meter').textContent=`水 ${farm.water}/3`;
 const guide=$('#water-guide');guide.hidden=farm.water>0||boxOpen;
 if(!guide.hidden){const a=Math.atan2(WATER_SOURCE.y-player.y,WATER_SOURCE.x-player.x);$('#water-arrow').style.transform=`rotate(${a}rad)`;}
}
action.addEventListener('click',()=>{
 if(!ready||harvest||boxOpen)return;farm=advanceFarm(farm);const t=workTarget();if(!t||t.waiting)return;halt();
 if(t.type==='well'){const result=refillWater(farm);farm=result.farm;heldCan=true;effects.play('water');status(result.message);persist();updateAction();render();return;}
 const result=act(farm,t.index,{tool:t.tool,colorfulPreview:preview.checked});
 if(result.harvested){heldCan=false;const h=cameraView(player,canvas.clientWidth,canvas.clientHeight).characterPixels/camera.scale;harvest={index:t.index,result,start:performance.now(),from:plantingPoint(t.index),to:{x:player.x,y:player.y-h*.55}};effects.play('harvest');status('すぽんっ！');updateAction();render();return;}
 farm=result.farm;if(result.changed){if(t.tool==='seed')preview.checked=false;if(['hoe','seed','water'].includes(t.tool))effects.play(t.tool);heldCan=t.tool==='water';if(heldCan)pouringUntil=performance.now()+750;persist();}else if(t.tool==='water'&&farm.water===0)heldCan=true;
 status(result.message);updateAction();render();
});
$('#reset').addEventListener('click',()=>{if(confirm('畑・持ち物・水の残量を最初に戻しますか？')){harvest=null;halt();farm=createFarm();player={...SPAWN};heldCan=false;camera=null;preview.checked=false;canSave=!!storage;persist();status('小さな畑を、また少しずつ広げよう');updateAction();render();}});
function renderInventory(){const list=$('#inventory-list');list.replaceChildren();for(const item of ownedItems(farm.inventory)){const card=document.createElement('div');card.className='item-card';const icon=document.createElement('div');icon.className='item-icon';if(item.crop==='carrot'){const img=document.createElement('img');img.src=item.colorful?'assets/carrot-colorful-v2.png':'assets/carrot-ripe-v2.png';img.alt='';icon.append(img);}else if(item.id==='hoe'||item.id==='watering_can'){const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 64 64');svg.setAttribute('aria-hidden','true');if(item.id==='hoe'){svg.innerHTML='<path d="M19 54L45 10" stroke="#a77e46" stroke-width="7" stroke-linecap="round"/><path d="M29 17L49 29L56 21L36 9Z" fill="#a3aaa0" stroke="#747c70" stroke-width="2"/>';}else{svg.innerHTML='<path d="M18 25C1 8 48 2 42 27" fill="none" stroke="#9aa977" stroke-width="5"/><path d="M15 23H42L46 53H11Z" fill="#c2cea1" stroke="#8b9b69" stroke-width="2"/><path d="M41 32L55 22L59 27L44 44" fill="#c2cea1" stroke="#8b9b69" stroke-width="2"/><path d="M52 20L62 26" stroke="#8b9b69" stroke-width="4" stroke-linecap="round"/><ellipse cx="28" cy="38" rx="10" ry="7" fill="#a97a56"/><circle cx="24" cy="36" r="2.5" fill="#eea7ba"/><circle cx="31" cy="35" r="2.5" fill="#ede1a5"/><circle cx="26" cy="41" r="2.5" fill="#abd8df"/><circle cx="34" cy="40" r="2.5" fill="#c3d49b"/>'; }icon.append(svg);}else icon.textContent=item.icon||'✧';const name=document.createElement('span');name.textContent=item.name;const quantity=document.createElement('strong');quantity.textContent=item.quantity===null?'∞':`×${item.quantity}`;card.append(icon,name,quantity);list.append(card);}$('#inventory-water').textContent=`じょうろの水：${farm.water}/3`;}
function openBox(){halt();boxOpen=true;renderInventory();overlay.hidden=false;updateAction();$('#box-close').focus();}
function closeBox(){boxOpen=false;overlay.hidden=true;updateAction();canvas.focus();}
$('#bag').addEventListener('click',openBox);$('#box-close').addEventListener('click',closeBox);overlay.addEventListener('click',e=>{if(e.target===overlay)closeBox();});
function imageLoad(url){return new Promise((resolve,reject)=>{const im=new Image(),timeout=setTimeout(()=>reject(new Error('画像の読み込みが遅れています')),45000);im.onload=()=>{clearTimeout(timeout);resolve(im)};im.onerror=()=>{clearTimeout(timeout);reject(new Error('画像を読み込めませんでした'))};im.src=url;});}
function bounds(image){const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const g=c.getContext('2d');g.drawImage(image,0,0);const pixels=g.getImageData(0,0,c.width,c.height).data;let x=c.width,y=c.height,right=0,bottom=0;for(let yy=0;yy<c.height;yy++)for(let xx=0;xx<c.width;xx++)if(pixels[(yy*c.width+xx)*4+3]>32){x=Math.min(x,xx);y=Math.min(y,yy);right=Math.max(right,xx);bottom=Math.max(bottom,yy);}let weight=0,total=0;for(let yy=Math.max(y,bottom-8);yy<=bottom;yy++)for(let xx=x;xx<=right;xx++)if(pixels[(yy*c.width+xx)*4+3]>120){weight++;total+=xx;}return {x,y,w:right-x+1,h:bottom-y+1,rootX:weight?total/weight:(x+right)/2};}
function prepareSprites(){
 bearBounds=bounds(images.bear);
 for(let stage=1;stage<=2;stage++){const s=cropPlacement(0,stage),layer=document.createElement('canvas');layer.width=s.w;layer.height=s.h;layer.getContext('2d').drawImage(images.atlas,s.x,s.y,s.w,s.h,0,0,s.w,s.h);sprites.push({stage,colorful:false,layer});}
 for(const colorful of [false,true]){const image=colorful?images.colorful:images.ripe,b=bounds(image),layer=document.createElement('canvas');layer.width=b.w;layer.height=b.h;layer.getContext('2d').drawImage(image,b.x,b.y,b.w,b.h,0,0,b.w,b.h);sprites.push({stage:3,colorful,layer,bounds:b});}
}
function plantSprite(p,i){const s=sprites.find(s=>s.stage===p.stage&&s.colorful===(p.colorful&&p.stage===3));if(p.stage<3)return {s,placement:cropPlacement(i,p.stage)};const ground=plantingPoint(i),scale=174/s.bounds.h;return {s,placement:{dx:ground.x-(s.bounds.rootX-s.bounds.x)*scale,dy:ground.y-174,dw:s.bounds.w*scale,dh:174}};}
function drawBear(){const h=cameraView(player,canvas.clientWidth,canvas.clientHeight).characterPixels/camera.scale,w=h*bearBounds.w/bearBounds.h,bounce=walking?Math.sin(last*.013)*3:0;ctx.fillStyle='#72503030';ctx.beginPath();ctx.ellipse(player.x,player.y,w*.3,6,0,0,Math.PI*2);ctx.fill();const image=heldCan?(farm.water>0||performance.now()<pouringUntil?images.canFull:images.canEmpty):images.bear;ctx.drawImage(image,bearBounds.x/images.bear.width*image.width,bearBounds.y/images.bear.height*image.height,bearBounds.w/images.bear.width*image.width,bearBounds.h/images.bear.height*image.height,player.x-w/2,player.y-h+bounce,w,h);}
function sparkles(i,time){const p=plantingPoint(i);for(let n=0;n<6;n++){const phase=(time/1900+n*.163+i*.071)%1,x=p.x+Math.sin(n*4.1+i)*63,y=p.y-45-phase*123,r=2+Math.sin(phase*Math.PI)*2;ctx.save();ctx.translate(x,y);ctx.globalAlpha=Math.sin(phase*Math.PI)*.75;ctx.fillStyle=['#fff8cc','#f7d7eb','#d8f4ea'][n%3];ctx.beginPath();ctx.moveTo(0,-r*1.6);ctx.lineTo(r*.45,-r*.35);ctx.lineTo(r*1.4,0);ctx.lineTo(r*.4,r*.3);ctx.lineTo(0,r*1.6);ctx.lineTo(-r*.4,r*.3);ctx.lineTo(-r*1.4,0);ctx.lineTo(-r*.4,-r*.3);ctx.closePath();ctx.fill();ctx.restore();}}
function render(){
 if(!ready)return;const dpr=Math.min(window.devicePixelRatio||1,2),w=Math.round(canvas.clientWidth*dpr),h=Math.round(canvas.clientHeight*dpr);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}if(!camera)camera=cameraView(player,canvas.clientWidth,canvas.clientHeight);ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,w,h);ctx.setTransform(dpr*camera.scale,0,0,dpr*camera.scale,-camera.x*camera.scale*dpr,-camera.y*camera.scale*dpr);ctx.drawImage(images.background,0,0,WORLD.width,WORLD.height);
 const layers=[],selected=workTarget();
 for(let i=0;i<farm.cells.length;i++){const cell=farm.cells[i],r=plotRect(i),p=cell.plant;ctx.drawImage(cell.tilled?(p?.watered?images.wet:images.dry):images.grass,64,256,1152,800,r.x-7,r.y-4,r.w+14,r.h+8);
  if(selected?.index===i){ctx.strokeStyle='#fff8d5bb';ctx.lineWidth=2;ctx.setLineDash([6,7]);ctx.strokeRect(r.x+5,r.y+4,r.w-10,r.h-8);ctx.setLineDash([]);}
  if(!p)continue;const ground=plantingPoint(i);if(p.stage===0){ctx.fillStyle='#74532d';for(let n=0;n<3;n++){ctx.beginPath();ctx.ellipse(ground.x+(n-1)*18,ground.y,4,2.5,-.3,0,Math.PI*2);ctx.fill();}}
  else if(!harvest||harvest.index!==i)layers.push({depth:ground.y,draw:()=>{const {s,placement:q}=plantSprite(p,i);ctx.drawImage(s.layer,q.dx,q.dy,q.dw,q.dh);}});
 }
 layers.push({depth:player.y,draw:drawBear});layers.sort((a,b)=>a.depth-b.depth);layers.forEach(l=>l.draw());
 farm.cells.forEach((c,i)=>{if(c.plant?.stage===3&&c.plant.colorful&&harvest?.index!==i)sparkles(i,performance.now());});
 if(harvest){const pose=harvestPose(harvest.from,harvest.to,performance.now()-harvest.start),p=farm.cells[harvest.index].plant,{s,placement:q}=plantSprite(p,harvest.index);ctx.save();ctx.translate(pose.x,pose.y);ctx.rotate(pose.tilt);ctx.scale(pose.scale,pose.scale);ctx.globalAlpha=pose.alpha;ctx.drawImage(s.layer,q.dx-harvest.from.x,q.dy-harvest.from.y,q.dw,q.dh);ctx.restore();}
}
function move(dx,dy,dt){const length=Math.hypot(dx,dy);if(!length)return false;const step=75/SOURCE_SCALE*dt*Math.min(1,length),x=dx/length*step,y=dy/length*step;let changed=false;if(canWalk({x:player.x+x,y:player.y})){player.x+=x;changed=true;}if(canWalk({x:player.x,y:player.y+y})){player.y+=y;changed=true;}return changed;}
function returnVillage(){if(transitioning)return;transitioning=true;persist();halt();location.assign(new URL('../../?from=farm&v=5',location.href).href);}
function tick(time){
 if(transitioning)return;const dt=Math.min(.04,(time-last)/1000||0);last=time;
 if(time-lastClock>=200){lastClock=time;const next=advanceFarm(farm);if(next!==farm){farm=next;persist();render();}updateAction();}
 if(harvest){walking=false;if(time-harvest.start>=HARVEST_MS){farm=harvest.result.farm;const text=harvest.result.message;harvest=null;persist();status(text);updateAction();if(boxOpen)renderInventory();}render();requestAnimationFrame(tick);return;}
 let dx=0,dy=0;for(const key of keys){if(['ArrowLeft','a'].includes(key))dx--;if(['ArrowRight','d'].includes(key))dx++;if(['ArrowUp','w'].includes(key))dy--;if(['ArrowDown','s'].includes(key))dy++;}if(gesture?.drag){dx=gesture.dx;dy=gesture.dy;}let moved=false;if(!boxOpen){if(dx||dy){path=[];moved=move(dx,dy,dt);}else if(path.length){const target=path[0],d=Math.hypot(target.x-player.x,target.y-player.y);if(d<5)path.shift();else moved=move((target.x-player.x)/Math.max(d,75/SOURCE_SCALE*dt),(target.y-player.y)/Math.max(d,75/SOURCE_SCALE*dt),dt);}}
 const wasWalking=walking;walking=moved;const desired=cameraView(player,canvas.clientWidth,canvas.clientHeight);if(!camera)camera=desired;const factor=1-Math.exp(-10*dt),following=Math.hypot(desired.x-camera.x,desired.y-camera.y)>.02;camera={...desired,x:camera.x+(desired.x-camera.x)*factor,y:camera.y+(desired.y-camera.y)*factor};
 if(moved||wasWalking!==walking||following||time<pouringUntil||farm.cells.some(c=>c.plant?.stage===3&&c.plant.colorful)){updateAction();render();}
 if(returningToVillage(player))returnVillage();else requestAnimationFrame(tick);
}
function worldPoint(e){const b=canvas.getBoundingClientRect();return {x:camera.x+(e.clientX-b.left)/camera.scale,y:camera.y+(e.clientY-b.top)/camera.scale};}
canvas.addEventListener('pointerdown',e=>{if(!ready||harvest||gesture||boxOpen)return;canvas.focus();canvas.setPointerCapture(e.pointerId);const b=canvas.getBoundingClientRect();gesture={id:e.pointerId,x:e.clientX,y:e.clientY,localX:e.clientX-b.left,localY:e.clientY-b.top,canSwipe:e.clientY-b.top>=b.height*.5,drag:false,dx:0,dy:0};path=[];});
canvas.addEventListener('pointermove',e=>{if(!gesture||gesture.id!==e.pointerId||!gesture.canSwipe)return;const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y,norm=Math.hypot(dx,dy);if(norm>8){gesture.drag=true;const ratio=norm>38?38/norm:1;gesture.dx=dx*ratio/38;gesture.dy=dy*ratio/38;stick.style.left=`${Math.max(62,Math.min(canvas.clientWidth-62,gesture.localX))}px`;stick.style.top=`${Math.max(62,Math.min(canvas.clientHeight-62,gesture.localY))}px`;stick.classList.add('active');knob.style.transform=`translate(${dx*ratio}px,${dy*ratio}px)`;path=[];}});
canvas.addEventListener('pointerup',e=>{if(!gesture||gesture.id!==e.pointerId)return;const tap=!gesture.drag;releaseStick();if(tap){path=route(player,worldPoint(e));if(!path.length)status('畑の中には入れないよ。周りの通路を歩こう');}});
for(const event of ['pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{if(gesture?.id===e.pointerId)releaseStick();});
window.addEventListener('keydown',e=>{if(boxOpen){if(e.key==='Escape'){e.preventDefault();closeBox();}if(e.key==='Tab'){e.preventDefault();$('#box-close').focus();}return;}if(['INPUT','TEXTAREA','SELECT','SUMMARY'].includes(document.activeElement?.tagName))return;const key=e.key.length===1?e.key.toLowerCase():e.key;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'].includes(key)){e.preventDefault();keys.add(key);}});
window.addEventListener('keyup',e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key));window.addEventListener('blur',halt);document.addEventListener('visibilitychange',()=>{halt();persist();});window.addEventListener('pagehide',persist);
window.addEventListener('storage',e=>{if(e.key!==SAVE_KEY||!storage)return;const update=readSave(storage);if(!update.canSave){canSave=false;status(update.error);return;}halt();harvest=null;farm=update.farm;canSave=true;heldCan=farm.water===0;status('ほかの画面の畑の変更を反映しました');updateAction();if(boxOpen)renderInventory();render();});
viewport();
const urls={background:'assets/meadow.png',atlas:'assets/crops.png',dry:'assets/soil-dry-v2.png',wet:'assets/soil-wet-v2.png',grass:'assets/soil-grass-v2.png',bear:'../../assets/bear-front.png',ripe:'assets/carrot-ripe-v2.png',colorful:'assets/carrot-colorful-v2.png',canFull:'assets/bear-watering-full-v2.png',canEmpty:'assets/bear-watering-empty-v2.png'};
let loadedImages=0;
Promise.all(Object.entries(urls).map(async([key,url])=>{const image=await imageLoad(url);loadedImages++;window.__islandBoot?.progress(`画像を読み込んでいます… ${loadedImages}/${Object.keys(urls).length}`,loadedImages,Object.keys(urls).length);return [key,image];})).then(entries=>{images=Object.fromEntries(entries);prepareSprites();ready=true;updateAction();render();window.__islandBoot?.ready();$('#loading').hidden=true;if(saved.error)status(saved.error);requestAnimationFrame(tick);}).catch(e=>{window.__islandBoot?.fail(e.message);});
