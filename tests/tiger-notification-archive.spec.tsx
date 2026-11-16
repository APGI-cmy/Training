import {describe,it,expect,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {notificationInInbox,notificationView,notificationHistoryLink,countNotifications,type PersonalNotification} from '@/lib/notifications';
const n=(x:Partial<PersonalNotification>={}):PersonalNotification=>({id:'notice',message:'Update',kind:'platform_event',created_at:'2026-11-15',read_at:null,acknowledged_at:null,target_path:'/notifications',response_type:'read',pending:false,actor_user_id:null,...x});
describe('Automatic notification closure and history',()=>{
 it('archives read updates while retaining unread updates',()=>{expect(notificationInInbox(n())).toBe(true);expect(notificationInInbox(n({read_at:'today'}))).toBe(false);});
 it('keeps read actions visible until the actual workflow response is complete',()=>{expect(notificationInInbox(n({response_type:'action',read_at:'today',pending:true}))).toBe(true);expect(notificationInInbox(n({response_type:'action',read_at:'today',pending:false}))).toBe(false);});
 it('archives completed requests even without inventing an unread receipt',()=>{const row=n({response_type:'action',pending:false});expect(notificationInInbox(row)).toBe(false);expect(row.read_at).toBeNull();expect(countNotifications([row])).toEqual({unread:0,responses:0,attention:0});});
 it('keeps acknowledgement requests until acknowledged and brings reopened requests back',()=>{const row=n({response_type:'acknowledge',read_at:'today',pending:true});expect(notificationInInbox(row)).toBe(true);expect(notificationInInbox(n({...row,pending:false,acknowledged_at:'later'}))).toBe(false);expect(notificationInInbox({...row,response_type:'action',pending:true})).toBe(true);});
 it('defaults to an active inbox and keeps explicit audit views available',()=>{expect(notificationView()).toBe('inbox');expect(notificationView('unknown')).toBe('inbox');expect(notificationView('history')).toBe('history');expect(notificationView('all')).toBe('all');expect(notificationHistoryLink('uuid')).toContain('view=all&notification=uuid#notification-uuid');});
 it('does not count archived unread requests in the badge',()=>{expect(countNotifications([n({response_type:'action',pending:false}),n({read_at:'today'}),n(),n({response_type:'action',read_at:'today',pending:true})])).toEqual({unread:1,responses:1,attention:2});});
});
const mocks=vi.hoisted(()=>({inbox:vi.fn(),destination:vi.fn()}));
vi.mock('@/server/services/notifications',()=>({notificationSession:async()=>({user:{email:'johan.ras@apginc.ca'}}),notificationInbox:mocks.inbox,notificationDestination:mocks.destination}));
vi.mock('@/components/notifications/NotificationInboxRefresh',()=>({NotificationInboxRefresh:()=>null}));
vi.mock('@/components/notifications/NotificationControls',()=>({NotificationControls:()=>null}));
vi.mock('@/components/notifications/NotificationSentMessages',()=>({NotificationSentMessages:()=>null}));
import Page from '../app/(learner)/notifications/page';
describe('Inbox page and archived references',()=>{
 it('renders a clear inbox without deleting history',async()=>{mocks.inbox.mockResolvedValue({items:[],receipts:[],total:0,unread:0,responses:0,attention:0});const html=renderToStaticMarkup(await Page({searchParams:Promise.resolve({})}));expect(mocks.inbox.mock.calls.at(-1)?.[1]).toBe('inbox');expect(html).toContain('Your inbox is clear');expect(html).toContain('view=history');expect(html).not.toContain('All updates');});
 it('retrieves an owned archived reference even beyond its history page',async()=>{mocks.inbox.mockResolvedValue({items:[],receipts:[],total:0,unread:0,responses:0,attention:0});const id='11111111-1111-4111-8111-111111111111';mocks.destination.mockResolvedValue(n({id,read_at:'2026-11-15'}));const html=renderToStaticMarkup(await Page({searchParams:Promise.resolve({view:'all',notification:id})}));expect(html).toContain('Archived automatically');expect(html).toContain(`notification-${id}`);});
});

