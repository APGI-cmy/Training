import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import ts from 'typescript';

const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

// Compile the actual registry rather than maintaining a second list of LUs.
// Its runtime imports are local JSON only; type imports disappear on transpile.
export function deliveryCourses(root=process.cwd()) {
 const source=readFileSync(resolve(root,'src/lib/course-catalogue.ts'),'utf8');
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 const module={exports:{}};
 const localRequire=id=>{
  if(!/^@\/data\/[a-z0-9-]+\.json$/.test(id))throw Error('Unexpected course registry dependency');
  return JSON.parse(readFileSync(resolve(root,'src',id.slice(2)),'utf8'));
 };
 new Function('require','module','exports',code)(localRequire,module,module.exports);
 return module.exports.courses;
}

export function buildCourseIdentity(course,assets,engine,entries) {
 const root=decodeURIComponent(course.sourceRoot).replace(/\/$/,'');
 const assigned=new Set(),units={};
 for(const unit of course.units){
  if(units[unit.slug])throw Error('Duplicate learning-unit slug');
  const base=decodeURIComponent(unit.assetBase).replace(/\/$/,'');
  if(base!==root&&!base.startsWith(root+'/'))throw Error('Learning-unit assets escape their course');
  const prefix=base===root?'':base.slice(root.length+1)+'/';
  const files=entries.filter(e=>!prefix||e.path.startsWith(prefix));
  for(const file of files)assigned.add(file.path);
  units[unit.slug]=hash({definition:unit,files});
 }
 const {units:definitions,...descriptor}=course;
 return {version:1,courseId:course.id,fingerprint:hash({assets,source:engine,course}),engine,
  shared:hash({descriptor,files:entries.filter(e=>!assigned.has(e.path))}),units};
}
