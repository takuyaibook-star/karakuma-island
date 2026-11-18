// Read-only map inspection plus movement in an isolated test browser/save.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const base=process.env.TEST_URL||'http://127.0.0.1:5194/',out=process.env.TEST_OUTPUT||'/tmp/karakuma-v11-tap';fs.mkdirSync(out,{recursive:true});
(async()=>{const {cameraView,canWalk,route,plantingPoint}=await import(pathToFileURL(path.resolve(__dirname,'../experiments/farming/scene.mjs')).href);const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});try{const c=await browser.newContext({viewport:{width:390,height:844},hasTouch:true}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));const {createFarm}=await import('../experiments/farming/farm.mjs');await c.addInitScript(save=>{const key='karakuma-island:farming:v1';if(!localStorage.getItem(key))localStorage.setItem(key,save);},JSON.stringify({version:3,farm:{...createFarm(),water:1}}));await p.clock.install();await p.goto(base+'?map=farm&v=17');const f=p.frameLocator('#map'),canvas=f.locator('#farm');await f.locator('#loading').waitFor({state:'hidden'});const frame=p.frames().find(f=>f.url().includes('/experiments/farming/'));await p.clock.pauseAt(new Date(await p.evaluate(()=>Date.now())+1000));
async function pos(){return canvas.evaluate(e=>({x:Number(e.dataset.playerX),y:Number(e.dataset.playerY)}));}
async function walkTo(target){assert.equal(canWalk(target),true);await canvas.focus();let previous=null;for(let i=0;i<280;i++){const current=await pos(),blocked=previous&&Math.hypot(current.x-previous.x,current.y-previous.y)<.1;previous=current;if(Math.hypot(current.x-target.x,current.y-target.y)<7){await p.clock.runFor(700);return;}const next=route(current,target)[0];assert.ok(next,'reachable route');const dx=next.x-current.x,dy=next.y-current.y,keys=[];if(Math.abs(dx)>3&&Math.abs(dx)*2.4>=Math.abs(dy))keys.push(dx>0?'ArrowRight':'ArrowLeft');if(Math.abs(dy)>3&&Math.abs(dy)*2.4>=Math.abs(dx))keys.push(dy>0?'ArrowDown':'ArrowUp');if(blocked&&Math.abs(dx)>.5&&!keys.some(k=>k==='ArrowLeft'||k==='ArrowRight'))keys.push(dx>0?'ArrowRight':'ArrowLeft');if(blocked&&Math.abs(dy)>.5&&!keys.some(k=>k==='ArrowDown'||k==='ArrowUp'))keys.push(dy>0?'ArrowDown':'ArrowUp');if(!keys.length){await p.clock.runFor(100);continue;}for(const k of keys)await p.keyboard.down(k);await p.clock.runFor(Math.min(130,Math.hypot(dx,dy)/(90/.65)*1000));for(const k of keys)await p.keyboard.up(k);}throw Error('Could not walk to '+JSON.stringify({target,pos:await pos()}));}

