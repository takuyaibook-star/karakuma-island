import {test} from 'node:test';import assert from 'node:assert/strict';
import {ITEMS} from '../experiments/farming/items.mjs';
import {VEGETABLE_PRICES,getVegetablePrice} from '../experiments/farming/prices.mjs';
test('通常にんじんは5コイン。全野菜の通常/カラフルで独立した単価を設定可能',()=>{const vegetableIds=Object.values(ITEMS).filter(i=>i.kind==='vegetable').map(i=>i.id).sort();assert.deepEqual(Object.keys(VEGETABLE_PRICES).sort(),vegetableIds);assert.equal(getVegetablePrice('carrot'),5);for(const id of vegetableIds.filter(id=>id!=='carrot'))assert.equal(getVegetablePrice(id),null);});
test('未設定/不明の価格を0コインと扱わず、価格参照が持ち物を変えない',()=>{const stock={carrot:3,carrot_colorful:1};const before={...stock};assert.equal(getVegetablePrice('hoe'),null);assert.equal(getVegetablePrice('toString'),null);assert.equal(getVegetablePrice('unknown'),null);for(const id of Object.keys(stock))getVegetablePrice(id);assert.deepEqual(stock,before);});
