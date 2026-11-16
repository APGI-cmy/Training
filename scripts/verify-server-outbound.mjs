import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
const roots=['src/server','src/lib/services','app/api','proxy.ts'];
const native=new Set(['src/server/security/provider-fetch.ts','src/server/security-watchdog/http-probes.ts']);
function walk(p){return fs.statSync(p).isDirectory()?fs.readdirSync(p).flatMap(n=>walk(path.join(p,n))):/\.tsx?$/.test(p)?[p.replaceAll('\\','/')]:[];}
const problems=[];
for(const file of roots.flatMap(walk)){
 const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);let approved=false;
 for(const item of source.statements)if(ts.isImportDeclaration(item)&&ts.isStringLiteral(item.moduleSpecifier)){
  const name=item.moduleSpecifier.text;
  if(name==='@/server/security/provider-fetch')approved=!!item.importClause?.namedBindings&&ts.isNamedImports(item.importClause.namedBindings)&&item.importClause.namedBindings.elements.some(n=>n.name.text==='fetch'&&n.propertyName?.text==='providerFetch');
  if(/^(?:axios|undici|node:http|node:https|http|https|net|node:net|tls|node:tls)$/.test(name)&&!(file==='src/server/security/auth-budget.ts'&&name==='node:net'&&item.getText(source).includes('{isIP}')))problems.push(file+': unreviewed network import '+name);
 }
 function visit(node){
  if(ts.isCallExpression(node)){
   const bare=ts.isIdentifier(node.expression)&&node.expression.text==='fetch';
   const member=ts.isPropertyAccessExpression(node.expression)&&node.expression.name.text==='fetch';
   if((bare||member)&&!native.has(file)&&(!bare||!approved))problems.push(file+': network call bypasses approved adapter');
  }
  ts.forEachChild(node,visit);
 }
 visit(source);
}
if(problems.length){for(const p of problems)console.error(p);process.exit(1);}
console.log('Server outbound audit passed: fixed-provider adapter plus the isolated same-origin security probe.');
