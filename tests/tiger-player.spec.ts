import {describe,it,expect,vi} from 'vitest';
import {attachTigerPlayer} from '@/lib/tiger-player';
import {emptyTigerProgress,type TigerPolicy} from '@/lib/tiger-progression';

describe('Native Tiger evidence save recovery',()=>{
 it('reports failed flushes to the caller, retries later saves, and restores the preceding connector',async()=>{
  const previous={register:vi.fn()},status=vi.fn();
  const host={ispringPresentationConnector:previous,setInterval:vi.fn(()=>1),clearInterval:vi.fn()} as unknown as Window;
  const frame={style:{visibility:''}} as unknown as HTMLIFrameElement;
  const initial=emptyTigerProgress();
  const save=vi.fn().mockRejectedValueOnce(Error('offline')).mockResolvedValue(initial);
  const adapter=attachTigerPlayer({host,frame,policy:{duration:100} as TigerPolicy,initial,save,status,adapterReady:vi.fn()});
  await expect(adapter.flush()).rejects.toThrow('offline');
  expect(status).toHaveBeenCalledWith(expect.stringContaining('could not be saved'));
  await expect(adapter.flush()).resolves.toEqual(initial);
  expect(save).toHaveBeenCalledTimes(2);
  adapter.dispose();
  expect((host as unknown as {ispringPresentationConnector:unknown}).ispringPresentationConnector).toBe(previous);
  await adapter.flush();
  expect(save).toHaveBeenCalledTimes(2);
 });
});

describe('Activity summary close/save race',()=>{
 function fixture(save:Parameters<typeof attachTigerPlayer>[0]['save']){
  let tick=()=>{},ready=false;
  vi.stubGlobal('MutationObserver',class {observe(){}disconnect(){}});
  const ownerDocument={defaultView:{innerWidth:1000,innerHeight:1000,getComputedStyle:()=>({visibility:'visible',display:'block'})}};
  const modal={hidden:true,getAttribute:()=>null},doc={body:{textContent:'TK-LU02-LA01'},getElementById:()=>modal,querySelectorAll:()=>[],location:{origin:'https://training.test'}};
  const frameDoc={defaultView:{location:{origin:'https://training.test'}},querySelectorAll:(tag:string)=>tag==='iframe'?[child]:[],getElementById:()=>null,body:{textContent:''}};
  Object.assign(doc,{defaultView:{location:{origin:'https://training.test'}}});
  const visible={ownerDocument,getBoundingClientRect:()=>({width:800,height:400,top:0,left:0,right:800,bottom:400})};
  const child={...visible,contentDocument:doc},frame={...visible,contentDocument:frameDoc,style:{visibility:''}} as unknown as HTMLIFrameElement;
  const host={location:{origin:'https://training.test'},document:{visibilityState:'visible'},setInterval:(fn:()=>void)=>{tick=fn;return 1;},clearInterval:vi.fn(),setTimeout:vi.fn()} as unknown as Window;
  const policy={unitId:'tiger-telecom-lu-2',duration:43.46,slideCount:5,videoSlide:2,quizSlide:5,activities:[{id:'TK-LU02-LA01',slide:3}]} as TigerPolicy;
  const initial={...emptyTigerProgress(),video_ranges:[[0,43.46]] as [number,number][]};
  const adapter=attachTigerPlayer({host,frame,policy,initial,save,status:vi.fn(),adapterReady:vi.fn(),summaryAllowed:()=>ready});
  const event={addHandler:vi.fn(),removeHandler:vi.fn()},controller={currentSlideIndex:()=>2,gotoSlide:vi.fn(),pause:vi.fn(),slideChangeEvent:()=>event};
  (host as unknown as {ispringPresentationConnector:{register:(p:unknown)=>void}}).ispringPresentationConnector.register({presentation:()=>({slides:()=>({count:()=>5})}),view:()=>({displayObject:()=>({ownerDocument:frameDoc}),playbackController:()=>controller})});
  return {adapter,tick:()=>tick(),acknowledge:()=>{ready=true;},initial};
 }
 it('saves a summary after its sequence acknowledgement even when the modal has already closed',async()=>{
  const save=vi.fn(async()=>({...emptyTigerProgress(),video_ranges:[[0,43.46]] as [number,number][],summaries:['TK-LU02-LA01@3']}));
  const f=fixture(save);f.tick();expect(save).not.toHaveBeenCalled();
  f.acknowledge();f.tick();await Promise.resolve();await Promise.resolve();
  expect(save).toHaveBeenCalledWith({summary:'TK-LU02-LA01@3'});f.adapter.dispose();
 });
 it('retains a rejected summary for explicit retry after the modal has closed',async()=>{
  const save=vi.fn().mockRejectedValueOnce(Error('session expired')).mockResolvedValue({...emptyTigerProgress(),video_ranges:[[0,43.46]],summaries:['TK-LU02-LA01@3']});
  const f=fixture(save);f.acknowledge();f.tick();
  await new Promise(resolve=>setTimeout(resolve,0));await f.adapter.flush();
  expect(save.mock.calls.map(c=>c[0])).toEqual([{summary:'TK-LU02-LA01@3'},{ranges:expect.any(Array)},{summary:'TK-LU02-LA01@3'}]);f.adapter.dispose();
 });
});
