// The audio element lives outside the changing map, so travel never reloads it.
const frame=document.querySelector('#map');
export function mapURL(map,base,from=''){const url=new URL(map==='farm'?'./experiments/farming/':'./village.html',base);url.searchParams.set('embed','1');url.searchParams.set('v','7');if(from)url.searchParams.set('from',from);return url.href;}
function show(map,from=''){frame.title=map==='farm'?'カラくまちゃんの畑':'カラくまちゃんの村';frame.src=mapURL(map,location.href,from);}
window.__islandNavigate=map=>{if(!['farm','village'].includes(map))return;const from=map==='farm'?'village':'farm',url=new URL(location.href);url.searchParams.set('map',map);url.searchParams.set('from',from);history.pushState({map},'',url);show(map,from);};
window.addEventListener('popstate',()=>{const p=new URLSearchParams(location.search);show(p.get('map')==='farm'?'farm':'village',p.get('from')||'');});
const initial=new URLSearchParams(location.search);show(initial.get('map')==='farm'?'farm':'village',initial.get('from')||'');

function fitViewport(){document.documentElement.style.setProperty('--shell-height',`${window.visualViewport?.height||window.innerHeight}px`);}window.addEventListener('resize',fitViewport);window.visualViewport?.addEventListener('resize',fitViewport);fitViewport();
