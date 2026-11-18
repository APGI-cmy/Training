import {NextRequest,NextResponse} from 'next/server';
import {validId} from '@/lib/company-structure';
import {parseWalletPurchase} from '@/lib/wallet-purchase-input';
import {publicWalletQuote} from '@/lib/category-wallet-public';
import {quoteStructure} from '@/lib/pricing-structures';
import {shopAccess,publishedStructure} from '@/server/services/pricing-structures';
import {calculatorRpc} from '@/server/services/course-calculator';
export async function GET(request:NextRequest){try{
 const p=request.nextUrl.searchParams,a=await shopAccess(validId(p.get('company')??'')),course=p.get('course')??'';
 if(course.length>120)throw Error('Invalid course reference.');const s=await publishedStructure(a.company.id,course);if(!s?.document.categoryWallet)throw Error('No approved category wallet is published.');
 const learners=Number(p.get('learners')??1);if(!a.manager&&learners!==1)throw Error('Company manager authority is required for multiple places.');
 const purchase=parseWalletPurchase(p.get('credits'),p.get('categories'),s.document.categoryWallet),q=quoteStructure(s.document,'wallet',learners,purchase);
 if(!await calculatorRpc<boolean>('cc_can_shop',{p_actor:a.session.user.id,p_company:a.company.id,p_route:'wallet',p_courses:q.courses}))throw Error('These categories are not available to this account.');
 return NextResponse.json(publicWalletQuote(s.document,learners,purchase),{headers:{'Cache-Control':'private, no-store'}});
}catch{return NextResponse.json({error:'The wallet quote is unavailable. Check category permissions, credit value and learner capacity.'},{status:400,headers:{'Cache-Control':'private, no-store'}});}}
