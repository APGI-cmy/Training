/* Native inputs remain the keyboard/accessibility controls. The whole answer
   card selects them, while narration and Word help retain separate actions. */
(function(w){'use strict';
function bind(row,input){
 row.classList.add('quiz-choice-row');
 row.addEventListener('click',event=>{
  if(event.defaultPrevented||event.target.closest('input,label,button,a,select'))return;
  if(!input.disabled){input.focus();input.click();}
 });
 input.addEventListener('change',()=>{
  for(const peer of row.parentElement.querySelectorAll('.quiz-choice-row')){
   const control=peer.querySelector('input');
   peer.classList.toggle('quiz-choice-selected',!!control?.checked);
  }
 });
 row.classList.toggle('quiz-choice-selected',input.checked);
}
w.LU1QuizChoices={bind};
})(window);
