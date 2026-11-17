// Lossless packaging of the approved meadow: no generated art or visual changes.
const fs=require('node:fs'),path=require('node:path');
const {PNG}=require(process.env.PNGJS_MODULE||'pngjs');
const dir=path.join(__dirname,'../experiments/farming/assets'),source=PNG.sync.read(fs.readFileSync(path.join(dir,'meadow.png')));
for(let row=0;row<2;row++)for(let col=0;col<3;col++){
 // One source pixel of overlap prevents seams at fractional camera scales.
 const x=Math.max(0,col*512-1),y=Math.max(0,row*512-1),width=Math.min(source.width,(col+1)*512+1)-x,height=Math.min(source.height,(row+1)*512+1)-y;
 const tile=new PNG({width,height});PNG.bitblt(source,tile,x,y,width,height,0,0);
 fs.writeFileSync(path.join(dir,`meadow-${col}-${row}-v1.png`),PNG.sync.write(tile));
}
console.log('Prepared six lossless 512px tiles; original meadow.png retained');
