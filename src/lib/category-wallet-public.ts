import {categoryWalletQuote,type WalletPurchase} from './category-wallet';
import type {PricingStructure} from './pricing-structures';
export function publicWalletQuote(s:PricingStructure,learners:number,purchase:WalletPurchase){
 const q=categoryWalletQuote(s,learners,purchase),f=(q.result as unknown as {walletFunding:{faceCents:number;averageCents:number;estimatedCourses:number;courseEquivalents:number}}).walletFunding;
 return {currency:q.result.currency,totalCents:q.result.totalCents,contentCents:q.result.contentCents,platformCents:q.result.platformCents,processingCents:q.result.buyerProcessingCents,discountBps:q.result.effectiveDiscountBps,scheduledDiscountBps:q.commercial!.scheduledDiscountBps,faceCents:f.faceCents,averageCents:f.averageCents,estimatedCourses:f.estimatedCourses,courseEquivalents:f.courseEquivalents,learners,months:q.input.months,categories:purchase.categories,courses:q.commercial!.lines.map(c=>({title:c.title,scope:c.scope,credits:c.listCents/100,learningCredits:c.learningCredits}))};
}
export type PublicWalletQuote=ReturnType<typeof publicWalletQuote>;
