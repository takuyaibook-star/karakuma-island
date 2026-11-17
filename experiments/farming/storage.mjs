import {createFarm,advanceFarm} from './farm.mjs';
import {createInventory} from './items.mjs';
export const SAVE_KEY='karakuma-island:farming:v1';
export function validFarm(f){
 if(!f||!Array.isArray(f.cells)||f.cells.length!==8||!Number.isInteger(f.water)||f.water<0||f.water>3)return false;
 if(!['nextId','harvests','colorful','value'].every(k=>Number.isSafeInteger(f[k])&&f[k]>=0)||f.nextId<1)return false;
 if(!f.inventory||!Object.keys(createInventory()).every(k=>k==='carrot_seed'?f.inventory[k]===null:Number.isSafeInteger(f.inventory[k])&&f.inventory[k]>=0))return false;
 const ids=new Set();for(const c of f.cells){if(!c||typeof c.tilled!=='boolean')return false;const p=c.plant;if(p===null)continue;if(!c.tilled||!p||!Number.isSafeInteger(p.id)||p.id<1||p.id>=f.nextId||ids.has(p.id)||!Number.isInteger(p.stage)||p.stage<0||p.stage>3||typeof p.colorful!=='boolean'||typeof p.watered!=='boolean'||!Number.isFinite(p.plantedAt)||p.plantedAt<0)return false;if(p.growthStartedAt!==null&&(!Number.isFinite(p.growthStartedAt)||p.growthStartedAt<0))return false;if(p.watered!==(p.growthStartedAt!==null)||(!p.watered&&p.stage!==0))return false;ids.add(p.id);}return f.colorful<=f.harvests&&f.inventory.carrot+f.inventory.carrot_colorful===f.harvests&&f.inventory.carrot_colorful===f.colorful;
}
export function readSave(storage,now=Date.now()){
 try{const raw=storage.getItem(SAVE_KEY);if(!raw)return {farm:createFarm(),canSave:true};const data=JSON.parse(raw);if(data.version!==1||!validFarm(data.farm))return {farm:createFarm(),canSave:false,error:'保存データを確認できませんでした。元データを残して、新しい保存を止めています。'};return {farm:advanceFarm(data.farm,now),canSave:true};}
 catch{return {farm:createFarm(),canSave:false,error:'このブラウザで保存を読み込めませんでした。'};}
}
export function writeSave(storage,farm){try{storage.setItem(SAVE_KEY,JSON.stringify({version:1,farm}));return true;}catch{return false;}}
