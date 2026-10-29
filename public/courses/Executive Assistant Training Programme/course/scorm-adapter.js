(function(scope){'use strict';
 function findAPI(w){let current=w;for(let i=0;i<12&&current;i++){try{if(current.API_1484_11)return current.API_1484_11;if(current.parent===current)break;current=current.parent;}catch{break;}}try{if(w.opener&&w.opener!==w)return findAPI(w.opener);}catch{}return null;}
 function create(w=scope){const api=findAPI(w),started=Date.now();let active=false,problem='';
  function call(name,...args){try{const r=api[name](...args);if(String(r)!=='true'){problem=name+' was not accepted by the LMS.';return false;}const e=String(api.GetLastError?.()||'0');if(e!=='0'){problem=name+' returned LMS error '+e;return false;}return true;}catch(e){problem=name+' could not reach the LMS.';return false;}}
  if(api)active=call('Initialize','');
  function get(k){if(!active)return '';try{const v=String(api.GetValue(k)||'');if(String(api.GetLastError?.()||'0')!=='0'){problem='The LMS could not read '+k;return '';}return v;}catch{problem='The LMS state could not be read.';return '';}}
  const readOnly=active&&(['review','browse'].includes(get('cmi.mode'))||get('cmi.credit')==='no-credit');
  return {mode:!api?'preview':active?'lms':'error',readOnly,get,error:()=>problem,save(state,data){
   if(!api)return {ok:true,mode:'preview'};if(!active)return {ok:false,message:problem};if(readOnly)return {ok:true,mode:'lms',message:'LMS review/browse mode — learner attempts and records are not changed.'};
   const snapshot={...state}; // Fictional learning responses and bounded draft fields travel with progress; screenshots do not.
   const text=JSON.stringify(snapshot);if(text.length>60000)return {ok:false,message:'Progress exceeds this review package’s resume limit. Keep this page open and contact the producer.'};
   const progress=state.acknowledged.length/18;
   const values={'cmi.suspend_data':text,'cmi.location':String(state.position),'cmi.progress_measure':progress.toFixed(4),'cmi.completion_status':'incomplete','cmi.success_status':'unknown','cmi.exit':'suspend','cmi.session_time':'PT'+Math.floor((Date.now()-started)/1000)+'S'};
   // Attendance progression never becomes a course pass or a pass-certificate signal.
   if(state.courseProgression?.attendanceOnly)values['cmi.success_status']='failed';
   // Score is a knowledge-test signal only. Final completion/competence has not been approved.
   if(Number.isFinite(state.quiz.score)){values['cmi.score.raw']=String(state.quiz.score);values['cmi.score.min']='0';values['cmi.score.max']='100';values['cmi.score.scaled']=String(state.quiz.score/100);}
   if(state.quiz.attempt>0)for(const[qIndex,q]of data.quiz.entries())if(state.quiz.locked[q.id]){
    const base='cmi.interactions.'+((state.quiz.attempt-1)*data.quiz.length+qIndex)+'.',response=state.quiz.answers[q.id];
    values[base+'id']='LU01-FK01-A'+state.quiz.attempt+'-'+q.id;
    values[base+'type']=q.type==='matching'?'matching':q.type==='ordering'?'sequencing':'choice';
    values[base+'learner_response']=q.type==='matching'?Object.entries(response).map(([a,b])=>a+'[.]'+b).join('[,]'):response.join('[,]');
    values[base+'result']=state.quiz.correct[q.id]?'correct':'incorrect';values[base+'weighting']='10';values[base+'description']=q.stem;
   }
   for(const[k,v]of Object.entries(values))if(!call('SetValue',k,v))return {ok:false,message:problem};
   if(!call('Commit',''))return {ok:false,message:problem};
   return {ok:true,mode:'lms',message:'LMS API accepted the save. Check the platform status for server-save confirmation.'};
  },finish(){if(active){const result=call('Terminate','');active=false;return result;}return !api;},active:()=>active};
 }
 scope.LU1SCORM={create,findAPI};if(typeof module!=='undefined')module.exports=scope.LU1SCORM;
})(typeof window==='undefined'?globalThis:window);
