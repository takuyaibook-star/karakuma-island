import {test} from 'node:test';import assert from 'node:assert/strict';
import {BACKGROUND_TILES,visibleBackground} from '../experiments/farming/background.mjs';
import {cameraView,SPAWN} from '../experiments/farming/scene.mjs';
test('スマホの初期位置は近くの背景2枚だけ。全6枚は原画全域を隙間なく覆う',()=>{const view=cameraView(SPAWN,390,844),near=visibleBackground(view,390,844);assert.equal(near.length,2);assert.ok(near.every(t=>t.key.startsWith('background1_')));assert.equal(BACKGROUND_TILES.length,6);for(let y=0;y<1024;y+=16)for(let x=0;x<1536;x+=16)assert.ok(BACKGROUND_TILES.some(t=>x>=t.x&&x<t.x+t.w&&y>=t.y&&y<t.y+t.h));});
