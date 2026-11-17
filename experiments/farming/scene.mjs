import {scaleFor,characterHeight} from '../../model.mjs';
import {COLS,nextGrowth,formatRemaining} from './farm.mjs?v=7';
// Source art uses larger pixels than the existing world; normalize it before applying the shared camera.
export const SOURCE_SCALE=.65;
export const WORLD={width:1536,height:1024};
export const SPAWN={x:735,y:850};
export const GRID={x:610,y:520,w:126,h:92,gap:90};
export function plotRect(i){return {x:GRID.x+(i%COLS)*GRID.w+Math.floor((i%COLS)/2)*GRID.gap,y:GRID.y+Math.floor(i/COLS)*GRID.h,w:GRID.w,h:GRID.h};}
export function plantingPoint(i){const r=plotRect(i);return {x:r.x+r.w/2,y:r.y+r.h*.52};}
export const CARROT_FRAMES=[
 {x:45,y:155,w:150,h:95,anchorX:118,anchorY:239,scale:.7},
 {x:20,y:390,w:200,h:175,anchorX:118,anchorY:551,scale:.75},
 {x:0,y:685,w:229,h:230,anchorX:118,anchorY:909,scale:.75}
];
export function cropPlacement(i,stage){const s=CARROT_FRAMES[stage-1],p=plantingPoint(i);return {...s,dx:p.x-(s.anchorX-s.x)*s.scale,dy:p.y-(s.anchorY-s.y)*s.scale,dw:s.w*s.scale,dh:s.h*s.scale,ground:p};}
const props=[{x:266,y:492,rx:78,ry:86},{x:411,y:559,rx:49,ry:30},{x:349,y:796,rx:80,ry:43},{x:195,y:778,rx:75,ry:34},{x:1395,y:418,rx:99,ry:40},{x:101,y:369,rx:62,ry:35}];
export function canWalk(p){
 if(p.x<65||p.x>1470||p.y<270||p.y>980)return false;
 // Reserve each two-column bed as a whole, including future plots. The 90px aisle is never cultivated.
 for(let pair=0;pair<2;pair++){const r=plotRect(pair*2);if(p.x>r.x-14&&p.x<r.x+r.w*2+14&&p.y>r.y-12&&p.y<r.y+r.h*2+12)return false;}
 return !props.some(o=>((p.x-o.x)/o.rx)**2+((p.y-o.y)/o.ry)**2<1);
}
export function nearestPlot(p){let index=null,best=Infinity;for(let i=0;i<8;i++){const c=plantingPoint(i),d=Math.hypot(c.x-p.x,c.y-p.y);if(d<best){best=d;index=i;}}return best<=133?index:null;}
export const WATER_SOURCE={x:266,y:527};
export function nearWater(p){return Math.hypot(p.x-WATER_SOURCE.x,p.y-WATER_SOURCE.y)<=145;}
export function nextAction(cell,now=Date.now()){if(cell.cleared===false)return {tool:'clear',label:'すごいクワで開墾'};if(!cell.tilled)return {tool:'hoe',label:'ここを耕す'};if(!cell.plant)return {tool:'seed',label:'たねをまく'};if(cell.plant.withered)return {tool:'remove',label:'枯れた野菜を片づける'};if(cell.plant.stage===3)return {tool:'grow',label:'収穫する'};if(!cell.plant.watered)return {tool:'water',label:'みずをまく'};const phase=nextGrowth(cell.plant,now);return {tool:null,label:phase?`${phase.label} あと${formatRemaining(phase.ms)}`:'育つのを待とう',waiting:true};}
export function returningToVillage(p){return p.y>=965&&p.x>=610&&p.x<=850;}
function clear(a,b){const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/8));for(let i=0;i<=n;i++)if(!canWalk({x:a.x+(b.x-a.x)*i/n,y:a.y+(b.y-a.y)*i/n}))return false;return true;}
export function route(from,to){
 if(!canWalk(from)||!canWalk(to))return [];if(clear(from,to))return [to];
 const step=22,cols=70,rows=46,id=(x,y)=>y*cols+x,pos=n=>({x:(n%cols)*step,y:Math.floor(n/cols)*step});
 function nearest(p){let best=null,d=Infinity;for(let y=Math.max(0,Math.round(p.y/step)-2);y<=Math.min(rows-1,Math.round(p.y/step)+2);y++)for(let x=Math.max(0,Math.round(p.x/step)-2);x<=Math.min(cols-1,Math.round(p.x/step)+2);x++){const n=id(x,y),v=pos(n),dd=Math.hypot(v.x-p.x,v.y-p.y);if(dd<d&&canWalk(v)&&clear(p,v)){best=n;d=dd}}return best;}
 const start=nearest(from),goal=nearest(to);if(start===null||goal===null)return [];const queue=[start],parents=new Map([[start,null]]);let found=false;
 for(let q=0;q<queue.length;q++){const n=queue[q];if(n===goal){found=true;break;}const x=n%cols,y=Math.floor(n/cols);for(const [dx,dy] of [[0,1],[1,0],[0,-1],[-1,0]]){const xx=x+dx,yy=y+dy;if(xx<0||xx>=cols||yy<0||yy>=rows)continue;const nn=id(xx,yy);if(!parents.has(nn)&&canWalk(pos(nn))&&clear(pos(n),pos(nn))){parents.set(nn,n);queue.push(nn);}}}
 if(!found)return [];const raw=[];for(let n=goal;n!==null;n=parents.get(n))raw.push(pos(n));raw.reverse();raw.push(to);const result=[];let anchor=from,i=0;while(i<raw.length){let j=i;while(j+1<raw.length&&clear(anchor,raw[j+1]))j++;result.push(raw[j]);anchor=raw[j];i=j+1;}return result;
}

export function cameraView(player,width,height){const scale=Math.max(scaleFor(width,height)*SOURCE_SCALE,width/WORLD.width,height/WORLD.height);return {scale,x:Math.max(0,Math.min(WORLD.width-width/scale,player.x-width/scale/2)),y:Math.max(0,Math.min(WORLD.height-height/scale,player.y-height*.7/scale)),characterPixels:characterHeight(width,height)};}
export function actionPosition(player,view,width,height,buttonWidth=150,buttonHeight=54){const margin=12;return {x:Math.max(buttonWidth/2+margin,Math.min(width-buttonWidth/2-margin,(player.x-view.x)*view.scale)),y:Math.max(margin,Math.min(height-buttonHeight-16,(player.y-view.y)*view.scale+16))};}
