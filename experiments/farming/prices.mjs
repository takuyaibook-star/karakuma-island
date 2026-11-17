// Unit prices in coins, keyed by the same separate normal/colorful item IDs.
// null means undecided, not a free item. No wallet, sale, or inventory mutation here.
export const VEGETABLE_PRICES=Object.freeze({
 carrot:5,
 carrot_colorful:null,
 cabbage:null,
 cabbage_colorful:null,
 pumpkin:null,
 pumpkin_colorful:null,
 watermelon:null,
 watermelon_colorful:null
});
export function getVegetablePrice(itemId){
 return Object.prototype.hasOwnProperty.call(VEGETABLE_PRICES,itemId)?VEGETABLE_PRICES[itemId]:null;
}
