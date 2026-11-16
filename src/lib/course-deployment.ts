import identities from '@/data/course-content-identities.json';
import scopes from '@/data/course-correction-scopes.json';
import type {ReviewRound} from './course-review';

export type CourseContentIdentity={version:1;courseId:string;fingerprint:string;engine:string;shared:string;units:Record<string,string>};
export type RegisteredDeployment={id:string;url:string;commit?:string};
export const deliveryIdentityForCourse=(id:string)=>(identities.courses as Record<string,CourseContentIdentity>)[id];

export function changedDeploymentUnits(round:ReviewRound,current:CourseContentIdentity):string[] {
 const units=Object.keys(current.units),previous=round.document.contentIdentity;
 if(round.fingerprint===current.fingerprint)return [];
 if(previous?.version===1&&previous.courseId===round.course_id&&previous.fingerprint===round.fingerprint){
  if(previous.engine!==current.engine||previous.shared!==current.shared||Object.keys(previous.units).some(u=>!current.units[u]))return units;
  const changed=units.filter(u=>previous.units[u]!==current.units[u]);
  return changed.length?changed:units; // An unexplained changed identity never receives an exemption.
 }
 const legacy=scopes.find(s=>s.roundId===round.id&&s.courseId===round.course_id&&s.previousFingerprint===round.fingerprint&&s.fingerprint===current.fingerprint);
 return legacy?[...legacy.changedUnits]:units;
}
