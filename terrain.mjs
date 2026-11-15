const rectangle=(x,y,w,h)=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
export const walkAreas=[
 rectangle(60,432,1940,78),
 [[60,402],[318,398],[352,422],[352,447],[60,447]],
 [[769,377],[837,377],[855,427],[864,448],[739,448],[754,414]],
 [[596,320],[648,320],[655,411],[668,448],[575,448],[586,405]],
 [[978,325],[1012,325],[1021,414],[1035,447],[956,447],[967,404]],
 [[725,500],[876,500],[860,570],[858,650],[746,650],[729,612],[730,570]],
 [[1433,500],[1565,500],[1542,575],[1545,650],[1432,650],[1426,604]],
 [[1972,440],[2015,417],[2045,384],[2049,335],[2100,335],[2110,416],[2082,470],[2048,504],[1995,510],[1972,510]]
];
export const obstacles=[{name:'ドロップの立て看板',polygon:rectangle(221,391,44,23)}];
export const exits=[{name:'お城',x:623,y:325},{name:'畑',x:995,y:330},{name:'キノコの森',x:2076,y:340},{name:'港',x:802,y:645},{name:'野音',x:1488,y:645}];
export function inside(p,poly){let hit=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if(((a[1]>p.y)!==(b[1]>p.y))&&p.x<(b[0]-a[0])*(p.y-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;}
export function canStand(p){return [[0,0],[-6,0],[6,0],[0,-3],[0,3]].every(([dx,dy])=>{const q={x:p.x+dx,y:p.y+dy};return walkAreas.some(poly=>inside(q,poly))&&!obstacles.some(o=>inside(q,o.polygon));});}
export function movePosition(p,dx,dy){let q={...p};const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/2));for(let i=0;i<steps;i++){const together={x:q.x+dx/steps,y:q.y+dy/steps};if(canStand(together)){q=together;continue;}const x={x:q.x+dx/steps,y:q.y};if(canStand(x))q=x;const y={x:q.x,y:q.y+dy/steps};if(canStand(y))q=y;}return q;}
export function exitAt(p){return exits.find(e=>Math.hypot(e.x-p.x,e.y-p.y)<20);}
