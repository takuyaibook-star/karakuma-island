import {movePosition} from './terrain.mjs';
export const MAP={width:2172,height:724,roadY:500,minX:60,maxX:2112,startX:803,speed:90};
export function initialState(){return {x:MAP.startX,y:MAP.roadY,cameraX:MAP.startX,cameraY:MAP.roadY,target:null,path:[],distance:0,walkingTime:0,moving:false,direction:1};}
export const clampX=x=>Math.max(MAP.minX,Math.min(MAP.maxX,x));
// Background only: ~6% smaller. Character CSS height stays at the original value.
export function scaleFor(width,height){return Math.max(height/620,width/350);}
export function characterHeight(width,height){return 90*Math.max(height/580,width/330);}
export function cameraBounds(width,scale){const half=width/(2*scale);return {min:half,max:MAP.width-half};}
export function verticalBounds(height,scale){return {min:height*.7/scale,max:MAP.height-height*.3/scale};}
export function advance(state,input,seconds,width,height){
 const dt=Math.max(0,Math.min(.05,seconds)),scale=scaleFor(width,height),next={...state,path:[...(state.path??[])]};
 const vector=typeof input==='number'?{x:input,y:0}:input;let dx=vector?.x??0,dy=vector?.y??0,norm=Math.hypot(dx,dy),distance=MAP.speed*dt;
 if(norm>0){next.target=null;next.path=[];distance*=Math.min(1,norm);}
 else if(next.target!==null){const t=typeof next.target==='number'?{x:next.target,y:next.y}:next.target;dx=t.x-next.x;dy=t.y-next.y;norm=Math.hypot(dx,dy);distance=Math.min(distance,norm);if(norm<.15){next.target=next.path.shift()??null;norm=0;}}
 const p=norm>0?movePosition(next,dx/norm*distance,dy/norm*distance):next;
 const travelled=Math.hypot(p.x-next.x,p.y-next.y);next.x=p.x;next.y=p.y;next.moving=travelled>.001;
 if(next.moving){if(Math.abs(dx)>.01)next.direction=Math.sign(dx);next.distance+=travelled;next.walkingTime+=travelled/MAP.speed;}
 else if(norm>0&&next.target!==null){next.target=null;next.path=[];}
 if(next.target!==null){const t=typeof next.target==='number'?{x:next.target,y:next.y}:next.target;if(Math.hypot(t.x-next.x,t.y-next.y)<.15)next.target=next.path.shift()??null;}
 const limits=cameraBounds(width,scale),v=verticalBounds(height,scale),desiredX=Math.max(limits.min,Math.min(limits.max,next.x)),desiredY=Math.max(v.min,Math.min(v.max,next.y));
 const follow=1-Math.exp(-10*dt);next.cameraX+=(desiredX-next.cameraX)*follow;next.cameraY+=(desiredY-next.cameraY)*follow;next.cameraX=Math.max(limits.min,Math.min(limits.max,next.cameraX));next.cameraY=Math.max(v.min,Math.min(v.max,next.cameraY));
 return next;
}
export function screenToWorld(x,y,state,width,height){const s=scaleFor(width,height);return {x:state.cameraX+(x-width/2)/s,y:state.cameraY+(y-height*.7)/s};}
export function screenToWorldX(x,state,width,height){return clampX(screenToWorld(x,height*.7,state,width,height).x);}
export function areaAt(x){if(x<350)return 'ゲーム街';if(x<560)return '木陰の道';if(x<900)return 'おうちの前';if(x<1120)return '畑への分かれ道';if(x<1390)return '花の散歩道';if(x<1635)return '野音への分かれ道';if(x<1910)return '木漏れ日の道';return 'キノコの森の入口';}
