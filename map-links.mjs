export function farmEntryState(state,search=''){if(new URLSearchParams(search).get('from')!=='farm')return state;return {...state,x:995,y:375,cameraX:995,cameraY:375};}
export function destinationForExit(exit,base){return exit?.name==='畑'?new URL('./experiments/farming/?from=village&v=5',base).href:null;}
