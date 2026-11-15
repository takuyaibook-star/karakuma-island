// Default ON. Respect browser autoplay policy; retry on the first real gesture.
export function setupMusic(audio,button,notify,focusCanvas){
 let wanted=true,attempt=0,pending=false,waiting=true;
 audio.volume=.22;audio.loop=true;
 function render(){button.setAttribute('aria-pressed',String(wanted));button.setAttribute('aria-label',wanted?'BGMを止める':'BGMを再生');button.title=wanted?(waiting?'BGM ON・最初の操作で再生':'BGMを止める'):'BGMを再生';button.classList.toggle('playing',wanted);button.dataset.state=wanted?(waiting?'waiting':'playing'):'off';}
 async function play(){if(!wanted||document.hidden||pending)return;const token=++attempt;pending=true;try{await audio.play();if(token!==attempt){if(!wanted)audio.pause();return;}waiting=false;if(!wanted||document.hidden)audio.pause();render();}catch(error){if(token!==attempt)return;if(error.name==='NotAllowedError'||error.name==='AbortError'){waiting=true;render();return;}wanted=false;render();notify('BGMを再生できませんでした。もう一度♪を押してください');}finally{pending=false;}}
 button.addEventListener('click',()=>{wanted=!wanted;if(wanted){waiting=audio.paused;render();play();}else{attempt++;pending=false;waiting=false;audio.pause();render();}focusCanvas();});
 function activate(event){if(event.target.closest?.('#music'))return;if(wanted&&audio.paused)play();}
 for(const event of ['pointerdown','pointerup','keydown'])document.addEventListener(event,activate,{capture:true});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){attempt++;pending=false;audio.pause();}else if(wanted)play();});
 audio.addEventListener('error',()=>{wanted=false;attempt++;pending=false;render();notify('BGMを読み込めませんでした');});
 render();play();
}
