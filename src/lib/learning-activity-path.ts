/** A frozen edition keeps the same authored activity identity, in its own edition key. */
export function learningActivityPath(path:string):string|null {
  const canonical=path.replace(/^\/api\/editions\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\/assets(?=\/courses\/)/i,'');
  return canonical.startsWith('/courses/')?canonical:null;
}
