import {createInventory,itemId} from './items.mjs';
export const COLS=4,ROWS=2,COLORFUL_CHANCE=.01,WATER_CAPACITY=3;
// Five seconds to sprout; then two minutes to young leaves, five minutes total from sprouting to ripe.
export const CARROT={name:'にんじん',stages:3,rarity:'ふつう',value:10,sproutMs:5000,youngMs:125000,ripeMs:305000};
export function createFarm(){return {cells:Array.from({length:COLS*ROWS},()=>({tilled:false,plant:null})),nextId:1,harvests:0,colorful:0,value:0,water:WATER_CAPACITY,inventory:createInventory()};}
export function advanceFarm(farm,now=Date.now()){
 let changed=false;const cells=farm.cells.map(cell=>{const p=cell.plant;if(!p||p.growthStartedAt===null||p.stage===3)return cell;const elapsed=Math.max(0,now-p.growthStartedAt),stage=elapsed>=CARROT.ripeMs?3:elapsed>=CARROT.youngMs?2:elapsed>=CARROT.sproutMs?1:0;
 if(stage<=p.stage)return cell;changed=true;return {...cell,plant:{...p,stage}};});return changed?{...farm,cells}:farm;
}
export function remainingMs(plant,now=Date.now()){if(!plant||plant.growthStartedAt===null)return null;return Math.max(0,CARROT.ripeMs-(now-plant.growthStartedAt));}
export function formatRemaining(ms){const remaining=Math.max(0,ms);return remaining>=60000?`${Math.floor(remaining/60000)}分`:`${Math.ceil(remaining/1000)}秒`;}
export function refillWater(farm){return farm.water===WATER_CAPACITY?{farm,changed:false,message:'じょうろの水はいっぱいだよ'}:{farm:{...farm,water:WATER_CAPACITY},changed:true,message:'水をくんだ！ 3回分の水が入ったよ'};}
export function act(original,index,{tool='hoe',random=Math.random,colorfulPreview=false,now=Date.now()}={}){
 let farm=advanceFarm(original,now);const no=message=>({farm,changed:false,message});
 if(!Number.isInteger(index)||index<0||index>=COLS*ROWS)return no('畑に近づいて作業しよう');
 if(!['hoe','seed','water','grow'].includes(tool))return no('今できる作業を選ぼう');
 const old=farm.cells[index],col=index%COLS;
 if(tool==='hoe'){
  if(old.tilled)return no('ここはもう耕してあるよ');
  const neighbors=[index-COLS,index+COLS,...(col?[index-1]:[]),...(col<COLS-1?[index+1]:[])];
  if(farm.cells.some(c=>c.tilled)&&!neighbors.some(i=>farm.cells[i]?.tilled))return no('今ある畑の隣から、少しずつ広げよう');
  const next={...farm,cells:farm.cells.map(c=>({...c}))};next.cells[index].tilled=true;return {farm:next,changed:true,message:'耕せた！ ここに種をまこう'};
 }
 if(!old.tilled)return no('まず草地を耕そう');
 if(tool==='seed'){
  if(old.plant)return no('ここではもうにんじんが育っているよ');
  const sample=colorfulPreview?0:random(),plant={id:farm.nextId,stage:0,watered:false,colorful:sample<COLORFUL_CHANCE,plantedAt:now,growthStartedAt:null};
  const next={...farm,cells:farm.cells.map(c=>({...c})),nextId:farm.nextId+1};next.cells[index].plant=plant;return {farm:next,changed:true,message:'種をまいた！ お水をあげよう'};
 }
 const plant=old.plant;if(!plant)return no('ここに種をまこう');
 if(plant.stage===3&&tool==='grow'){
  const id=itemId('carrot',plant.colorful),next={...farm,cells:farm.cells.map(c=>({...c})),harvests:farm.harvests+1,colorful:farm.colorful+Number(plant.colorful),value:farm.value+CARROT.value*(plant.colorful?3:1),inventory:{...farm.inventory,[id]:farm.inventory[id]+1}};next.cells[index].plant=null;
  return {farm:next,changed:true,harvested:true,item:id,message:`${plant.colorful?'カラフルな':''}にんじんを収穫！ アイテムボックスに入ったよ`};
 }
 if(tool==='water'){
  if(plant.watered)return no('お水はあげてあるよ。育つのを待とう');
  if(farm.water<=0)return no('水くみ場に行って水をくもう！');
  const next={...farm,cells:farm.cells.map(c=>({...c})),water:farm.water-1};next.cells[index].plant={...plant,watered:true,growthStartedAt:now};return {farm:next,changed:true,message:'じょろじょろ… 5秒で芽が出るよ'};
 }
 return no(plant.stage===3?'収穫できるよ':`収穫まで あと${formatRemaining(remainingMs(plant,now)??CARROT.ripeMs)}`);
}
