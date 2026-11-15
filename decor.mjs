// Physical direction sign beside the farm path, outside the walk surface.
export const forestSign={x:1123,y:424,label:'キノコの森',direction:'right'};
export function drawForestSign(ctx){
 const {x,y,label}=forestSign;ctx.save();ctx.translate(x,y);
 ctx.fillStyle='#c9a274';ctx.strokeStyle='#a88860';ctx.lineWidth=1.3;ctx.beginPath();ctx.roundRect(-3,-39,6,39,2);ctx.fill();ctx.stroke();
 ctx.shadowColor='#755a3220';ctx.shadowBlur=3;ctx.shadowOffsetY=2;ctx.beginPath();ctx.moveTo(-57,-69);ctx.quadraticCurveTo(-61,-69,-61,-65);ctx.lineTo(-61,-43);ctx.quadraticCurveTo(-61,-39,-56,-39);ctx.lineTo(39,-39);ctx.lineTo(57,-54);ctx.lineTo(39,-69);ctx.closePath();
 const wood=ctx.createLinearGradient(0,-69,0,-39);wood.addColorStop(0,'#f5e3bf');wood.addColorStop(1,'#e2c69b');ctx.fillStyle=wood;ctx.fill();ctx.strokeStyle='#b99a70';ctx.stroke();ctx.shadowBlur=0;ctx.shadowOffsetY=0;
 ctx.strokeStyle='#fff4daaa';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-54,-65);ctx.lineTo(36,-65);ctx.moveTo(-53,-43);ctx.lineTo(35,-43);ctx.stroke();
 ctx.fillStyle='#735a3c';ctx.font='700 13px "Hiragino Maru Gothic ProN",system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,-8,-53);ctx.restore();
}
