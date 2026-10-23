export const emailImageCategories={welcome:'Welcome and learning',progress:'Progress and reminders',completion:'Success and completion',feedback:'Feedback and support',announcements:'Course announcements',reviews:'Reviews and collaboration'} as const;
export type EmailImageCategory=keyof typeof emailImageCategories;
export const emailImageStyles={photo:'Realistic photographs',illustration:'Illustrations'} as const;
export type EmailImageStyle=keyof typeof emailImageStyles;
const imageLabels:[EmailImageCategory,string,string][]=[
 ['welcome','01','A welcoming learning group'],['welcome','02','A calm study space'],['welcome','03','A friendly introduction'],
 ['progress','01','Continue your learning'],['progress','02','A path forward'],['progress','03','Plan your next step'],
 ['completion','01','Celebrate together'],['completion','02','Recognise achievement'],['completion','03','Ready for what comes next'],
 ['feedback','01','A listening conversation'],['feedback','02','Support is available'],['feedback','03','Share your ideas'],
 ['announcements','01','Explore new learning'],['announcements','02','An open opportunity'],['announcements','03','Discover a new course'],
 ['reviews','01','Review as a team'],['reviews','02','A constructive peer review'],['reviews','03','A careful quality check'],
];
export const emailImages:[EmailImageCategory,string,string,EmailImageStyle][]=imageLabels.flatMap(([category,number,label])=>[[category,`photo-${number}`,label,'photo'],[category,number,label,'illustration']] as [EmailImageCategory,string,string,EmailImageStyle][]);
export function libraryImage(value:string){return emailImages.find(([category,number])=>value===`library:${category}-${number}`);}
export function libraryImagePath(value:string,thumbnail=false){const item=libraryImage(value);return item?`/images/email-library/${item[0]}-${item[1]}${thumbnail?'-thumb':''}.jpg`:null;}
export const defaultEmailImage:Record<string,string>={enrolment:'library:welcome-photo-01',completion:'library:completion-photo-01',deadline:'library:progress-photo-01',group_complete:'library:feedback-photo-01',new_course:'library:announcements-photo-01',review_request:'library:reviews-photo-01',review_complete:'library:reviews-photo-02',review_published:'library:completion-photo-02',schedule:'library:announcements-photo-02'};
