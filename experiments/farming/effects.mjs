// Local, synthesized effects. No remote audio service or network dependency.
export const SOUND_SECONDS={hoe:.22,seed:.19,water:.75,harvest:.28};
export function makeSound(kind,sampleRate=22050,random=Math.random){
 const duration=SOUND_SECONDS[kind];if(!duration)return new Float32Array(0);
 const samples=new Float32Array(Math.ceil(duration*sampleRate));let low=0;
 for(let i=0;i<samples.length;i++){const t=i/sampleRate,noise=random()*2-1;low+=.13*(noise-low);let v=0;
  if(kind==='hoe'){const e=Math.exp(-t*25)+.45*Math.exp(-Math.max(0,t-.075)*40)*Number(t>.075);v=(low*.8+Math.sin(t*2*Math.PI*93)*.14)*e*.65;}
  if(kind==='seed'){for(const hit of [0,.055,.11])if(t>=hit){const d=t-hit;v+=(low*.35+Math.sin(d*2*Math.PI*570)*.08)*Math.exp(-d*100)*.7;}}
  if(kind==='water'){const envelope=Math.min(1,t/.03)*Math.min(1,(duration-t)/.1),pulse=.3+.7*Math.max(0,Math.sin(t*Math.PI*14));v=low*.2*envelope*pulse;for(const hit of [0,.09,.18,.29,.4,.52,.63])if(t>=hit){const d=t-hit;v+=Math.sin(2*Math.PI*(270*d-220*d*d))*Math.exp(-d*32)*.11*envelope;}}
  if(kind==='harvest')v=(Math.sin(2*Math.PI*(190*t+520*t*t))*.17+low*.16)*Math.exp(-t*19);
  samples[i]=Math.max(-.65,Math.min(.65,v));
 }return samples;
}
export function createEffects(enabled=()=>true){let context=null;return {play(kind){if(!enabled())return;try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;context??=new Audio();if(context.state==='suspended')context.resume().catch(()=>{});const data=makeSound(kind,context.sampleRate),buffer=context.createBuffer(1,data.length,context.sampleRate);buffer.getChannelData(0).set(data);const source=context.createBufferSource();source.buffer=buffer;source.connect(context.destination);source.start();}catch{/* Sound must never block farming. */}}};}
export const HARVEST_MS=800;
export function harvestPose(from,to,elapsed){const t=Math.max(0,Math.min(1,elapsed/HARVEST_MS));if(t<.22){const p=t/.22;return {x:from.x+Math.sin(p*Math.PI*5)*3,y:from.y-p*7,scale:1,alpha:1,tilt:Math.sin(p*Math.PI*4)*.035,done:false};}const p=(t-.22)/.78,e=1-(1-p)**2;return {x:from.x+(to.x-from.x)*e,y:from.y+(to.y-from.y)*e-Math.sin(p*Math.PI)*95,scale:1-.72*p,alpha:p<.75?1:(1-p)/.25,tilt:p*.25,done:t>=1};}
