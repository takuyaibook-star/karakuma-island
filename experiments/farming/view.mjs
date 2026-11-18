import {MAP} from '../../model.mjs?v=16';
import {confirmNearbyAction} from '../../nearby-action.mjs?v=12';
import {FARM_PROPS,GROUND_PATCHES,propAssetsForView,depthLayers} from './props.mjs?v=10';
import {BACKGROUND_TILES,visibleBackground} from './background.mjs?v=7';
if(window.parent===window)location.replace(new URL('../../?map=farm&v=7',location.href).href);
import {setupMusic} from '../../music.mjs?v=7';
import {createFarm,act,advanceFarm,refillWater,equip,trialTools,tutorial,soilIsWet,WATER_CAPACITY} from './farm.mjs?v=16';
import {WORLD,SPAWN,plotRect,plantingPoint,cropPlacement,canWalk,nearestPlot,nextAction,cameraView,SOURCE_SCALE,plotLabelPosition,actionPosition,WATER_SOURCE,nearWater,returningToVillage,routeToWork,PLOT_REACH} from './scene.mjs?v=16';
import {createEffects,harvestPose,HARVEST_MS} from './effects.mjs';
import {ownedItems} from './items.mjs?v=7';
import {readSave,writeSave,SAVE_KEY} from './storage.mjs?v=16';
const $=s=>document.querySelector(s),canvas=$('#farm'),message=$('#message'),action=$('#action'),summary=$('#harvest-summary'),preview=$('#colorful-preview'),overlay=$('#inventory-overlay');
const baseCtx=canvas.getContext('2d');let ctx=baseCtx;const fxCanvas=document.createElement('canvas');fxCanvas.id='plot-fx';fxCanvas.setAttribute('aria-hidden','true');$('.scene').append(fxCanvas);const fxCtx=fxCanvas.getContext('2d');
let storage=null;try{storage=window.localStorage;}catch{}
const saved=storage?readSave(storage):{farm:createFarm(),canSave:false,error:'このブラウザでは保存できません。'};
let farm=saved.farm,canSave=saved.canSave,player={...SPAWN},path=[],pendingWork=null,ready=false,images,camera=null,last=0,walking=false,gesture=null,harvest=null,boxOpen=false,tilling=null,watering=null,pouringUntil=0,transitioning=false,lastClock=0;
let bearBounds,equipmentRequest=0;const characterBounds=new Map();const sprites=[],keys=new Set(),effects=createEffects(()=>$('#sfx-enabled').checked),stick=$('#stick'),knob=$('#knob');
function status(text){message.textContent=text;}
function persist(){if(canSave&&storage&&!writeSave(storage,farm)){canSave=false;status('保存できませんでした。空き容量やブラウザの設定を確認してください。');}}
function releaseStick(){gesture=null;stick.classList.remove('active');knob.style.transform='translate(0px,0px)';}
function cancelWorkRoute(){path=[];pendingWork=null;}
function halt(){keys.clear();releaseStick();cancelWorkRoute();walking=false;}
function viewport(){document.documentElement.style.setProperty('--game-height',`${window.visualViewport?.height||window.innerHeight}px`);camera=null;render();if(ready)updateAction();}
window.visualViewport?.addEventListener('resize',viewport);window.addEventListener('resize',viewport);
setupMusic($('#bgm'),$('#music'),status,()=>canvas.focus());
function workTarget(){if(farm.water<WATER_CAPACITY&&nearWater(player))return {type:'well',tool:'refill',label:'水をくむ'};const i=nearestPlot(player);return i===null?null:{type:'plot',index:i,...nextAction(farm.cells[i])};}
const plotLabels=document.createElement('div');plotLabels.id='plot-labels';$('.controls').append(plotLabels);const plotTags=farm.cells.map((_,i)=>{const tag=document.createElement('span');tag.className='plot-tag';tag.dataset.plot=String(i);plotLabels.append(tag);return tag;});
function positionAction(){
 const view=camera||cameraView(player,canvas.clientWidth,canvas.clientHeight);
 const position=actionPosition(player,view,canvas.clientWidth,canvas.clientHeight,action.offsetWidth||108,action.offsetHeight||44);
 const row=action.parentElement;
 row.style.left=`${position.x}px`;
 row.style.top=`${position.y}px`;
}
function updatePlotLabels(){
 if(!ready)return;
 const view=camera||cameraView(player,canvas.clientWidth,canvas.clientHeight);
 const bear=bearPose(view);
 const bearLeft=(bear.x-view.x)*view.scale,bearTop=(bear.y-view.y)*view.scale;
 const bearRight=bearLeft+bear.w*view.scale,bearBottom=bearTop+bear.h*view.scale;
 farm.cells.forEach((cell,index)=>{
  const tag=plotTags[index],task=nextAction(cell);
  tag.hidden=boxOpen||!task.waiting;
  if(tag.hidden)return;
  tag.textContent=task.label;
  const position=plotLabelPosition(index,{stage:3},view,canvas.clientWidth,canvas.clientHeight,tag.offsetWidth,tag.offsetHeight);
  tag.hidden=!position.visible;
  if(tag.hidden)return;
  tag.style.left=`${position.x}px`;
  tag.style.top=`${position.y}px`;
  const halfWidth=tag.offsetWidth/2;
  const overlap=position.x+halfWidth>bearLeft&&position.x-halfWidth<bearRight&&position.y+tag.offsetHeight>bearTop&&position.y<bearBottom;
  tag.classList.toggle('is-covered',overlap);
 });
}
function updateAction(){
 const t=workTarget();action.hidden=!ready||boxOpen||(!harvest&&(!t||t.waiting));action.disabled=!!harvest||!!tilling||!!watering||!!t?.waiting;
 if(harvest){action.textContent='収穫中…';action.setAttribute('aria-label','収穫中');positionAction();}
 else if(t&&!t.waiting){action.textContent=t.label;action.setAttribute('aria-label',t.type==='well'?t.label:`${t.label}（畑${t.index+1}）`);positionAction();}
 updatePlotLabels();$('#tutorial').textContent=tutorial(farm);renderShortcuts();summary.textContent=`収穫 ${farm.harvests}こ`;$('#water-meter').textContent=`水 ${farm.water}/${WATER_CAPACITY}`;
 const guide=$('#water-guide');guide.hidden=farm.water>0||boxOpen;
 if(!guide.hidden){const a=Math.atan2(WATER_SOURCE.y-player.y,WATER_SOURCE.x-player.x);$('#water-arrow').style.transform=`rotate(${a}rad)`;}
}
function performWork(target=null){
 if(!ready||harvest||tilling||watering||boxOpen)return;farm=advanceFarm(farm);const t=target?.type==='plot'?{...target,...nextAction(farm.cells[target.index])}:target?.type==='well'?(nearWater(player)&&farm.water<WATER_CAPACITY?{type:'well',tool:'refill'}:null):workTarget();if(!t||t.waiting)return;if(t.type==='plot'){const point=plantingPoint(t.index);if(Math.hypot(point.x-player.x,point.y-player.y)>PLOT_REACH){status('畑のそばまで歩いてから作業しよう');return;}}halt();
 if(t.type==='well'){const result=refillWater(farm);farm=result.farm;if(result.changed)holdWateringCan();effects.play('water');status(result.message);persist();updateAction();render();return;}
 const result=act(farm,t.index,{tool:t.tool,colorfulPreview:preview.checked});
 if(result.harvested){const h=cameraView(player,canvas.clientWidth,canvas.clientHeight).characterPixels/camera.scale;harvest={index:t.index,result,start:performance.now(),from:plantingPoint(t.index),to:{x:player.x,y:player.y-h*.55}};effects.play('harvest');status('すぽんっ！');updateAction();render();return;}
 farm=result.farm;if(result.changed){if(t.tool==='seed')preview.checked=false;if(['hoe','clear','seed','water'].includes(t.tool))effects.play(t.tool==='clear'?'hoe':t.tool);if(t.tool==='water'){watering={index:t.index,start:performance.now()};pouringUntil=watering.start+750;holdWateringCan();}if(t.tool==='hoe'||t.tool==='clear')tilling={index:t.index,start:performance.now(),super:t.tool==='clear'};persist();}
 status(result.message);updateAction();render();
}
action.addEventListener('click',()=>performWork());
$('#reset').addEventListener('click',()=>{if(confirm('畑・持ち物・水の残量を最初に戻しますか？')){harvest=null;halt();farm=createFarm();player={...SPAWN};tilling=null;watering=null;camera=null;preview.checked=false;canSave=!!storage;persist();status('小さな畑を、また少しずつ広げよう');updateAction();render();}});
function renderInventory(){const list=$('#inventory-list');list.replaceChildren();for(const item of ownedItems(farm.inventory)){const card=document.createElement('div');card.className='item-card';const icon=document.createElement('div');icon.className='item-icon';if(item.id==='carrot_withered'){const img=document.createElement('img');img.src='assets/carrot-withered-v1.png';img.alt='仮デザイン';icon.append(img);}else if(item.crop==='carrot'){const img=document.createElement('img');img.src=item.colorful?'assets/carrot-colorful-v2.png':'assets/carrot-ripe-v2.png';img.alt='';icon.append(img);}else if(item.kind==='tool'){const img=document.createElement('img');img.src={hoe:'assets/item-hoe-v1.png',watering_can:'assets/item-watering-can-v2.png',super_hoe:'assets/item-super-hoe-v1.png'}[item.id];img.alt='';icon.append(img);}else icon.textContent=item.icon||'✧';const name=document.createElement('span');name.textContent=item.name;const quantity=document.createElement('strong');quantity.textContent=item.quantity===null?'∞':`×${item.quantity}`;card.append(icon,name,quantity);if(item.kind==='tool'){const toggle=document.createElement('button');toggle.textContent=farm.equipped===item.id?'しまう':'持つ';toggle.setAttribute('aria-pressed',String(farm.equipped===item.id));toggle.addEventListener('click',()=>{chooseTool(item.id);renderInventory();});card.append(toggle);}list.append(card);}$('#inventory-water').textContent=`水 ${farm.water}/${WATER_CAPACITY}・クワ あと${farm.hoeUses}回`;}
function openBox(){halt();boxOpen=true;renderInventory();overlay.hidden=false;updateAction();$('#box-close').focus();}
function closeBox(){boxOpen=false;overlay.hidden=true;updateAction();canvas.focus();}
$('#bag').addEventListener('click',openBox);$('#box-close').addEventListener('click',closeBox);overlay.addEventListener('click',e=>{if(e.target===overlay)closeBox();});
function imageLoad(url){return new Promise((resolve,reject)=>{const im=new Image(),timeout=setTimeout(()=>reject(new Error('画像の読み込みが遅れています')),45000);im.onload=()=>{clearTimeout(timeout);resolve(im)};im.onerror=()=>{clearTimeout(timeout);reject(new Error('画像を読み込めませんでした'))};im.src=url;});}
function bounds(image){const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const g=c.getContext('2d');g.drawImage(image,0,0);const pixels=g.getImageData(0,0,c.width,c.height).data;let x=c.width,y=c.height,right=0,bottom=0;for(let yy=0;yy<c.height;yy++)for(let xx=0;xx<c.width;xx++)if(pixels[(yy*c.width+xx)*4+3]>32){x=Math.min(x,xx);y=Math.min(y,yy);right=Math.max(right,xx);bottom=Math.max(bottom,yy);}let weight=0,total=0;for(let yy=Math.max(y,bottom-8);yy<=bottom;yy++)for(let xx=x;xx<=right;xx++)if(pixels[(yy*c.width+xx)*4+3]>120){weight++;total+=xx;}return {x,y,w:right-x+1,h:bottom-y+1,rootX:weight?total/weight:(x+right)/2};}
function prepareSprites(){
 sprites.length=0;bearBounds=bounds(images.bear);
 for(let stage=1;stage<=2;stage++){const s=cropPlacement(0,stage),layer=document.createElement('canvas');layer.width=s.w;layer.height=s.h;layer.getContext('2d').drawImage(images.atlas,s.x,s.y,s.w,s.h,0,0,s.w,s.h);sprites.push({stage,colorful:false,layer});}
 if(images.withered){const b=bounds(images.withered),layer=document.createElement('canvas');layer.width=b.w;layer.height=b.h;layer.getContext('2d').drawImage(images.withered,b.x,b.y,b.w,b.h,0,0,b.w,b.h);sprites.push({stage:3,withered:true,colorful:false,layer,bounds:b});}
 for(const colorful of [false,true]){const image=colorful?images.colorful:images.ripe;if(!image)continue;const b=bounds(image),layer=document.createElement('canvas');layer.width=b.w;layer.height=b.h;layer.getContext('2d').drawImage(image,b.x,b.y,b.w,b.h,0,0,b.w,b.h);sprites.push({stage:3,colorful,layer,bounds:b});}
}
function plantSprite(p,i,{pulled=false}={}){const s=sprites.find(s=>s.stage===p.stage&&!!s.withered===!!p.withered&&s.colorful===(p.colorful&&p.stage===3&&!p.withered))||sprites.find(s=>s.stage===2);if(p.stage<3||!s.bounds)return {s,placement:cropPlacement(i,p.stage)};const ground=plantingPoint(i),h=p.withered?132:174,scale=h/s.bounds.h;return {s,placement:{dx:ground.x-(s.bounds.rootX-s.bounds.x)*scale,dy:ground.y-h*(pulled?1:.62),dw:s.bounds.w*scale,dh:h}};}
function drawPlanted(p,i){const {s,placement:q}=plantSprite(p,i),ground=plantingPoint(i);ctx.save();ctx.beginPath();ctx.rect(q.dx-3,q.dy-3,q.dw+6,ground.y-q.dy+5);ctx.clip();ctx.drawImage(s.layer,q.dx,q.dy,q.dw,q.dh);ctx.restore();if(p.stage===3){ctx.fillStyle='#79553530';ctx.beginPath();ctx.ellipse(ground.x,ground.y+2,19,4,0,0,Math.PI*2);ctx.fill();}}
function holdWateringCan(){
 equipmentRequest++;
 if(farm.equipped!=='watering_can')farm=equip(farm,'watering_can');
 for(const key of ['canFull','canEmpty']){
  if(!images[key])lazyImage(key).then(image=>{images[key]=image;updateAction();render();}).catch(()=>{});
 }
}
function bearPose(view){
 const h=view.characterPixels/view.scale;const image=['hoe','super_hoe'].includes(farm.equipped)?images.hoe:farm.equipped==='watering_can'?(farm.water>0||performance.now()<pouringUntil?images.canFull:images.canEmpty):images.bear;const actual=image||images.bear;let b=characterBounds.get(actual);if(!b){b=bounds(actual);characterBounds.set(actual,b);}const w=h*b.w/b.h,bounce=walking?Math.sin(last*.013)*3:0;
 return {image:actual,source:b,x:player.x-w/2,y:player.y-h+bounce,w,h};
}
function drawBear(){
 const p=bearPose(camera),b=p.source;
 ctx.fillStyle='#72503030';ctx.beginPath();ctx.ellipse(player.x,player.y,p.w*.3,6,0,0,Math.PI*2);ctx.fill();
 ctx.drawImage(p.image,b.x,b.y,b.w,b.h,p.x,p.y,p.w,p.h);
}
// Floating action tools use the adopted item art. The equipped character remains unchanged.
function drawToolImage(image,x,y,w,h,angle){if(!image)return false;let b=characterBounds.get(image);if(!b){b=bounds(image);characterBounds.set(image,b);}ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.drawImage(image,b.x,b.y,b.w,b.h,-w/2,-h/2,w,h);ctx.restore();return true;}
function drawTilling(time){if(!tilling)return;const t=Math.min(1,(time-tilling.start)/750),p=plantingPoint(tilling.index),lift=Math.abs(Math.sin(t*Math.PI*3));
 if(drawToolImage(images[tilling.super?'toolSuper':'toolHoe'],p.x-33,p.y-30-lift*26,108,88,.65+Math.sin(t*Math.PI*4)*.48))return;
 // Retain the established lightweight fallback while an optional image is loading.
 ctx.save();ctx.translate(p.x,p.y-34-lift*24);ctx.rotate(-.8+Math.sin(t*Math.PI*4)*.55);ctx.lineCap='round';ctx.strokeStyle='#9e7445';ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(-39,0);ctx.lineTo(26,0);ctx.stroke();ctx.fillStyle='#9baba0';ctx.fillRect(23,-6,27,23);ctx.restore();
}
function drawWatering(time){if(!watering)return;const t=Math.min(1,(time-watering.start)/750),p=plantingPoint(watering.index),angle=.35+Math.sin(t*Math.PI)*.12;
 if(!drawToolImage(images.toolCan,p.x-47,p.y-74+Math.sin(t*Math.PI*2)*3,94,76,angle)){
  ctx.save();ctx.translate(p.x-47,p.y-74);ctx.rotate(angle);ctx.fillStyle='#b5c38f';ctx.strokeStyle='#829461';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(-9,0,25,20,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(-9,-20,18,15,0,Math.PI,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(12,-4);ctx.lineTo(39,-19);ctx.lineTo(44,-10);ctx.lineTo(15,12);ctx.closePath();ctx.fill();ctx.restore();
 }
 // Streams end on the selected plot, never at the character's feet.
 ctx.save();ctx.strokeStyle='#8ccddd';ctx.fillStyle='#b9e6ef';ctx.lineWidth=2.5;ctx.lineCap='round';
 for(let n=0;n<12;n++){const phase=(t*3+n/12)%1,x=p.x+7+(n%3-1)*5+phase*(n%3-1)*4,y=p.y-47+phase*46;ctx.globalAlpha=Math.sin(phase*Math.PI)*.9;ctx.beginPath();ctx.moveTo(x,y-4);ctx.lineTo(x-1,y+2);ctx.stroke();}
 ctx.globalAlpha=.4*Math.sin(t*Math.PI);ctx.beginPath();ctx.ellipse(p.x+6,p.y+1,14+Math.sin(t*Math.PI*4)*3,4,0,0,Math.PI*2);ctx.stroke();ctx.restore();
}
async function chooseTool(tool){if(harvest||tilling||watering)return;const request=++equipmentRequest;const key=tool==='hoe'||tool==='super_hoe'?'hoe':farm.water?'canFull':'canEmpty';const toolKey=tool==='super_hoe'?'toolSuper':tool==='hoe'?'toolHoe':'toolCan';if(!images[key]||!images[toolKey]){status('道具を準備しているよ…');try{await Promise.all([key,toolKey].map(async k=>{images[k]=await lazyImage(k);}));}catch{status('道具の画像を読み込めませんでした。もう一度押してください');return;}if(harvest||tilling||watering)return;}if(request!==equipmentRequest)return;farm=equip(farm,tool);persist();status(farm.equipped?`${{hoe:'クワ',watering_can:'じょうろ',super_hoe:'すごいクワ'}[farm.equipped]}を持ったよ`:'道具をしまったよ');updateAction();if(boxOpen)renderInventory();render();}
function renderShortcuts(){for(const tool of ['hoe','watering_can','super_hoe']){const b=$('#equip-'+tool);b.hidden=farm.inventory[tool]<1;b.setAttribute('aria-pressed',String(farm.equipped===tool));b.disabled=!!harvest||!!tilling||!!watering;}$('#can-empty').hidden=farm.water>0;$('#hoe-uses').textContent=`あと${farm.hoeUses}回`;}
for(const tool of ['hoe','watering_can','super_hoe'])$('#equip-'+tool).addEventListener('click',()=>chooseTool(tool));
$('#trial-tools').addEventListener('click',()=>{if(harvest||tilling||watering)return;farm=trialTools(farm);persist();status('試作用：クワの耐久を10回、すごいクワを1個補充したよ');updateAction();if(boxOpen)renderInventory();});
function sparkles(i,time){const p=plantingPoint(i);for(let n=0;n<6;n++){const phase=(time/1900+n*.163+i*.071)%1,x=p.x+Math.sin(n*4.1+i)*63,y=p.y-45-phase*123,r=2+Math.sin(phase*Math.PI)*2;ctx.save();ctx.translate(x,y);ctx.globalAlpha=Math.sin(phase*Math.PI)*.75;ctx.fillStyle=['#fff8cc','#f7d7eb','#d8f4ea'][n%3];ctx.beginPath();ctx.moveTo(0,-r*1.6);ctx.lineTo(r*.45,-r*.35);ctx.lineTo(r*1.4,0);ctx.lineTo(r*.4,r*.3);ctx.lineTo(0,r*1.6);ctx.lineTo(-r*.4,r*.3);ctx.lineTo(-r*1.4,0);ctx.lineTo(-r*.4,-r*.3);ctx.closePath();ctx.fill();ctx.restore();}}
const propSprites=new Map(),groundPatches=[];
function drawProp(p){const image=images[p.image];if(!image)return;let layer=propSprites.get(p.id);if(!layer){const c=document.createElement('canvas'),split=Math.round(image.width*.52),left=p.sourcePart==='can'?split:0,right=p.sourcePart==='barrel'?split:image.width;c.width=right-left;c.height=image.height;c.getContext('2d').drawImage(image,left,0,c.width,c.height,0,0,c.width,c.height);let actual=c;if(p.rotate){actual=document.createElement('canvas');actual.width=c.height;actual.height=c.width;const g=actual.getContext('2d');g.translate(actual.width,0);g.rotate(Math.PI/2);g.drawImage(c,0,0);}const b=bounds(actual);layer={canvas:actual,b};propSprites.set(p.id,layer);}const b=layer.b;ctx.drawImage(layer.canvas,b.x,b.y,b.w,b.h,p.x-p.w/2,p.y-p.h,p.w,p.h);if(images.grass){let grass=propSprites.get('grass');if(!grass){grass={canvas:images.grass,b:bounds(images.grass)};propSprites.set('grass',grass);}const g=grass.b;ctx.drawImage(grass.canvas,g.x+g.w*.2,g.y,g.w*.6,g.h,p.x-p.w*.54,p.y-19,p.w*1.08,26);}}
function drawGroundPatches(){if(!images.cleanGround)return;if(!groundPatches.length)for(const r of GROUND_PATCHES){const c=document.createElement('canvas');c.width=r.w;c.height=r.h;const g=c.getContext('2d');g.drawImage(images.cleanGround,r.x,r.y,r.w,r.h,0,0,r.w,r.h);g.globalCompositeOperation='destination-in';for(const horizontal of [true,false]){const length=horizontal?r.w:r.h,gr=g.createLinearGradient(0,0,horizontal?length:0,horizontal?0:length);gr.addColorStop(0,'transparent');gr.addColorStop(r.feather/length,'black');gr.addColorStop(1-r.feather/length,'black');gr.addColorStop(1,'transparent');g.fillStyle=gr;g.fillRect(0,0,r.w,r.h);}groundPatches.push({canvas:c,...r});}for(const p of groundPatches)ctx.drawImage(p.canvas,p.x,p.y);}
// Action art sits above crop labels; remove pixels behind nearer world objects.
function drawToolOverlay(layers,dpr,w,h){if(fxCanvas.width!==w||fxCanvas.height!==h){fxCanvas.width=w;fxCanvas.height=h;}fxCtx.setTransform(1,0,0,1,0,0);fxCtx.clearRect(0,0,w,h);const effect=watering||tilling;if(!effect)return;ctx=fxCtx;try{ctx.setTransform(dpr*camera.scale,0,0,dpr*camera.scale,-camera.x*camera.scale*dpr,-camera.y*camera.scale*dpr);if(watering)drawWatering(performance.now());else drawTilling(performance.now());ctx.globalCompositeOperation='destination-out';for(const layer of layers)if(layer.depth>=plantingPoint(effect.index).y)layer.draw();ctx.globalCompositeOperation='source-over';}finally{ctx=baseCtx;}}
function render(){
 if(!ready)return;canvas.dataset.playerX=String(player.x);canvas.dataset.playerY=String(player.y);const dpr=Math.min(window.devicePixelRatio||1,2),w=Math.round(canvas.clientWidth*dpr),h=Math.round(canvas.clientHeight*dpr);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}if(!camera)camera=cameraView(player,canvas.clientWidth,canvas.clientHeight);ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,w,h);ctx.setTransform(dpr*camera.scale,0,0,dpr*camera.scale,-camera.x*camera.scale*dpr,-camera.y*camera.scale*dpr);ctx.fillStyle='#dce2bc';ctx.fillRect(0,0,WORLD.width,WORLD.height);for(const tile of BACKGROUND_TILES)if(images[tile.key])ctx.drawImage(images[tile.key],tile.x,tile.y,tile.w,tile.h);
 drawGroundPatches();ctx.fillStyle='#7b713d1c';for(const prop of FARM_PROPS){ctx.beginPath();ctx.ellipse(prop.x,prop.y+1,prop.w*.33,4,0,0,Math.PI*2);ctx.fill();}const layers=[],selected=workTarget();
 for(let i=0;i<farm.cells.length;i++){const cell=farm.cells[i],r=plotRect(i),p=cell.plant;ctx.drawImage(cell.tilled?(p?.stage===0&&!p.watered&&images.seeded?images.seeded:soilIsWet(p)?images.wet:images.dry):cell.cleared?images.cleared:images.uncleared,64,256,1152,800,r.x-7,r.y-4,r.w+14,r.h+8);
  if(selected?.index===i){ctx.strokeStyle='#fff8d5bb';ctx.lineWidth=2;ctx.setLineDash([6,7]);ctx.strokeRect(r.x+5,r.y+4,r.w-10,r.h-8);ctx.setLineDash([]);}
  if(!p)continue;const ground=plantingPoint(i);if(p.stage===0&&!images.seeded){ctx.strokeStyle='#98734a55';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(ground.x-12,ground.y+2);ctx.quadraticCurveTo(ground.x,ground.y+6,ground.x+12,ground.y+2);ctx.stroke();}
  else if(p.stage>0&&(!harvest||harvest.index!==i))layers.push({depth:ground.y,draw:()=>drawPlanted(p,i)});
 }
 for(const prop of FARM_PROPS)layers.push({depth:prop.y,draw:()=>drawProp(prop)});layers.push({depth:player.y,draw:drawBear});depthLayers(layers).forEach(l=>l.draw());drawToolOverlay(layers,dpr,w,h);
 farm.cells.forEach((c,i)=>{if(c.plant?.stage===3&&!c.plant.withered&&c.plant.colorful&&harvest?.index!==i)sparkles(i,performance.now());});
 if(harvest){const pose=harvestPose(harvest.from,harvest.to,performance.now()-harvest.start),p=farm.cells[harvest.index].plant,{s,placement:q}=plantSprite(p,harvest.index);ctx.save();if(performance.now()-harvest.start<HARVEST_MS*.7){ctx.beginPath();ctx.rect(0,0,WORLD.width,harvest.from.y+5);ctx.clip();}ctx.translate(pose.x,pose.y);ctx.rotate(pose.tilt);ctx.scale(pose.scale,pose.scale);ctx.globalAlpha=pose.alpha;ctx.drawImage(s.layer,q.dx-harvest.from.x,q.dy-harvest.from.y,q.dw,q.dh);ctx.restore();}
}
function move(dx,dy,dt){const length=Math.hypot(dx,dy);if(!length)return false;const step=MAP.speed/SOURCE_SCALE*dt*Math.min(1,length),x=dx/length*step,y=dy/length*step;if(!sceneryReady({x:player.x+x,y:player.y+y}))return false;let changed=false;if(canWalk({x:player.x+x,y:player.y})){player.x+=x;changed=true;}if(canWalk({x:player.x,y:player.y+y})){player.y+=y;changed=true;}return changed;}
function returnVillage(){if(transitioning)return;transitioning=true;if(farm.equipped==='watering_can')farm=equip(farm,null);persist();halt();if(window.parent!==window&&window.parent.__islandNavigate)window.parent.__islandNavigate('village');else location.assign(new URL('../../?from=farm&v=7',location.href).href);}
function tick(time){
 if(transitioning)return;const dt=Math.min(.04,(time-last)/1000||0);last=time;
 if(time-lastClock>=200){lastClock=time;const next=advanceFarm(farm);if(next!==farm){const justWithered=next.cells.some((c,i)=>c.plant?.withered&&!farm.cells[i].plant?.withered);farm=next;persist();if(justWithered)status('にんじんが枯れたよ。近づいて片づけよう');render();}updateAction();}
 if(watering){walking=false;if(time-watering.start>=750){watering=null;updateAction();}render();requestAnimationFrame(tick);return;}if(tilling){walking=false;if(time-tilling.start>=750){tilling=null;updateAction();}render();requestAnimationFrame(tick);return;}if(harvest){walking=false;if(time-harvest.start>=HARVEST_MS){farm=harvest.result.farm;const text=harvest.result.message;harvest=null;persist();status(text);updateAction();if(boxOpen)renderInventory();}render();requestAnimationFrame(tick);return;}
 let dx=0,dy=0;for(const key of keys){if(['ArrowLeft','a'].includes(key))dx--;if(['ArrowRight','d'].includes(key))dx++;if(['ArrowUp','w'].includes(key))dy--;if(['ArrowDown','s'].includes(key))dy++;}if(gesture?.drag){dx=gesture.dx;dy=gesture.dy;}let moved=false;
 if(!boxOpen){
  if(dx||dy){cancelWorkRoute();moved=move(dx,dy,dt);}
  else if(pendingWork)moved=followWorkRoute(dt);
 }
 const wasWalking=walking;walking=moved;const desired=cameraView(player,canvas.clientWidth,canvas.clientHeight);if(!camera)camera=desired;const factor=1-Math.exp(-10*dt),following=Math.hypot(desired.x-camera.x,desired.y-camera.y)>.02;camera={...desired,x:camera.x+(desired.x-camera.x)*factor,y:camera.y+(desired.y-camera.y)*factor};
 if(moved||wasWalking!==walking||following||time<pouringUntil||farm.cells.some(c=>c.plant?.stage===3&&!c.plant.withered&&c.plant.colorful)){updateAction();render();}
 if(returningToVillage(player))returnVillage();else requestAnimationFrame(tick);
}
function worldPoint(e){const b=canvas.getBoundingClientRect();return {x:camera.x+(e.clientX-b.left)/camera.scale,y:camera.y+(e.clientY-b.top)/camera.scale};}
function requestWork(target){
 const current=advanceFarm(farm);
 const task=target.type==='plot'?nextAction(current.cells[target.index]):{tool:'refill'};
 if(task.waiting||target.type==='well'&&farm.water===WATER_CAPACITY)return;
 const center=target.type==='plot'?plantingPoint(target.index):null;
 if(center?Math.hypot(center.x-player.x,center.y-player.y)<=PLOT_REACH:nearWater(player)){
  performWork(target);
  return;
 }
 path=routeToWork(player,target);
 if(!path.length){status('そこまで行ける道が見つからないよ');return;}
 pendingWork={...target,tool:task.tool};
 status('作業する場所へ向かっているよ');
}
function followWorkRoute(dt){
 const point=path[0];
 const distance=Math.hypot(point.x-player.x,point.y-player.y);
 const step=MAP.speed/SOURCE_SCALE*dt;
 if(step<=0)return false;
 const next=distance<=step?point:{
  x:player.x+(point.x-player.x)*step/distance,
  y:player.y+(point.y-player.y)*step/distance
 };
 if(!canWalk(next)){cancelWorkRoute();status('通れるところから選び直してね');return false;}
 if(!sceneryReady(next))return false;
 const moved=distance>0;
 player={...next};
 if(distance<=step)path.shift();
 if(!path.length){
  const target=pendingWork;
  cancelWorkRoute();
  const cell=target.type==='plot'?advanceFarm(farm).cells[target.index]:null;
  if(!cell||nextAction(cell).tool===target.tool)performWork(target);
 }
 return moved;
}
function waterStationAt(point){
 return nearWater(point)||FARM_PROPS.slice(0,2).some(p=>
  point.x>=p.x-p.w/2&&point.x<=p.x+p.w/2&&point.y>=p.y-p.h&&point.y<=p.y
 );
}
$('.farm-app').addEventListener('contextmenu',e=>e.preventDefault());
$('.farm-app').addEventListener('selectstart',e=>e.preventDefault());
canvas.addEventListener('pointerdown',e=>{
 if(e.button!==0||!ready||harvest||tilling||watering||gesture||boxOpen)return;
 cancelWorkRoute();
 canvas.focus();
 canvas.setPointerCapture(e.pointerId);
 const b=canvas.getBoundingClientRect();
 gesture={id:e.pointerId,x:e.clientX,y:e.clientY,start:performance.now(),localX:e.clientX-b.left,localY:e.clientY-b.top,canSwipe:e.clientY-b.top>=b.height*.5,drag:false,dx:0,dy:0};
});
canvas.addEventListener('pointermove',e=>{if(!gesture||gesture.id!==e.pointerId||!gesture.canSwipe)return;const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y,norm=Math.hypot(dx,dy);if(norm>8){gesture.drag=true;const ratio=norm>38?38/norm:1;gesture.dx=dx*ratio/38;gesture.dy=dy*ratio/38;stick.style.left=`${Math.max(62,Math.min(canvas.clientWidth-62,gesture.localX))}px`;stick.style.top=`${Math.max(62,Math.min(canvas.clientHeight-62,gesture.localY))}px`;stick.classList.add('active');knob.style.transform=`translate(${dx*ratio}px,${dy*ratio}px)`;}});
canvas.addEventListener('pointerup',e=>{
 if(!gesture||gesture.id!==e.pointerId)return;
 const tap=!gesture.drag&&performance.now()-gesture.start<500&&Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)<=8;
 const confirm=gesture.canSwipe;
 releaseStick();
 if(!tap)return;
 const point=worldPoint(e),index=farm.cells.findIndex((_,i)=>{
  const r=plotRect(i);
  return point.x>=r.x&&point.x<=r.x+r.w&&point.y>=r.y&&point.y<=r.y+r.h;
 });
 if(index>=0)requestWork({type:'plot',index});
 else if(waterStationAt(point))requestWork({type:'well'});
 else if(confirm)confirmNearbyAction(canvas);
});
for(const event of ['pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{if(gesture?.id===e.pointerId)releaseStick();});
window.addEventListener('keydown',e=>{if(boxOpen){if(e.key==='Escape'){e.preventDefault();closeBox();}if(e.key==='Tab'){const buttons=[...overlay.querySelectorAll('button:not(:disabled)')],first=buttons[0],end=buttons[buttons.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();end.focus();}else if(!e.shiftKey&&document.activeElement===end){e.preventDefault();first.focus();}}return;}if(['INPUT','TEXTAREA','SELECT','SUMMARY'].includes(document.activeElement?.tagName))return;const key=e.key.length===1?e.key.toLowerCase():e.key;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'].includes(key)){e.preventDefault();cancelWorkRoute();keys.add(key);}});
window.addEventListener('keyup',e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key));window.addEventListener('blur',halt);document.addEventListener('visibilitychange',()=>{halt();persist();});window.addEventListener('pagehide',persist);
window.addEventListener('storage',e=>{if(e.key!==SAVE_KEY||!storage)return;const update=readSave(storage);if(!update.canSave){canSave=false;status(update.error);return;}halt();harvest=null;farm=update.farm;canSave=true;tilling=null;watering=null;status('ほかの画面の畑の変更を反映しました');updateAction();if(boxOpen)renderInventory();render();});
viewport();
const urls={grass:'assets/prop-grass-fringe-v1.svg',waterStation:'assets/water-station-layer-v1.png',seedBox:'assets/seed-box-only-v1.png',standingHoe:'assets/item-hoe-v1.png',cleanGround:'assets/meadow-ground-patches-v2.png',toolHoe:'assets/item-hoe-v1.png',toolSuper:'assets/item-super-hoe-v1.png',toolCan:'assets/item-watering-can-v2.png',...Object.fromEntries(BACKGROUND_TILES.map(t=>[t.key,t.url])),seeded:'assets/soil-seeded-v2.png',withered:'assets/carrot-withered-v1.png',atlas:'assets/crops.png',dry:'assets/soil-dry-v2.png',wet:'assets/soil-wet-v2.png',cleared:'assets/land-cleared-v1.png',uncleared:'assets/land-uncleared-v1.png',hoe:'assets/bear-hoe-color-v4.png',bear:'../../assets/bear-front.png',ripe:'assets/carrot-ripe-v2.png',colorful:'assets/carrot-colorful-v2.png',canFull:'assets/bear-watering-full-color-v4.png',canEmpty:'assets/bear-watering-empty-color-v4.png'};
const pendingImages=new Map();
function lazyImage(key){if(images?.[key])return Promise.resolve(images[key]);if(!pendingImages.has(key))pendingImages.set(key,imageLoad(urls[key]).catch(e=>{pendingImages.delete(key);throw e;}));return pendingImages.get(key);}
const required=[...propAssetsForView(cameraView(player,canvas.clientWidth,canvas.clientHeight),canvas.clientWidth,canvas.clientHeight),...visibleBackground(cameraView(player,canvas.clientWidth,canvas.clientHeight),canvas.clientWidth,canvas.clientHeight).map(t=>t.key),'atlas','dry','wet','cleared','uncleared','bear'];
if(farm.cells.some(c=>c.plant?.stage===0))required.push('seeded');
if(farm.cells.some(c=>c.plant?.withered))required.push('withered');
if(farm.cells.some(c=>c.plant?.stage===3&&!c.plant.withered))required.push('ripe');
if(farm.cells.some(c=>c.plant?.stage===3&&!c.plant.withered&&c.plant.colorful))required.push('colorful');
let loadedImages=0;images={};
Promise.all(required.map(async key=>{images[key]=await lazyImage(key);loadedImages++;window.__islandBoot?.progress(`近くの景色を読み込んでいます… ${loadedImages}/${required.length}`,loadedImages,required.length);})).then(async()=>{prepareSprites();if(saved.migrated)persist();ready=true;updateAction();render();window.__islandBoot?.ready();$('#loading').hidden=true;if(saved.error)status(saved.error);requestAnimationFrame(tick);for(const key of [...new Set(['canFull','canEmpty',...Object.keys(urls)])].filter(k=>!required.includes(k))){try{images[key]=await lazyImage(key);if(['ripe','colorful','withered'].includes(key))prepareSprites();render();}catch{status('一部の画像が遅れています。道具は選択時に再試行します');}}}).catch(e=>window.__islandBoot?.fail(e.message));

let pendingScenery=false,sceneryRetryAt=0;
function sceneryReady(position){const v=cameraView(position,canvas.clientWidth,canvas.clientHeight),missing=[...visibleBackground(v,canvas.clientWidth,canvas.clientHeight).map(t=>t.key),...propAssetsForView(v,canvas.clientWidth,canvas.clientHeight)].filter(key=>!images[key]);if(!missing.length)return true;if(!pendingScenery&&Date.now()>=sceneryRetryAt){pendingScenery=true;status('隣の景色を準備しているよ…');Promise.all(missing.map(async key=>{images[key]=await lazyImage(key);})).then(()=>render()).catch(()=>{sceneryRetryAt=Date.now()+5000;status('景色を読み込めませんでした。少し待ってから歩いてね')}).finally(()=>pendingScenery=false);}return false;}
