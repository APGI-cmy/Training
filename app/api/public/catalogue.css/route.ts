import {publicCatalogueStyle} from '@/lib/public-catalogue-style';
export function GET(){return new Response(publicCatalogueStyle,{headers:{'Content-Type':'text/css; charset=utf-8','Cache-Control':'public, max-age=0, s-maxage=60','Access-Control-Allow-Origin':'*','X-Content-Type-Options':'nosniff'}});}
