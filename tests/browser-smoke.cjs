// Optional visual checks: use an already-installed Playwright and Chromium.
// No package download, account, cloud API, or production data is used.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=process.env.TEST_URL||'http://127.0.0.1:5194/';
const output=process.env.TEST_OUTPUT||'/tmp/karakuma-v6-checks';fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 try{
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install();
 await page.goto(base+'?map=farm&v=6');let f=page.frameLocator('#map');await f.locator('#loading').waitFor({state:'hidden'});
 await page.screenshot({path:path.join(output,'farm-initial-390.png')});
 assert.equal(await f.locator('#tutorial').textContent(),'左下でクワを持って、畑のそばで耕そう！');
 await f.locator('#equip-hoe').click();await f.locator('#farm').focus();await page.keyboard.down('ArrowUp');await page.waitForTimeout(850);await page.keyboard.up('ArrowUp');
 await f.locator('#action').filter({hasText:'ここを耕す'}).click();assert.match(await f.locator('#hoe-uses').textContent(),/9回/);await page.waitForTimeout(800);
 await f.locator('.settings summary').click();await f.locator('#colorful-preview').check();await f.locator('.settings summary').click();
 await f.locator('#action').filter({hasText:'たねをまく'}).click();await f.locator('#equip-watering_can').click();assert.equal(await f.locator('#equip-hoe').getAttribute('aria-pressed'),'false');
 await f.locator('#action').filter({hasText:'みずをまく'}).click();assert.equal(await f.locator('#water-meter').textContent(),'水 2/3');assert.match(await f.locator('#action').textContent(),/芽が出るまで あと\d秒/);
 await page.clock.fastForward(5100);assert.match(await f.locator('#action').textContent(),/育ち中になるまで あと\d分/);
 await page.clock.fastForward(120000);assert.match(await f.locator('#action').textContent(),/収穫まで あと\d分/);
 await page.clock.fastForward(180000);await f.locator('#action').filter({hasText:'収穫する'}).waitFor();
 await page.screenshot({path:path.join(output,'farm-ripe-390.png')});
 await f.locator('#action').click();await page.waitForTimeout(900);assert.equal(await f.locator('#harvest-summary').textContent(),'収穫 1こ');
 await f.locator('#bag').click();assert.equal(await f.locator('.item-card').filter({hasText:'カラフルなにんじん'}).count(),1);await page.screenshot({path:path.join(output,'farm-items-390.png')});
 await f.locator('.item-card').filter({hasText:'じょうろ'}).getByRole('button',{name:'しまう',exact:true}).click();assert.equal(await f.locator('#equip-watering_can').getAttribute('aria-pressed'),'false');await f.locator('#box-close').click();
 const sound=page.locator('#bgm');await page.waitForFunction(()=>!document.querySelector('#bgm').paused);const before=await sound.evaluate(a=>a.currentTime);const audio=await sound.elementHandle();
 await f.locator('#farm').focus();await page.keyboard.down('ArrowDown');await page.waitForTimeout(2200);await page.keyboard.up('ArrowDown');await page.frameLocator('#map').locator('#walk').waitFor();
 assert.equal(await audio.evaluate(a=>a.isConnected),true);assert.ok(await sound.evaluate(a=>a.currentTime)>before);assert.equal(await sound.evaluate(a=>a.paused),false);
 await page.frameLocator('#map').locator('#music').click();assert.equal(await sound.evaluate(a=>a.paused),true);
 await page.frameLocator('#map').locator('#walk').focus();await page.keyboard.down('ArrowUp');await page.waitForTimeout(850);await page.keyboard.up('ArrowUp');f=page.frameLocator('#map');await f.locator('#farm').waitFor();await f.locator('#loading').waitFor({state:'hidden'});assert.equal(await f.locator('#water-meter').textContent(),'水 2/3');assert.equal(await f.locator('#music').getAttribute('aria-pressed'),'false');
 await f.locator('.settings summary').click();await f.locator('#trial-tools').click();await f.locator('.settings summary').click();await f.locator('#equip-super_hoe').click();
 await f.locator('#farm').focus();await page.keyboard.down('ArrowRight');await page.waitForTimeout(2200);await page.keyboard.up('ArrowRight');await page.keyboard.down('ArrowUp');await page.waitForTimeout(850);await page.keyboard.up('ArrowUp');
 await f.locator('#action').filter({hasText:'すごいクワで開墾'}).click();await page.waitForTimeout(800);assert.equal(await f.locator('#equip-super_hoe').isVisible(),false);assert.match(await f.locator('#action').textContent(),/ここを耕す/);
 await page.screenshot({path:path.join(output,'farm-cleared-390.png')});
 for(const [width,height] of [[320,568],[375,500],[390,844],[430,932],[844,390]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(100);
  const dimensions=await f.locator('.farm-app').evaluate(e=>({width:e.clientWidth,height:e.clientHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,viewportWidth:innerWidth,viewportHeight:innerHeight}));
  assert.ok(dimensions.scrollWidth<=dimensions.viewportWidth);assert.ok(dimensions.scrollHeight<=dimensions.viewportHeight);assert.ok(dimensions.width<=width&&dimensions.height<=height);
  const equipment=await f.locator('#equipment').boundingBox();assert.ok(equipment.x>=0&&equipment.y>=0&&equipment.x+equipment.width<=width+1&&equipment.y+equipment.height<=height+1);await page.screenshot({path:path.join(output,`farm-${width}x${height}.png`)});
 }
 assert.deepEqual(errors,[]);await context.close();
 // Delayed distant scenery must not delay the initial village screen.
 const lazy=await browser.newContext({viewport:{width:390,height:844}}),village=await lazy.newPage();let release;
 const barrier=new Promise(r=>release=r);await village.route('**/tile-west-soft.png',async route=>{await barrier;await route.continue();});
 await village.goto(base,{waitUntil:'domcontentloaded'});await village.frameLocator('#map').locator('#walk[data-ready=true]').waitFor();await village.screenshot({path:path.join(output,'village-near-first-390.png')});release();await lazy.close();
 fs.writeFileSync(path.join(output,'result.json'),JSON.stringify({passed:true,errors,checks:['new farm and tools','seed/water/growth boundaries','colorful harvest inventory','BGM element and time survive travel','BGM OFF and save survive return','clear land with one-use super hoe','five viewport sizes','village starts before distant image'],output},null,2));console.log('Browser checks passed:',output);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
