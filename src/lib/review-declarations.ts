import type {SatisfactoryPart} from "./course-review";

export function declarationChoices(parts:SatisfactoryPart[],hasIssue:boolean,hasEbook:boolean) {
 const available:SatisfactoryPart[]=hasEbook?["lu","quiz","ebook"]:["lu","quiz"];
 const allHappy=available.every(part=>parts.includes(part));
 return {
  conflict:hasIssue&&allHappy,
  issueDisabled:!hasIssue&&allHappy,
  partDisabled:(part:SatisfactoryPart)=>!parts.includes(part)&&hasIssue&&available.filter(p=>!parts.includes(p)).length<=1,
 };
}

export function requestedChangeStatement(parts:SatisfactoryPart[],hasEbook:boolean) {
 const targets=(hasEbook?["lu","quiz","ebook"]:["lu","quiz"]).filter(p=>!parts.includes(p as SatisfactoryPart));
 const labels:Record<string,string>={lu:"the learning unit / slides",quiz:"the quiz",ebook:"the e-book"};
 return `Changes requested / suggestion for ${targets.map(p=>labels[p]).join(" and ")}.`;
}

export const findingUpdateStatements={
 reply:"Discussion update — finding status unchanged.",
 fixed:"Changes implemented in this deployed version; independent verification requested.",
 close:"Correction independently verified in this deployed version; finding closed.",
};
