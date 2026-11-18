import {createInventory,itemId,witheredItemId} from './items.mjs?v=7';
export const COLS=4,ROWS=2,COLORFUL_CHANCE=.01,WATER_CAPACITY=3,HOE_DURABILITY=10,HARVESTS_PER_TILL=10;
export const CARROT={name:'にんじん',stages:3,rarity:'ふつう',value:10,sproutMs:5000,youngMs:125000,ripeMs:305000,wiltMs:3600000};
// A dose covers the three carrot growth transitions; seed alone never dries out.
export function soilIsWet(plant,now=Date.now()){return !!plant?.watered&&!plant.withered&&plant.growthStartedAt!==null&&plant.stage<3&&now<plant.growthStartedAt+CARROT.ripeMs;}
export const INITIALLY_CLEARED=[0,1,4,5];
export function createFarm(){return {cells:Array.from({length:COLS*ROWS},(_,i)=>({cleared:INITIALLY_CLEARED.includes(i),tilled:false,harvestsSinceTill:0,plant:null})),nextId:1,harvests:0,colorful:0,value:0,water:WATER_CAPACITY,hoeUses:HOE_DURABILITY,equipped:null,inventory:createInventory()};}
export function equip(farm,tool){if(tool!==null&&!['hoe','watering_can','super_hoe'].includes(tool))return farm;if(tool&&farm.inventory[tool]<=0)return farm;return {...farm,equipped:farm.equipped===tool?null:tool};}
export function trialTools(farm){return {...farm,hoeUses:HOE_DURABILITY,inventory:{...farm.inventory,hoe:1,super_hoe:farm.inventory.super_hoe+1}};}
export function advanceFarm(farm,now=Date.now()){
 let changed=false;
 const cells=farm.cells.map(cell=>{
  const p=cell.plant;if(!p||p.growthStartedAt===null||p.withered)return cell;
  const elapsed=Math.max(0,now-p.growthStartedAt);
  const stage=Math.max(p.stage,elapsed>=CARROT.ripeMs?3:elapsed>=CARROT.youngMs?2:elapsed>=CARROT.sproutMs?1:0);
  const drySince=stage===3?(p.drySince??p.growthStartedAt+CARROT.ripeMs):null;
  const withered=drySince!==null&&now-drySince>=CARROT.wiltMs;
  if(stage===p.stage&&drySince===(p.drySince??null)&&withered===!!p.withered)return cell;
  changed=true;return {...cell,plant:{...p,stage,drySince,withered}};
 });return changed?{...farm,cells}:farm;
}
export function remainingMs(plant,now=Date.now()){if(!plant||plant.growthStartedAt===null)return null;return Math.max(0,CARROT.ripeMs-(now-plant.growthStartedAt));}
export function nextGrowth(plant,now=Date.now()){if(!plant||!plant.watered||plant.growthStartedAt===null||plant.stage===3||plant.withered)return null;const elapsed=Math.max(0,now-plant.growthStartedAt);const phases=[[CARROT.sproutMs,'芽が出るまで'],[CARROT.youngMs,'育ち中になるまで'],[CARROT.ripeMs,'収穫まで']];const stage=Math.max(plant.stage,elapsed>=CARROT.youngMs?2:elapsed>=CARROT.sproutMs?1:0);if(elapsed>=CARROT.ripeMs)return {label:'収穫できるよ',ms:0};return {label:phases[stage][1],ms:Math.max(0,phases[stage][0]-elapsed)};}
export function formatRemaining(ms){const remaining=Math.max(0,ms);if(remaining>=7200000)return `${Math.floor(remaining/3600000)}時間`;if(remaining>=3600000)return `1時間${Math.floor(remaining%3600000/60000)}分`;if(remaining>=120000)return `${Math.floor(remaining/60000)}分`;if(remaining>=60000)return `1分${Math.floor(remaining%60000/1000)}秒`;return `${Math.min(59,Math.ceil(remaining/1000))}秒`;}
export function refillWater(farm){if(farm.inventory.watering_can<1)return {farm,changed:false,message:'じょうろを用意しよう'};return farm.water===WATER_CAPACITY?{farm,changed:false,message:'じょうろの水はいっぱいだよ'}:{farm:{...farm,water:WATER_CAPACITY},changed:true,message:'水をくんだ！ 3回分の水が入ったよ'};}
export function tutorial(farm){if(farm.cells.some(c=>c.plant?.withered))return '枯れたにんじんを片づけて、また育てよう';if(farm.harvests>0)return '畑を育てよう。すごいクワで右側を開墾できるよ';if(farm.cells.some(c=>c.plant?.stage===3))return '育ったにんじんを収穫しよう！';if(farm.cells.some(c=>c.plant?.watered))return '芽が出るのを待とう！ 一度の水やりで最後まで育つよ';if(farm.cells.some(c=>c.plant))return farm.water===0?'水くみ場で水を汲もう！':'畑のそばで水をまこう！';if(farm.cells.some(c=>c.tilled))return '耕した畑のそばで、たねをまこう！';return '畑のそばで耕そう！';}
export function act(original,index,{tool='hoe',random=Math.random,colorfulPreview=false,now=Date.now()}={}){
 let farm=advanceFarm(original,now);const no=message=>({farm,changed:false,message});
 if(!Number.isInteger(index)||index<0||index>=COLS*ROWS)return no('畑に近づいて作業しよう');
 if(!['clear','hoe','seed','water','grow','remove'].includes(tool))return no('今できる作業を選ぼう');
 const old=farm.cells[index],copy=()=>({...farm,cells:farm.cells.map(c=>({...c})),inventory:{...farm.inventory}});
 if(tool==='clear'){
  if(old.cleared)return no('ここはもう開墾してあるよ');
  if(farm.inventory.super_hoe<1)return no('開墾には「すごいクワ」が必要だよ。イベントで手に入れよう');
  const col=index%COLS,neighbors=[index-COLS,index+COLS,...(col?[index-1]:[]),...(col<COLS-1?[index+1]:[])];
  if(!neighbors.some(i=>farm.cells[i]?.cleared))return no('開墾済みの畑の隣から広げよう');
  const next=copy();next.cells[index].cleared=true;next.inventory.super_hoe--;if(!next.inventory.super_hoe&&next.equipped==='super_hoe')next.equipped=null;return {farm:next,changed:true,message:'開墾できた！ クワで耕そう'};
 }
 if(!old.cleared)return no('ここは未開墾。すごいクワで開墾しよう');
 if(tool==='hoe'){
  if(old.tilled)return no('ここはもう耕してあるよ');
  if(farm.inventory.hoe<1||farm.hoeUses<1)return no('クワがないよ。クワを補充しよう');
  const next=copy();next.cells[index].tilled=true;next.cells[index].harvestsSinceTill=0;next.hoeUses--;if(!next.hoeUses){next.inventory.hoe=0;if(next.equipped==='hoe')next.equipped=null;}return {farm:next,changed:true,message:`耕せた！ ここに種をまこう${next.hoeUses===0?'。クワを使い切ったよ':''}`};
 }
 if(!old.tilled)return no('まずクワで耕そう');
 if(tool==='seed'){
  if(old.plant)return no('ここではもうにんじんが育っているよ');
  const sample=colorfulPreview?0:random(),plant={id:farm.nextId,stage:0,watered:false,colorful:sample<COLORFUL_CHANCE,plantedAt:now,growthStartedAt:null,drySince:null,withered:false};
  const next=copy();next.nextId++;next.cells[index].plant=plant;return {farm:next,changed:true,message:'種をまいた！ お水をあげよう'};
 }
 const plant=old.plant;if(!plant)return no('ここに種をまこう');
 if(plant.withered){if(tool!=='remove')return no('枯れたにんじんを片づけよう');const next=copy(),id=witheredItemId('carrot',plant.stage);next.inventory[id]++;next.cells[index].plant=null;return {farm:next,changed:true,item:id,message:'枯れたにんじんを片づけて、アイテムボックスに入れたよ。また種をまこう'};}
 if(plant.stage===3&&tool==='grow'){
  const id=itemId('carrot',plant.colorful),next=copy();next.harvests++;next.colorful+=Number(plant.colorful);next.value+=CARROT.value*(plant.colorful?3:1);next.inventory[id]++;next.cells[index].plant=null;next.cells[index].harvestsSinceTill++;const worn=next.cells[index].harvestsSinceTill>=HARVESTS_PER_TILL;if(worn)next.cells[index].tilled=false;
  return {farm:next,changed:true,harvested:true,item:id,message:`${plant.colorful?'カラフルな':''}にんじんを収穫！${worn?' このマスは10回収穫したので、もう一度耕そう':' アイテムボックスに入ったよ'}`};
 }
 if(tool==='water'){
  if(plant.watered)return no('お水はあげてあるよ。育つのを待とう');
  if(farm.inventory.watering_can<1)return no('じょうろを用意しよう');
  if(farm.water<=0)return no('水くみ場に行って水をくもう！');
  const next=copy();next.water--;next.cells[index].plant={...plant,watered:true,growthStartedAt:now,drySince:null,withered:false};return {farm:next,changed:true,message:'じょろじょろ… 5秒で芽が出るよ'};
 }
 const phase=nextGrowth(plant,now);return no(plant.stage===3?'収穫できるよ':phase?`あと${formatRemaining(phase.ms)}`:'水をまこう');
}
