import {beforeEach,describe,it,expect,vi} from 'vitest';
import {NextRequest} from 'next/server';
const m=vi.hoisted(()=>({access:vi.fn(),published:vi.fn(),rpc:vi.fn()}));
vi.mock('@/server/services/pricing-structures',()=>({shopAccess:m.access,publishedStructure:m.published}));
vi.mock('@/server/services/course-calculator',()=>({calculatorRpc:m.rpc}));
import {GET} from '../app/api/category-wallet-quote/route';
import {defaultStructure} from '@/lib/pricing-structures';
import {withCategoryWallet} from '@/lib/category-wallet';
const company='11111111-1111-4111-8111-111111111111';
const cost={id:'cost',currency:'USD',monthlyPoolCents:76035,activeLearners:30,newEnrolments:10,variableCents:0,processorBps:370,processorFixedCents:22,source:'Private cost evidence',sourceDraftId:'private-source',rates:{public:250,industry:750,client:1500},floors:{public:500,industry:500,client:500},margins:{public:2500,industry:4000,client:5500}};
const course={id:'credit',editionId:'edition',courseId:'vpshr-level-0',title:'VPSHR Level 0',ownerId:company,ownerIsApgi:true,scope:'public' as const,hours:8,minimumCents:0,currency:'USD',evidence:'Internal provenance'};
function request(extra=''){return new NextRequest(`https://example.test/api/category-wallet-quote?company=${company}&course=vpshr-level-0&credits=1000000&categories=%5B%22public%22%5D&learners=1${extra}`);}
beforeEach(()=>{vi.resetAllMocks();m.access.mockResolvedValue({company:{id:company},session:{user:{id:'actor'}},manager:false});m.published.mockResolvedValue({document:withCategoryWallet(defaultStructure(cost,[course],{id:company,isApgi:true}),[course])});m.rpc.mockResolvedValue(true);});
describe('Buyer category-wallet quote boundary',()=>{
 it('returns a private uncached calculation without raw costs, source evidence or recipient shares',async()=>{const r=await GET(request()),body=await r.json();expect(r.status).toBe(200);expect(r.headers.get('Cache-Control')).toBe('private, no-store');expect(body.faceCents).toBe(1000000);expect(JSON.stringify(body)).not.toContain('private-source');expect(JSON.stringify(body)).not.toContain('ownerBps');expect(body.courses[0].title).toBe('VPSHR Level 0');});
 it('requires sign-in before loading a structure',async()=>{m.access.mockRejectedValue(Error('Sign in'));expect((await GET(request())).status).toBe(400);expect(m.published).not.toHaveBeenCalled();expect(m.rpc).not.toHaveBeenCalled();});
 it('does not disclose an unavailable private category',async()=>{m.rpc.mockResolvedValue(false);const r=await GET(request());expect(r.status).toBe(400);expect(JSON.stringify(await r.json())).not.toContain('VPSHR');});
 it('allows only company managers to purchase multiple learner places',async()=>{const r=await GET(new NextRequest(`https://example.test/api/category-wallet-quote?company=${company}&course=vpshr-level-0&credits=1000000&categories=%5B%22public%22%5D&learners=2`));expect(r.status).toBe(400);expect(m.rpc).not.toHaveBeenCalled();});
 it('rejects unapproved categories and out-of-range credit values before any cart action',async()=>{const r=await GET(new NextRequest(`https://example.test/api/category-wallet-quote?company=${company}&course=vpshr-level-0&credits=1&categories=%5B%22client%22%5D&learners=1`));expect(r.status).toBe(400);expect(m.rpc).not.toHaveBeenCalled();});
});
