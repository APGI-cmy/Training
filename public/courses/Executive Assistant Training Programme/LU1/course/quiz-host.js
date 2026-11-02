/* Approved fictional quiz host. One introduction, with varied natural poses. */
(function(w){'use strict';
const poses=[
 {id:'welcoming',src:'assets/quiz-host-20261028/quiz-host-01-welcoming.png',alt:'Your quiz host welcomes you with an open hand.'},
 {id:'encouraging',src:'assets/quiz-host-20261028/quiz-host-02-encouraging.png',alt:'Your quiz host gives an encouraging thumbs-up.'},
 {id:'inviting',src:'assets/quiz-host-20261028/quiz-host-03-inviting.png',alt:'Your quiz host invites you to take part with open hands.'}
];
function poseFor(id){return poses[id==='D17'?0:(Number(id.slice(1))-1)%poses.length];}
function mount(panel,id){
 if(panel.querySelector('.quiz-host-copy'))return;
 const pose=poseFor(id),copy=document.createElement('div');copy.className='quiz-host-copy';
 while(panel.firstChild)copy.append(panel.firstChild);
 const figure=document.createElement('figure');figure.className='quiz-host-portrait';
 const img=document.createElement('img');img.src=pose.src;img.alt=pose.alt;img.width=1024;img.height=1536;img.decoding='async';figure.append(img);
 panel.append(copy,figure);panel.classList.add('quiz-host-welcome');panel.dataset.quizHost='approved-quiz-host-01';panel.dataset.quizPose=pose.id;panel.dataset.quizId=id;
}
w.LU1QuizHost={mount,poseFor,poses};
})(window);
