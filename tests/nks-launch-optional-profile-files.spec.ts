import {beforeEach,describe,it,expect,vi} from 'vitest';
const m=vi.hoisted(()=>({session:vi.fn(),profile:vi.fn(),metadata:vi.fn(),fetch:vi.fn()}));
vi.mock('@/server/auth/session',()=>({requireSession:m.session,getSupabaseRestUrl:(path:string)=>'https://example.test'+path}));
vi.mock('@/server/services/profiles',()=>({getProfile:m.profile,insertProfileFileMetadata:m.metadata}));
vi.mock('@/server/security/provider-fetch',()=>({providerFetch:m.fetch}));
vi.mock('next/cache',()=>({revalidatePath:vi.fn()}));
import {uploadProfileFileAction} from '@/server/actions/files/upload-profile-file';
import {isLearnerProfileComplete} from '@/lib/auth/learner-profile-completion';
beforeEach(()=>{vi.resetAllMocks();m.session.mockResolvedValue({user:{id:'learner'},accessToken:'verified'});});
describe('Optional profile documents',()=>{
 it('allows a certificate name alone to complete the profile without a CV, photo, phone or country',()=>{expect(isLearnerProfileComplete({certificate_name:'Learner name'} as Parameters<typeof isLearnerProfileComplete>[0])).toBe(true);});
 it('does not upload an orphan private file before the profile exists',async()=>{m.profile.mockResolvedValue(null);const form=new FormData();form.set('profile_file',new File(['private CV'],'cv.pdf',{type:'application/pdf'}));expect(await uploadProfileFileAction({},form)).toEqual({error:expect.stringContaining('optional')});expect(m.fetch).not.toHaveBeenCalled();expect(m.metadata).not.toHaveBeenCalled();});
});
