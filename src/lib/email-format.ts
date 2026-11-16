// Email clients may discard white-space CSS. Use real block/list elements and
// inline spacing instead. Recorded text is escaped, never interpreted as HTML.
export function escapeEmail(value:string){
 return value.replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]!));
}
const paragraph='margin:0 0 16px;line-height:1.65;mso-line-height-rule:at-least';
const item='margin:0 0 10px;padding-left:4px;line-height:1.65;mso-line-height-rule:at-least';
export function emailHeading(text:string){return `<h2 style="font:700 19px Arial,sans-serif;color:#102b47;margin:26px 0 12px;line-height:1.4">${escapeEmail(text)}</h2>`;}
function inline(text:string){
 // Only HTTPS URLs become links; all surrounding markup remains plain text.
 const pattern=/https:\/\/[^\s<>"']+/g;let output='',at=0;
 for(const match of text.matchAll(pattern)){
  const url=match[0].replace(/[.,;!?)]+$/,'');
  output+=escapeEmail(text.slice(at,match.index))+`<a href="${escapeEmail(url)}" style="color:#075e86;text-decoration:underline;word-break:break-word">${escapeEmail(url)}</a>`;
  at=match.index!+url.length;
 }
 return output+escapeEmail(text.slice(at));
}
export function emailTextLines(text:string){
 // Expand an inline sequence only when it starts at 1 and continues at 2.
 // Decimals, dates, email addresses and revision identifiers stay unchanged.
 return text.replace(/\r\n?/g,'\n').replace(/\s+(?=Once these points (?:are|have)\b)/g,'\n\n').split('\n').flatMap(line=>{
  const marks=[...line.matchAll(/(?:^|\s)(\d{1,2})[.)]\s+(?=\S)/g)];
  const start=marks.findIndex(m=>m[1]==='1');
  if(start<0||marks[start+1]?.[1]!=='2')return [line];
  let result='',at=0,expected=1;
  for(const m of marks.slice(start)){
   if(Number(m[1])!==expected)break;
   const index=m.index!+(m[0].length-m[0].trimStart().length);
   result+=line.slice(at,index)+(index?'\n':'');at=index;expected++;
  }
  return (result+line.slice(at)).split('\n');
 });
}
export function formatEmailText(text:string){
 const lines=emailTextLines(text);let html='',list:'ol'|'ul'|null=null,nextNumber=0;
 const close=()=>{if(list)html+=`</${list}>`;list=null;};
 for(const raw of lines){
  const line=raw.trim();if(!line){close();continue;}
  const numbered=/^(\d{1,2})[.)]\s+(.+)$/.exec(line),bullet=/^[-*•]\s+(.+)$/.exec(line);
  if(numbered||bullet){
   const kind=numbered?'ol':'ul',number=numbered?Number(numbered[1]):0;
   if(list!==kind||kind==='ol'&&number!==nextNumber){close();html+=`<${kind}${numbered?` start="${number}"`:''} style="margin:0 0 20px;padding-left:28px">`;list=kind;}
   html+=`<li style="${item}">${inline(numbered?numbered[2]:bullet![1])}</li>`;nextNumber=number+1;continue;
  }
  close();const heading=/^#{1,6}\s+(.+)$/.exec(line)?.[1]??(line.length<=90&&line.endsWith(':')?line.slice(0,-1):null);
  if(heading){html+=emailHeading(heading);continue;}
  // Long unformatted comments become readable paragraphs without rewriting
  // their sentences or changing any quoted commercial terms.
  const sentences=line.length>420?Array.from(new Intl.Segmenter('en',{granularity:'sentence'}).segment(line),s=>s.segment.trim()).filter(Boolean):[line];
  for(let i=0;i<sentences.length;i+=2)html+=`<p style="${paragraph}">${inline(sentences.slice(i,i+2).join(' '))}</p>`;
 }
 close();return html;
}
