import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const script=readFileSync('public/courses/vpshr-level-0/introduction/player.js','utf8');
function run(ownsReview:boolean){
 const listeners:Record<string,(()=>void)[]>={},classes:string[]=[],writes:unknown[]=[];let registered:any;
 const doc:any={documentElement:{classList:{add:(s:string)=>classes.push(s)}},addEventListener:()=>{}};
 const video:any={ownerDocument:doc,currentTime:0,duration:140,paused:true,textTracks:[],addEventListener:(s:string,fn:()=>void)=>(listeners[s]??=[]).push(fn)};
 const message={textContent:''};const retry={hidden:true,addEventListener:()=>{}};
 doc.getElementById=(id:string)=>({'welcome-video':video,'learning-status':message,'retry-save':retry,'end-card':{hidden:true}}[id as string]);
 const parent:any={};parent.parent=parent;if(ownsReview)parent.ispringPresentationConnector={register:(p:any)=>registered=p};
 const window={parent,addEventListener:()=>{}};
 vm.runInNewContext(script,{window,document:doc,location:{search:'?review=1'},URLSearchParams,Set,Date,Number,Math,String,JSON});
 return {registered,video,classes,listeners,writes,doc};
}
describe('Single-video introduction review location',()=>{
 it('binds the real iframe document and follows the current video timestamp without learner writes',()=>{
  const r=run(true),player=r.registered;
  expect(player.view().displayObject().ownerDocument).toBe(r.doc);
  expect(player.view().playbackController().currentSlideIndex()).toBe(0);
  const title=()=>player.presentation().slides().getSlide(0).title();
  expect(title()).toContain('0:00');let changes=0;
  const handler=()=>changes++;const event=player.view().playbackController().slideChangeEvent();event.addHandler(handler);
  r.video.currentTime=73;r.listeners.timeupdate.forEach(fn=>fn());
  expect(changes).toBe(1);expect(title()).toContain('1:13');
  event.removeHandler(handler);r.listeners.timeupdate.forEach(fn=>fn());expect(changes).toBe(1);
  expect(r.classes).toContain('embedded');expect(r.writes).toHaveLength(0);
 });
 it('does not require a review connector in an ordinary LMS iframe',()=>{
  const r=run(false);expect(r.registered).toBeUndefined();expect(r.classes).toContain('embedded');
 });
});
