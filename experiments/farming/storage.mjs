import {createFarm,advanceFarm,INITIALLY_CLEARED} from './farm.mjs?v=6';
import {createInventory} from './items.mjs?v=6';
export const SAVE_KEY='karakuma-island:farming:v1';
export const BACKUP_KEY=SAVE_KEY+':backup:before-v2';
export function validFarm(f,legacy=false){
 if(!f||!Array.isArray(f.cells)||f.cells.length!==8||!Number.isInteger(f.water)||f.water<0||f.water>3)return false;
 if(!['nextId','harvests','colorful','value'].every(k=>Number.isSafeInteger(f[k])&&f[k]>=0)||f.nextId<1)return false;
 const keys=Object.keys(createInventory()).filter(k=>!legacy||k!=='super_hoe');
 if(!f.inventory||!keys.every(k=>k==='carrot_seed'?f.inventory[k]===null:Number.isSafeInteger(f.inventory[k])&&f.inventory[k]>=0))return false;
 if(!legacy&&(!Number.isInteger(f.hoeUses)||f.hoeUses<0||f.hoeUses>10||![null,'hoe','watering_can','super_hoe'].includes(f.equipped)||(f.equipped&&f.inventory[f.equipped]<1)||(f.inventory.hoe>0&&f.hoeUses===0)))return false;
 const ids=new Set();for(const c of f.cells){if(!c||typeof c.tilled!=='boolean')return false;if(!legacy&&(typeof c.cleared!=='boolean'||!Number.isInteger(c.harvestsSinceTill)||c.harvestsSinceTill<0||c.harvestsSinceTill>10||(c.tilled&&!c.cleared)))return false;const p=c.plant;if(p===null)continue;if(!c.tilled||!p||!Number.isSafeInteger(p.id)||p.id<1||p.id>=f.nextId||ids.has(p.id)||!Number.isInteger(p.stage)||p.stage<0||p.stage>3||typeof p.colorful!=='boolean'||typeof p.watered!=='boolean'||!Number.isFinite(p.plantedAt)||p.plantedAt<0)return false;if(p.growthStartedAt!==null&&(!Number.isFinite(p.growthStartedAt)||p.growthStartedAt<0))return false;if(p.watered!==(p.growthStartedAt!==null)||(!p.watered&&p.stage!==0))return false;ids.add(p.id);}return f.colorful<=f.harvests&&f.inventory.carrot+f.inventory.carrot_colorful===f.harvests&&f.inventory.carrot_colorful===f.colorful;
}
export function readSave(storage,now=Date.now()){
 try{const raw=storage.getItem(SAVE_KEY);if(!raw)return {farm:createFarm(),canSave:true};const data=JSON.parse(raw);let f=data.farm;
 if(data.version===1&&validFarm(f,true)){
  // Preserve the exact old bytes before allowing any new-format write.
  if(!storage.getItem(BACKUP_KEY))storage.setItem(BACKUP_KEY,raw);
  f={...f,cells:f.cells.map((c,i)=>({...c,cleared:c.tilled||INITIALLY_CLEARED.includes(i),harvestsSinceTill:0})),hoeUses:f.inventory.hoe>0?10:0,equipped:null,inventory:{...createInventory(),...f.inventory,super_hoe:0}};
 }else if(data.version!==2)return {farm:createFarm(),canSave:false,error:'保存データを確認できませんでした。元データを残して、新しい保存を止めています。'};
 if(!validFarm(f))return {farm:createFarm(),canSave:false,error:'保存データを確認できませんでした。元データを残して、新しい保存を止めています。'};
 return {farm:advanceFarm(f,now),canSave:true,migrated:data.version===1};}
 catch{return {farm:createFarm(),canSave:false,error:'保存の読み込み・バックアップができませんでした。元データは上書きしません。'};}
}
export function writeSave(storage,farm){if(!validFarm(farm))return false;try{storage.setItem(SAVE_KEY,JSON.stringify({version:2,farm}));return true;}catch{return false;}}
