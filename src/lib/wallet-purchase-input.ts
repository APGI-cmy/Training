import type {CategoryWallet,WalletPurchase} from './category-wallet';
export function parseWalletPurchase(face:unknown,categories:unknown,approved:CategoryWallet):WalletPurchase{
 const value=face===null||face===undefined?approved.defaultFaceCents:Number(face);
 let chosen=approved.categories;if(categories!==null&&categories!==undefined){if(typeof categories!=='string'||categories.length>100)throw Error('Choose valid wallet categories.');chosen=JSON.parse(categories);}
 if(!Number.isSafeInteger(value)||value<approved.minFaceCents||value>approved.maxFaceCents||value%100||!Array.isArray(chosen)||!chosen.length||new Set(chosen).size!==chosen.length||chosen.some(c=>!approved.categories.includes(c)))throw Error('Choose purchasing credits and categories within the approved wallet terms.');
 return {faceCents:value,categories:approved.categories.filter(c=>chosen.includes(c))};
}