async function confirmAt(x=340,y=760){const b=await canvas.boundingBox();await p.touchscreen.tap(b.x+x,b.y+y);}
async function save(){return frame.evaluate(()=>JSON.parse(localStorage.getItem('karakuma-island:farming:v1'))?.farm);}
const initial=await pos();await confirmAt();await p.clock.runFor(600);assert.deepEqual(await pos(),initial,'far tap does not move');assert.equal((await save())?.cells?.[0]?.tilled||false,false,'far tap does not till');
async function tapWorld(point){
 const box=await canvas.boundingBox(),view=cameraView(await pos(),box.width,box.height);
 await p.touchscreen.tap(box.x+(point.x-view.x)*view.scale,box.y+(point.y-view.y)*view.scale);
}
const pressBox=await canvas.boundingBox(),pressView=cameraView(initial,pressBox.width,pressBox.height),destination=plantingPoint(0);
await p.mouse.move(pressBox.x+(destination.x-pressView.x)*pressView.scale,pressBox.y+(destination.y-pressView.y)*pressView.scale);
await p.mouse.down();
await p.clock.runFor(650);
await p.mouse.up();
await p.clock.runFor(240);
assert.deepEqual(await pos(),initial,'holding still does not act on release');
await tapWorld(destination);
await p.clock.runFor(240);
assert.notDeepEqual(await pos(),initial,'starts walking toward a tapped distant plot');
assert.equal((await save()).cells[0].tilled,false,'does not till before arriving');
await p.clock.runFor(6200);
let data=await save();
assert.equal(data.cells[0].tilled,true,'works on the selected plot after walking');
assert.equal(data.hoeUses,9);
assert.equal(data.cells.filter(cell=>cell.tilled).length,1);
await walkTo({x:673,y:500});
await confirmAt();
assert.equal((await save()).cells[0].plant.stage,0,'tap plants seed');
await walkTo({x:735,y:850});
await tapWorld(plantingPoint(0));
await p.clock.runFor(150);
await p.keyboard.down('ArrowLeft');
await p.clock.runFor(150);
await p.keyboard.up('ArrowLeft');
await p.clock.runFor(4500);
assert.equal((await save()).water,1,'manual movement cancels the queued watering');
await tapWorld(plantingPoint(0));
await p.clock.runFor(6200);
assert.equal((await save()).water,0,'walking to the plot waters once');
assert.equal(await f.locator('#can-empty').isVisible(),true);
assert.equal(await f.locator('#action').isVisible(),false,'growth does not show an action button');
const timer=f.locator('.plot-tag[data-plot="0"]');
await walkTo({x:673,y:500});
const covered=await timer.boundingBox();
const overlapPosition=await pos(),overlapField=await canvas.boundingBox();
const overlapCamera=cameraView(overlapPosition,overlapField.width,overlapField.height);
const bearX=overlapField.x+(overlapPosition.x-overlapCamera.x)*overlapCamera.scale;
const feetY=overlapField.y+(overlapPosition.y-overlapCamera.y)*overlapCamera.scale;
assert.ok(covered.x<bearX&&covered.x+covered.width>bearX&&covered.y<feetY&&covered.y+covered.height>feetY-overlapCamera.characterPixels,'player overlaps the countdown');
assert.equal(await timer.evaluate(e=>getComputedStyle(e).opacity),'0.75','overlapping countdown stays visible');
await p.screenshot({path:path.join(out,'timer-over-player.png')});
await walkTo({x:799,y:490});
assert.equal(await timer.evaluate(e=>getComputedStyle(e).opacity),'0.75','timer is 75% opaque when unobstructed');
assert.ok(Math.abs((await timer.boundingBox()).y-covered.y)<1,'timer stays anchored at its plot');
const app=f.locator('.farm-app');
assert.equal(await app.evaluate(e=>getComputedStyle(e).userSelect),'none');
assert.equal(await app.evaluate(e=>e.dispatchEvent(new Event('selectstart',{bubbles:true,cancelable:true}))),false);
assert.equal(await app.evaluate(e=>e.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true}))),false);
await p.screenshot({path:path.join(out,'tap-watered.png')});
await walkTo({x:673,y:500});
await p.clock.fastForward(306000);await confirmAt();await confirmAt();await p.clock.runFor(900);data=await save();assert.equal(data.harvests,1,'rapid taps harvest once');assert.equal(data.cells[0].plant,null);assert.equal(data.equipped,'watering_can','keeps the can after watering and harvesting');
const before=await pos(),b=await canvas.boundingBox();await p.mouse.move(b.x+280,b.y+720);await p.mouse.down();await p.mouse.move(b.x+230,b.y+720,{steps:5});await p.clock.runFor(500);await p.mouse.up();await p.clock.runFor(200);assert.ok((await pos()).x<before.x-15,'lower screen swipe still moves');const stopped=await pos();await p.mouse.click(b.x+340,b.y+760);await p.clock.runFor(500);assert.deepEqual(await pos(),stopped,'ground tap does not move');await f.locator('#equip-hoe').click();assert.equal((await save()).equipped,'hoe');await walkTo({x:735,y:466});await confirmAt();assert.equal((await save()).water,10);assert.equal((await save()).equipped,'watering_can','refilling automatically equips the can');assert.equal(await f.locator('#can-empty').isVisible(),false);
await f.locator('#equip-watering_can').click();assert.equal((await save()).equipped,null,'pressing the can button stows it');await p.goto(base+'?v=17');await f.locator('#walk[data-ready=true]').waitFor();const village=p.frames().find(frame=>frame.url().includes('/village.html'));
await village.evaluate(()=>{const b=document.createElement('button');b.id='test-talk';b.textContent='話しかける';b.hidden=true;b.setAttribute('data-nearby-action','');b.addEventListener('click',()=>{b.dataset.count=String(Number(b.dataset.count||0)+1);});document.querySelector('main').append(b);});
const talk=f.locator('#test-talk');await p.touchscreen.tap(330,700);assert.equal(await talk.getAttribute('data-count'),null);await talk.evaluate(b=>{b.hidden=false;});await p.touchscreen.tap(330,700);assert.equal(await talk.getAttribute('data-count'),'1');await talk.evaluate(b=>{b.disabled=true;});await p.touchscreen.tap(330,700);assert.equal(await talk.getAttribute('data-count'),'1');
assert.deepEqual(errors,[]);await p.screenshot({path:path.join(out,'tap-and-grass.png')});fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({passed:true,checks:['far tap neither moves nor acts','lower tap confirms till, seed, water, harvest and refill without manual tools','rapid taps never duplicate consumption or rewards','empty watering can label toggles, village action confirm ignores hidden/disabled buttons','lower swipe moves, plain ground tap does not'],errors},null,2));console.log('Tap checks passed:',out);await c.close();}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
