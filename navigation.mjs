import {canStand} from './terrain.mjs';
const world={width:2172,height:724};
const STEP=8,COLS=Math.floor(world.width/STEP)+1,ROWS=Math.floor(world.height/STEP)+1;
const cells=new Map();
const position=id=>({x:(id%COLS)*STEP,y:Math.floor(id/COLS)*STEP});
function free(id){if(!cells.has(id))cells.set(id,canStand(position(id)));return cells.get(id);}
export function clearSegment(a,b){const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/2));for(let i=0;i<=n;i++)if(!canStand({x:a.x+(b.x-a.x)*i/n,y:a.y+(b.y-a.y)*i/n}))return false;return true;}
function nearest(p,from=null){let best=null,distance=56;const cx=Math.round(p.x/STEP),cy=Math.round(p.y/STEP);for(let y=Math.max(0,cy-7);y<=Math.min(ROWS-1,cy+7);y++)for(let x=Math.max(0,cx-7);x<=Math.min(COLS-1,cx+7);x++){const id=y*COLS+x,q=position(id),d=Math.hypot(q.x-p.x,q.y-p.y);if(d<distance&&free(id)&&(!from||clearSegment(from,q))){best=id;distance=d;}}return best;}
class Heap {
 constructor(){this.values=[];}
 push(item){const a=this.values;a.push(item);let i=a.length-1;while(i>0){const p=(i-1)>>1;if(a[p].score<=item.score)break;a[i]=a[p];i=p;}a[i]=item;}
 pop(){const a=this.values,first=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let child=i*2+1;if(child+1<a.length&&a[child+1].score<a[child].score)child++;if(last.score<=a[child].score)break;a[i]=a[child];i=child;}a[i]=last;}return first;}
 get length(){return this.values.length;}
}
export function findPath(from,to){
 if(!canStand(from)||!Number.isFinite(to.x)||!Number.isFinite(to.y))return [];
 if(canStand(to)&&clearSegment(from,to))return [{...to}];
 const begin=nearest(from,from),goal=nearest(to);if(begin===null||goal===null)return [];
 const target=position(goal),cost=new Map([[begin,0]]),parents=new Map(),closed=new Set(),heap=new Heap();
 heap.push({id:begin,score:Math.hypot(position(begin).x-target.x,position(begin).y-target.y)});
 let end=null;
 while(heap.length){const {id}=heap.pop();if(closed.has(id))continue;if(id===goal){end=id;break;}closed.add(id);const p=position(id),cx=id%COLS,cy=Math.floor(id/COLS);
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){const x=cx+dx,y=cy+dy;if(x<0||x>=COLS||y<0||y>=ROWS)continue;const next=y*COLS+x;if(closed.has(next)||!free(next))continue;
   // Both side cells AND the entire edge must be clear: never cut solid corners.
   if(dx&&dy&&(!free(cy*COLS+x)||!free(y*COLS+cx)))continue;
   const q=position(next);if(!clearSegment(p,q))continue;
   const nextCost=cost.get(id)+Math.hypot(dx,dy)*STEP;if(nextCost>=(cost.get(next)??Infinity))continue;
   cost.set(next,nextCost);parents.set(next,id);heap.push({id:next,score:nextCost+Math.hypot(q.x-target.x,q.y-target.y)});
  }
 }
 if(end===null)return [];
 const raw=[];for(let id=end;id!==undefined;id=parents.get(id))raw.push(position(id));raw.reverse();
 const path=[];let anchor=from,index=0;
 while(index<raw.length){let next=index;while(next+1<raw.length&&next<index+12&&clearSegment(anchor,raw[next+1]))next++;path.push(raw[next]);anchor=raw[next];index=next+1;}
 if(canStand(to)&&clearSegment(anchor,to))path.push({...to});
 return path;
}
