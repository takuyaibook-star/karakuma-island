// Draw anchors and ground footprints are independent: tall artwork never becomes a wall.
export const FARM_PROPS=[
 {id:'barrel',image:'waterStation',sourcePart:'barrel',x:735,y:421,w:132,h:150,foot:{x:735,y:409,rx:72,ry:30}},
 {id:'watering-can',image:'waterStation',sourcePart:'can',x:872,y:441,w:124,h:103,foot:{x:886,y:430,rx:48,ry:24}},
 {id:'seed-box',image:'seedBox',x:340,y:826,w:140,h:115,foot:{x:340,y:809,rx:70,ry:22}},
 {id:'standing-hoe',image:'standingHoe',rotate:true,x:405,y:839,w:93,h:164,foot:{x:423,y:829,rx:31,ry:12}}
];
export const GROUND_PATCHES=[{x:180,y:395,w:310,h:215,feather:16},{x:260,y:665,w:205,h:190,feather:6}];
export const WATER_SOURCE={x:735,y:466};
export function nearWater(p){return Math.hypot(p.x-WATER_SOURCE.x,p.y-WATER_SOURCE.y)<=48;}
export function propBlocks(p){return FARM_PROPS.some(({id,foot:f})=>{const padded=id==='barrel'||id==='watering-can';return ((p.x-f.x)/(f.rx+(padded?22:0)))**2+((p.y-f.y)/(f.ry+(padded?4:0)))**2<1;});}
export function depthLayers(layers){return layers.slice().sort((a,b)=>a.depth-b.depth);}
function intersects(r,v,w,h){return r.x<v.x+w/v.scale&&r.x+r.w>v.x&&r.y<v.y+h/v.scale&&r.y+r.h>v.y;}
export function propAssetsForView(v,w,h){const keys=FARM_PROPS.filter(p=>intersects({x:p.x-p.w/2,y:p.y-p.h,w:p.w,h:p.h},v,w,h)).map(p=>p.image);if(keys.length)keys.push('grass');if(GROUND_PATCHES.some(p=>intersects(p,v,w,h)))keys.push('cleanGround');return [...new Set(keys)];}
