import {test} from 'node:test';import assert from 'node:assert/strict';
import {createFarm,act,advanceFarm,refillWater,CARROT,formatRemaining,equip,trialTools,nextGrowth} from '../experiments/farming/farm.mjs';
const equipped=(f,t)=>f.equipped===t?f:equip(f,t);
const apply=(f,i,tool,extra={})=>act(['hoe','water','clear'].includes(tool)?equipped(f,{hoe:'hoe',water:'watering_can',clear:'super_hoe'}[tool]):f,i,{tool,random:()=>.5,now:1000,...extra});
function plant(f,i,extra={}){f=apply(f,i,'hoe').farm;return apply(f,i,'seed',extra).farm;}
test('初期4マスだけ開墾済み。通常クワで未開墾を飛ばせず、すごいクワは隣接1マスごとに消費',()=>{const f=createFarm();assert.deepEqual(f.cells.map(c=>c.cleared),[true,true,false,false,true,true,false,false]);assert.equal(apply(f,0,'seed').changed,false);const a=apply(f,0,'hoe').farm;assert.equal(f.cells[0].tilled,false);assert.equal(apply(a,2,'hoe').changed,false);assert.equal(apply(a,2,'clear').changed,false);let b=trialTools(a);assert.equal(apply(b,3,'clear').changed,false);b=apply(b,2,'clear').farm;assert.equal(b.cells[2].cleared,true);assert.equal(b.cells[2].tilled,false);assert.equal(b.inventory.super_hoe,0);assert.equal(b.equipped,null);assert.equal(apply(b,2,'hoe').changed,true);});
test('持っている道具は装備なしで使える。別の道具を消費しても現在の装備は維持',()=>{
 const f=equip(createFarm(),'watering_can');
 const tilled=act({...f,hoeUses:1},0,{tool:'hoe'}).farm;
 assert.equal(tilled.inventory.hoe,0);
 assert.equal(tilled.equipped,'watering_can');
 const seeded=act(tilled,0,{tool:'seed'}).farm;
 const stowed=equip(seeded,'watering_can');
 assert.equal(act(stowed,0,{tool:'water'}).farm.water,2);
 const noCan={...stowed,inventory:{...stowed.inventory,watering_can:0}};
 assert.equal(act(noCan,0,{tool:'water'}).changed,false);
 assert.equal(refillWater({...noCan,water:0}).changed,false);
 const expanded=act(trialTools(seeded),2,{tool:'clear'}).farm;
 assert.equal(expanded.inventory.super_hoe,0);
 assert.equal(expanded.equipped,'watering_can');
});
test('水やり5秒/芽から2分/芽から5分の境界を維持し、段階別の次の時刻を表示',()=>{let f=plant(createFarm(),0);assert.equal(advanceFarm(f,999999).cells[0].plant.stage,0);f=apply(f,0,'water',{now:0}).farm;assert.equal(f.water,2);for(const [now,expected] of [[4999,0],[5000,1],[124999,1],[125000,2],[304999,2],[305000,3]])assert.equal(advanceFarm(f,now).cells[0].plant.stage,expected);assert.deepEqual(nextGrowth(f.cells[0].plant,0),{label:'芽が出るまで',ms:5000});assert.deepEqual(nextGrowth(advanceFarm(f,5000).cells[0].plant,5000),{label:'育ち中になるまで',ms:120000});assert.deepEqual(nextGrowth(advanceFarm(f,125000).cells[0].plant,125000),{label:'収穫まで',ms:180000});assert.equal(apply(f,0,'grow',{now:5001}).changed,false);const harvested=apply(f,0,'grow',{now:305000}).farm;assert.equal(harvested.inventory.carrot,1);assert.equal(apply(harvested,0,'grow').changed,false);});
test('カラフルは種まき時に一度だけ抽選して別アイテムへ。時刻を戻しても育ちは巻き戻さない',()=>{let count=0,f=plant(createFarm(),0,{random:()=>{count++;return .0099}});f=apply(f,0,'water').farm;f=advanceFarm(f,1000+CARROT.ripeMs);assert.equal(advanceFarm(f,0).cells[0].plant.stage,3);f=apply(f,0,'grow',{now:1000+CARROT.ripeMs,random:()=>{throw Error('再抽選')}}).farm;assert.equal(count,1);assert.equal(f.inventory.carrot,0);assert.equal(f.inventory.carrot_colorful,1);assert.equal(f.value,30);assert.equal(plant(createFarm(),0,{random:()=>.01}).cells[0].plant.colorful,false);});
test('3回分の水、重複消費なし、1回で全段階成長。補充で開始時刻を変えない',()=>{let f=createFarm();for(const i of [0,1,4]){f=plant(f,i);f=apply(f,i,'water').farm;assert.equal(apply(f,i,'water').changed,false);}assert.equal(f.water,0);f=plant(f,5);assert.match(apply(f,5,'water').message,/水くみ場/);const before=f;f=refillWater(f).farm;assert.equal(before.water,0);assert.equal(f.water,3);assert.equal(f.cells[0].plant.growthStartedAt,1000);assert.equal(apply(f,5,'water').farm.water,2);});
test('各マス10回収穫でそのマスだけ耕し直し。耕すたびクワを消費して10回でなくなる',()=>{let f=createFarm();for(let cycle=0;cycle<10;cycle++){f=plant(f,0);f=apply(f,0,'water',{now:1000}).farm;f=apply(f,0,'grow',{now:306000}).farm;f=refillWater(f).farm;}assert.equal(f.harvests,10);assert.equal(f.cells[0].tilled,false);assert.equal(f.cells[0].harvestsSinceTill,10);assert.equal(f.cells[1].harvestsSinceTill,0);assert.equal(f.hoeUses,9);for(let n=0;n<9;n++){f={...f,cells:f.cells.map((c,i)=>i===0?{...c,tilled:false}:c)};f=apply(f,0,'hoe').farm;}assert.equal(f.hoeUses,0);assert.equal(f.inventory.hoe,0);assert.equal(f.equipped,null);assert.equal(apply({...f,cells:f.cells.map((c,i)=>i===0?{...c,tilled:false}:c)},0,'hoe').changed,false);});
test('不正なマスは無変更、分/秒の境界',()=>{const f=createFarm();for(const i of [-1,8,.5,NaN])assert.equal(apply(f,i,'hoe').changed,false);assert.equal(formatRemaining(120000),'2分');assert.equal(formatRemaining(60000),'1分0秒');assert.equal(formatRemaining(59000),'59秒');assert.equal(formatRemaining(0),'0秒');assert.equal(formatRemaining(-1),'0秒');});

test('2分/2時間を切ったら下位の単位も出す',()=>{for(const [ms,text] of [[18000000,'5時間'],[14400000,'4時間'],[10800000,'3時間'],[7200000,'2時間'],[7199999,'1時間59分'],[6300000,'1時間45分'],[3600000,'1時間0分'],[3599999,'59分'],[300000,'5分'],[180000,'3分'],[120000,'2分'],[119999,'1分59秒'],[105000,'1分45秒'],[60000,'1分0秒'],[59999,'59秒'],[100,'1秒'],[0,'0秒']])assert.equal(formatRemaining(ms),text);});
