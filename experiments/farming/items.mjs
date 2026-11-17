export const VEGETABLES=[['carrot','にんじん'],['cabbage','キャベツ'],['pumpkin','かぼちゃ'],['watermelon','スイカ']];
export const ITEMS=Object.fromEntries(VEGETABLES.flatMap(([id,name])=>[[id,{id,name,kind:'vegetable',crop:id,colorful:false}],[`${id}_colorful`,{id:`${id}_colorful`,name:`カラフルな${name}`,kind:'vegetable',crop:id,colorful:true}]]));
Object.assign(ITEMS,{carrot_seed:{id:'carrot_seed',name:'にんじんのたね',kind:'seed',icon:'🌱'},hoe:{id:'hoe',name:'くわ',kind:'tool',icon:'🪏'},watering_can:{id:'watering_can',name:'じょうろ',kind:'tool',icon:'🚿'}});
ITEMS.super_hoe={id:'super_hoe',name:'すごいクワ',kind:'tool',icon:'✦'};
ITEMS.withered_grass={id:'withered_grass',name:'枯れた草',kind:'withered',icon:'🍂'};
for(const [crop,name] of VEGETABLES)ITEMS[`${crop}_withered`]={id:`${crop}_withered`,name:`枯れた${name}`,kind:'withered',crop,icon:'🍂'};
export function witheredItemId(crop,stage){return stage<=1?'withered_grass':`${crop}_withered`;}
export function createInventory(){return {...Object.fromEntries(VEGETABLES.flatMap(([id])=>[[id,0],[`${id}_colorful`,0]])),withered_grass:0,...Object.fromEntries(VEGETABLES.map(([id])=>[`${id}_withered`,0])),carrot_seed:null,hoe:1,watering_can:1,super_hoe:0};}
export function itemId(crop,colorful=false){const id=colorful?`${crop}_colorful`:crop;if(!ITEMS[id])throw new Error('未登録の野菜');return id;}
export function ownedItems(inventory){return Object.values(ITEMS).filter(item=>inventory[item.id]===null||inventory[item.id]>0).map(item=>({...item,quantity:inventory[item.id]}));}
